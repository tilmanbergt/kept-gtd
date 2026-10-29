# Meetings

A meeting has a date, an optional time or length, and a title that can carry tags. Meetings live in the file of their project or area ([Inside project.txt](files-and-folders.md#inside-projecttxt)), or in the [Inbox](quick-add.md#the-inbox). Lists of meetings and [focus blocks](meetings.md#focus-blocks) are called *Schedule*.

## Where meetings show up

- [Daily](daily.md): today and tomorrow
- [Week](week-and-month.md#week): the week grid; tap a day for the full list
- [Month](week-and-month.md#month): only monthly highlights (the **M** mark); a focus block marked **M** shows with its name and an **F**, the others only in the day's list; tap a day for all its meetings
- [Current](projects-and-areas.md#the-current-tab): all meetings of that project or area, upcoming and past

## Focus blocks

A focus block is time you give yourself for a [loop](loops.md), a [thread](threads.md), a project or an area - writing, preparing, thinking. Switch on **F** next to **M** in [Quick Add's Meeting form](quick-add.md#adding-a-meeting), or on a [meeting's card](meetings.md#the-meeting-row-and-its-card). The line gets the tag `#focusblock`, so in your files it stays an ordinary meeting, for example `- 2026-10-15 09:00-10:30 Prepare the workshop #workshop/offsite #focusblock`.

- Focus blocks show a filled **F** wherever meetings show; a day's line counts both: "Thu 15.10. · 2 meetings · 1 focus".
- The card says **Focus** instead of **Meeting** and links its loop or thread (for example `workshop offsite ›`).
- Focus blocks have no [prep or review mark](meetings.md#preparation-and-review), no [Reflection page](meetings.md#reflection-page), and never appear in [Meetings to close out](review.md#the-steps).
- Their note follows a [Note setup](note-setups.md#what-a-setup-is) that matches their tags. Without one, the note button opens the project's or area's [home notebook](projects-and-areas.md#home-notebooks) instead of creating a note.
- They count in [Given time](week-and-month.md#given-time) on Week and Month.

## The context panel

Tap a meeting or focus block on [Daily](daily.md#schedule-and-cards), [Week](week-and-month.md#week) or [Month](week-and-month.md#month): its [card](meetings.md#the-meeting-row-and-its-card) shows, and below it the *context panel* with everything around it.

- A [thread](threads.md)'s meeting: [I owe](threads.md#how-a-todo-relates-to-a-thread), **Next**, **Planned** (todos without a flow state, such as agenda points), **Waiting for** and **Agreed last time**. The panel lists all of them, also what Daily leaves out - todos without **Next** and Waiting for todos with a later date - so you have the whole context for the session.
- A [loop](loops.md)'s meeting or block: what is next and planned, what you wait for and what came out of its meetings.
- A plain meeting: what is linked to it, or - with nothing linked - its project's or area's next, planned and waiting todos ("Nothing linked to this meeting yet · showing its project").

Tick a todo there, open its note or its file. Tap a todo to see its [card](quick-add.md#the-card-one-tap-selects) in Quick Add's place, tap it again (or [Edit](quick-add.md#editing), or its title on the card) to change it; its ✕ and **Save** bring the meeting's card back.

**+ Quick Add to meeting** (**+ Quick Add to block**) opens Quick Add for it, on the Todo tab; the button says where the todo goes, for example **+ Add to Coaching** - no [abbreviation](quick-add.md#filing-directly-with-an-abbreviation) to type. Before the meeting the todo gets the thread's or loop's tag; during and after it also [records the meeting](quick-add.md#the-grey-line-where-a-todo-comes-from), as in [Engage](engage.md#on-a-meetings-page-before-during-after). **‹ Back to the card** returns.

**✕ Close** next to **Overview ›** closes the meeting, like the card's ✕: Daily shows its next todos again, Week and Month their [Given time](week-and-month.md#given-time).

On Week the panel has a line on top, for example "‹ Back to Week 42 · Thu 15.10. · 2 meetings ›": the left part closes it, the right part opens that day.

## The meeting row and its card

A meeting row shows the time, the title (tap a tag in it as anywhere else), where the meeting lives, a small [prep/review mark](meetings.md#preparation-and-review), the [note icon](meetings.md#meeting-notes) and - only when a file is linked - the clip, which opens that file.

Tap the title, or the small mark, to select the meeting: the row gets a black bar and the meeting's *card* takes Quick Add's place, in the same box. Tap [Edit](quick-add.md#editing) or the title on the card - or the row a second time - to change its title, date or time; **Save** brings you back to the card. **✕** closes the card; Quick Add comes back with whatever you had started to type. This works wherever a meeting list has Quick Add: Daily, the day panel of Week and Month, a project's or area's [Meetings](projects-and-areas.md#the-current-tab), the [Inbox](quick-add.md#the-inbox), the Review's [Inbox step](review.md#the-steps) and the [Ahead](threads.md#ahead) list of a thread or [loop overview](loops.md#the-loop-overview).

The card shows:

- First row: **Meeting** and whether it is ahead, today, over or cancelled; the meeting's thread (for example `#sparring/jordan ›`), which opens the [thread overview](threads.md#opening-the-overview); ✕ and **Edit**.
- Second row: the title with its tags, and when.
- Third row: **P** before the meeting or **R** after it, when the meeting's Note setup [tracks that](meetings.md#preparation-and-review) - tap to tick, filled means done, tap again to undo; **M** for a [monthly highlight](week-and-month.md#month); **F** for a [focus block](meetings.md#focus-blocks); the [note icon](meetings.md#meeting-notes); once the meeting is over, the [Reflect](meetings.md#reflection-page) icon (a loop turning back with a question mark; filled once the reflection page exists); the [linked file](quick-add.md#notes-and-files-on-a-todo-or-meeting)'s name (tap it to open it, ✕ removes the link), or **+** and the clip to link a file where a [Files pane](projects-and-areas.md#files-and-linked-files) is there to pick from (a project's or area's page, the Inbox).
- Fourth row: where the meeting lives (tap the name to open it; where a Files pane is there, the arrow next to it moves the meeting to another project or area), **New from this** (two pages: a new meeting with the same title, date and time, for example the [next session of a series](meetings.md#cancelling-and-repeating)) and **Cancel meeting** (a calendar with a cross; it asks first, and the meeting stays in the file, marked as cancelled).

2-line rows show a monthly highlight as a small M.

## Meeting notes

Tap the note icon on a meeting to create its note; the [status line](index.md#the-status-line) first says which file or page will be created (see [Before a note is created](note-setups.md#before-a-note-is-created)). Kept GTD fills it according to the [Meeting page](note-setups.md#the-page-layout) of the matching [Note setup](note-setups.md), or the [Default](note-setups.md#the-default)'s: for example title, date, time and the open todos that share a tag with the meeting. Until the end of the meeting (for a meeting without a time: the end of its day), this information is refreshed each time you open the note from Kept. After that the note is left as it is.

Instead of one note per meeting, a Note setup can put all its meetings and todos as pages into [one notebook](note-setups.md#what-a-setup-is) per project, for example one "Team sync" note with a page per meeting.

## Preparation and review

For meetings that need preparing or following up, switch on **Prepare before** and/or **Review after** in the meeting's [Note setup](note-setups.md#editing-a-setup) (or in the [Default](note-setups.md#the-default), for meetings no setup covers). The meeting row then shows a small mark:

- **P** before the meeting, until you tick it (it becomes `#prepped`)
- **R** after the meeting, until you tick it (it becomes `#reviewed`)
- a check mark when the current phase is done

You tick it on the meeting's [card](meetings.md#the-meeting-row-and-its-card): select the meeting, then tap **P** or **R**. When you edit a meeting, its title shows without `#prepped` and `#reviewed`, and **Save** keeps the tick as it is.

Past meetings that still need a review appear in the Review step [Meetings to close out](review.md#the-steps) (last 7 days).

## Reflection page

After a meeting, you may want to reflect on it in your own handwriting: how did it go, what did I notice, what do I try next time. Every meeting that is over (and not cancelled) can have one **Reflection page** for that. It is not a todo and not a [review](meetings.md#preparation-and-review): nothing counts it and nothing reminds you of it, and writing it never ticks `#reviewed`.

Tap the **Reflect** icon on the selected meeting's [card](meetings.md#the-meeting-row-and-its-card). The first time, the [status line](index.md#the-status-line) asks, for example "Sparring: reflection page in Coaching 2026.note, after the meeting's page" - tap **Add page**. When the meeting has no page yet, it says "…: pages for the meeting and its reflection in …" and **Add pages** creates both. After that the icon is filled and opens the page.

- *Where it goes*: in the meeting's note, after the meeting's page and every page you added to it by hand, before the next meeting's or todo's page. In a meeting's own note it is the last page.
- *What is on it*: the Reflection page of the meeting's Note setup, or the Default's - at first just the date and title as a heading. Add your guiding questions as texts of your own, see [The page layout](note-setups.md#the-page-layout).
- *Finding it*: its [keyword](note-setups.md#finding-notes-again) is `reflection` with the meeting's date and title (for example `reflection 2026-10-14 Sparring Jordan`), plus the meeting's tags. When you rename the meeting, the keyword follows the next time you open the page from Kept.
- *Part of the meeting*: on the reflection page, [Engage](engage.md) and [lasso capture](lasso.md#capturing-right-away) treat it as the meeting's page - todos you capture there were agreed in that meeting, and Engage opens on [From Thread](engage.md#the-tabs).

You also reach it from the Review step [Meetings to close out](review.md#the-steps), from a past meeting in a [thread overview](threads.md#looking-back), and from Engage on the meeting's page: [Reflect ›](engage.md#on-a-meetings-page-before-during-after) after the meeting.

## Cancelling and repeating

**Cancel meeting** on the meeting's card cancels it after asking; it stays in the file, marked as cancelled. Kept has no repeating meetings: for a series, use **New from this** to create the next one with the same title, and give the series its own tag (for example `#team-sync`). With a [nested tag](tags.md#nested-tags) such as `#sparring/jordan`, the series becomes a [thread](threads.md): its overview offers [+ Next sparring](threads.md#-next-sparring), which picks the next date for you.

## From Google Calendar

With the experimental [Google Calendar](features.md#google-calendar) integration you can copy calendar events into Kept meetings.
