# Settings

Settings has six tabs: Data, Contexts, Note setups, Features, Advanced and About. It opens on Data.

## Data

Setting up and tidying up in one place: your folders on the left, the setup assistant and your profiles on the right.

### Folders

The base folder and the names of the Projects, Areas, Resources and Archive folders, and of the [Inbox folder](files-and-folders.md#the-inbox-folder) inside Areas. Below each field you see the full path. Tap **Save** under the fields after changing something; **Reset to defaults** puts the default names back into the fields, and **Save** stores them.

Changing a folder name only changes where Kept GTD looks; move the folder yourself. The Inbox folder is the exception: a new name renames the folder on Save. Save refuses a name that another folder in Areas already has.

While a folder field has unsaved changes, **Run setup assistant** and **Switch** next to a profile wait, with the line "Save or reset the folder fields first." - otherwise your change would be lost.

### Setup assistant

On the first start after installing, Kept opens the setup assistant once. It is always available as **Run setup assistant** on the Data tab, right of the folders (while the folder fields have unsaved changes it waits for you to save or reset them). Four steps, one per screen, each with **? Help** and a line saying where to change it later:

1. *Folders*: the base folder and the Projects, Areas, Resources and Archive folders ([The folder layout](files-and-folders.md#the-folder-layout)). Kept suggests folders you already have (`Projects`, `1 Projects`, `01 Projects` and so on) and shows what it finds under each field: "exists · 12 folders" or "will be created". Nothing is moved; every subfolder of the Projects and Areas folders becomes a [project or area](projects-and-areas.md).
2. *Notes*: **One notebook per project and year** (recommended, the [home notebook](projects-and-areas.md#home-notebooks)) or **Own note per todo or meeting** - what the [Default note setup](note-setups.md#the-default) does.
3. *Features*: **Simple** ([Project close-out](features.md#project-close-out), [Google Calendar](features.md#google-calendar), [Gmail](features.md#gmail) and [Notebook contents](projects-and-areas.md#contents-experimental) off) or **Everything** (all on; Calendar and Gmail still need their addresses on the [Features](settings.md#features) tab).
4. *Look around first?*: [Create demo space](profiles-and-demo.md#the-demo-space), and how to switch to it ([Profiles](profiles-and-demo.md#profiles)).

**‹ Back** and **Next ›** move between the steps. The last screen shows exactly which folders Kept will create and what it will save; **Finish** creates only the missing folders, saves your choices and opens the [Projects](projects-and-areas.md) tab, where the [status line](index.md#the-status-line) names the folders it created. **Skip** closes the assistant without changing anything. Nothing is created before **Finish**.

### Profiles

Your [profiles](profiles-and-demo.md#profiles): **Save** the active one, **Switch** to another, and [Create demo space](profiles-and-demo.md#the-demo-space). The list redraws once it has found the profile files.

## Contexts

Your contexts - Work, Home, Café: for each one the areas, projects and tags it shows and hides, and whether meetings outside it are dimmed. A context saves itself ([Setting up contexts](contexts.md#setting-up-contexts)); switch between them with the [chip in the tab bar](contexts.md#choosing-one).

## Note setups

Where the notes of todos and meetings go and how they look, see [Note setups](note-setups.md). A setup is saved with **Save** on [its own page](note-setups.md#editing-a-setup). [Heading style](note-setups.md#heading-style) at the top (Black, Light grey, Dark grey, Shadow) is saved as soon as you tap it.

## Features

Switch parts of Kept GTD on or off, see [Features and integrations](features.md). The switches on the left take effect immediately:

- [Project close-out](features.md#project-close-out): the checklist, outcomes and archive PDF when a project is done. Off: Done projects are archived directly.
- [Experimental](features.md#experimental): the [Google Calendar](features.md#google-calendar) and [Gmail](features.md#gmail) integrations, and [Notebook contents](projects-and-areas.md#contents-experimental) - the headings list on a project's or area's [Notebook tab](projects-and-areas.md#the-notebook-tab)

### Google Calendar and Gmail

While Google Calendar is on, the right side shows its link; while Gmail is on, your Gmail address, the app password, the IMAP host and **Hide emails already turned into a Task/Meeting**. Each has its own **Save**, which stores only those fields. Switching an integration off hides its fields; what you entered stays stored. How to get the link and the app password: [Google Calendar](features.md#google-calendar), [Gmail](features.md#gmail).

## Advanced

### Reporting a problem

- **Debug logging**: also writes every log line to `EXPORT/kept-gtd/debug`, so it survives a crash.
- **Export debug bundle**: one text file with what helps find the cause, to attach to a GitHub issue.

How to report, and what the bundle contains: [Reporting a problem](troubleshooting.md#reporting-a-problem).

### Tools

- **Reload all files**: reads all projects, areas and the Inbox again, for every tab. Opening Kept already reads files changed outside it, for example on your computer or in [Obsidian](files-and-folders.md#using-kept-gtd-with-obsidian); use this when a change still doesn't show up.
- **Run Integrity Check**: looks for broken note links and similar file problems, including archived projects and areas, Inbox files still in `Note` from version 0.1.0, a [project close-out](close-out.md) that was interrupted, todos and meetings whose note is missing (with where a note of that name is, if there is one), [lasso marks](lasso.md#marking-for-later) whose note is gone, [renamed project or area folders](projects-and-areas.md#when-you-rename-a-project-or-area) whose home notebook still has the old name, [hidden copies left by an interrupted save](files-and-folders.md#editing-by-hand), and note [file names](files-and-folders.md#file-names) that break links in Obsidian, and writes a report to `EXPORT/kept-gtd/debug`. When it finds such names, its message offers **Fix file names (n)**: after one confirmation it renames all of them and updates their links
- **Keep tabs in memory**: Daily, Week, Month, Current, Projects and Areas stay loaded, so switching tabs is fast. Turn it off if something looks outdated ([Troubleshooting](troubleshooting.md#common-situations)).
- **Performance tracing**: for measuring speed; leave it off normally

Switches on this tab take effect immediately.

## About

- the version of the installed build (a test build shows the coming version and its stage, for example `0.15.0 beta`), build number and device
- an invitation to report problems and ideas on GitHub; the debug tools are on [Advanced](settings.md#reporting-a-problem)
- **What's new**: the release notes of this and earlier versions
