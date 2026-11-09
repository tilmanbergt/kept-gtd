# Quick Add and capture

Quick Add is the small form you find on [Daily](daily.md), [Week](week-and-month.md#week), [Month](week-and-month.md#month), [Inbox](quick-add.md#the-inbox), [Current](projects-and-areas.md#the-current-tab) and in the [Review](review.md). It adds and edits todos, meetings and notes. Where an item goes depends on the screen: on a project's Current tab it goes into that project, on Daily, Week and Month into the Inbox - unless you [file it right away](quick-add.md#filing-directly-with-an-abbreviation).

The box has four rows and always keeps the same height, so the lists below it never move:

- Row 1: the tabs [Todo](quick-add.md#adding-a-todo), [Meeting](quick-add.md#adding-a-meeting) (and [Agreement](quick-add.md#adding-an-agreement), [Note](quick-add.md#adding-a-note)) on the left, the main button on the right - **+ Add**, or **Cancel** and **Save** while you [edit](quick-add.md#editing).
- Row 2: the text or title, and the date.
- Row 3: [flow chips](tags.md#flow-tags-for-todos) or the meeting's [time](week-and-month.md#meeting-length), then tags.
- Row 4: more tags - or the [grey line](quick-add.md#the-grey-line-where-a-todo-comes-from).

A tap on a todo or meeting puts its [card](quick-add.md#the-card-one-tap-selects) into the same box.

While you write in the text or date field, a small strip hovers over the tabs: **All**, **Copy**, **Cut** and **Paste** for the text, -1, **Today**, +1 and +7 for the date. Tap **✕** at its end to put it away, for example to switch tabs. It comes back the next time you tap into a field.

## Adding a todo

1. Choose the **Todo** tab and write the text. Handwriting is recognized as you write.
2. Optionally tap a [flow chip](tags.md#flow-tags-for-todos): **Next**, **w/f** (waiting for), **Someday** or **Maybe**.
3. Optionally set a [due date](tags.md#due-dates). While the date field is active, a strip offers -1, Today, +1 and +7.
4. Tap **+ Add** at the top right.

Kept GTD writes the due date as `[due:: …]` at the end of the line and records the day you added the todo as `[created:: …]`, see [Dates Kept GTD records](tags.md#dates-kept-gtd-records). When you edit a todo, its created and done dates stay; clearing the due date in Quick Add removes it.

Recently used tags fill rows 3 and 4: tap one to insert it into the text, tap a filled one to remove it. **›** and **‹** at the end of row 4 page through more. A space typed right after `#` is removed automatically, so handwritten tags are recognized; the [writing help](quick-add.md#writing-help) checks the rest.

## Adding a meeting

Choose the **Meeting** tab, write the title, set the date and the time. For the time field see [Meeting length](week-and-month.md#meeting-length) (for example `15-16.30` or `2d`). The small **M** next to **+ Add** marks a [monthly highlight](week-and-month.md#month); **F** makes it a [focus block](meetings.md#focus-blocks), time of your own for a [loop](loops.md), [thread](threads.md), project or area. When a new todo or meeting lands in a project or area the current [context](contexts.md#where-it-applies) hides, the [status line](index.md#the-status-line) says so: "Saved to Team · hidden by Home".

## The grey line: where a todo comes from

Where a todo is agreed in a meeting - in a [thread overview](threads.md#opening-the-overview), in the Review step [Meetings to close out](review.md#the-steps), or when you [capture](lasso.md#capturing-right-away) from a meeting's note page - Quick Add shows one grey line in its fourth row, for example `↳ from Sparring Jordan · Wed 30.9.`. The new todo then records that meeting at the end of its line; its tags stay as you type them. In a thread overview the line also names the thread's tag, which new todos get (for example `#sparring/jordan ✕`). Each part has its own ✕: tap it to add this one todo without it. See [Where a todo was agreed](threads.md#where-a-todo-was-agreed).

## Adding an agreement

Where Quick Add knows [who an agreement is with](agreements.md#who-an-agreement-belongs-to) - a thread or loop overview, a project's or area's page - it has the tab **Agreement**: the words with their tags, and [valid till](agreements.md#adding-one), which offers **none**, **+1 m**, **+3 m**, **end of year** and **…** for another day. See [Agreements](agreements.md).

## Adding a note

On a project's or area's [Current](projects-and-areas.md#the-current-tab) tab, the **Note** tab creates a new Supernote note with the title you write. It is created in the folder the [Files pane](projects-and-areas.md#files-and-linked-files) is showing inside the project or area. Tags in the title become the note's [keywords](note-setups.md#finding-notes-again).

## Filing directly with an abbreviation

Every project and area has a short [abbreviation](projects-and-areas.md#abbreviations), for example `GR` for "Garden renovation". Write `#GR` in the text and the button changes to **+ Add to Garden renovation**: the item is created right there instead of in the Inbox, and the tag is removed from the text. The next item then starts with `#GR ` already in the field, so a run of items for one project needs the tag once; delete it to add the next item where the screen adds.

## Writing help

Handwriting recognition makes small mistakes: a capital I for an l, an o for a 0, a space after a slash. Quick Add looks at what it just wrote - only then, never while you write - and the hovering strip over the tabs shows one thing at a time. It only suggests: a tag changes when you tap, and a date or time only when it can be read just one way, always shown with **Undo**. The strip goes back to **All**, **Copy**, **Cut** and **Paste** the next time you tap into the field.

### Tag suggestions

Each tag that recognition writes is compared with the tags you already use: in your todos and meetings, your [Note setups](note-setups.md#what-a-setup-is), [abbreviations](projects-and-areas.md#abbreviations), [counterparts](threads.md), [contexts](contexts.md) and recent tags. Capital letters never count as a difference: `#Sparring` is your `#sparring`.

- When a tag is close to one you use - `#sparrlng`, `#Iena`, `#workshops` - the strip shows the tag it means, for example **→ #sparring**, then **Keep** and **Edit ›**. Up to two such tags, in the order of the text.
- **→ #sparring** replaces the tag; **Keep** leaves every suggested tag as written; **Edit ›** shows **All**, **Copy**, **Cut** and **Paste**.
- A nested tag is checked part by part: the type against your tags, the part after the slash against that type's counterparts. A part that is right keeps its spelling, so only the part that is off changes, and the strip shows the whole tag, for example **→ #sparring/jordan**.
- Two spaces are removed without asking, so a handwritten tag is one tag: a space right after `#`, and a space right after a `/` inside a tag (`#sparring/ jordan` becomes `#sparring/jordan`). A wide ＃ counts as `#`.

When every tag is known or answered, the strip says where the item's note page would go, for example "✓ Sparring · Coaching 2026.note" - the same place the [note icon](quick-add.md#notes-and-files-on-a-todo-or-meeting) uses. A tag you have never used, with nothing close, is no question: "New tag #offsite27 · Team offsite 2026.note".

A tag you corrected once is corrected the same way next time, see [Learned corrections](tags.md#learned-corrections).

### Completing a tag

When recognition ends with an unfinished tag, the strip offers up to three of your tags that start with it: `#spa` offers **#sparring** and **#sparring/jordan**. After a type and a slash, `#sparring/`, it offers that type's counterparts, the most recent first. An abbreviation shows its project or area next to it: **#gr Garden renovation**. A tap puts the tag in place, followed by a space.

### Dates and times

In the date fields and the meeting's time field, letters that look like digits are read as digits (`l` and `I` as 1, `O` as 0, `S` as 5, `B` as 8 and so on), and a comma, semicolon or space between digits as a separator.

- *Dates*: `9.11.2026`, `09.11.26`, `9.11.` and `9.11` (the next 9 November), `2026 11 09`, `2026.11.09` and `20261109`. Where only one order of day and month is a date, that one is taken: `11.13` is 13 November.
- *Times*: `15,30`, `15 30` and `1530` are 15:30, `930` is 9:30, `15h` is 15:00; `–` and `bis` make a range, as `-` does ([Meeting length](week-and-month.md#meeting-length)).

When what recognition wrote can be read only one way, Quick Add writes it and the strip says so: "read as Mon 9 Nov 2026" or "read as 15:30 – 16:00 · 30 min", with **Undo**, which puts back what was written. When it can be read two ways, the strip asks "Did you mean" with both: an hour from 1 to 6 without minutes offers the afternoon first (`3-4`: 15:00 – 16:00, then 3:00 – 4:00), and one digit after the hour offers both minutes (`15,3`: 15:30 or 15:03). What cannot be read stays as written, and **+ Add** says what is wrong, as before.

While the cursor is in a date field, its strip starts with the full date and weekday, "Tue 10 Nov 2026", then -1, **Today**, +1 and +7. The meeting's time field has a strip too, with the time and its length: "15:30 – 16:00 · 30 min".

### Warnings and the usual time

The date and time strips of a new meeting add a warning when the meeting starts in the past ("past"), or when it overlaps another meeting that day ("overlaps Team sync 15:00"). They only inform: nothing is moved or held back.

When the meeting's tags name a [thread](threads.md) or a [loop](loops.md) that has met before, the date strip - and the time strip while its field is empty - offers the usual slot as one more button, for example "Tue 17 Nov 14:00 · 45 min": the weekday and start most of its last five meetings share, else the last one, with the usual length, on the next such day. One tap fills the date, the time and the end.

### Adding with a suggestion open

When you tap **+ Add** while a tag suggestion is still open, Kept saves nothing yet: the strip shows the suggestion again and the [status line](index.md#the-status-line) says "Check #sparrlng, or Add again to keep it". Tap **+ Add** a second time to save the item as written.

## The Inbox

Whatever you add without a project or area lands in the Inbox: from Daily, Week and Month, from a [lasso capture](lasso.md#capturing-right-away) you don't file right away, and [marks](lasso.md#marking-for-later) from notes outside your projects and areas. The **Inbox** tab shows all of it, grouped by [flow state](tags.md#flow-tags-for-todos) into Next, Waiting For, Someday, Maybe and Other; **Hide done tasks** keeps it short. The [Files pane](projects-and-areas.md#files-and-linked-files) on the left lets you look into your projects, areas and resources, and the Supernote's other folders ([Device](files-and-folders.md#files-outside-note)), while you sort.

To empty the Inbox, tap each item and, on its [card](quick-add.md#the-card-one-tap-selects), either finish it, delete it, or move it with the arrow next to its place (or an [abbreviation tag](quick-add.md#filing-directly-with-an-abbreviation) while editing). The [Weekly Review](review.md) has a step [Inbox to zero](review.md#the-steps) for exactly this.

## The card: one tap selects

Tap a todo or a meeting in a list with Quick Add: the row gets a black bar and the item's *card* takes Quick Add's place, in the same box. Everything you can do with the item at once is on its card; nothing is saved until you tap a button there. **✕** closes the card, and Quick Add comes back with whatever you had started to type.

The todo card shows:

- First row: **Todo** and its state - due, overdue, waiting for someone, someday, done or deleted; the [meeting it was agreed in](threads.md#where-a-todo-was-agreed) (for example `↳ Sparring Jordan ›`, which opens that thread's overview); ✕ and [Edit](quick-add.md#editing).
- Second row: the text and its [labels](daily.md#labels).
- Third row: the box to tick it done; the [flow chips](tags.md#flow-tags-for-todos) **w/f**, **Maybe**, **Someday** and **Next** (tap one to set it, tap the filled one to clear it); the [note icon](quick-add.md#notes-and-files-on-a-todo-or-meeting).
- Fourth row: where the todo lives (tap the name to open it; where a Files pane is there, the arrow next to it moves the todo to another project or area); its [linked file](quick-add.md#notes-and-files-on-a-todo-or-meeting) (tap the name to open it, ✕ removes the link), or **+** and the clip to link one where a Files pane is there; at the right the trash icon, which asks first and then removes the todo from your lists - it stays in the file, marked as cancelled.

Moving an item that has a note asks first: its own note moves along into the new project's `Todos` or `Meetings` folder. A page in a shared note stays in that note, and the item keeps its link to that page.

The meeting card is described in [The meeting row and its card](meetings.md#the-meeting-row-and-its-card). Cards exist wherever a list has Quick Add: [Daily](daily.md), a project's or area's [Current](projects-and-areas.md#the-current-tab) tab, the Inbox, the Review's [Inbox step](review.md#the-steps), the [thread](threads.md#opening-the-overview) and [loop overviews](loops.md#the-loop-overview), and (for meetings) the day panel of [Week](week-and-month.md#week) and [Month](week-and-month.md#month).

## Editing

**Edit** on the card, a tap on the card's title, or a second tap on the selected row opens the item in Quick Add. Change what you need, then **Save** - or **Cancel** - at the top right; **Save** brings you back to the card. Only one item is edited at a time: tapping another row saves the open edit first. With an [abbreviation tag](quick-add.md#filing-directly-with-an-abbreviation) in the text, **Save** reads **Save to** followed by that project's name: it saves your changes and moves the item there in one step.

## Notes and files on a todo or meeting

Every todo and meeting can have its own handwritten note - one of Kept's most useful features. One tap creates it, already filled in: title, date and time, related open todos, a background from your templates. Next time the same tap opens it again.

- The note icon (+ with a notebook) creates a note for the todo or meeting and opens it, after you confirm what will be created in the [status line](index.md#the-status-line); the [notebook icon](projects-and-areas.md#the-notebook-icon) opens it later. How the note looks and where it goes is set by [Note setups](note-setups.md); by default it is a page in the project's or area's [home notebook](projects-and-areas.md#home-notebooks).
- The clip icon links an existing file (for example a PDF from Resources, or one from `Document` on the Files pane's **Device** tab, see [Files outside Note](files-and-folders.md#files-outside-note)). On a todo row, tap the `+` clip, then tap the file in the [Files pane](projects-and-areas.md#files-and-linked-files); or select the todo or meeting and tap **+** and the clip on its card. A filled clip opens the linked file. To remove a link, tap ✕ next to the file's name on the card.

## The file you opened Kept from

When you opened Kept from a note or a document - a PDF, an EPUB - Quick Add's Todo and Meeting tabs show one more line in the fourth row: the clip, the file's name and two choices, **p. 12** (the page you were on) and **no page** (the file opens where you last left it). The filled one is what a new todo or meeting links; tap it again to link nothing. From a document it starts on **p. 12**, so todos you add while reading point back to their page; from a note it starts off. The line is there on a project's or area's page, the [Inbox](quick-add.md#the-inbox), [Daily](daily.md), [Week](week-and-month.md#week), [Month](week-and-month.md#month), the [thread](threads.md#opening-the-overview) and [loop overviews](loops.md#the-loop-overview) and in [Engage](engage.md); when Kept can't tell which file it was opened from, it doesn't show. The same file is offered at the top of the Files pane when you link a file, see [Files outside Note](files-and-folders.md#files-outside-note).

## Capturing handwriting with the lasso

Select handwriting in any note and tap [Capture Todo/Meeting](lasso.md#capturing-right-away) in the lasso toolbar: Kept recognizes it and opens the same form, with **Save & next**, **Save & view** and **Save & close**. [Mark for later](lasso.md#marking-for-later) saves a selection for later without opening Kept. Open marks show as a card [n marks to process](lasso.md#processing-marks) on the [Inbox](quick-add.md#the-inbox) tab. Both are explained in [Lasso: capture and mark for later](lasso.md).
