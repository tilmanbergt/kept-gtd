# Technical Design: Calmer screens (0.26.0)

Status: **approved for implementation** (2026-11-10, open points O1–O5 decided, §9). Requirements: project doc `claude/feature-calmer-screens.md` (D1–D32, decided
2026-11-10). UI: canvas "Kept GTD Calmer Screens" (real A5 X size). Goes into the repo as
`docs/dev/history/technical-design-calmer-screens.md` in the first implementation step.

Same release as Writing help (tag editing) and Promises kept (QA). **Dependency:** this design builds on
Writing help's strip (`ui/writing/WritingStrip.tsx`, `domain/writing/stripContent.ts`) and must start after
Writing help's step W4 is merged.

## 1. Requirements as decided (short)

Show less at once. Layouts stay stable: things swap inside fixed zones, nothing is pushed around.

- **Quick Add zone** (D1–D4): collapsed = a row of `+ Todo · + Meeting · + Note` (`+ Agreement` on Current)
  in today's box (same height). A button opens that kind in the same box, cursor in the field. Cards (todo,
  meeting, inbox) use the same box. An empty title field offers **Thread · Loop · Paste**.
- **Rows** (D5–D7): titles keep their text; only `#next`, `#due`, `#wf` move to a grey note on the right.
  No +📓/+📎 on rows; a notebook icon only where a note exists (one tap opens it). Cards appear in about
  150 ms + refresh.
- **Daily** (D8–D10): count tabs `Next · Waiting · Inbox · Done`. No summary line. Layout buttons in the
  Today/Tomorrow row. A bell with a count on Waiting and Inbox for due/overdue items.
- **Done** (D11–D13): a ticked item stays struck through until you leave the tab or screen. A Done tab (only
  when > 0): today on Daily, last 14 days on Current. No hide-done toggles.
- **Inbox on Daily** (D14–D22): the Inbox tab of the tab bar goes. Daily's Inbox tab lists marks, todos,
  meetings; all count. Inbox items only there; context ignored. The inbox card's main action is File to
  (suggested places + More…), then ✓ Done, Edit, Delete, → New project. After filing, the next item opens.
  New project: name, abbreviation, what happens to the item. Review "Inbox to zero" uses the same card.
- **Current** (D23–D29): header name · kind · area (+ abbreviation); scope under it only when set (tap →
  ⚙). Notebook, Engage ›, ⚙ Settings bottom-left. ⚙ holds abbreviation, scope, area, status, close
  out/archive and "Show on this page" (Auto / Always / Never per part; Todos and Files always). Count tabs
  on todos.
- **Week/Month** (D30): Given time one line per owner; details on tap. **Engage** (D31): no Section line,
  no "Loop since…" line, NowBox buttons w/f · Someday · Note · More ›; Today next stays.

### 1.1 Checked against the product principles (DEVELOPMENT-POLICY §2, design-philosophy.md)

| Principle | How this design keeps it |
|---|---|
| Calm and made for e-ink; spaciousness | Fewer elements per screen. One list at a time. Fixed zones, so a tap never reflows the page. |
| One page, one intention | Daily = what now; the Inbox step = file; ⚙ = administration, away from working. |
| Nothing chosen for you | File-to suggestions are ranked, never applied. New project fields are prefilled, never saved without a tap. |
| Your files, no lock-in | The only file-format addition is one optional frontmatter line `show:` (§3.6), written only when it differs from the default. Retired settings stay stored and are ignored. |
| Keeping your word clean | Due waiting and inbox items get a bell instead of hiding. Done items stay visible for a moment and in the Done tab. |

## 2. Current state (relevant code)

- **Selection:** `ui/useEditTarget.ts` holds `{target, mode}` in `useState` of the screen
  (`useEntryActions` → `actions.edit`). DailyView, ProjectDataPanel, InboxScreen and the review steps read
  `target` while they render, so **one tap re-renders the whole screen**: both columns, `PagedSection`
  measuring, every `TaskRow`, `QuickAddWidget`. This is the likely cause of the slow card (to be confirmed
  by measuring, §3.1).
- **Quick Add:** `ui/QuickAddWidget.tsx` in `ui/quickAdd/QuickAddFrame.tsx`, four fixed rows,
  `QUICK_ADD_HEIGHT` (~174 dp ≈ 245 px). R1 `TabsRow` (Todo/Meeting/Agreement/Note + main button). Cards
  (`ui/itemCard/TodoCard.tsx`, `MeetingCard.tsx`) replace the rows when `editTarget.mode === 'card'`.
  `ui/CollapsedQuickAdd.tsx` (Engage) is a dashed line that expands the widget.
- **Strip:** `domain/writing/stripContent.ts` state 7 = clipboard buttons (All · Copy · Cut · Paste),
  rendered by `ui/writing/WritingStrip.tsx`. Loop kinds: `storage/loopKinds.ts`; setups and their kind
  (`thread`/`loop`): `domain/noteSetups.ts`.
- **Rows:** `ui/TaskRow.tsx` (done box, text with labels via `domain/taskLabels.ts`, +📓 create/open,
  +📎 link/open), `ui/taskRowLayout.ts` (cached heights), `ui/MeetingRow.tsx`.
