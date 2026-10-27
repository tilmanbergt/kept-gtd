# Technical design: Daily slimmer, Settings → Features (0.22.0)

Status: APPROVED (2026-10-26). Scope cut down after the baseline trace (§9); the Features tab with focus mode,
close-out and the moved Experimental switches added (§3.6). The repo copy is made at implementation: `docs/dev/history/technical-design-daily-slim.md`.
Version: **0.22.0** (hiding focus mode by default changes behaviour). Agenda moves to 0.23.0.

## 1. Requirements as decided

- R1 `src/screens/DailyView.tsx` (1,509 lines, on `scripts/code-health-baseline.json`) gets well below the 1,000-line
  limit and leaves the baseline. Split by responsibility.
- R2 With the switch on, Daily and focus mode work exactly as in 0.21.1.
- R3 Speed is a small side goal: "Daily opens a little faster the first time". Only the cheap items from the trace;
  no re-render memoization of rows/columns (to the backlog).
- R4 New Settings tab **Features** with the first feature switches (2026-10-26):
  - **Focus mode**: off by default for everyone, existing installs included;
  - **Project close-out**: on by default for everyone;
  - section **Experimental**: Google Calendar, Gmail and Notebook contents, moved here from Advanced unchanged
    (same stored keys, same defaults).
  Other modules (meeting management, goals & focus, threads, loops, Engage, lasso) are later releases
  (`claude/feature-feature-modules.md`).
- R5 Switch off hides: Daily's **Focus mode** button and the focus mode screen, the **double tap** on the `#next`
  label, and the **Now** chip on the todo card. A todo that already carries `#now` keeps showing its `#now` label;
  nothing in any file is rewritten.
- R6 Own branch, release 0.22.0. Before/after perf trace as in §9.

## 2. Current state (0.21.1)

- ~300 lines of Daily duplicate `ui/useEntryActions.ts` (save through the cache, tick, edit commits, quick-file,
  notes, add, linked files, card wiring). Daily-only extras: the `#now` toggle and the focus-mode bulk clear, which
  needs the freshly written Inbox threaded from write to write.
- Focus mode (~330 lines) lives inside Daily; App.tsx already mounts a separate `<DailyView focusMode>` for
  `mode === 'focus'` and reopens it when `focusModeActive` is stored.
- The module comment is 83 lines; `backText`/`closeButton`/`closeText` are unused styles.
- Each visible todo's `taskRowLayout` runs ~4× per render.
- First render waits for `loadSettings()` (spinner pass) even when the cache is ready.
- The home-notebook state arriving re-renders the whole `DailyFocusPanel` (240 ms in the trace).
- Feature switches today: `domain/features.ts` + `ui/featureStore.ts` for the two experimental integrations
  (`experimentalGoogleCalendar`, `experimentalGmail`, Settings → Advanced). Requirements for modules in general:
  `claude/feature-feature-modules.md` (principles P1–P6, one `modules` map, Settings → Features).

## 3. Design

### 3.1 File layout

| File | Content | ≈ lines |
|---|---|---|
| `screens/DailyView.tsx` | data, edit target, cards, context filter, two-column layout | 450–550 |
| `screens/daily/useDailyData.ts` | load once (cache or rebuild), loading/error, items, inbox, paths, settings snapshot, today/tomorrow | 120 |
| `screens/daily/DailyTodosColumn.tsx` | Quick Add, Next todos `PagedSection`, failed-items line | 170 |
| `screens/daily/dailyRows.ts` | keys, `FlatTaskRow`, `flattenTaskGroups` | 40 |
| `screens/daily/DailyModeRow.tsx` | context pill + Focus mode button | 80 |
| `screens/daily/FocusModeScreen.tsx` | the focus mode views + styles | 300 |
| `screens/daily/useFocusSession.ts` | picker/working/complete state, cohort clear | 120 |

App.tsx renders `<FocusModeScreen onExitFocusMode … />` for `mode === 'focus'`. DailyView loses the `focusMode`
and `onExitFocusMode` props and every `focusMode ?` branch. The baseline entry for DailyView is removed.

