# Projects and Areas

In PARA, a *project* is something with a clear end ("Garden renovation", "Team offsite"). An *area* is a responsibility without an end ("Health", "Home", "Team"). Kept GTD gives each its own folder ([The folder layout](files-and-folders.md#the-folder-layout)).

## Creating one

On the **Projects** or **Areas** tab, write a name into the field at the top and tap **Create Project** or **Create Area**. Kept creates the folder and its file. A name can't contain `\ / : * ? " < > |` or `# [ ] ^` (see [File names](files-and-folders.md#file-names)); the [status line](index.md#the-status-line) says which character to remove.

You can also simply create a folder yourself - in the Supernote's file manager or on your computer - inside `1 Projects` or `2 Areas`. Every folder there is a project or area. The next time you open Kept it picks it up, gives it an [abbreviation](projects-and-areas.md#abbreviations) and creates its file.

## The Current tab

Every row on the Projects and Areas tabs ends with the [notebook icon](projects-and-areas.md#the-notebook-icon) of its [home notebook](projects-and-areas.md#home-notebooks). Tapping a project or area opens it on the **Current** tab:

- **Header**: name, kind and the [abbreviation](projects-and-areas.md#abbreviations) (tap to change it); [Notebook](projects-and-areas.md#the-notebook-icon) opens its home notebook, or creates it; [Engage ›](engage.md#opening-engage) opens [Engage](engage.md) for this project or area
- **Scope**: one to three sentences about what this project or area is about. Tap to edit.
- [Given time](week-and-month.md#given-time): `Given time · this week 3 h · this month 11 h` - the meetings and focus blocks scheduled in it (an area counts its projects' too); all-day events count as 8 h a day
- [Status](projects-and-areas.md#status): Active, On Hold, Done (projects only) - and [Close out…](close-out.md#where-to-start-it) or [Archive…](close-out.md#areas)
- [Files pane](projects-and-areas.md#files-and-linked-files): up to four tabs. On a project: [Threads](projects-and-areas.md#threads) (open when the page opens), [Loops](loops.md#where-loops-show), [Notebook](projects-and-areas.md#the-notebook-tab) and **Files**. On an area: **Threads**, [Projects](projects-and-areas.md#projects-of-an-area) (its projects at a glance), **Notebook** and **Files**. **Notebook** shows the home notebook with its years and contents; it is there while the [Default](note-setups.md#the-default) note setup uses one notebook. Inside **Files** a second row picks the place: **Project**, **Area** (once one is assigned), **Resources** and [Device](files-and-folders.md#files-outside-note) on a project; **Area**, **Resources** and **Device** on an area. **Device** shows the Supernote's folders next to `Note`, such as `Document`. **Files** opens on the page's own folder.
- **Todos** and **Meetings**, grouped and paged, with [Quick Add](quick-add.md) above them. Todos are grouped by [flow state](tags.md#flow-tags-for-todos): Next, Waiting For, Plan (no flow state: planned, not yet next), Someday and Maybe. Tapping a todo or meeting shows its card in Quick Add's place: for a todo done, the flow chips, linking a file, moving it and delete ([The card](quick-add.md#the-card-one-tap-selects)); for a meeting the prep or review tick, **Reflect** once it is over, linking a file and moving it ([The meeting card](meetings.md#the-meeting-row-and-its-card))
- **◇ Agreements 2 ›** at the end of the todos, when the project or area has agreements of its own (untagged, or with no thread or loop tag). Tap it to list them in the same column; **‹ Todos** goes back. Quick Add's [Agreement](quick-add.md#adding-an-agreement) tab adds one here, see [Agreements](agreements.md#where-agreements-show)

## Status

- **Active**: normal
- **On Hold**: paused on purpose. Stays out of pickers for new items; the [Review](review.md#the-steps) asks now and then whether to pick it up again.
- **Done** (projects only): finished. The Review step [Done awaiting review](review.md#the-steps) collects these for [closing out](close-out.md).
- **Archived**: moved to the Archive folder ([Where things end up](close-out.md#where-things-end-up)).

Putting an area on hold also puts its active projects on hold.

## Assigning a project to an area

A project can support one area. Tap **Assign to Area…** in the status section, then tap the area in the [Files pane](projects-and-areas.md#files-and-linked-files) (**Files** opens with **Browse** in place of **Project**, showing the areas, while you pick). The area's [Projects](projects-and-areas.md#projects-of-an-area) tab then lists the project. The project's files then also offer the area's folder. An area with active or on-hold projects can't be [archived](close-out.md#areas).

Once assigned, the button reads **Area: name ✕**. Tap the name to open the area; tap **✕** to remove the assignment. To move the project to another area, tap **✕** and then **Assign to Area…** again.

## Abbreviations

Every project and area gets a short abbreviation, suggested from its name (for example `GR`). You can change it; it must be unique. The Projects and Areas tabs show it after each name (`Garden renovation #GR`). Use it as a tag to [file items directly](quick-add.md#filing-directly-with-an-abbreviation).

## Files and linked files

The Files pane browses the project folder, Resources and the area's folder. Tap a file to open it. The pin icon in the Resources path sets the folder this project opens in Resources by default. To link a file to a todo or meeting, see [Notes and files on a todo or meeting](quick-add.md#notes-and-files-on-a-todo-or-meeting); for files outside `Note`, [Files outside Note](files-and-folders.md#files-outside-note).

Other projects and areas show in the Files pane only while you pick one:

- Refile (the arrow on a [card](quick-add.md#the-card-one-tap-selects)) and [Assign to Area…](projects-and-areas.md#assigning-a-project-to-an-area): **Files** opens, and its **Project** place turns into **Browse**, with Projects and Areas; the other places are greyed out. It turns back when you are done. On an area page the [Projects](projects-and-areas.md#projects-of-an-area) tab does this.
- Linking a file: **Files** opens on **Project**; the top of its list offers **Other Projects/Areas ›**, which opens Browse in the same place, so you can link a file from another project or area. On an area page the **Projects** tab turns into **Project Files** (the folders of its projects) while you link a file.

When you start one of these while **Threads**, **Loops** or **Projects** is open, the Files pane switches to the files for the pick and back to that tab when you are done.

To open another project or area, use the Projects or Areas tab.

## Projects of an area

On an area page, the **Projects** tab lists the projects assigned to the area: active ones first, by name, then a folded row `2 on hold ▸`. Done and archived projects are not listed. Each row has two lines:

- the project's name (and `on hold` in the folded group), with **›**;
- `last 30.9. · next 14.10.`: its latest meeting and the next one (`—` when there is none), and `7 open · 2 next · w/f 12 d`: open todos, how many of them are `#next`, and how long the oldest thing you wait for has waited. A project without a next action - no `#next` todo and nothing you wait for; planned, Someday and Maybe todos don't count - shows `no next action` instead of the `#next` count, as in the Review's [Stalled projects](review.md#the-steps). [Loops](loops.md#where-loops-show) show it the same way.

Tap a row to open the project. To browse the projects' folders, open the project; while you link a file, the tab shows them (see [Files and linked files](projects-and-areas.md#files-and-linked-files)).

## Threads

The **Threads** tab lists the [counterparts](threads.md) of this project or area: the people, teams and series behind [nested tags](tags.md#nested-tags) such as `#sparring/jordan`. On a project with an area it shows the area's counterparts that this project's todos and meetings use; the tab's heading then names the area (`Threads · Coaching`), because that is where they are kept.

- **New**: counterparts you use but haven't confirmed yet. **Tend** keeps them, **Not** sets them aside ([Tending counterparts](threads.md#tending-counterparts)). A counterpart you set aside that gets a new meeting comes back here as `back in use: name`.
- **Active**: the counterpart and, below it, `last 30.9. · next 14.10.` (its latest and next meeting) and what is open: `2 owe · w/f 18 d` (two todos you owe, the oldest thing you wait for has waited 18 days). A counterpart you only use with `#wf/name` or `#owe/name` shows `w/f only`, `owe only` or `w/f · owe only` instead of meeting dates. **▸** shows its threads (`#sparring/jordan · next 14.10.`) with **+ next**, which puts the next meeting into Quick Add's [Meeting](quick-add.md#adding-a-meeting) tab like [+ Next sparring](threads.md#-next-sparring) in the overview.
- **n inactive ▸**: the counterparts set aside, folded. Unfolded, **Tend** takes one back.

Tap a counterpart's name to open its [overview](threads.md#thread-or-all-of-the-counterpart).

Tap **Filter** on its row to filter the Todos and Meetings on the right: only todos you owe it, wait for from it or that are relevant for it (the [same three ways](threads.md#how-a-todo-relates-to-a-thread) as in its overview), and only its meetings. A todo agreed in your sparring with Jordan but tagged `#wf/lena` shows under both jordan and lena. The row's pill turns into **Filter ✕** and a pill `jordan ✕` above Quick Add shows the filter; tap either to show everything.

While a counterpart is filtered, its row offers [Set inactive](threads.md#tending-counterparts). With open todos you first decide for each one under **I owe**, **Waiting for**, **Relevant** and [Someday / Maybe](review.md#someday--maybe): **Done**, **Cancel** or **Keep** (Keep is preselected). Its active [agreements](agreements.md) follow under **Agreements**: **Keep** or **End**, or **End all**. **Set inactive** then applies them. With nothing open, one confirmation is enough. An inactive counterpart leaves the [Weekly Review](review.md#tending-threads) and the tag suggestions; its overview keeps working.

## Home notebooks

Every project and area has one obvious place to write: its *home notebook*. It is the notebook of the [Default](note-setups.md#the-default) note setup, made for that project or area - with the standard name `{name} {year}`, "Garden renovation 2026.note" in the project's own folder. One tap takes you there; then Kept gets out of the way.

The home notebook exists only while the Default uses [One notebook](note-setups.md#what-a-setup-is) (Settings → Note setups → Default → Notes). With **Own note per item** there are no notebook icons, no Notebook tab and no ["Go to" line](projects-and-areas.md#engage-go-to-the-notebook). The [Inbox](quick-add.md#the-inbox) has no home notebook.

### The notebook icon

A small notebook icon sits at the end of every row on the **Projects** and **Areas** tabs, and as **Notebook** at the top of a project's or area's page.

- *Plain notebook*: the notebook exists. A tap opens it on the page you last looked at in Supernote.
- *Notebook with +*: it doesn't exist yet. A tap asks first - "new file Garden renovation 2026.note" with **Create** - then creates it and opens its first page. Afterwards the [status line](index.md#the-status-line) names the new file and its folder.
- *A new year*: with `{year}` in the name, this year's notebook may be missing while last year's is there. Then the status line offers **Create 2027** and **Open 2026**.

Creating a note only works when Kept was opened from a note (a limit of the Supernote, see [Troubleshooting](troubleshooting.md#common-situations)).

### The Home page

A new home notebook starts with a **Home page**: the project's or area's name as a heading and its [Scope](projects-and-areas.md#the-current-tab). It is written once, when the notebook is created; after that it is your page. The Home page always stays page 1: the pages of todos and meetings go after it.

A todo's or meeting's note that is the first one in the Default notebook creates the notebook in the same way, with the Home page first and the todo's or meeting's page after it. A [note setup](note-setups.md#what-a-setup-is) whose notebook has the same name and folder as the Default's puts its pages into the same file.

You can change the Home page's layout in Settings → Note setups → [Default](note-setups.md#the-default) → **Home page** ([The page layout](note-setups.md#the-page-layout)). Besides Title and static texts it offers **Scope**. A **Latest goals** piece placed by an earlier version stays in the layout and prints nothing.

### The Notebook tab

A project's or area's page has a **Notebook** tab next to Threads and Loops (Projects on an area):

- the notebook's name with **Open** (the page you last looked at)
- a chip for every year that has a notebook, this year first; a missing current year shows as **+ 2027** and creates it. The chip you choose decides what Open and the contents show.
- [Contents](projects-and-areas.md#contents-experimental): the headings of the notebook in page order, "p.4  Site visit with Marco · 4.10." - tap one to open the notebook on that page
- without any notebook: what it will be, and **+ Create notebook**

### Contents (experimental)

The pages Kept made are listed by what they belong to: the Home page by the project's name, a todo's or meeting's page by the todo or meeting. Other headings show the typed text under them; a heading on handwriting shows as **Handwritten heading**. The list is read again when the notebook changed, for example after you wrote in it and came back.

Contents can be switched off in [Settings → Features](settings.md#features) → **Notebook contents**. Then the tab shows the name, the years and Open.

### Engage: Go to the notebook

A [loop's note](loops.md#the-loop-note) can be the same file as the home notebook, when the Loop setup names its notes like the Default (`{name} {year}`). The notebook still belongs to the project or area: in [Engage](engage.md) its pages belong to the area, except the loop's pages and what follows them up to your next heading (see [Which owner a page belongs to](engage.md#which-owner-a-page-belongs-to)).

In Engage, when you work in another note of a project or area - a todo's own note, for example - one line **Go to Garden renovation 2026 ›** takes you to its home notebook and closes the panel. Inside the notebook itself the line isn't shown. Engage never creates a notebook.

### When you rename a project or area

Kept keeps the name of each project and area in its file (`name:` at the top). When you rename the folder elsewhere - in the file manager or on your computer - this year's notebook still has the old name. When you open the project's or area's page, the [status line](index.md#the-status-line) asks:

"Garden renovation is now Garden makeover. Rename Garden renovation 2026.note to Garden makeover 2026.note?" **Rename** · **Not now**

**Rename** renames this year's notebook and updates every link into it: the notes of todos and meetings, page links and [marks](lasso.md#marking-for-later). Notebooks of earlier years keep their names. **Not now** asks again the next time Kept starts. [Run Integrity Check](settings.md#advanced) (Settings → Advanced) also lists such renamed folders.

## Closing out and archiving

For a project the button is [Close out…](close-out.md#where-to-start-it): a short wizard that checks nothing is left open, moves results to the area or Resources, can create one PDF of all the project's notes, and then archives it ([The five steps](close-out.md#the-five-steps)). For an area, [Archive…](close-out.md#areas) shows where its folder goes and moves it to the Archive after you confirm.
