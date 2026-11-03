# Technical design - fresh start finds the saved profile (0.25.1)

Status: **approved 2026-11-03** (Tilman: offer in the setup assistant, Restore as fallback). Bugfix for
0.25.0 "Clean break" (`technical-design-clean-break.md`). Branch `fix/fresh-start-profile` from `main`
(which has the build-script fix: bundle named after `pluginKey`). Release: 0.25.1.

## 1. Exact failure and root cause

- **Failure** (A5 X, alpha of 0.25.1): after the move-over steps (Remove Kept's data, uninstall 0.24.0,
  install 0.25.x), Kept starts fresh. Projects show (same folders), but contexts and Note setups are
  missing. `EXPORT/kept-gtd/profiles/production.json` from 0.24.0 is there but can't be loaded.
- **Root cause:** a fresh install's `activeProfileId` is `production` (`DEFAULT_SETTINGS`), the same id
  as the saved file. The Profiles list shows it as active, so it has no Switch button, and
  `switchProfile` returns at once when target = active (`storage/profiles.ts`). Before 0.25.0 the active
  settings and `production.json` always matched, so the case never arose.
- **Hidden danger in the same state:** Save on Production, or a switch to another profile (Demo), writes
  the fresh, empty settings into `production.json` (`saveActiveProfile`, and `switchProfile` saves the
  current profile first). That would destroy the profile the upgrade notes tell users to keep.

## 2. Decisions

- **D1 Offer, not silent load.** The setup assistant looks for saved profiles in its first step - it
  needs the file read permission there anyway - and offers to load one. No read and no permission prompt
  at start-up.
- **D2 Restore as fallback** on the active profile in Settings → Data → Profiles while Kept runs on
  fresh settings (the same button the "settings unreadable" case already has).
- **D3 Protection.** While Kept runs on fresh settings, nothing writes them into an existing profile file
  without asking.

## 3. Design

### 3.1 The fresh-start mark (`domain/settings.ts`, `domain/features.ts`, `domain/profiles.ts`)
- New setting `freshStart: boolean`, default `false`, **device-wide** (added to `DEVICE_WIDE_KEYS`, so
  it never goes into a profile file).
- `prepareFreshInstall` sets `freshStart: true` together with `setupAssistant: 'pending'`.
- Cleared (set `false`) by: loading a profile (assistant Load, Restore, Switch) and by Save. Not cleared
  by finishing or skipping the assistant: someone who chose Start fresh can still Restore later.

### 3.2 Storage (`storage/profiles.ts`)
- `switchProfile(targetId)`: let `keepFiles = unreadable || current.freshStart`.
  - Same id: return `current` only when `!keepFiles` (today's rule); otherwise load the file.
  - Save the current profile first only when `!keepFiles`.
  - The result has `freshStart: false` and `setupAssistant: 'done'`.
  - Everything else (secrets map, `buildActiveSettings`, re-read) as today.
- New `listSavedProfiles()`: like `listProfiles`, but **read-only** - a missing profiles folder means
  "none" and is not created (`listProfiles` keeps its `ensureFolderExists` for Settings). Only readable
  files, newest `savedAt` first.
- `saveActiveProfile()` unchanged in storage; it clears `freshStart` after writing (the UI asks first,
  §3.4).

### 3.3 Setup assistant (`screens/settings/SetupAssistant.tsx`, `domain/setupAssistant.ts`)
- When the base folder is scanned (step 0, after the permission), it also calls `listSavedProfiles()`.
- When at least one is found **and** `current.freshStart` is true, the assistant first shows a
  **Welcome back** screen (not counted in "1 of 5"):
  - Title "Welcome back"; text "Kept found settings you saved earlier. Load them to continue where you
    left off - your folders, Note setups and contexts. Your notes and files are not changed."
  - One row per profile (radio): name · "saved 3 Nov" (date only); the newest is selected.
  - Buttons: **Load "<name>"** (primary) and **Start fresh** (goes on to Folders, as today); ? Help
    (`profiles-and-demo`, `saved-profiles` or the nearest heading).
- **Load** calls a new prop `onLoadProfile(id)` → Settings → App's `switchToProfile` (the existing switch
  path: caches dropped, shell remounted). The assistant closes; the shell opens on Projects; the status
  says: `Loaded your profile "<name>". If you use Gmail or Google Calendar, enter the app password and
  calendar link again (Settings → Features).` (text in `domain/fileChangeText.ts`).
