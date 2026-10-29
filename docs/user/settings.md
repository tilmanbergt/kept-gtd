# Settings

Settings has these tabs:

## Setup assistant

On the first start after installing, Kept opens the setup assistant once. It is always available as **Run setup assistant** at the top of the [Folders](settings.md#folders) tab (while you have unsaved changes in the folder fields it waits for you to save or reset them). Four steps, one per screen, each with **? Help** and a line saying where to change it later:

1. *Folders*: the base folder and the Projects, Areas, Resources and Archive folders ([The folder layout](files-and-folders.md#the-folder-layout)). Kept suggests folders you already have (`Projects`, `1 Projects`, `01 Projects` and so on) and shows what it finds under each field: "exists · 12 folders" or "will be created". Nothing is moved; every subfolder of the Projects and Areas folders becomes a [project or area](projects-and-areas.md).
2. *Notes*: **One notebook per project and year** (recommended, the [home notebook](projects-and-areas.md#home-notebooks)) or **Own note per todo or meeting** - what the [Default note setup](note-setups.md#the-default) does.
3. *Features*: **Simple** ([Project close-out](features.md#project-close-out), [Google Calendar](features.md#google-calendar), [Gmail](features.md#gmail) and [Notebook contents](projects-and-areas.md#contents-experimental) off) or **Everything** (all on; Calendar and Gmail still need their addresses on their tabs).
4. *Look around first?*: [Create demo space](profiles-and-demo.md#the-demo-space), and how to switch to it ([Profiles](profiles-and-demo.md#profiles)).

**‹ Back** and **Next ›** move between the steps. The last screen shows exactly which folders Kept will create and what it will save; **Finish** creates only the missing folders, saves your choices and opens the [Projects](projects-and-areas.md) tab, where the [status line](index.md#the-status-line) names the folders it created. **Skip** closes the assistant without changing anything. Nothing is created before **Finish**.

## Folders

The base folder and the names of the Projects, Areas, Resources and Archive folders, and of the [Inbox folder](files-and-folders.md#the-inbox-folder) inside Areas. Below each field you see the full path. Tap **Save** at the bottom after changing something (the same on the [Calendar and Gmail](settings.md#calendar-and-gmail) tabs).

Changing a folder name only changes where Kept GTD looks; move the folder yourself. The Inbox folder is the exception: a new name renames the folder on Save. Save refuses a name that another folder in Areas already has.

## Contexts

Your contexts - Work, Home, Café: for each one the areas, projects and tags it shows and hides, and whether meetings outside it are dimmed. A context saves itself ([Setting up contexts](contexts.md#setting-up-contexts)); switch between them with the [chip in the tab bar](contexts.md#choosing-one).

## Calendar and Gmail

Two tabs, only visible when the matching experimental integration is switched on in [Features](settings.md#features). See [Google Calendar](features.md#google-calendar) and [Gmail](features.md#gmail).

## Note setups

Where the notes of todos and meetings go and how they look, see [Note setups](note-setups.md). A setup is saved with **Save** on [its own page](note-setups.md#editing-a-setup); the Save button at the bottom isn't needed here. [Heading style](note-setups.md#heading-style) at the top (Black, Light grey, Dark grey, Shadow) is saved as soon as you tap it.

## Features

Switch parts of Kept GTD on or off, see [Features and integrations](features.md):

- [Project close-out](features.md#project-close-out): the checklist, outcomes and archive PDF when a project is done. Off: Done projects are archived directly.
- [Experimental](features.md#experimental): the [Google Calendar](features.md#google-calendar) and [Gmail](features.md#gmail) integrations, and [Notebook contents](projects-and-areas.md#contents-experimental) - the headings list on a project's or area's [Notebook tab](projects-and-areas.md#the-notebook-tab)

Switches on this tab take effect immediately.

## Advanced

- [Profiles](profiles-and-demo.md#profiles): switch between configurations and create the [demo space](profiles-and-demo.md#the-demo-space)
- **Reload all files**: reads all projects, areas and the Inbox again, for every tab. Opening Kept already reads files changed outside it, for example on your computer or in [Obsidian](files-and-folders.md#using-kept-gtd-with-obsidian); use this when a change still doesn't show up.
- **Run Integrity Check**: looks for broken note links and similar file problems, including archived projects and areas, Inbox files still in `Note` from version 0.1.0, a [project close-out](close-out.md) that was interrupted, todos and meetings whose note is missing (with where a note of that name is, if there is one), [lasso marks](lasso.md#marking-for-later) whose note is gone, [renamed project or area folders](projects-and-areas.md#when-you-rename-a-project-or-area) whose home notebook still has the old name, [hidden copies left by an interrupted save](files-and-folders.md#editing-by-hand), and note [file names](files-and-folders.md#file-names) that break links in Obsidian, and writes a report to `EXPORT/kept-gtd/debug`. When it finds such names, its message offers **Fix file names (n)**: after one confirmation it renames all of them and updates their links
- **Keep tabs in memory**: Daily, Week, Month, Current, Projects and Areas stay loaded, so switching tabs is fast. Turn it off if something looks outdated ([Troubleshooting](troubleshooting.md#common-situations)).
- **Performance tracing**: for measuring speed; leave it off normally

Switches on this tab take effect immediately.

## About

- the version of the installed build (a test build shows the coming version and its stage, for example `0.15.0 beta`), build number and device
- [Debug logging](troubleshooting.md#reporting-a-problem) and [Export debug bundle](troubleshooting.md#reporting-a-problem)
- **What's new**: the release notes of this and earlier versions
