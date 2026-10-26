# Technical design: the Current page opens in one render (perf round "Current page")

Status: **approved** (Tilman, 2026-10-26). Branch `feature/perf-current-page`, after 0.21.0. Release **0.21.1** (O1).
Builds on `docs/dev/history/technical-design-render-perf-ab.md` (rounds A + B: memoized Quick Add, stable
callbacks) and `docs/dev/history/technical-design-perf-threads.md` (§10 O2: once the Threads roster is fast, measure
the base time of a page open). This document is the source for the implementation. Where the code shows the design
is wrong or incomplete, update this document in the same commit and note it under "As built".

## 1. Requirements (as decided in review)

- **R1 Same page, less work.** The Current page (a Project's or Area's page: Threads/Projects/Files on the left,
  Quick Add, Todos and Meetings on the right) shows exactly what it shows today, with the same paging, the same
  tabs, the same Quick Add behavior and the same files written. Only the number of renders, settings reads and
  layout passes changes. Exceptions: R6 (the Files listing loads when its tab is first opened) and R2's "settings
  changes show at once" (today they show on the next mount).
- **R2 One settings source.** A component on the Current page never reads AsyncStorage itself while settings are
  known. It reads the settings snapshot (`storage/settingsSnapshot.ts`, perf-threads §3.6) and re-renders only when
  the part it uses changes. Reading the stored settings again returns the same object when nothing was written
  (no new parse, no migrations, no re-render).
- **R3 Quick Add renders only when its own inputs change.** A parent re-render with the same inputs does not render
  Quick Add again (its `React.memo` actually skips).
- **R4 State lives where it is used.** A change that belongs to one part of the page (Quick Add's error, a
  section's "hide done", the status panel's own load) renders that part, not the whole page. An item that is in the
  cache is shown in the first render, without a "Loading…" round.
- **R5 Quick Add mounts what is shown.** Its first render builds the active tab's rows only; the other tabs' rows
  are built after the page is on screen (before the user can reach them), and stay mounted afterwards.
- **R6 No hidden folder listing on open.** While the Threads (or Projects, Notebook) tab is shown, the Files tab's
  folder is not listed and does not hold back the page's e-ink refresh. It is listed when a Files root is first
  shown, with the loading state it already has when drilling into a folder.
- **R7 The layout settles once.** Every box on the page has its final height in the first layout, and a paged list
  that was measured before starts with that height, so each list pages once per open.
- **R8 Measurable.** The trace shows each part's render (ThreadsTab, FileBrowserPane, TodosSection,
  MeetingsSection, MarksCard and the Quick Add rows), so the first render's cost can be split.
- **Not in this change:** keeping the Current page mounted across items (suggestion 8: later, if the numbers after
  this round call for it), other screens (Daily, Week, Month, Inbox, Review: they profit from R2's cheaper read
  without changing their call sites), the cold start (duplicate item loads, duplicate note-element reads: separate
  topic).

## 2. Current state (device traces, 0.21.0-beta+9747eed, debug logging and perf tracing on)

Opening an item from the Areas list ("nav current", warm cache, kept tabs on), tap to final e-ink flush:

| Item | Todos / meetings | Tap → flush | First commit | Quick Add renders | ItemDetail / ProjectDataPanel renders | Settings reads | Last commit → flush |
|---|---|---|---|---|---|---|---|
| Haushalt | 23 / 5 | 4585 ms | 527 ms | 6 = 2418 ms (first 683) | 5 / 9 | 8 | 1118 ms |
| Zen | 1 / 5 | 4874 ms | 608 ms | 6 = 2526 ms (first 688) | 5 / 9 | 8 | 1076 ms |
| Art of Transformation | 16 / 14 | 5318 ms | 510 ms | 6 = 2429 ms (first 641) | 5 / 9 | 8 | 1777 ms |
| Atruvia | 97 / 126 | 5505 ms | 748 ms (roster 178) | 6 = 2440 ms (first 623) | 5 / 9 | 8 | 1724 ms |

For comparison: going back to the (kept) Areas list takes 0.57-0.75 s.

What the traces show:

- **The cost does not depend on the data.** Zen (1 todo) costs what Atruvia costs. The JS thread is busy from the
  tap to the last commit (`frame:gap` ≈ 2 s twice in a row, no frame drawn). The native calls of the open (folder
  listing 2.3-3.0 s, settings reads 0.2-2.7 s, `statFiles` 1.3 s) are slow only because their results wait for JS:
  at a quiet moment the same settings read takes 15 ms and the same listing 33 ms.