- A load that fails keeps the assistant open with the error in its message line; Start fresh still works.

### 3.4 Profiles list (`screens/settings/ProfilesSection.tsx`)
- Active row: **Restore** when `unreadable || freshStart` (today: only `unreadable`), with confirm text
  for the fresh case: `Load your saved profile "<name>"? The fresh settings are replaced; the file stays
  as it is.`
- Save on the active row while `freshStart`: confirm first - `Replace your saved profile "<name>" with
  the current fresh settings?` (Save / Cancel).
- Switch to another profile while `freshStart`: the confirm says `Switch to "<name>"? Your saved profile
  "<active>" stays as it is.` (nothing is saved first, §3.2).

### 3.5 Texts
- CHANGELOG `[Unreleased]` (0.25.1): in the Upgrade notes replace "run the setup assistant and Switch to
  your saved profile" with "open Kept: it finds your saved profile and offers to load it (later: Settings
  → Data → Profiles → Restore)". **Fixed**: "After a fresh install, your saved profile couldn't be loaded
  (Production showed as active, without Switch). Kept now offers to load it when you first open it, and
  never overwrites it with the fresh settings without asking." Keep the line about 0.25.0 not starting.
- README "Coming from 0.24.0" paragraph, `docs/user/profiles-and-demo.md` (Welcome back, Restore),
  `docs/user/settings.md` (setup assistant), `docs/user/getting-started.md` if it describes the first start.
- `docs/dev/test-scenarios.md`, `design-overview.md` §2 (profiles), As built of this doc.

### 3.6 Permissions on the first start (added 2026-11-03, step P6)

Found by tracing the first start (`App.tsx` reorient, `storage/dataCache.ts`,
`supernote/pluginPermissions.ts`):

| # | Gap | Effect |
|---|---|---|
| G1 | `withTimeout` (8 s) also wraps `requestPermission`, which waits for a person. | Reading the dialog for more than 8 s counts as denied: the cache build fails silently, the assistant's scan is empty (no existing folders suggested, default folders may be created next to existing ones), Welcome back finds no profiles. |
| G2 | After a timeout the pending entry is removed while the dialog is still up. | The next caller asks again: a second dialog or a stuck host call. |
| G3 | Read and write are asked at unrelated moments (write at Finish or the first todo). | Write interrupts a later action. |
| G4 | On a fresh start the read dialog comes from the background `refreshCache` in reorient, before the assistant shows. | No context for the user; a denial only shows as an empty scan. |
| G5 | The assistant doesn't handle a denied permission. | It goes on with "will be created" everywhere. |

Design:

- **Timeouts** (`pluginPermissions.ts`): `hasPermission` keeps the 8 s timeout (stuck host).
  `requestPermission` gets `PERMISSION_REQUEST_TIMEOUT_MS = 120000` (a person answers; the bound only
  guards a host that never answers).
- **One request per permission until the host answers:** the pending entry stays until the host call
  itself settles, also when the caller's wait timed out; a later caller joins it instead of starting
  a new dialog. The grant is still recorded when a late answer is "granted".
- **No background read on a fresh start:** reorient skips `refreshCache` while
  `setupAssistant === 'pending'`. The cache is built after Finish, Load or Skip (as today: caches are
  cleared and rebuilt on use).
