# Technical design — settings tabs (Data, Features, Advanced, About)

Status: **APPROVED** (decided in review: tab name Data, Switch and Remove wait for saved folder
fields, one Save per integration block). Part of 0.24.0, built before
`technical-design-remove-data.md`, whose **Remove Kept's data…** goes onto the Data tab.

## 1. Why

Settings has eight tabs. Setting up (folders, setup assistant) and the profiles sit on two tabs, the
Google integrations have two tabs of their own that appear and disappear with a switch on a third, the
problem-reporting tools sit on About, and two diagnostics (Touch test, Check device files) have done
their job. Six tabs, each with one purpose, are calmer on e-ink and put setup and teardown in one place.

## 2. Requirements

- **T1 Six tabs**: Data, Contexts, Note setups, Features, Advanced, About. Settings opens on Data
  (where it opened on Folders).
- **T2 Data**, two columns:
  - left: the folder fields (base folder, Projects, Areas, Inbox, Resources, Archive) with the
    resolved paths, and under this column only **Save** and **Reset to defaults**;
  - right: **Run setup assistant**, **Profiles** (list, Save, Switch, Restore, Create demo space),
    and later **Remove Kept's data…** (remove-data design).
  - Run setup assistant, Switch and (later) Remove are greyed while the folder fields have unsaved
    changes, with one line "Save or reset the folder fields first." - Switch would otherwise drop
    the edits silently.
- **T3 Profiles redraw**: once the profile list has loaded (or failed), the e-ink screen refreshes,
  so the list is never left half drawn.
- **T4 Features**, two columns: left the switches (Features: Project close-out; Experimental:
  Google Calendar, Gmail, Notebook contents); right the Google Calendar block (ICS link) while that
  switch is on and the Gmail block (address, app password, IMAP host, Hide handled) while that one is
  on. Each block has its own **Save**, which saves only that block's fields. Turning a switch off only
  hides its block; the stored values stay. With both off, the right column says what appears there.
- **T5 Advanced**, two columns: left **Reporting a problem** (Debug logging, Export debug bundle,
  as on About today); right **Tools** (Reload all files, Run Integrity Check, Keep tabs in memory,
  Performance tracing).
- **T6 About**: version, build, commit, device, project address; under them a short paragraph that
  invites reporting problems and ideas on GitHub and names Settings → Advanced → Reporting a problem
  for the debug bundle; right column What's new as today.
- **T7 Removed**: Touch test (screen, sample rows, markers, the "Log touches everywhere" observer
  around the app, the touch probes in TaskRow, MeetingRow, TaskLabels and TaggableText, the touch
  log file writer and the touch lines in the debug bundle) and Check device files (screen and
  `storage/deviceCheck.ts`; `STORAGE_ROOT` and `sdCardCandidates`, which the Device tab uses, move to
  `storage/deviceRoots.ts`). Their tests go with them.
- **T8 References follow**: every text that names a moved place ("Settings → Folders",
  "Settings → Calendar", "Settings → Gmail", "Settings → About" for debugging, "Settings →
  Advanced → Profiles") - help pages, the setup assistant's "change it later" lines, status and
  error messages, the profile chip in the tab bar (opens Data) - and the link targets in
  `docs/dev/README.md`.
- **T9 No stored change**: no setting is added, renamed or removed; only where it is edited moves.

## 3. Architecture

- `Settings.tsx`: `SettingsTab` becomes `'data' | 'contexts' | 'templates' | 'features' |
  'advanced' | 'about'`; `initialTab` callers (profile chip, help store requests, App's setup start)
  move from `'folders'`/`'advanced'` to `'data'`. The bottom Save/Reset bar for draft tabs goes; the
  Data tab draws its own under the left column.
- `useSettingsDraft.ts`: `handleSave` becomes `saveFields(scope)` with scope `'folders' |
  'calendar' | 'gmail'`: it cleans the scope's fields as today and writes them over the stored
  settings (`{...storedNow, ...scopeFields}`), so a Save in one block never writes another block's
  unsaved edits. The Inbox rename runs for `'folders'` only. `unsavedFolders` (the check FoldersTab
  makes today) is exported for T2.
- New `screens/settings/DataTab.tsx` (folders left, setup assistant and ProfilesSection right);
  `FeaturesTab.tsx` takes the two blocks from `DraftTabs.tsx`, which keeps the field components
  (`FolderFields`, `CalendarFields`, `GmailFields`); `AdvancedTab.tsx` takes the debug part of
  `AboutTab.tsx` (moved as `screens/settings/ReportingSection.tsx`), loses Profiles, Touch test and
  Check device files.
- `ProfilesSection.tsx`: `useEinkRefreshOnLoad(profiles === null)` (T3); a `locked` prop greys
  Switch (T2).
- Help: `settings.md` gets one section per tab (Data with "Setup assistant", "Folders",
  "Profiles"; Features with "Google Calendar" and "Gmail" pointing to `features.md`; Advanced with
  "Reporting a problem" and "Tools"; About). Anchors in other pages move with it; the link check
  catches every one.

All touched files stay in the feature area `settings`; nothing grows past 600 lines.

## 4. Steps

- **T-a** Remove Touch test and Check device files (T7), CHANGELOG "Removed".
- **T-b** Draft by scope (`saveFields`), Data tab, Features blocks, Advanced and About (T1-T6, T9),
  profile chip and initial tabs.
- **T-c** References and help (T8), CHANGELOG "Changed", scenario catalog, device test.

## 5. Test scenarios

1. Settings opens on Data; the tab bar shows six tabs.
2. Editing a folder field greys Run setup assistant and Switch; Save makes them active again.
3. With Google Calendar on, Features shows the ICS block; its Save stores the link and leaves an
   unsaved folder edit on Data unsaved.
4. Gmail off: no Gmail block; the stored address is still there after switching it on again.
5. Advanced holds Debug logging and Export debug bundle; About invites reporting and names Advanced.
6. The profile chip in the tab bar opens Settings on Data.
7. No touch probe or touch log remains (code health: no file imports `touchDiag`).

## As built

- T-b and T-c are one commit: the help pages change with the screens they describe.
- `unsaved(scope)` compares with the draft's own loaded-or-saved baseline, not the global
  settings snapshot, so it works the same wherever the draft lives.
- Reset to defaults now resets only the folder fields (it used to reset the whole draft).
- The profile list asks for an e-ink refresh after every listing (first load and Refresh list).
