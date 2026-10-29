# Time and place — retiring focus, adding focus blocks and contexts (requirements)

Status: **REQUIREMENTS DECIDED (2026-10-27).** Technical design: claude/technical-design-time-and-place.md.
Design canvas: "Kept GTD Focus Rethink" — https://claude.ai/artifact/DchxJwySCLyWjCjQH1Nto1
Approved boards: Main, ContextSwitch, DailyHome, PanelB, PanelC, Week, Month, WeekPanel2, MonthPanel2,
QuickAddFocus, ContextSettings. Reference only (superseded): PanelA (Engage tabs), WeekPanel / MonthPanel
(Option 1).
Working title for the release: **"Time and place"** (focus blocks = time, contexts = place).

## 1. Why

Kept GTD asks the user to *declare* focus in forms: daily/weekly/monthly focus slots and weekly/monthly
goals. In practice Tilman rarely uses them; Engage, loops and threads have taken over what they did.

The new shape is **lived focus**, built from three things, none of them a list to maintain:

| Layer | Question | Source |
|---|---|---|
| **Context** | Where am I, what fits here? | One tap: a few big contexts (work, home/free time, café with only the Supernote) |
| **Time** | What do I give time to? | **Focus blocks** (F) in the calendar: time for myself with a loop, thread, project or area |
| **Aliveness** | What is moving, what needs care? | Derived: scheduled time, todos done in the period, the Tending/Open loops review |

Intentions belong in the user's handwriting, not in goal fields ("for those who write, where they
write"). Less data entered in the plugin is better. A context like Home may show almost nothing — the
system protects rest instead of always offering more to do.

## 2. Decisions (D1–D30)

**Removed**
- D1 Daily, weekly and monthly **focus** (slots, D/W/M badges, focus panels, Settings → Focus) are removed.
- D2 Weekly and monthly **goals** are removed everywhere (Week, Month, Project/Area page, Review).
- D3 **Focus mode and `#now`** are removed completely in this release (no Features switch).
- D4 The Home page piece **Latest goals** is removed from Note setups. Existing notebooks keep their text.
- D5 Nothing in any file is deleted or rewritten because of the removal (see §8).

**Focus blocks**
- D6 A focus block (F) is a meeting with a small **F** toggle in Quick Add's Meeting form, next to **M**:
  "focus time for myself", not a meeting set up with someone. It is 99 % a meeting: same line, same time
  field, same lists, same Google copy.
- D7 An F block **always has an owner**: a loop, a thread, a project or an area; in doubt the Inbox
  (exactly the filing rules of meetings).
- D8 F blocks have **no** prep/review tracking, no Reflection page and never appear in "Meetings to close
  out". Their note is created by the **Note setups exactly as for meetings** (the owner's note when the
  setup says so).
- D9 F blocks show with a filled **F** badge wherever meetings show (Daily, Week, Month day panel,
  Project/Area page under meetings, Engage "Today next").
- D10 Lists holding meetings and F blocks are labelled **Schedule** (Week's left subtab, Daily header,
  Project/Area page) instead of "Meetings".

**Context panel (tapping a meeting or F block)**
- D11 Tapping a meeting or F block shows its **card in Quick Add's place** (fixed height, as today) and the
  **context panel** below it, replacing Next todos (Daily) or the whole right side (Week, Month).
- D12 The context panel is **one stacked list**, the same on Daily, Week and Month: I owe · Next · Waiting
  for · Agreed last time (thread) / From its meetings (loop, project, area) · Due. Sections hide when empty.
  No tabs, no "Next here" line.
- D13 Owner of the panel: the meeting's thread, else its loop. A plain meeting shows **only what is linked
  to this meeting**; if that is empty, its Project/Area (**owner's lens**) with the line "Nothing linked to
  this meeting yet · showing its project".
- D14 **+ Quick Add to meeting** (F block: **+ Quick Add to block**) at the bottom replaces the card with
  Quick Add for this meeting; after **Add** it returns to the card and the list shows the new item.
  **Before** the meeting the entry only gets the meeting's tag (thread/loop tag; a plain meeting: filed to
  its project/area) — an agenda item. **During and after** it also records the meeting (`agreed in`), as
  Engage does today.
