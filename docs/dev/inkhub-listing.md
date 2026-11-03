# InkHub listing

Ready-to-use values for InkHub → **Upload Item** on the Supernote. The InkHub build is always the
same `.snplg` as the GitHub release. Design and decisions: `technical-design-inkhub-submission.md`.

The field order below matches the form on the device.

## Title*

Kept GTD

The grid cuts titles after about 20 characters, so the tagline goes into the description.

## Description (Keyboard tab)

Plain text, no markdown (the field doesn't render it). "•" bullets, "→" arrows and line breaks show
as typed. Keep it this short - the maximum length is unknown.

```
Kept GTD — for those who write, where they write.
GTD and PARA for the Supernote: todos, meetings and next actions, joined to the notes you write.

• Engage: your next actions and the meeting's context, right on the note page you're working in
• Notes at the center: a home notebook per project and area, notes for todos and meetings set up your way, PDFs and files linked from anywhere on the device
• Capture from your handwriting: lasso a few words to make a todo, or mark them now and sort them in the review
• Weekly Review and planning: a guided review, Daily, Week and Month views, and contexts like Work or Home
• Your data stays yours: plain text files next to your notes, readable in Obsidian, no database, no lock-in
• Easy start: a setup assistant, a demo space to try things out, and built-in help (? in the tab bar)
• Optional, off by default: your Google Calendar next to your meetings, and Gmail as a review step

Made and used daily on the A5 X in portrait. Manta, Nomad and landscape are checked in simulation, not yet in daily use. Beta.

Permissions: files only in your PARA folders and EXPORT/kept-gtd. Kept deletes only after you confirm, and it names what will go. Internet only for Calendar and Gmail, when you tap Load. No telemetry.

Free and open source (MIT). Help, privacy and issues:
github.com/tilmanbergt/kept-gtd
```

The device line follows the latest device results; the permissions paragraph must match the
permissions the manifest declares (InkHub lists those on the item page by itself).

## Category*

Plugins

## Subcategory*

Utility

(Alternative: Writing. Utility fits a planning/organizing tool better.)

## License*

MIT License - the same as the repository's `LICENSE`.

## Package*

`kept-gtd-x.y.z.snplg` from the GitHub release (`build\outputs\` after `release.ps1`). Copy it to the
Supernote first, e.g. to `EXPORT/kept-gtd/inkhub/`.

## Thumbnail (up to 6)

The first thumbnail is the tile in InkHub's grid, so it is a designed poster; the other five are
screenshots from the demo space on the released build (A5 X portrait, 1404×1872), showing the
Kept GTD name and icons:

1. Poster (`docs/user/images/inkhub-poster.png`, made from `docs/dev/inkhub-poster/`)
2. Daily
3. Week
4. A project page
5. Engage on a note page
6. Review

Quick Add is shown inside the Daily or project screenshot. Copy the images to
`EXPORT/kept-gtd/inkhub/` on the device for the upload.

## Open Source

Checked.

## Notes for reviewers

The form has no field for this. The full note is public in `docs/inkhub-review.md` and linked
from the description via the repository. Summary:

- Source: github.com/tilmanbergt/kept-gtd, tag `vX.Y.Z` = this build.
- Native modules (Kotlin): `GtdParaFile` (folder listing, plain-text/binary read/write, moves -
  sn-plugin-lib has no API for these), `Pdf` (close-out PDF), `GmailImap` (IMAP, only when Gmail
  is switched on), `TextboxMetrics` (text measurement). All of it runs under the host's
  permissions; each permission is requested right before use.
- Deletes: temp files and lasso mark pictures only in the plugin's private folders; in shared
  storage, only empty folders after a move and what the user checks in Remove Kept's data (Kept's
  own export and demo folders, its data files by name), always after a confirmation that names them.
- Every move, overwrite and delete is announced to the user.
- Quick test without own data: Settings → Data → Profiles → demo space.
- Credentials for the optional integrations are stored on the device only, never in files or logs.

## Updating the listing

See `RELEASING.md` §7: new `.snplg`, description if features changed, thumbnails if screens
changed. A new upload starts a new review, and the listed version is offline until it passes, so
fixes are collected into one upload rather than sent one by one.
