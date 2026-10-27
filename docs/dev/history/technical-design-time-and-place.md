# Technical design: 0.22.0 "Time and place"

Status: **APPROVED (Tilman, 2026-10-27).**
Requirements: `docs/dev/history/requirements-time-and-place.md` (= claude.ai project doc `claude/feature-focus-rethink.md`) (D1–D30, §8 R1–R7, §9, §12) — the spec for
*what*; this document says *how*. Design canvas: https://claude.ai/artifact/DchxJwySCLyWjCjQH1Nto1 (approved boards
listed in the requirements).
Absorbs Daily slim (`claude/technical-design-daily-slim.md`) minus everything about focus mode. Agenda moves to 0.23.0.
Branch: `feature/time-and-place` from `main` **after `feature/test-tiers` is merged** (first release run by the new
`release.ps1`). `nextVersion` 0.22.0. Repo copy at implementation: `docs/dev/history/technical-design-time-and-place.md`.
Where the code proves this document wrong, fix it in the same commit and note it under "As built".

## 1. Guiding decisions for the implementation

- **G1 Reuse before new code.** The context panel is Engage's owner logic (`ownerOfMeeting`, `optionsOf`,
  `engagePageOf`) rendered as one stacked list; Quick Add to meeting is Engage's Quick Add rule; a focus block is the
  `#monthly` pattern (`domain/monthHighlight.ts`) with another tag; Settings → Contexts copies the Note setups
  list/detail pattern.
- **G2 One pure function per new rule**, in `domain/`, unit-tested: context matching, Given time, the stacked panel
  model, the Engage schedule fallback.
- **G3 Net shrink.** The release deletes the focus/goals/focus-mode code paths (≈ 12 files, two review steps, one
  settings tab). `DailyView.tsx` leaves the code-health baseline. No file grows past 1,000 lines.
- **G4 Rollback-safe until final (R1–R5).** Nothing is migrated; retired data is kept on every write path; retired
  settings stay in the settings object. Removing the kept shims is a later release (0.24.0 at the earliest).

## 2. Current state (verified on `feature/test-tiers` @ 0.21.1, 2026-10-27)

