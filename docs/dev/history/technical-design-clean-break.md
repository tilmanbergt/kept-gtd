# Technical design - 0.25.0 "Clean break"

Status: **built (2026-11-03).** Requirements: `claude/feature-clean-break-0.25.md`, open points
O1-O5 decided 2026-11-03 (Tilman, all as proposed), plus O7 (below).
Base: `main` at `ff1d032` (0.24.0 released, plus the README screenshots). Branch: `feature/clean-break`.
Implementation: a Claude Code cloud session with the prompt `claude/clean-break-0.25-implementation-prompt.md`.

**Guiding rule: as safe and simple as possible.** Change only what the new identity needs and remove
only code whose sole purpose is an update path from before 0.25.0. No new features, no renames of
things the user never sees, no format changes. Nothing in the user's files changes.

## 1. Decisions

| # | Decision |
|---|---|
| O1 | `pluginKey` = `keptgtd`; new `pluginID` = **`nj7yssrvl7g778tz`** (random, 16 × [a-z0-9], as `buildPlugin.ps1` makes them; fixed here so builds, CI and tests agree). |
| O2 | Stored-key prefix `kept:` (AsyncStorage). |
| O3 | Profile format id stays `gtdpara-profile` (read and written). The restore of saved profiles depends on it; it is invisible, like the note markers. |
| O4 | Temp suffix stays `.gtdpara-tmp` (TS and native). Only visible after an interrupted save; renaming it buys nothing. |
| O5 | "Formerly gtdpara": not on InkHub; stays as one line in About and in the README. |
| O6 | Result of device test D2 (two plugins side by side) - decides the README/release-notes wording, not the code. |
| O7 | 0.24.0's update check will offer 0.25.0 and download it into `MyStyle/kept-gtd`. 0.24.0 can't change any more, so the **0.25.0 CHANGELOG section starts with the move-over steps** - release.ps1 turns that section into the GitHub release notes, and 0.24.0's About shows them first ("0.25.0 · new"). The README says the same. |

## 2. Current state (0.24.0)

- Identity: `PluginConfig.json` (`pluginID` `ndx27q77pojfqh6l`, `pluginKey` `gtdpara`), `app.json` `name`
  `gtdpara` (→ `AppRegistry` in `index.js`), `MainActivity.kt` `getMainComponentName() = "gtdpara"`,
  `PluginRuntimeGuard.kt` `FALLBACK_PLUGIN_ID`, `package.json`/`package-lock.json` name `gtdpara`,
  `buildPlugin.ps1` naming the package `kept-gtd` by a special case.
- Pinned by `__tests__/keptGtdKeepList.test.ts` (keeps the old values on purpose) and
  `__tests__/keptGtdVisibleName.test.ts` (no visible "gtdpara" except an allowlist).
- AsyncStorage keys: `gtdpara:settings:v1`, `gtdpara:profileSecrets:v1`, `gtdpara:captureDestinations:v1`,
  `gtdpara:tagUsage:v1`, `gtdpara:googleCalendarCache:v1`, `${STORE_PREFIX}updates:v1`; `STORE_PREFIX`,
  `SETTINGS_STORE_KEY`, `SECRETS_STORE_KEY` repeated in `storage/dataRemoval.ts`.
- Migration code kept for 0.24.0 users (launch-ready §12.2), see §5.
- `CLAUDE.md`, `DEVELOPMENT-POLICY.md` and `docs/dev/README.md` say the rename is display-only and the
  identity keeps `gtdpara`.

## 3. Identity (I1, I2, I7)

| File | Change |
|---|---|
| `PluginConfig.json` | `pluginID` `nj7yssrvl7g778tz`, `pluginKey` `keptgtd`. Name, desc, icon, permissions unchanged. |
| `app.json` | `name` `keptgtd` (`displayName` stays "Kept GTD"). `index.js` unchanged (it imports the name). |
| `android/.../MainActivity.kt` | `getMainComponentName()` returns `"keptgtd"`. |
| `android/.../PluginRuntimeGuard.kt` | `FALLBACK_PLUGIN_ID` = `nj7yssrvl7g778tz`. |
| `package.json`, `package-lock.json` | `name` `kept-gtd` (both places in the lockfile). Run `npm install --package-lock-only` or edit by hand; no dependency changes. |
| `buildPlugin.ps1` | The package name comes from `package.json` again (`kept-gtd`); drop the `$artefactName = 'kept-gtd'` special case and its comment. Output names stay `kept-gtd.snplg` / `kept-gtd-x.y.z.snplg`. |
| `scripts/test-versioning.mjs` | Fixtures use `kept-gtd`. |
| `.github/workflows/*` | Check for the package or artefact name; change only if one is named. |

