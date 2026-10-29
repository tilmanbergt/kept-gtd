# Technical design — remove Kept's data

Status: **APPROVED** (§7 decided as proposed; placed on the Data tab of
`technical-design-settings-tabs.md`, which is built first). Part of 0.24.0.

## 1. Why

Uninstalling Kept leaves data behind (device test on 0.23.0; step D0 records it in
`docs/dev/supernote-host-facts.md`): the settings, the Gmail app password and the calendar link survive
in the plugin host's key–value store, and only the runtime permissions are reset. The SDK gives a
plugin no uninstall event (`sn-plugin-lib` has start and stop listeners only; its `UninstallCallback`
interface is not wired to plugins), so Kept can't clean up when it is removed.

That is good for a broken install - remove, reinstall, everything is still there - but it means:

- someone who stops using Kept, or gives the device away, keeps a Gmail app password in a store they
  can't see;
- Kept's own leftovers (debug logs, the demo space, old gtdpara folders) stay unless the user finds and
  deletes them by hand;
- a real first start (setup assistant) can't be reproduced by uninstalling.

Goal: one place where Kept shows everything it has put on the device, and removes what the user
picks. Leaving the device clean is part of keeping one's word - the plugin's integrity signal.

## 2. Requirements

- **R1 One place**: Settings → Data → **Remove Kept's data…**, under Profiles, always shown. It opens
  a screen in place of the settings, like the setup assistant. Greyed while the folder fields have
  unsaved changes (settings-tabs T2).
- **R2 Inventory first**: before anything is removed, the screen lists every kind of data (§3) with
  what it is, where it is, how much (files, entries) and a checkbox. Kinds with nothing in them are
  shown greyed with "nothing here", so the list itself says what Kept ever stores.
- **R3 Defaults**: Kept's own data on (stored settings, secrets, caches, private data, logs, demo
  space, old gtdpara folders, leftover save copies); the user's data off (profiles, data files). Every
  row can be unchecked or checked.
- **R4 Never touched**: notes and every other file the user made, anything in `Note/` outside the
  demo folder except the data files of §3 row 9 (when checked), `Document`, `MyStyle`, `INBOX`,
  `SCREENSHOT`, archive PDFs, and other plugins' entries in the host's store.
