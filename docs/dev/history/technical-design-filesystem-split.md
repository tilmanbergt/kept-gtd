# Technical design: splitting supernote/fileSystem.ts

Status: DRAFT (2026-10-29), planned as step S5b of 0.23.0 "Easy start" (after S5, before S6). Base looked at: feature/easy-start at d20ac75 (S0). fileSystem.ts is unchanged by S0, still 1,247 lines. Add-on prompt for the cloud session: claude/filesystem-split-0.23-addon-prompt.md.

## 1. Why

fileSystem.ts is the only source file over 1,000 lines. It is listed in scripts/code-health-baseline.json and may only shrink.

The size is mostly comments: about 450 comment lines and 70 blank lines, so about 730 lines of code. It is not hard to read, but it does four separate jobs:

- files and folders;
- note content (pages, keywords, elements);
- "where the user is" (the launch path and the current note);
- diagnostics files under EXPORT/kept-gtd/.

It repeats one block about 15 times: permission check → log(start) → SDK call → check the response → logFileCallFailure + throw, sometimes plus recordDebugLogEntry. There are 18 "permission not granted" branches and 21 logFileCallFailure calls. Each one also writes out its own response type inline, even though SdkResponse<T> already exists in supernote/sdkElements.ts.

0.23.0 adds several new users of exactly these functions (§2), so this is a good time to sort them.

No behaviour change. Log texts, thrown messages, the order of recordDebugLogEntry calls, timeouts and rollback all stay the same. There is no CHANGELOG line, because nothing changes for users.

## 2. What 0.23.0 changes around it