Stays (I4): Android package `eu.embodyagile.gtdpara`, folder `android/.../gtdpara/`, `settings.gradle`
`rootProject.name`, native module names (`GtdParaFile`, `GtdParaPdf`, `GtdParaPdfProgress`,
`GtdParaRuntime`, `KeptUpdate`, ...), TS names (`GtdParaSettings`, ...), the `[GtdPara]` log prefix, the
note markers (`gtdpara:mark:`, `gtdpara:note-heading:v1`, `gtdpara:note-piece:N:v1`,
`gtdpara:meeting-note-block:v1`, `gtdpara:meeting-note-link:v1`), `gtdpara-profile`, `.gtdpara-tmp`.

`keptGtdKeepList.test.ts` is rewritten as `pluginIdentity.test.ts` (same area): it pins the new
`pluginID`, `pluginKey`, app name = `MainActivity` name = `pluginKey`, the `kept:` keys (§4), and the
unchanged Android package, native module names, note markers, profile format and temp suffix.

## 4. Stored keys (I3)

- New pure module `src/domain/storeKeys.ts`: `STORE_PREFIX = 'kept:'` and one named constant per key:
  `SETTINGS_KEY = 'kept:settings:v1'`, `SECRETS_KEY`, `CAPTURE_DESTINATIONS_KEY`, `TAG_USAGE_KEY`,
  `GOOGLE_CALENDAR_CACHE_KEY`, `UPDATE_STATE_KEY` (all `kept:<name>:v1`).
- `settingsStorage.ts`, `profiles.ts`, `destinationUsage.ts`, `tagUsage.ts`, `googleCalendarCache.ts`,
  `updates.ts` and `dataRemoval.ts` import from there; no key literal stays in those files.
  `profileScopedKey` keeps working on top of these.
- **No reading of the old keys.** 0.25.0 is a fresh install; the host may or may not share storage
  between two plugins (D2), and the new prefix makes sure nothing of 0.24.0 is ever read or removed.
- Remove Kept's data filters by `STORE_PREFIX`, so it removes only 0.25.0's keys.

## 5. Removed code (R)

Each row goes with its tests. Loading must **ignore** leftover keys of removed fields in stored settings
and in profile files (a profile saved in 0.24.0 still contains them) - one test pins this.

| What | Where | Notes |
|---|---|---|
| Copying profiles from `EXPORT/gtdpara` | `copyLegacyProfiles`, `LEGACY_EXPORT_ROOT` (`storage/profiles.ts`), `ui/useProfileCopyNotice.ts` and its call in `App.tsx`, `profilesCopiedText` (`domain/fileChangeText.ts`) | Profiles live in `EXPORT/kept-gtd` since 0.20. |
| "Old gtdpara folders" in Remove Kept's data | `domain/dataRemoval.ts` kind `legacy` (row, `REMOVAL_ORDER`, type), `storage/dataRemoval.ts` (`LEGACY_DEMO_ROOT`, the legacy count/remove), `GtdParaFileModule.kt` lines 41/43 (`EXPORT/gtdpara`, `Note/gtdpara-demo` in the delete allowlist) | Native rebuild (CI). The delete allowlist then holds only Kept's own folders. |
| Tag Rules → Note setups migration | `domain/noteSetupMigration.ts`, `storage/noteSetupMigrationState.ts`, `ui/useNoteSetupsNotice.ts` (+ `App.tsx`), `screens/settings/noteSetups/MigrationNotice.tsx` (+ `NoteSetupsList.tsx`), `renameLegacyTagRuleKeys` (`domain/settings.ts`, `domain/profiles.ts`, `settingsStorage.ts`), the settings fields `tagRules`, `noteSetupsMigrated`, `noteSetupsNotice` (`domain/settings.ts`, `DEFAULT_SETTINGS`, `useNoteSetupDraft.ts`, `demoSpace.ts`), the `migration…Text` helpers, the debug-bundle lines (`storage/debugBundle.ts`) | Scenario tests that set `noteSetupsMigrated: true` drop that line. `noteSetups.ts` keeps everything that isn't migration. |
| Existing-install branch of `migrateExperimentalFlags` | `domain/features.ts` | Becomes: fresh install → `lastSeenVersion` + `setupAssistant: 'pending'`; otherwise unchanged. Rename to `prepareFreshInstall` only if the callers stay obvious; otherwise keep the name. |
| Old lasso marks | `isOldStrokeMark` (`domain/marks.ts`), `oldMarkText` and the two `old` branches (`storage/marks.ts`), the `old` handling in `CaptureScreen.tsx` | Mark data lives in the plugin's private folder; a fresh install can't have a mark from before version 2. A mark whose data is missing keeps today's "missing" path. |
| Anything else that only served an update from before 0.25.0 | found while doing the above | Listed in As built; when in doubt, keep it and list it. |