- **Access first in the assistant:** before the base scan, the assistant shows one line - "Kept needs
  to read and write your Project and Area folders and its own files in EXPORT/kept-gtd." - and asks
  `ensureFileReadPermission()` then `ensureFileWritePermission()`, one after the other, never in
  parallel. Only when both are granted does it scan the base folder and call `listSavedProfiles()`.
- **Denied → clear stop:** when either is refused (or times out), the assistant shows "Kept can't
  work without access to your files." with **Try again** (asks again) and the existing **Skip**. No
  scan, no Finish plan, no Welcome back.

## 4. Test scenarios (Given/When/Then)

1. **Welcome back loads the profile.** Given a fresh install (no stored settings) and
   `EXPORT/kept-gtd/profiles/production.json` with two contexts and one Note setup, when the assistant
   opens and the user taps Load "Production", then the contexts and the Note setup are active, the
   assistant is closed, the status names the profile, `production.json` is byte-identical, and
   `freshStart` is false.
2. **Newest first.** Given `production.json` saved 1 Nov and `work.json` saved 3 Nov, when Welcome back
   shows, then "Work" is listed first and selected.
3. **Start fresh, then Restore.** Given scenario 1's files, when the user taps Start fresh and finishes
   the assistant, then `production.json` is unchanged, and Settings → Data → Profiles shows Restore on
   Production; Restore → confirm → the contexts and Note setup are active.
4. **Switching away doesn't overwrite.** Given a fresh start (Start fresh), when the user creates the demo
   space and switches to Demo, then `production.json` is unchanged.
5. **Save asks first.** Given a fresh start, when the user taps Save on Production, then a confirm shows;
   Cancel leaves the file unchanged; Save replaces it and clears `freshStart`.
6. **No profiles, no change.** Given a fresh install without `EXPORT/kept-gtd/profiles`, when the
   assistant opens, then it starts at Folders as today and the profiles folder is **not** created.
7. **Unreadable file.** Given a `production.json` that isn't valid JSON, when the assistant opens, then
   no Welcome back screen shows (nothing readable to load).
8. **Normal starts unchanged.** Given stored settings (`freshStart` false), when the user switches
   profiles, then the current profile is saved first and switching to the active one does nothing (the
   existing profile tests pass unchanged).
9. **After Remove Kept's data.** Given Remove Kept's data with profiles kept, when Kept restarts fresh,
   then Welcome back offers the saved profiles (same path as a fresh install).
10. **Late grant.** A `requestPermission` answered "granted" after 9 s resolves true (fake timers);
    the caller gets true.
11. **One dialog.** Two callers of `ensureFileReadPermission` while the host hasn't answered → one
    `requestPermission` call; both get the same answer, also when the first caller's wait timed out.
12. **No read before the assistant.** Fresh install: no `hasPermission`/`requestPermission` call
    happens before the assistant's access step (reorient doesn't refresh the cache).
13. **Read, then write.** The assistant asks read, then write (order checked), then scans and lists
    profiles.
14. **Denied.** Read denied → the assistant shows the stop line with Try again and Skip; no scan, no
    folders planned; Try again with a grant → scan and Welcome back as usual.

## 5. Device test (Tilman, on the CI or local build of the last commit)

1. With `production.json` from 0.24.0 in place: Settings → Data → Remove Kept's data (everything except
   data files and profiles) → Start fresh. Welcome back shows Production with its date → Load → contexts
   and Note setups are back; a new meeting note gets its pieces.
2. Again Remove Kept's data → Start fresh → **Start fresh** → finish the assistant → Settings → Data →
   Profiles: Restore on Production → loads.
3. Check `EXPORT/kept-gtd/profiles/production.json`'s date didn't change in steps 1-2 (file manager or
   PC).
4. Install check: the package holds only `keptgtd.bundle` (`tar -tf`).
5. First start with slow answers (§3.6): Remove Kept's data → Start fresh → the assistant asks read,
   then write; wait 15 s on each before Allow → folders suggested, Welcome back shows; no second
   dialog stacks up.
6. Deny read once → the stop line with Try again → Try again → Allow → the assistant continues.