- **R5 One confirmation**: **Remove…** shows the summary in the status line ("Remove 7 kinds of
  data? This can't be undone.") with **Remove** and ✕. FILE:DELETE is requested only after that,
  with a reason naming what goes.
- **R6 Robust order**: files first, the host store last, so a failure leaves the settings in place
  and the user can run it again. One kind failing doesn't stop the others. The result screen lists
  each kind: removed, partly removed (n of m), failed (why), skipped.
- **R7 Afterwards**: when the stored settings were removed, Kept is as on a first install: the
  result screen offers **Close Kept** (then uninstall in the Supernote's settings) and **Start
  fresh** (Kept starts again with the setup assistant). Otherwise **Done** returns to Settings.
- **R8 Safety nets**:
  - When profiles are kept and the stored settings go, the option **Save the active profile first**
    (on by default) saves it before anything is removed, so the setup can come back. The screen
    says that the Gmail app password and the calendar link are never in profile files.
  - Open lasso marks: when private data is checked, the row says "2 open marks lose their picture
    and handwriting - process them first" with **Process ›**.
  - Data files (row 9): checking it shows a second line "Your todos, meetings and agreements are in
    these files. Copy them first if you want to keep them." and the summary in the status line
    names it first.
  - While the demo profile is active, the demo space can only be removed together with the stored
    settings (otherwise Kept would point at deleted folders); the row says so.
- **R9 Quiet logging**: file logging is switched off in memory before the removal starts, so the
  debug log doesn't recreate the folder being removed. The console log gets counts per kind only -
  no paths with project names.
- **R10 Help and changelog**: Settings help gets "Removing Kept's data"; Troubleshooting gets
  "Uninstalling Kept" (uninstalling keeps the settings; remove the data first, then uninstall).
  CHANGELOG line under 0.24.0.

## 3. What Kept puts on the device

| # | Kind (row label) | Where | Default | Counted as |
|---|---|---|---|---|
| 1 | Settings | host store `gtdpara:settings:v1` | on | 1 entry |
| 2 | Gmail app password and calendar link | host store `gtdpara:profileSecrets:v1` (all profiles) | on | profiles with secrets |
| 3 | Recent tags, recent places, calendar cache | host store `gtdpara:tagUsage:v1*`, `gtdpara:captureDestinations:v1*`, `gtdpara:googleCalendarCache:v1*` (per profile) | on | entries |
| 4 | Lasso mark pictures and temporary files | the plugin's private `data/` and `tmp/` folders (`marks/`, `pending-icons.json`, PDF pages) | on | marks, files |
| 5 | Debug and performance logs | `EXPORT/kept-gtd/debug` (log, debug bundles, integrity reports, touch logs, `perf/`) | on | files |
| 6 | Demo space | `Note/kept-gtd-demo`, the profile file `demo.json` and its stored entries | on | files |
| 7 | Old gtdpara folders | `EXPORT/gtdpara`, `Note/gtdpara-demo` (from before 0.20) | on, shown only when present | files |
| 8 | Leftover save copies | hidden `.*.gtdpara-tmp` files next to data files (an interrupted save) | on, shown only when present | files |
| 9 | Kept's data files | `project.txt`, `area.txt` in the Projects, Areas and Archive folders, `Inbox.txt` | **off** | files |
| 10 | Saved profiles | `EXPORT/kept-gtd/profiles` (then also `EXPORT/kept-gtd` when empty) | **off** | files |

Rows 1-3 are found by listing the host store's keys and taking those that start with `gtdpara:` -
never `clear()`, the store may be shared with other plugins. Rows 1-3 can be checked one by one, but
checking row 1 checks 2 and 3 too (a fresh start with old secrets would be confusing); unchecking 2 or
3 afterwards is allowed.

Row 9 removes only the files: the project and area folders, their notes, `Todos` and `Meetings`
folders and every other file stay, as plain folders. Kept would see them again as projects and areas
on its next start and write new empty files, so row 9 is meant together with row 1 (the screen says
so when only row 9 is checked).

**Not offered, and why** (listed at the bottom of the screen under "Stays on your device"):

- *Notes Kept created* (home notebooks, meeting and todo notes, loop notes): they hold your
  handwriting. Delete them in the Supernote's file manager if you want.
- *Kept's marks inside notes*: the bookmark and check icons of lasso marks, the keywords and headings
  Kept wrote. They are part of the notes; removing them would mean rewriting every note.
- *Empty folders* Kept created (`1 Projects`, `Todos`, …): yours to keep or delete.
- *Archive PDFs*: your record of finished projects.
- *Runtime permissions*: the Supernote resets them when you uninstall.

## 4. Architecture

- `src/domain/dataRemoval.ts` (pure): the kinds (§3) with labels, defaults and dependencies (row 1
  checks 2 and 3; demo rule; row 9 hint), `planRemoval(inventory, choices)` → ordered steps, the
  status-line summary, the result texts. No I/O.
- `src/storage/dataRemoval.ts`: `takeInventory()` (lists the store's keys, counts files under the
  paths of §3, counts open marks, checks the active profile) and `runRemoval(plan, onStep)`, which
  runs the steps in the order of R6: rows 7, 6, 5, 8, 9, 10 (files), 4 (private folders), then 3, 2,
  1 (store). Reuses `saveActiveProfile` for R8 and `deletePrivateDataTree` for row 4, deleting the
  contents of `data/` and `tmp/` only - never the private folder itself, which holds the installed
  plugin.
- Native: one new method `GtdParaFile.deleteKeptTree(path)` in `GtdParaFileModule.kt`, deleting a
  folder tree or a file only when it lies inside one of the fixed roots `EXPORT/kept-gtd`,
  `EXPORT/gtdpara`, `Note/kept-gtd-demo`, `Note/gtdpara-demo`; anything else is refused on the
  native side. Rows 8 and 9 delete single files by exact name (`project.txt`, `area.txt`,
  `Inbox.txt`, `.*.gtdpara-tmp`) through a second method `deleteKeptFile(path)` that refuses every
  other file name. Wrapped in `src/supernote/fileSystem.ts` (behind the FILE:DELETE grant like
  `deleteEmptyFolder`); the fake device implements both with the same rules.
- `src/screens/settings/RemoveDataScreen.tsx`: inventory rows with `CheckToggle`, the R8 lines, the
  "Stays on your device" list, **Remove…**, then the result screen. Status through `useStatus`.
- **Start fresh** reuses the reset of a profile switch (clear caches, reset in-memory settings
  snapshot, remount); with no stored settings the load sees a fresh install and the setup assistant
  opens (`migrateExperimentalFlags`). **Close Kept** calls `closePluginView`.
- R9: `utils/log.ts` gets `suspendFileLogging()` (in memory, until restart or Start fresh).

All new files belong to the feature area `settings` (`scripts/test-areas.json`); each stays well
under 600 lines.

## 5. Steps

- **D0** Native `deleteKeptTree` / `deleteKeptFile` with root and name rules, fileSystem wrappers,
  fake-device support, unit tests for the refusals; host-facts note on uninstall.
- **D1** Domain `dataRemoval.ts` and storage inventory, with tests.
- **D2** `runRemoval` (order, partial failure, quiet logging, Save profile first), with tests.
- **D3** Screen, Settings → Advanced entry, Start fresh / Close Kept, scenario tests.
- **D4** Help pages, CHANGELOG, design-overview, device test.

## 6. Test scenarios (become `__tests__/scenarios/removeData.test.tsx`)

1. The inventory lists every kind with its count; empty kinds are greyed; profiles and data files are
   unchecked.
2. Removing with the defaults leaves no `gtdpara:` key, no `EXPORT/kept-gtd/debug`, no demo folder,
   no private mark data; `EXPORT/kept-gtd/profiles`, every `project.txt` and every note stay.
3. Start fresh after that opens the setup assistant.
4. A failing log deletion still removes the rest, keeps the settings (store last) and reports "failed".
5. With profiles kept and Save the active profile first on, `production.json` holds the settings from
   before the removal.
6. Two open marks: the row warns and Process › opens them.
7. With the demo profile active, the demo row is locked to the settings row.
8. Checking data files removes `project.txt`, `area.txt` and `Inbox.txt` and leaves the folders,
   their notes and their other files.
9. Another plugin's key in the host store survives.
10. The native rules refuse a path outside the fixed roots and any other file name.

## 7. Decisions

1. Profiles (row 10) and data files (row 9) are off by default, everything else on.
2. Row 9 covers the Projects, Areas and Archive folders and the Inbox.
3. The result screen offers both **Start fresh** and **Close Kept**.
4. Check device files and the Touch test are removed in the settings restructure, not kept next to
   this.
