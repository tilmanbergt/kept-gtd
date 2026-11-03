# Notes for InkHub reviewers

Kept GTD is an open-source (MIT) GTD + PARA plugin for the Supernote. This page explains what it
does with files, permissions and the network, so the review can check it quickly. Source: this
repository; the release tag `vX.Y.Z` is exactly the submitted `.snplg`.

## Permissions

Each permission is requested right before the first action that needs it, never at start-up.

- **FILE:READ / FILE:WRITE** - the user's PARA folders (default `Note/1 Projects`, `2 Areas`,
  `3 Resources`, `4 Archive`; the Inbox in `2 Areas/0 Inbox`), `EXPORT/kept-gtd` (profiles,
  debug files the user exports) and `MyStyle/kept-gtd` (a release the user downloads). Todos and meetings are plain-text files (`project.txt`,
  `area.txt`, `Inbox.txt`) inside those folders.
- **FILE:DELETE** - only after a confirmation in the plugin that names what will be deleted:
  - the empty folder left behind when the user archives an area into an Archive folder that
    already exists (if the user says no, the empty folder stays);
  - **Remove Kept's data** (Settings → Data): it lists everything Kept put on the device (settings,
    secrets, caches, lasso mark pictures, logs, the demo space, old gtdpara folders) and removes
    only what the user checks, after one confirmation naming it. The user's data files and saved
    profiles are listed unchecked; notes are never deleted.
- **INTERNET** - for two optional integrations (Google Calendar via the user's private ICS
  link, Gmail via IMAP with an app password), both off by default (Settings → Features) and
  connecting only when the user taps Load or Refresh; and for the update check: the GitHub API
  (`api.github.com/repos/tilmanbergt/kept-gtd/releases/latest`) and, on Download, the release
  file from `github.com`. It runs only when the user taps Check now or Download, or once a day
  when Kept opens if the user switched that on (off by default); the daily check never shows a
  permission dialog. Nothing is sent besides the normal HTTPS request with a `KeptGTD/<version>`
  user agent. No telemetry, no server of our own.

## What changes files, and how the user is told

- The user's own edits (todos, meetings, status) are written to the item's text file.
  Changes are span-scoped: lines the plugin doesn't understand are kept.
- New notes, PDFs and exports the user asked for are created and named in a status message.
- **Moves** (archive, project close-out): shown in a confirmation or the close-out wizard's
  step list before they happen, reported afterwards. Moves are renames within shared storage.
- **Overwrites**: replacing an existing close-out PDF asks first.
- **Deletes**: see FILE:DELETE above. The native delete helpers refuse everything else: in shared
  storage they remove only empty folders, Kept's own folders (`EXPORT/kept-gtd`, the demo space and
  their gtdpara predecessors) and files named `project.txt`, `area.txt`, `Inbox.txt` or Kept's own
  save copies; the private temp and data deletes stay inside those folders.
- Temporary files (rendered PDF pages, the unfinished PDF, a release being downloaded) live in the
  plugin's private folder and are removed when done.
- **Updates**: Kept never installs anything. A downloaded release is checked (size and SHA-256
  against the GitHub API) in the private folder, then copied to `MyStyle/kept-gtd/kept-gtd-X.Y.Z.snplg`
  (through a hidden `.part` file and a rename, never over an existing file), where the user installs
  it with Settings → Plugins → Add plugin. Nothing is ever deleted in `MyStyle`. Every place the
  updater is offered says that releases on GitHub are not reviewed or approved by Ratta.
- Diagnostics are written to files only when the user switches on Debug logging or exports a
  debug bundle. Secrets are never written to files or logs.

## Native code

Kotlin modules in `android/app/src/main/java/eu/embodyagile/gtdpara/`:

- `GtdParaFileModule` - folder listing, plain-text and binary read/write, moves, empty-folder
  delete, the private temp and data folders. sn-plugin-lib has no API for these.
- `PdfModule` - writes the close-out PDF (text pages, rendered note pages, table of contents).
- `GmailImapModule` - IMAP access, only when Gmail is switched on.
- `TextboxMetricsModule` - text measurement for note templates.
- `KeptUpdateModule` - downloads a Kept GTD release from GitHub (https only) into the private
  folder, checks its SHA-256 and copies it into `MyStyle/kept-gtd/`; it never installs or deletes.
- `PluginRuntimeGuard` / `GtdParaRuntimeModule` - the build id and version shown in Settings →
  About and in the debug bundle.

All of them run under the host's permission checks.

## Testing quickly

Settings → Data → Profiles → **Create demo space**, then switch to the Demo profile. It
writes a small example PARA tree to `Note/kept-gtd-demo` and never touches the user's real folders.
Help is built in (**?** in the tab bar).

More: [PRIVACY.md](../PRIVACY.md), [user guide](user/index.md).
