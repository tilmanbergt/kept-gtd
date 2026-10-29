/**
 * Logging a host call (docs/dev/history/technical-design-filesystem-split.md §3):
 * recordDebugLogEntry, and the timeout guard for a call that can hang.
 */
import {log, logWarn} from '../utils/log';
import {getRememberedColdStartNotePath, getRememberedLaunchNotePath} from './hostContext';

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
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
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