| Area | Fact |
|---|---|
| Focus flags | `domain/markdown.ts` `ParsedFrontMatter.{dailyFocus,weeklyFocus,monthlyFocus}`; written back only when true (`writeFrontMatter`, lines ≈ 570-590); everything unknown is kept in `extraLines` (written *before* `status:`). |
| Goals | `## Weekly Goals` / `## Monthly Goals` spans (`WEEKLY_GOALS_HEADING`, `MONTHLY_GOALS_HEADING`), only touched through `getSpan`/`setSpan`; `storage/periodGoals.ts` writes them. |
| Focus users | 21 files read the flags: `storage/{dailyAggregate,dataCache,reviewAggregate,focusSlots,projectFile,weeklyAggregate,periodGoals,monthlyAggregate}`, `domain/{reviewSteps,demoSpace,settings,engageOwner,engageOptions,types}`, `screens/{ItemDetail,ItemsList,WeekPlanner,MonthView,DailyView,review/ReviewScreen}`. |
| Daily rule | `storage/dailyAggregate.ts`: a `#next` todo shows only when `isFocused(cachedItem)`; Inbox `#next` always; due ≤ tomorrow always; Waiting For by its own rule; the tap-a-tag filter (`contextTag`, the `#` pill) replaces the rule. |
| Focus mode | `App.tsx` `Mode = … | 'focus'`, `focusModeActive` setting, `Task.now` (`domain/flowState.ts` `deriveNow`/`setNowTag`), Daily's picker/working/congrats branches, `buildNowEntries`/`buildFocusCandidateEntries`. |
| Month highlight | `domain/monthHighlight.ts` (`HIGHLIGHT_TAG='monthly'`, `isHighlight`, `setHighlight`); stripped from titles by `meetingDisplayTitle` (`domain/meetingTracking.ts`); M toggle in `ui/quickAdd/useMeetingDraft.ts`, card in `domain/itemCard.ts`. |
| Meeting card | `domain/itemCard.ts` `meetingCardModel` (R1 heading/thread, R2 title/when, R3 P/R/M/note/Reflect/file, R4 owner/New from this/Cancel); `ui/itemCard/MeetingCard.tsx`; edit state via `ui/useEditTarget.ts` (`card` / `edit`). |
| Engage | `domain/engageOwner.ts` `ownerOfMeeting` (thread → active loop → item); `domain/engageOptions.ts` `optionsOf` → `{next, plan, from, waiting, agreements, alsoHere, nextMeeting}`; focus fallback `effectiveFocus`/`focusItems`/`focusOwnerLines`/`ownersLeft`; `screens/engage/useEngageQuickAdd.ts` (before: owner tag; during/after: `[meeting::]` provenance + tag) on `ui/quickAdd/useProvenance.ts` + `usePresetTag.ts`. |
| Week/Month | `screens/usePlanningScreen.ts` (shared hook: meetings actions, `toggleFocus`, `saveGoal`, `selectedDate`, `selectDay`, `openMeetingFromGrid`, `closeDayPanel`); `WeekPlanner.tsx` (also used by Review's Week ahead) and `MonthView.tsx`: right side = Quick Add + `DayMeetingsPanel` or `PeriodFocusPanel`. |
| Review | `domain/reviewSteps.ts` `REVIEW_STEPS` incl. `unfocusedNext`, `weeklyFocus` ("Focus reset"); stored per step id in `settings.reviewSteps`; rosters already know a thread's/loop's `nextMeeting` (`storage/tendingRoster.ts`, `storage/loopAggregate.ts`). |
| Settings | `{...DEFAULT_SETTINGS, ...parsed}` keeps unknown keys in memory and writes them back; **profile files** keep only `PROFILE_KEYS` (derived from `DEFAULT_SETTINGS`), so a key removed from the defaults is dropped on a profile switch. Settings tabs: Folders, Focus, Calendar, Gmail, Note setups, Advanced, About. |
| Note setups | `PieceType` includes `'goals'` (Home page only, `domain/homeNotebook.ts` `homeGoalsText`). Notes are created on request (note icon), placed by the matching setup or the Default. |
| Tests | `scripts/test-areas.json` exists; smoke scenarios 2-4 assert focus panels, goals and the focus rule; `planning` area globs name `periodFocusCards`, `periodGoals`, `focusSlots`, `ui/Focus*`, `focusedItemRowAccessory`. |

## 3. Design

### 3.1 Focus blocks (D6–D10)

**Domain** — new `domain/focusBlock.ts`, a twin of `monthHighlight.ts`:
```ts
export const FOCUS_BLOCK_TAG = 'focusblock';
export function isFocusBlock(m: Pick<Meeting, 'tags'>): boolean;      // hasBareTag
export function setFocusBlock(title: string, on: boolean): string;    // setBareTag
```
- `meetingDisplayTitle` strips `focusblock` with `prepped`/`reviewed`/`monthly`; the edit form strips it like `monthly`.
- `domain/meetingTracking.ts` `tracksCheckpoint`: false for a focus block → no P/R, never in "Meetings to close out"
  (`reviewAggregate` already goes through tracking).
- `domain/reflection.ts` `reflectionOffered`: false for a focus block (no Reflect, no Reflection page).
- `domain/itemCard.ts` `meetingCardModel`: `heading` "Focus · today|ahead|over|cancelled"; new field
  `focusBlock: boolean`; `checkpoint` and `reflection` null; R1 link = owner from `ownerOfMeeting` (thread *or loop*
  for a focus block: "loop writing ›").
- **Note (D8 + §9.8):** `storage/noteTargets.ts`/`itemNotePlan.ts`: a focus block uses the matching setup exactly as a
  meeting (loop note page, thread notebook page). When only the Default matches, the card's note action opens the
  owner's **home notebook** (`ui/useHomeNotebookTap.ts`) instead of creating a meeting note; an Inbox focus block has
  no note action. One function decides it: `focusBlockNoteTarget(meeting, setups)` in `domain/noteSetups.ts`.

**UI**
- `ui/quickAdd/MeetingRows.tsx` + `useMeetingDraft.ts`: **F** toggle right of **M**, same component and behaviour
  (state → `setFocusBlock` on save). Quick Add widget height unchanged.
- `ui/MeetingRow.tsx`: filled **F** mark before the title (as the M mark), in all layouts; the hidden tag never
  shows. `ui/WeekGrid.tsx` chips and `ui/MonthDaysColumn.tsx`: F mark; Month rows get an `F`/`F2` count per day.
- **Schedule** label (D10, §9.5): Week's left mini-tab "Meetings" → "Schedule"; Daily date header
  "· 6 meetings · 3 focus"; Project/Area page section and Inbox meeting list "Meetings" → "Schedule". All label texts
  in one place (`domain/meetingDisplay.ts` `SCHEDULE_LABEL`), help pages updated.
- Engage `todayNextMeeting` includes focus blocks automatically (they are meetings).

### 3.2 Context panel (D11–D15)

**Domain** — new `domain/meetingContext.ts`:
```ts
export interface MeetingContextModel {
  owner: EngageOwner; ownerTitle: OwnerTitle;
  mode: 'owner' | 'this-meeting' | 'owner-lens';   // owner-lens = plain meeting with nothing linked (D13)
  owe: OwnerTodoRef[]; next: OwnerTodoRef[]; waiting: OwnerTodoRef[];
  agreed: {caption: 'Agreed last time' | 'From its meetings' | 'Agreed here'; group: FromGroup} | null;
}
export function meetingContextOf(entry: MeetingEntryRef, source: EngageSource, nowMs: number): MeetingContextModel;
```
- Owner = `ownerOfMeeting`. Options = `optionsOf(owner, source, nowMs, null, engagePageOf(ref, source, nowMs))`.
- Thread/loop: `owe` = `next` + `plan` with relation `owe` (already ordered first); `next` = the rest of `next`;
  `waiting` = `options.waiting`; `agreed` = the newest `from` group (caption "Agreed last time" for threads,
  "From its meetings" for loops/items).
- Plain meeting (owner kind `item`): `this-meeting` = the `from` group of *this* meeting (todos/agreements agreed in
  it) plus todos with its meeting tag; when empty → `owner-lens`: the item's `next`/`waiting`, with the info line.
- Due dates show as row labels (no own section — simpler than the canvas' "Due" group; the row label already says
  "due Fri"). `#now` leftovers count as `#next` (as Engage does today).
- No "Next here", no tabs (decided).

**UI** — new folder `ui/meetingContext/`:
- `MeetingContextPanel.tsx`: header "<owner> · <scope> · Overview ›", the four sections as one `PagedSection` (section
  captions are rows, so paging stays exact), footer **+ Quick Add to meeting** / **+ Quick Add to block** and an
  optional back row slot. Todo rows = `ui/TaskRow.tsx` with the screen's `useEntryActions` (tick, card, edit as on
  Daily); agreement rows = `ui/AgreementRow.tsx`.
- `useMeetingContext.ts`: memoised `engageSourceOf(items, inbox, noteSetups)` from the cache + `meetingContextOf`.
  Rebuilt on `notifyCacheChanged` only (no timers).
