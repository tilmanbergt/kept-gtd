# Technical Design: Writing help - the Quick Add strip for handwriting, tags, dates and times (0.27.0)

Status: **approved for implementation** - requirements agreed in chat; UI drawn on the canvas "Kept Quick Add —
handwriting strip" (boards A1-A5, B1-B4, C1-C4, real size).

## 1. Requirements as decided

Trigger: a meeting written `#DaiIy` (capital I for l) and a thread written `#1o1/ Mieke` (letter o, space
after the slash) matched no Note setup and silently went to the home notebook. Handwriting recognition
makes these mistakes; Kept should catch them at the moment they are written, cheaply.

### 1.1 Principles

1. **Check when recognition writes, not per keystroke.** Recognition puts a whole word or sentence into the
   field after the user pauses. A change that inserts more than one character at once is a *burst*
   (recognition or Paste); only the burst's text is checked. Typed text is checked when a space or
   punctuation ends a tag, or on blur. Every check is a map lookup or a short loop - well below 1 ms.
2. **Tags: suggest, never change without a tap.** Exceptions, applied silently before any check: a space
   right after `#` (already done today, `stripSpaceAfterHash`) and a space right after a `/` inside a tag
   (`#1o1/ Mieke` -> `#1o1/Mieke`). A full-width `＃` counts as `#`.
3. **Case is never corrected.** Tags are compared lowercased. A tag whose lowercase form is known is never
   questioned, however it is capitalised.
4. **Dates and times: read directly when there is exactly one valid reading**, show "read as …" with Undo;
   two readings -> a choice; none -> today's error.
5. **The strip shows one thing at a time and falls back to the clipboard buttons on the next touch.**

### 1.2 Tag rules (domain, pure)

- **Rule A - handwriting skeleton.** Lowercase, then fold look-alikes to one character:
  `l I i 1 | !` -> `1`, `o 0` -> `0` (O is already lowercased), `s 5` -> `5`, `z 2` -> `2`, `g q 9` -> `9`,
  `b 6` -> `6`, `B 8` -> `8` (B before lowercasing), `rn` -> `m`, `cl` -> `d`, `vv` -> `w`,
  `ä ö ü` -> `a o u`, `ß` -> `ss`. Two tags with the same skeleton match.
- **Rule B - one step off** (only when A finds nothing, tags of at least 4 characters): one character added,
  missing, changed, or two neighbours swapped.
- **Rule P - plural endings:** a known tag plus `s`, `e`, `n`, `en`, `er`, or the reverse.
- **Subtags** are checked per part: the parent against known tags, the part after `/` against the known
  subtags of that parent (counterparts). `#1o1/Mieke` -> `#101/Mieke`.
- **Never flagged:** a known tag; flow-state and reserved tags (`#next`, `#wf/…`, …); tags with `:`
  (`#due:…`); a tag the user kept in this draft.
- **Known tags** (the index): every tag in the cache (todos and meetings of all items, Inbox included),
  Note setup tags, Project/Area abbreviations (active or on hold), counterparts per thread type, context
  tags, reserved tags, recent tags (`tagUsage`).
- **Ranking** when several known tags match: Note setup tags, abbreviations, counterparts, recent tags,
  then the rest alphabetically. At most one suggestion per flagged tag.

### 1.3 Completion

- When the cursor sits right after an unfinished tag (`#spa`, `#101/`), the strip offers up to 3 known
  tags that start with it (lowercase prefix, or skeleton prefix), excluding the text itself. After `type/`
  the counterparts of that type, most recent first. Abbreviations show the Project/Area name in grey.
- Tap: replaces the unfinished tag, adds a space, cursor after it.

### 1.4 Corrections in the strip

- Flagged tags are **not** marked in the field's text (decided: not needed; §3.7). The strip shows
  **only the target**: `→ #daily`. Up to **two** flagged tags, in text order; any
  further ones are ignored. Then **Keep** (keeps every still-flagged tag) and **Edit ›**.
- Tap `→ #x`: replaces that tag; the pair is **learned** (§1.5); when all are answered the strip shows
  feedback (§1.7).
- On + Add with an unanswered flagged tag: the strip shows it again and the status slot says
  "Check #daiiy, or Add again to keep it". A second + Add saves as written.

