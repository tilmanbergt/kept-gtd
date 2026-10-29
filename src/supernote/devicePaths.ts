/**
 * The device's fixed paths and how a path is shown to the user
 * (docs/dev/history/technical-design-filesystem-split.md §3): the internal
 * storage, the Supernote's MyStyle folder and Kept's export folders. Pure, no imports.
 */

/** The internal storage's root - every fixed path below starts here. */
export const INTERNAL_STORAGE = '/storage/emulated/0';

/**
 * Fixed OS path where the Supernote's own MyStyle assets live (the same
 * folder `.snplg` builds are deployed to) - not a setting, unlike
 * `baseRoot`: nothing a user would want to redirect elsewhere. Used by the
 * meeting-note-template feature (docs/dev/history/technical-design-meeting-notes.md §1.2)
 * to list `.png` files a note-template setting can pick from.
 */
export const MYSTYLE_FOLDER = `${INTERNAL_STORAGE}/MyStyle`;

/**
 * Fixed, settings-independent home for on-device diagnostics: every event
 * `recordDebugLogEntry` logs (see its doc comment;
 * docs/dev/history/technical-design-shared-note-pages.md §4/§12), including the
 * host-side createNote rejection ("not allowed to use this API" - a gate in
 * HostCommImpl.checkAPIAvailable, unrelated to plugin.permission.FILE:WRITE,
 * that intermittently flips from denied to allowed within one app session).
 * A literal path (matching MYSTYLE_FOLDER's own convention above) rather
 * than `resolvePaths(settings).base` - deliberately NOT settings-dependent,
 * so this still works even if settings/base resolution is itself what's
 * broken, and entries land here whatever baseRoot is.
 *
 * Everything Kept GTD exports lives under the device's EXPORT folder, not
 * under Note, so it doesn't fill the space used for working material:
 * EXPORT/kept-gtd/debug (logs, bundles, reports, perf traces) and
 * EXPORT/kept-gtd/profiles (docs/dev/history/technical-design-profiles-demo-space.md).
 */
export const GTDPARA_EXPORT_ROOT = `${INTERNAL_STORAGE}/EXPORT/kept-gtd`;
const DEBUG_LOG_FOLDER = `${GTDPARA_EXPORT_ROOT}/debug`;

/** Same folder, for UI text and the debug tools (docs/dev/history/technical-design-about-debug-experimental.md). */
export const DEBUG_LOG_FOLDER_PATH = DEBUG_LOG_FOLDER;

/** Profile files (docs/dev/history/technical-design-profiles-demo-space.md §3.1). */
export const PROFILES_FOLDER_PATH = `${GTDPARA_EXPORT_ROOT}/profiles`;

/** Where utils/perf.ts's trace files land (docs/dev/history/technical-design-perf-tracing.md §4). */
export const PERF_LOG_FOLDER = `${DEBUG_LOG_FOLDER}/perf`;

/** "EXPORT/kept-gtd/debug" - the part of a path a user sees in the Supernote file manager. */
export function displayPath(path: string): string {
  return path.startsWith(`${INTERNAL_STORAGE}/`) ? path.slice(INTERNAL_STORAGE.length + 1) : path;
}
