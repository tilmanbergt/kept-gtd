/**
 * Logging a host call (docs/dev/history/technical-design-filesystem-split.md §3-4):
 * recordDebugLogEntry, the timeout guard for a call that can hang, and
 * `callHost`, the one shape of a wrapped SDK call.
 */
import {log, logError, logWarn} from '../utils/log';
import {getRememberedColdStartNotePath, getRememberedLaunchNotePath} from './hostContext';
import {ensureFileReadPermission, ensureFileWritePermission, logFileCallFailure} from './pluginPermissions';
import {SdkResponse} from './sdkElements';

// Per-JS-process identifiers so host-call log lines from the same app session
// can be correlated ("was this the 1st or 5th logged call since this process
// started", "how many ms after cold start"). A fresh id/counter each time this
// module is loaded (i.e. each PluginHost process).
const DEBUG_SESSION_ID = Math.random().toString(36).slice(2, 8);
const DEBUG_SESSION_START_MS = Date.now();
let debugAttemptSeq = 0;

/**
 * Logs one host-API call (openPath, createNote, getElements, insertElements
 * and the shared-note page engine) with its result, timing and launch
 * context - success AND failure, since comparing the two is the point
 * (bugfix_createnote_blocked).
 *
 * Writes ONE log line through utils/log.ts: always in the in-memory ring
 * buffer (debug bundle), and in the log file only while the user has
 * switched on Debug logging - never a file of its own, since unannounced
 * file activity is ruled out by the InkHub review and our transparency rule
 * (docs/dev/history/technical-design-inkhub-submission.md §3.8). Never throws.
 */
export async function recordDebugLogEntry(
  event: string,
  ok: boolean,
  durationMs: number,
  fields: Record<string, string | number | boolean | undefined>,
): Promise<void> {
  debugAttemptSeq += 1;
  // What rememberLaunchNotePath (App.tsx's reorient(), on cold start and on
  // every sidebar-button press) last captured - the file the plugin was
  // opened from. Its extension (.note vs .pdf) is the closest proxy JS has
  // for "which host app resolved this call" (NOTE vs. DOC context).
  const launch = getRememberedLaunchNotePath();
  const coldStart = getRememberedColdStartNotePath();
  const detail = Object.entries(fields)
    .map(([key, value]) => `${key}=${value ?? ''}`)
    .join(' ');
  const context =
    `session=${DEBUG_SESSION_ID} seq=${debugAttemptSeq} sinceStartMs=${Date.now() - DEBUG_SESSION_START_MS}` +
    ` launch=${launch ? launch.path ?? '(Home)' : '(not captured)'}` +
    ` coldStart=${coldStart ? coldStart.path ?? '(Home)' : '(not captured)'}`;
  if (ok) log(`hostCall: ${event} OK`, `${durationMs}ms`, detail, context);
  else logWarn(`hostCall: ${event} FAIL`, `${durationMs}ms`, detail, context);
}

/** Rejects if `promise` has not settled after `timeoutMs`. The underlying call is NOT cancelled - the caller aborts its whole flow on this error. */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

type LogFields = Record<string, string | number | boolean | undefined>;

/** One wrapped SDK call: its log lines, its success rule and its texts, exactly as the call has them. */
export interface HostCallSpec<T> {
  /** The call's name, the prefix of every log line ('insertKeyWord'). */
  name: string;
  /** Checked before the call; null for a call that needs none. */
  permission: 'read' | 'write' | null;
  /** The path named in the "permission not granted" line. */
  path?: string;
  /** What the "start" line names after `<name>: start`. */
  startArgs: unknown[];
  call: () => Promise<SdkResponse<T> | null | undefined>;
  /** Whether a response counts as success (beyond being there). */
  ok: (r: SdkResponse<T>) => boolean;
  /** The thrown text when the host gives no message. */
  failMessage: string;
  /** What the "failed" line names between `<name>: failed` and the message. */
  failArgs: unknown[];
  /** 'error' logs a failure with logError and keeps the permission grants; default: logFileCallFailure. */
  failLog?: 'file' | 'error';
  /** What the "done" line names after `<name>: done`. */
  doneArgs: (r: SdkResponse<T>) => unknown[];
  /** Records both outcomes through recordDebugLogEntry, under `name`: `fields`, plus `errorMessage` on a failure or `okFields` on success. */
  record?: {fields: LogFields; okFields?: (r: SdkResponse<T>) => LogFields};
  timeout?: {ms: number; message: string};
}

/**
 * Runs a wrapped SDK call: permission check (refused: "<name>: file <read|write> permission not
 * granted" and "File <read|write> permission was not granted."), "start" line, the call (under its
 * timeout), then on failure the "failed" line, the recorded failure and the host's message thrown, on
 * success the "done" line and the recorded success. Resolves to the response.
 */
export async function callHost<T>(spec: HostCallSpec<T>): Promise<SdkResponse<T>> {
  if (spec.permission) {
    const granted = await (spec.permission === 'read' ? ensureFileReadPermission() : ensureFileWritePermission());
    if (!granted) {
      logError(`${spec.name}: file ${spec.permission} permission not granted`, spec.path);
      throw new Error(`File ${spec.permission} permission was not granted.`);
    }
  }
  log(`${spec.name}: start`, ...spec.startArgs);
  const start = Date.now();
  const response = await (spec.timeout ? withTimeout(spec.call(), spec.timeout.ms, spec.timeout.message) : spec.call());
  const durationMs = Date.now() - start;
  if (!response || !spec.ok(response)) {
    const message = response?.error?.message || spec.failMessage;
    (spec.failLog === 'error' ? logError : logFileCallFailure)(`${spec.name}: failed`, ...spec.failArgs, message);
    if (spec.record) await recordDebugLogEntry(spec.name, false, durationMs, {...spec.record.fields, errorMessage: message});
    throw new Error(message);
  }
  log(`${spec.name}: done`, ...spec.doneArgs(response));
  if (spec.record) await recordDebugLogEntry(spec.name, true, durationMs, {...spec.record.fields, ...spec.record.okFields?.(response)});
  return response;
}