### 1.5 Learned corrections

- After the user has corrected `#daiiy` -> `#daily` once, the next `#daiiy` is replaced directly and the
  strip shows "read as #daily · Undo". Undo puts the written tag back **and forgets the pair**.
- Per profile (profile-scoped storage, like recent tags). Settings → Input lists them, each with a remove button.

### 1.6 Dates and times

- **Folding** in date and time fields only: `O o` -> `0`, `l I i |` -> `1`, `S s` -> `5`, `Z z` -> `2`,
  `B` -> `8`, `g q` -> `9`, `b` -> `6`; `,` `;` `'` and a space between digits are separators; `–` and
  `bis` mean a range.
- **Times:** `15,30`, `15 30`, `1530` -> 15:30; `930` -> 09:30; `15h` -> 15:00. Hours **1-6 without
  minutes** (`3`, `3-4`) offer a choice: afternoon first (15:00-16:00), then as written (03:00-04:00).
  `15,3` offers 15:30 and 15:03 (C3).
- **Dates:** `9.11.2026`, `09.11.26`, `9.11.`, `9.11` (next 9 November), `2026 11 09`, `2026.11.09`,
  `20261109`. If only one order of day and month is valid, that one is read (`11.13` -> 13 Nov).
- **Confirmation, always:** the date strip leads with the full date and weekday, "Tue 10 Nov 2026" (C4),
  then −1 · Today · +1 · +7. After a fix: "read as Mon 9 Nov 2026 · Undo" in place of the buttons until
  the next touch (C1). The meeting time field gets a strip too: "15:30 – 16:00 · 30 min" (C2).
- **Warnings** in that confirmation: a new meeting in the past ("past"), an overlap with another meeting
  that day ("overlaps Jour Fixe 15:00").
- **Usual time (meetings only):** when the meeting's tags name a thread or loop with earlier meetings, tapping the
  empty date or time field offers its usual slot as one more button, e.g. "Tue 17 Nov 14:00 · 45 min":
  the weekday + start time most common among its last 5 meetings (at least 2 the same), else the last
  meeting's slot; length likewise; the date is the next such weekday from today. One tap fills date,
  time and end.

### 1.7 Feedback

- After a correction, and after a burst whose tags are all known: "✓ Daily · Meetings/Daily.note" - the
  Note setup and notebook the item's page will use (A5, B4). A new tag with nothing close: "New tag
  #offsite27 · Atruvia 2026.note" (B3), no question.

### 1.8 Scope

- Quick Add: todo text, meeting title, note title, agreement text, the date fields, the meeting time
  field; and the lasso capture confirm screen (its recognised text is checked on open). Edit forms,
  rename and Waiting on come later.
- **Tag check in the Integrity Check:** tags that Rule A/B/P would flag (one step from a known tag) and
  that are used only once are listed in the report, with the suggestion. The new Settings area **Input**
  lists them too, each with → (rewrites that todo or meeting line) and Keep (§3.9).
- No feature switch: the help only suggests, and Edit › and ✕ are always one tap away.

### 1.9 Checked against the product principles (DEVELOPMENT-POLICY §2, design-philosophy.md)

| Principle | How this design keeps it |
|---|---|
| **Nothing suggested unasked; only from what you already chose** | Suggestions appear only right after you finished writing (a burst, or a tag ended by a space) or when you tap an empty date/time field, and only from your own tags, abbreviations, counterparts and meetings. No suggestion appears while you are writing, none on a timer, none outside the field you are in. |
| **Nothing is chosen for you; every entry is a conscious choice** (philosophy §3) | Kept never adds or saves anything: the usual slot fills fields of an item you are entering, + Add stays yours, and the Add-twice rule only asks once more. Tags change only on a tap. |
| **Editing vs. redeciding** (philosophy §2) | The direct readings (dates/times with exactly one valid reading, learned tag fixes) are *editing* - correcting what you meant to write - so they stay frictionless, but always visible ("read as …") and undoable in one tap. Nothing here touches status, focus, next or due as a decision. |
| **Calm and made for e-ink; spaciousness** (philosophy §4) | No new permanent row, no badge, no counter: the strip already exists, shows one thing at a time, and returns to its resting state on the next touch - never by a timer. Redraws happen only right after recognition, when the screen redraws anyway. The "Goes to" line drawn on the canvas (A3) is **not** built: the strip's feedback says the same without adding a row. |
| **Your files, no lock-in; the files are the interface** (philosophy §7) | Learned corrections and kept tags are plugin-internal UI memory (like recent tags), never content. Kept changes a data file only when you tap → on one listed line in Settings → Input, which shows that line and its Project/Area first. The Integrity Check only reports. |
| **Built on Supernote features; embodied interaction** (philosophy §8) | It works with the Supernote's own handwriting recognition and makes the pen path reliable - no own recognition, no keyboard-first flow. |
| **One page, one intention** (philosophy §9) | The strip's intention is "get what you wrote right". Settings → Input has one intention: how text gets into Kept. |
| **Keeping your word clean** | The warnings (past, overlap) make a commitment's conflict visible at the moment it is made; they do not block or reschedule. |

