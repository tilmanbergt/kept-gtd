# Your files, folders and Obsidian

Everything Kept GTD knows lives in ordinary files that you can read and edit yourself.

## The folder layout

With the default settings ([Settings → Data](settings.md#folders) changes them):

- `Note/1 Projects/<project>/project.txt`
- `Note/2 Areas/<area>/area.txt`
- `Note/2 Areas/0 Inbox/Inbox.txt`: captured items not yet filed
- `Note/3 Resources/`: your reference material
- `Note/4 Archive/<year>/`: archived projects and areas, see [Where things end up](close-out.md#where-things-end-up)

Notes that Kept creates for todos and meetings (with [Own note per item](note-setups.md#what-a-setup-is)) go into `Todos` and `Meetings` folders inside the project or area, and for the Inbox inside its folder `0 Inbox`.

## File names

The names of files Kept creates leave out `\ / : * ? " < > |` (not allowed in file names) and `# [ ] ^`, which break links in Obsidian. They are replaced by a space, so `Plan [v2] #team` becomes `Plan v2 team`. Project and area names can't contain these characters at all. Files you named yourself are left as they are. Notes created by older versions can still have such names: [Run Integrity Check](settings.md#advanced) in Settings → Advanced lists them, and **Fix file names** renames them all at once and updates their links.

## The Inbox folder

The Inbox has its own folder inside the Areas folder, so the `Note` folder holds only your PARA folders. Kept doesn't treat it as an area: it isn't listed on the [Areas](projects-and-areas.md) tab or in refile. You can change its name in [Settings → Data](settings.md#folders).

Up to version 0.1.0 the Inbox lived directly in `Note` (`Inbox.txt` plus `Todos` and `Meetings` folders). Versions 0.2 to 0.8 moved these into the Inbox folder on their first start; from 0.9.0 on Kept no longer does. If you still have them in `Note`, move them into the Inbox folder by hand; [Run Integrity Check](settings.md#advanced) in Settings → Advanced points them out.

## Inside project.txt

A project file is plain text in three parts: a short header, then sections.

```
---
kind: project
status: active
area: Home
abbrev: GR
---

## Scope

Turn the back garden into a vegetable garden before winter.

## Tasks

- [ ] Measure the raised beds #next [created:: 2026-09-28]
- [ ] Order soil #next [created:: 2026-09-28] [due:: 2026-10-03]
- [ ] Quote for the fence #wf/marco [due:: 2026-10-06]
- [x] Sketch the new layout [created:: 2026-09-20] [completion:: 2026-09-27]

## Meetings

- 2026-10-04 10:00-11:00 Site visit with Marco #marco
- 2026-10-21 2d Team offsite #monthly
- 2026-10-15 09:00-11:00 Plan the beds #focusblock
```

- `- [ ]` is an open todo, `- [x]` a done one, `- [-]` a cancelled one.
- A meeting line is date, then time (`10:00`, `10:00-11:00`) or length (`1d`, `2d`), then the title.
- On screen, dates are shown as day and month (`4.10.`, with the year when it isn't this year) and times in 24 hours (`9:30`); in the files they stay `2026-10-04` and `09:30`.
- A [linked note](quick-add.md#notes-and-files-on-a-todo-or-meeting) appears at the end of a line as `→ [[Meetings/…]]`, a linked file as `+[[…]]`. A link to a page, from a [lasso capture](lasso.md#capturing-right-away), ends in `#page=3`.
- A todo line ends in fields that Kept writes: `[meeting:: …]` (the meeting it was agreed in, see [Where a todo was agreed](threads.md#where-a-todo-was-agreed)), `[created:: …]`, `[due:: …]` and `[completion:: …]`, in this order, after the links. A field you add yourself at the end of the line, for example `[priority:: high]`, is kept. In the middle of the text, `[key:: value]` is just text.
- Older lines with `#due:2026-10-03` or `#waiting-for:marco` are read as before. A line gets the new form only when you edit that todo; nothing is converted on its own.
- A `## Marks` section lists open lasso marks, one per line, see [Where marks are stored](lasso.md#where-marks-are-stored).
- A `## Threads` section in `area.txt` (or in `project.txt` of a project without an area) holds the [counterparts you confirmed](threads.md#tending-counterparts), one per line: `- jordan: active` or `- lena: inactive`. Text after a comma is kept.
- Files written by earlier versions may have `dailyFocus: true` (and weekly or monthly) in the header and `## Weekly Goals` or `## Monthly Goals` sections. Kept no longer uses them and leaves them exactly as they are.
- Lines Kept doesn't understand are kept as they are.

## Editing by hand

You can edit these files in any text editor, on Windows too, for example on your computer via Supernote Cloud, or in Obsidian through the Supernote Cloud Sync plugin's Paired folder ([Set up the sync](files-and-folders.md#set-up-the-sync)). Afterwards, open Kept again: it reads the files that changed. If a change doesn't show up (a sync can keep a file's old time and size), tap [Reload all files](settings.md#advanced) in Settings → Advanced. Keep the section headings (`## Tasks`, `## Meetings`, `## Marks`, `## Threads`) as they are.

If you edit a file while Kept is open, Kept reads it again before it saves:

- When your edit was in another part of the file (for example the Scope, while you add a todo in Kept), both changes are kept.
- When both changed the same part (for example the todos), the [status line](index.md#the-status-line) asks which version wins. **Use mine** saves Kept's change over the edit; **Use the file** keeps the edit and saves nothing. ✕ counts as **Use the file**. Other parts of the file keep your edit either way.
- When the file was deleted or moved meanwhile, nothing is saved; tap [Reload all files](settings.md#advanced) in Settings → Advanced to see what is there now.

Kept saves a file by writing a hidden copy next to it (for example `.project.txt.gtdpara-tmp`) and putting it in place in one step, so a file is never left half written. If Kept is stopped in that moment, the hidden copy stays behind; the next save replaces it, and [Run Integrity Check](settings.md#advanced) lists it.

## Using Kept GTD with Obsidian

You can read and edit your todos and meetings in Obsidian, with the **Tasks** and **Dataview** plugins. The Supernote and Supernote Cloud keep Kept GTD's `.txt` files; in Obsidian they appear as Markdown.

### Set up the sync

1. In Obsidian, install the community plugin **Supernote Cloud Sync** and sign in to Supernote Cloud.
2. Set its **Paired folder** to the folder that holds Kept's Projects and Areas folders - with the default settings, the Supernote's `Note` folder.
3. Sync. In the vault the files appear as `project.md`, `area.md` and `Inbox.md`. When you sync again, the plugin uploads your edits back as `.txt`.

Only the Paired folder syncs both ways. The plugin's mirrored folders only copy from Supernote Cloud to the vault, so edits made there never reach the Supernote.

### Rules that keep it working

- Never keep both `x.txt` and `x.md` in the Paired folder, in the vault or in Supernote Cloud: the sync stops or creates duplicates.
- Don't rename or create Kept's data files in Obsidian. Create projects and areas on the Supernote.
- Keep the section headings `## Tasks`, `## Meetings` and `## Marks` as they are.

### The round trip

From Obsidian to the Supernote:

1. Edit in Obsidian.
2. Sync the Supernote Cloud Sync plugin.
3. Sync the Supernote.
4. Open Kept GTD. If a change doesn't show up, tap [Reload all files](settings.md#advanced) in Settings → Advanced.

From the Supernote to Obsidian: sync the Supernote, then the plugin.

### Settings for the Tasks plugin

- Set **Task Format** to **Dataview**. Otherwise Tasks ignores Kept's fields and writes its own emoji format.
- Optionally switch on the Tasks settings that set a created date on new tasks and a done date when you tick a task. They write `[created:: …]` and `[completion:: …]`, the same fields Kept writes.

### Writing by hand

```
## Tasks
- [ ] Send the offer #next [due:: 2026-10-15]
- [ ] Signed contract back #wf/marco [due:: 2026-10-20]

## Meetings
- 2026-10-21 10:00-11:00 Sparring Jordan #sparring/jordan
```

- You type tags. Fields go at the end of the line.
- Kept puts the fields it knows (`meeting`, `created`, `due`, `completion`) in its fixed order the next time it saves the file. Other fields stay as you wrote them.
- Leave `→ [[…]]` (the item's note) and `+[[…]]` (a linked file) as they are.
- A meeting line is the date, then the time (`10:00`, `10:00-11:00`) or the length (`1d`, `2d`), then the title. See [Inside project.txt](files-and-folders.md#inside-projecttxt).

### Agreements

Agreements are plain bullets in a section `## Agreements`, without a checkbox, so the Tasks plugin does not list them:

```
## Agreements
- Feedback only in our 1:1s #sparring/jordan [created:: 2026-10-14] [valid:: 2026-12-31]
```

Kept writes `meeting`, `created`, `valid` and `ended` in that order; other fields and lines stay as you wrote them. See [In your files](agreements.md#in-your-files).

### Two example queries

An example for the Tasks plugin - open todos in your projects due within a week:

```tasks
not done
due before in 7 days
path includes 1 Projects
```

An example for Dataview - every open Waiting For todo:

```dataview
TASK
WHERE !completed AND any(tags, (t) => t = "#wf" OR startswith(t, "#wf/"))
```

## Files outside Note

A todo or meeting can link a file from anywhere you keep files on the Supernote, not only from your projects, areas and Resources. The [Files pane](projects-and-areas.md#files-and-linked-files) has a tab **Device** for that: the Supernote's own folders next to `Note` - `Document`, `EXPORT`, `INBOX`, `MyStyle`, `SCREENSHOT`, `Download` and `Note` itself - and, when an SD card is in, **Internal** and **SD card** to choose from. Folders of Android and other apps are not shown. Linking works as on the other tabs: tap **+** and the clip on a todo's or meeting's card, open **Device** and tap the file (see [Quick Add](quick-add.md#notes-and-files-on-a-todo-or-meeting)).

When you opened Kept from a note or a document, the Files pane shows two rows at the top while you link a file: **This file · p. 12** links the page you were on, **This file** links the file without a page, so it opens where you last left it.

A file inside `Note` is stored as a path inside `Note`, like every linked file; a file outside it with its full path, for example `+[[/storage/emulated/0/Document/Book.pdf#page=12]]`, as the [lasso](lasso.md#capturing-right-away) does for a PDF. Opening, the ⚠ for a missing file and removing a link work the same way. When you change the todo or meeting later, the Files pane opens the Device tab at the file's folder (not for a file on the SD card).

## Known limitations

- *New notes from a PDF or EPUB*: when Kept was opened from a document, the Supernote doesn't let it create notes. Kept says so instead of asking; open Kept from a note to create one ([Troubleshooting](troubleshooting.md#common-situations)).

## What Kept GTD keeps elsewhere

- *Settings* are stored inside the plugin. Profiles save them as files, see [Profile files](profiles-and-demo.md#profile-files).
- *Pictures and handwriting of lasso marks* are kept in the plugin's own storage until the mark is processed, see [Where marks are stored](lasso.md#where-marks-are-stored).
- *Exports* go to `EXPORT/kept-gtd`: `profiles` for [profile files](profiles-and-demo.md#profile-files), `debug` for logs, [debug bundles](troubleshooting.md#reporting-a-problem) and reports.

[Remove Kept's data](settings.md#remove-kepts-data) in Settings → Data shows all of these and removes what you check.
