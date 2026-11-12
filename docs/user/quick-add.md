# Quick Add and capture

Quick Add is the small form you find on [Daily](daily.md), [Week](week-and-month.md#week), [Month](week-and-month.md#month), [Current](projects-and-areas.md#the-current-tab) and in the [Review](review.md). It adds and edits todos, meetings and notes. Where an item goes depends on the screen: on a project's Current tab it goes into that project, on Daily, Week and Month into the Inbox - unless you [file it right away](quick-add.md#filing-directly-with-an-abbreviation).

The box starts closed on [Daily](daily.md), [Week](week-and-month.md#week), [Month](week-and-month.md#month), a project's or area's [Current](projects-and-areas.md#the-current-tab) tab and the Review's [Inbox step](review.md#the-steps): large buttons, on two rows where the width ends, **+ Todo**, **+ Meeting** (and **+ Agreement**, **+ Note** where they are offered). A button opens that kind in the same box, with the cursor in its text field. **✕** in the last row closes it again; what you had typed stays for the next time. After **+ Add** the box closes by itself there, and the [status line](index.md#the-status-line) says where the item went. In a [thread](threads.md#opening-the-overview) or [loop overview](loops.md#the-loop-overview) and in the other Review steps it starts open on a todo; **✕** shows the kind buttons there too.

The box always keeps the same height, open or closed, so the lists below it never move:

- Rows 1 and 2: one text field over two lines - the todo's text, the meeting's title, the agreement's words or the note's title. It is still one line in the file: a new line from the keyboard or from handwriting becomes a space.
- Row 3: when and how - for a [todo](quick-add.md#adding-a-todo) 📅 and **w/f**, for a [meeting](quick-add.md#adding-a-meeting) date, time and **F**, for an [agreement](quick-add.md#adding-an-agreement) valid till, for a [note](quick-add.md#adding-a-note) its folder.
- Row 4: the clip or the linked file, the [grey line](quick-add.md#the-grey-line-where-a-todo-comes-from), **✕** and the main button - **+ Add**, or **Cancel** and **Save** while you [edit](quick-add.md#editing).

A tap on a todo, meeting or agreement puts its [card](quick-add.md#the-card-one-tap-selects) into the same box. Next, Someday, Maybe, **M**, delete and the other things you do with an item are on its card.

## The strips

While you write in the text field, a strip hovers above the box, as wide as the box. It shows one thing at a time: the [writing help](quick-add.md#writing-help) when it has something to say, else one of two views:

- ⚡ *Suggest*: on an empty field **Thread**, **Loop** and **Paste** ([Starting with a thread or loop](quick-add.md#starting-with-a-thread-or-loop)), then `#next` and `#someday` for a todo, tags you used lately and the [abbreviations](projects-and-areas.md#abbreviations) of places you used lately - as many as fit. A tap writes the tag where the cursor is. When you opened Kept from a file, **📎 This file** comes first, see [The file you opened Kept from](quick-add.md#the-file-you-opened-kept-from).
- *Clipboard*: **All**, **Copy**, **Cut** and **Paste**. It shows by itself while text is selected, and the suggestions come back when the selection ends.

The square before **✕** switches between the two; each time the box opens it starts on ⚡ Suggest. **✕** puts the strip away until you tap into the field again.

A date, time or valid-till field has its strip over the second line of the text field, so its first line stays readable; it is described under [Dates and times](quick-add.md#dates-and-times). While the status line shows an error or a question, no strip shows.

## Adding a todo

1. Tap **+ Todo** and write the text. Handwriting is recognized as you write. `#next` or `#someday` in the text - the strip offers both - make it a [Next or Someday todo](tags.md#flow-tags-for-todos).
2. Optionally tap 📅 for a [due date](tags.md#due-dates): the date field takes its place, with the cursor in it.
3. Optionally tap **w/f** (waiting for): "Waiting on" opens to its left for the name. Tap **w/f** again to drop it; the name goes too.
4. Tap **+ Add** at the bottom right.

Kept GTD writes the due date as `[due:: …]` at the end of the line and records the day you added the todo as `[created:: …]`, see [Dates Kept GTD records](tags.md#dates-kept-gtd-records). When you edit a todo, its created and done dates stay; clearing the due date in Quick Add removes it. Next, Someday and Maybe of a saved todo are changed on its [card](quick-add.md#the-card-one-tap-selects).

A space typed right after `#` is removed automatically, so handwritten tags are recognized; the [writing help](quick-add.md#writing-help) checks the rest.

## Adding a meeting

Tap **+ Meeting**, write the title, set the date (it starts at today) and the time. For the time field see [Meeting length](week-and-month.md#meeting-length) (for example `15-16.30` or `2d`); its strip changes the length and moves the meeting in steps, see [Dates and times](quick-add.md#dates-and-times). A warning sign in the row says the meeting is past or overlaps another one; the strips say which. **F** makes it a [focus block](meetings.md#focus-blocks), time of your own for a [loop](loops.md), [thread](threads.md), project or area. A [monthly highlight](week-and-month.md#month) (**M**) is set on the meeting's card. When a new todo or meeting lands in a project or area the current [context](contexts.md#where-it-applies) hides, the [status line](index.md#the-status-line) says so: "Saved to Team · hidden by Home".

## The grey line: where a todo comes from

Where a todo is agreed in a meeting - in a [thread overview](threads.md#opening-the-overview), in the Review step [Meetings to close out](review.md#the-steps), or when you [capture](lasso.md#capturing-right-away) from a meeting's note page - Quick Add shows one grey line in its last row, for example `↳ from Sparring Jordan · Wed 30.9.`. The new todo then records that meeting at the end of its line; its tags stay as you type them. In a thread overview the line also names the thread's tag, which new todos get (for example `#sparring/jordan ✕`). Each part has its own ✕: tap it to add this one todo without it. See [Where a todo was agreed](threads.md#where-a-todo-was-agreed).

When no meeting is the todo's origin but you opened Kept from a note - or [capture](lasso.md#capturing-right-away) from one - the grey line names that note, for example `↳ from Ideas`, and the new todo records it at the end of its line as `[source:: 1 Projects/Garden renovation/Ideas]`. A todo has at most one origin, never both. Its card shows it as `↳ Ideas ›`, which opens the note; when the note is a todo's own note, the card names that todo instead, for example `↳ Order soil ›`. A note you move or rename later is still named, but may no longer open.

## Adding an agreement

Where Quick Add knows [who an agreement is with](agreements.md#who-an-agreement-belongs-to) - a thread or loop overview, a project's or area's page - it offers **+ Agreement**: the words with their tags, and in row 3 [valid till](agreements.md#adding-one), whose strip offers **none**, **+1 m**, **+3 m**, **end of year** and **…** for another day. See [Agreements](agreements.md).

## Adding a note

On a project's or area's [Current](projects-and-areas.md#the-current-tab) tab, **+ Note** creates a new Supernote note with the title you write; row 3 shows the folder it goes to, the one the [Files pane](projects-and-areas.md#files-and-linked-files) is showing inside the project or area. **+ Create** creates it. Tags in the title become the note's [keywords](note-setups.md#finding-notes-again).

## Filing directly with an abbreviation

Every project and area has a short [abbreviation](projects-and-areas.md#abbreviations), for example `GR` for "Garden renovation". Write `#GR` in the text and the button changes to **+ Add to Garden renovation**: the item is created right there instead of in the Inbox, and the tag is removed from the text. On [Daily](daily.md) the next item then starts with `#GR ` already in the field, so a run of items for one project needs the tag once; delete it to add the next item to the Inbox. Other screens start the next item empty.

## Writing help

Handwriting recognition makes small mistakes: a capital I for an l, an o for a 0, a space after a slash. Quick Add looks at what it just wrote - only then, never while you write - and the [strip](quick-add.md#the-strips) shows one thing at a time. It only suggests: a tag changes when you tap, and a date or time only when it can be read just one way, always shown with **Undo**. The strip goes back to its suggestions the next time you tap into the field.

### Starting with a thread or loop

While a new todo's text or a new meeting's title is still empty, the strip offers **Thread** and **Loop** - where you have a [Note setup](note-setups.md#what-a-setup-is) of that kind - and **Paste** when there is text on the clipboard. **Thread** lists the tags of your first three thread setups, for example `#sparring`; tap one and the field reads `#sparring/`, and the strip offers its [counterparts](threads.md) to finish the tag. **Loop** does the same for your [loops](loops.md). **‹** goes back. As soon as there is text in the field, the strip offers tags instead.

### Tag suggestions

Each tag that recognition writes is compared with the tags you already use: in your todos and meetings, your [Note setups](note-setups.md#what-a-setup-is), [abbreviations](projects-and-areas.md#abbreviations), [counterparts](threads.md), [contexts](contexts.md) and recent tags. Capital letters never count as a difference: `#Sparring` is your `#sparring`.

- When a tag is close to one you use - `#sparrlng`, `#Iena`, `#workshops` - the strip shows the tag it means, for example **→ #sparring**, then **Keep** and **Edit ›**. Up to two such tags, in the order of the text.
- **→ #sparring** replaces the tag, wherever it is written that way in the text; **Keep** leaves every suggested tag as written; **Edit ›** shows **All**, **Copy**, **Cut** and **Paste**.
- A nested tag is checked part by part: the type against your tags, the part after the slash against that type's counterparts. A part that is right keeps its spelling, so only the part that is off changes, and the strip shows the whole tag, for example **→ #sparring/jordan**.
- Two spaces are removed without asking, so a handwritten tag is one tag: a space right after `#`, and a space right after a `/` inside a tag (`#sparring/ jordan` becomes `#sparring/jordan`). A wide ＃ counts as `#`.

When every tag is known or answered, the strip says where the item's note page would go, for example "✓ Sparring · Coaching 2026.note" - the same place the [note icon](quick-add.md#notes-and-files-on-a-todo-or-meeting) uses. A tag you have never used, with nothing close, is no question: "New tag #offsite27 · Team offsite 2026.note".

A tag you corrected once is corrected the same way next time, see [Learned corrections](tags.md#learned-corrections).

### Completing a tag

Whenever the cursor rests right after an unfinished tag - while you type it letter by letter, after handwriting, or when you tap there - the strip offers up to three of your tags that start with it: `#spa` offers **#sparring** and **#sparring/jordan**. After a type and a slash, `#sparring/`, it offers that type's counterparts, the most recent first. An abbreviation shows its project or area next to it: **#gr Garden renovation**. A tap puts the tag in place, followed by a space.

### Dates and times

In the date fields and the meeting's time field, letters that look like digits are read as digits (`l` and `I` as 1, `O` as 0, `S` as 5, `B` as 8 and so on), and a comma, semicolon or space between digits as a separator.

- *Dates*: `9.11.2026`, `09.11.26`, `9.11.` and `9.11` (the next 9 November), `2026 11 09`, `2026.11.09` and `20261109`. Where only one order of day and month is a date, that one is taken: `11.13` is 13 November.
- *Times*: `15,30`, `15 30` and `1530` are 15:30, `930` is 9:30, `15h` is 15:00; `–` and `bis` make a range, as `-` does ([Meeting length](week-and-month.md#meeting-length)).

When what recognition wrote can be read only one way, Quick Add writes it and the strip says so: "read as Mon 9 Nov 2026" or "read as 15:30 – 16:00 · 30 min", with **Undo**, which puts back what was written. When it can be read two ways, the strip asks "Did you mean" with both: an hour from 1 to 6 without minutes offers the afternoon first (`3-4`: 15:00 – 16:00, then 3:00 – 4:00), and one digit after the hour offers both minutes (`15,3`: 15:30 or 15:03). What cannot be read stays as written, and **+ Add** says what is wrong, as before.

While the cursor is in a date or time field, its strip lies over the second line of the text field, with **✕** at its end. Its left side shows one thing: what was just read ("read as …" with **Undo**, or "Did you mean"), else a warning in short ("⚠ past", "⚠ Team sync 15:00"), else what the field holds - the full date and weekday, "Tue 10 Nov 2026", or the meeting's length. Then the buttons of the ± *Adjust* view:

- *Date*: -1, **Today**, +1 and +7. This is also how a meeting of several days moves.
- *Time with only a start* (`15:00`): **1 h** sets the end an hour later; **‹ 30′** and **30′ ›** move it half an hour; **1 d** makes it a meeting for the whole day.
- *Time with start and end* (`15:00-16:30`): **−30′** and **+30′** change the end; **‹ 30′** and **30′ ›** move start and end; **1 d** makes it a whole day.
- *Days* (`2d`): **−1 d** and **+1 d**. To go back to a timed meeting, write a time.

A button that can't act is greyed, not hidden: **−30′** at 30 minutes, a step past midnight, **−1 d** at one day. On a narrow screen the steps read **‹**, **›**, **1h**, **+30** and **−30**.

### Warnings and the usual time

A new meeting that starts in the past, or overlaps another meeting that day, shows a warning sign in row 3 and the warning on the left of its date and time strips ("⚠ past", "⚠ Team sync 15:00"). They only inform: nothing is moved or held back.

When the meeting's tags name a [thread](threads.md) or a [loop](loops.md) that has met before, the strips have a second view, ⚡ *Suggest*, behind the square before **✕**: the time strip offers the usual slot, for example "usual Tue 14:00 – 14:45" - the weekday and start most of its last five meetings share, else the last one, with the usual length - and the date strip the next such day, "usual Tue → 17 Nov", which also fills in the usual time while the time field is empty. An empty time field opens on this view.

### Adding with a suggestion open

When you tap **+ Add** while a tag suggestion is still open, Kept saves nothing yet: the strip shows the suggestion again and the [status line](index.md#the-status-line) says "Check #sparrlng, or Add again to keep it". Tap **+ Add** a second time to save the item as written.

## The card: one tap selects

Tap a todo or a meeting in a list with Quick Add: the row gets a black bar and the item's *card* takes Quick Add's place, in the same box. Everything you can do with the item is on its card, on one page; nothing is saved until you tap a button there. **✕** closes the card. After **+ Add** the box shows the new item's card where the screen lists it ([Daily](daily.md) and a project's or area's page); otherwise the [status line](index.md#the-status-line) says where it went.

The todo card shows:

- First row: **Todo**, where it lives (tap the name to open it) and its state - due, overdue, waiting for someone, someday, done or deleted (`Todo · Garden renovation › · due 5.11.`), then **+ Todo** and ✕. **+ Todo** opens a new todo for the same place; on [Daily](daily.md) it starts with that place's [abbreviation](quick-add.md#filing-directly-with-an-abbreviation).
- Second row: the text. A tap on it opens [Edit](quick-add.md#editing).
- Third row: **Next**, **w/f**, **Someday** and **Maybe** - tap to set the [flow state](tags.md#flow-tags-for-todos), tap the filled one to clear it. On the right the [meeting it was agreed in](threads.md#where-a-todo-was-agreed) (for example `↳ Sparring Jordan ›`, which opens that thread's overview).
- Fourth row: **Done** to tick it; **+ Note** or **Note ›** for its [note](quick-add.md#notes-and-files-on-a-todo-or-meeting); the clip - a linked file's name (tap to open, ✕ removes the link), or **+** with the clip to link one; where a Files pane is there, the arrow that moves the todo to another project or area; the trash icon, which asks first and then removes the todo from your lists - it stays in the file, marked as cancelled.

Moving an item that has a note asks first: its own note moves along into the new project's `Todos` or `Meetings` folder. A page in a shared note stays in that note, and the item keeps its link to that page.

The meeting card is described in [The meeting row and its card](meetings.md#the-meeting-row-and-its-card). Cards exist wherever a list has Quick Add (an Inbox item on Daily's **Inbox** tab and in the Review shows its [Inbox card](daily.md#filing-from-the-inbox)): [Daily](daily.md), a project's or area's [Current](projects-and-areas.md#the-current-tab) tab, the Review's [Inbox step](review.md#the-steps), the [thread](threads.md#opening-the-overview) and [loop overviews](loops.md#the-loop-overview), and (for meetings) the day panel of [Week](week-and-month.md#week) and [Month](week-and-month.md#month).

## Editing

A tap on the card's title, or a second tap on the selected row, opens the item in Quick Add. Change what you need, then **Save** - or **Cancel** - at the bottom right; **Save** brings you back to the card. Only one item is edited at a time: tapping another row saves the open edit first. With an [abbreviation tag](quick-add.md#filing-directly-with-an-abbreviation) in the text, **Save** reads **Save to** followed by that project's name: it saves your changes and moves the item there in one step.

## Notes and files on a todo or meeting

Every todo and meeting can have its own handwritten note - one of Kept's most useful features. One tap creates it, already filled in: title, date and time, related open todos, a background from your templates. Next time the same tap opens it again.

- **+ Note** on the card (on the rows of the overviews also the note icon, + with a notebook) creates a note for the todo or meeting and opens it, after you confirm what will be created in the [status line](index.md#the-status-line); **Note ›** on the card, or the [notebook icon](projects-and-areas.md#the-notebook-icon) on the row, opens it later. How the note looks and where it goes is set by [Note setups](note-setups.md); by default it is a page in the project's or area's [home notebook](projects-and-areas.md#home-notebooks).
- The clip icon links an existing file (for example a PDF from Resources, or one from `Document` on the Files pane's **Device** tab, see [Files outside Note](files-and-folders.md#files-outside-note)). Select the todo or meeting and tap **+** and the clip on its card, then tap the file in the [Files pane](projects-and-areas.md#files-and-linked-files) (on Daily in the file picker that takes the list's place, see [Linking a file from Daily](daily.md#linking-a-file-from-daily)). A filled clip opens the linked file. To remove a link, tap ✕ next to the file's name on the card.

## The file you opened Kept from

When you opened Kept from a note or a document - a PDF, an EPUB - the [strip](quick-add.md#the-strips) of a new todo or meeting offers **📎 This file** first. Nothing is linked until you tap it: then the new item links that file - a document with the page you were on, a note without a page - and the last row shows the file's name with **✕** to drop it again. It is offered on a project's or area's page, [Daily](daily.md), [Week](week-and-month.md#week), [Month](week-and-month.md#month), the [thread](threads.md#opening-the-overview) and [loop overviews](loops.md#the-loop-overview) and in [Engage](engage.md); when Kept can't tell which file it was opened from, it isn't. The same file is offered at the top of the Files pane when you link a file, see [Files outside Note](files-and-folders.md#files-outside-note).

## Capturing handwriting with the lasso

Select handwriting in any note and tap [Capture Todo/Meeting](lasso.md#capturing-right-away) in the lasso toolbar: Kept recognizes it and opens the same form, with **Save & next**, **Save & view** and **Save & close**. [Mark for later](lasso.md#marking-for-later) saves a selection for later without opening Kept. Open marks show as a card [n marks to process](lasso.md#processing-marks) on the [Inbox](daily.md#the-inbox) tab. Both are explained in [Lasso: capture and mark for later](lasso.md).
