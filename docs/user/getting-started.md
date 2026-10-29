# Getting started

This page walks you through Kept GTD for simple needs: capture your todos and meetings, write notes about them, and look at everything once a week. Each step links to the sections with the details; ‹ Back brings you here again. The examples come from the [demo space](profiles-and-demo.md#the-demo-space), which you can create to look around first.

## Install

1. Download the newest `kept-gtd-x.y.z.snplg` from the Releases page on GitHub (github.com/tilmanbergt/kept-gtd).
2. Copy it to your Supernote and install it as a plugin. Kept GTD needs the plugin firmware: A5 X and A6 X Chauvet 2.27.42 or later, Manta and Nomad Chauvet 3.30.45 or later.
3. Open any note, open the plugin sidebar and tap the Kept GTD icon. See [Opening Kept GTD from a note](index.md#opening-kept-gtd-from-a-note).

To update later, install the newer file over the old one. Read the [Upgrade notes](settings.md#about) in What's new (Settings → About) first.

## Your folders

Kept keeps everything in four folders inside your `Note` folder ([The folder layout](files-and-folders.md#the-folder-layout)):

- `1 Projects`: one folder per project
- `2 Areas`: one folder per area of responsibility, plus `0 Inbox` for the [Inbox](quick-add.md#the-inbox)
- `3 Resources`: reference material
- `4 Archive`: finished projects

Kept creates these folders when it first needs them, for example when you [create your first project](projects-and-areas.md#creating-one), or right away in the [setup assistant](settings.md#setup-assistant), which opens on the first start and shows every folder before it creates it. Nothing else is created behind your back.

Already have a folder system? Point [Settings → Folders](settings.md#folders) at it and tap **Save**. Every subfolder of your projects folder is then a [project](projects-and-areas.md), every subfolder of your areas folder an [area](projects-and-areas.md). Nothing is moved or renamed. See [Your files, folders and Obsidian](files-and-folders.md).

## Projects and areas

A *project* has an end, like "Garden renovation". An *area* is a responsibility without an end, like "Home". Create them on the [Projects](projects-and-areas.md) and [Areas](projects-and-areas.md) tabs: write the name and tap [Create Project](projects-and-areas.md#creating-one) or [Create Area](projects-and-areas.md#creating-one). Tap one to open its page on the [Current](projects-and-areas.md#the-current-tab) tab.

## Todos

Open a project and add todos with [Quick Add](quick-add.md), the small form above its lists: write "Measure the raised beds", tap **+ Add** ([Adding a todo](quick-add.md#adding-a-todo)).

- Mark the next step with the [Next](tags.md#flow-tags-for-todos) chip. The todo gets the tag `#next`, and [Daily](daily.md) shows it - that is the list for today.
- Give a todo a [due date](tags.md#due-dates): it shows on [Daily](daily.md#what-appears-on-daily) from the day before.
- Waiting for someone? The [w/f](tags.md#flow-tags-for-todos) chip, or a tag like `#wf/marco` for "waiting for Marco".
- Not now? [Someday](tags.md#flow-tags-for-todos) or [Maybe](tags.md#flow-tags-for-todos) parks it out of the way until the [weekly review](review.md#someday--maybe) brings it back.

Tap a todo to open its [card](quick-add.md#the-card-one-tap-selects): done, the flow chips, its note and delete. The tags are plain words in your files, see [Tags](tags.md).

## Meetings

Switch Quick Add to its [Meeting](quick-add.md#adding-a-meeting) tab: a title, a date and a time, for example "Plan the beds", today, `14-15.30` (more forms in [Meeting length](week-and-month.md#meeting-length)). [Daily](daily.md#schedule-and-cards) shows today's and tomorrow's meetings next to your todos. [Week](week-and-month.md#week) and [Month](week-and-month.md#month) give the longer view. Time you keep for yourself is a [focus block](meetings.md#focus-blocks). See [Meetings](meetings.md).

## Notes

Every todo and meeting can have a handwritten note. Tap its [note icon](quick-add.md#notes-and-files-on-a-todo-or-meeting): Kept first says in the [status line](index.md#the-status-line) where the note will go, then creates it and opens it, already filled with the title and date.

By default all notes of a project go into one notebook per year, its [home notebook](projects-and-areas.md#home-notebooks) - "Garden renovation 2026" - one page per todo or meeting, in time order. So everything about the garden is in one place. Creating a note only works when Kept was [opened from a note](troubleshooting.md#common-situations). If you prefer a note of its own for every todo or meeting, see [Note setups](note-setups.md#what-a-setup-is).

## Capture while you write

While you write in any note, select handwriting with the [lasso](lasso.md) and tap [Capture Todo/Meeting](lasso.md#capturing-right-away): Kept recognizes it and opens Quick Add with the text. No time to sort? [Mark for later](lasso.md#marking-for-later) keeps the selection with one tap, and you [file it later](lasso.md#processing-marks) from the [Inbox](quick-add.md#the-inbox).

Everything you add without a project lands in the [Inbox](quick-add.md#the-inbox).

## Once a week

The [Review](review.md) tab walks you through a weekly review, one step at a time: [empty the Inbox](review.md#the-steps), check that [every project has a next step](review.md#the-steps), look at [what you parked](review.md#someday--maybe).

## When you want more

- [Threads](threads.md): keep your word with the people you meet, for example your sparring with Jordan (`#sparring/jordan`): what you agreed, what you owe, what you wait for.
- [Loops](loops.md): small projects inside an area, like a workshop to prepare.
- [Agreements](agreements.md): what you settled with someone, kept where it belongs.
- [Engage](engage.md): your next action, in a small panel over the note you work in.
- [Contexts](contexts.md): Work, Home - see only what fits where you are.
- [Settings → Features](settings.md#features) switches parts on or off, see [Features and integrations](features.md).