`keptGtdVisibleName.test.ts`: remove the allowlist entries for `LEGACY_EXPORT_ROOT`, `gtdpara:` prefix,
`gtdpara-demo`, the `EXPORT/gtdpara, Note/gtdpara-demo` text and "Old gtdpara folders". Keep: note
markers, `gtdpara-profile`, `.gtdpara-tmp`, native module names, `[GtdPara]`, `openGtdpara`,
"Formerly gtdpara".

## 6. Texts (T1-T5, O7)

- **CHANGELOG** `[Unreleased]` (becomes 0.25.0), in this order:
  - **Upgrade notes** first:
    "**Kept GTD 0.25.0 is a new install, not an update.** Coming from 0.24.0 or earlier: don't install it
    yet. In your current Kept GTD, follow the 0.24.0 upgrade notes first: process open lasso marks, save
    each profile once, note your Gmail app password and calendar link, run Settings → Data → Remove
    Kept's data with *Kept's data files* and *Saved profiles* unticked, then uninstall it. Then install
    0.25.0, run the setup assistant and Switch to your saved profile (Settings → Data → Profiles). Your
    notes, data files and saved profiles stay where they are."
    plus one sentence per D2's result (O6).
  - **Changed**: "Kept GTD now installs as its own plugin; settings start fresh (your files and saved
    profiles are untouched)."
  - **Removed**: copying profiles from the old `EXPORT/gtdpara` folder; the Tag Rules migration (profiles
    saved before 0.15 - load and save them once in 0.24.0); "Old gtdpara folders" in Remove Kept's data;
    typing old lasso marks from the picture.
- **README**: install section says "new install"; one paragraph "Coming from 0.24.0 or gtdpara" with the
  same steps; "Formerly gtdpara" stays.
- **`docs/inkhub-review.md`** (T1): deletes as Remove Kept's data makes them, without old folders; the
  native modules as they are (incl. `KeptUpdateModule`); no Inbox move, no profile copy.
- **`docs/dev/inkhub-listing.md`** (T2): check the description against §1 (no "Formerly"), the
  permissions paragraph against `PluginConfig.json`, the device line (unchanged unless D-tests say
  otherwise).
- **`PRIVACY.md`** (T3): no profile copy; storage keys described generically if named.
- **Help** (`docs/user/settings.md`, `files-and-folders.md`, `profiles-and-demo.md`): drop text about
  copied profiles, old gtdpara folders and the Tag Rules migration; keep how to move from another device
  or a reinstall via saved profiles. Device-safe markdown, link check passes.
- **Living dev docs**: `CLAUDE.md` (first paragraph: identity is now `keptgtd`/`kept:`; what keeps the old
  name), `DEVELOPMENT-POLICY.md` and `docs/dev/README.md` where they say "display-only", `design-overview.md`
  (identity, removed migrations), `test-scenarios.md`.