- **Daily:** `screens/DailyView.tsx`, `screens/daily/DailyTodosColumn.tsx` (Quick Add, "Next todos"
  `PagedSection`), `storage/dailyAggregate.ts` (Inbox folded in; #next, due ≤ tomorrow, waiting rule
  `isWaitingForShownOnDaily`; context matcher), `ui/DayMeetingsPanel.tsx` (Today/Tomorrow/Google, header
  line with counts and the layout buttons).
- **Inbox:** `screens/InboxScreen.tsx` (two panes: Files pane + Todos by flow state + Meetings
  Upcoming/Past + Google mini-tab + `MarksCard` all marks, hide done). Filing: `storage/entryMove.ts`
  (`moveTask`/`moveMeeting`), `storage/inboxFiling.ts`. Review: `screens/review/steps/InboxStep.tsx`
  (same rows and Files pane). Nav: `App.tsx` `AppTab` includes `'inbox'`; `openInbox` sets it.
- **Recent places:** `storage/destinationUsage.ts` (12 most recent, per profile);
  `domain/captureFileTo.ts` + `ui/quickAdd/fileToChips.ts` (short list + all).
- **Current:** `screens/ItemDetail.tsx` (left: `ItemScopePanel` top, Files pane with tabs, `ItemStatusPanel`
  bottom; header with abbreviation editing, `HomeNotebookButton`, `EngageButton`), right:
  `screens/ProjectDataPanel.tsx` → `projectData/TodosSection.tsx` (groups by flow state, `DoneToggle`,
  `hideDoneProjectTasks`) and `MeetingsSection.tsx`. Frontmatter: `domain/markdown.ts`
  `FrontMatterFields` / `parseFrontMatter` / `writeFrontMatterIntoContent` (unknown lines kept).
- **Done date:** `Task.fields.completion` (YYYY-MM-DD), written by `withTaskDone`.
- **Week/Month:** `ui/period/GivenTimePanel.tsx` (two lines per owner; a row opens its owner).
- **Engage:** `screens/engage/EngageOverlay.tsx` with `SectionLine`, `LoopLine`, `NowBox`, `MeetingLine`
  (today next).
- **Perf:** `utils/perf.ts` (`perfBegin` kinds cold/reopen/tab/nav, `perfMark`, `usePerfRender`).

## 3. Design

### 3.1 Fast cards: measure, then a selection store

1. **Measure** (first change of stage A): add trace kind `'tap'`. A row's press starts
   `perfBegin('tap', 'card', {screen})`; the card's first layout (`useLayoutEffect` in `TodoCard`,
   `MeetingCard`, `InboxCard`) marks `card:commit`. `usePerfRender` already counts renders per component.
   Tilman records a baseline on the device (Performance tracing on, five taps on Daily and Current). The
   numbers go into As built.
2. **Selection store** `ui/selectionStore.ts`: `createSelectionStore<T>()` → `{get, set, subscribe}`, read
   with `useSyncExternalStore`. `useEditTarget` keeps its API, but its state lives in a store created per
   screen instance. New hooks:
   - `useSelection(store)` → `{target, mode}`: for the zone only;
   - `useIsSelected(store, key)` → boolean: for one row (re-renders only when *its* value flips).
3. **Split the screens** so the list does not read the selection:
   - Daily: `DailyView` renders `<SelectionZone>` (Quick Add + cards, the only reader of the selection) and
     `<DailyTodosColumn>`, which gets `rows` and stable callbacks, wrapped in `React.memo`.
   - `TaskRow` / `MeetingRow` are `React.memo` with `selected` from `useIsSelected`.
   - Current (`ProjectDataPanel` + `TodosSection`) the same way. Review's Inbox step, the thread and loop
     overviews keep today's behaviour (they work unchanged on top of the store) and can follow later.
4. Cards render into the fixed box (no height change, no remeasure of the list). After the commit, one
   `requestEinkRefresh()` as today. A partial refresh of only the box is tried in the device test (host
   support unknown); if it is not available, it is dropped and noted.

Target: tap → `card:commit` ≤ 150 ms on the A5 X. If the baseline shows another cause, the fix follows the
measurement, not this plan; As built records it.

### 3.2 Quick Add zone

- `QuickAddWidget` gets `collapsible?: boolean` (Daily, Week, Month, Current, Review's Inbox step;
  Engage keeps `CollapsedQuickAdd`). New core state `open: QuickAddType | null` in `useQuickAddCore`.
- **Collapsed** (`open === null`, no card): R1 shows `KindButtons` (`ui/quickAdd/KindButtons.tsx`): one
  `PillButton` per kind the screen offers (same rules as `TabsRow`: Note only with `onAddNote`, Agreement
  only with `onAddAgreement`). R2–R4 stay mounted with `display: 'none'` (drafts survive), and the box keeps
  `QUICK_ADD_HEIGHT`, so the free space is empty.
- **Open**: tapping `+ Todo` sets the tab and `open`, then focuses the text field (`ref.focus()` after the
  commit). R1 shows today's `TabsRow` (the kind can still be switched) plus ✕ (collapse; the draft is
  kept). All four kinds fit today's
  four rows, so **nothing grows**: the "Meeting form grows over the list" of the requirements is not needed.
