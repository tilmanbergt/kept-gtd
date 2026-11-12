# Technical Design: Quick Add redesign and alpha fixes (0.26.0)

Status: **approved for implementation** (2026-11-11; open points O1–O4 accepted as proposed, §9). Requirements: project doc `claude/feature-quickadd-redesign-0.26` (claude.ai project)
(F1–F9, B1–B5, C1–C2, D1–D3, E). UI: canvas "Kept GTD Quick Add Redesign" (A5 X device pixels).

Builds on the as-built state of `feature/calmer-screens` at `04ff04f` (Calmer screens stages A–C, Writing
help, Promises kept). Same branch, same release.

## 1. Requirements (short)

- **Fixes:** link from Daily (F1), completion whenever the cursor rests after an unfinished tag (F2),
  abbreviation prefill only on Daily (F3), one origin per item instead of a linked source page (F4), no
  hours in Current's header (F5), page arrows in their own row only when needed (F6), status messages
  disappear (success 8 s, info with Undo 16 s) and replace each other (F7), Save & next selects the next
  mark (F8), todos no longer hidden under the Agreements line (F9).
- **Form:** same 174 dp box; rows 1–2 one two-line field; row 3 when/state; row 4 📎 · origin · ✕/Cancel ·
  main button. No tabs, flow chips, tag chips or M in the form (B1–B3). After + Add the new item's card
  (B4). One origin: `meeting::` or `source::` (B5).
- **Card:** one page, no More ›; Delete and Cancel meeting only here (C1, C2). Agreements: one Change form.
- **Strips:** text strip above the box with ⚡ Suggest / Clipboard (D1); date and time strips over row 2 with ±
  Adjust / ⚡ Suggest, lengths and 30′ shifts (D2); a mandatory status hides strips (D3).
- **Scope:** every screen with the box; Inbox card unchanged; capture panel keeps its layout (gets the
  date/time strips and B5); narrow screens never wrap (E).

### 1.1 Checked against the product principles (DEVELOPMENT-POLICY §2, design-philosophy.md)

- *Calm, made for e-ink:* one fixed box; strips hover, nothing below moves. Fewer elements per state than
  today (no chip rows).
- *One page, one intention:* the form is for writing, the card for acting on the item.
- *Nothing chosen for you:* suggestions are offered, never applied; the source page is no longer linked by
  default.
- *Your files, no lock-in:* one new optional field `[source:: …]`, written like `meeting::`, readable in any
  editor. Old lines unchanged.
- *Keeping your word clean:* Delete and Cancel meeting stay one deliberate step on the card, with a confirm
  for Cancel.

## 2. Current state (relevant code)