| Step | Touches | Consequence for the split |
|---|---|---|
| S0 (done) | storage/deviceCheck.ts imports listFolderEntries and getRememberedLaunchNotePath, and defines INTERNAL_STORAGE = '/storage/emulated/0' | That constant is the second copy of the device root (fileSystem's displayPath regex and MYSTYLE_FOLDER hold it too). It moves to devicePaths.ts (§3). |
| S4 | storage/deviceRoots.ts (INTERNAL_ROOT, would be a third copy), ui/useThisFile.ts (remembered launch path + getCurrentPageNum), locateLinkedFile for absolute paths, openPath outside Note/ (K2/K5 fallbacks) | useThisFile should import from one module (hostContext.ts). Any K-result fallback in openPath or listFolderEntries moves with the files section. |
| S5 | Setup assistant: listFolderEntries and ensureFolderExists through storage/setupAssistant.ts | Only importers. They are handled in R3. |

Because S4 and S5 may still add or change functions, the split starts with a re-inventory (R-pre) on the branch head instead of trusting the line numbers below. Placement follows the rules in §3, not a fixed list.

## 3. Target modules

Placement rule for every export (this also covers new 0.23 functions):

- A pure device path or path formatting → devicePaths.ts
- Where the user is (open note, launch file, current page) → hostContext.ts
- Logging a host call → hostCall.ts
- Reading or changing a .note's content or pages through PluginFileAPI/PluginCommAPI → noteFileApi.ts
- Writing under EXPORT/kept-gtd/debug → diagnosticFiles.ts
- Everything else (files, folders, open, move, delete, temp) → fileSystem.ts

| Module | Contents | ≈ lines |
|---|---|---|
| supernote/devicePaths.ts (new, no imports) | INTERNAL_STORAGE, MYSTYLE_FOLDER, GTDPARA_EXPORT_ROOT, DEBUG_LOG_FOLDER_PATH, PROFILES_FOLDER_PATH, PERF_LOG_FOLDER, displayPath (built on INTERNAL_STORAGE) | 70 |
| supernote/hostContext.ts (new) | getCurrentNotePath, rememberLaunchNotePath, getRememberedLaunchNotePath, getRememberedColdStartNotePath; absorbs supernote/currentPage.ts (getCurrentPageNum), and that file is deleted | 150 |
| supernote/hostCall.ts (new) | recordDebugLogEntry (moved; it only logs and writes no file), the shared wrapper callHost (§4) and the private withTimeout | 150 |
| supernote/noteFileApi.ts (new) | createNote, insertNotePage, insertKeyWord, getKeyWords, deleteKeyWord, getNoteTotalPageNum, createElement, getElements, insertElements, deleteElements, getNoteSystemTemplates; types Element, ElementTextBox, ElementLink, Rect, toRect, KeyWord, NoteTemplate, ELEMENT_TYPE_TEXT/LINK | 350 |
| supernote/diagnosticFiles.ts (new) | writePerfTraceFile, writeIntegrityCheckReport, appendDebugLogFile, writeDebugBundleFile | 100 |
| supernote/fileSystem.ts (stays) | native module binding, folder-change listeners, list/stat/exists, read/write/ensure/binary, moves, temp/private dirs, deletes, openPath + observer | 550 |

Import direction (no cycles): devicePaths ← hostContext ← hostCall ← fileSystem ← noteFileApi, diagnosticFiles.

Today openPath calls recordDebugLogEntry, and recordDebugLogEntry reads the launch path. Moving it into hostCall.ts, rather than diagnosticFiles.ts, avoids the cycle.

noteFileApi needs notifyFolderChanged/parentFolder (after createNote). diagnosticFiles needs the native module (appendTextFile, ensureFolder). fileSystem.ts exports these as clearly marked module-internal helpers (`/** @internal supernote/ only */`): notifyFolderChanged, parentFolder and nativeFileModule(). A code-health or grep check keeps them out of imports from outside src/supernote/. If no such check is cheap, note it in As built.

Kept separate on purpose: Element (noteFileApi, the shape written via insertElements) and SdkElement (sdkElements.ts, the shape read with accessors). Merging them would change types at call sites, so it goes to the backlog.

## 4. The shared wrapper callHost

```ts
callHost<T>(spec: {
  name: string;                       // 'insertKeyWord' - prefix of every log line, unchanged
  permission: 'read' | 'write' | null;
  path?: string;                      // first log argument where today's code has it
  startArgs?: unknown[];              // extra args of today's 'start' line
  call: () => Promise<SdkResponse<T> | null | undefined>;
  ok: (r: SdkResponse<T>) => boolean; // success predicate exactly as today (result === false / == null / !result)
  failMessage: string;                // today's fallback message
  failArgs?: unknown[];               // extra args of today's 'failed' line
  doneArgs?: (r: SdkResponse<T>) => unknown[];
  record?: {event: string; fields: Record<string, …>; failFields?: …; okFields?: (r) => …}; // only where recorded today
  timeoutMs?: number; timeoutMessage?: string;
}): Promise<SdkResponse<T>>
```

Permission-denied text and log line stay as they are today: '<name>: file write permission not granted' and File write|read permission was not granted.

Use it only where it reproduces today's behaviour exactly. createNote (its own thrown text, notifyFolderChanged), openPath (rollback, forgetPermissionGrants on throw) and the native-module functions in fileSystem.ts may stay hand-written or use the wrapper only in part. The goal is to remove the repetition, not to force every function into the wrapper.

Every inline {success; result?; error?} type becomes SdkResponse<T>, imported from sdkElements.ts.

## 5. Steps (all inside S5b, each step is its own commit and green)

- **R-pre**: Re-inventory. On the branch head, list fileSystem.ts's exports. For each one count its importers and the jest.mock('…/supernote/fileSystem') factories that mention it. Assign every export, including those S4/S5 added, by the rule in §3. Write the table into As built.
- **R0**: Characterization tests, against the current fileSystem.ts before any move:
  - one test per wrapped SDK function, covering: permission denied, success:false, a refused result (result === false/null), success (log lines, return value), and recordDebugLogEntry events where today's code records;
  - insertNotePage timeout;
  - openPath rollback on failure.
  These tests import from supernote/fileSystem at first. R3 switches them to the new modules.
- **R1**: Move. Create the five modules and move code and comments unchanged. fileSystem.ts re-exports every moved name (export {…} from './noteFileApi' etc.), so all importers and all test mocks keep working. deviceCheck.ts (and deviceRoots.ts from S4, if it exists) use INTERNAL_STORAGE from devicePaths instead of their own constant. Run tsc and the full tier.
- **R2**: Wrapper. Add callHost + SdkResponse in hostCall/noteFileApi/fileSystem. R0 must stay green without editing any R0 assertion.
- **R3**: Importers and mocks. Point every importer at the module that owns the symbol. Update each test's jest.mock the same way: a factory that stubs createNote now mocks …/noteFileApi. Remove keys a factory no longer needs. Then delete the re-exports from fileSystem.ts.
  This is mechanical: a throwaway codemod script (not committed) is fine. Review it by git diff --stat plus tsc plus the full tier.
  Watch for one failure mode: a test that mocked fileSystem but whose code now imports the real function from another module. Every such test must still mock what it relied on. A test passing because the real function now runs against the sn-plugin-lib mock is not good enough. Check that the mocked functions in a test are still called (where the test asserts calls).
- **R4**: Housekeeping.
  - scripts/test-areas.json: fileSystem, devicePaths and hostCall → files; noteFileApi and hostContext → the notes area that holds currentPage today (remove currentPage there); diagnosticFiles → the area that covers debug/about. The strict rule must pass.
  - Remove fileSystem.ts from code-health-baseline.json.
  - design-overview.md §2/§3: one paragraph on the supernote/ modules and the placement rule.
  - As built.

## 6. Tests and checks

R0 is the safety net for R2. tsc and the full tier are the safety net for R1 and R3.

Run npm run check (full tier) after R1 and R3, because they touch every area that imports fileSystem. Use --affected for R0, R2 and R4.

Device test: nothing new to look at. The normal 0.23 device test covers it (open a note from Kept, create a home-notebook page, Lasso → keyword, debug bundle export). Put one line in the S5b commit's Device test block.

## 7. Risks

- Mocks silently bypassed (R3). Covered by the rule above. If doubtful, keep a re-export for that one symbol and list it in As built rather than weakening a test.
- Log or message drift (R2). Some UI/status code and tests match messages. R0 pins them.
- 0.23 still changing fileSystem.ts. Starting after S5 avoids moving targets. If S5b doesn't fit into 0.23.0, the same steps work unchanged as a cleanup PR on main after the release: re-run R-pre.
- Size. The R3 diff touches about 75 source and 55 test files. That is mechanical but large, so it is its own commit and nothing else is in it.

## 8. Out of scope (backlog)

- fileSystem.ts logs full paths (log('…: start', path)). The policy prefers counts and ids. Changing it changes what debug bundles show, so it gets its own decision.
- domain/settings.ts (baseRoot), domain/demoSpace.ts and storage/profiles.ts hard-code /storage/emulated/0/.... domain/ cannot import supernote/, so a shared constant would need to live in domain/.
- Merging Element and SdkElement.

## As built

### R-pre: re-inventory (branch head after S5, fileSystem.ts 1,247 lines)

S4 and S5 added no function to fileSystem.ts: S4's new device helpers live in `storage/deviceRoots.ts`,
`ui/useThisFile.ts` and `storage/linkedFiles.ts`'s `pickedPath`; K1-K5 all answered yes, so openPath and
listFolderEntries got no fallback. 79 files import fileSystem.ts; 54 `jest.mock('…/supernote/fileSystem')`
factories exist. Counts below are from a throwaway script (import lists, and names inside a factory's
body; a factory that spreads `jest.requireActual` counts only the names it overrides).

| Export | Importers | Mock factories naming it | Module |
|---|---|---|---|
| `MYSTYLE_FOLDER` | 4 | 2 | devicePaths |
| `GTDPARA_EXPORT_ROOT` | 0 | 0 | devicePaths |
| `DEBUG_LOG_FOLDER_PATH` | 2 | 0 | devicePaths |
| `PROFILES_FOLDER_PATH` | 2 | 1 | devicePaths |
| `displayPath` | 12 | 6 | devicePaths |
| `PERF_LOG_FOLDER` | 0 | 0 | devicePaths |
| `getCurrentNotePath` | 5 | 11 | hostContext |
| `rememberLaunchNotePath` | 1 | 9 | hostContext |
| `getRememberedLaunchNotePath` | 4 | 1 | hostContext |
| `getRememberedColdStartNotePath` | 0 | 0 | hostContext |
| `recordDebugLogEntry` | 1 | 1 | hostCall |
| `NoteTemplate` | 0 | 0 | noteFileApi |
| `KeyWord` | 0 | 0 | noteFileApi |
| `ELEMENT_TYPE_TEXT` | 1 | 0 | noteFileApi |
| `ELEMENT_TYPE_LINK` | 1 | 2 | noteFileApi |
| `Element` | 1 | 0 | noteFileApi |
| `Rect` | 0 | 0 | noteFileApi |
| `toRect` | 1 | 0 | noteFileApi |
| `ElementTextBox` | 0 | 0 | noteFileApi |
| `ElementLink` | 0 | 0 | noteFileApi |
| `getNoteSystemTemplates` | 0 | 0 | noteFileApi |
| `createNote` | 5 | 2 | noteFileApi |
| `insertNotePage` | 2 | 1 | noteFileApi |
| `insertKeyWord` | 6 | 5 | noteFileApi |
| `getKeyWords` | 3 | 6 | noteFileApi |
| `deleteKeyWord` | 2 | 2 | noteFileApi |
| `getNoteTotalPageNum` | 2 | 1 | noteFileApi |
| `createElement` | 2 | 3 | noteFileApi |
| `getElements` | 4 | 5 | noteFileApi |
| `insertElements` | 4 | 3 | noteFileApi |
| `deleteElements` | 1 | 2 | noteFileApi |
| `writePerfTraceFile` | 1 | 9 | diagnosticFiles |
| `writeIntegrityCheckReport` | 1 | 0 | diagnosticFiles |
| `appendDebugLogFile` | 1 | 9 | diagnosticFiles |
| `writeDebugBundleFile` | 1 | 0 | diagnosticFiles |
| `FolderEntry` | 18 | 0 | fileSystem |
| `subscribeFolderChanges` | 2 | 5 | fileSystem |
| `listFolderEntries` | 16 | 29 | fileSystem |
| `FileStat` | 1 | 0 | fileSystem |
| `statFiles` | 4 | 19 | fileSystem |
| `fileExists` | 13 | 17 | fileSystem |
| `folderExists` | 5 | 1 | fileSystem |
| `openPath` | 9 | 9 | fileSystem |
| `OpenPathObserver` | 0 | 0 | fileSystem |
| `setOpenPathObserver` | 1 | 9 | fileSystem |
| `readTextFile` | 7 | 26 | fileSystem |
| `writeTextFile` | 8 | 26 | fileSystem |
| `ensureFolderExists` | 10 | 6 | fileSystem |
| `writeBinaryFile` | 1 | 0 | fileSystem |
| `moveFolder` | 3 | 1 | fileSystem |
| `moveFile` | 6 | 7 | fileSystem |
| `moveFolderMerge` | 1 | 1 | fileSystem |
| `getPrivateTempDir` | 4 | 11 | fileSystem |
| `deleteTempTree` | 2 | 9 | fileSystem |
| `getPrivateDataDir` | 2 | 2 | fileSystem |
| `deletePrivateDataTree` | 1 | 1 | fileSystem |
| `deleteEmptyFolder` | 1 | 0 | fileSystem |
| `INTERNAL_STORAGE` (storage/deviceCheck.ts) | 5 | 0 | devicePaths |
| `getCurrentPageNum` (supernote/currentPage.ts, file deleted) | see R1 | see R1 | hostContext |
