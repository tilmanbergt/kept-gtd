# Privacy and data

Kept GTD is a local plugin. There is no account, no server and no telemetry.

## What it reads and writes

- **Your PARA folders** (by default `Note/1 Projects`, `2 Areas`, `3 Resources`, `4 Archive` and
  the Inbox folder `2 Areas/0 Inbox`). Todos and meetings are stored as plain text in files inside those
  folders, so you can read and edit them without Kept.
- **Notes it creates for you** (linked notes, meeting notes, standalone notes), in the same folders.
- **Plugin settings**, stored in the plugin's own storage on the device (Android AsyncStorage).
  They include the todo you are working on in Engage: its text and the folder it is filed in.
- **Lasso marks** ("Mark for later"): a picture and the handwriting strokes of each marked
  selection, plus the text once it is recognized, in the plugin's own private folder on the device -
  not in your folders. They are deleted when the mark is processed or discarded. Recognition runs
  on the device.
- **Downloaded updates**: when you tap **Download** in Settings → About or in the update notice,
  the release file `kept-gtd-X.Y.Z.snplg` is saved to `MyStyle/kept-gtd/`, after being checked in the
  plugin's private folder. Kept never deletes files there. The date of the last update check, the
  version it found and your "not now" are kept in the plugin settings storage.
- **Temporary files** while a close-out PDF is made (page images and the unfinished PDF), in the
  plugin's own private folder on the device - not in your folders. They are removed when the PDF
  is done, and on the next start if Kept was interrupted.

## Permissions

Each permission is requested right before the first action that needs it:

- **File read / file write**: your PARA folders, `EXPORT/kept-gtd`, and `MyStyle/kept-gtd` for a
  downloaded update.
- **File delete**: only after you confirmed a delete that names what is deleted - the empty folder
  left behind when an area is archived into an Archive folder that already exists, and what you
  check in **Remove Kept's data** (below). Kept never deletes notes.
- **Internet**: only for the two optional integrations and the update check below.

## Changes to your files

Kept tells you whenever it changes files: your own edits are saved where you made them; new
notes, PDFs and exports are named with their folder when they are created; moves, overwrites and
deletes are shown before they happen and confirmed afterwards. Kept makes no automatic
changes to your files.

**Mark for later** adds a small bookmark icon to the note it marks; processing the mark turns it
into a check mark, discarding it removes the icon. Kept changes only its own icons, never your
handwriting. In a PDF, or where an icon can't be identified safely, it is left as it is.

## Removing Kept's data

**Remove Kept's data** (Settings → Data) lists everything Kept has put on the device, with where
it is and how much: settings, the Gmail app password and calendar link, caches (recent tags and
places, the calendar cache), lasso mark pictures and temporary files, logs, the demo space and
leftover save copies. Your data files (`project.txt`, `area.txt`,
`Inbox.txt`) and saved profiles are listed too, but not checked. You tick what to remove; one
confirmation names it before anything is deleted. Notes Kept created, its icons, keywords and
headings inside your notes, empty folders and archive PDFs are never touched.

## Network access

Kept only goes online for the two optional integrations, when you tap Load/Refresh, and for the
update check, when you tap Check now or Download, or once a day if you switched that on:

| Feature | Connects to | What is sent |
|---|---|---|
| Google Calendar | the private ICS link you entered | a normal HTTPS download of your calendar file |
| Gmail | `imap.gmail.com` (or the IMAP host you set) | your email address and app password, to read your inbox and archive messages you choose |
| Update check | `api.github.com` (the latest release of Kept GTD), and for a download `github.com` and the GitHub file host it redirects to | a normal HTTPS request with the user agent `KeptGTD/<version>`; nothing else |

If neither integration is configured and you never check for updates, Kept makes no network
connections. Releases on GitHub are not reviewed or approved by Ratta; you install them yourself,
at your own risk.

## Credentials

The Google Calendar ICS link and the Gmail app password are stored **unencrypted** in the plugin
settings on your device. Anyone with access to the unlocked device (or a device backup) could
read them. Use a Gmail **app password** (never your main password); you can revoke it at any
time in your Google account. The ICS link can be reset in Google Calendar settings.

## Logs and debug info

Diagnostic output goes to the Android system log (`logcat`) on your device, and the last ~1000
lines are kept in memory while the plugin runs. Nothing is uploaded, and nothing is written to a
file unless you switch it on.

- **Debug logging** (Settings → Advanced, off by default) also writes these lines to
  `EXPORT/kept-gtd/debug/kept-gtd-log.txt`. When it reaches about 1 MB its content is copied over
  `kept-gtd-log.1.txt` and it starts again, so there are at most two files.
- **Run Integrity Check** (Settings → Advanced) saves its report there too.
- **Export debug bundle** (Settings → Advanced) saves one text file to the same folder: version,
  device, a settings summary without names, counts, and the recent log. The Gmail app password,
  calendar links and e-mail addresses are removed from it. File paths stay in it, because they
  are needed for debugging, and they can contain your project names.
- Optional performance tracing (Settings → Advanced, off by default) writes timing files there too.
- **Check screen and pages** (Settings → Advanced, while Debug logging is on) creates a test note
  in the same folder and shows sizes; it writes nothing into your notes.

## Profiles

Profiles (Settings → Data) are saved as JSON files in `EXPORT/kept-gtd/profiles`. They contain
your folder names, Note setups, contexts, review dates, the feature switches, the todo you are
working on in Engage (its text and folder) and your Gmail address, but never the Gmail app password or the calendar link - those stay inside the plugin.

Please look through these files before attaching them to a bug report.