- **Seven render rounds instead of one or two.** First commit (~0.5-0.75 s, ProjectDataPanel shows "Loading…" and
  ItemStatusPanel nothing), then ProjectDataPanel's content with Quick Add (~0.65 s), then five more rounds of
  0.33-0.47 s each, every one rendering Quick Add again.
- **Every settings read triggers a round.** Eight reads per open, each parsing the 40 KB stored settings and running
  the migrations, each setting its own state when it lands:
  `ItemDetail` (paths), `ProjectDataPanel` (paths and settings), `TodosSection` (hide done), `MeetingsSection`
  (calendar URL, Note setups), `useHomeNotebooks` (on mount and again on screen show), `useHomeNotebookRenameOffer`,
  `useTendingData`. The rounds start right after reads land (Zen: reads end at 2064-2123 ms → round at 2131; 2882 →
  2888; 3353 → 3360).
- **Quick Add's memo never skips here.** `ProjectDataPanel` spreads `agreements.actions.handlers` into its props, and
  `ui/useAgreementActions.ts` builds those handlers (and `editTarget`, `card`) as new objects in every render; the
  todo and meeting cards (`useTodoCard`, `useMeetingCard`) do the same while one is selected. So every
  ProjectDataPanel render is a Quick Add render (~350 ms each).
- **Quick Add's first render builds every tab.** `QuickAddFrame` holds every tab's input and metadata rows at once,
  the inactive ones hidden (Todo, Meeting, Note, Agreement): ~620-690 ms.
- **The cached item still takes a round.** `ProjectDataPanel` starts with `loading = true` and sets the item after
  `await ensureItemCached(…)`, which is a cache hit (`cache:itemHit`); `ItemStatusPanel` does the same and renders
  `null` until then.
- **The layout settles two or three times.** Threads is measured at 952 px, then 569-599, then 576-585; Todos and
  Meetings move by 5-7 px. The first layout happens before ItemStatusPanel (below the Threads list) has content;
  when it appears the left pane's list shrinks. Each measurement re-pages the lists (30-34 PagedSection renders per
  open), and these passes are the 1.1-1.8 s between the last commit and the flush.
- **The Files tab's folder is listed while Threads is shown.** `FileBrowserPane` scans `current` on mount whatever
  tab is active, and `useEinkRefreshOnLoad(loading)` requests the e-ink refresh when that listing lands.

## 3. Design

### 3.1 Settings: one snapshot, identity-stable reads (`storage/settingsSnapshot.ts`, `storage/settingsStorage.ts`, `ui/useSettings.ts`)

```ts
// storage/settingsSnapshot.ts (exists: peekSettings, rememberSettings)
export function subscribeSettings(listener: () => void): () => void;   // called when the snapshot object changes
// storage/settingsStorage.ts
loadSettings(): Promise<GtdParaSettings>      // same signature; see below
// ui/useSettings.ts (new)
export function useSettings(): GtdParaSettings | null;                          // the snapshot, live
export function useSettingsValue<T>(select: (s: GtdParaSettings) => T, equal?: (a: T, b: T) => boolean): T | null;
```

- **Identity-stable read.** `readSettings` keeps the raw stored string it last parsed and the settings it produced.
  When AsyncStorage returns the same string and no migration ran, it returns that same object: no `JSON.parse`, no
  migrations, no new object. `writeSettings` updates both (the written object and its JSON). So a read that finds
  nothing new costs one AsyncStorage get and a string compare, and a caller's `setState(sameObject)` is a no-op.
- **One read at a time.** Concurrent `loadSettings()` calls share one in-flight read.
- **Notification.** `rememberSettings` notifies `subscribeSettings` listeners when the object changes (a write, a
  read that found a changed string, a profile switch). It does not notify for the same object.
- **Rule for callers (stated in the module doc comment):** a loaded settings object is never changed in place; a
  change spreads into a new object and goes through `saveSettings`/`patchSettings`. Audit in P1 (like perf-threads
  S14): search the repo for field assignments on settings objects; none found while drafting.
- **`useSettings()`** starts from `peekSettings()`, subscribes, and if the snapshot is null starts one shared
  `loadSettings()`. `useSettingsValue(select, equal = Object.is)` re-renders only when the selected value changes;
  derived values (`resolvePaths(s)`, `noteSetupConfig(s)`) are memoized per settings object.
