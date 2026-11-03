/**
 * Where the user is (docs/dev/history/technical-design-filesystem-split.md §3):
 * the note or document that is open, the file the plugin was (re)launched
 * from, and the current page.
 */
import {PluginCommAPI} from 'sn-plugin-lib';
import {errorMessage} from '../utils/errorMessage';
import {log, logError, logWarn} from '../utils/log';
import {errText, SdkResponse} from './sdkElements';

/**
 * The path of the note that was open when the plugin was launched (the
 * button that opens this plugin only appears while a NOTE/DOC is open, so
 * this should always resolve to something). Used on app start to jump
 * straight into that note's Project/Area, if it has one. Resolves null
 * rather than throwing on failure - this is a "nice to have" shortcut, not
 * something that should block the app from opening.
 */
export async function getCurrentNotePath(): Promise<string | null> {
  log('getCurrentNotePath: start');
  try {
    const response = (await PluginCommAPI.getCurrentFilePath()) as SdkResponse<string> | null | undefined;
    if (!response || !response.success || !response.result) {
      log('getCurrentNotePath: none', response?.error?.message);
      return null;
    }
    log('getCurrentNotePath: done', response.result);
    return response.result;
  } catch (e) {
    logError('getCurrentNotePath: failed', errorMessage(e));
    return null;
  }
}

// Remembers the most recent getCurrentNotePath() result app-wide, so any
// code - not just App.tsx's own reorient() call site - can cheaply ask
// "what note/doc was open when the plugin was last (re)launched" without an
// extra native round-trip. `undefined` means nothing has captured a value
// yet this process; `null` means it was captured but resolved to nothing
// (the host gave no path: the launch file is unknown. Plugins open only from
// the Note or the Document app, so there is no launch without a file).
let rememberedLaunchNotePath: string | null | undefined;
let rememberedLaunchNotePathAt: number | null = null;

// The *first* value ever passed to rememberLaunchNotePath() this process,
// i.e. specifically the file open at cold start (App.tsx's mount effect -
// the one with `useEffect(..., [])` - runs exactly once per JS instance,
// and calls reorient()/rememberLaunchNotePath() immediately; every later
// call comes from a sidebar-button press reusing that same instance, per
// the "closePluginView() only hides the native view" note in App.tsx). This
// stays fixed for the process's whole lifetime even as
// rememberedLaunchNotePath above keeps getting overwritten on every
// reopen - `coldStartCaptured` (not "is the path truthy") is the latch, so
// a cold start whose path resolves to null (launch file unknown) is still captured
// correctly rather than leaving this looking like "not yet captured".
let rememberedColdStartNotePath: string | null | undefined;
let rememberedColdStartNotePathAt: number | null = null;
let coldStartCaptured = false;

/**
 * Called by App.tsx's reorient() right after its own getCurrentNotePath()
 * call resolves - reorient() runs on cold start AND on every sidebar-button
 * press (see its onButtonPress handler), i.e. every time the plugin is
 * (re)opened, which is the closest this SDK lets us get to "right after the
 * launch event". Deliberately just caches the value reorient() already
 * fetched rather than fetching its own - no extra API call. Also latches
 * the cold-start value the first time it's called this process - see
 * getRememberedColdStartNotePath below.
 *
 * Lets recordDebugLogEntry record which file the plugin was opened from
 * (does a host-side rejection correlate with launch context - a NOTE vs. a
 * DOC/PDF?), and is available to any other code via
 * getRememberedLaunchNotePath.
 */
export function rememberLaunchNotePath(path: string | null): void {
  rememberedLaunchNotePath = path;
  rememberedLaunchNotePathAt = Date.now();
  if (!coldStartCaptured) {
    coldStartCaptured = true;
    rememberedColdStartNotePath = path;
    rememberedColdStartNotePathAt = Date.now();
  }
}

/** The most recent value passed to rememberLaunchNotePath(), plus how long ago it was captured - or undefined if nothing has called it yet this process. */
export function getRememberedLaunchNotePath(): {path: string | null; capturedAt: number} | undefined {
  if (rememberedLaunchNotePathAt == null) return undefined;
  return {path: rememberedLaunchNotePath ?? null, capturedAt: rememberedLaunchNotePathAt};
}

/**
 * The file open at cold start specifically - i.e. the *first* value
 * rememberLaunchNotePath() ever received this process, never overwritten by
 * later reopens (contrast getRememberedLaunchNotePath, which always reflects
 * the most recent reopen). Undefined if the plugin hasn't gone through
 * App.tsx's reorient() yet this process at all.
 */
export function getRememberedColdStartNotePath(): {path: string | null; capturedAt: number} | undefined {
  if (rememberedColdStartNotePathAt == null) return undefined;
  return {path: rememberedColdStartNotePath ?? null, capturedAt: rememberedColdStartNotePathAt};
}

/**
 * The page the user is on in the open note or document (0-based), for the
 * Engage panel's "which entry is this page" lookup
 * (docs/dev/history/technical-design-engage.md §3.4). Resolves null rather than
 * throwing: without a page the panel still works from the note's path.
 */
export async function getCurrentPageNum(): Promise<number | null> {
  try {
    const r = (await PluginCommAPI.getCurrentPageNum()) as SdkResponse<number>;
    if (r?.success && typeof r.result === 'number') return r.result;
    logWarn('currentPage: no page', errText(r, 'no page'));
    return null;
  } catch (e) {
    logWarn('currentPage: reading the page failed', errorMessage(e));
    return null;
  }
}
