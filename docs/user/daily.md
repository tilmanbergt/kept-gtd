# Daily

Daily is the page for today. It shows your schedule for today and tomorrow and the todos that matter now - in the current [context](contexts.md).

## What appears on Daily

A todo appears on Daily when it is open and one of these is true:

- it is marked [Next](tags.md#flow-tags-for-todos) (`#next`)
- it is [due](tags.md#due-dates) today, tomorrow or overdue
- it is marked [Waiting for](tags.md#flow-tags-for-todos) and has no date, or its date is today or earlier

Todos marked Someday or Maybe never appear on Daily. Todos are grouped by project or area, the [Inbox](quick-add.md#the-inbox) first.

## Count tabs and the bell

Over the todos, count tabs show one list at a time: **Next**, **Waiting**, **Inbox** and, once you have finished something today, **Done** - each with its number, for example `Next 11` and `Waiting 5`. **Next** holds the todos marked Next or due; **Waiting** the ones you wait for; **Inbox** the Inbox's todos (they show under Next as well). A small bell with a number on **Waiting** or **Inbox** counts the todos there that are due today or earlier, for example `Waiting 5` with the bell and `1`. Kept starts on **Next**; the tab you choose stays while Kept is open.

## Done

Tick a todo and it stays in its list, struck through, so you can see what you just finished - until you open another tab or leave Daily. Then it is under **Done**, which lists everything finished today. Untick a todo there and it goes back to its list.

With a [context](contexts.md#what-a-context-shows) active, Daily shows only the todos of the projects, areas and tags the context shows. The Inbox always shows; todos that are due follow the context too. The last line under **Next** counts the rest, for example "Hidden by Home: 4 todos · 1 due! · Show" - "due!" counts hidden todos due today or earlier; **Show** shows everything until you switch tabs. Meetings outside the context stay in the list, dimmed.

## Labels

On Daily and on a project's or area's page a todo row is quiet: its title keeps your words and your own tags (`Collect topics #lena`), and only `#next`, the due date and the waiting-for tag leave it. One grey note on the right says what matters: `due 5.11.`, **due today** or **overdue 3.11.** (both in bold), or `w/f Lena` while you wait for Lena. If a title is too long, it is shortened with … so the note always fits.

A row shows the [notebook icon](projects-and-areas.md#the-notebook-icon) only when the todo or meeting has a note; one tap opens it. A new note and a linked file are made from the [card](quick-add.md#the-card-one-tap-selects).

Other lists (the [Inbox](quick-add.md#the-inbox), the [Review](review.md), the [thread overview](threads.md#opening-the-overview)) show short labels after the title instead: `#next`, `#w/f Lena`, `#due 5.10.` (with `!` when overdue); in a list grouped by Next, Waiting For and so on, the label the heading already says is left out. A `#now` from earlier versions counts as `#next`.

## Schedule and cards

The left column is the schedule with the tabs **Today** and **Tomorrow** (and **Google** when the [Google Calendar](features.md#google-calendar) integration is on): [meetings](meetings.md) and [focus blocks](meetings.md#focus-blocks). The two small buttons at the right of the tabs switch between one-line and two-line rows.

Tap a meeting or focus block to see its [card](meetings.md#the-meeting-row-and-its-card) in [Quick Add](quick-add.md)'s place, and its [context panel](meetings.md#the-context-panel) in place of the todos: what you owe, what is next, what you are waiting for and what was agreed last time. **+ Quick Add to meeting** at the end of the panel adds a todo to it. Tap it again, [Edit](quick-add.md#editing) or the title on the card to change it. Daily has no [Files pane](projects-and-areas.md#files-and-linked-files), so linking a file happens on the project's page.

Todos work the same way: a tap shows the todo's [card](quick-add.md#the-card-one-tap-selects), with done, w/f, Someday, its note and **More ›**.

## Tags in rows

A [nested tag](tags.md#nested-tags) such as `#sparring/jordan` in a todo or meeting opens its [thread overview](threads.md#opening-the-overview). To see what belongs to a meeting, tap the meeting: its [context panel](meetings.md#the-context-panel) shows its todos, what you are waiting for and what was agreed.