- **Quick Add to meeting** (D14): the pure rule of `useEngageQuickAdd` moves to `domain/meetingQuickAdd.ts`
  (`quickAddPartsFor(owner, meeting, moment)` → `{presetTag, provenance}`; before = tag only, during/after = tag +
  `[meeting::]`). Engage and the panel both call it (Engage behaviour unchanged, its tests pin it).
  `ui/useEditTarget.ts` gets a third mode **`add`** for the selected meeting: the card's slot renders
  `QuickAddWidget` with those parts; after **Add** (or ✕) the mode returns to `card`; the panel shows the new row
  through the normal cache refresh. A plain meeting before it starts gets no tag, the item as destination (§9.7).

**Screens** (one rule everywhere: *a selected meeting shows card + panel*):
- **Daily**: when `editTarget` is a meeting (`card`/`add`), the right column shows the card in Quick Add's place and
  `MeetingContextPanel` instead of the Next todos section. ✕ returns to Quick Add + Next todos.
- **Week** (`WeekPlanner`): tapping a **day header** → `selectDay` (day panel, as today). Tapping a **chip** (grid) or
  a row in the day panel → `selectMeeting` → right side = card + panel with back row
  "‹ Back to Week 44 · Tue 27.10. · 8 meetings ›" (left part = cancel edit target, right part = `selectDay(date)`).
  `openMeetingFromGrid` no longer opens the day panel.