### 3.2 Daily on `ui/useEntryActions.ts` (S1)

Daily calls `useEntryActions('DailyView')` and keeps only its own parts: `handleToggleItemFocus` (Focus panel),
`openItem` (item or Inbox tab), the context filter, `linkedFileMissing`. The hook gains:
- `toggleNow(entry)`: the `#next`/`#now` double tap (`setNowTag` + `withTaskText`) on the row error slot;
- `saveTasks` in its return value, with an optional `inboxOverride` and the written Inbox as its result (focus-mode
  bulk clear only);
- `todoCardOptions(entry, extra?)` / `cardOptions(entry, extra?)`, with `extra` spread over the defaults (Daily passes
  `onToggleNow`, `onOpenOwner`);
- settings from `useSettings()` (snapshot) instead of its own `loadSettings()` effect;
- `tracking()` memoized per settings object.

Internal differences, nothing user-visible: Daily's four status-slot ids become the hook's two
(`DailyView.rowError`, `DailyView.widgetError`); tick done calls `requestEinkRefresh()` as everywhere else; focus
mode logs as `FocusMode:`. Edit keys stay `<item path>#<index>`.

### 3.3 Shared data hook and focus mode screen (S2)

`useDailyData()` → `{loading, error, retry, items, inbox, inboxPath, paths, settings, todayDate, tomorrowDate}`,
`settings` from `useSettings()`. **Cache ready at mount** (the usual case): `loading` starts `false`, the first render
shows content, one `requestEinkRefresh()` after the first content commit. If the Inbox isn't cached yet, it loads in
the background. **No cache:** spinner → `rebuildCache` → content, as today. The quiet settings re-read on show goes
(the snapshot follows every write); the date re-check on show stays.

`FocusModeScreen` = `useDailyData()` + `useEntryActions('FocusMode')` + `useFocusSession()` + the three views,
"Coming up" (MeetingRow, one line) and the exit mark. `useFocusSession` holds `pickerMode` (with its one-time init),
`focusEntryNowMs` and `justCompletedTasks`. It derives `nowCohort`, `pickerCandidates`, `focusMeetings` and
`focusState`. Its `toggleDoneInSession` is today's `handleFocusToggleDone` with the logic unchanged: the toggle's
returned Inbox feeds the cohort lookup and each clearing write in turn (`actions.saveTasks(…, inboxOverride)`).
Scenario T3 pins this.

### 3.4 Row layout cache (S3)

`ui/taskRowLayout.ts` remembers its result per Task object: `WeakMap<Task, {key, layout}>`, key
`columnWidthPx|context|contextActive|today|task.text`. `text` carries every tag the layout depends on, so a Task
changed in place, or a new day, gets a fresh layout. One entry per Task; memory goes with the Task. Every caller
benefits unchanged (Daily, Current, Inbox, Review). Perf counters: `calc:taskRowLayout` (computed) and
`calc:taskRowLayoutHit`.

### 3.5 Small speed fixes (S4)

- `heightKey="daily:todos"` on Next todos (a remount starts with the remembered height).
- **Home-notebook icons redraw alone.** The icon subscribes to the home-notebook state store itself (a small
  `HomeNotebookIcon` that reads `homeNotebookOf` + the state for its item), so a state arriving re-renders the
  icons, not `DailyFocusPanel` or Week/Month's `PeriodFocusPanel`. `useFocusHomeNotebooks` keeps starting the one
  `statFiles` refresh per item set. If this turns out to touch more than the two panels and the hook, it moves to
  the backlog rather than growing the release.

### 3.6 Settings → Features (S5)

**The tab.** New Settings mini-tab **Features**, between Note setups and Advanced (`screens/settings/FeaturesTab.tsx`),
rows via the existing `CheckToggle`, taking effect immediately like the Advanced switches. Layout:

- **Focus mode** - "A screen with only the todos you marked #now and the next hours' meetings. Adds the Focus mode
  button on Daily and #now on todos."
- **Project close-out** - "When a project is done: a checklist, where its outcomes go, an archive PDF. Off: Done
  projects are archived directly."
