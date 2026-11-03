import {PluginManager} from 'sn-plugin-lib';
import {log, logError} from '../utils/log';
import {perfEnd, perfStart} from '../utils/perf';
import {errorMessage} from '../utils/errorMessage';

export const FILE_READ_PERMISSION = 'plugin.permission.FILE:READ';
export const FILE_WRITE_PERMISSION = 'plugin.permission.FILE:WRITE';
export const FILE_DELETE_PERMISSION = 'plugin.permission.FILE:DELETE';
export const INTERNET_PERMISSION = 'plugin.permission.INTERNET';

/**
 * The host request for each permission, until the host call itself settles - also after a
 * caller's wait timed out - so a later caller joins the open dialog instead of starting a second
 * one (docs/dev/history/technical-design-fresh-start-profile.md §3.6).
 */
const pending = new Map<string, Promise<boolean>>();

/**
 * Permissions granted this session (docs/dev/history/technical-design-perf-threads.md §3.7):
 * a later check returns at once, with no bridge call and no log line, which also keeps the
 * log file's own write from logging (utils/logSink.ts). A denial, an error or a timeout is
 * never kept, so the next call asks again. Forgotten when a native file call fails
 * (supernote/fileSystem.ts), so a permission revoked while the plugin runs is asked for again.
 */
const granted = new Set<string>();

/** Forgets every grant of this session; the next check asks the host again. */
export function forgetPermissionGrants(): void {
  granted.clear();
}

/** A native file call failed: logs it (as logError) and forgets the grants. */
export function logFileCallFailure(...args: unknown[]): void {
  forgetPermissionGrants();
  logError(...args);
}

/** A native file call that must not log failed: forgets the grants and rethrows `error`. */
export function forgetGrantsAndRethrow(error: unknown): never {
  forgetPermissionGrants();
  throw error;
}

// Observed in practice: the host's hasPermission/requestPermission bridge
// calls can simply never resolve (no dialog shown, no rejection either) -
// e.g. when the host doesn't support prompting for a given permission at
// runtime at all. Without a bound on the wait, every caller
// (readTextFile/writeTextFile/openPath) sits there awaiting forever with no
// error and no data, which looks like total silence in the UI - exactly the
// "+Add does nothing, nothing appears, no error" symptom. This turns a stuck
// bridge call into a clear, catchable error instead of an infinite hang.
// hasPermission answers at once, so 8 s means a stuck host; requestPermission waits for a person
// reading a dialog, so its bound is long and only guards a host that never answers.
const PERMISSION_TIMEOUT_MS = 8000;
const PERMISSION_REQUEST_TIMEOUT_MS = 120000;

function withTimeout<T>(promise: Promise<T>, label: string, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms - the host never responded`));
    }, ms);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      err => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/** Asks the host: hasPermission (bounded), then the dialog (unbounded here). Never rejects; a grant is recorded whenever it arrives. */
async function askHost(permission: string, description: string): Promise<boolean> {
  try {
    log('ensurePluginPermission: calling hasPermission', permission);
    const has = Number(
      await withTimeout(PluginManager.hasPermission(permission), `hasPermission(${permission})`, PERMISSION_TIMEOUT_MS),
    );
    log('ensurePluginPermission: hasPermission', permission, '=>', has);
    if (has > 0) {
      granted.add(permission);
      return true;
    }
    log('ensurePluginPermission: calling requestPermission', permission);
    const requested = Number(await PluginManager.requestPermission(permission, description));
    log('ensurePluginPermission: requestPermission', permission, '=>', requested);
    if (requested > 0) granted.add(permission);
    return requested > 0;
  } catch (e) {
    logError('ensurePluginPermission: error', permission, errorMessage(e));
    return false;
  }
}

/**
 * Requests a plugin.permission.* grant through the host's runtime permission
 * API. A grant is remembered for the session (see `granted` above); a denial,
 * an error or a timeout resolves false - never a throw. One host request per
 * permission at a time (see `pending` above); each caller waits for it at most
 * PERMISSION_REQUEST_TIMEOUT_MS.
 */
export async function ensurePluginPermission(
  permission: string,
  description: string,
): Promise<boolean> {
  if (granted.has(permission)) return true;

  let request = pending.get(permission);
  if (!request) {
    const started: Promise<boolean> = askHost(permission, description).finally(() => {
      if (pending.get(permission) === started) pending.delete(permission);
    });
    request = started;
    pending.set(permission, request);
  }
  const perfToken = perfStart();
  try {
    return await withTimeout(request, `requestPermission(${permission})`, PERMISSION_REQUEST_TIMEOUT_MS);
  } catch (e) {
    logError('ensurePluginPermission: error', permission, errorMessage(e));
    return false;
  } finally {
    perfEnd('io:permission', perfToken, {permission});
  }
}

/**
 * Whether `permission` is granted, without ever showing a dialog: the session's grant, else the
 * host's hasPermission (a grant found there is remembered like one from ensurePluginPermission).
 * A timeout or an error reads as not granted. For checks the user didn't ask for, such as the
 * daily update check (docs/dev/history/technical-design-in-app-updates.md §4).
 */
export async function hasPluginPermission(permission: string): Promise<boolean> {
  if (granted.has(permission)) return true;
  try {
    const has = Number(await withTimeout(PluginManager.hasPermission(permission), `hasPermission(${permission})`, PERMISSION_TIMEOUT_MS)) > 0;
    log('hasPluginPermission:', permission, '=>', has);
    if (has) granted.add(permission);
    return has;
  } catch (e) {
    logError('hasPluginPermission: error', permission, errorMessage(e));
    return false;
  }
}

export function ensureFileReadPermission(): Promise<boolean> {
  return ensurePluginPermission(
    FILE_READ_PERMISSION,
    'Allow Kept GTD to read your Project and Area folders.',
  );
}

export function ensureFileWritePermission(): Promise<boolean> {
  return ensurePluginPermission(
    FILE_WRITE_PERMISSION,
    'Allow Kept GTD to create and update project and area files.',
  );
}

/**
 * FILE:DELETE, requested only AFTER the user confirmed a delete in the UI
 * (docs/dev/history/technical-design-inkhub-submission.md §3.4) - so `description`
 * names exactly what is about to be deleted, e.g. "Delete the empty folder
 * 2 Areas/Health after moving it to the Archive." Never requested eagerly.
 */
export function ensureFileDeletePermission(description: string): Promise<boolean> {
  return ensurePluginPermission(FILE_DELETE_PERMISSION, description);
}

/**
 * The network-touching operations - Google Calendar's ICS fetch
 * (storage/googleCalendarCache.ts), the Gmail IMAP calls
 * (storage/gmailImapNative.ts) and the GitHub update check and download
 * (storage/updates.ts) - call this immediately before connecting, never
 * eagerly and never from Settings just because a URL was typed in. The
 * integrations are opt-in (off by default); the update check runs when the
 * user taps Check now or Download, or once a day if they switched that on.
 */
export function ensureInternetPermission(
  description = 'Allow Kept GTD to connect to Google Calendar, Gmail or GitHub (updates) - only when you tap, or once a day if you switched on the update check.',
): Promise<boolean> {
  return ensurePluginPermission(INTERNET_PERMISSION, description);
}
