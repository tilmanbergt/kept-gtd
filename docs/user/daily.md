# Daily

Daily is the page for today. It shows your schedule for today and tomorrow and the todos that matter now - in the current [context](contexts.md).

## What appears on Daily

A todo appears on Daily when it is open and one of these is true:

- it is marked [Next](tags.md#flow-tags-for-todos) (`#next`)
- it is [due](tags.md#due-dates) today, tomorrow or overdue
- it is marked [Waiting for](tags.md#flow-tags-for-todos) and has no date, or its date is today or earlier

Todos marked Someday or Maybe never appear on Daily. Todos are grouped by project or area, the [Inbox](quick-add.md#the-inbox) first; Waiting for todos come last in their group.

With a [context](contexts.md#what-a-context-shows) active, Daily shows only the todos of the projects, areas and tags the context shows. The Inbox always shows; todos that are due follow the context too. The last line counts the rest, for example "Hidden by Home: 4 todos · 1 due! · Show" - "due!" counts hidden todos due today or earlier; **Show** shows everything until you switch tabs. Meetings outside the context stay in the list, dimmed.

## Labels

After a todo's title, short labels show what matters about it: `#next`, `#w/f Lena` (waiting for Lena), `#due 5.10.` (with `!` when overdue). If a title is too long, it is shortened with … so the labels always fit. The same labels appear on every tab; in a list grouped by Next, Waiting For and so on, the label the heading already says is left out. A `#now` from earlier versions counts as `#next` and shows as `#next`.

## Schedule and cards

The left column is the schedule with the tabs **Today** and **Tomorrow** (and **Google** when the [Google Calendar](features.md#google-calendar) integration is on): [meetings](meetings.md) and [focus blocks](meetings.md#focus-blocks).

Tap a meeting or focus block to see its [card](meetings.md#the-meeting-row-and-its-card) in [Quick Add](quick-add.md)'s place, and its [context panel](meetings.md#the-context-panel) in place of the todos: what you owe, what is next, what you are waiting for and what was agreed last time. **+ Quick Add to meeting** at the end of the panel adds a todo to it. Tap it again, [Edit](quick-add.md#editing) or the title on the card to change it. Daily has no [Files pane](projects-and-areas.md#files-and-linked-files), so linking a file happens on the project's page.

Todos work the same way: a tap shows the todo's [card](quick-add.md#the-card-one-tap-selects), with done, the flow chips, its note and delete.

## Tags in rows

A [nested tag](tags.md#nested-tags) such as `#sparring/jordan` in a todo or meeting opens its [thread overview](threads.md#opening-the-overview). To see what belongs to a meeting, tap the meeting: its [context panel](meetings.md#the-context-panel) shows its todos, what you are waiting for and what was agreed.
