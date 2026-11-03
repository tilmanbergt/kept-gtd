/**
 * Writing under EXPORT/kept-gtd/debug (docs/dev/history/technical-design-filesystem-split.md §3):
 * performance traces, the Integrity Check report, the debug-log file and the debug bundle.
 */
import {DEBUG_LOG_FOLDER_PATH, PERF_LOG_FOLDER} from './devicePaths';
import {nativeFileModule} from './fileNative';
import {writeTextFile} from './fileSystem';
import {ensureFileWritePermission, forgetGrantsAndRethrow} from './pluginPermissions';

const DEBUG_LOG_FOLDER = DEBUG_LOG_FOLDER_PATH;
let perfFolderEnsured = false;

/**
 * Writes one finished performance-trace file (utils/perf.ts, injected via
 * perfConfigure in App.tsx). Same raw GtdParaFile calls as
 * recordDebugLogEntry above - no log() lines, so writing a trace never shows
 * up as noise in the next trace's console counters. Only ever called after
 * a trace has ended (never during a measured tab switch). Throws on failure;
 * perf.ts reports it via its onError hook.
 */
export async function writePerfTraceFile(fileName: string, content: string): Promise<void> {
  const GtdParaFile = nativeFileModule();
  if (!GtdParaFile) throw new Error('GtdParaFile native module is not available on this build.');
  if (!(await ensureFileWritePermission())) throw new Error('File write permission was not granted.');
  if (!perfFolderEnsured) {
    // silent: forgetGrantsAndRethrow rethrows, unlogged (the caller reports it)
    await GtdParaFile.ensureFolder(PERF_LOG_FOLDER).catch(forgetGrantsAndRethrow);
    perfFolderEnsured = true;
  }
  // silent: forgetGrantsAndRethrow rethrows, unlogged (the caller reports it)
  await GtdParaFile.writeTextFile(`${PERF_LOG_FOLDER}/${fileName}`, content).catch(forgetGrantsAndRethrow);
}

/**
 * Writes the Integrity Check's (docs/dev/history/technical-design-integrity-check.md,
 * storage/integrityCheck.ts) single summary report for one run to
 * DEBUG_LOG_FOLDER. Unlike recordDebugLogEntry above - errors swallowed so a
 * failed diagnostic never becomes a user-facing failure - this IS the
 * user-facing feature itself: a failed write here should surface to whoever
 * just tapped the button, so it throws rather than swallowing. Reuses the
 * already-permission-checked, already-logged writeTextFile (which creates
 * DEBUG_LOG_FOLDER itself if missing) - this isn't a hot-path call, so the
 * extra permission-check/log overhead doesn't matter. The filename includes
 * a filesystem-safe timestamp (colons/dots replaced) so repeated runs never
 * collide.
 */
export async function writeIntegrityCheckReport(content: string): Promise<string> {
  const fileName = `integrity-check-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
  await writeTextFile(`${DEBUG_LOG_FOLDER}/${fileName}`, content);
  return fileName;
}

/**
 * Appends to a file in the debug folder, rotating at `maxBytes` (native
 * side). Used only by utils/logSink.ts's optional file sink, via App.tsx's
 * injection - raw native calls, never log(), so writing the log can't log
 * itself. Throws without the native module.
 */
export async function appendDebugLogFile(fileName: string, content: string, maxBytes: number): Promise<number> {
  const GtdParaFile = nativeFileModule();
  if (!GtdParaFile) throw new Error('GtdParaFile native module is not available on this build.');
  // A refusal throws, and utils/logSink.ts then stops file logging for the session.
  if (!(await ensureFileWritePermission())) throw new Error('File write permission was not granted.');
  // silent: forgetGrantsAndRethrow rethrows, unlogged (the caller reports it)
  return GtdParaFile.appendTextFile(`${DEBUG_LOG_FOLDER}/${fileName}`, content, maxBytes).catch(forgetGrantsAndRethrow);
}

/**
 * Writes one exported debug bundle (storage/debugBundle.ts) to the debug
 * folder and returns its full path. Throws on failure - it is a user action.
 */
export async function writeDebugBundleFile(fileName: string, content: string): Promise<string> {
  const path = `${DEBUG_LOG_FOLDER}/${fileName}`;
  await writeTextFile(path, content);
  return path;
}