- heading **Experimental** with its intro text from Advanced, then **Google Calendar**,
  **Gmail**, **Notebook contents**: the three rows moved over from `AdvancedTab.tsx` as they are (same labels,
  hints, stored keys `experimentalGoogleCalendar`, `experimentalGmail`, `notebookContentsEnabled`, same
  `migrateExperimentalFlags`). Advanced keeps Profiles, Reload all files, Integrity Check, Touch test, Keep tabs in
  memory and Performance tracing.

Check on the device that the 8 settings tabs fit on one line (A5 X budget); if not, shorten a label.

**Storage.** New settings field `modules: {focusMode: boolean; closeOut: boolean}`, default
`{focusMode: false, closeOut: true}` (the start of the map from `feature-feature-modules.md` §5.3). Per profile
(classified in `domain/profiles.ts`). The settings load merges shallowly (`{...DEFAULT_SETTINGS, ...parsed}`), so an
existing install without `modules` gets the defaults with no extra migration. Readers go through `featuresOf`, which
fills a missing key from the default (a partial map, e.g. from a later version, also works). The experimental keys
stay top-level; moving them into `modules` isn't worth a migration now.

**Domain.** `domain/features.ts`: `Features` gets `focusMode` and `closeOut`; `featuresOf(settings)` reads
`settings.modules` with per-key defaults; `NO_EXPERIMENTAL_FEATURES` becomes `NO_FEATURES` (what screens see before
settings load: integrations off, focus mode off, close-out on). `ui/featureStore.ts`'s equality check compares all
keys. Screens read it through `useFeatures()`, so kept tabs follow a change at once.

**Focus mode off hides:**
- `DailyModeRow`: the **Focus mode** button.
- App.tsx: `mode === 'focus'` only while `features.focusMode`. A stored `focusModeActive` is **ignored while off,
  and kept** (P1): switched on again, the app reopens in the running session. Settings isn't reachable from focus
  mode, so it can't be switched off from inside a session.
- the double tap: `onToggleNow` passed to `TaskRow` only when on. Without it, the label doesn't react to touch, which
  is existing behaviour (`ui/TaskLabels.tsx`).
- the card's **Now** chip: `todoCardModel` gets `canNow` (like `canLink`/`canRefile`), set from the switch.
- Unchanged while off: the `#now` label of a todo that has it, Engage counting `#now` as `#next`, every write path.
  Leaving Next still drops `#now` (core behaviour).

**Close-out off hides:**
- Current tab (`ItemStatusPanel` via `ItemDetail`, both App.tsx call sites): `onStartCloseOut` isn't passed, so a
  Done project shows **🗄 Archive…** and archives directly (existing behaviour for Areas and the documented
  fallback).
- Review (`ReviewScreen`'s `onStartCloseOut`, quick mode): not passed. The implementation checks what the step shows
  without it. If it has no direct Archive, it gets one through the same `archiveItem` + confirmation as
  `ItemStatusPanel` (one shared helper, not a copy).
- Unchanged while off: an existing `## Close-out` section stays in the file; an interrupted close-out is still
  reported by the Integrity Check; plain archiving isn't blocked by a half-done close-out plan (verify:
  `closeOut/planStore` must not stop `archiveItem`; if it does, archiving clears nothing and says why).

**Elsewhere:**
- Demo space: the defaults (focus mode off, close-out on).
- Debug bundle: the settings line gets `modules: focusMode on|off · closeOut on|off`.
- Help: `daily.md` "Focus mode" starts with "Switch it on in Settings → Features"; the `#now` sentence says double tap
  works with focus mode on. `close-out.md` gets "can be switched off in Settings → Features; then Done projects are
  archived directly". `settings.md`: new "Features" section; the Experimental bullet moves out of Advanced.
  `integrations.md`: switches are now in Settings → Features → Experimental. New page `features.md` (what each switch
  does), linked from `index.md`.
