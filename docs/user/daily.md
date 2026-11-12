# Daily

Daily is the page for today. It shows your schedule for today and tomorrow and the todos that matter now - in the current [context](contexts.md).

## What appears on Daily

A todo appears on Daily when it is open and one of these is true:

- it is marked [Next](tags.md#flow-tags-for-todos) (`#next`)
- it is [due](tags.md#due-dates) today, tomorrow or overdue
- it is marked [Waiting for](tags.md#flow-tags-for-todos) and has no date, or its date is today or earlier

Todos marked Someday or Maybe never appear on Daily. Todos are grouped by project or area. The [Inbox](daily.md#the-inbox)'s own todos are not among them: they are on the **Inbox** tab, until they have a place.

## Count tabs and the bell

Over the todos, count tabs show one list at a time: **Next**, **Waiting**, **Inbox** and, once you have finished something today, **Done** - each with its number, for example `Next 11` and `Waiting 5`. **Next** holds the todos marked Next or due; **Waiting** the ones you wait for; **Inbox** everything waiting in the Inbox: the [marks to process](lasso.md#processing-marks), the todos not yet filed (not Someday or Maybe) and its meetings, past ones too - all counted, none hidden by a context. A small bell with a number on **Waiting** or **Inbox** counts the todos there that are due today or earlier (an Inbox todo's grey note is the day you captured it, or its due date when that has come), for example `Waiting 5` with the bell and `1`. Kept starts on **Next**; the tab you choose stays while Kept is open.

The todos start right under the tabs. When a list is longer than one page, a row under it shows the page and its arrows, for example `‹ 1 / 2 ›`; a list that fits on one page has no such row.

## The Inbox

Whatever you add without a project or area lands in the Inbox (`Inbox.txt` in its own folder): from Daily, Week and Month, from a [lasso capture](lasso.md#capturing-right-away) you don't file right away, and [marks](lasso.md#marking-for-later) from notes outside your projects and areas. Daily's **Inbox** tab shows all of it in one list: first "n marks to process" with **Process ›** while there are open marks, then the todos not yet filed, then the Inbox's meetings, past ones too. Someday and Maybe todos wait in the Review instead. Nothing here is hidden by a [context](contexts.md#what-a-context-shows), and its todos are not under **Next**.

To empty the Inbox, tap each item and give it a place on its card (below), finish it, or delete it. The [Weekly Review](review.md) has a step [Inbox to zero](review.md#the-steps) with the same list and card.

## Filing from the Inbox

Tap a todo or meeting on the **Inbox** tab and its Inbox card takes [Quick Add](quick-add.md)'s place: "Inbox · captured 2.11." (a meeting: its date), its title, and **File to** with up to four places to put it - a project's or area's [abbreviation](projects-and-areas.md#abbreviations) such as `#TO`, or a short name. They are only suggestions, in this order: a place whose abbreviation you wrote as a tag, then the projects and areas whose open todos and meetings use the item's tags (`#lena` used in Team offsite suggests Team offsite), then the places you filed to lately. Only active projects and areas are offered.

Tap a place and the item moves there at once - its note goes along, after the usual question. The [status line](index.md#the-status-line) says "Filed "Ask Lena" to Team offsite" with **Undo**, which brings it back to the Inbox, and the next Inbox item's card opens, so you can go through the Inbox one item at a time. When the Inbox is empty, the box closes. The grey row under the places has **Done**, **Edit** and **Delete**.

## More places, new project, Someday

**More…** after the suggestions lists every active project and area in the place of the list, under **Projects** and **Areas**, each with its abbreviation (a project also with its area); the card stays above. Tap one to file the item there. **‹ Back to the card** returns.

At the bottom, **Someday / Maybe** parks a todo: it gets `#someday` and stays in `Inbox.txt`, but leaves the Inbox list; the [Weekly Review](review.md)'s [Someday / Maybe](review.md#someday--maybe) step shows it. For Maybe, change the tag with **Edit**.

**→ New project** on the card (or **+ New project from this item** under More…) makes a project from a todo. The form is filled in for you, nothing is created yet: the name is the todo's words without tags and without a leading "Idea:", the [abbreviation](projects-and-areas.md#abbreviations) is suggested from it (both can be changed), and you choose what happens to the todo - **First todo, #next** (the default), **First todo**, or **Was only the name: remove it**, which removes the todo from your lists like Delete. **Create project** makes the folder in `1 Projects` and the [status line](index.md#the-status-line) names it, with **Open ›**; then the next Inbox item opens. There is no Undo for a new folder: archive or remove a project you didn't want by hand.

## Done

Tick a todo and it stays in its list, struck through, so you can see what you just finished - until you open another tab or leave Daily. Then it is under **Done**, which lists everything finished today. Untick a todo there and it goes back to its list.

With a [context](contexts.md#what-a-context-shows) active, Daily shows only the todos of the projects, areas and tags the context shows. Todos that are due follow the context too; the **Inbox** tab always shows everything. The last line under **Next** counts the rest, for example "Hidden by Home: 4 todos · 1 due! · Show" - "due!" counts hidden todos due today or earlier; **Show** shows everything until you switch tabs. Meetings outside the context stay in the list, dimmed.

## Labels

On Daily and on a project's or area's page a todo row is quiet: its title keeps your words and your own tags (`Collect topics #lena`), and only `#next`, the due date and the waiting-for tag leave it. One grey note on the right says what matters: `due 5.11.`, **due today** or **overdue 3.11.** (both in bold), or `w/f Lena` while you wait for Lena. If a title is too long, it is shortened with … so the note always fits.

A row shows the [notebook icon](projects-and-areas.md#the-notebook-icon) only when the todo or meeting has a note; one tap opens it. A new note and a linked file are made from the [card](quick-add.md#the-card-one-tap-selects).

Other lists (the [Inbox](daily.md#the-inbox), the [Review](review.md), the [thread overview](threads.md#opening-the-overview)) show short labels after the title instead: `#next`, `#w/f Lena`, `#due 5.10.` (with `!` when overdue); in a list grouped by Next, Waiting For and so on, the label the heading already says is left out. A `#now` from earlier versions counts as `#next`.

## Schedule and cards

The left column is the schedule with the tabs **Today** and **Tomorrow** (and **Google** when the [Google Calendar](features.md#google-calendar) integration is on): [meetings](meetings.md) and [focus blocks](meetings.md#focus-blocks). The two small buttons at the right of the tabs switch between one-line and two-line rows.

Tap a meeting or focus block to see its [card](meetings.md#the-meeting-row-and-its-card) in [Quick Add](quick-add.md)'s place, and its [context panel](meetings.md#the-context-panel) in place of the todos: what you owe, what is next, what you are waiting for and what was agreed last time. **+ Quick Add to meeting** at the end of the panel adds a todo to it. Tap it again, or the title on the card, to [edit](quick-add.md#editing) it.

Todos work the same way: a tap shows the todo's [card](quick-add.md#the-card-one-tap-selects), with Next, w/f, Someday, Maybe, done, its note, the clip and delete.

## Linking a file from Daily

Daily has no [Files pane](projects-and-areas.md#files-and-linked-files). The clip on a todo's or meeting's card (**+** with the clip) opens a file picker in place of the todos instead: **Projects**, **Areas**, **Resources** and **Inbox**, and on top the file you opened Kept from, when there is one ([Files outside Note](files-and-folders.md#files-outside-note)). Tap a folder to open it and a file to link it; the card then shows the file's name. **‹ Back to the card** links nothing. On Week, Month, the thread and loop overviews and in the Review, a linked file shows and opens, but linking one happens on Daily or the project's page.

## Tags in rows

A [nested tag](tags.md#nested-tags) such as `#sparring/jordan` in a todo or meeting opens its [thread overview](threads.md#opening-the-overview). To see what belongs to a meeting, tap the meeting: its [context panel](meetings.md#the-context-panel) shows its todos, what you are waiting for and what was agreed.