Implementation must keep every row of this table true; a point that cannot be built this way is
recorded in As built, not quietly changed.

## 2. Current state (relevant code)

- `domain/markdown.ts`: `TAG_RE` (tags start `[a-z0-9]`, nested `/`, optional `:value`),
  `stripSpaceAfterHash` wired into every Quick Add `onChangeText` (`useTaskDraft`, `useMeetingDraft`, …).
- `ui/ClipboardStrip.tsx` + `domain/clipboardText.ts`: the strip, always mounted (`display: none` when
  hidden, because blur fires on touch-down), `spliceAtSelection`, selection kept in a ref.
- `ui/DateInput.tsx`: the date field and `DateNudgeStrip` (−1 · Today · +1 · +7), same mechanics.
- `domain/meetingTime.ts`: `parseFlexibleTime`, `parseMeetingWhen` (accepts `.` and `:`), errors.
- `domain/dateNudge.ts`: `isValidIsoDate`, `addDaysToIso`.
- `storage/tagUsage.ts`: recent tags, profile-scoped key; `useQuickAddCore` exposes `recentTags`,
  `abbrevItems`, `recognizedAbbrevTags`.
- `domain/noteSetups.ts`: `matchingSetups`, `tagMatchesSetupTag`; `storage/noteTargets.ts`:
  `placeNoteCandidates` (which file a page goes to).
- `domain/threads.ts` (`threadOf`), `domain/counterparts.ts`, `domain/nextMeeting.ts`
  (`nextMeetingSeed`: interval-based next meeting, reused for "Next" elsewhere).
- `domain/integrityCheck.ts`: `WHOLE_RUN_CHECKS` over `ScannedItemSummary` (no tags today), report file.

## 3. Design

### 3.1 Pure modules (`src/domain/writing/`)

All pure, each with unit tests; no React Native.

| File | Exports |
|---|---|
| `tagSkeleton.ts` | `tagSkeleton(tag)`, `oneStepOff(a, b)`, `pluralMatch(a, b)` |
| `knownTags.ts` | `buildKnownTagIndex(sources)` -> `{has(tag), lookup(tag): string[], complete(prefix, limit)}`; `KnownTagSources` |
| `tagCheck.ts` | `checkTags(text, span, index, kept, learned)` -> `TagFinding[]` (`{start, end, written, suggestion, kind: 'fix' \| 'learned' \| 'new'}`); `normalizeTagSpacing(text)` (space after `#` and after `/` in a tag, `＃`) |
| `insertion.ts` | `insertedSpan(prev, next)` -> `{start, end} \| null` (common prefix/suffix), `isBurst(span)` (length > 1), `tagsEndedBy(next, span)` |
| `completion.ts` | `unfinishedTagAt(text, cursor)`, `completions(token, index, limit)` |
| `readDateTime.ts` | `foldDigits(text)`, `readDate(text, today)` / `readTime(text)` -> `{kind: 'ok', value} \| {kind: 'read', value} \| {kind: 'choice', values} \| {kind: 'none'}` - wraps `parseMeetingWhen`, never replaces it |
| (no new file) | the "Mon 9 Nov 2026" label is one more formatter in `domain/dateFormat.ts` (`formatFullDate`), next to `formatWeekdayDate` - one place for date formats |
| `meetingHints.ts` | `usualSlot(meetings, today)`, `overlapOf(slot, dayMeetings)`, `isPastNew(date, time, now)` |
| `stripContent.ts` | `stripContent(state)` -> the one thing the strip shows (§3.3) |
| `tagTypos.ts` | `tagTypos(usage, index)` - the Integrity Check / Settings list |