- **Box:** `ui/QuickAddWidget.tsx` (667 lines) composes `ui/quickAdd/QuickAddFrame.tsx` (`row1`, `row2`,
  `rows34`, `card`, `collapsed`; `QUICK_ADD_ROWS = {tabs 30, input 36, meta 34, extra 34, gap 6}`, box 174
  dp). R1 = `TabsRow` or `KindButtons` (collapsed); R2 = `TaskInputRow` / `MeetingInputRow` /
  `NoteInputRow` / `AgreementInputRow`; R3–R4 = `TaskMetaRows` (FlowStateChips + TagChipGrid, or "Waiting
  on") / `MeetingMetaRows` / `NoteTagRows` / `AgreementTagRows`; R4 extras: `ProvenanceLine`,
  `ThisFileLine`, `AttachmentCluster`, `EditCommands`. Buttons: `ActionRow.tsx` (`CreateActions` with
  `monthlyToggle`, `EditActions`). Drafts: `useTaskDraft`, `useMeetingDraft`, `useNoteDraft`,
  `useAgreementDraft` over `useQuickAddCore` (recent tags, abbreviations, `abbrevPrefill`).
- **Capture panel:** `ui/quickAdd/CaptureQuickAdd.tsx` uses `TabsRow`, `TaskInputRow`, `TaskMetaRows`,
  `MeetingInputRow`, `MeetingMetaRows`, `AgreementInputRow` in the frame's `free` layout.
- **Strips:** `ui/writing/WritingStrip.tsx` renders `domain/writing/stripContent.ts` (kinds fixes, read,
  choice, complete, feedback, starterList, date, time, usual, starters, clipboard, none), hovering above R2
  (`common.floatingStrip`, `bottom: '100%'`), so over R1. Logic in `ui/writing/useWritingHelp.ts`
  (completion only after a burst: `changeText` → `unfinishedTagAt` when `burst`). Dates: `ui/DateInput.tsx`
  with `DateNudgeStrip` (−1 · Today · +1 · +7, `domain/dateNudge.ts`) carrying the help's lead slot.
  Valid till: `ui/ValidTillInput.tsx` + `ValidTillStrip`. Meeting hints: `ui/writing/draftMeetingHints.ts`
  (past, overlap, usual slot).
- **Cards:** `ui/itemCard/{TodoCard,MeetingCard,AgreementCard,InboxCard,parts}.tsx`, models and pages in
  `domain/itemCard.ts` (`todoCardPage`, `meetingCardPage`, `CardPage = 'main' | 'more'`). Options from
  `useTodoCard` / `useMeetingCard` (`canLink = !!onArmLink`, `canRefile = !!onArmRefile`). Link arming only
  in `ProjectDataPanel.tsx` (Files pane).
- **Selection:** `ui/useEditTarget.ts` (`set(target, mode)`, modes `card`/`edit`/`add`), selection store.
- **Origin:** `domain/provenance.ts` (`[meeting:: <key>]`, `applyProvenance`, `resolveProvenance`),
  `ui/quickAdd/useProvenance.ts`, `ProvenanceLine`. Capture links the source page by default
  (`CaptureScreen.tsx` `linkToPage = true`, `linkedSource`).
- **Status:** `ui/status/StatusProvider.tsx` (map of entries, priority confirm > modal > error > warning >
  success > info; entries live until the publisher clears them), `StatusFrame.tsx` (one slot).
- **Lists:** `ui/PagedSection.tsx` always draws its header row (holds ‹ ›), also for `header=""`
  (DailyTodosColumn, InboxList, FilePicker, OptionTabs, TodosSection). Self-measuring via
  `ui/useMeasuredHeight.ts` (remembered per key for the session).
- **Current header:** `screens/item/ItemHeader.tsx` shows `weekTime this week`.

## 3. Design

### 3.1 The form frame

`QuickAddFrame` gets a second fixed layout, `form`, next to today's rows (which stay for the capture
panel's `free` layout only):

- `field` (rows 1–2): 30 + 6 + 36 = **72** dp; one multi-line text field; positioning context of every strip.
- `row3`: 34 dp; per kind (§3.3).
- `row4`: 34 dp; `FormFooter` (§3.4).

Box total unchanged: 1 + 10 + 72 + 6 + 34 + 6 + 34 + 10 + 1 = **174 dp**. Collapsed (`KindButtons`) and
`card` work as today. All kinds' slots stay mounted and hidden with `display: 'none'` (drafts survive, no
TextInput is recreated), as today.

**The field** (`ui/quickAdd/form/FormField.tsx`): `WritingTextInput` with `multiline`, two visible lines
(medium 17, line 22), `textAlignVertical: 'top'`, `collapsable={false}` wrapper (layoutLog rule). A todo or
meeting title is one line of the file: a newline from the keyboard or a recognition burst is turned into a
space in `onChangeText` (pure helper `oneLine(text)` in `domain/writing/insertion.ts`); Enter never submits.
Placeholders: "New todo", "New meeting", "New agreement", "New note".

The kind is no longer switchable inside the box. `TabsRow` leaves the widget (kept for CaptureQuickAdd).
`core.activeType` is set by the kind button and by the edit target, nothing else.

### 3.2 Strips: one host, three placements

New `ui/quickAdd/form/StripHost.tsx`, rendered **inside FormField's wrapper after the TextInput** (painted
on top without `zIndex`, which the box must not use). It shows at most one strip:

- **Text strip** (D1): `position: absolute`, `left: 0`, `right: 0`, `bottom: '100%'`, `marginBottom: 3`:
  above the box, full width (row 0).
- **When strip** (D2): `position: absolute`, `left: 0`, `right: 0`, `bottom: 0`, `height:
  QUICK_ADD_ROWS.input`: over the field's second line (row 2), full width.
- Nothing while `useStatusBlocking()` is true (D3, §3.9).

