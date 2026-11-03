# Tags

Tags are words with a `#` in front, written straight into a todo or meeting. They are plain text, so they also work when you edit the files by hand.

## Flow tags for todos

Each todo has at most one of these. The chips in [Quick Add](quick-add.md#adding-a-todo) and on a todo's [card](quick-add.md#the-card-one-tap-selects) set them for you.

- `#next`: the next physical step. Shows on [Daily](daily.md) (in the current [context](contexts.md)). Label: `#next`.
- `#wf/name`: you are waiting for someone, for example `#wf/lena`, or just `#wf` without a name. Shows on Daily until you get it (label `#w/f Lena`); give it a due date to keep it off Daily until that day. You also find them in the Waiting For group of their [project, area](projects-and-areas.md#the-current-tab) or the [Inbox](quick-add.md#the-inbox). The older form `#waiting-for:lena` still works; Kept GTD writes `#wf/lena` the next time you edit the todo in Quick Add.
- `#someday` and `#maybe`: parked ideas. Never on Daily; a project with only these counts as stalled in the [Review](review.md#the-steps).

## Due dates

A due date is not a tag but a field at the end of the line: `[due:: 2026-10-15]`. [Quick Add](quick-add.md#adding-a-todo) writes it for you. Todos due today, tomorrow or earlier show on [Daily](daily.md#what-appears-on-daily). The label reads `#due 15.10.`, with `!` when overdue. For a Waiting for todo the date is when to follow up: it shows on Daily from that day on.

An older `#due:2026-10-15` tag still counts as the due date. When you edit the todo in Quick Add or set its due date in the [Review](review.md), Kept removes the tag and writes the field.

## Dates Kept GTD records

You type tags; Kept writes fields. Besides the due date it records two dates on a todo, at the end of the line:

- `[created:: 2026-10-07]`: the day the todo was added
- `[completion:: 2026-10-09]`: the day it was checked done; unchecking removes it again

Todos added with older versions get no created date, and a todo checked before this version gets no completion date: Kept never makes up a date. See [Inside project.txt](files-and-folders.md#inside-projecttxt) for how the line is built and [Using Kept GTD with Obsidian](files-and-folders.md#using-kept-gtd-with-obsidian) for how Obsidian reads it.

## Promises: #owe/name

`#owe/name` marks something you promised someone outside a meeting: `#owe/` and the person's name, written like `#wf/lena`. It is not a flow tag: it goes together with `#next`, `#someday` or a due date. The todo shows under **I owe** in that person's [thread overview](threads.md#how-a-todo-relates-to-a-thread). A plain `#owe` without a name is an ordinary tag.

## Now

`#now` came from focus mode, which is retired. A todo that still has it counts as `#next` and shows `#next`; the text in your file stays. Moving the todo to Someday or Plan removes it.

## Context tags

Any other tag is a context tag: a person (`#lena`), a topic (`#budget`) or a recurring meeting (`#team-sync`). [Note setups](note-setups.md#what-a-setup-is) can react to context tags. Not to be confused with [contexts](contexts.md) (Work, Home), which choose what the tabs show.

## Nested tags

A tag can have parts separated by `/`, for example `#sparring/jordan`. It is one tag: one chip in Quick Add. Obsidian reads the same syntax as a nested tag.

- A [Note setup](note-setups.md) on `sparring` also covers `#sparring/jordan` and every other `#sparring/…`. The part after the `/` can choose the notebook, see [Placeholders in a note name](note-setups.md#placeholders-in-a-note-name).
- Tapping a nested tag in any list opens its [thread overview](threads.md#opening-the-overview): everything around `#sparring/jordan` - upcoming meetings, open todos, what you wait for and what was agreed in past meetings. On Daily, a nested tag does not filter the list; a plain tag does.
- When the first part is a tag of one of your [Thread setups](note-setups.md#what-a-setup-is) (here `sparring`), or `wf` or `owe`, the second part (`jordan`) is a [counterpart](threads.md) you are asked to [tend](threads.md#tending-counterparts). One you set inactive no longer appears among the suggested tags in Quick Add, neither `#sparring/jordan` nor `#jordan`; you can still type it.

## Project and area abbreviations

A tag that matches a project's or area's [abbreviation](projects-and-areas.md#abbreviations) (for example `#GR`) is shown in capitals. It lets you [file an item directly](quick-add.md#filing-directly-with-an-abbreviation) into that project from Quick Add. Abbreviations are not case-sensitive.

## Tags the app sets itself

- `#prepped` and `#reviewed`: [meeting preparation and review](meetings.md#preparation-and-review)
- `#monthly`: the meeting is a [monthly highlight](week-and-month.md#month)

These words, the flow words, `wf`, `owe` and `now` can't be used as abbreviations.
