# In-app updates - technical design

Status: **approved 2026-11-03**, for release 0.24.0 "Launch ready". Requirements:
docs/dev/history/requirements-in-app-updates.md (U1-U10, S1, D1-D3). Developer mode (X) is not part of this design;
§9 only keeps the door open.

Branch: `feature/in-app-updates`, started from the head of `feature/contexts-tags` (0.24.0 work is not on
`main` yet), merged into `main` after it, before the 0.24.0 beta.

## 1. Overview

```
About "Check now" / daily auto check (App start)
        │
        ▼
storage/updates.ts ── fetch  api.github.com/repos/tilmanbergt/kept-gtd/releases/latest   (JS, small JSON)
        │             domain/updateCheck.ts: parse, compare with BUILD_INFO, pick asset
        ▼
status notice "Kept GTD 0.26.0 is available"  [Download] [Details]  ✕ = Not now
        │
        ▼ Download
KeptUpdate (native, own thread) ── stream asset → private tmp, SHA-256 while streaming
        │   compare size + digest from the API
        ▼
KeptUpdate.copyIntoFolder → MyStyle/kept-gtd/.kept-gtd-0.26.0.snplg.part → rename → kept-gtd-0.26.0.snplg
        │   private tmp file removed (private folder only)
        ▼
status: "Saved to MyStyle/kept-gtd/kept-gtd-0.26.0.snplg. To install: close Kept, then Settings → Plugins → Add plugin."
```

The release JSON comes through JS `fetch`, which is enough for a few KB, same as the Calendar ICS fetch.
The download is native: a `.snplg` is several MB, and base64 through the bridge would be slow and
memory-heavy.

## 2. Domain (`src/domain/updateCheck.ts`, pure, new)

```ts
export const UPDATE_REPO = 'tilmanbergt/kept-gtd';
export const LATEST_RELEASE_URL = `https://api.github.com/repos/${UPDATE_REPO}/releases/latest`;
export const UPDATE_FOLDER = 'MyStyle/kept-gtd';           // relative to the internal storage root
export const UPDATE_DISCLAIMER =
  'Releases on GitHub are not reviewed or approved by Ratta. You install them at your own risk. ' +
  'Each release is tested to keep your data safe.';
export const AUTO_CHECK_INTERVAL_MS = 20 * 60 * 60 * 1000; // "once a day", tolerant of opening times

export interface RunningVersion { core: string; preRelease: boolean }
/** From BUILD_INFO: release → {version,false}; towards nextVersion with a stage → {nextVersion,true};
 *  a +dev build → {version,false} (it is at least that release). */
export function runningVersion(b: BuildVersionInfo): RunningVersion;

export interface AvailableUpdate {
  version: string;            // "0.26.0"
  tag: string;                // "v0.26.0"
  publishedAt: string | null;
  notes: string;              // release body (markdown), trimmed
  asset: {name: string; url: string; size: number; sha256: string};
}
export type ReleaseParse =
  | {ok: true; update: AvailableUpdate}
  | {ok: false; reason: string};    // logged, never shown raw

/** Strict: draft/prerelease false, tag ^v\d+\.\d+\.\d+$, exactly one asset `kept-gtd-<v>.snplg`,
 *  size > 0 and ≤ MAX_ASSET_BYTES (50 MB), digest "sha256:<64 hex>", url https on github.com. */
export function parseLatestRelease(json: unknown): ReleaseParse;

/** core > running.core, or same core while running is an alpha/beta. */
export function isNewer(version: string, running: RunningVersion): boolean;

export function shouldAutoCheck(mode: UpdateCheckMode, lastCheckAt: number | null, now: number): boolean;
/** The notice shows unless the user said Not now to exactly this version. */
export function shouldNotify(update: AvailableUpdate, dismissedVersion: string | null): boolean;