Which strip: the focused field decides. Row 3's date, time and valid-till fields report focus to core
(`core.whenFocus: 'date' | 'time' | 'valid' | null`); the text field's focus shows the text strip. The
date/time TextInputs keep their own `useWritingHelp` instance (`field: 'date' | 'time'`), only its rendering
moves into the host. `DateNudgeStrip` and `ValidTillStrip` are no longer used in the box (still used
elsewhere: Review's "Set due date", the capture panel until stage 2 moves it, §8).

Every strip ends in ✕ (`useStripHide`, as today: hides until the field gains focus again).

**Text strip views** (`domain/writing/stripContent.ts`): the state gets `view: 'suggest' | 'clipboard'`.
- Precedence unchanged for moments: fixes → read/choice/complete/feedback/starterList → resting view.
- Resting **suggest** (new kind `suggest`): `options` = (1) `📎 This file` when Kept was opened from a file
  and nothing is linked yet (the This-file choice, §3.7), (2) on an empty field the starters (Thread · Loop ·
  Paste, as today), (3) `#next`, `#someday` (todo only, not when already in the text), (4) recent tags not in
  the text, (5) abbreviations of recently used places. Pure `suggestOptions(input, maxWidthDp)` fills until
  the row is full (label widths via `estimatorWidth`-style char widths, as `tagChipLayout.ts` does).
- Resting **clipboard**: All · Copy · Cut · Paste (today's state 7).
- The square before ✕ switches the resting view (⚡ / clipboard icon). A selection with `start !== end`
  (`onSelectionChange`) switches to clipboard; when it collapses, back to suggest. `view` resets to suggest
  on every open of the box (`core.open` changes).

**F2 completion:** `useWritingHelp.onSelectionChange` and the change handler also start the `complete` moment
when the cursor rests right after an unfinished tag (`unfinishedTagAt(value, cursor)`) and `completions(...)`
is non-empty, for typed characters too, not only after a burst. The moment still ends at a touch elsewhere.
Before the change: device logs (`writing: …` lines) confirm the failing case (see §3.10).

**When strips** – pure `domain/writing/whenSteps.ts`:

```ts
type StepId = 'len1h' | 'lenMinus30' | 'lenPlus30' | 'shiftEarlier' | 'shiftLater' | 'day1' |
              'daysMinus1' | 'daysPlus1' | 'dateMinus1' | 'dateToday' | 'datePlus1' | 'datePlus7';
interface Step { id: StepId; label: string; enabled: boolean }
timeSteps(value: string): { info: string | null; steps: Step[] }   // from parseMeetingWhen
applyTimeStep(value: string, id: StepId): string                    // formatMeetingWhen
dateSteps(value: string, today: string): { info: string | null; steps: Step[] }  // dateNudge.ts
```

Time strip steps (Adjust view) by time value:

- empty or unreadable: none (Suggest view if a usual slot exists, else no strip).
- start only: 1 h · ‹ 30′ · 30′ › · 1 d; disabled when a shift crosses midnight.
- start–end: −30′ · +30′ · ‹ 30′ · 30′ › · 1 d; −30′ disabled at ≤ 30 min, a shift or +30′ past 24:00
  disabled.
- days: −1 d · +1 d; −1 d disabled at 1 day.

`1 h` = end = start + 60; `±30′` = end ± 30; shifts move start and end; `1 d` = `days: 1`, times cleared.
`info`: `1 h 30` / `30 min` / `15:00` / `2 days`. Date steps: today's nudges, `info` = `formatFullDate`.

The lead slot (`stripContent` kinds `date`/`time`) keeps its precedence: moment (read · Undo, choice) →
warning (short form, new `shortWarning()`: `⚠ past`, `⚠ <title ≤ 12 chars> <time>`) → `info`.

Views: `whenView: 'adjust' | 'suggest'`, chosen on focus: empty field with a usual slot (time) or usual
weekday (meeting date) → suggest; else adjust. Switch square only when the other view has content. Suggest
content: time `usual Thu 15:00–16:30` (today's usual slot); date `usual Thu → 20 Nov` (new pure
`nextUsualDate(usual, today)` in `domain/writing/meetingHints.ts`; a tap sets the date and, when the time field
is empty, the usual time, like today's usual button).

Valid till: today's presets rendered by the host at the row-2 placement with ✕; `…` behaves as today.

### 3.3 Row 3 per kind (`ui/quickAdd/form/Row3*.tsx`)

- **Todo:** left `📅` square (32) → on tap the due `DateInput` (without its own strip) takes its place and
  gets focus; once a date is set it shows `📅 Thu 13.11.` (`formatDayShort`) and stays. Right `w/f` (32 high
  text button, filled when on); on tap "Waiting on" (`ClipboardTextInput`, 170 dp) appears to its left and
  gets focus; w/f off hides it and clears `waitingOn`. Flow state otherwise untouched by the form (an edited
  todo keeps its flow; `#next` written in the text works as today).
- **Meeting:** date field (starts at today, as today), time field (190 dp), the warning sign (plain
  triangle icon, `role="img"`, shown while `draftMeetingHints` has a warning), spacer, `F` square (focus
  block, from today's chips/toggle). M moves to the card (create: never; edit: card only).
- **Agreement:** valid-till field (today's `ValidTillInput` without its strip).
- **Note:** folder chip (`📁 <root-relative folder>`, tap = today's folder arming) and the setup name in grey
  (today's place feedback `placeFeedback(...)` text without ✓).

### 3.4 Row 4: `FormFooter`

`[clip slot] [origin line] … [✕ | Cancel] [main button]`, all 32 dp high.
- **Clip slot** (todo, meeting): none linked → 📎 square (`onArmLink` of the screen; hidden where the screen
  can't link, §3.6); linked → chip `📎 name ✕` (✕ unlinks, as `AttachmentCluster` does). Agreement and note:
  none.
- **Origin line:** `ProvenanceLine` with one part (meeting or source, §3.7), grey, ✕ drops it for this item;
  in agreement Change mode "↳ replaces the agreement of 14.10." (as today, no ✕).
- **✕** (create): folds the box, keeps the draft (today's `onCollapse`). **Cancel** (edit): today's.
- **Main button:** `CreateActions` without `monthlyToggle` (label rules as today: "+ Add", "+ Add to
  <place>", note "+ Create"); `EditActions` (Save / "Save to <place>").
- Shrinking (E): the main button and ✕/Cancel `flexShrink: 0`; origin line, then file name shrink
  (`numberOfLines={1}`, ellipsis).

`EditCommands` (delete, New from this, refile, M, unlink in the edit form) are removed from the form; a
loop's own edit (no card) keeps today's `EditCommands` path unchanged.

### 3.5 After + Add: the new item's card (B4)

- Add handlers resolve the written entry: `onAddTask` / `onAddMeeting` / `onAddAgreement` change from
  `Promise<void>` to `Promise<AddedRef | null>` (`{kind, path, key}`; `key` = the same `taskKey`/`meetingKey`
  the screen's lists use, built from the line just written). Storage already returns the new file content
  (`addTaskToDestination` → write-through); the key is computed there (`storage/createItem.ts`,
  `storage/itemMutations.ts`).
- `QuickAddWidget` gets `onAdded?(ref)`. The screen looks the entry up in its cached aggregate; found →
  `edit.set(target, 'card')`; not on this screen (filed elsewhere, e.g. `#AT` on a thread overview) → the box
  folds and the status says "Added to Atruvia" as today.
- The card's `+ Todo` / `+ Meeting` (R1, a 36 px text button): opens the form of that kind for the same
  place. On Daily the draft starts with the card owner's abbreviation tag (`abbrevPrefill`), elsewhere empty
  (the screen's fixed destination already is that place). **F3:** `abbrevPrefill` is applied only when the
  widget has `prefillAbbrev` (Daily passes it); after a plain + Add elsewhere the next draft starts empty.

### 3.6 Cards (C1, C2)

`domain/itemCard.ts`: `CardPage` and `todoCardPage`/`meetingCardPage` go; one layout per kind:
- `todoCardLayout(model)` → `{row3: ['next','waiting','someday','maybe'], origin, row4: ['done','note',
  'file','refile','delete']}` (`file` = linked chip or link square or nothing, `refile` only with
  `canRefile`, `delete` only when not deleted).
- `meetingCardLayout(model)` → `{row3: [checkpoint?, 'monthly', 'focus', reflect?], thread, row4: ['note',
  'file', 'refile', 'newFromThis', cancel?]}`; `cancel` only in phase `before`/`today` before its start,
  with `useStatusConfirm` ("Cancel Sparring Jordan on Thu?").
- `agreementCard`: R3 `valid till …` · Change · End; R4 origin › · 🗑 (delete asks once). Edit mode of
  `useAgreementDraft` is removed: a tap on the words and Change both open the Change form (new version,
  old one ends, as Change does today).
- R1: `<Kind> · <owner ›> · <status>`; the owner name is a link (`onOpenOwner`), `+ Todo`/`+ Meeting`, ✕.
- Flow buttons: tapping the filled one sets the flow to none (`card.onFlow(null)`).

**Linking from a card (F1):**
- Current: as today (Files pane arming).
- Daily: new `screens/daily/LinkPicker.tsx` replaces the list area like `FilePicker` (card stays, "‹ Back to
  the card"), showing `FileBrowserPane` with the Projects/Areas/Resources/Inbox roots and the This-file rows;
  a pick links (`toLinkedFile`, `relativize`) and returns to the card.
- Week, Month, thread and loop overviews, Review: no Files pane → no link square there in 0.26.0 (a linked
  file still shows and opens). Noted in help.

### 3.7 One origin (B5, F4)

`domain/provenance.ts` gets a second field, same rules as `meeting::` (no `#`, `[`, `]`; trailing field;
Obsidian-safe):

```
- [ ] Angebot schicken [created:: 2026-11-11] [source:: Projects/Atruvia/Notes/Angebot Struktur]
```

- Value: the note's path below the Note root, without extension. `applySource(line, path)`,
  `sourceOf(task|meeting)`, `resolveSource(path, cache)` → `{kind: 'todo', entry}` when a todo's `notePath`
  is that note (shown with the todo's title), else `{kind: 'file', name}`. A line never gets both fields:
  `applyProvenance` and `applySource` replace each other.
- **Which one:** the page's meeting when the launch/lasso page belongs to a meeting (today's
  `sourceMeeting` / engage-in-context logic) → `meeting::`; else the launch file → `source::`; no launch
  file → nothing.
- **Quick Add** opened from a note: the origin goes into row 4's grey line (✕ drops it). The This-file
  choice (`ThisFileLine`) is replaced by the text strip's `📎 This file` suggestion (links the file, with the
  page for a document as L4 decided, without for a note).
- **Capture:** `linkToPage` and its checkbox go; `linkedSource` is no longer set; the origin line shows as in
  Quick Add. Existing items with a linked source page stay as they are (no migration).
- **Card:** `CardDetail` `origin` gets a `source` variant; "↳ Angebot schicken ›" opens that todo's card
  (Daily/Current) or the file ("↳ Angebot Struktur ›" → `openLinkedFile`).

### 3.8 Alpha fixes outside the box

- **F5** `ItemHeader.tsx`: the `weekTime` text and its prop go (WeekView/GivenTimePanel unchanged).
- **F6** `PagedSection`: `header=""` (or `header={null}`) draws **no** header row. Arrows render in an own
  row (`PageNavRow`, ~30 dp: `‹  2 / 3  ›`, right-aligned) **only when there is more than one page**. No
  oscillation: pages are computed for the full viewport first; if > 1, the row is reserved and the pages
  computed again for the smaller height (still > 1, so the row stays). The memo keys of
  `useMeasuredHeight` measure the viewport *without* the nav row. Callers with a real header keep today's
  header row with arrows.
- **F7** `StatusProvider`: `show()` of a `success` or plain `info` message removes other `success`/`info`
  entries (the newest replaces them) and starts a timer: 8 s (success, info without actions), 16 s (info or
  success with actions, e.g. Undo). Expiry calls the message's `onDismiss` (so the owner clears its state)
  and removes it; no countdown shown. The next user action ends them earlier: `useQuickAddCore`'s
  `clearTransientMessages` already does it for Quick Add; screens that publish "Filed … · Undo" clear on the
  next selection. Errors, warnings, confirms, modals: unchanged (stay until answered).
- **D3** `useStatusBlocking()` (new hook in StatusProvider's list context): true while an entry of kind
  `confirm`, `modal` or `error` exists → StripHost renders nothing.
- **F8** CaptureScreen Save & next: first a diagnostic (logs `capture next from=<id> to=<id>
  selected=<bool>` before and after `selectMark`, and on the next render whether `selectedMark` resolved);
  device check: after Save & next, swipe the top menu down once – if the selection then shows, it's the
  redraw. Candidate fixes: (a) redraw → `requestEinkRefresh()` in an effect on `selectedKey` (after the
  commit) instead of inside `selectMark`; (b) the cache reload drops `next` from `ordered` before
  `afterMarkGone` → pick the next by position after the reload. Implemented per the logs.
- **F9** Current todos under the Agreements line: diagnostic first (log viewport height vs. the sum of
  `taskRowHeight(…, 'quiet')` of the page's rows vs. the rows' real `onLayout` heights). Candidate causes:
  quiet rows estimated too short (meta text narrows the title), or the viewport not clipping. Fix: the
  estimator for `quiet` takes the meta width into account; the viewport gets `overflow: 'hidden'` so an
  estimate error can cut a row but never cover the footer.

### 3.9 Narrow screens (E)

The box keeps 174 dp everywhere; no row wraps. Row 4: main button and ✕/Cancel keep their width; origin
line, then file chip shrink with ellipsis. Row 3 (meeting): time field 150 dp below 800 dp. When strip below
800 dp: shift labels `‹` and `›`, lengths `1h`, `+30`, `−30`. Card R3/R4: flow buttons 32 dp minimum padding
8; origin text shrinks first. Checked with Simulate screen (Nomad).

### 3.10 Logging

`[GtdPara]`, counts and kinds only, no titles or tags: `quickadd open kind=todo`, `quickadd added kind=todo
card=shown|elsewhere`, `strip view=suggest|clipboard|adjust|when-suggest field=text|date|time|valid`,
`strip step id=lenPlus30`, `writing: complete at=rest|burst n=…`, `card link from=daily|current`,
`origin set=meeting|source|none`, `status expire kind=success`, `paged nav rows pages=…`, F8/F9 diagnostics
as above.

## 4. Edge cases

- A draft typed before the update with a newline (multi-line paste): turned into spaces on the first change.
- Edit of a todo that has both `meeting::` and a linked source page (older capture): shown as is; nothing
  rewritten.
- `+ Add to <place>` for a place not shown on this screen: no card, status "Added to …" (§3.5).
- A when-strip step on an unreadable value: the strip shows no steps (only the lead slot, e.g. "choose").
- Overlap warning while the time field isn't focused: only the row-3 sign shows; focusing the time field
  shows the text.
- Focus moving from text field to date field: the text strip hides, the when strip shows; never both.
- An error appears while a strip shows: the strip hides (D3) and comes back with the next focus.
- Programmatic focus after `+ Todo` (stage A risk, unchanged).
- A `source::` note that was renamed or moved: unresolved → "↳ <stored name>" without ›.
- Agreement Change with unchanged words: Save is disabled (no empty new version).

## 5. Files

New: `ui/quickAdd/form/{FormField,StripHost,Row3Todo,Row3Meeting,Row3Agreement,Row3Note,FormFooter}.tsx`,
`domain/writing/whenSteps.ts`, `screens/daily/LinkPicker.tsx`, `ui/PageNavRow.tsx`.

Changed: `ui/QuickAddWidget.tsx` (split further where it passes 1,000 lines), `ui/quickAdd/QuickAddFrame.tsx`
(`form` layout), `useQuickAddCore.ts` (`whenFocus`, strip view, `prefillAbbrev`), `useTaskDraft.ts`,
`useMeetingDraft.ts`, `useAgreementDraft.ts` (edit mode removed), `useNoteDraft.ts`, `ActionRow.tsx`,
`ProvenanceLine.tsx`, `types.ts`; `domain/writing/{stripContent,insertion,meetingHints}.ts`,
`ui/writing/{WritingStrip,useWritingHelp,WritingTextInput}.tsx`; `domain/itemCard.ts`,
`ui/itemCard/{TodoCard,MeetingCard,AgreementCard,parts,useTodoCard,useMeetingCard,useAgreementCard}.ts(x)`;
`domain/provenance.ts`, `ui/quickAdd/useProvenance.ts`, `screens/CaptureScreen.tsx`;
`ui/status/{StatusProvider,types}.ts(x)`; `ui/PagedSection.tsx`; `ui/TaskRow.tsx`/`ui/taskRowLayout.ts`
(F9); `screens/item/ItemHeader.tsx`; add-handler return types in `storage/createItem.ts`,
`storage/itemMutations.ts` and the screens passing `onAdd*` (`screens/daily/SelectionZone.tsx`,
`ProjectDataPanel.tsx`, `WeekView.tsx`, `MonthView.tsx`, thread/loop overviews, `InboxStep.tsx`, Engage).

Deleted when unused: `ui/quickAdd/ThisFileLine.tsx`, `ui/quickAdd/TabsRow.tsx` stays (capture),
`FlowStateChips` stays (capture), `EditCommands` stays only for a loop's own edit.

Feature areas: `quick-add` (form, strips, cards, origin), `planning` (Daily link picker, paged nav),
`current-page` (header, F9), `foundation` (status timers), `lasso` (F8, origin), `meetings` (time strip, meeting card), `agreements` (Change only).

Docs: `docs/user/quick-add.md` (form, strips, card, origin), `daily.md` (link from the card),
`projects-and-areas.md` (header), `meetings.md` (time strip, card), `agreements.md` (Change only),
`lasso.md` (origin instead of page link), screenshots; `docs/dev/design-device-rendering.md`
§5.4 (form slots, strip placements), `design-overview.md` §2; `claims.md` (no promise of "link to page");
CHANGELOG `[Unreleased]` Changed; **Upgrade note:** "Todos and meetings can carry a `[source:: …]` field; older
versions keep it untouched."

## 6. Test scenarios (Given / When / Then)

Form
1. Given Daily, when `+ Todo` is tapped, then the box shows a two-line field, 📅 and w/f in row 3, 📎 · ✕ · + Add
   in row 4, and has the same height as before.
2. Given the todo form, when "Angebot an Lena #AT" is written, then the main button reads "+ Add to Atruvia".
3. Given the todo form, when 📅 is tapped and "13.11" written, then the date strip shows over row 2 with
   "read as Thu 13 Nov 2026 · Undo" and the field's first line is still visible.
4. Given the todo form, when w/f is tapped, then "Waiting on" opens left of w/f; when w/f is tapped again, it
   closes and the waiting name is cleared.
5. Given a newline in the recognized text, then the field holds one line with a space.

Strips
6. Given an empty todo field, then the text strip above the box offers Thread · Loop · #next · #someday · recent
   tags and the clipboard square.
7. Given text with a selection, then the strip shows All · Copy · Cut · Paste; when the selection ends, the
   suggestions return.
8. Given "Call #dai" typed letter by letter with the cursor after it, then the strip offers "→ #daily" (F2).
9. Given a meeting time "15:00", then the time strip shows `15:00 · 1 h · ‹ 30′ · 30′ › · 1 d`; when 1 h is
   tapped, the field reads 15:00–16:00.
10. Given "15:00–16:30", when +30′ is tapped, then 15:00–17:00; when 30′ › is tapped, then 15:30–17:30.
11. Given "15:00–15:30", then −30′ is greyed.
12. Given "2 days", then the strip shows `2 days · −1 d · +1 d`; given "1 day", −1 d is greyed.
13. Given a thread with usual Thu 15:00–16:30 and an empty time field, when the time field gets focus, then the
    strip shows the usual slot and the ± square.
14. Given a meeting overlapping Team JF at 15:00, then row 3 shows the warning sign and the time strip's left
    slot reads "⚠ Team JF 15:00".
15. Given an error in the status slot, when the text field gets focus, then no strip shows.

After Add, cards
16. Given Daily, when a todo "Angebot #AT" is added, then the box shows its card with `Todo · Atruvia › · open`
    and `+ Todo`; when `+ Todo` is tapped, the new draft starts with "#AT ".
17. Given Current of Atruvia, when a todo is added and `+ Todo` tapped, then the draft is empty (F3).
18. Given a todo card, then Next · w/f · Someday · Maybe and Done · Note › · 📎 · ↪ · 🗑 are all visible without
    More.
19. Given a todo card on Daily, when 📎 is tapped, then a file browser replaces the list; when a file is picked,
    the card shows its name (F1).
20. Given a meeting card ahead, when ⊘ is tapped and confirmed, then the meeting is cancelled.
21. Given an agreement card, when the words are tapped, then the Change form opens; Save makes a new version and
    ends the old one.

Origin
22. Given a lasso on a page of a meeting's note, when a todo is saved, then the line has `[meeting:: …]`, no
    `source::`, no linked file.
23. Given a lasso on a plain note, when a todo is saved, then the line has `[source:: <path>]` and no linked file;
    its card shows "↳ <note name> ›".
24. Given Quick Add opened from a todo's note, when a todo is added, then its card shows "↳ <that todo> ›".
25. Given the origin line, when its ✕ is tapped, then the todo is saved without origin.

Fixes
26. Given Current's header, then no "this week" text (F5).
27. Given Daily with 4 Next todos (one page), then there is no row between the tab row and the first todo; given
    40, the nav row shows below the list (F6).
28. Given "Saved …", then it is gone after 8 s; given "Filed … · Undo", after 16 s; given a second success, it
    replaces the first (F7).
29. Given Daily → Inbox → marks with 3 open marks, when Save & next is tapped on the first, then the second is
    selected and shown (F8).
30. Given a project with Agreements and enough todos for two pages, then the last row of page 1 is fully
    visible above the Agreements line (F9).

## 7. Test plan

Unit: `whenSteps` (every table row, midnight, minimums), `stripContent` (suggest/clipboard views, when
views, precedence), `suggestOptions` (width filling, no duplicates), `insertion.oneLine`, `provenance`
(source apply/resolve/replace), `itemCard` layouts, `shortWarning`, `nextUsualDate`, StatusProvider timers
(fake timers), PagedSection nav-row paging (no oscillation). Scenario tests for §6
(`__tests__/scenarios/quickadd-redesign*.test.tsx`, each with `help:` references). Smoke scenarios that
type into Quick Add are updated to the new field.

Device checklist (per stop):
- 1: F2 completion typed and handwritten; F3; F5; F6 on Daily/Current/Inbox; F7 timings; F8 with the swipe
  check; F9 on a project with agreements.
- 2: form for all four kinds; two-line field with handwriting; text strip above the box (Daily over the
  status slot, Current over the name line); date/time strips over row 2; every step button; usual slot;
  warning sign; Nomad simulation.
- 3: cards (todo, meeting, agreement); + Add → card → + Todo; link from Daily; Cancel meeting confirm;
  origin from lasso and from a note launch; capture panel without "Link to page".

## 8. Implementation plan: three device stops

Each stop ends with `npm run check` (full), a push, and a device stop (Tilman installs the CI build of the
last push). Steps inside run `npm run check:affected -- --area <areas>`. Help and CHANGELOG change in the
same step as the behaviour.

**Stop 1 – Fixes and strip logic** (foundation, planning, current-page, lasso, quick-add)
1. F5 header; F6 PagedSection nav row; F7 status timers + replacement; D3 `useStatusBlocking`.
2. F2 diagnostics + completion at rest; F3 `prefillAbbrev` (Daily only).
3. F8 and F9 diagnostics, then fixes after the device logs (may move into stop 2 if the logs need the device).
4. `domain/writing/whenSteps.ts`, `shortWarning`, `nextUsualDate` + unit tests (no UI yet).

**Stop 2 – The form** (quick-add)
1. `QuickAddFrame` `form` layout, `FormField` (multi-line, one-line rule), `FormFooter`, Row 3 for todo and
   meeting; TabsRow, chips and M leave the box.
2. `StripHost`: text strip above the box with suggest/clipboard views; when strips over row 2 with
   adjust/suggest views and ✕; valid till moved.
3. Row 3 for agreement and note; capture panel switches to the new when strips.

**Stop 3 – Cards and origin** (quick-add, planning, lasso, meetings, agreements)
1. `itemCard` one-page layouts; Todo, Meeting, Agreement cards; Delete/Cancel meeting only there;
   Agreement edit → Change.
2. Add handlers return `AddedRef`; + Add → card; `+ Todo`/`+ Meeting` on the card.
3. Daily `LinkPicker` (F1).
4. `source::` origin (provenance, Quick Add, capture without "Link to page", card display).
5. Release pass: help pages, screenshots, design-device-rendering §5.4, design-overview, CHANGELOG with
   upgrade note, As built.

## 9. Open points (decided)

- **O1** A new item filed to a place this screen doesn't list: no card, status line only (§3.5). Accepted.
- **O2** Linking from Week, Month, thread/loop overviews and Review stays unavailable in 0.26.0 (§3.6).
  Accepted.
- **O3** `source::` stores the note's path below the Note root without extension (§3.7). A note moved later
  loses the link to its origin (shown without ›). Accepted.
- **O4** Field name `source` (English, like `meeting`, `created`). Accepted.

## 10. As built

Stop 1 (fixes and strip logic):

- **F7:** app-wide info notices (`scope: 'global'`: What's new, update available, downloading) are
  neither timed nor replaced: their `onDismiss` acknowledges or postpones them, and expiring them
  silently would answer for the user. Every other success and info is timed and replaced.
  Timers `unref()` under Node so a pending expiry never keeps a test worker alive.
- **F6:** the page count (`‹ 1 / 2 ›`) walks every row (`ui/pagination.ts` `pageCount`), only for
  header-less lists. An arrow that can't act leaves its place empty, so the count doesn't move.
- **F2:** a flagged fix still takes precedence over the completion offered for the same tag after a
  burst (the fix offers the same tag); the completion at rest starts on typed characters and on a
  touch that puts the cursor after an unfinished tag.
- **F8:** root cause not reproducible off-device; fixed the two gaps the code shows (the effect that
  could not re-run when a selected key did not resolve; the next mark taken from the list before the
  reload; the refresh before the commit) and kept the `capture next …` logs.
- **F9:** the quiet-row estimate already took the grey note's width into account and the viewport
  already clipped; the gap found is the group heading drawn taller than counted (30 dp). Fixed by
  drawing it in a 30 dp box; `page fill …` and `current todos header …` logs kept.
- **whenSteps:** the step labels of the date strip stay today's ASCII `-1 · Today · +1 · +7`.

Stop 2 (the form):

- **Every box folds:** with no kind tabs, a box that was never collapsible (thread and loop overviews,
  Review steps, Engage) would have no way to another kind. Every box's ✕ now folds to the kind
  buttons; a `collapsible` box starts folded and folds after an add, the others start on Todo.
- **Typed flow tags:** `composeTaskText` rewrote flow tags from the (now absent) chips and so dropped
  a typed `#next` / `#someday`. The form composes with `keepTypedFlow`: with no flow state chosen the
  text keeps them; `loopItselfOfLine` treats a written `#someday` / `#maybe` as a loop idea.
- **📎 This file:** moved into stop 2 with the form (row 4 has no room for the old line); it starts
  off for documents too (principle: nothing chosen for you). `ThisFileLine.tsx` and `NoteRows.tsx`
  are deleted; the old rows (`TaskRows`, `MeetingRows`, `AgreementRows`) remain for the capture
  panel only.
- **Due date:** once opened, the due field stays a field (no `📅 Thu 13.11.` label): the field must
  stay mounted to keep its focus and strip.
- **Note row 3:** shows the folder below the Note root in grey; no setup name (a standalone note has
  no Note setup) and no tap (the Files pane already chooses the folder).
- **When strip views:** the switch square shows only when the other view has content, so an empty
  time field with a usual slot shows the slot without ± (scenario 13 adjusted).
- **Capture panel:** its time field gets the new time strip (hovering above the field); its date
  fields keep `DateNudgeStrip`, whose buttons are the date strip's Adjust view.
- **D3:** each strip reads `useStatusBlocking` itself, so a status change re-renders the strips and
  not the memoized widget (the Current page's render budget).
- **Suggest width:** the field's measured width is kept in a ref (and for the session), not state,
  for the same render budget.