The index is built from what the cache already holds; building it walks every tag once (a few thousand
at most) and is memoised on the cache object and the settings object, so it is rebuilt only when either
changes. `lookup` is a `Map<skeleton, tag[]>` read; Rule B/P walk the index's tag list only when A misses,
and only for the one or two tags in a burst.

### 3.2 Storage

- `storage/learnedTagFixes.ts`: `{from, to}` pairs under `profileScopedKey(STORE_KEYS.tagFixes)`
  (`kept:tagFixes`), capped at 200, most recent first; `learnFix`, `forgetFix`, `getLearnedFixesSync`.
  Added to `domain/storeKeys.ts` and to Remove Kept's data. Like recent tags it is not part of a profile file.
- Nothing is written to the user's files except by a tap in the Settings tag list (§3.9).

### 3.3 What the strip shows (`stripContent`)

Input: field kind (`text` | `date` | `time`), text, cursor, the last inserted span, findings, completion,
feedback, `showClipboard` (Edit ›). Output, first that applies:

1. `fixes` - up to two findings of kind `fix`, text order: `→ #x` buttons + Keep + Edit ›.
2. `read` - a learned fix or a date/time read just applied: "read as …" + Undo.
3. `choice` - date/time with two readings: "Did you mean" + one button per reading.
4. `complete` - up to three completions + Edit ›.
5. `feedback` - setup/notebook line, or "New tag …".
6. date field: full date (+ warning) + −1 · Today · +1 · +7, and the usual slot when the field is empty;
   time field: the read time + length (+ warning), or the usual slot when empty.
7. text field: All · Copy · Cut · Paste.
Every variant ends with ✕ (hide until next focus, as today). States 2-5 end on the next selection change
without a text change, on focus loss, or on the next burst.

### 3.4 Hook and component

- `ui/writing/useWritingHelp.ts` - one per field. Wraps the draft's setter: `normalizeTagSpacing`, then
  `insertedSpan` against the previous value, then `checkTags` / `completions` / `readDate`/`readTime`;
  applies learned fixes and single date/time readings itself (keeping the written text for Undo). Exposes
  `strip` (the `stripContent` result) and handlers (`apply(finding)`, `keep()`, `undo()`, `choose(v)`,
  `complete(tag)`, `showClipboard()`).
- `ui/writing/WritingStrip.tsx` - renders a `stripContent` with the existing `common.floatingStrip*`
  styles; always mounted like `ClipboardStrip` (same blur race). `ClipboardStrip`'s buttons become one of
  its variants; `ClipboardStrip.tsx` stays for `ClipboardTextInput` (Create Project/Area) unchanged.
- `DateNudgeStrip` gains a lead slot (label, read-as, usual slot); its buttons are unchanged.
- `MeetingRows` R3: the time field gets a `WritingStrip` above it, left-aligned, shown while it has focus.
- Feedback (§1.7) uses `placeNoteCandidates` with the draft's tags and destination - the same call the
  note icon uses, so the line can never disagree with where the page goes.

### 3.5 Quick Add wiring

`useTaskDraft`, `useMeetingDraft`, `useNoteDraft`, `useAgreementDraft`: `setTitle`/`setText` go through
`useWritingHelp`. Submit: if `strip.kind === 'fixes'` and this is the first Add since they appeared, show
them and set the status-slot hint instead of saving; the second Add saves (kept tags are recorded by the
existing `recordTags`). `CaptureQuickAdd`/`useCapture`: the recognised text is checked as one burst when
the panel opens.

### 3.6 Usual slot and warnings

- `usualSlot(meetings, today)`: not cancelled, timed, last 5 by start; group by weekday + start; the
  largest group of at least 2, else the latest; length = median of that group's lengths (1 h when no end);
  date = next date on/after today with that weekday (today only if the start is still ahead). Thread or
  loop from the draft's tags: `threadOf` for `type/counterpart`, else a matching Loop/Thread setup tag; the
  meetings from the cache filtered like `nextMeetingOf`.