- D15 **Week:** tapping a day's header row shows that day's schedule on the right (today's behaviour).
  Tapping one meeting/F block (left side or day panel) shows card + context panel on the right, with
  "‹ Back to Week 44" and "Tue 27.10. · 8 meetings ›". **Month:** tapping a day shows the day panel
  (today's behaviour); tapping a meeting in it shows card + context panel with "‹ Back to October" and
  the day link. ✕ on the card also returns to the normal view.

**Week and Month right side**
- D16 Under Quick Add: **Given time this week/month** — owners (loop, thread, project, area, Inbox) with
  scheduled time in the period, **sorted by scheduled hours**, hours on the right, one grey line (blocks,
  meetings, todos done, next todo). Month counts **all meetings** plus F blocks, not only highlights.
  A meeting counts once: for its thread/loop if it has one, else for its project/area.
- D17 **Worked on this week/month** — owners with todos done in this period (done date) and no scheduled
  time. Nothing from earlier periods.
- D18 One **Tend** line: "Tend: 3 threads · 2 loops quiet ›" opening Review → Tending threads.
- D19 Month highlights (M) stay as they are (core).

**Contexts**
- D20 Contexts are defined in **Settings → Contexts** (replaces Settings → Focus), stored **per profile**
  like Note setups. A context has a name, a **Shows** list (areas/projects — an area brings its projects,
  loops and threads — plus tags, loops, threads) and a **Hides** list; **Hides wins**. "Everything" is
  built in and not editable.
- D21 Switching: one **global chip in the tab bar** (where the DEMO badge is today) opening the list of
  contexts with a one-line summary and a count.
- D22 A context filters **Daily, Week, Month, Projects, Areas and Review** (decided 2026-10-27). Not
  filtered: Inbox, a single Project/Area page (Current), Settings and Engage (Engage follows the note).
- D23 Always shown: the Inbox and todos due today or overdue. Meetings and F blocks outside the context
  are **dimmed, not hidden** (setting per context: dimmed / shown as usual).
- D24 Every filtered tab ends with a **hidden line**: "Hidden by Work: 9 todos · 2 loops · 1 thread ·
  Show". **Show = temporary "Everything" until the tab is left** (decided).
- D25 On Hold and Done projects/areas leave every context (they leave Daily anyway).

**Daily**
- D26 Next todos = all `#next` todos in the context (the "only if in focus" rule goes), grouped by owner as
  today; a loop shows its one next. The Focus panel (bottom left) and its home-notebook icons go.

**Elsewhere**
- D27 **DEMO** becomes a boxed **D** and **inverts the tab bar** (black, white titles) while the demo space
  is open, so it can't be missed. The context chip takes its old place.
- D28 **Engage** fallback "nothing fits → today's focus" becomes: today's next meetings and F blocks to
  choose from.
- D29 **Review:** *Week ahead* = meetings and F blocks only (Given time is no look-ahead). *Unfocused next
  items* and *Focus reset* are retired. *Tending threads* and *Open loops* get a gentle invitation: a
  thread with no meeting ahead / a loop with no F block or meeting ahead is marked "nothing planned" with
  **+ Next meeting** / **+ F block** (inviting, never required).
- D30 Project/Area page: a short **Given time this week · this month** line; F blocks show in its schedule.

## 3. Screens (canvas boards)

| Board | Shows |
|---|---|
| Main | Daily · Work: Schedule left (F badges, Home meetings dimmed), Quick Add, Next todos by owner, hidden line |
| ContextSwitch | Chip opened: Work / Home · free time / Café / Everything, count, "Edit contexts" |
| DailyHome | Daily · Home: work dimmed, one loop next, Inbox, "Nothing else asks for you here." |
| PanelB | Daily, thread meeting tapped: card + stacked list + Quick Add to meeting |
| PanelC | Daily, plain meeting with nothing linked: owner's lens with explaining line |
| Week / Month | Given time (sorted by hours) · Worked on · Tend |
| WeekPanel2 / MonthPanel2 | Meeting / F block tapped: card + stacked list, back links |
| QuickAddFocus | Quick Add Meeting form with M and F; meeting card vs focus-block card (real size) |
| ContextSettings | Settings → Contexts: list left, Shows/Hides chips, meetings outside, always shown, preview |

The boards are drawn at half device size from the 30.9. screenshots; the 0.21 look (tabs, cards, labels)
wins where they differ.

## 4. Maintainability and reuse (guidance for the technical design)

- **One context panel component** for Daily, Week and Month, fed by the existing thread lens, loop and
  Engage owner logic (no second way of deciding "what belongs to this meeting").
- **Card = the existing MeetingCard** with an F variant (no P/R/Reflect, F filled).
- **Quick Add to meeting** reuses Engage's Quick Add recording (grey line, meeting provenance) instead of a
  new path.
- **One pure context filter** in `domain/` applied in the Daily/planning aggregates; the hidden counts come
  from the same pass.
- **Given time / Worked on** = one pure aggregate over meetings (existing meeting span/period helpers) and
  done dates.
- **Settings → Contexts** reuses the Note setups list/detail pattern and chip editors.
- Removing focus/goals/focus mode should **shrink** the code base noticeably (DailyFocusPanel,
  PeriodFocusPanel, PeriodGoalsHistoryPanel, ItemFocusPanel, focus mode, two review steps, focus settings).
  Code-health baselines go down, not up.

## 5. Affected flows — what the user notices

- **Daily** shows more `#next` than before for users who relied on focus — contexts are the new lever.
- **Week/Month** lose the focus panel and its Focus · Projects · Areas sub-tabs; the right side is Quick
  Add + Given time / Worked on / Tend. From Friday, Week shows the coming week's Given time (as focus did).
- **Projects/Areas:** focus checkboxes, goal line, D/W/M badges go; Given time line comes; schedule shows F.
- **Note setups:** Latest goals piece gone; F blocks follow meeting rules minus tracking/Reflection.
- **Review:** two steps gone, Week ahead simpler, invitations in Tending threads / Open loops; the Review
  hub's stats for the retired steps disappear.
- **Engage:** fallback changes (D28); otherwise unaffected, also by contexts.
- **Quick Add:** F toggle; a new item filed into an owner hidden by the current context confirms in the
  status slot: "Saved to Atruvia · hidden by Home".
- **Google Calendar copy:** copied events can be made F blocks by toggling F (no automatic detection).
- **Settings:** Focus tab → Contexts tab; Features tab (from 0.22 plan) without the focus-mode switch.
- **Help, README, demo space, showcase plans:** rewritten for the new model (daily.md "Daily and focus
  mode", week-and-month.md, review.md, projects-and-areas.md, settings.md, quick-add.md, new contexts.md).

## 6. Files and storage (user level)

- An F block is marked by the tag **`#focusblock`** on the meeting line (decided), so files, Obsidian and
  older builds still read it as a normal meeting. The app hides the tag in rows and shows the F badge.
- Contexts and the active context live in the profile's settings (not in files).
- Existing focus flags (frontmatter) and `## Weekly Goals` / `## Monthly Goals` sections stay in the files,
  untouched and preserved on every save. `#now` stays where it is written.

## 7. Release plan and timing with "Daily slim" (0.22.0)

Daily slim (approved 2026-10-26, not yet implemented) and this rethink touch the same screen. Proposal:
**one release 0.22.0 "Time and place"** that absorbs Daily slim; Agenda moves to 0.23.0 and builds on D14.

From Daily slim we keep: the DailyView split, `useEntryActions`, `useDailyData`, the row-layout cache, the
small speed fixes, Settings → Features with **Project close-out** and the **Experimental** section.
We drop: FocusModeScreen/useFocusSession and the focus-mode switch (focus mode is deleted instead).

Steps (each ends green and installable as a beta build, in this order — additive first, removal last):

1. **S0 Daily structure** — Daily slim's structural part, no visible change (+ Features tab without focus mode).
2. **S1 Focus blocks** — F toggle, tag, F card, F badges, Schedule label, Note setups exclusions.
3. **S2 Context panel** — card + stacked list on Daily, Week, Month; Quick Add to meeting/block; back links.
4. **S3 Contexts** — Settings → Contexts, tab-bar chip, filter, hidden line, D badge + inverted tab bar.
5. **S4 Retire** — focus, goals, focus mode, `#now`; new Week/Month right side; Project page Given time;
   Review changes; Engage fallback; Latest goals piece; help/README/demo/CHANGELOG with upgrade note.

Tilman can live with S1–S3 on the device before S4 removes anything.

## 8. Rollback and migration

**Requirement: until 0.22.0 is final, installing 0.21.1 again must give back the full old experience, also
after S4.** Therefore:
- R1 **No migration writes.** Updating changes no file and no stored setting by itself.
- R2 Every save of a project.txt / area.txt / Inbox.txt keeps the focus frontmatter lines and the
  `## Weekly Goals` / `## Monthly Goals` sections **byte for byte**.
- R3 Removed settings (focus counts, focusModeActive, the Latest goals piece in Note setups, review-step
  records of retired steps) **stay in the stored settings**; the new version ignores them. New keys
  (contexts, active context, modules) are ignored by 0.21.1.
- R4 `#now` is read as `#next` (label `#next`), never rewritten. After a rollback it works as before.
- R5 Known rollback seams (acceptable, listed in the beta notes): F blocks show as ordinary meetings in
  0.21.1 (tracked if their Note setup tracks); focus and goals set before the update come back, weeks of the
  beta simply have none; items added during the beta have no focus.
- R6 Upgrade note (CHANGELOG): "Focus, weekly/monthly goals and focus mode are retired. Your files keep
  them; nothing was deleted. Daily now shows all next todos of the current context — set up contexts in
  Settings → Contexts. New: focus blocks (F) and the context panel when you tap a meeting."
- R7 On the first start after the update the active context is **Everything** and the status slot says
  once: "Focus is retired. Contexts decide what Daily shows: Settings → Contexts."

## 9. Things that could confuse the user

Decided 2026-10-27:
1. **More todos on Daily** right after the update (D26): mitigated by R7 and contexts; no automatic context
   built from old focus.
2. **Forgotten context**: chip always visible in the tab bar, hidden line on every filtered tab.
3. **Chip and filter scope**: the context filters Daily, Week, Month, Projects, Areas and Review (D22).
4. **Old goals** are no longer visible in the app (they stay in the files). Accepted.
5. **"Schedule"** replaces "Meetings" everywhere F blocks can appear (Week subtab, Daily header, Project/Area
   page, Inbox meeting list).
6. **Given time for all-day/multi-day events**: timed items in hours; an all-day item counts **1 day = 8 h**
   for sorting and shows "1 day".
7. **Agenda item before a plain meeting** (no thread/loop tag) gets no meeting tag, only its project/area;
   the panel then shows it through the owner's lens. Accepted until Agenda (0.23).
8. **F block note**: decided by the Note setup (D8); the **default setup creates no own note for F blocks**.
9. **Hidden line "Show"** = temporary Everything until the tab is left (D24).
10. **F tag** = `#focusblock` (§6).

Also decided:
11. Given time / Worked on respect the context (counted in the hidden line).
12. Items no context mentions show only under **Everything** (Q1).
13. Review under a context (Q2): each step lists the current context's items, the hub shows "+n in other
    contexts" per step; Reviewed marks and the overdue date stay global.
14. Tend window: "nothing planned" = no meeting or F block in the next **14 days**.

Checks for the technical design: the Settings tab strip (Focus → Contexts plus the new Features tab) fits on
one line; the review-overdue calculation ignores retired steps; the demo space shows contexts and F blocks.

## 10. Out of scope

Automatic context detection; context-dependent Engage; Agenda proper (0.23); per-item context tags with
inheritance (Sept. idea) — Shows/Hides lists cover it for now; goal migration into notes.

## 11. Testing (with the test tiers from `feature/test-tiers`)

This release is the first to ship with the test tiers (claude/technical-design-test-tiers.md): `feature/test-tiers`
is merged into `main` first, 0.22.0 branches from there and uses the new `release.ps1` (full + coverage once,
on the release commit).

- **Smoke must change with the behaviour.** Smoke scenarios 2-4 assert exactly what this release removes
  (the "Sort tools" vs "Draft homepage" focus rule, weekly/monthly focus panels with goals, the D badge).
  They are rewritten in the step that changes the behaviour (S4), never deleted without replacement:
  Daily under a context (shown / hidden / hidden line), Week Given time and Worked on, Month Given time incl.
  an all-day event, a tapped meeting showing the stacked panel. The smoke space gets one context and one F
  block. Smoke stays within its 60 s budget.
- **Each step adds its scenarios** (Given/When/Then from this document) and runs the *affected* tier plus the
  touched areas; the checkpoint after S4 runs *full*.
- **Rollback is tested, not promised:** unit round-trip tests that a save keeps focus frontmatter lines and
  the `## Weekly Goals` / `## Monthly Goals` sections byte for byte; settings load/save keeps removed keys;
  `#now` reads as `#next` and is never rewritten.
- **Feature areas** (`scripts/test-areas.json`): new files are assigned (focus blocks → meetings, context
  panel and Given time → planning, Settings → Contexts → settings or a new `contexts` area); globs of deleted
  files (focusSlots, periodGoals, periodFocusCards, ItemFocusPanel, focus mode) are removed; the new help page
  `contexts.md` must be named by an area (strict rule).
- **Coverage ratchet:** deleting focus code and its tests shifts the planning, review and current-page
  percentages. A drop beyond 2 points needs a hand-lowered baseline with the reason in the commit; new
  domain logic (context filter, Given time aggregate, panel owner) gets unit tests so the areas end at or
  above their baselines.

## 12. Decided in the last round (2026-10-27)

- **Q1 Items no context mentions** show only under Everything. Rule: a context with a non-empty Shows list
  shows only what it lists (minus Hides); a context with an empty Shows list shows everything except its
  Hides ("everything but work").
- **Q2 Review under a context** as in §9 item 13.
- **Q3 Release numbering (confirmed):** 0.22.0 "Time and place" absorbs Daily slim; Agenda becomes 0.23.0.

## 11. Changes after the first device test (decided 2026-10-28)

- **D23 changed:** only the **Inbox** is always shown. Todos due today and overdue follow the context like
  any other todo; the hidden line names how many of the hidden todos are due: "Hidden by Work: 13 todos ·
  1 loop · 3 due! · Show".
- **D16/D17 changed — Given time in two lists.** First **Areas and projects**: each Area with everything in
  it (its projects, loops, threads) and each project without an Area, in one list sorted by time (a project
  can come before an Area). Then **Loops and counterparts**: the same time once more, per loop and per
  counterpart, only from a threshold up (per context, default 1 h a week / 2 h a month; "Nothing above 1 h this
  week" when none). The Inbox is never listed. Times in the same size and weight as the names. Worked on
  stays, for Areas and projects.
- **D18/D29 changed:** Review's **Tending threads** lists the New counterparts (Tend / Not) and the active
  ones with nothing planned in 14 days and no next todo (`#next` or I owe); **Open loops** lists the loops
  with nothing planned and no next todo (and, as before, those past their main date). The Tend line counts
  the same.
- **Context panel (D10-D15 refined):** "+ Quick Add to meeting/block" opens on the **Todo** tab with "Add to
  <owner's Project or Area>" as its fixed destination - no `#ABBR` in the text; the thread's or loop's tag and
  the meeting stay in the grey line as before. Todos in the panel are selectable and editable like any row;
  ✕ or Save on such a todo returns to the meeting's card. The panel's header gets **✕ Close** next to
  **Overview ›**, doing what the card's ✕ does. All of this alike on Daily, Week, Month and Week ahead.
- **Context panel, full context:** the panel lists **I owe · Next · Planned · Waiting for** (and what was
  agreed): Planned are the open todos without a flow state, Waiting for includes those with a later date -
  also what Daily itself leaves out, so a session starts with its whole context.
- **Month:** a focus block shows on its day - with its name, shortened like a meeting's, and **F** - only when
  it is also marked **M**; unmarked focus blocks show on the day panel and in Given time only.
- **Cards:** on the meeting card and the todo card above Quick Add, a tap on the title opens the edit form,
  like **Edit**.
- **Kind badges:** the kind of an owner (Area, Project, Loop, Thread, Counterpart) shows as one small-caps
  badge (capitals, first letter larger) right of the name - in Given time, the context panel's header,
  Engage's header (replacing its boxed pill) and a Project's or Area's page. Sentences ("showing its
  project") and Settings' or the Files pane's choices stay words.
- **Given time per counterpart:** "Loops and counterparts" lists counterparts, not threads: all threads of
  a counterpart within its scope (an Area with its Projects, or a Project without an Area) sum into one row
  (value = retro/value + review/value + replenishment/value), its `#wf/` and `#owe/` todos included; the
  grey line names its series; a tap opens the counterpart's overview; the threshold applies to the sum. The
  same counterpart in two scopes shows twice, with the scope's name. Loops stay one row each. The Tend line
  says "counterparts". The context panel's header still names the meeting's thread.