- **Call sites on the Current page** switch to the hooks: `ItemDetail` (paths), `ProjectDataPanel` (paths,
  settings), `TodosSection` (`hideDoneProjectTasks`), `MeetingsSection` (`googleCalendarIcsUrl`, Note setups),
  `useHomeNotebooks` (settings; its screen-show reload stays, and now costs nothing when nothing changed),
  `useTendingData` (thread types: replaces S16's peek + load with the hook, keeping "set only on a real change"),
  `useEntryActions` (settings for the card actions). `useHomeNotebookRenameOffer` reads once in an effect without
  setting state; it keeps `loadSettings()`, which is now cheap.
- **Visible effect:** a setting saved in Settings shows on the Current page at once instead of on its next mount
  (R1 exception). A hidden kept tab re-renders on such a save only for the values it uses.

### 3.2 Quick Add's props are stable (`ui/useAgreementActions.ts`, `ui/itemCard/useTodoCard.ts`, `ui/itemCard/useMeetingCard.ts`, `screens/ProjectDataPanel.tsx`)

- `useAgreementActions`: each handler through `useStableCallback` (render-perf-ab §3 B2's rule: called from events
  only); `onAddAgreement` stays `undefined` without a target path, so its presence still decides the button.
  `editTarget` and `card` are memoized on their inputs (selected agreement, mode, changing); the returned object
  is memoized.
- `useTodoCard`/`useMeetingCard`: the returned card object is memoized on the selection and the stored entry;
  its callbacks are stable. `null` when nothing is selected (as today).
- `ProjectDataPanel`: every prop it passes to `QuickAddWidget` is a primitive, a stable callback, a memoized
  object or `null`. A test fails if a parent re-render with unchanged inputs renders Quick Add (§7).

### 3.3 ProjectDataPanel split by state owner (`screens/ProjectDataPanel.tsx` → `screens/projectData/`)

Today one component (817 lines) owns the item, the edit/arm target, Quick Add's error and handlers, the cards, the
agreements, the link check and the sections' callbacks, so any of these changes renders all of it.

- **`useProjectItem(kind, name, path)`** (new, `screens/projectData/`): the item from the cache, **synchronously** when
  it is cached (`findCachedItem`): `loading` starts as `false` on a hit, so the first render shows the content. A
  miss loads as today. `ItemStatusPanel` uses the same rule for its own state, so it has its content (and its
  height) in the first render.
- **`ProjectQuickAdd`** (new, memoized): Quick Add with everything only it needs: the add/edit/delete handlers, the
  widget error (`useActionError`), the cards, the agreement actions, `linkedFileMissing`. It gets from
  ProjectDataPanel only the item, the edit target and the arm/select functions.
- **`TodosSection`, `MeetingsSection`, `MarksCard`, `ItemStatusPanel`**: `React.memo`, with stable callbacks from
  ProjectDataPanel (`onStartEdit`, `onArmLink`, `onSelect` are inline arrows today) and their settings from §3.1.
- ProjectDataPanel keeps the shared view state (edit/arm target, counterpart filter, agreements view) and the
  layout. Selecting a row still renders the list and Quick Add (both show it); nothing else.
- Each new file ≤ 1,000 lines; ProjectDataPanel only shrinks.

### 3.4 Quick Add builds the active tab first (`ui/QuickAddWidget.tsx`, `ui/quickAdd/QuickAddFrame.tsx`, `utils/screenRefresh.ts`)

- The frame keeps one slot per tab as today, but a tab's rows are rendered only once that tab has been **needed**:
  it is active, an edit target or seed needs it, or the page's first e-ink flush has happened.
- `utils/screenRefresh.ts` gains `onNextEinkFlush(callback)`: after the flush (the page is on screen), Quick Add
  marks every tab as needed in one state update; the hidden rows are then built while the user reads the page.
  Built rows stay mounted (hidden), so switching tabs is as today.
- Why not simply lazy per tap: building a tab's rows on the first tap caused the 2026-09-09 tab-switch flicker
  (render-perf-ab §1). Pre-building right after the flush avoids it; the device test checks the first switch to
  every tab (§7).

### 3.5 The layout settles once (`ui/ItemStatusPanel.tsx`, `ui/useMeasuredHeight.ts`, `ui/PagedSection.tsx`)

- **Final heights in the first layout:** ItemStatusPanel renders its content in the first render (§3.3). Anything
  else that appears later above or below a paged list on this page (the counterpart filter pill, MarksCard, the
  agreements link) either reserves its height from the first render or is shown in the first render; P5 lists
  them with their measured heights.
- **Remembered heights:** `useMeasuredHeight(memoKey?)` starts from the last height measured for `memoKey` (a
  module-level map, like the tag-row widths of render-perf-ab A2) and stores every measurement. PagedSection
  passes `memoKey = '<screen layoutKey>:<header>'` (`current:Threads`, `current:Todos`, `current:Meetings`); other
  callers pass none and behave as today. On a revisit the measured height equals the start value: no state change,
  no re-paging. The first open of the session still measures once.

### 3.6 No hidden folder listing on open (`ui/FileBrowserPane.tsx`)

- While an extra tab (Threads, Projects/Loops, Notebook) is active and no root has been shown yet in this mount,
  the listing effect does not run, `loading` stays as it is and does not take part in `useEinkRefreshOnLoad`.
- The first time a root is shown (tap on Files, a link arm, refile, area assignment), it lists as today, with its
  loading state; from then on it behaves as today (folder-change subscription, quiet reloads).
- Arming flows that open a root keep working: they switch the active root, which counts as "shown".

### 3.7 Measuring (`utils/perf.ts` callers)

- `usePerfRender` in `ThreadsTab`, `FileBrowserPane`, `TodosSection`, `MeetingsSection`, `MarksCard`,
  `ProjectQuickAdd` and per Quick Add tab's rows (`QuickAddRows:task`, `…:meeting`, `…:note`, `…:agreement`).
- A counter `settings:read` (AsyncStorage reads that parsed) next to the existing `load:settings` span.
- No log lines (the trace has it all); nothing changes while tracing is off.

## 4. Expected effect

Per open (estimate from the four traces; to be checked by the device traces):

| | Today | Target |
|---|---|---|
| Render rounds | 7 | 2 (first content, the post-flush Quick Add rows) |
| Quick Add renders | 6, ≈ 2.4 s | 2, ≈ 0.6 s (first ≈ 0.35, rows after the flush) |
| Settings reads that parse | 8 | 0 (snapshot known) |
| Layout passes per list | 2-3 | 1 (0 re-pagings on a revisit) |
| Tap → e-ink flush | 4.6-5.5 s | ≈ 1.5-2 s |

The Atruvia roster (≈ 180 ms) stays inside the first render.

## 5. Files

| File | Change |
|---|---|
| `src/storage/settingsSnapshot.ts` | `subscribeSettings`, notify on change |
| `src/storage/settingsStorage.ts` | identity-stable read (raw string + object), shared in-flight read; module doc: settings objects are never changed in place |
| `src/ui/useSettings.ts` (new) | `useSettings`, `useSettingsValue` |
| `src/screens/ItemDetail.tsx` | paths from `useSettingsValue` |
| `src/screens/ProjectDataPanel.tsx` | split (§3.3), stable Quick Add props |
| `src/screens/projectData/useProjectItem.ts` (new) | synchronous cache hit |
| `src/screens/projectData/ProjectQuickAdd.tsx` (new) | Quick Add and its handlers |
| `src/screens/projectData/TodosSection.tsx`, `MeetingsSection.tsx` | memo, settings hook, render marks |
| `src/ui/ItemStatusPanel.tsx` | synchronous cache hit, memo |
| `src/ui/MarksCard.tsx` | memo, render mark |
| `src/ui/useAgreementActions.ts`, `src/ui/itemCard/useTodoCard.ts`, `useMeetingCard.ts` | stable handlers, memoized objects |
| `src/ui/QuickAddWidget.tsx`, `src/ui/quickAdd/QuickAddFrame.tsx` | rows per needed tab (§3.4) |
| `src/utils/screenRefresh.ts` | `onNextEinkFlush` |
| `src/ui/useMeasuredHeight.ts`, `src/ui/PagedSection.tsx` | remembered heights (`memoKey`) |
| `src/ui/FileBrowserPane.tsx` | listing only once a root is shown (§3.6) |
| `src/ui/useHomeNotebooks.ts`, `src/screens/thread/useTending.ts`, `src/ui/useEntryActions.ts` | settings hook |
| `test-helpers/…`, `__tests__/…` | §7 |
| `docs/dev/design-overview.md` | §2.12 settings snapshot and hooks; §3 "a component reads settings through the snapshot hooks; loaded settings are never changed in place" |
| `docs/user/projects-and-areas.md` | only if the Files tab's first open needs a word (R6); check in P6 |
| `CHANGELOG.md` | Fixed (§8) |

## 6. Test scenarios (Given/When/Then)

1. **Same page as before.** Given the big data set's Area Atruvia, a small Area and a Project with an Area, when
   each page opens, then the Threads, Todos, Meetings and Quick Add texts and pages are the same as before this
   change (golden texts recorded in P0).
2. **One render of Quick Add per open.** Given the app has started and the settings are known, when an Area page
   opens, then Quick Add renders once before the page is on screen, and once more for the other tabs' rows after
   the flush.
3. **No settings read on open.** Given the settings are known, when an Area page opens, then no settings read
   parses the stored settings.
4. **A setting shows at once.** Given the Current page is open, when "hide done" is switched in the Todos section,
   then the Todos list changes and Quick Add does not render.
5. **Quick Add tabs as before.** Given an Area page is on screen, when I tap Meeting, Note and Agreement in turn,
   then each tab shows its rows at once (no empty frame), and an edit of a meeting opens the Meeting rows.
6. **Lists page once.** Given an Area page was opened before in this session, when it opens again, then each paged
   list is measured once and pages once.
7. **Files listed on demand.** Given an Area page with Threads shown, then its folder is not listed; when I tap
   Files, then the folder is listed and shown; arming a link from a todo lists the root it opens.
8. **Cached item at once.** Given the item is in the cache, when its page opens, then the first render shows its
   Todos and Meetings (no "Loading…") and the status panel.

## 7. Test plan

**Automated (`npm run check`):**
- **P0 golden texts** (before any change): `__tests__/scenarios/currentPageGolden.test.tsx` on the fake device with
  the perf-threads big data set (`test-helpers/bigScope.ts`) plus a small Area and a Project with an Area: the
  visible texts and the rows each PagedSection is handed, per Current page, per Quick Add tab, committed as JSON
  (`__tests__/scenarios/__golden__/currentPage.json`, recorded with `GOLDEN_WRITE=1`). It stays green unchanged from
  P1 on.
- **P0 render counter** (`test-helpers/renderCounts.ts`): counts `usePerfRender` calls per component and settings
  reads per open on the fake device (perf marks off, a test-only counter). P0 records today's counts in the step
  report; each later step tightens the assertion to its target.
- Unit: `settingsSnapshot` notify only on change; `loadSettings` returns the same object for an unchanged string,
  a new one after a write or an outside change, one in-flight read for concurrent calls; `useSettingsValue`
  re-renders only on a changed selection; `useAgreementActions` handler identity stable across renders, presence
  of `onAddAgreement` follows the target; `useMeasuredHeight` with a key: no state change for a remembered height;
  `FileBrowserPane` lists nothing while an extra tab is active, lists on the first root switch.
- `__tests__/ui/currentThreadsTab.test.tsx` and every 0.21 scenario test stay green unchanged.
- Scenario tests for §6 2-8 in `__tests__/scenarios/currentPagePerf.test.tsx`.

**On the device (build with `buildPlugin.ps1`, perf tracing on):**
- [ ] Before installing: traces of opening Zen, Haushalt, Art of Transformation and Atruvia from the Areas list
      (the four in §2 are enough if nothing changed).
- [ ] After: the same four, 3 times each; per trace: tap → flush, Quick Add renders, settings reads, layout passes.
      Target: tap → flush ≤ 2 s for all four.
- [ ] Atruvia's page looks the same as before: Threads, Todos, Meetings pages, Quick Add tabs (screenshots).
- [ ] Quick Add: switch to Meeting, Note, Agreement right after the page appears - no flicker, no empty frame; edit
      a todo, a meeting, an agreement; "+ next" from a Threads row fills the meeting draft.
- [ ] Files tab: first tap shows the folder (with a short loading state); link a file from a todo (arm), refile a
      todo, assign an Area.
- [ ] Switch "hide done" in the Todos section, open another item and come back: the state is kept. Change a Note
      setup's tags in Settings, come back to the page: Threads and the meeting rows follow it.

## 8. CHANGELOG (`[Unreleased]` → Fixed)

- Opening a Project or Area page is much faster: the page is built once instead of several times, and no longer
  re-reads the settings for every part of it.

(R6 needs no line: the Files tab opens as it does when drilling into a folder.)

## 9. Steps (one commit each, `npm run check` green, prefix `perf-current: P<n> -`)

| Step | Content | Check |
|---|---|---|
| P0 | §3.7 render marks; golden texts; render counter (records today) | `npm run check`; device "before" traces optional |
| P1 | §3.1 settings snapshot hooks, identity-stable read, audit; call sites | golden unchanged; settings reads per open = 0 |
| P2 | §3.2 stable Quick Add props | golden unchanged; Quick Add skips a parent re-render |
| P3 | §3.3 split, synchronous cache hit, memoized sections | golden unchanged; render rounds per open ≤ 2 |
| P4 | §3.4 rows per needed tab, `onNextEinkFlush` | golden unchanged; Quick Add first render builds one tab |
| P5 | §3.5 final heights, remembered heights | golden unchanged; one layout per list on a revisit |
| P6 | §3.6 Files listing on demand | golden unchanged; scenario 7 |
| P7 | Scenario tests §6; docs; CHANGELOG; "As built" | `npm run check`; `npm run scenarios`; device test §7 |

## 10. Open points

- **O1 Release - decided:** a patch release, **0.21.1** (`nextVersion` set on this branch).
- **O2 R6 - decided:** the Files tab's folder is listed and its list rendered only when the tab is actually opened;
  its first open shows the loading state it has when drilling into a folder.
- **O3 - decided:** whether to keep the Current page mounted across items (suggestion 8) is decided on the device
  numbers after P7.
- **O4 Cold start - later** (separate topic, backlog): `area.txt` read and parsed 4-5 times in parallel while no
  cache exists; the launch note's page elements and titles read twice (1.5-9.9 s host calls); `getCurrentNotePath`
  twice.

## As built

- **P0.** Render marks in `ThreadsTab`, `FileBrowserPane`, `TodosSection`, `MeetingsSection`, `MarksCard` and in each
  Quick Add tab's input row (`QuickAddRows:task|meeting|note|agreement`). The `settings:read` counter (§3.7) comes with
  P1, where reads and parses part ways.
- **P0 golden master:** `__tests__/scenarios/currentPageGolden.test.tsx` records Atruvia (and each Quick Add tab),
  Zen, Tender and Solo from the perf-threads data set: the visible texts and the rows every paged list on screen is
  handed (kept tabs' lists included) in `__tests__/scenarios/__golden__/currentPage.json`.
- **P0 render counter:** `test-helpers/renderCounts.ts` counts `usePerfRender` calls; the scenario
  `__tests__/scenarios/currentPagePerf.test.tsx` opens Atruvia and Zen with another item's page open before. The fake
  storage answers at once, which lets React batch every settings read into one render; the test makes each settings
  read answer a few ticks after the previous one, as on the device. With that it shows the device's picture: per
  open Quick Add 6, ItemDetail 5, ProjectDataPanel 7 (device: 9) renders, 8 settings reads. These are P0's limits;
  each step lowers them.
- `test-helpers/bigScope.ts` gains `bigScopeSettings()` (the data set's Note setups).
- **P1.** As designed, plus: a read that started before a write never puts its (older) result into the snapshot
  (a write counter), and the in-flight read is dropped by every write. The audit found no code that changes a
  loaded settings object in place (the Settings screen's draft is replaced, never changed). `useHomeNotebooks` no
  longer reloads the settings when its screen is shown (the snapshot has every change);
  `useHomeNotebookRenameOffer` reads `peekSettings()` first. `useEntryActions` is not on the Current page (thread
  and loop overviews) and keeps its own load; it profits from the cheaper read. The `settings:read` perf counter
  counts reads that parse. `__tests__/ui/threadsTabOnce.test.tsx` (S16) tested that a settings *load* with other
  thread types rebuilds the roster; with P1 a change arrives through the snapshot instead, so its two cases now
  change the snapshot (same types: no rebuild; other types: one more). Counts per open after P1: Quick Add 3,
  ItemDetail 3, ProjectDataPanel 3 renders, no settings read.
- **P2.** The props that broke Quick Add's memo were the agreement handlers alone (`ui/useAgreementActions.ts`, new
  closures per render); they are stable now, and the handlers object is memoized. The todo and meeting cards are
  `null` while nothing is selected, so an open is not affected by them; memoizing them (§3.2) is left out, as it
  changes nothing for the open and their callbacks read the latest state. One more render came from Quick Add
  itself: the meeting draft's "follow `initialDate`" effect (`ui/quickAdd/useMeetingDraft.ts`) built a new draft
  on mount even when date and monthly were the same; it keeps the draft then. Per open after P2: Quick Add 1
  render (ItemDetail and ProjectDataPanel 3: those rounds no longer reach Quick Add).