/** "kept-gtd-0.26.0.snplg", or "kept-gtd-0.26.0 (2).snplg" … when the name is taken by a different file. */
export function downloadFileName(version: string, taken: (name: string) => boolean): string;
```

`compareVersions` is the same logic as `scripts/lib/versioning.mjs`; it is written again here in TS
(domain can't import the script), with a test pinning that the two agree on a table of cases.

Why a missing digest is refused, not skipped: GitHub fills `digest` for every asset that `gh release
create` uploads, so a release without one isn't one of ours. If that ever fails, the message
says "This release can't be checked; download it from GitHub instead."

## 3. Settings and state

**Settings** (`domain/settings.ts`, part of the profile; a user choice):
- `updateCheck: 'manual' | 'daily'`, default `'manual'`. Fresh installs set it in the setup assistant.
  Existing settings without the key read as `'manual'` (normal defaults merge, no migration).

**Device-local bookkeeping** (AsyncStorage, key `<prefix>updates`, from `storage/profileKeys.ts`;
not in the profile, so switching profiles doesn't nag again):
```ts
interface UpdateState {
  lastCheckAt: number | null;        // last successful check (manual or automatic)
  latest: AvailableUpdate | null;    // what that check found when it was newer, else null
  dismissedVersion: string | null;   // "Not now" on this version
  downloaded: {version: string; path: string} | null;
}
```
Read once at start, written after each check, dismissal and download. A failed write is logged; nothing depends on it.

## 4. Storage (`src/storage/updates.ts`, new)

- `checkForUpdate({silent}): Promise<CheckResult>`:
  1. Permission: manual → `ensureInternetPermission(UPDATE_PERMISSION_TEXT)`; silent →
     `hasPluginPermission(INTERNET)` only (new helper in `pluginPermissions.ts`, no dialog). If it isn't
     granted, the silent check ends quietly with `{kind: 'noPermission'}`.
  2. `fetch(LATEST_RELEASE_URL, {headers: {Accept: 'application/vnd.github+json', 'User-Agent':
     'KeptGTD/<version>', 'X-GitHub-Api-Version': '2022-11-28'}})` with the existing `withTimeout`
     (15 s). 404 → `{kind: 'noRelease'}`; 403/429 → `{kind: 'rateLimited'}`; other → `{kind: 'error'}`.
  3. `parseLatestRelease` → `isNewer` → state written → `{kind: 'upToDate', version}` or
     `{kind: 'available', update}`.
  - In-flight dedupe like the Calendar fetch: a second call while one runs gets the same promise.
- `downloadUpdate(update): Promise<DownloadResult>`:
  1. `ensureInternetPermission`, `ensureFileWritePermission`.
  2. Folder `/storage/emulated/0/MyStyle/kept-gtd` via `ensureFolder`.
  3. Already there? `statFiles` on the plain name; same size → `KeptUpdate.sha256File` → equal →
     `{kind: 'already', path}`. Different file → the next free name (`downloadFileName`).
  4. `KeptUpdate.download(url, privateTmpName, maxBytes, userAgent)` → `{path, size, sha256}`.
  5. Size and SHA-256 must match the API's; else `deleteTempTree(tmp)` and `{kind: 'mismatch'}`.
  6. `KeptUpdate.copyIntoFolder(tmp, folder, name)` → final path; `deleteTempTree(tmp)`;
     `notifyFolderChanged(folder)`; state `downloaded` set; `{kind: 'saved', path}`.
  - Any failure: the private tmp file is removed; nothing is ever deleted outside the private folder
    (a leftover `.part` in `MyStyle/kept-gtd` can only come from a crash mid-copy; the next download
    of that version overwrites its own `.part`, the name the picker sees is never touched).
- `ensureInternetPermission`'s default text becomes "… to connect to Google Calendar, Gmail or GitHub
  (updates) - only when you tap, or once a day if you switched on the update check."

## 5. Native (`android/.../KeptUpdateModule.kt`, new, registered in `GtdParaFilePackage`)

Own module so it doesn't grow `GtdParaFileModule` and gets its own thread:
- `private val executor = Executors.newSingleThreadExecutor()`. Every method runs on it and resolves
  the promise from there. Reason: React native-module methods share one native thread, so a 30 s
  download there would hold up every `GtdParaFile` call (todo saves, listings) meanwhile.
- `download(url, fileName, maxBytes, userAgent)`: `HttpsURLConnection`, connect 15 s / read 30 s
  timeouts, follows redirects (github.com → objects.githubusercontent.com, both https; a redirect to
  http is refused), refuses a `Content-Length` above `maxBytes` and stops when more than that arrives.
  Streams into `privateTmpDir/fileName` through a `DigestInputStream(SHA-256)`. Returns
  `{path, size, sha256}`. Errors as `E_HTTP_<code>`, `E_TOO_LARGE`, `E_NETWORK`.
- `sha256File(path)`: hex digest of a file (for "already downloaded").
- `copyIntoFolder(fromPath, toFolder, fileName)`: `fromPath` must be inside the private tmp folder,
  `toFolder` inside `/storage/emulated/0/MyStyle/`; copies to `.<fileName>.part` (overwriting an old
  `.part` of the same name), then `renameTo(fileName)`; `E_DEST_EXISTS` if `fileName` exists (the JS
  side already picked a free name). A move isn't possible: the private folder and shared storage are
  different mounts, so `renameTo` across them fails.
- `PluginRuntimeGuard.onModuleCreated/trace/onModuleInvalidated` like the other modules;
  `invalidate()` shuts the executor down (`shutdownNow`, the running download ends with an error).
- The host checks network per socket ("has no NETWORK permission for ip:port"), so the INTERNET grant
  from §4 is required, same as `GmailImapModule`.

`src/supernote/updateNative.ts`: typed wrapper, `undefined` on a build without the module (About then
shows "Updates need a newer build" - only relevant for mixed dev builds).

## 6. UI

### 6.1 Notice (`src/ui/useUpdateNotice.ts`, new, mounted in App next to `useWhatsNewNotice`)
- Shows when `state.latest` is set, `isNewer` still holds and `shouldNotify` is true.
- `{kind: 'info', scope: 'global', text: 'Kept GTD 0.26.0 is available.', actions: [Download (primary),
  Details → About], onDismiss: Not now → dismissedVersion}`. The What's-new notice wins the slot when both
  are due (it is the older event); the update notice follows on the next free slot.
- While downloading: `'Downloading Kept GTD 0.26.0 (4.2 MB)…'` (no progress bar: e-ink). Then the
  U8 text as an info message with ✕ only, or the error.

### 6.2 About (`screens/settings/AboutTab.tsx`)
- Left column, new block **Updates** under the project URL:
  - status line: "Up to date · checked 3 Nov" / "Kept GTD 0.26.0 is available" / "Downloaded:
    MyStyle/kept-gtd/kept-gtd-0.26.0.snplg" / last error;
  - buttons **Check now** and, when available, **Download**;
  - `CheckToggle` **Check automatically once a day** (saves `updateCheck` right away with
    `patchSettings`; switching it on calls `ensureInternetPermission` once, so the daily check never needs
    a dialog);
  - the install hint (U8) and `UPDATE_DISCLAIMER`, small and muted.
  - On a narrow screen (launch-ready S1) the block stays in the left column; the column already pages.
- Right column What's new: when an update is known, its notes come first as a MiniTab
  "0.26.0 · new" in the same `MarkdownPager` (O4: same renderer). The existing three-version rule
  then covers the bundled ones.

### 6.3 Automatic check (App)
- After the first screen is drawn (`InteractionManager.runAfterInteractions` + 3 s delay), when
  `shouldAutoCheck(settings.updateCheck, state.lastCheckAt, now)`: `checkForUpdate({silent: true})`.
  Never during the setup assistant. Results go only to state and the notice; failures only to the log.

### 6.4 Setup assistant (S1)
- New step **Updates** between Features and Look around first? ("Setup · 4 of 5"):
  radio **Check for new versions on GitHub once a day** / **Only when I tap Check now** (default),
  one line what it does, the disclaimer, "Change later: Settings → About".
- `SetupChoices.updates: 'daily' | 'manual'`; `initialChoices` from `current.updateCheck`;
  `planFinish` puts `updateCheck` in the patch. `finishSetup` asks for INTERNET after saving when
  `'daily'` (a refusal keeps the setting; About then says "needs internet access - tap Check now").
- Header comment in `SetupAssistant.tsx` and the step count update.

## 7. Docs

- `docs/user/settings.md`: section **Updates** (check, daily check, where the file goes, how to install,
  disclaimer); `getting-started.md` *Install*: one line "Kept tells you about new versions; see Updates".
- `README.md`: *Installing and updating* gains the MyStyle route and the disclaimer.
- `PRIVACY.md` and `docs/inkhub-review.md` (D2): INTERNET also for the update check (GitHub API +
  download, user-triggered or daily if switched on; nothing sent besides the HTTPS request with a
  `KeptGTD/<version>` user agent); files written to `MyStyle/kept-gtd/`; nothing deleted there.
- `docs/dev/RELEASING.md`: the updater depends on the tag `vX.Y.Z`, the asset name
  `kept-gtd-X.Y.Z.snplg` (exactly one) and the release not being a pre-release - one checklist line.
- `CHANGELOG.md` Unreleased: "Kept tells you about new versions and can download them".
- `docs/design-overview.md` §2/§5 after implementation.

## 8. Tests

- `updateCheck.test.ts`: `runningVersion` (release, `0.24.0 beta`, `+dev`); `isNewer` table incl.
  0.24.0-beta → 0.24.0 yes, 0.24.0 → 0.24.0 no, 0.24.0+dev → 0.24.0 no, 0.23.9 → 0.24.0 yes,
  0.24.0 → 0.23.9 no; `parseLatestRelease` (good, draft, prerelease, bad tag, zero/two/oddly named assets,
  missing/short digest, http URL, too large); `shouldAutoCheck`; `shouldNotify`; `downloadFileName`;
  the agreement table with `versioning.mjs`.
- `setupAssistant.test.ts`: `planFinish` carries `updates`.
- `updates.test.ts` (storage, mocked fetch + native): permission refused (manual vs silent),
  404/403, already downloaded, mismatch removes the tmp file and writes nothing in MyStyle, name taken.
- Test tier: a new area `updates` ("In-app updates", help `settings.md`) in `scripts/test-areas.json`
  with the new tests and sources; one smoke check that About renders the Updates block.

**How to test on the device before 0.24.0 exists on GitHub** (the latest release then is 0.23.x, so a
0.24.0 alpha is up to date): a debug-only switch on Advanced, shown while Debug logging is on,
**Update test: treat this build as 0.0.0** (not saved, gone after restart). It makes `runningVersion`
return `0.0.0`, so the latest real release is offered and the whole path (notice, download, hash,
MyStyle, install via Add plugin) can be walked once. After the 0.24.0 release the normal path
(0.24.0 beta → 0.24.0) is tested for real.

Device checklist (part of the 0.24.0 one):
1. Check now without internet permission → dialog; refuse → message; allow → result.
2. Update test switch → notice → Download → file in `MyStyle/kept-gtd/` → Add plugin lists it →
   install works, data intact.
3. Download again → "Already downloaded".
4. Daily check on → restart next day (or clear `lastCheckAt` via the test switch) → notice without dialog.
5. Not now → no notice on next start; About still shows it.
6. Setup assistant on a fresh install shows the Updates step and saves the choice.
7. Kept stays usable during a download (todo save, tab switch): the separate thread works.

## 9. Later: developer mode (X, not in 0.24.0)

`checkForUpdate` takes a `channel: 'stable' | 'beta'` parameter internally from the start; only
`'stable'` is used. Beta would read `/releases?per_page=10` and accept `vX.Y.Z-beta.N` tags (the parser gets a
`allowPreRelease` flag then). The "treat as 0.0.0" switch is a first developer option and would move
behind the Developer checkbox together with Simulate screen.

## 10. Effort and risks

Medium: one domain file, one storage file, one small native module, About block, one setup step, docs,
tests. Risks:
- **Host blocks writing to `MyStyle`** (assumed fine, O2 of the requirements): device test 2; fallback
  `EXPORT/kept-gtd/updates` plus a hint to move the file.
- **Redirect host rejected by the host's socket check**: it checks permission, not hosts (IMAP to Gmail
  works); device test 2.
- **GitHub API changes** (`digest` field, rate limit): the parser fails closed with a clear message;
  60 requests/hour per IP is far more than a daily check needs.

## As built

(filled in by the implementation)