## As built

Built as designed (branch `fix/fresh-start-profile`, steps P1-P5). Files: `domain/settings.ts`,
`domain/features.ts`, `domain/profiles.ts` (mark), `storage/profiles.ts` (switch, list, save),
`screens/settings/WelcomeBack.tsx` (new), `SetupAssistant.tsx`, `Settings.tsx`,
`ProfilesSection.tsx`, `RemoveDataScreen.tsx`, `domain/fileChangeText.ts` (`profileLoadedText`),
`storage/debugBundle.ts` ("fresh start yes/no"). Tests: `__tests__/storage/profilesFreshStart.test.ts`
(storage level) and `__tests__/scenarios/freshStartProfile.test.tsx` (scenarios 1-7 and 9; 8 is the
existing profile tests, unchanged).

Deviations and additions:

- **Failing tests first, committed with the fix.** The policy has no skipped-test exception, so the
  P1 tests were run red on the old code and committed with the step that turns them green (storage
  tests with P2, scenarios 1, 2, 6, 7, 9 with P3, 3-5 with P4).
- **Landing after Load:** the normal landing after a profile switch (Daily, or the open note's
  project or area), not Projects. Load is the existing switch and remount; forcing a tab would need
  a second path through the shell's start. The status line names the profile either way.
- **Date on Welcome back:** "saved 3.11." through `domain/dateFormat.ts` (the one date format of the
  app), not "saved 3 Nov".
- **Cancel** on the Save confirm is the status slot's ✕, as on every confirm.
- **While looking for profiles** the assistant shows one line, "Looking for settings you saved
  earlier…", instead of drawing Folders first and then replacing it (no e-ink jump).
- **Active row while fresh:** Restore *and* Save (§3.4 needs both); with unreadable settings Restore
  stays alone, as before.
- **Welcome back** has a hint line "Load later: Settings → Data → Profiles → Restore"; the rows are a
  `PagedSection` of five per page.
- **`ensureDefaultProfileFile` clears the mark** when it writes a new `production.json` from fresh
  settings (no saved profile existed): the settings are on file then, like after Save. Without this,
  a later switch would not save the changes made since (it saves nothing first while fresh).
- **Remove Kept's data** starts with "Save the active profile first" unticked while fresh (D3: the
  removal would otherwise replace the saved profile with the fresh settings unasked).
- `onLoadProfile` is Settings' existing `onSwitchProfile`; Settings got no new prop.

**P6 (§3.6)** - built as designed: `supernote/pluginPermissions.ts` (8 s for `hasPermission`,
`PERMISSION_REQUEST_TIMEOUT_MS` = 120 s per caller for the dialog, one host request per permission
until it settles, late grants recorded, every caller still gets a boolean), App reorient (no
`refreshCache` while the assistant is pending), the assistant's access step (read, then write,
then scan and `listSavedProfiles`; stop line with Try again and Skip). Tests:
`__tests__/supernote/pluginPermissionsRequest.test.ts` (10, 11, plus a stuck `hasPermission`),
`__tests__/scenarios/setupAssistantAccess.test.tsx` (12-14); the fake SDK logs every permission
call (`permissionCalls`, `onPermissionCall`).

Deviations and additions:

- **Two more early readers.** Test 12 found reads before the access step besides `refreshCache`:
  the hidden Projects screen (kept tabs mount the initial tab while loading, and it builds the
  cache) and Settings' MyStyle listing (`useMyStylePngs`). While the assistant runs at start,
  hidden kept screens are not mounted (`setupAtStart`), and the MyStyle list waits until the
  assistant closes. Normal starts are unchanged (the Current page golden master stays as recorded).
- **Projects after Finish** now builds its list on the chosen folders when it opens (before, it
  had been built on the old default folders and showed none of the projects found); the first
  build gives each project its default abbreviation, as on any first view.
- The access screen has ? Help (Settings, "Setup assistant") and Skip in its header, like the steps.
