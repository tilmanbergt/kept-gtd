# Settings

Settings has seven tabs: Data, Contexts, Note setups, Input, Features, Advanced and About. It opens on Data.

## Data

Setting up and tidying up in one place: your folders on the left, the setup assistant, your profiles and Remove Kept's data on the right.

### Folders

The base folder and the names of the Projects, Areas, Resources and Archive folders, and of the [Inbox folder](files-and-folders.md#the-inbox-folder) inside Areas. Below each field you see the full path. Tap **Save** under the fields after changing something; **Reset to defaults** puts the default names back into the fields, and **Save** stores them.

Changing a folder name only changes where Kept GTD looks; move the folder yourself. The Inbox folder is the exception: a new name renames the folder on Save. Save refuses a name that another folder in Areas already has.

While a folder field has unsaved changes, **Run setup assistant** and **Switch** next to a profile wait, with the line "Save or reset the folder fields first." - otherwise your change would be lost.

### Setup assistant

On the first start after installing, Kept opens the setup assistant once. It first asks for access to your files - to read, then to write - because Kept keeps everything in your Project and Area folders and its own files in `EXPORT/kept-gtd`; without it, the assistant stops with **Try again** and **Skip**. If it finds profiles you saved earlier, it starts with **Welcome back** and offers to load one ([Saved profiles](profiles-and-demo.md#saved-profiles)); **Start fresh** goes on to the steps. It is always available as **Run setup assistant** on the Data tab, right of the folders (while the folder fields have unsaved changes it waits for you to save or reset them). Five steps, one per screen, each with **? Help** and a line saying where to change it later:

1. *Folders*: the base folder and the Projects, Areas, Resources and Archive folders ([The folder layout](files-and-folders.md#the-folder-layout)). Kept suggests folders you already have (`Projects`, `1 Projects`, `01 Projects` and so on) and shows what it finds under each field: "exists · 12 folders" or "will be created". Nothing is moved; every subfolder of the Projects and Areas folders becomes a [project or area](projects-and-areas.md).
2. *Notes*: **One notebook per project and year** (recommended, the [home notebook](projects-and-areas.md#home-notebooks)) or **Own note per todo or meeting** - what the [Default note setup](note-setups.md#the-default) does.
3. *Features*: **Simple** ([Project close-out](features.md#project-close-out), [Google Calendar](features.md#google-calendar), [Gmail](features.md#gmail) and [Notebook contents](projects-and-areas.md#contents-experimental) off) or **Everything** (all on; Calendar and Gmail still need their addresses on the [Features](settings.md#features) tab).
4. *Updates*: **Check for new versions on GitHub once a day** or **Only when I tap Check now** (the default) - see [Updates](settings.md#updates). With the daily check, Kept asks for internet access once, on **Finish**.
5. *Look around first?*: [Create demo space](profiles-and-demo.md#the-demo-space), and how to switch to it ([Profiles](profiles-and-demo.md#profiles)).

**‹ Back** and **Next ›** move between the steps. The last screen shows exactly which folders Kept will create and what it will save; **Finish** creates only the missing folders, saves your choices and opens the [Projects](projects-and-areas.md) tab, where the [status line](index.md#the-status-line) names the folders it created. **Skip** closes the assistant without changing anything. Nothing is created before **Finish**.

### Profiles

Your [profiles](profiles-and-demo.md#profiles): **Save** the active one, **Switch** to another, and [Create demo space](profiles-and-demo.md#the-demo-space). The list redraws once it has found the profile files.

### Remove Kept's data

For when you stop using Kept, give the device away, or want to start over: **Remove Kept's data…** shows everything Kept has put on this device and removes what you check. Uninstalling the plugin alone doesn't do this: the settings, the Gmail app password and the calendar link stay ([Uninstalling Kept](troubleshooting.md#uninstalling-kept)).

The list, each with where it is and how much there is:

- *Settings*; *Gmail app password and calendar link* (for every profile); *Recent tags, learned corrections, recent places, calendar cache*: stored inside the plugin. Checking Settings checks the other two as well; you can uncheck them again.
- *Lasso mark pictures and temporary files*: the plugin's private folder. [Open marks](lasso.md#processing-marks) lose their picture and handwriting - the line says how many; process them first.
- *Debug and performance logs*: `EXPORT/kept-gtd/debug`.
- *Demo space*: `Note/kept-gtd-demo` and the profile Demo. While the demo profile is active, it goes only together with the settings.
- *Leftover save copies*: only listed when there are some.
- *Kept's data files*, unchecked: `project.txt`, `area.txt` and `Inbox.txt` in your Projects, Areas and Archive folders. Your todos, meetings and agreements are in them - copy them first if you want to keep them. The folders, notes and every other file stay.
- *Saved profiles*, unchecked: `EXPORT/kept-gtd/profiles`.

While the settings go and the profiles stay, **Save the active profile first** (on) keeps your setup in a profile file. The Gmail app password and the calendar link are never in profile files - write them down.

Under "Stays on your device" the screen lists what it never touches: the notes Kept created (they hold your handwriting), Kept's mark icons, keywords and headings inside notes, empty folders and archive PDFs.

**Remove…** asks once in the [status line](index.md#the-status-line); the Supernote may then ask you to allow deleting files. Files go first and the settings last, one line per kind: removed, partly removed, or failed with the reason. If something fails, the settings stay, so **Remove…** can finish the rest later. When the settings are gone, Kept is as on a first install: **Start fresh** opens the [setup assistant](settings.md#setup-assistant), **Close Kept** closes it - then uninstall it in the Supernote's settings if you want.

## Contexts

Your contexts - Work, Home, Café: for each one the areas, projects and tags it shows and hides, and whether meetings outside it are dimmed. A context saves itself ([Setting up contexts](contexts.md#setting-up-contexts)); switch between them with the [chip in the tab bar](contexts.md#choosing-one).

## Note setups

Where the notes of todos and meetings go and how they look, see [Note setups](note-setups.md). A setup is saved with **Save** on [its own page](note-setups.md#editing-a-setup). [Heading style](note-setups.md#heading-style) at the top (Black, Light grey, Dark grey, Shadow) is saved as soon as you tap it.

## Input

How text gets into Kept: what the [writing help](quick-add.md#writing-help) has learned, and tags that look like a typo. Every tap here acts at once; there is no **Save**.

- *Learned corrections* (left): each tag you corrected once with a suggestion, for example "#sparrlng → #sparring" - Quick Add writes it that way next time ([Learned corrections](tags.md#learned-corrections)). **✕** forgets one.
- *Tags that look like a typo* (right): tags used on one todo or meeting only that are close to a tag you use, with that line and its project or area below. **→ #sparring** changes the tag on that one line in its file; nothing else in the file changes. **Keep** leaves it as written and takes it off the list for this profile. The [Integrity Check](settings.md#tools) lists the same tags in its report.

Both lists belong to the active [profile](profiles-and-demo.md#profiles) and page with **‹** and **›**.

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
- **Run Integrity Check**: looks for broken note links and similar file problems, including archived projects and areas, a [project close-out](close-out.md) that was interrupted, todos and meetings whose note is missing (with where a note of that name is, if there is one), tags used once that look like a typo of a tag you use (also listed on [Input](settings.md#input)), [lasso marks](lasso.md#marking-for-later) whose note is gone, [renamed project or area folders](projects-and-areas.md#when-you-rename-a-project-or-area) whose home notebook still has the old name, [hidden copies left by an interrupted save](files-and-folders.md#editing-by-hand), and note [file names](files-and-folders.md#file-names) that break links in Obsidian, and writes a report to `EXPORT/kept-gtd/debug`. When it finds such names, its message offers **Fix file names (n)**: after one confirmation it renames all of them and updates their links
- **Update test: treat this build as 0.0.0** (only while Debug logging is on): makes Kept look like the oldest version to the [update check](settings.md#updates), so **Check now** offers the latest release on GitHub - to try the download and **Add plugin** once. Not saved: closing Kept turns it off.
- **Simulate screen** (only while Debug logging is on): draws Kept in a framed box the size of a Nomad, to check that nothing is cut off. **Nomad portrait** fits while the device is upright, **Nomad landscape** while it is turned; **Off** ends it, and so does closing Kept. Kept starts again on its first tab when you choose one.
- **Check screen and pages** (only while Debug logging is on): shows the screen size Kept gets, the page size of the note Kept was opened from and which device it was made on, and lets you try a horizontal test note that Kept keeps in `EXPORT/kept-gtd/debug`: create it, add a page, write three test text boxes, open it. It never changes your own notes; it is there to answer questions about other devices and landscape in a bug report.
- **Keep tabs in memory**: Daily, Week, Month, Current, Projects and Areas stay loaded, so switching tabs is fast. Turn it off if something looks outdated ([Troubleshooting](troubleshooting.md#common-situations)).
- **Performance tracing**: for measuring speed; leave it off normally

Switches on this tab take effect immediately.

## About

- the version of the installed build (a test build shows the coming version and its stage, for example `0.15.0 beta`), build number and device
- an invitation to report problems and ideas on GitHub; the debug tools are on [Advanced](settings.md#reporting-a-problem)
- **What's new**: the release notes of this and the two versions before; earlier ones are in `CHANGELOG.md` on GitHub. When a newer version is on GitHub, its notes come first, as "0.26.0 · new"
- **Updates**, described below

### Updates

Kept can tell you when a new version of Kept GTD is released on GitHub, and save it on your Supernote, ready to install. It never installs anything itself.

- **Check now** asks GitHub for the latest release. The [status line](index.md#the-status-line) says "Kept GTD is up to date (0.25.0)", "Kept GTD 0.26.0 is available", or why it couldn't check (no internet access allowed, no Wi-Fi, GitHub busy). The first time, Kept asks for internet access.
- **Check automatically once a day**: when Kept opens, at most once a day, in the background after the first screen. Off by default. Switching it on asks for internet access once; the daily check itself never asks and stays quiet when it fails.
- When a newer version is found, a notice says "Kept GTD 0.26.0 is available" with **Download** and **Details** (this tab). ✕ means *not now*: the notice doesn't come back for that version, the next version shows it again. About keeps showing it until you install it.
- **Download** saves the release as `MyStyle/kept-gtd/kept-gtd-0.26.0.snplg`. Kept checks the file against the release on GitHub (its size and checksum) before it puts it there; a file that doesn't match is not saved. If the same file is already there, Kept says "Already downloaded" and doesn't fetch it again. Kept never deletes old downloads - remove them in the file manager when you like.

To install a downloaded version: close Kept, then open the Supernote's **Settings → Plugins → Add plugin** and choose the file in `MyStyle/kept-gtd`. Your data stays where it is.

Releases on GitHub are not reviewed or approved by Ratta. You install them at your own risk. Each release is tested to keep your data safe.

What goes over the network for this is described in `PRIVACY.md` on GitHub (github.com/tilmanbergt/kept-gtd): the request to GitHub and the download, nothing else.
