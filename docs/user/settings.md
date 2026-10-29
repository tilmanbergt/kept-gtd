# Settings

Settings has these tabs:

## Folders

The base folder and the names of the Projects, Areas, Resources and Archive folders, and of the **Inbox folder** inside Areas. Below each field you see the full path. Tap **Save** at the bottom after changing something (the same on the Calendar and Gmail tabs).

Changing a folder name only changes where Kept GTD looks; move the folder yourself. The Inbox folder is the exception: a new name renames the folder on Save. Save refuses a name that another folder in Areas already has.

## Contexts

Your contexts - Work, Home, Café: for each one the areas, projects and tags it shows and hides, and whether meetings outside it are dimmed. A context saves itself; switch between them with the chip in the tab bar. See [Contexts](contexts.md).

## Calendar and Gmail

Two tabs, only visible when the matching experimental integration is switched on in Features. See [Google Calendar and Gmail](features.md).

## Note setups

Where the notes of todos and meetings go and how they look, see [Note setups](note-setups.md). A setup is saved with **Save** on its own page; the Save button at the bottom isn't needed here. **Heading style** at the top (Black, Light grey, Dark grey, Shadow) is saved as soon as you tap it.

## Features

Switch parts of Kept GTD on or off, see [Features and integrations](features.md):

- [Project close-out](features.md#project-close-out): the checklist, outcomes and archive PDF when a project is done. Off: Done projects are archived directly.
- **Experimental**: the Google Calendar and Gmail integrations, and [Notebook contents](projects-and-areas.md#contents-experimental) - the headings list on a project's or area's Notebook tab (see [Projects and Areas](projects-and-areas.md), "Home notebooks")

Switches on this tab take effect immediately.

## Advanced

- **Profiles**: switch between configurations and create the demo space, see [Profiles](profiles-and-demo.md)
- **Reload all files**: reads all projects, areas and the Inbox again, for every tab. Opening Kept already reads files changed outside it, for example on your computer or in Obsidian; use this when a change still doesn't show up.
- **Run Integrity Check**: looks for broken note links and similar file problems, including archived projects and areas, Inbox files still in `Note` from version 0.1.0, a project close-out that was interrupted, todos and meetings whose note is missing (with where a note of that name is, if there is one), lasso marks whose note is gone, renamed project or area folders whose home notebook still has the old name, hidden copies left by an interrupted save, and note file names that break links in Obsidian, and writes a report to `EXPORT/kept-gtd/debug`. When it finds such names, its message offers **Fix file names (n)**: after one confirmation it renames all of them and updates their links
- **Touch test**: for when taps with the finger don't register. It shows sample todos and meetings down to the bottom edge of the screen (never your own). Choose **Finger** or **Pen**, then tap the rows, tags and labels: each tap leaves a mark where it landed - ● it worked, ○ it started but was cancelled, × it hit nothing, ◐ it hit `#next`, which waits for a second tap. The counts at the top are split by finger and pen and by the top, middle and bottom of the screen. If a tap leaves no mark at all, it never reached Kept. **Save log** writes the taps as a file to `EXPORT/kept-gtd/debug`. **Log touches everywhere** also notes every tap on the other screens in the log, until you switch it off or Kept restarts. Nothing is changed by tapping here.
- **Check device files** (only while Debug logging is on): lists the device's top folders, the SD card and the file Kept was opened from with its page, and offers buttons to open a PDF, an EPUB and a note found outside `Note`. It changes nothing; it is there to answer questions about your device in a bug report
- **Keep tabs in memory**: Daily, Week, Month, Current, Projects and Areas stay loaded, so switching tabs is fast. Turn it off if something looks outdated.
- **Performance tracing**: for measuring speed; leave it off normally

Switches on this tab take effect immediately.

## About

- the version of the installed build (a test build shows the coming version and its stage, for example `0.15.0 beta`), build number and device
- [Debug logging](troubleshooting.md#reporting-a-problem) and [Export debug bundle](troubleshooting.md#reporting-a-problem)
- **What's new**: the release notes of this and earlier versions