- `overlapOf`: same-date, not cancelled, timed meetings whose span (end or +1 h) intersects; the first by
  start is named. `isPastNew`: create mode only.

### 3.7 Device limits

- No mark in the field's text: underlining part of a `TextInput`'s text would need styled `<Text>`
  children instead of `value`, which conflicts with the controlled value and the selection-in-a-ref
  mechanics this hardware needs (`domain/clipboardText.ts`). Decided: not needed - the strip's suggestions
  follow text order, which identifies the tag. The dashed underline on the canvas is drawing only.
- One strip redraw right after recognition - the screen redraws then anyway; checked in the device test.

### 3.8 Logging

`[GtdPara] writing:` lines with counts and kinds only - `burst len=12 tags=2 fix=1 learned=0`, `strip
fixes n=1`, `tap apply|keep|undo|choose|complete` - never tag text or dates (names live in tags).

### 3.9 Integrity Check and Settings → Input

- `ScannedItemSummary` gains `tagCounts: Record<string, number>` (from the parsed tasks/meetings the
  scan already reads). A new whole-run check `tagTypo` lists tags used once that `tagTypos` flags, with
  the suggestion, in the report.
- A new Settings area (tab) **Input** - the home for how text gets into Kept. In this release it holds
  two lists: "Learned corrections" (from → to, ✕ to forget) and "Tags that look like a typo" (tag, where,
  `→ #x`, Keep). The tab follows the existing tab pattern (`screens/settings/Settings.tsx` tab list,
  `ScrollColumn`, `settingsStyles`); it reads the cache and storage directly and has no draft/Save, since
  every action is one immediate tap. `→` rewrites that one todo or meeting line through
  `mutateEntryTasks`/`mutateEntryMeetings` (the same write path as an edit save, so the file-change rules
  and the cache update apply); Keep hides it for this profile (stored with the learned fixes).

## 4. Edge cases

- Text with `#` that is no tag (`#1` ok as a tag; `C#`): only `TAG_RE` matches are checked.
- A burst that ends inside a tag the user is still writing: the last tag of a burst counts as finished
  (recognition only writes after a pause).
- Paste of a long text with many tags: still only the first two flagged ones are shown.
- Learned pair whose target tag later disappears from the index: still applied (the user taught it);
  removable in Settings.
- Edit mode of an existing item: same help; "past" warning off.
- Date field holding an invalid value on save: unchanged - today's error.
- Two readings and the user goes on writing: the choice ends on the next touch; Add shows today's error.

## 5. Files

New: `src/domain/writing/{tagSkeleton,knownTags,tagCheck,insertion,completion,readDateTime,meetingHints,
stripContent,tagTypos}.ts`, `src/storage/learnedTagFixes.ts`, `src/ui/writing/{useWritingHelp.ts,
WritingStrip.tsx}`, `src/screens/settings/InputTab.tsx`.
Changed: `domain/markdown.ts` (`normalizeTagSpacing` replaces `stripSpaceAfterHash` at the call sites),
`domain/storeKeys.ts`, `domain/dataRemoval.ts`, `domain/integrityCheck.ts`, `storage/integrityCheck.ts`,
`ui/DateInput.tsx`, `ui/quickAdd/{useTaskDraft,useMeetingDraft,useNoteDraft,useAgreementDraft,TaskRows,
MeetingRows,NoteRows,AgreementRows,CaptureQuickAdd,useCapture}.ts(x)`, `screens/settings/Settings.tsx` (tab list).
Feature area: `quick-add` (scripts/test-areas.json globs extended for `writing`).
Docs: `docs/user/quick-add.md` (new "Writing help" section), `docs/user/tags.md` (learned corrections),
`docs/user/settings.md` (the Input area), `docs/dev/claims.md` (new promise: Kept never changes a tag
without a tap, except the two spacing fixes; checked by the scenarios of §6), `CHANGELOG.md` (New), `docs/dev/design-overview.md` §2/§4.

## 6. Test scenarios (Given / When / Then)

1. Given a Note setup on `daily`, when recognition writes "stand-up #DaiIy" into the meeting title, then the
   strip shows `→ #daily`, Keep and Edit ›.
2. Given scenario 1, when → is tapped, then the title reads "stand-up #daily" and the strip shows
   "✓ Daily · Meetings/Daily.note".