- CHANGELOG `[Unreleased]`:
  - New: "Settings → Features: switch Focus mode and Project close-out on or off."
  - Changed: "Focus mode is off unless you switch it on." "The Experimental switches moved from Advanced to
    Features." "Daily opens a little faster."
  - Upgrade note: "Focus mode and setting #now are hidden after the update. Switch them on in Settings → Features;
    your #now todos and a running session are kept. Google Calendar, Gmail and Notebook contents keep their setting
    and are now in Settings → Features."

## 4. Steps (one commit each, `npm run check` green after each)

- S0 perf counters + span `daily:firstContent`.
- S1 `useEntryActions` extensions; Daily on the hook (§3.2). Pure refactor.
- S2 `useDailyData`, `FocusModeScreen` + `useFocusSession`, `DailyTodosColumn`, `DailyModeRow`, `dailyRows`; App.tsx;
  comment trimming; dead styles; baseline entry removed (§3.1, 3.3).
- S3 row layout cache + unit tests (§3.4).
- S4 heightKey; home-notebook icons redraw alone (§3.5).
- S5 Settings → Features: focus mode, close-out, Experimental moved (§3.6) + scenarios T6–T12.
- S6 docs: design-overview §2.7 (Daily's files, focus mode screen, the switch) and §3 (the `modules` map), help pages,
  CHANGELOG, README "Features at a glance" (focus mode: switchable), regenerate `docs/dev/test-scenarios.md`.

Branch `feature/daily-slim-0.22` from `main` (0.21.1). The 0.21.1 `.snplg` is the known-good build.

## 5. Test scenarios (Given/When/Then)

Every existing Daily scenario stays green. Existing **focus-mode** scenarios get "Given Focus mode is switched on in
Settings → Features" added to their setup.

- T1 **Card, then edit** - Given Daily lists "Water the lawn" (Garden), when I tap it, then its card shows in Quick
  Add's place; when I tap again, change the text to "Water the lawn early" and save, then Garden's area.txt has it and
  the card shows again.
- T2 **#now from Daily (switch on)** - Given focus mode is on and "Sort tools" is a Next todo on Daily, when I double-tap
  its `#next` label, then the file has `#now` on that line and the label reads `#now`.
- T3 **Focus session with two Inbox todos** - Given focus mode is on and the Inbox has Next todos "Call the plumber"
  and "Pay the invoice", when I open focus mode, double-tap both, tap "Start focus session" and tick both, then
  "Congratulations: All tasks done!" lists both and Inbox.txt has both done, neither with `#now`.
- T4 **Context filter** - Given todos tagged `#garden` and others, when I tap `#garden` in a row, then only `#garden`
  todos show and the pill reads `#garden`; tapping the pill shows all again.
- T5 **Quick-file from a Daily edit** - Given "Buy bulbs" in the Inbox and a project with abbreviation `GA`, when I
  edit it on Daily, add `#GA` and use "File: …", then it's in that project's file and not in Inbox.txt.
- T6 **Off by default** - Given a fresh space, when I open Daily, then there's no **Focus mode** button; double-tapping
  a `#next` label changes nothing in the file; a todo's card has no Now chip.
- T7 **Existing #now while off** - Given focus mode is off and "Sort tools" carries `#now` in its file, when I open
  Daily, then its label reads `#now`; when I tick it done, then the file has it done and still with `#now`
  (nothing rewritten beyond the tick).
- T8 **Switching on and back** - Given focus mode is off, when I switch it on in Settings → Features and open Daily,
  then the **Focus mode** button shows (without reopening the app); when I switch it off again, the button is gone.
- T9 **Stored session while off** - Given `focusModeActive` is stored and focus mode is off, when the app opens, then
  it shows the tabs (not focus mode), and the stored value is still there.

- T10 **Close-out off** - Given close-out is switched off and project "Website" is Done, when I open it on Current,
  then the status panel offers **🗄 Archive…**; after confirming, the folder is in Archive and no close-out wizard
  opened.
- T11 **Close-out off in Review** - Given close-out is off and a Done project is in Review's Done step, when I archive
  it there, then it's archived directly.
- T12 **Experimental moved** - Given Google Calendar was switched on before the update, when I open Settings →
  Features, then its switch is on under Experimental, and Advanced no longer shows it.

Unit tests: U1 same Task + same arguments → same layout object, computed once; U2 other `today`/`contextActive`/width
→ recomputed; U3 same object with changed `text` → recomputed; U4 `featuresOf` with/without `modules` and with a partial map; U5 settings
merge gives `focusMode: false, closeOut: true` for an old stored blob; U6 profiles classification covers `modules`;
U7 `todoCardModel` without `canNow` offers no Now.

## 6. Device test plan

- [ ] Before/after trace (§9 protocol), times noted here.
- [ ] After the update: Daily without the Focus mode button; no double tap; card without Now; `#now` todos keep their
      label.
- [ ] Settings → Features: switch on → button appears on Daily at once; focus mode full cycle (picker → start → tick
      all → Congratulations → new session; exit; close the plugin while in a session → reopens in focus mode).
- [ ] Switch off again → button gone; reopening the plugin shows the tabs.
- [ ] Settings tab strip fits on one line; Features tab layout (A5 X).
- [ ] Close-out off: Done project archives directly from Current and from Review; on again: Close out… returns.
- [ ] Experimental switches work from Features (Google tab on Daily/Week appears/disappears, Gmail step, Notebook tab contents).
- [ ] Daily otherwise as before: columns, labels, paging, card/edit/tick, notes, linked file, context filter, Focus
      panel incl. home-notebook icons, Google tab.
- [ ] Week/Month focus cards: home-notebook icons still appear.

## 7. Risks and rollback

- S1/S2 are large but mechanical; the scenario suite (with T3) is the safety net.
- S4's icon change touches Week and Month too; own commit, own device check; can be dropped.
- S5 changes default behaviour for existing users (focus mode); that's intended and the Upgrade note says it.
  Nothing is rewritten, so switching on restores everything. Close-out off touches archiving: T10/T11 and the
  device check cover it.
- Rollback: reinstall 0.21.1. The new `modules` key is ignored by older builds.

## 8. Backlog (not in this release)

- Memoized Daily rows/columns (render only what changed on select/tick). Only if taps ever feel slow.
- The Atruvia cold open: area.txt read and parsed 5× concurrently; the roster still built twice; the NoteTitles
  diagnostic (debug-only) costing seconds.
- `useHomeNotebooks` refreshing `statFiles` after every cache change.
- Quick Add building its three hidden mini-tabs right after the flush (≈ 0.56 s of JS).
- The other modules from `claude/feature-feature-modules.md` (meeting management next), and moving the experimental keys into `modules`.

## 9. Baseline (0.21.1-alpha+25d497f, trace 2026-10-26 18:28, debug logging ON)

First switch to Daily (trace `tab daily` seq 3), tap → e-ink flush **4.48 s**:
- 0–320 ms: spinner render, `load:settings` 35 ms, `screen:load` 102 ms, then the content render.
- 320–900 ms: first content render (MeetingRow, DailyFocusPanel, QuickAddWidget ≈ 235 ms), commit.
- 910–1350 ms: home-notebook `io:stat` 185 ms → **DailyFocusPanel re-renders, 240 ms**, extra e-ink request.
- ≈ 900 ms native layout gap → self-measured viewports → 6 MeetingRows (≈ 38 ms each) and **11 TaskRows (≈ 36 ms
  each, 400 ms)**.
- ≈ 1.2 s more frame gap → flush. After the flush, QuickAddWidget renders its other three mini-tabs (≈ 560 ms).

Second switch: 1.1 s, no re-render. Week's first switch: 3.97 s, the same shape. Expected saving from this design on
Daily's first switch: ≈ 0.5–0.9 s. Interactions weren't measured.

Trace protocol for "after": debug logging off, perf tracing on; close the plugin and open it from a note; tap Daily;
tap Week, then Daily; tap a todo and ✕; tick and untick; export the bundle and the JSONL traces from
`EXPORT/kept-gtd/debug/`.

## 10. Open points

None. Decided: the tab is called Features and sits between Note setups and Advanced; the demo space uses the
defaults (focus mode off, close-out on).