- `package.json` `nextVersion` is `0.25.0` (set with `npm run next-version -- 0.25.0` first if it isn't).

## 7. Steps (each green; `npm run check:affected` per step, full `npm run check` at the end)

- **B0** Branch from `main`, `nextVersion` 0.25.0, copy this design into
  `docs/dev/history/technical-design-clean-break.md`.
- **B1** Identity (§3) + `pluginIdentity.test.ts`.
- **B2** Stored keys (§4).
- **B3** Removed code (§5), one commit per row is fine; visible-name allowlist.
- **B4** Texts (§6).
- **B5** Full `npm run check`, CI green (native build), As built filled in, Tilman's guide (DEVELOPMENT-POLICY §8/§9).

## 8. Test scenarios (Given/When/Then)

1. **Fresh install starts clean.** Given empty storage, when Kept starts, then the setup assistant opens
   and only `kept:` keys are written.
2. **Old keys are never read.** Given storage holding `gtdpara:settings:v1` with custom folders and no
   `kept:` keys, when Kept starts, then it behaves as a fresh install (setup assistant) and the
   `gtdpara:` key is still there, untouched.
3. **A 0.24.0 profile loads.** Given a profile file in `EXPORT/kept-gtd/profiles` written by 0.24.0
   (format `gtdpara-profile`, with `noteSetupsMigrated`, `noteSetupsNotice`, `tagRules: []`, the
   experimental switches), when the user switches to it, then folders, Note setups, contexts and
   switches are applied, and the leftover keys are ignored (not written back on the next save).
4. **Remove Kept's data lists only Kept's own.** Given `EXPORT/gtdpara` and `Note/gtdpara-demo` exist,
   when the user opens Remove Kept's data, then no row offers them and nothing removes them.
5. **No profile copy.** Given profiles in `EXPORT/gtdpara/profiles` and none in `EXPORT/kept-gtd`, when
   Kept starts, then nothing is copied and no notice shows.
6. **Note setups have no migration notice.** Given settings without Note setups, when the user opens
   Settings → Note setups, then no migration notice shows and the defaults are offered as today.
7. **Identity is consistent.** `PluginConfig.pluginKey` = `app.json` name = `MainActivity` component name
   = `keptgtd`; `pluginID` = the guard's fallback.
8. **Markers are unchanged.** A note heading, piece, meeting block and mark written by 0.25.0 carry the
   same `gtdpara:` markers as in 0.24.0, so notes made with 0.24.0 keep working (existing tests, kept).

## 9. Device test (Tilman, on the final 0.25.0 build)

- **D1** On a device with 0.24.0: follow the upgrade notes, uninstall, install 0.25.0. Setup assistant →
  Switch to the saved profile → Daily/Week/projects show the data; a meeting note made with 0.24.0 opens
  from its todo; Engage finds it; a new meeting note gets its Note setup pieces; a lasso mark made in
  0.24.0 note (marker only) doesn't break anything.
- **D2** Install 0.25.0 while 0.24.0 is still installed. Do both appear in the sidebar? Does each open?
  Does 0.25.0 see 0.24.0's settings (it shouldn't)? Then uninstall 0.24.0 and check 0.25.0 still works.
  Result → O6 wording.
- **D2b** In 0.24.0: Settings → About → Check now → Download 0.25.0 → the What's new tab "0.25.0 · new"
  shows the move-over steps first.