- After `+ Add` succeeds, the box collapses. The message goes to the central status slot as today ("Saved
  to … · Undo"); see open point O1 about showing it in the free space.
- Edit (second tap or card's Edit) works as today; ending it collapses the box.
- **Focus risk:** a programmatic `focus()` may not raise the keyboard or handwriting panel in the plugin
  host. Device test item; fallback: the field is shown focused-looking and one tap on it opens input (no
  worse than today).

### 3.3 Thread · Loop · Paste starters

- `stripContent` gets a resting state for an **empty title field in create mode** (todo text, meeting
  title): `{kind: 'starters'; thread: boolean; loop: boolean; paste: boolean}`. It replaces state 7 while
  the field is empty; as soon as there is text, state 7 (All · Copy · Cut · Paste) returns.
- `thread` = any enabled Note setup of kind `thread`; `loop` = any loop kind (`storage/loopKinds.ts`);
  `paste` = the clipboard has text (`Clipboard.hasString()` on focus, cached for that focus).
- Tap **Thread** / **Loop** → state `{kind: 'starterList'; options}`: the first three setups of that kind in
  Note setups order, labelled by their first tag (`#sparring`), plus ‹. Tap an option → inserts `#tag/` at
  the cursor (thread) or `#tag ` (loop), and Writing help's completion takes over (after `type/` it offers
  the counterparts). Both are a *moment* (ends on the next touch), like states 2–5.
- Pure: `domain/writing/stripContent.ts` (+ starters input), `domain/writing/starters.ts`
  (`starterOptions(setups, loopKinds, kind, limit = 3)`). UI: `WritingStrip` renders the two new kinds;
  `useWritingHelp` gets `starters` input from `useQuickAddCore`.

### 3.4 Quiet rows and the compact card

- `domain/taskLabels.ts`: new display mode `'quiet'`: the title as written minus `#next`/`#now`, the due
  field and the `#wf…` tag; free tags stay. `quietMeta(task, today)` → `{text, strong}`: `due today` (strong)
  / `overdue 3.11.` (strong) / `due 5.11.` / `w/f Marco` / `w/f` / null. Dates through `domain/dateFormat.ts`.
- `TaskRow`: mode `'quiet'` on Daily and Current. Right side: meta text, then the **notebook icon only when
  `task.notePath`** (tap opens it, `onOpenNote`); no create-note icon, no clip. The layout cache key gets
  the mode. `MeetingRow`: the same rule for its note icon.
- **Compact todo card** (`TodoCard`): fits the same box: R1 caption `Todo · <owner> · <flow/due>` + ✕;
  R2 title (tap = Edit); R3 one detail line (agreed in …, linked file name, "no note yet"); R4
  `✓ Done · w/f · Someday · Note›/+ Note · More ›`. **More ›** swaps R3–R4 for the rest (Next, Maybe, Edit,
  owner name ›, refile, link file, delete) with ‹ back; same box, no growth. `domain/itemCard.ts` decides
  what shows (model extended with `page: 'main' | 'more'`). The meeting card follows the same two-page
  pattern.

### 3.5 Count tabs, bell, Done

- `ui/CountTabs.tsx` on top of `MiniTabs`: tab defs `{key, label, count, bell?, fixed}`; renders `Next 11`,
  `Waiting 5 🔔1` (bell = `BellIcon` in `ui/icons.tsx` + number, no colour). Non-fixed tabs with count 0 are
  not shown. The chosen tab per screen lives in `ui/listTabStore.ts` (memory only, not persisted). If the
  chosen tab disappears, it falls back to the first tab.
- **Daily** (`storage/dailyAggregate.ts` splits its result): `next` (today's rule, minus waiting, **minus
  the Inbox**), `waiting` (today's waiting rule), `inbox` (§3.7), `done` (all todos with
  `fields.completion === today`, Inbox included). Bell counts: waiting with date ≤ today; inbox todos with
  due ≤ today. Fixed tabs: Next, Waiting, Inbox; Done only when > 0.
- **Current** (`TodosSection`): tabs Next · Waiting · Plan · Someday (incl. Maybe) · Done. Next is fixed.
  Done = done with completion within the last 14 days (`domain/flowState.ts` helper `doneWithin(task,
  today, 14)`). `DoneToggle` and `hideDoneProjectTasks` are no longer used.
- **"Struck through until you leave"** (D11): `ui/useJustDone.ts` keeps a `Set` of entry keys ticked on this
  screen. Rows in that set stay in their list, struck through. The set is cleared when the count tab
  changes, when the screen loses focus (`ui/screenActivity.ts`) or on unmount. Unticking a just-done row
  works in place. Pure filtering: `domain/listTabs.ts` (`splitDaily`, `splitCurrent`, `keepJustDone`).
- Retired settings `hideDoneProjectTasks`, `hideDoneInboxTasks`: stay in `DEFAULT_SETTINGS` and stored
  data, marked retired in their doc comment, read by nobody (rollback-safe, like the focus keys in 0.22).

### 3.6 Daily layout details

- `DayMeetingsPanel`: the header line ("Tue 3.11. · 2 meetings · 1 focus") is removed. The layout buttons
  move into the `MiniTabs` row (right-aligned slot, new `MiniTabs` prop `accessory`).
- `DailyTodosColumn`: Quick Add box, `CountTabs`, then the list of the chosen tab: Next and Done grouped
  by owner as today, Waiting grouped by owner, Inbox see §3.7. The hidden line (context) stays under Next
  only.

### 3.7 Inbox on Daily

**List** (`screens/daily/InboxList.tsx`, also used by Review's Inbox step):
- the marks card (`MarksCard`, scope all) as the first row when there are open marks;
- open Inbox todos (not done, not cancelled, not `#someday`/`#maybe`), file order, capture date as meta
  (`fields.created`);
- Inbox meetings not cancelled and not done, past ones included (date as meta).
- Count = open marks + those todos + those meetings (`domain/inboxCount.ts`, pure). The context filter is
  not applied.

**Inbox card** (`ui/itemCard/InboxCard.tsx`, in the Quick Add box): caption `Inbox · captured 2.11.` + ✕;
title; R3 `File to` + up to four place buttons (abbreviation, or short name) + **More…**; R4 grey `✓ Done ·
Edit · Delete · → New project`.

**Suggestions** (`domain/inboxFileTo.ts`, pure, unit-tested): input = the item's tags, the active
Projects/Areas with abbreviations, tag→owner counts and the recent list.
1. a recognised abbreviation tag in the text (`#GR`) → that place first;
2. owners whose open todos/meetings carry one of the item's tags, most uses first
   (`storage/tagOwners.ts` builds `tag → owner path → count` from the cache, memoised per cache version);
3. `destinationUsage` recent places;
4. stop at four. Only active items; never the Inbox.

**Filing:** a tap → `moveTask`/`moveMeeting` to that place (note moves along, as today, with its
confirmation), `recordDestination`, status-slot message "Filed … to X · Undo" (Undo = move back, the
existing undo path of `entryMove`). Then the **next inbox row** (the one after it, else the one before) is
selected as card. When the list is empty, the box collapses to the buttons.

**More…** (`screens/daily/FilePicker.tsx`): replaces the list area. Projects | Areas mini-tabs, active only,
paged (`PagedSection`), name + abbreviation (+ area in grey for projects). The card stays with
`‹ Back to the card`. Bottom row: `+ New project from this item` and `Someday / Maybe`. Someday / Maybe
adds `#someday` (Maybe via the card's Edit) and the item leaves the Inbox list; it stays in `Inbox.txt` and
shows in Review's Someday step (O3: check that the step reads the Inbox, add it there if not).

**New project** (`screens/daily/NewProjectForm.tsx`): replaces the list area, card stays.
- Name: prefilled from the item's text without tags and without a leading `Idea:`/`Idee:` (pure
  `domain/projectFromItem.ts`), cursor in it. Abbreviation: `suggestAbbrev` from `domain/abbrev.ts`, editable,
  validated with `validateAbbrev`.
- What happens to the item: first todo `#next` (default) / first todo / "was only the name: remove it"
  (= cancel the inbox todo, as Delete does).
- **Create project** → `storage/createItem.ts` (as the Projects tab does; status line names the new folder),
  then `moveTask` into it (with the chosen flow) or cancel the todo. Status slot "New project Herb spiral #HS ·
  Open ›"; the next inbox item opens; the new project is recorded first in `destinationUsage`.
- **No Undo for the project itself:** removing a folder is a delete and needs a confirmation and the delete
  permission (DEVELOPMENT-POLICY §3). The status line offers `Open ›` only; a wrongly created project is
  archived or removed by hand. (Moving the item back stays possible through its card.)

**Review "Inbox to zero"**: `InboxStep` uses `InboxList` + `InboxCard` + `FilePicker` + `NewProjectForm`;
its Files pane goes (filing is by picker now). Past meetings show there too (consistent with D14).

**Navigation:** `AppTab` loses `'inbox'`. `openInbox()` → Daily with list tab `inbox` (`listTabStore`). A
stored last tab `'inbox'` (persisted `activeTab`) is read as `'daily'` + Inbox tab. Every help link and
status message that named the Inbox tab points to "Daily → Inbox". `InboxScreen.tsx` is deleted in the last
step of stage B, after the new list has been used on the device. Its two-pane Files pane remains on Current.

### 3.8 Current: ⚙ Settings and "Show on this page"

**File format** (one optional frontmatter line, `domain/pageShow.ts`, pure):
```
show: threads=auto loops=auto agreements=auto schedule=auto notebook=auto projects=auto open=first
```
- Parts: `threads`, `loops`, `agreements`, `schedule`, `notebook`, `projects` (areas). Values `auto` /
  `always` / `never`. `open` = `first` (the first left tab with content) / `notebook` / `files` / `threads`.
  Todos and Files are not listed: always shown.
- Unknown parts or values are kept verbatim (round-trip). A missing line = all defaults. The line is
  written only when something differs from the default, and removed again when everything is default.
- `FrontMatterFields` gains `show: PageShow`; parse/serialize + round-trip tests; older Kept versions keep
  the line as an unknown line (`extraLines`), so rollback is safe. CHANGELOG **Upgrade note**: "Projects and
  areas can carry a `show:` line; older versions keep it untouched."

**Auto** (`visibleParts(show, presence)`): presence from the cache, nothing new to read: threads =
`threadsSection` has entries; loops = active loops; agreements = own agreements; schedule = meetings or F
blocks; notebook = home notebook exists (`homeNotebooks`); projects = assigned projects.

**Layout** (`screens/ItemDetail.tsx`, split as it grows past its baseline):
- header: name · `Project · <area ›>` · given time this week (moved from `ItemScopePanel`) · abbreviation
  badge (no longer editable here);
- scope under the header only when set; a tap opens ⚙;
- left: tabs = visible parts + Files; the `open` rule chooses the start tab;
- left bottom: `Notebook` (`HomeNotebookButton`), `Engage ›`, `⚙ Settings`;
- right: Quick Add box, count tabs, lists; Schedule only when visible, with its layout buttons;
- `ItemStatusPanel` leaves the page.

**⚙ Settings** (`screens/item/ItemSettings.tsx`, a mode of ItemDetail like the close-out wizard; `Done`
returns):
- left: name (read only; renaming stays a folder rename, with the home-notebook rename offer as today),
  abbreviation (today's editor, moved), scope (today's editor from `ItemScopePanel`), area (Assign to
  Area… / `Area: X ✕`, today's arming flow: the Files pane picks the area, so ⚙ shows the Files pane while
  arming), status (Active / On Hold / Done, `Close out…`; areas: `Archive…`) through today's
  `ItemStatusPanel` logic, moved into `screens/item/StatusBlock.tsx`;
- right: "Show on this page": one row per part with a 3-way segmented control, and "Left side opens on".
  Each tap writes the frontmatter at once (`updateItemFrontMatter`, write-through).

### 3.9 Week / Month and Engage

- `GivenTimePanel`: one line per owner (name · `KindBadge` · hours). Tapping a row shows an **owner card**
  in the Quick Add box (`ui/itemCard/OwnerTimeCard.tsx`): name, kind and hours, then exactly the grey line
  the row loses ("1 block · 2 meetings · 3 done · next: Fix the leaking tap", same text function as today's
  subline), and `Open ›`. The row no longer opens the owner directly. Month the same.
- Engage: `SectionLine` and `LoopLine` are no longer rendered (files deleted if unused). `NowBox` buttons:
  `w/f <counterpart>` · `Someday` · `Note ›`/`+ Note` · `More ›` (More: Remove #next, the linked file); the
  check box stays. `MeetingLine variant="today"` stays.

### 3.10 Short screens (Nomad, landscape)

The box keeps `QUICK_ADD_HEIGHT` everywhere. `KindButtons` use the narrow labels below 800 dp (`Agree`), as
`TabsRow` does. `CountTabs` drop the word and keep the count below 800 dp only if they overflow (measured
with `estimatorWidth`). Current's short layout (`Todos | Schedule | Google` tabs) keeps its tabs, with the
count tabs inside Todos.

### 3.11 Logging

`[GtdPara]` lines, counts and kinds only, no titles: `tap card screen=daily ms=…` (from the trace),
`quickadd open kind=todo`, `inbox file to=suggested|picker|new-project`, `inbox next`, `listTab daily
inbox`, `show set part=loops value=never`.

## 4. Edge cases

- The selected inbox item is filed from another screen (cache change): the selection is dropped, the box
  collapses.
- Tab Done and a just-done row: it shows in both its own tab (struck) and Done until you leave.
- Unticking in Done (today) moves the item back to its list at once.
- An inbox meeting dated today shows in Daily's schedule *and* under Inbox (it still needs a place).
- More… while the item changed on disk: filing re-reads the entry (`entryMove`), as today.
- New project with a name that exists: `createItem`'s existing check and message; the form stays.
- `show:` line written by hand with a typo (`loops=nevr`): read as `auto`, kept verbatim on save.
- A part set to Never that has content: hidden; ⚙ shows "Never · 2 loops" so nothing is lost silently.
- Programmatic focus does not raise input on the device: see §3.2 fallback.
- Profile switch: list tab store and selection stores reset.

## 5. Files

New: `ui/selectionStore.ts`, `ui/CountTabs.tsx`, `ui/listTabStore.ts`, `ui/useJustDone.ts`,
`ui/quickAdd/KindButtons.tsx`, `ui/itemCard/InboxCard.tsx`, `ui/itemCard/OwnerTimeCard.tsx`,
`screens/daily/{InboxList,FilePicker,NewProjectForm,SelectionZone}.tsx`,
`screens/item/{ItemSettings,StatusBlock,ShowOnPage}.tsx`, `domain/{listTabs,inboxCount,inboxFileTo,
projectFromItem,pageShow}.ts`, `domain/writing/starters.ts`, `storage/tagOwners.ts`.

Changed: `utils/perf.ts` (tap kind), `ui/useEditTarget.ts`, `ui/useEntryActions.ts`, `ui/TaskRow.tsx`,
`ui/taskRowLayout.ts`, `ui/MeetingRow.tsx`, `ui/MiniTabs.tsx`, `ui/icons.tsx`, `ui/DayMeetingsPanel.tsx`,
`ui/QuickAddWidget.tsx`, `ui/quickAdd/{useQuickAddCore,TabsRow}.ts(x)`, `ui/itemCard/{TodoCard,MeetingCard,
parts}.tsx`, `domain/itemCard.ts`, `domain/taskLabels.ts`, `domain/flowState.ts`,
`domain/writing/stripContent.ts`, `ui/writing/{WritingStrip,useWritingHelp}.ts(x)`, `domain/markdown.ts`
(frontmatter `show`), `domain/settings.ts` (retired keys documented), `storage/dailyAggregate.ts`,
`screens/DailyView.tsx`, `screens/daily/DailyTodosColumn.tsx`, `screens/ProjectDataPanel.tsx`,
`screens/projectData/TodosSection.tsx`, `screens/ItemDetail.tsx`, `ui/ItemScopePanel.tsx`,
`ui/ItemStatusPanel.tsx` (logic moves to `StatusBlock`), `screens/review/steps/InboxStep.tsx`,
`ui/period/GivenTimePanel.tsx`, `screens/engage/{EngageOverlay,NowBox}.tsx`, `App.tsx`, `ui/TabBar.tsx`.

Deleted: `screens/InboxScreen.tsx` (end of stage B), `screens/engage/{SectionLine,LoopLine}.tsx` if unused,
`ui/DoneToggle.tsx` if unused.

Feature areas (`scripts/test-areas.json`): `quick-add` (zone, starters), `planning` (Daily, Week/Month,
count tabs), `current-page` (Current, ⚙, show), `review` (Inbox step), `engage`, `foundation` (selection
store, perf).

Docs: `docs/user/daily.md` (count tabs, bell, Done, the Inbox section), `quick-add.md` (buttons, card,
starters; "The Inbox" moves to daily.md with links updated), `projects-and-areas.md` (header, ⚙, Show on
this page), `week-and-month.md`, `engage.md`, `review.md`, `settings.md`, `index.md` (tabs at a glance),
`getting-started.md`; screenshots in `docs/user/images/`; `docs/dev/claims.md` (no new promise; "hide done"
claims removed if any); `docs/dev/design-overview.md` §2/§3 (fixed zone, selection store as a building
block); CHANGELOG `[Unreleased]` (Changed + Upgrade note: "The Inbox now lives on Daily", `show:` line).

## 6. Test scenarios (Given / When / Then)

Quick Add and cards
1. Given Daily, then the Quick Add box shows `+ Todo · + Meeting · + Note` and has the same height as before.
2. Given Daily, when `+ Todo` is tapped, then the Todo form shows in the box with the text field focused; when
   ✕ is tapped, then the buttons are back and the typed text is still there on the next `+ Todo`.
3. Given a todo was added, then the box shows the buttons again and the status slot says where it went.
4. Given a todo row on Daily, when it is tapped, then its card shows in the box, the list did not re-render
   (render counter of `DailyTodosColumn` unchanged), and the row is marked selected.
5. Given the card, when More › is tapped, then the second page shows in the same box; ‹ returns.

Starters
6. Given Note setups with thread `sparring` and loop `offsite`, when `+ Meeting` is opened, then the strip shows
   Thread · Loop (· Paste when the clipboard has text).
7. Given scenario 6, when Thread and then `#sparring` are tapped, then the title reads `#sparring/` and the
   strip offers counterparts.
8. Given text in the field, then the strip shows All · Copy · Cut · Paste, not the starters.

Rows
9. Given a todo `Order soil #next` with due 5.11., then its Daily row reads "Order soil" with "due 5.11." on the
   right and no note icon.
10. Given a todo with a note, then its row shows the notebook icon, and one tap opens the note without a card.
11. Given a todo `Collect topics #lena`, then the row keeps "#lena" in the title.

Count tabs, bell, Done
12. Given 11 next, 5 waiting (1 due today), 4 inbox todos, 1 inbox meeting and 4 open marks, then Daily shows
    `Next 11 · Waiting 5 🔔1 · Inbox 9`.
13. Given an Inbox todo with `#next`, then it is not under Next, only under Inbox.
14. Given an active context that hides an Inbox todo's owner (none) and a project todo, then Inbox still shows
    the inbox todo and Next hides the project todo.
15. Given a todo ticked on Next, then it stays struck through; when the Waiting tab is opened and Next again,
    then it is gone, and Done shows `Done 1` with it; when it is unticked there, then it is back under Next.
16. Given a project with 3 todos done 3 days ago and 1 done 20 days ago, then Current shows `Done 3`.

Inbox
17. Given an inbox todo `Ask Lena #lena` and `#lena` used in Team offsite, when the card opens, then `#TO` is the
    first File to button.
18. Given the card, when `#TO` is tapped, then the todo is in Team offsite's file, the status slot says "Filed …
    · Undo", and the next inbox item's card is open.
19. Given the card, when More… → Areas → Home is tapped, then the item is in Home's file.
20. Given the card, when → New project, name "Herb spiral", Create project are tapped, then a project folder
    "Herb spiral" with abbreviation HS exists, its file has the todo with `#next`, the Inbox no longer has it.
21. Given "was only the name: remove it", when Create project is tapped, then the project exists empty and the
    inbox todo is cancelled.
22. Given Someday / Maybe in the picker, then the todo has `#someday`, stays in Inbox.txt and leaves the Inbox
    list and count.
23. Given the Review step Inbox to zero, then it shows the same list and card, and filing there works the same.
24. Given the app was last on the Inbox tab (stored), when it starts, then Daily shows with the Inbox tab.

Current
25. Given a project with no threads, no loops, no meetings and a home notebook, then the left tabs are Notebook
    · Files, opening on Notebook, and there is no Schedule.
26. Given ⚙ → Loops → Always, then the project file has `show: loops=always` and the Loops tab shows (empty).
27. Given all parts back to Auto, then the `show:` line is gone from the file.
28. Given a file with `show: loops=nevr foo=bar`, when the status is changed, then the line is kept as written.
29. Given a project with a scope, then it shows under the name; when tapped, then ⚙ opens. Given none, then
    no line.

Week, Engage
30. Given Week, then each Given time owner is one line; when tapped, then its owner card shows in the box with
    Open ›.
31. Given Engage on a loop page, then there is no Section line and no "Loop since" line, and "Today next" is
    shown.

## 7. Test plan

Unit tests: `listTabs`, `inboxCount`, `inboxFileTo` (ranking incl. abbreviation, tag counts, recent, active
only), `projectFromItem`, `pageShow` (parse/serialize/round-trip/defaults/unknowns), `starters`,
`stripContent` new states, `taskLabels` quiet mode and `quietMeta`, `doneWithin`, `selectionStore`.
Scenario tests for §6 (`__tests__/scenarios/calmer*.test.tsx`, each with `help:` references). A render-count
test for scenario 4 (`usePerfRender` counter in the fake device). Smoke: the Daily smoke scenario is updated
(Quick Add now needs a tap on `+ Todo`).

Device checklist (per device stop):
- A: tap → card time vs baseline; focus raises input after `+ Todo`; box height unchanged, no jumps;
  starters strip; quiet rows legible; bell visible; Done tab; Week owner card; Engage panel.
- B: filing with suggestions; More…; New project (folder created, status message); auto-next; Review step;
  old Inbox tab gone, links land on Daily → Inbox.
- C: ⚙ page; Auto/Always/Never; `show:` line in the file (open it in a text editor); scope tap; Nomad
  landscape check.

## 8. Implementation plan: three stages, three device stops

Each stage ends with `npm run check` (full), a push, and a **device stop**: Tilman installs the CI build of
the last push (Actions → the run's `kept-gtd-<label>` artifact, with `TESTING.md`) and answers in the
session. No beta pre-release. Steps inside a stage run `npm run check:affected -- --area <areas>`. Help pages and CHANGELOG change in the same step as the feature.

**Stage A – Calm surface** (areas foundation, quick-add, planning, current-page, engage)
1. Perf `tap` trace + baseline build (device numbers before the refactor).
2. Selection store; Daily and Current split (§3.1).
3. Quick Add zone: KindButtons, open/collapse, focus, compact cards with More (§3.2, §3.4).
4. Starters strip (§3.3).
5. Quiet rows, note icon rule (§3.4).
6. Count tabs, bell, Done, just-done; Daily layout details (§3.5, §3.6) – Inbox tab shows the *old* rule
   (Inbox items still also in Next) until stage B.
7. Week/Month one-line Given time + owner card; Engage trims (§3.9).

**Stage B – Inbox on Daily** (areas planning, review, quick-add)
1. `InboxList`, inbox count, bell; Inbox items leave Next (§3.7).
2. Inbox card, File to suggestions, filing + auto-next.
3. More… picker, Someday / Maybe, New project.
4. Review Inbox step on the same parts.
5. Navigation: `AppTab` without inbox, stored-tab mapping, links; delete `InboxScreen.tsx`.

**Stage C – Current per project + release pass** (areas current-page, settings, foundation)
1. `pageShow` domain + frontmatter (§3.8 file format).
2. ⚙ Settings page (status, area, abbreviation, scope moved; Show on this page).
3. Current layout: header, scope, Auto tabs, bottom-left buttons, count tabs on todos.
4. Release pass: screenshots, demo space check, help read-through, design-overview, CHANGELOG upgrade note,
   As built.

## 9. Decisions from review (2026-11-10)

- **O1** The central status slot keeps every message ("Saved to … · Undo"); the box's free space stays empty.
- **O2** No Undo for a newly created project folder; the status line offers `Open ›` only.
- **O3** Someday / Maybe from the Inbox: `#someday`, stays in `Inbox.txt`, leaves the Inbox list, shows in
  Review's Someday step (check and extend the step if it doesn't read the Inbox yet).
- **O4** Week/Month: the first tap shows the owner card, which carries exactly the grey subline the row lost,
  plus `Open ›`.
- **O5** Partial e-ink refresh of the box: tried; dropped and noted in As built if the host can't do it.

## 10. As built

**Performance** (tap on a row → card committed, `[GtdPara] ItemCard: tap card` from the A1 trace, Manta):

| | Daily | Current |
|---|---|---|
| Baseline (A1, before the refactor) | ~433 ms | ~512 ms |
| After A2 (selection store) | ~305 ms | ~302 ms |
| After the A7 fix (FrozenWhileHidden, device stop 1 re-check) | 77–87 ms | 84–111 ms |

The first tap after opening a page takes 192 ms (Daily) / 278 ms (Current): the card mounts once. The
target of 150 ms holds for every later tap.

**Stage A**
- A2: Current keeps ProjectDataPanel reading the selection (it owns the cards and Quick Add);
  TodosSection and MeetingsSection are memoized with stable props and each row reads its own mark, so the
  lists don't re-render on a tap (scenario 4). Daily as designed (`SelectionZone`).
- A3: focus after a kind button for the Todo text and the Meeting title only (the Note and Agreement fields
  have no ref).
- A4: the loop starter inserts `#kind/` like the thread starter.
- A6: MiniTabs' existing `trailing` slot holds the layout switch (no new `accessory` prop); `MiniTabDef`
  gets `adornment` for the bell. The day panel's list keeps its header line for the page arrows, without
  text.
- A6: Current opens on the first tab with todos while Next is empty and no tab was chosen yet: a page with
  only planned todos would otherwise open on an empty list.
- A6: on narrow screens a tab that is not chosen shows its count only when the words would overflow.
- A6: the list tabs reset when the app shell mounts (start, profile switch).
- A7: `QuickAddWidget` gets `ownerCard`; `ui/period/useOwnerCard.tsx` is shared by Week and Month. Engage:
  without the loop line, a loop's "Next here" names its next meeting; "+ Next <kind>" stays in the loop
  overview. The "Section:" line went; its scenario assertions were dropped (the section logic stays covered
  by the engage-section and page-section unit tests).
- Device stop 1: taps took ~300 ms; the trace showed Quick Add's four hidden form rows re-rendering behind
  the card → `ui/quickAdd/FrozenWhileHidden.tsx`. The kind buttons got their own 26 dp pill (`PillButton`
  at ~34 dp was clipped in row 1).
- O5: not attempted - the host offers a full e-ink refresh only (`utils/screenRefresh.ts`); the box
  redraws in place.

**Stage B**
- B3 (O3): Review's Someday step did not read the Inbox; it now lists the Inbox's Someday / Maybe todos
  last (the Inbox passed as a review item of kind `inbox`, read only in that step).
- B4: Review's Inbox step has no Files pane any more: list left, card + picker / form right. Linking a
  file from that step is not offered (link on Daily's card, or after filing). The hub count follows
  `inboxSummary` (Someday / Maybe todos wait in the Someday step; past meetings count).
- B5: Kept stores no last tab (it opens on Daily or Current), so scenario 24 has nothing to map;
  `openInbox()` sets Daily's list tab to Inbox. `MarksReturnTo` `'inbox'` became `'daily'`.
  `InboxScreen.tsx` and `DoneToggle.tsx` were deleted; `hideDoneInboxTasks` is retired like
  `hideDoneProjectTasks` (still stored, no longer read).

**Stage C**
- C2: ⚙ returns with **Close**, not `Done`: Done is also a status button in the same view. The
  abbreviation editor is its own file (`screens/item/AbbrevEditor.tsx`). While an Area is picked ⚙ shows
  its own Files pane (same roots); ItemDetail's panes unmount while ⚙ is open. The "Never · n" counts come
  from `storage/pageShowCounts.ts`.
- C3 (a principle over the design): Auto for Threads counts what the Threads tab lists - the tracked, new
  and inactive counterparts of the page's scope - not only the `## Threads` lines; otherwise a page with
  New counterparts from tags would hide them. `pageScope` moved from ThreadsTab to
  `storage/pageShowCounts.ts`.
- C3: an Area's Projects tab carries its projects and its loops; it shows when either is visible, and each
  setting hides its own section inside it (from the PR review). Auto for Loops also counts loop tags in use
  without a loop yet (the tab's "New" rows), for the same reason as Threads.
  Agreements: Never hides the "◇ Agreements n ›" link, Always shows it at 0 (opening the empty list).
  Schedule hidden: the Todos take the column; the short layout (Todos | Schedule | Google) keeps its tabs
  (§3.10).
- C3: the start tab follows the settling facts (FileBrowserPane `startKey`) until a tab is tapped, like
  the count tabs (A6). The Notebook tab's Auto means "the notebook exists"; the Notebook button under the
  Files pane still creates it.
- C3: the page's facts come through `ui/useCacheSignature.ts` (`screens/item/usePageFacts.ts`): ItemDetail
  re-renders only when the counts, the `show:` value, the scope, the Area or the week's time change, not for
  a todo edit.
- C4: scenarios 1-23 and 25-31 are scenario tests with `help:` (`__tests__/scenarios/calmer*.test.tsx`;
  30 in `givenTime` and the Week smoke test). Screenshots in `docs/user/images/` (Daily, Current, Review,
  Week, Engage) need the device and are listed for Tilman.
