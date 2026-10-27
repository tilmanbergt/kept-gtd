# Daily

Daily is the page for today. It shows your schedule for today and tomorrow and the todos that matter now - in the current context (see [Contexts](contexts.md)).

## What appears on Daily

A todo appears on Daily when it is open and one of these is true:

- it is marked **Next**
- it is due today, tomorrow or overdue
- it is marked **Waiting for** and has no date, or its date is today or earlier

Todos marked Someday or Maybe never appear on Daily. Todos are grouped by project or area, the Inbox first; Waiting for todos come last in their group.

With a context active, Daily shows only the todos of the projects, areas and tags the context shows. The Inbox and todos due today or earlier always show. The last line counts the rest, for example "Hidden by Home: 4 todos · Show"; **Show** shows everything until you switch tabs. Meetings outside the context stay in the list, dimmed.

## Labels

After a todo's title, short labels show what matters about it: `#next`, `#w/f Lena` (waiting for Lena), `#due 5.10.` (with `!` when overdue). If a title is too long, it is shortened with … so the labels always fit. The same labels appear on every tab; in a list grouped by Next, Waiting For and so on, the label the heading already says is left out. A `#now` from earlier versions counts as `#next` and shows as `#next`.

## Schedule and cards

The left column is the schedule with the tabs **Today** and **Tomorrow** (and **Google** when the Google Calendar integration is on): meetings and focus blocks (see [Meetings](meetings.md)).

Tap a meeting or focus block to see its card in Quick Add's place, and its **context panel** in place of the todos: what you owe, what is next, what you are waiting for and what was agreed last time (see [Meetings](meetings.md)). **+ Quick Add to meeting** at the end of the panel adds a todo to it. Tap it again or **Edit** to change it. Daily has no Files pane, so linking a file happens on the project's page.

Todos work the same way: a tap shows the todo's card, with done, the flow chips, its note and delete (see [Quick Add](quick-add.md)).

## Filtering by a tag

Tap a tag inside a todo or meeting (for example `#lena`) to show only items with that tag. A nested tag such as `#retro/alpha` opens its thread overview instead, see [Threads](threads.md). If the tag is the abbreviation of a project or area (for example `#GR`), Daily shows all of that project's items. Tap the tag again to remove the filter.