- **D3** `docs/dev/device-checklist.md`, A5 X portrait at least.
- **D4** Fresh install: each permission is asked right before its first use (file read/write at setup,
  delete only in Remove Kept's data / archive, internet only for Calendar/Gmail/update check).

## 10. Risks

- **The host keys something else on the old identity** (e.g. sidebar button ids, the private folder).
  D1/D2 show it; buttons are registered by the plugin at start, the private folder follows the new
  `pluginID`.
- **Two plugins with the same Android package and native class names (D2).** Each plugin has its own
  class loader in the host; if not, the README says "uninstall first" firmly (it already does).
- **A user installs 0.25.0 over the download from 0.24.0's update check without preparing.** Nothing is
  lost (files and profiles are untouched); they get a fresh start and can Switch to a profile saved
  earlier. The release notes say it first (O7).
- **Over-removal.** Every removal is listed in §5; anything unlisted that looks like migration code is
  kept and named in As built.

## As built

Built as designed in B0-B5 on `feature/clean-break`. Deviations and choices:

- **§3 bundle name.** `buildPlugin.ps1` names the JS bundle inside the package after `package.json`
  too, so it is `kept-gtd.bundle` (the sn-plugin-lib template default) instead of `gtdpara.bundle`.
  Output names are unchanged (`kept-gtd.snplg`, `kept-gtd-<label>.snplg`). The CI build passes; D1
  shows that the host opens it.
- **§3 scenario 7** is a scenario test (`__tests__/scenarios/cleanBreak.test.tsx`) that reads the
  identity files; `pluginIdentity.test.ts` pins the same values and the six keys (§4).
- **§4** `UPDATE_STATE_KEY` moved from `storage/updates.ts` to `domain/storeKeys.ts`; `dataRemoval.ts`
  no longer exports its own prefix and key constants. Tests and test helpers that wrote the old
  literals use `kept:` keys or import them from `storeKeys.ts`.
- **§5 row 1** also removes `domain/profileCopy.ts` (`profilesToCopy`) and its test: its only use was
  `copyLegacyProfiles`. The three profile-copy scenarios in `scenarios/keptGtd.test.tsx` went with it.
- **§5 rows 1 and 2** are one commit: the legacy removal used `LEGACY_EXPORT_ROOT` from the copy.
  The fake file system's delete allowlist (`test-helpers/fakeDevice/fakeFs.ts`) follows
  `GtdParaFileModule.kt`.
- **§5 row 3, fresh-install seed.** `migrateNoteSetupSettings` also seeded the Default on a fresh
  install (and after Start over or Remove Kept's data). That seed is now
  `DEFAULT_SETTINGS.noteSetupDefaults = seedNoteSetupDefaults()`, so every start from defaults gets
  the same Default as before. Five unit tests whose mocked settings bypassed the old load
  (`loopNotes`, `noteCreationPlan`, `areaProjectsTab`, `currentThreadsTab`, `itemDetailFilesTab`)
  state their empty Default explicitly. `completeDefaultPages` and `completeMigratedSettings` (Home and
  Reflection pages, the Default's notebook key for settings from before those existed) went with
  the file: a seeded Default and every profile saved by 0.24.0 have them.
- **§5 row 3, fields.** `nextTagRuleId` is removed with `tagRules` (its counter, read only by the
  migration). `NoteSetupDefaults.notebook` stays optional (absent reads as null). The Note setups
  styles of the notice (`noticeCard`, …, `NOTICE_ROW_HEIGHT`) and `useNoteSetupDraft`'s dismiss
  handler are gone; the debug bundle's note setups line ends with `default notebook …`. The help's
  "Coming from Tag Rules" section in `note-setups.md` is gone too (not in §6's list, but it described
  the removed migration).
- **§5 row 3, leftover keys.** No extra code: profile files are read through
  `sanitizeProfileSettings`, which keeps only keys `DEFAULT_SETTINGS` has, and written through
  `profileSettingsOf`, so the removed keys of a 0.24.0 profile are ignored and never written back
  (design scenario 3). Stored settings can't hold them: `kept:settings:v1` is written only by 0.25.0.
- **§5 row 4** renamed `migrateExperimentalFlags` to `prepareFreshInstall` (one caller,
  `settingsStorage.ts`); its interface keeps only `lastSeenVersion` and `setupAssistant`.
- **§5 row 5** also removes the `old` flag from `ui/capture/useRecognitionQueue.ts`
  (`MarkRecognition.old`, `settledRecognition`'s third parameter) and `storedMarkRecognition`'s
  result. `canRecognize` stays (the recognizer still needs version 2 strokes).
- **§6** `docs/dev/inkhub-listing.md`: the reviewer summary now names `KeptUpdate` and
  `GtdParaRuntime` too. The description and the permissions paragraph needed no change.
- **CHANGELOG** carries `<!-- D2 result -->` in the Upgrade notes until D2 is done; until then the
  in-app What's new of a test build shows it as text.

Kept on purpose (looks like migration or old naming, not in §5, or about the user's files and notes):

- `storage/dataCache.ts` `migrateMissingAbbrevs` (writes `abbrev:` into data files that lack one),
  the legacy meeting-note block and link markers (`domain/meetingNoteBlock.ts`), `migrateLegacyTextPieces`
  (`domain/pageLayout.ts`), the legacy `#waiting-for:` / `#due:` tags, pre-0.13 page anchors
  (`domain/pageOrder.ts`), the Inbox at the base root until it is moved (`storage/projectFile.ts`):
  all read the user's files or notes, which carry over unchanged.
- `android/app/src/main/res/values/strings.xml` `app_name` `gtdpara` and `settings.gradle`
  `rootProject.name`: Android build names, never shown by the host.
- `GtdParaKind`, `gtdparaPages`, `onOpenGtdpara`, `GTDPARA_EXPORT_ROOT` (its value is
  `EXPORT/kept-gtd`), comments that say "gtdpara": invisible names (I4).
- `.gitignore`'s `gtdpara_*log*.txt` and the fake device's private folder path in
  `test-helpers/fakeDevice/fakeFs.ts`: development only.

Checks: `npm run check:affected` (with `--area settings`, `note-setups`, `lasso`, `files` as the step
needed) per step, `npm run coverage` (full + coverage) at the end, CI green on every push with the
native build.