- **Month** (`MonthView`): tapping a day → day panel (today's behaviour). Tapping a meeting in it → card + panel with
  "‹ Back to October · Tue 27.10. · 8 meetings ›" (left = cancel + `closeDayPanel`, right = cancel only).
- Review's **Week ahead** uses `WeekPlanner` with a new prop `rightSide="schedule-only"`: no Given time; tapping a
  meeting shows card + panel as on Week.

### 3.3 Contexts (D20–D25, §12 Q1–Q2)

**Domain** — new `domain/contexts.ts`:
```ts
export type ContextEntry =
  | {kind: 'item'; itemKind: 'area' | 'project'; name: string}   // folder name, like Project.area
  | {kind: 'tag'; tag: string};                                    // free tag, loop tag or thread tag (lowercase, no '#')
export interface ContextDef { id: string; name: string; shows: ContextEntry[]; hides: ContextEntry[]; outsideMeetings: 'dim' | 'show' }
export interface ContextMatcher {
  itemShown(item: ItemLike): boolean;
  taskShown(item: ItemLike | 'inbox', task: Task, today: string): boolean;
  meetingState(item: ItemLike | 'inbox', meeting: Meeting): 'shown' | 'dimmed' | 'hidden';
}
export function contextMatcher(ctx: ContextDef | null, items: readonly ItemLike[]): ContextMatcher; // null = Everything
export function activeContext(settings): ContextDef | null;
export function tallyHidden(...): HiddenTally;      // {todos, loops, threads, items, meetings}
```
Rules (one place, unit-tested):
1. Everything (`null`) shows all.
2. Inbox items and todos due today or overdue are always shown.
3. An entry matches an item by kind + folder name; a **project matches through its Area** (`Project.area`). A tag
   entry matches a todo/meeting carrying that tag or a tag nested under it (the `tagMatchesSetupTag` rule — a thread
   `retro/demand`, a loop tag, a counterpart).
4. **Hides wins.** Then: Shows non-empty → shown only if matched by Shows; Shows empty → shown (Q1).
5. On Hold/Done/Archived items are not active and leave Daily/Week/Month anyway (D25); Projects/Areas tabs keep their
   own status filters.
6. Meetings: matched → `shown`; otherwise `dimmed` (or `shown` with `outsideMeetings: 'show'`), never hidden.

**Storage/settings** — `contexts: ContextDef[]` (default `[]`) and `activeContextId: string | null` (default
`null`), both **per profile** (`domain/profiles.ts` classification; profiles test). Item rename
(`storage/homeNotebookRename.ts`/rename flow) updates matching `item` entries in the same save; the Integrity Check
reports entries naming no item (no automatic deletion).

**Where the matcher is applied** (one `useContextMatcher()` hook in `ui/`: settings snapshot + cache → matcher):
| Screen | Applied to | Hidden line |
|---|---|---|
| Daily (`dailyAggregate`) | todos, meetings (dim) | todos · loops · threads |
| Week / Month (aggregates + Given time) | meetings (dim), Given time / Worked on rows | owners |
| Projects / Areas (`ItemsList`) | list rows | items |
| Review (`reviewAggregate`, `buildReviewStepCounts`) | each step's items/todos | per step "+n in other contexts" on the hub; Reviewed marks/overdue global (Q2) |
Not filtered: Inbox tab, Current (single item), Settings, Engage, thread/loop overviews.
The **hidden line** is one component `ui/context/HiddenLine.tsx`; **Show** sets a screen-local `showAll` that resets
on leaving the tab (`useOnScreenShow`) — never written to settings.

**UI**
- `ui/context/ContextChip.tsx` in `ui/TabBar.tsx` at the old DEMO position; tap opens `ContextMenu.tsx` (an overlay
  via `screens/useAppOverlays.tsx`: radio rows with summary and count, "Edit contexts" → Settings → Contexts).
  Choosing writes `activeContextId` through `patchSettings` and confirms in the status slot ("Context: Home").
- **DEMO** (D27): `TabBar` gets `demo: boolean` → inverted bar (black background, white labels, white underline) and a
  boxed **D** left of ✕; all colours from `ui/theme.ts`.
- Settings → **Contexts** tab replaces **Focus**: `screens/settings/contexts/{ContextsTab,ContextsList,ContextEditor}.tsx`
  on the Note setups pattern (list left, editor right, draft + save like `useNoteSetupDraft`). Item chips via
  `ui/DestinationPicker.tsx`, tag chips via `SetupTagPicker` (tag usage list). Preview line = matcher over the cache.
- Quick Add: when the saved item is hidden by the active context, the status slot says
  "Saved to Atruvia · hidden by Home" (`domain/fileChangeText.ts`-style text helper).
- The existing tap-a-tag filter (`#` pill) stays as is and is called **tag filter** in help and code comments (it used
  to be "context tag" — renamed to avoid two meanings of "context"). It applies on top of the active context.

### 3.4 Week/Month right side and the Project page (D16–D19, D30)

**Domain** — new `domain/givenTime.ts`:
```ts
export interface GivenTimeRow { owner: EngageOwner; title: OwnerTitle; minutes: number; allDayDays: number;
  blocks: number; meetings: number; done: number; nextTodo: string | null }
export function givenTimeOf(input: {source: EngageSource; range: {start: string; end: string}; nowMs: number;
  matcher: ContextMatcher}): {given: GivenTimeRow[]; workedOn: GivenTimeRow[]};
export function tendCount(rosters, todayIso, windowDays = 14): {threads: number; loops: number};
```
- Every non-cancelled meeting/F block in the range (multi-day via `coveredDaysIn`) counts once for
  `ownerOfMeeting` (thread/loop, else item, else Inbox). Timed: end − start (no end = 60 min, the existing rule);
  all-day: 8 h per covered day in the range for sorting, shown "1 day"/"2 days" (§9.6).
- `done` = todos with `fields.completion` in the range (owner via `ownerOfTodo`). `workedOn` = owners with `done > 0`
  and no scheduled time. Sort: minutes desc, then title.
- `tendCount`: threads (tending roster) and loops (loop roster) whose `nextMeeting` is null or more than 14 days
  ahead — the same rule the review invitation uses (§3.6).
- The panel follows the **displayed** week/month (› shows next week's given time). The old "from Friday the coming
  week" switch is not carried over (Given time is no look-ahead) — see O1.

**UI** — `ui/period/GivenTimePanel.tsx` (one component, `scope: 'week' | 'month'`) replaces `PeriodFocusPanel` under
Quick Add: section "Given time this week" (rows: owner, kind, hours right, grey line), "Worked on this week", Tend line
→ Review `tendingThreads`. Rows open the owner (thread/loop overview, item page). Paged.
**Project/Area page**: `ItemFocusPanel` is replaced by a one-line `GivenTimeLine` ("Given time · this week 3 h ·
this month 11 h") computed with `givenTimeOf` for owners inside the item.

### 3.5 Daily after the change (D26, Daily slim)

- From Daily slim (kept as designed there): `screens/daily/useDailyData.ts`, `DailyTodosColumn.tsx`, `dailyRows.ts`,
  Daily on `ui/useEntryActions.ts`, the `taskRowLayout` cache, the small speed fixes, `heightKey`. **Dropped:**
  `FocusModeScreen`, `useFocusSession`, `DailyModeRow`'s Focus mode button, the focus-mode switch.
- `dailyAggregate`: the `isFocused` leg goes; a `#next` todo shows when the matcher shows it. Meetings carry
  `contextState` for dimming. `buildNowEntries`/`buildFocusCandidateEntries` deleted.
- Left column: Today/Tomorrow schedule uses the full height (no Focus panel). Right column: Quick Add or card; Next
  todos or context panel; hidden line.

### 3.6 Review, Engage, Note setups, Settings → Features

- **Review**: `REVIEW_STEPS` loses `unfocusedNext` and `weeklyFocus` (their stored records stay untouched in
  `settings.reviewSteps`; `activeReviewSteps` simply doesn't list them, so overdue ignores them). Delete
  `UnfocusedNextStep.tsx` (27 KB), `FocusResetStep.tsx`, the `unfocusedNextItems` bucket and the focus counters in
  `ReviewVisitCounts`. **Week ahead** = `WeekPlanner rightSide="schedule-only"`. **Tending threads** and **Open loops**:
  rows whose next meeting is missing or > 14 days get "nothing planned" in their second line; Tending already offers
  "+ Next <type>"; Open loops gets **+ F block** (fills Quick Add's Meeting tab with the loop tag and F on — the
  existing `meetingSeed` path).
- **Engage fallback** (D28): `effectiveFocus`/`focusItems`/`focusOwnerLines`/`ownersLeft` are replaced by
  `scheduleOwnerLines(source, nowMs)` in `domain/engageOptions.ts`: owners of today's meetings and F blocks that are
  not over, in time order, deduplicated; none → the existing empty state ("Nothing scheduled today"). The owner
  screens (S9, S11) keep their layout.
- **Note setups**: `PieceType` keeps `'goals'` (stored layouts stay valid), it is no longer offered (`ALLOWED`/`home`
  list without it) and renders `''`. `homeGoalsText` and the goals context field are deleted.
- **Settings → Features** (from Daily slim, without focus mode): **Project close-out** switch + **Experimental**
  (Google Calendar, Gmail, Notebook contents moved from Advanced, same keys). Tabs: Folders, **Contexts**, Calendar,
  Gmail, Note setups, **Features**, Advanced, About = 8, as today (check on device).

### 3.7 Retirement and the rollback shims (D1–D5, R1–R5)

| Retired | Removed | Kept for rollback (shim) |
|---|---|---|
| Focus flags | every reader: `CachedItem` fields, `isFocused`, `storage/focusSlots.ts`, focus UI (`DailyFocusPanel`, `PeriodFocusPanel`, `ItemFocusPanel`, `FocusBadges`, `FocusedItemRow`, `useFocusHomeNotebooks`), D/W/M badges, `demoSpace` focus data | `ParsedFrontMatter` keeps parsing and writing the three flags unchanged (byte-identical frontmatter); `ProjectFileState` carries them through writes only |
| Goals | `storage/periodGoals.ts`, `periodFocusCards.ts`, `PeriodGoalsHistoryPanel`, goal parse/serialize functions, `WeeklyGoal`/`MonthlyGoal` in the cache | the spans are never written by anyone → preserved byte for byte |
| Focus mode + `#now` | App `Mode 'focus'`, focus-mode UI, `Task.now`, `setNowTag`, the double tap, the card's Now chip | `flowState.ts`: a bare `#now` without another flow state reads as `next`; labels show `#next`; the text is never rewritten |
| Focus settings | Settings → Focus tab, all readers | `GtdParaSettings` keeps `dailyFocus*Count`, `weeklyFocus*Count`, `monthlyFocus*Count`, `focusModeActive` in a block marked `@deprecated retired 0.22, kept for rollback (remove ≥ 0.24)`, still in `DEFAULT_SETTINGS` so profile files keep them |
| Review steps | step defs, screens, aggregates | stored `reviewSteps` records |
| Latest goals piece | offering + rendering | `'goals'` in `PieceType` |

Update-time behaviour (R7): on the first start of 0.22 (`lastSeenVersion` < 0.22) the status slot says once
"Focus is retired. Contexts decide what Daily shows: Settings → Contexts." through the existing What's-new notice
(`ui/useWhatsNewNotice.ts`); `activeContextId` defaults to `null` (Everything). No file or setting is written by the
update itself.

### 3.8 Logging, docs, demo

- Logs: kinds and counts only — `Context: switched (n contexts)`, `MeetingContext: opened (owner kind, mode)`,
  `GivenTime: built (rows n)`. Never context names, owner names or tags (policy §5).
- Help: `daily.md` (rewritten, no focus mode), `week-and-month.md`, `review.md`, `projects-and-areas.md`,
  `settings.md`, `quick-add.md`, `meetings.md` (F blocks, Schedule), `engage.md` (fallback), new `contexts.md` and
  `features.md`; `index.md` links. design-overview §2 (as-built) and §3 (contexts, focus blocks, retired shims);
  DEVELOPMENT-POLICY §2 wording ("from what you already chose (the same owner, your schedule)", Experimental now in
  Settings → Features). README "Features at a glance". CHANGELOG with **Removed** and **Upgrade notes** (R6).
- Demo space (`domain/demoSpace.ts`): two contexts (Work, Home), three F blocks (loop, project, thread), no focus/goals.

## 4. Files (main changes)

| File | Change |
|---|---|
| `domain/focusBlock.ts` (new) | tag helpers (§3.1) |
| `domain/meetingContext.ts` (new) | stacked panel model (§3.2) |
| `domain/meetingQuickAdd.ts` (new) | Quick Add parts by moment, shared with Engage |
| `domain/contexts.ts` (new) | context types, matcher, tally (§3.3) |
| `domain/givenTime.ts` (new) | Given time / Worked on / tend count (§3.4) |
| `domain/{meetingTracking,reflection,itemCard,noteSetups,engageOptions,flowState,markdown,settings,profiles,reviewSteps,pageLayout,homeNotebook,demoSpace,meetingDisplay}.ts` | §3.1-3.7 |
| `storage/{dailyAggregate,weeklyAggregate,monthlyAggregate,reviewAggregate,dataCache,projectFile,noteTargets,itemNotePlan}.ts` | matcher, dim state, focus readers out |
| `storage/{focusSlots,periodGoals,periodFocusCards}.ts` | deleted |
| `ui/meetingContext/{MeetingContextPanel,useMeetingContext}.tsx/ts` (new) | §3.2 |
| `ui/context/{ContextChip,ContextMenu,HiddenLine,useContextMatcher}` (new) | §3.3 |
| `ui/period/GivenTimePanel.tsx`, `ui/GivenTimeLine.tsx` (new) | §3.4 |
| `ui/{TabBar,MeetingRow,WeekGrid,MonthDaysColumn,useEditTarget,QuickAddWidget}.tsx/ts`, `ui/quickAdd/{MeetingRows,useMeetingDraft}`, `ui/itemCard/{MeetingCard,useMeetingCard}` | F, Schedule, chip, DEMO, `add` mode |
| `ui/{DailyFocusPanel,PeriodFocusPanel,PeriodGoalsHistoryPanel,ItemFocusPanel,FocusBadges,FocusedItemRow,useFocusHomeNotebooks}.tsx` | deleted |
| `screens/DailyView.tsx` + `screens/daily/*` | Daily slim split; panel; focus mode out; leaves the baseline |
| `screens/{usePlanningScreen,WeekPlanner,MonthView,ItemDetail,ItemsList}.tsx/ts` | tap rules, Given time, focus out |
| `screens/review/{ReviewScreen.tsx,steps/{WeekAheadStep,TendingThreadsStep,OpenLoopsStep}.tsx}`; `steps/{UnfocusedNextStep,FocusResetStep}.tsx` deleted | §3.6 |
| `screens/engage/useEngageQuickAdd.ts` | calls `domain/meetingQuickAdd.ts` |
| `screens/settings/contexts/*` (new), `FeaturesTab.tsx` (new), `Settings.tsx`, `DraftTabs.tsx` (FocusTab out), `AdvancedTab.tsx` | §3.3, §3.6 |
| `App.tsx` | `Mode 'focus'` and its handlers out; demo flag to TabBar |
| `scripts/test-areas.json`, `scripts/coverage-baseline.json`, `scripts/code-health-baseline.json` | §6 |

## 5. Steps (one commit each; *affected* tier + the step's areas green after each; *full* at the checkpoint)

| Step | Content | Visible? |
|---|---|---|
| **S0** | Daily slim S0-S4 without focus-mode parts (perf counters, `useEntryActions` on Daily, `useDailyData`, `DailyTodosColumn`, row-layout cache, speed fixes) + Settings → Features (close-out, Experimental moved) | Features tab only |
| **S1** | Focus blocks: `focusBlock.ts`, tracking/reflection/card/note rules, F toggle, F marks, Schedule labels | yes, additive |
| **S2** | Context panel: `meetingContext.ts`, `meetingQuickAdd.ts` (+ Engage on it), `useEditTarget` `add` mode, panel on Daily/Week/Month/Week ahead, new tap rules, back rows | yes, additive |
| **S3** | Contexts: domain, settings keys, Contexts tab, chip + menu, matcher on Daily/Week/Month/Projects/Areas/Review, hidden lines, Quick Add hidden notice, DEMO D + inverted bar | yes, additive |
| **S4** | Given time: `givenTime.ts`, `GivenTimePanel` replaces the focus panels on Week/Month, `GivenTimeLine` replaces `ItemFocusPanel`, Tend line, review "nothing planned" + **+ F block** | replaces focus UI |
| **S5** | Retire: Daily focus rule, focus mode, `#now`, focus readers/files, goals, two review steps, Engage fallback, Latest goals piece, Settings → Focus; rollback shims (§3.7); What's-new line | removal |
| **S6** | Docs, help, README, CHANGELOG, demo space, design-overview, policy wording, test-areas/coverage baselines, smoke rewrite completed, "As built" | — |

Tilman can run S1-S4 builds as beta before S5 removes anything. Every step leaves 0.21.1 installable over it (§7).

## 6. Tests

**Unit (domain, pure)**
- `focusBlock`: set/unset/idempotent; `meetingDisplayTitle` hides it; tracking false; reflection false; card heading.
- `meetingContext`: thread (owe/next/waiting/agreed), loop, plain meeting with linked items, plain meeting empty →
  owner-lens; cancelled meeting; `#now` leftover as next.
- `meetingQuickAdd`: before/during/after for thread, loop, item; Engage's existing tests unchanged and green.
- `contexts`: Everything; Inbox and due always; project via Area; tag nested match; Hides wins; empty Shows = all but
  Hides; meeting dim/show; unknown item names ignored; tally counts.
- `givenTime`: timed with/without end; all-day and multi-day clipped to the range; meeting counted once (thread beats
  item); Inbox owner; done in range only; worked-on excludes scheduled owners; sort; `tendCount` 14-day window.
- `engageOptions.scheduleOwnerLines`: today's remaining meetings/F blocks, dedup, order, none.
- **Rollback round-trips**: a project.txt with all three focus flags + both goal spans, saved after a todo edit, a
  meeting edit and a status change → frontmatter lines and goal spans byte-identical; `#now` todo ticked → only the
  checkbox and completion field change; settings load/save keeps the deprecated keys; profile save/switch keeps them;
  a stored layout with a `goals` piece loads and saves unchanged.

**Scenarios (Given/When/Then, catalogued)**
1. *Focus block from Quick Add* — Given Daily, when I add "Writing session" Thu 9-11 with `#loop/writing` and F on,
   then the file line has `#focusblock`, the row shows F and no tag, the card says "Focus · ahead · loop writing ›"
   without P/R.
2. *No close-out for blocks* — Given a focus block yesterday with a setup that tracks review, then "Meetings to close
   out" doesn't list it.
3. *Panel on Daily, thread* — Given "1:1 Mieke #101/mieke" with an owed todo, a waiting todo and an agreement from the
   last 1:1, when I tap it, then the card shows and the panel lists I owe, Waiting for and Agreed last time; ✕ brings
   back Next todos.
4. *Plain meeting, owner lens* — Given "Steering committee" in project Website with nothing linked, when I tap it,
   then the panel says "Nothing linked to this meeting yet · showing its project" and lists Website's next todos.
5. *Quick Add to meeting, before* — Given a thread meeting tomorrow, when I use **+ Quick Add to meeting** and add
   "Bring the numbers", then the todo carries the thread tag and no `[meeting::]`, the card returns, the panel lists it.
6. *Quick Add to meeting, after* — the same during the meeting → `[meeting::]` recorded.
7. *Week tap rules* — tapping a day header shows the day panel; tapping a chip shows card + panel with
   "‹ Back to Week 44"; tapping that returns to the normal right side.
8. *Month drill-down* — tapping a day, then a block in the day panel → card + panel; "‹ Back to October" → Given time.
9. *Context filters Daily* — Given contexts Work (Area Atruvia) and Home, when I choose Home, then Atruvia todos are
   hidden, the hidden line counts them, Atruvia meetings are dimmed, Inbox and an overdue Atruvia todo still show;
   **Show** shows all until I switch tabs.
10. *Context filters Projects/Areas/Review* — under Home the Areas tab lists only Home areas; Review's Stalled step
    lists only Home projects and the hub shows "+n in other contexts"; marking Reviewed is global.
11. *Hidden after Quick Add* — under Home, adding "Prepare offer #AT" says "Saved to Atruvia · hidden by Home".
12. *Contexts settings* — creating "Café" with Shows `#reading`, Hides `#computer` shows the right preview count and
    appears in the chip menu.
13. *Given time* — Given this week's F blocks and meetings, Week lists owners sorted by hours, an all-day event as
    "1 day"; Worked on lists an owner with a todo done this week and nothing scheduled.
14. *Tend* — a thread without a meeting in 14 days counts in the Tend line and shows "nothing planned" in Tending.
15. *Engage fallback* — on a note without owner, Engage lists today's remaining meeting/F-block owners.
16. *Upgrade* — Given a 0.21 space with focus flags, goals, `#now` and focus mode on, when 0.22 starts, then Daily
    shows all next todos (Everything), the one-time line appears, no file changed (mtime and content), and the
    stored settings still hold the focus keys.
17. *Demo* — switching to Demo inverts the tab bar and shows D; the demo has contexts and F blocks.

**Smoke** (`__tests__/scenarios/smoke/`, ≤ 60 s): scenarios 2-4 and 7 are rewritten in S4/S5 — Daily under a context
(shown/hidden/hidden line, "Sort tools" now visible), Week Given time incl. "Delivery" as 1 day, Month Given time
counting all meetings and the M highlight still on the 28th, area page with the Given time line; the smoke space gets
one context and one F block, loses focus flags/goals. Never deleted without replacement.

**Test areas / coverage**: new sources assigned (`focusBlock`, `meetingContext`, `meetingQuickAdd` → meetings/engage;
`contexts`, `ui/context/*`, `screens/settings/contexts/*` → new area **`contexts`** with help page `contexts.md`;
`givenTime`, `ui/period/*` → planning); deleted globs removed. Baselines: if an area drops > 2 points because its
tests were deleted with its code, lower that baseline by hand in S6 with the reason in the commit.

## 7. Rollback and risks

- **Rollback**: installing the 0.21.1 `.snplg` over any 0.22 beta works because (a) no update-time writes, (b) focus
  flags/goal spans/`#now` survive every write (round-trip tests), (c) retired settings stay in settings and profile
  files, (d) new settings keys and `#focusblock` are ignored/shown as a plain tag by 0.21.1. Known seams for the beta
  notes: F blocks look like ordinary meetings in 0.21.1 (tracked if their setup tracks); weeks of the beta have no
  goals; items created during the beta have no focus.
- **Risk: Review under a context** feels incomplete → the hub's "+n in other contexts" is mandatory in S3.
- **Risk: Daily floods with `#next`** for heavy users → R7 line, hidden line, contexts; measured in device test.
- **Risk: S5 is wide** (≈ 20 files). Mitigation: it is mostly deletion after S4 already replaced every visible use;
  tsc finds every leftover reader; the full tier runs at the checkpoint.
- **Risk: tap-rule change on Week** (chip no longer opens the day panel) — called out in CHANGELOG "Changed".
- **Perf**: `engageSourceOf` for the panel is built once per cache change (memo), Given time is O(meetings in range);
  record `daily:firstContent`, `week:firstContent` before/after (Daily slim protocol).

## 8. Device test plan

- [ ] Before/after perf trace (Daily slim §9 protocol) for Daily and Week.
- [ ] F toggle in Quick Add; F rows on Daily/Week/Month/Project page; card without P/R/Reflect; note opens the loop note
      or home notebook.
- [ ] Panel on Daily/Week/Month/Week ahead; Quick Add to meeting before/after; back rows.
- [ ] Contexts: create, switch from the chip on every tab, hidden lines, Show, Projects/Areas/Review filtered, hub counts,
      Quick Add hidden notice; Settings tab strip fits on one line (8 tabs).
- [ ] DEMO: inverted bar + D.
- [ ] Given time and Worked on plausible for a real week/month; Tend line opens Tending.
- [ ] After S5: no focus UI anywhere; `#now` todos show `#next`; Engage fallback; Review without the two steps.
- [ ] **Rollback drill**: install 0.21.1 over the S5 beta → focus panels, goals, focus mode and `#now` are back.

## 9. Decided points (2026-10-27)

- **O1** The Week panel follows the displayed week; the old "from Friday show the coming week" switch is dropped.
- **O2** Rows in Given time open their owner (thread/loop overview, item page).
- **O3** Contexts get their own test area `contexts` with the help page `contexts.md`.
- Requirements and Daily slim live next to this file in the repo: `docs/dev/history/requirements-time-and-place.md`,
  `docs/dev/history/technical-design-daily-slim.md` (S0 takes its structural part; its focus-mode parts are void).

## As built

### S0 - Daily structure, Settings → Features

- Daily slim's structural part as designed: `screens/daily/{useDailyData,DailyTodosColumn,DailyModeRow,dailyRows}`,
  Daily on `ui/useEntryActions.ts` (gained `toggleNow`, `saveTasks` with `inboxOverride` and its written Inbox as
  result, `todoCardOptions`/`cardOptions` with `extra`, settings from `useSettings()`, memoized `tracking`), the
  `taskRowLayout` cache (key also holds `task.dueDate`, which a due label reads), `heightKey="daily:todos"`,
  `daily:firstContent`. `DailyView.tsx` 1,508 → 366 lines, off the code-health baseline.
- **Focus mode kept until S5** (core rule 1): its code moved unchanged out of DailyView into
  `screens/daily/FocusModeScreen.tsx` (no `useFocusSession`; the session state stays in the screen). The file is
  deleted with focus mode in S5. The Focus mode button stays in `DailyModeRow` until then; no focus-mode switch.
- Not built: Daily slim §3.5's home-notebook icon redraw - its only beneficiaries, `DailyFocusPanel` and
  `PeriodFocusPanel`, are removed in S4/S5.
- Settings → Features: `modules: {closeOut}` (per profile through `PROFILE_KEYS`); `featuresOf` adds `closeOut`,
  `modulesOf` fills missing/malformed keys; `NO_EXPERIMENTAL_FEATURES` became `NO_FEATURES`. The rows use the
  switch line the moved Experimental rows already had (`screens/settings/SettingSwitch.tsx`, extracted from
  `AdvancedTab`) instead of `CheckToggle`, so the tab has one look. Close-out off = no `onStartCloseOut` for
  Current (both App call sites) and Review; both already fall back to direct archiving.
- Help: the in-app help list has room for 27 rows (`__tests__/domain/helpTopics.test.ts`), so the new
  `features.md` took in `integrations.md` ("Features and integrations": the switches, then Google Calendar and
  Gmail); area `integrations` names `features.md` as its help page.
- Scenarios: Daily slim T1, T3 (focus session with two Inbox todos; removed with focus mode in S5), T4, T5
  (`__tests__/scenarios/dailySlim.test.tsx`), T10-T12 (`features.test.tsx`); unit U1-U3 (`taskRowLayout.test.ts`),
  U4 (`features.test.ts`). T2, T6-T9 and U5-U7 tested the focus-mode switch, which this release does not build.

### S1 - Focus blocks

- As designed: `domain/focusBlock.ts`, `focusblock` in `RESERVED_BARE_TAGS` (no tag filter word, no
  abbreviation), stripped by `meetingDisplayTitle`, `tracksCheckpoint` false, `reflectionOffered` false (it now
  takes the tags; `meetingPhase` reads the time itself so a focus block still turns "over"), Engage's strip offers no
  Reflect (`StripInput.focusBlock`).
- Card: `MeetingCardModel.focusBlock`, heading "Focus · …". The R1 link stays the thread-tag link (it already opens
  the loop overview for a loop tag); for a focus block whose tag's type is a Loop setup kind it reads
  "writing novel ›". The card also got an **F** toggle next to **M** (acts at once, like M), so a copied Google
  event can be made a focus block from its card; `onFocusBlock` is optional in `MeetingCardData`.
- Note rule: `focusBlockNoteTarget(meeting, setups, inbox)` in `domain/noteSetups.ts` (`meeting` | `home` |
  `none`). Applied in three places: the card (`note: 'home'` opens the home notebook through
  `useHomeNotebookTap`; without a Default notebook or in the Inbox no note button), the row (`MeetingRow` hides
  +📓 for a focus block no setup places), and `openOrCreateMeetingNote` (throws `FOCUS_BLOCK_NO_NOTE`), so no
  path creates a Default note for a focus block.
- Quick Add: the F box is `ui/HighlightMark.tsx` with `letter="F"`; `MeetingDraft`/`MeetingEditFields` carry
  `focusBlock`, folded in by `compose` like `monthly`. `MeetingSeedFields.focusBlock` (optional) is there for S4's
  "+ F block".
- Marks: `MeetingRow` puts a filled F before the title (both layouts), `MeetingChip` a bold "F ", the Month row an
  "F"/"F<n>" column (`MonthDay.focusBlocks`).
- Schedule: `SCHEDULE_LABEL` and `scheduleCountText` in `domain/meetingDisplay.ts`; also the Review Inbox step's
  meeting list (it is an Inbox meeting list). Changed tests: `currentPagePerf`, `currentThreadsTab` and the
  current-page golden file look for "Schedule" instead of "Meetings" (the golden also gains the F box).

### S2 - Context panel

- Domain as designed: `domain/meetingContext.ts` (`meetingContextOf` on `ownerOfMeeting`, `engagePageOf`,
  `optionsOf`), `domain/meetingQuickAdd.ts` (`quickAddPartsFor`; `useEngageQuickAdd` calls it, Engage's tests
  unchanged). Additions found while building: a thread's or loop's **Next also lists its plan todos** (an agenda
  item added before the meeting has no flow state and must show, D14); a todo already listed above "Agreed last
  time" shows once; an **Inbox meeting has no owner** (`ownerOfMeeting` knows Projects/Areas only) - its panel
  lists nothing and Quick Add to meeting files to the Inbox; the owner's lens line reads "… showing its project"
  / "its area".
- UI: `ui/meetingContext/{MeetingContextPanel,ContextBackRow,useMeetingContext,useMeetingQuickAdd,useMeetingContextSlot}`.
  `useMeetingContextSlot` holds the per-screen wiring (Daily, Week, Month) so the screens only lay out. The back
  row is its own small component. `useEditTarget` gained `add`/`toCard` and `cardOrEdit` for the parts that know
  no `add` (agreements, the project page); `editTargetFor` returns null for `add` (Quick Add in create mode).
- **Todo rows in the panel tick, open their note and linked file, but a tap selects nothing**: the screen's one
  selection stays the meeting (Week and Month select meetings only). Editing a todo stays on its page or Daily's
  Next todos. The footer reads "‹ Back to the card" while Quick Add is open (Quick Add's create mode has no ✕).
- Entries added through the panel go to the meeting's Project/Area (the Inbox for an Inbox meeting).
- Week: a chip selects (card + panel) and leaves the day panel as it was; `openDay` (the back row's day link) opens
  a day without toggling. Month's back row: left = close the day panel, right = back to the day panel. Review's
  Week ahead gets all of this through `WeekPlanner`; `rightSide="schedule-only"` comes with Given time in S4.