3. Given the pair daiiy → daily was learned, when "#DaiIy" is written again, then the title reads `#daily`
   and the strip shows "read as #daily · Undo"; when Undo is tapped, then `#DaiIy` is back and the pair is gone.
4. Given `#Daily` is written, then nothing is flagged (case only).
5. Given setup `101` and counterpart mieke, when "#1o1/ Mieke" is written, then the text becomes
   `#1o1/Mieke` silently and the strip shows `→ #101/Mieke`.
6. Given known `retro` and `lena`, when "for #retros #Iena" is written, then the strip shows `→ #retro`
   then `→ #lena`; a third flagged tag in the same text is not shown.
7. Given scenario 1 unanswered, when + Add is tapped, then nothing is saved and the status slot asks; when
   + Add is tapped again, then the meeting is saved with `#DaiIy`.
8. Given an unknown `#offsite27` with nothing close, then the strip shows "New tag #offsite27 · <home
   notebook>" and + Add saves at once.
9. Given the cursor after "#spa" and known sparring, sparring/lena, when the strip is shown, then it offers
   both; when one is tapped, then the tag is replaced and followed by a space.
10. Given abbreviation `atr` for Atruvia, when "#at" is at the cursor, then the strip offers "#atr Atruvia".
11. Given "9.ll.26" is written into a date field, then the field holds 2026-11-09 and the strip shows
    "read as Mon 9 Nov 2026 · Undo".
12. Given a valid date, then the date strip shows "Tue 10 Nov 2026" before −1 · Today · +1 · +7, and +1
    changes it to "Wed 11 Nov 2026".
13. Given "l5,3O-l6" in the time field, then it holds 15:30-16:00 and the strip shows "read as 15:30 – 16:00
    · 30 min".
14. Given "3-4" in the time field, then the strip offers 15:00–16:00 first and 03:00–04:00; "8" is taken as
    08:00 without a choice.
15. Given "15,3", then the strip offers 15:30 and 15:03 and the field keeps "15,3".
16. Given a meeting at 15:00-16:00 that day, when 15:30-16:30 is entered, then the strip says "overlaps
    <title> 15:00".
17. Given a new meeting dated yesterday, then the date strip says "past".
18. Given the last 5 meetings of `#101/mieke` were 3× Tue 14:00-14:45, when the empty date field is tapped,
    then the strip offers "Tue <next> 14:00 · 45 min", and one tap fills date, time and end.
19. Given a tag `#daiiy` used once and `#daily` known, when the Integrity Check runs, then the report lists
    it with "→ #daily", and Settings → Input shows it; when → is tapped, then that line in the file reads
    `#daily`.
20. Given lasso capture recognised "call #Iena", when the capture panel opens, then its strip shows `→ #lena`.

## 7. Test plan

Unit tests per domain module (folding table, one-step-off, plural, index ranking, insertion diff,
date/time readings incl. every example in §1.6, usual slot, overlap). Scenario tests for §6 in
`__tests__/scenarios/writingHelp*.test.tsx` (Quick Add rendered, `onChangeText` with a burst).
Performance test: index of 3,000 tags builds < 50 ms and a burst check < 1 ms in Jest (generous bounds).
Device checklist: recognition burst detection on the A5 X (does recognition call `onChangeText` once per
burst?), strip redraw, the date and time strips, lasso capture, Settings → Input fix.

## 8. Implementation plan (each step: `npm run check:affected -- --area quick-add,tags`)

1. Domain: skeleton, index, tag check, insertion, completion (+ unit tests).
2. Domain: date/time reading, meeting hints (+ unit tests).
3. Storage: learned fixes, store key, data removal.
4. UI: `useWritingHelp`, `WritingStrip`; wire the todo and meeting fields; Add-twice rule.
5. UI: date strip lead slot, meeting time strip, usual slot.
6. Note, agreement and capture fields.
7. Integrity Check `tagTypo`, Settings → Input tab.
8. Help pages, CHANGELOG, design-overview, scenario tests for §6; full `npm run check`; device build.

## 9. Decisions from review

- **Q1** No mark in the field's text; the strip alone (§3.7).
- **Q2** The tag lists live in a new Settings area **Input** (§3.9), not in Data.
- **Q3** The usual time is for meetings only.
