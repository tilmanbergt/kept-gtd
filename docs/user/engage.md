# Engage

Engage is the step from organising to doing. While you work in a note, it shows a small panel over the note with your [next actions](tags.md#flow-tags-for-todos) (`#next`) for what you are working on, nothing else. One tap to open it, one or two taps to decide, and it is gone again.

## Opening Engage

- The **Engage** button in the sidebar of a note or document, next to the Kept GTD button.
- **Engage ›** at the top of a [Project's or Area's page](projects-and-areas.md#the-current-tab), a [loop overview](loops.md#the-loop-overview) or a [thread overview](threads.md#the-place-it-covers).

The panel is about one *owner* at a time: a Project, an Area, a [loop](loops.md) or a [thread](threads.md). It answers one question: what do I do next, here? Engage follows the note you are in:

- **Engage ›** on a page: that page's Project, Area, loop or thread.
- The Engage button on a todo's note (its own note, its page in a [loop note](loops.md#the-loop-note), or its page in a shared notebook): that todo becomes the one you are working on. The owner is its loop; else its thread (the todo's own thread tag, or the thread of the [meeting it was agreed in](threads.md#where-a-todo-was-agreed)); else its Project or Area.
- The Engage button on a meeting's note or page: the meeting's thread, or else its loop or its Project or Area. When something came out of the thread's meetings, Engage opens on [From Thread](engage.md#the-tabs). The meeting's [Reflection page](meetings.md#reflection-page) counts as its page.
- On a loop note: the loop. On a Project's or Area's [home notebook](projects-and-areas.md#home-notebooks) - this year's or an earlier one - that Project or Area, even when a loop's note has the same name. On any other note in a Project's or Area's folder: that Project or Area.
- On a note that belongs to none of them: the owner of the todo you were last working on.
- Nothing fits: Engage shows [Today's schedule](engage.md#choosing-another-owner) to choose from - the owners of today's meetings and [focus blocks](meetings.md#focus-blocks) that are not over yet.

When Engage shows another owner than the one of the todo you were working on, a line at the bottom, above **Open Kept GTD** and **Close**, offers the way back, for example **Continue with Measure the beds**. Tap it to return to that todo. It is offered once: if you close the panel without it, what the panel showed - the new place's next action - is the one you are working on from then on (with no next action there, nothing is). Choosing a todo in the new place does the same at once. After **Engage ›** there is no such line: you chose the owner yourself.

## Which owner a page belongs to

In a notebook several things share - a [home notebook](projects-and-areas.md#home-notebooks), a [loop note](loops.md#the-loop-note), a thread's notebook ([One notebook](note-setups.md#what-a-setup-is)) - a page you write yourself belongs to the nearest page before it that starts a *section*:

- a page with a heading (a Supernote title: Kept's, or your own, typed or handwritten), or
- a page Kept made: a todo's or meeting's page, a [Reflection page](meetings.md#reflection-page), the [Home page](projects-and-areas.md#the-home-page), a loop's first page. Kept's [keyword](note-setups.md#finding-notes-again) on the page is enough, even when its heading is missing.

So the follow-up pages after a meeting's page belong to that meeting: the [meeting line, the row under it](engage.md#on-a-meetings-page-before-during-after) and **From** work there as on the meeting's page. Follow-up pages of a todo's page make that todo the one you are [working on](engage.md#working-on) (while it is open). Your own heading starts a new section that belongs to the notebook's owner - a "Training plan" heading after a meeting page belongs to the Area again. The Home page belongs to the notebook's owner, a loop's first page to its loop while the loop is active.

A cancelled todo's or meeting's page still starts a section of its owner, but nothing becomes current and there is no meeting line. Pages before the first section, and notes Kept can't read, belong to the notebook's owner. A todo's or meeting's own note is as before: every page is its.

A line under the header names the section, for example "Section: Coach call · 24.10." on the meeting's page, "Section: Training plan · from p. 7" on a later page, or "Section: Handwritten section" for a handwritten heading. Kept can't read handwriting, so it doesn't say what the heading says.

A heading you just wrote on the open page counts once the Supernote saved the page, for example after you turned to another page and back.

## What belongs to an owner

Engage holds the same todos as the overviews:

- *A thread* holds what its [thread overview](threads.md#which-items-belong-to-a-thread) holds: todos with the thread's tag, the plain tag (`#jordan`), todos agreed in one of its meetings and `#owe/…` with the counterpart's name.
- *A loop* holds its tagged todos and the todos agreed in one of its meetings, also a meeting that is still running, as its [loop overview](loops.md#the-loop-overview) does.
- *A Project or Area* holds its todos except those of its [active loops](loops.md#where-loops-show), so a loop step never shows twice.

## On a meeting's page: before, during, after

On a meeting's note or page (its Reflection page too), a line under the header names the meeting, for example "Sparring Jordan · today 10:00–11:00", with a switch **Before · During · After** on the right. The time chooses: **Before** until the meeting starts, **During** until its planned end, **After** for seven days from then. A meeting without a time is Before before its day, During on its day and After from the next day. Older meetings get no line.

A meeting that ends early, or runs late: tap the moment you are in. Engage keeps your choice for this meeting until Kept GTD is closed; it is never written to a file.

Under the line, a row of buttons shows what fits the moment - at most three, and no row at all when nothing is needed:

- **Before**: **Mark prepped** (when the meeting's Note setup [tracks prep](meetings.md#preparation-and-review) and it isn't ticked yet) and **Note from last meeting ›** (opens the note of the previous meeting with this owner).
- **During**: **+ Next sparring** (the thread's type, or the loop's kind) when no meeting of the thread or loop is planned after this one. It opens Quick Add's Meeting tab with the next meeting copied from this one, see [+ Next sparring](threads.md#-next-sparring).
- **After**: **Reflect ›** (**Reflection ›** once it exists; not on the Reflection page itself) opens the meeting's [Reflection page](meetings.md#reflection-page) and closes the panel, **Mark reviewed** (when the setup tracks review), and **+ Next sparring** as above.

During and after the meeting, what you add in Engage's Quick Add records the meeting (see [Quick Add, marks and leaving](engage.md#quick-add-marks-and-leaving)).

## Next here and Today next

- **Next here**, under the header, names the owner's next meeting at any distance, for example "Next here: Thu 23.10. 10:00 Sparring Jordan ›". Tap it to open the meeting's note (or create it, after the [usual question](note-setups.md#before-a-note-is-created)); the panel closes. Without a meeting ahead the line is hidden, and so it is while it would name the meeting whose page you are on. For a loop the loop's own line names it (below).
- A *loop* has one line under the header, for example "Loop since 2.10. · 3 open   next: Thu 23.10. Workshop ›": since when it runs (its first meeting or todo), its open todos, and its next meeting, whose note a tap opens. With no meeting ahead it offers **+ Next workshop** instead.
- **Today next**, quiet above **Open Kept GTD**, names your next meeting today with a time, from all projects, areas and the [Inbox](quick-add.md#the-inbox), for example "Today next: 14:00 Plan the beds · in 40 min". How long until it starts shows only when it is less than three hours away. It is worked out when the panel opens or its data changes - there is no ticking clock. When it is the same meeting as Next here, it is left out and Next here says "· next today".

## Working on

The todo you are working on stands at the top under **Working on**. When you haven't chosen one and the owner has exactly one `#next`, that one stands there as **Next action** - usually a project has just one next action. With several `#next` and none chosen, Engage says **Pick your next action below.**

- A line with what matters about it: the [due date](tags.md#due-dates) (with "overdue"), or for a Waiting For who you are waiting for and when to follow up.
- The meeting it was agreed in, for example "From Sparring Jordan · 14.10. ›": tap it to open that meeting's note.
- The large **✓** on the right ticks it off.
- **w/f Jordan** makes it a Waiting For on the thread's [counterpart](threads.md) (`#wf/jordan` instead of `#next`); for a loop or a project it is **w/f**, a plain `#wf`. **Do someday** parks it. **Remove #next** (when it has `#next`) sends it back to the plan ([Flow tags for todos](tags.md#flow-tags-for-todos)).
- **Note ›** opens its note, or its page in a loop note or a shared notebook. Without a note, **+ Note** creates one the usual way: the [status line](index.md#the-status-line) first asks where it goes, and nothing is created without your confirmation.
- **File: name ›** opens the [file linked to it](quick-add.md#notes-and-files-on-a-todo-or-meeting), for example a PDF.

Opening the note or the file closes the panel: the note is in front now.

## The tabs

Below are the tabs, each with how many rows it lists, five per page. **From Thread**, **Waiting** and **Agreements** show only while they list something.

- **From Thread** (for a loop **From Loop**, for a Project or Area **From meetings**): what came out of the owner's meetings that have started, newest meeting first, under a line such as "Tue 14.10. · Sparring Jordan": the open todos agreed in it, the [agreements](agreements.md) made in it (◇), and last the todos you agreed there and have done, struck through. Done todos show for the meetings that matter now: before a meeting for the one before it, during it for both, after it for this one, and away from a meeting's note for the latest that is over. Tap a `#next` row to work on it, `#next` makes a planned one a next action, **Done** ticks off one you are waiting for (marked "· waiting"). Someday and Maybe are left out ([Also here](engage.md#also-here) counts them). A Project or Area has the tab only on a meeting's note. A todo that is agreed and `#next` shows under From Thread and under Next.
- **Next**: the owner's other `#next` todos. Tap one to work on it: it moves up to **Working on**. **Remove #next** on a row sends it back to the plan.
- **Plan**: the owner's todos without a flow state. `#next` on a row makes it a next action - it stays where it is, so you can mark several; then choose the one to work on under **Next**. **Someday** on a row parks it.
- **Waiting**: the todos you are waiting for - for a thread `#wf/jordan`, and a plain `#wf` agreed in the thread or tagged with it - with where they were agreed ("from 14.10.") and **Done**.
- **Agreements**: the owner's active agreements with since when and till when they hold ("– over" once that day has passed). Tap one to show **Change** and **End**, tap again to hide them. Change opens Quick Add with its words; End asks once. See [Changing and ending](agreements.md#changing-and-ending).

For a thread or a loop, Next and Plan list what you owe first - todos agreed in its meetings, and `#owe/…` for a thread - then the rest, each in the order of the file. A Project or Area keeps the order of the file.

Engage opens on **From Thread** from a meeting's note when it lists anything, else on **Next** when it lists anything, otherwise on **Plan**. It switches to **Plan** whenever **Next** runs empty, and away from **From Thread**, **Waiting** or **Agreements** when nothing is left there.

## Also here

Someday and Maybe todos are never offered to work on. One line under the tabs counts them, for example "Also here: 1 someday   Overview ›":

- **someday** (Someday and Maybe together) opens the Weekly Review's step [Someday / Maybe](review.md#someday--maybe), showing only this owner's todos.
- **Overview ›** opens the [thread's](threads.md#opening-the-overview) or [loop's overview](loops.md#the-loop-overview), or the Project's or Area's page.

The line hides when there are none. Todos you are waiting for are not counted here.

After Done, Remove #next, #next, w/f or Someday, a line shows what happened, with **Undo**. Undo puts the todo back as it was, as long as the panel is open and the todo was not changed elsewhere.

## When the owner is finished

With no open todo and no meeting ahead, Engage says **Nothing left in** the owner.

- A loop offers **Close loop…** (Done or Dropped, as in the loop overview, see [Closing a loop](loops.md#closing-a-loop)).
- **+ Add todo** opens Quick Add for the owner.
- **Today's schedule ›** shows today's schedule.

## Choosing another owner

Engage never moves on to another owner by itself. **Today's schedule ›** lists the owners of today's meetings and focus blocks that are not over yet, in time order: a line per loop, thread, Project or Area, with how many next actions it has or "pick next". The meetings of the [Inbox](quick-add.md#the-inbox) have no owner and no line. With nothing scheduled, it says **Nothing scheduled today.** Tap a line to work on that owner; **‹ Back** returns.

## Quick Add, marks and leaving

- **Go to** with the notebook's name, for example "Go to Garden renovation 2026 ›": when the owner is a project or area with a home notebook ([Projects and Areas](projects-and-areas.md#home-notebooks)) and you are in another of its notes, this line opens the notebook and closes the panel.
- **+ Quick Add** at the bottom opens Quick Add for the owner. For a loop or a thread, its tag is added to what you enter, shown in the [grey line](quick-add.md#the-grey-line-where-a-todo-comes-from) as `#sparring/jordan ✕`. During and after the meeting whose page you are on, new todos and agreements also record that meeting (`↳ from Sparring Jordan · Sat 24.10. ✕`). Tap a part's ✕ to add one entry without it. The **Agreement** tab adds an agreement to the owner's file, see [Who an agreement belongs to](agreements.md#who-an-agreement-belongs-to); it isn't there for an owner in the Inbox. **Cancel** folds it again.
- When the owner's Project or Area has [marks to process](lasso.md#processing-marks), a line says so; it opens Process marks, and Close there brings you back to Engage.
- **Open Kept GTD** opens the plugin as usual, **Close** (or ✕) closes the panel.

## After Done elsewhere

When you tick off a todo on [Daily](daily.md), the [Current](projects-and-areas.md#the-current-tab) tab or a thread or loop overview, and it was the last `#next` of its owner, the [status line](index.md#the-status-line) asks: "… has no next action. Pick one:" with up to three todos of the plan, and **Later**. Picking one gives it `#next`. Nothing is suggested at any other time.
