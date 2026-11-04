# Claims register

> **About this document.** Every promise Kept GTD makes in public (README, InkHub listing,
> PRIVACY, SECURITY, help, philosophy) and every goal behind DEVELOPMENT-POLICY, each answering
> three questions: how true is it today, how sure is that, and what catches it if it stops being
> true. Kept by DEVELOPMENT-POLICY §6 (a change to a source updates this register in the same
> change) and §9 (read once per release); the claims audit (`claims-audit.md`) re-rates it.
> `npm run claims` checks the format and every evidence path; `npm run quality` lists the claims
> that are not fully true or unsure. Last claims audit: 0.26.0.

Each claim has an id (a letter per group and a number, never reused), the claim in one sentence,
and these fields:

- *Kind*: `promise` (said in public) or `goal` (implicit, behind the policy or the design
  philosophy).
- *Stated*: where it is said.
- *Fulfilled*: how true it is today, `n - why` in one phrase. 5 true everywhere; 4 true with one
  minor exception; 3 true in the main paths, with a known exception; 2 partly true; 1 not true.
- *Confidence*: how sure the Fulfilled rating is. 5 verified in the code and a test would fail if
  it broke; 4 the relevant code read; 3 part of the code or only the docs read; 2 inferred; 1 a
  guess.
- *Assessed*: the version the two ratings are from.
- *Kept true by*: what catches a regression. `check` (a check of `npm run check` fails), `test` (a
  unit or scenario test fails), `checklist` (a named checklist step), `nothing`. A claim can be
  fully true and kept true by nothing - the MIT license, for example.
- *Evidence*: files (`path`, or `path#heading` for a markdown heading) or checklist steps
  (`DEVELOPMENT-POLICY §n`, `RELEASING §n`), separated by `; `.
- *Re-checked*: when it is looked at again.

## Your files

### F1 Your todos, meetings and agreements live in plain text files you can read and edit without Kept
- Kind: promise
- Stated: README "Why Kept GTD"; docs/user/philosophy.md; docs/dev/inkhub-listing.md; PRIVACY.md
- Fulfilled: 5 - todos, meetings and agreements are lines of project.txt, area.txt and Inbox.txt; the round trip is tested
- Confidence: 5
- Assessed: 0.26.0
- Kept true by: test
- Evidence: __tests__/domain/meetingsRoundTrip.test.ts; __tests__/domain/taskLine.test.ts; __tests__/scenarios/fileSafety.test.tsx
- Re-checked: every push (CI)

### F2 Kept keeps no hidden database: its cache is rebuilt from the files, and a file changed elsewhere is read again
- Kind: promise
- Stated: docs/user/philosophy.md; docs/dev/inkhub-listing.md; DEVELOPMENT-POLICY §3
- Fulfilled: 4 - the cache is rebuilt from the files; setup (note setups, contexts) and Engage's current todo live in the plugin settings
- Confidence: 4
- Assessed: 0.26.0
- Kept true by: test
- Evidence: __tests__/storage/refreshCache.test.ts; __tests__/scenarios/smoke/outsideEdits.test.tsx
- Re-checked: every push (CI)

### F3 A save changes only the part Kept edits; edits made elsewhere to other parts of the file are kept
- Kind: promise
- Stated: docs/user/files-and-folders.md; docs/user/philosophy.md; DEVELOPMENT-POLICY §3
- Fulfilled: 5 - writeDataFile re-reads the file and keeps outside edits to every other part
- Confidence: 5
- Assessed: 0.26.0
- Kept true by: test
- Evidence: __tests__/storage/dataFileWrite.test.ts; __tests__/storage/outsideEdits.test.ts; __tests__/scenarios/fileSafety.test.tsx; __tests__/scenarios/agreements.test.tsx
- Re-checked: every push (CI)

### F4 When Kept and another app changed the same part of a file, you decide which wins
- Kind: promise
- Stated: docs/user/files-and-folders.md#editing-by-hand
- Fulfilled: 5 - a change to the same part asks which version wins; tested end to end
- Confidence: 5
- Assessed: 0.26.0
- Kept true by: test
- Evidence: __tests__/storage/writeConflicts.test.ts; __tests__/scenarios/fileSafety.test.tsx
- Re-checked: every push (CI)

### F5 Lines Kept doesn't understand survive every save
- Kind: goal
- Stated: DEVELOPMENT-POLICY §3
- Fulfilled: 4 - kept in the tested cases (odd files, hand edits); not proven for every possible line
- Confidence: 4
- Assessed: 0.26.0
- Kept true by: test
- Evidence: __tests__/storage/oddFiles.test.ts; __tests__/scenarios/fileSafety.test.tsx
- Re-checked: every push (CI)

### F6 A save or a move stopped halfway loses nothing and can be finished
- Kind: goal
- Stated: DEVELOPMENT-POLICY §3; docs/user/files-and-folders.md#editing-by-hand
- Fulfilled: 4 - refile and close-out are tested at every stop; not every multi-step flow is
- Confidence: 4
- Assessed: 0.26.0
- Kept true by: test
- Evidence: __tests__/scenarios/interruptions.test.tsx; __tests__/domain/writeLeftovers.test.ts; __tests__/domain/closeOutInterrupted.test.ts
- Re-checked: every push (CI)

### F7 Files written by older versions are read without being rewritten
- Kind: goal
- Stated: DEVELOPMENT-POLICY §3
- Fulfilled: 4 - a 0.21 space starts without a write; settings of 0.24 and earlier are deliberately not read (clean break)
- Confidence: 4
- Assessed: 0.26.0
- Kept true by: test
- Evidence: __tests__/scenarios/rollback.test.tsx; __tests__/domain/rollbackShims.test.ts
- Re-checked: every push (CI)

### F8 Data files are written only through writeDataFile, span by span, never regenerated whole
- Kind: goal
- Stated: DEVELOPMENT-POLICY §3
- Fulfilled: 4 - every data-file write found goes through writeDataFile; nothing stops a new one going around it
- Confidence: 3
- Assessed: 0.26.0
- Kept true by: checklist
- Evidence: DEVELOPMENT-POLICY §8 "Architecture rules kept"; __tests__/storage/dataFileWrite.test.ts
- Re-checked: every change (§8)

### F9 No lock-in: if you stop using Kept, your folders, notes and lists are still there and readable
- Kind: promise
- Stated: README "Why Kept GTD"; docs/user/philosophy.md#your-files-no-lock-in; docs/dev/inkhub-listing.md
- Fulfilled: 4 - folders, plain files and .note files stay readable; note setups and contexts live only in the plugin and in profile files
- Confidence: 4
- Assessed: 0.26.0
- Kept true by: checklist
- Evidence: DEVELOPMENT-POLICY §8 "Fits the product principles"; docs/user/files-and-folders.md#the-folder-layout
- Re-checked: every change (§8)

### F10 Kept never deletes notes
- Kind: promise
- Stated: PRIVACY.md "Permissions"; PRIVACY.md "Removing Kept's data"
- Fulfilled: 4 - notes are never deleted, except notes inside the demo space folder when Remove Kept's data removes the demo space
- Confidence: 4
- Assessed: 0.26.0
- Kept true by: test
- Evidence: __tests__/scenarios/removeDataRun.test.ts; __tests__/supernote/removeDataNative.test.ts
- Re-checked: every push (CI)

### F11 A close-out turns a project's notes into one PDF with a table of contents, readable away from the Supernote
- Kind: promise
- Stated: README "Why Kept GTD"; docs/user/close-out.md
- Fulfilled: 4 - the PDF and its table of contents are built natively; the fake device checks only the spec, readability is a device check
- Confidence: 2
- Assessed: 0.26.0
- Kept true by: checklist
- Evidence: __tests__/scenarios/closeOut.test.tsx; docs/dev/device-checklist.md
- Re-checked: device test of a release that changes close-out

## Changes you can see

### V1 Moves, overwrites and deletes are shown before they happen and reported afterwards
- Kind: promise
- Stated: PRIVACY.md "Changes to your files"; DEVELOPMENT-POLICY §3
- Fulfilled: 4 - moves, deletes and the Remove questions name what changes; not every overwrite was checked
- Confidence: 3
- Assessed: 0.26.0
- Kept true by: test
- Evidence: __tests__/domain/fileChangeText.test.ts; __tests__/scenarios/removeData.test.tsx; __tests__/scenarios/inbox.test.tsx
- Re-checked: every push (CI)

### V2 A file Kept creates is named with its folder in the status line
- Kind: promise
- Stated: PRIVACY.md "Changes to your files"; docs/user/projects-and-areas.md#the-notebook-icon
- Fulfilled: 4 - new notes and exports name their file and folder in the status line
- Confidence: 3
- Assessed: 0.26.0
- Kept true by: test
- Evidence: __tests__/domain/fileChangeText.test.ts; __tests__/scenarios/noteCreationLimit.test.tsx
- Re-checked: every push (CI)

### V3 Kept makes no automatic changes to your files; an update starts without writing a file
- Kind: promise
- Stated: PRIVACY.md "Changes to your files"; DEVELOPMENT-POLICY §3
- Fulfilled: 3 - an update writes nothing; but a folder made by hand gets its file and an abbreviation automatically
- Confidence: 3
- Assessed: 0.26.0
- Kept true by: test
- Evidence: __tests__/scenarios/rollback.test.tsx; __tests__/scenarios/cleanBreak.test.tsx
- Re-checked: every push (CI)

### V4 A delete happens only after a confirmation that names what is deleted; No leaves everything as it is
- Kind: promise
- Stated: PRIVACY.md "Permissions"; docs/dev/inkhub-listing.md; DEVELOPMENT-POLICY §3
- Fulfilled: 5 - Remove Kept's data and archive deletes ask first and name what goes; No changes nothing
- Confidence: 4
- Assessed: 0.26.0
- Kept true by: test
- Evidence: __tests__/scenarios/removeData.test.tsx; __tests__/supernote/removeDataNative.test.ts
- Re-checked: every push (CI)

### V5 Mark for later changes only Kept's own icons in a note, never your handwriting
- Kind: promise
- Stated: PRIVACY.md "Changes to your files"
- Fulfilled: 4 - marks add and change only their own icon shapes; no test shows the handwriting stays untouched
- Confidence: 2
- Assessed: 0.26.0
- Kept true by: nothing
- Evidence: __tests__/domain/marks.test.ts
- Re-checked: -

### V6 Outside the plugin's private folders, the native side deletes only empty folders
- Kind: goal
- Stated: DEVELOPMENT-POLICY §3
- Fulfilled: 2 - besides empty folders, Remove Kept's data deletes Kept's own folders and data files (deleteKeptTree, deleteKeptFile)
- Confidence: 4
- Assessed: 0.26.0
- Kept true by: checklist
- Evidence: DEVELOPMENT-POLICY §8 "Architecture rules kept"; __tests__/supernote/removeDataNative.test.ts
- Re-checked: every change (§8)

## Privacy, network and accounts

### P1 There is no account, no server and no telemetry
- Kind: promise
- Stated: PRIVACY.md; SECURITY.md; README; docs/dev/inkhub-listing.md
- Fulfilled: 5 - no server code, no account, no analytics; the only connections are Google and GitHub
- Confidence: 4
- Assessed: 0.26.0
- Kept true by: checklist
- Evidence: DEVELOPMENT-POLICY §9 "PRIVACY.md still true"
- Re-checked: every release (§9)

### P2 Kept works offline and goes online only for the two optional integrations and the update check
- Kind: promise
- Stated: PRIVACY.md "Network access"; SECURITY.md; docs/dev/inkhub-listing.md
- Fulfilled: 5 - fetch is used only by the calendar and the update check, IMAP only by Gmail
- Confidence: 4
- Assessed: 0.26.0
- Kept true by: checklist
- Evidence: DEVELOPMENT-POLICY §9 "PRIVACY.md still true"; __tests__/storage/updates.test.ts; __tests__/scenarios/updates.test.tsx
- Re-checked: every release (§9)

### P3 Google Calendar and Gmail are experimental and off by default
- Kind: promise
- Stated: SECURITY.md; docs/dev/inkhub-listing.md; DEVELOPMENT-POLICY §2
- Fulfilled: 5 - the feature switches are off without settings; tested
- Confidence: 5
- Assessed: 0.26.0
- Kept true by: test
- Evidence: __tests__/domain/features.test.ts; __tests__/scenarios/features.test.tsx
- Re-checked: every push (CI)

### P4 Profile files never contain the Gmail app password or the calendar link
- Kind: promise
- Stated: PRIVACY.md "Profiles"; SECURITY.md
- Fulfilled: 5 - secrets are classified and stripped from profile files; tested
- Confidence: 5
- Assessed: 0.26.0
- Kept true by: test
- Evidence: __tests__/domain/profiles.test.ts
- Re-checked: every push (CI)

### P5 The debug bundle has the Gmail app password, calendar links and e-mail addresses removed
- Kind: promise
- Stated: PRIVACY.md "Logs and debug info"; SECURITY.md
- Fulfilled: 5 - the bundle runs through redactText, which removes them; the redaction is tested
- Confidence: 4
- Assessed: 0.26.0
- Kept true by: test
- Evidence: __tests__/domain/redact.test.ts
- Re-checked: every push (CI)

### P6 Secrets are never written to a log or a file
- Kind: goal
- Stated: SECURITY.md; DEVELOPMENT-POLICY §3; DEVELOPMENT-POLICY §5
- Fulfilled: 4 - logs prefer counts and codes and the bundle is redacted; no test reads every log line for a secret
- Confidence: 2
- Assessed: 0.26.0
- Kept true by: checklist
- Evidence: DEVELOPMENT-POLICY §9 "Logging"; DEVELOPMENT-POLICY §8 "no secrets in files or logs"
- Re-checked: every release (§9)

### P7 Each permission is asked for right before the first action that needs it
- Kind: promise
- Stated: PRIVACY.md "Permissions"; DEVELOPMENT-POLICY §3
- Fulfilled: 5 - every file and network call checks its permission first; tested with the fake host
- Confidence: 4
- Assessed: 0.26.0
- Kept true by: test
- Evidence: __tests__/supernote/pluginPermissions.test.ts; __tests__/supernote/pluginPermissionsRequest.test.ts; __tests__/scenarios/setupAssistantAccess.test.tsx
- Re-checked: every push (CI)

### P8 Kept writes files only in your PARA folders, EXPORT/kept-gtd and MyStyle/kept-gtd, and reads others only when you choose them
- Kind: promise
- Stated: PRIVACY.md "Permissions"; SECURITY.md; docs/dev/inkhub-listing.md
- Fulfilled: 4 - writes stay in those folders; reads elsewhere only what you pick (Device tab, a background) or opened Kept from
- Confidence: 3
- Assessed: 0.26.0
- Kept true by: nothing
- Evidence: PRIVACY.md
- Re-checked: -

### P9 A bug report never leaks private content: logs prefer counts and ids, and the bundle is redacted
- Kind: goal
- Stated: DEVELOPMENT-POLICY §5
- Fulfilled: 3 - counts and redaction, but the debug bundle keeps file paths, which can hold project names (PRIVACY says so)
- Confidence: 3
- Assessed: 0.26.0
- Kept true by: checklist
- Evidence: DEVELOPMENT-POLICY §9 "Logging"; __tests__/domain/redact.test.ts; __tests__/storage/debugBundleEngage.test.ts
- Re-checked: every release (§9)

### P10 Diagnostics are written to a file only when you ask for it
- Kind: promise
- Stated: PRIVACY.md "Logs and debug info"; DEVELOPMENT-POLICY §3
- Fulfilled: 4 - with Debug logging off nothing is written; tools write their report only when you run them
- Confidence: 3
- Assessed: 0.26.0
- Kept true by: test
- Evidence: __tests__/utils/logSink.test.ts; __tests__/scenarios/screenCheck.test.tsx
- Re-checked: every push (CI)

### P11 Lasso mark pictures stay in the plugin's private folder and are deleted when the mark is processed or discarded
- Kind: promise
- Stated: PRIVACY.md "What it reads and writes"
- Fulfilled: 4 - marks live in the private data folder and are deleted with the processed mark
- Confidence: 3
- Assessed: 0.26.0
- Kept true by: test
- Evidence: __tests__/storage/markData.test.ts; __tests__/storage/marks.test.ts
- Re-checked: every push (CI)

### P12 Handwriting is recognized on the device
- Kind: promise
- Stated: PRIVACY.md "What it reads and writes"
- Fulfilled: 4 - recognition is the Supernote's own, through the SDK; not verified that it never goes online
- Confidence: 2
- Assessed: 0.26.0
- Kept true by: nothing
- Evidence: docs/dev/supernote-host-facts.md
- Re-checked: -

## Updates and upgrades

### U1 The update check runs only when you tap Check now or Download, or once a day if you switch that on
- Kind: promise
- Stated: PRIVACY.md "Network access"; docs/user/settings.md#updates; docs/dev/inkhub-listing.md
- Fulfilled: 5 - manual check, download, or the daily check you switch on; tested without and with permission
- Confidence: 5
- Assessed: 0.26.0
- Kept true by: test
- Evidence: __tests__/scenarios/updates.test.tsx; __tests__/storage/updates.test.ts
- Re-checked: every push (CI)

### U2 A downloaded update is checked against the release's checksum; a mismatch leaves nothing in MyStyle
- Kind: promise
- Stated: SECURITY.md; PRIVACY.md "What it reads and writes"
- Fulfilled: 5 - the digest is compared in the private folder; a mismatch leaves nothing; tested
- Confidence: 5
- Assessed: 0.26.0
- Kept true by: test
- Evidence: __tests__/storage/updates.test.ts; __tests__/scenarios/updates.test.tsx
- Re-checked: every push (CI)

### U3 Kept never deletes or overwrites files in MyStyle/kept-gtd
- Kind: promise
- Stated: PRIVACY.md "What it reads and writes"
- Fulfilled: 5 - a file of the same name is kept and the download takes the next free name; tested
- Confidence: 4
- Assessed: 0.26.0
- Kept true by: test
- Evidence: __tests__/storage/updates.test.ts
- Re-checked: every push (CI)

### U4 An update never loses settings: every setting has a default and a classification, and unreadable settings are never overwritten
- Kind: goal
- Stated: DEVELOPMENT-POLICY §3
- Fulfilled: 4 - defaults, classification and unreadable settings are tested; 0.25 deliberately started without 0.24's settings
- Confidence: 4
- Assessed: 0.26.0
- Kept true by: test
- Evidence: __tests__/domain/profiles.test.ts; __tests__/storage/settingsUnreadable.test.ts; __tests__/scenarios/fileSafety.test.tsx
- Re-checked: every push (CI)

### U5 Installing over the previous release keeps your files and settings
- Kind: goal
- Stated: DEVELOPMENT-POLICY §9; CHANGELOG.md
- Fulfilled: 4 - the release device check installs over the previous release; 0.25 was a deliberate new install
- Confidence: 3
- Assessed: 0.26.0
- Kept true by: checklist
- Evidence: DEVELOPMENT-POLICY §9 "Device checklist"; RELEASING §6
- Re-checked: every release (§9)

### U6 A release that changes how settings or files are stored has an Upgrade note
- Kind: goal
- Stated: DEVELOPMENT-POLICY §6; CHANGELOG.md
- Fulfilled: 5 - every release that changed settings or files has an Upgrade note
- Confidence: 3
- Assessed: 0.26.0
- Kept true by: checklist
- Evidence: DEVELOPMENT-POLICY §9 "CHANGELOG [Unreleased]"
- Re-checked: every release (§9)

### U7 Security fixes go into the latest release and a current beta
- Kind: promise
- Stated: SECURITY.md#supported-versions
- Fulfilled: 4 - the practice since releases began, written down now; no security fix has been needed yet
- Confidence: 2
- Assessed: 0.26.0
- Kept true by: nothing
- Evidence: SECURITY.md#supported-versions
- Re-checked: -

### U8 A vulnerability report is answered within a week, and a confirmed one is fixed in a patch release
- Kind: promise
- Stated: SECURITY.md#what-happens-next
- Fulfilled: 3 - a new promise; no report has been received, so it has never been tried
- Confidence: 1
- Assessed: 0.26.0
- Kept true by: nothing
- Evidence: SECURITY.md#what-happens-next
- Re-checked: -

## Calm and e-ink

### E1 No notifications, timers or streaks
- Kind: promise
- Stated: README "Why Kept GTD"; docs/user/philosophy.md#room-for-rest; DEVELOPMENT-POLICY §2
- Fulfilled: 5 - no notification, timer or streak code
- Confidence: 4
- Assessed: 0.26.0
- Kept true by: checklist
- Evidence: DEVELOPMENT-POLICY §8 "Fits the product principles"
- Re-checked: every change (§8)

### E2 Screens are paged, not scrolled
- Kind: promise
- Stated: README "Why Kept GTD"; docs/user/philosophy.md#calm-and-made-for-e-ink; DEVELOPMENT-POLICY §4
- Fulfilled: 3 - lists are paged, but CaptureScreen and the settings ScrollColumn scroll
- Confidence: 4
- Assessed: 0.26.0
- Kept true by: checklist
- Evidence: DEVELOPMENT-POLICY §8 "UI rules kept"
- Re-checked: every change (§8)

### E3 Nothing is chosen for you: next options appear only when you ask, or right after you finish, and only from what you chose
- Kind: promise
- Stated: README "Why Kept GTD"; docs/user/philosophy.md#room-for-rest; DEVELOPMENT-POLICY §2
- Fulfilled: 4 - Engage offers only the same owner and your schedule; not every screen was reviewed for it
- Confidence: 3
- Assessed: 0.26.0
- Kept true by: checklist
- Evidence: DEVELOPMENT-POLICY §8 "Fits the product principles"; __tests__/domain/engageOptions.test.ts; __tests__/scenarios/focusBlocks.test.tsx
- Re-checked: every change (§8)

### E4 There are no recurring meetings and no repeating todos; every entry is one you made
- Kind: promise
- Stated: docs/user/philosophy.md#every-entry-is-a-choice; docs/user/meetings.md#cancelling-and-repeating
- Fulfilled: 5 - there is no recurrence; New from this and + Next copy on request
- Confidence: 4
- Assessed: 0.26.0
- Kept true by: checklist
- Evidence: DEVELOPMENT-POLICY §8 "Fits the product principles"
- Re-checked: every change (§8)

### E5 Color never carries meaning: grayscale only
- Kind: goal
- Stated: DEVELOPMENT-POLICY §4; docs/dev/README.md#diagrams
- Fulfilled: 4 - the theme is greyscale and diagrams are stored greyscale; not every screen was audited
- Confidence: 3
- Assessed: 0.26.0
- Kept true by: checklist
- Evidence: DEVELOPMENT-POLICY §8 "UI rules kept"; scripts/lib/pngGray.mjs
- Re-checked: every change (§8)

### E6 Content that appears without a tap refreshes the e-ink screen
- Kind: goal
- Stated: DEVELOPMENT-POLICY §4
- Fulfilled: 3 - many screens refresh after loading; no check finds one that doesn't
- Confidence: 2
- Assessed: 0.26.0
- Kept true by: checklist
- Evidence: DEVELOPMENT-POLICY §8 "Device test done"
- Re-checked: device test of every UI change (§7)

### E7 Kept works on the A5 X in portrait; Manta, Nomad and landscape are checked in simulation
- Kind: promise
- Stated: docs/dev/inkhub-listing.md
- Fulfilled: 4 - Nomad and Manta sizes run in scenarios and the simulator; landscape only partly
- Confidence: 3
- Assessed: 0.26.0
- Kept true by: test
- Evidence: __tests__/scenarios/narrowScreen.test.tsx; __tests__/scenarios/screenSimulation.test.tsx; __tests__/scenarios/pageFrame.test.tsx
- Re-checked: every push (CI); device test of a release

### E8 External services sit behind a switch in Settings → Features
- Kind: goal
- Stated: DEVELOPMENT-POLICY §2
- Fulfilled: 5 - every external service has its switch in Settings → Features; tested
- Confidence: 5
- Assessed: 0.26.0
- Kept true by: test
- Evidence: __tests__/scenarios/features.test.tsx; __tests__/scenarios/settingsTabs.test.tsx
- Re-checked: every push (CI)

## Help tells the truth

### H1 The help describes the app as it is, with labels exactly as the app shows them
- Kind: goal
- Stated: DEVELOPMENT-POLICY §6; docs/dev/README.md#writing-user-docs
- Fulfilled: 3 - 13 bold labels don't match the app and 96 help headings have no scenario
- Confidence: 3
- Assessed: 0.26.0
- Kept true by: checklist
- Evidence: DEVELOPMENT-POLICY §9 "Help pages"; scripts/lib/helpLabels.mjs
- Re-checked: every release (§9); npm run quality

### H2 Every link between help pages and every heading it names exists
- Kind: goal
- Stated: docs/dev/README.md#writing-user-docs
- Fulfilled: 5 - the generator fails on a broken link or heading
- Confidence: 5
- Assessed: 0.26.0
- Kept true by: check
- Evidence: scripts/lib/userDocs.mjs; scripts/gen-bundled-content.mjs
- Re-checked: every check tier

### H3 The help uses only the markdown the device can show
- Kind: goal
- Stated: DEVELOPMENT-POLICY §6
- Fulfilled: 5 - the doc test fails on anything outside the subset
- Confidence: 5
- Assessed: 0.26.0
- Kept true by: test
- Evidence: __tests__/docs/userDocs.test.ts
- Re-checked: every push (CI)

### H4 Help examples use the demo space's names and tags
- Kind: goal
- Stated: DEVELOPMENT-POLICY §6
- Fulfilled: 4 - nested tags are checked against the demo; names and plain tags are not
- Confidence: 4
- Assessed: 0.26.0
- Kept true by: test
- Evidence: __tests__/userDocsExamples.test.ts
- Re-checked: every push (CI)

### H5 Help diagrams match their sources, are used by a help page and fit the size budget
- Kind: goal
- Stated: docs/dev/README.md#diagrams
- Fulfilled: 5 - the diagram check fails on stale, orphaned, unused or over-budget diagrams
- Confidence: 5
- Assessed: 0.26.0
- Kept true by: check
- Evidence: scripts/diagrams.mjs; scripts/lib/diagrams.mjs
- Re-checked: every check tier

### H6 A scenario's help reference names a heading that exists
- Kind: goal
- Stated: docs/dev/README.md#writing-scenarios
- Fulfilled: 5 - the catalog check fails on a missing page or heading
- Confidence: 5
- Assessed: 0.26.0
- Kept true by: check
- Evidence: scripts/scenario-catalog.mjs; scripts/lib/scenarioCatalog.mjs
- Re-checked: every check tier

### H7 Every user-visible change has a line in the CHANGELOG, which becomes What's new
- Kind: goal
- Stated: DEVELOPMENT-POLICY §6
- Fulfilled: 4 - followed in every release so far; nothing checks that a change has its line
- Confidence: 3
- Assessed: 0.26.0
- Kept true by: checklist
- Evidence: DEVELOPMENT-POLICY §8 "Help pages, CHANGELOG"; DEVELOPMENT-POLICY §9 "CHANGELOG [Unreleased]"
- Re-checked: every change (§8)

## Diagnostics and bug reports

### D1 Every caught error is logged, or marked silent with a reason
- Kind: goal
- Stated: DEVELOPMENT-POLICY §5
- Fulfilled: 5 - code-health fails on a catch without a log or a silent: reason
- Confidence: 5
- Assessed: 0.26.0
- Kept true by: check
- Evidence: scripts/lib/codeHealth.mjs; scripts/code-health.mjs
- Re-checked: every check tier

### D2 Logging goes through utils/log.ts only; messages through the status slot, never Alert
- Kind: goal
- Stated: DEVELOPMENT-POLICY §4; DEVELOPMENT-POLICY §5
- Fulfilled: 5 - code-health fails on console and Alert
- Confidence: 5
- Assessed: 0.26.0
- Kept true by: check
- Evidence: scripts/lib/codeHealth.mjs
- Re-checked: every check tier

### D3 Debug logging is off by default and keeps at most two files of about 1 MB
- Kind: promise
- Stated: PRIVACY.md "Logs and debug info"
- Fulfilled: 4 - off in the defaults, rotated at about 1 MB by the log sink; neither is tested
- Confidence: 3
- Assessed: 0.26.0
- Kept true by: nothing
- Evidence: __tests__/utils/logSink.test.ts
- Re-checked: -

### D4 A new mode, switch or integration adds a line to the debug bundle, as yes/no or counts
- Kind: goal
- Stated: DEVELOPMENT-POLICY §5
- Fulfilled: 4 - the bundle has lines for the recent modes and integrations; nothing checks a new one
- Confidence: 3
- Assessed: 0.26.0
- Kept true by: checklist
- Evidence: DEVELOPMENT-POLICY §8 "debug bundle extended if needed"; __tests__/storage/debugBundleEngage.test.ts; __tests__/storage/debugBundleNoteSetups.test.ts
- Re-checked: every change (§8)

## Development and supply chain

### S1 Every check and every test runs green on every push and on the release commit
- Kind: goal
- Stated: DEVELOPMENT-POLICY §7
- Fulfilled: 5 - CI runs npm run coverage on every push; release.ps1 runs it on the release commit
- Confidence: 5
- Assessed: 0.26.0
- Kept true by: check
- Evidence: .github/workflows/check.yml; scripts/release.ps1; scripts/check.mjs
- Re-checked: every push (CI); every release

### S2 domain/ stays pure and the layers import only downwards
- Kind: goal
- Stated: DEVELOPMENT-POLICY §3; docs/dev/design-overview.md
- Fulfilled: 5 - ESLint's layer rules fail on a wrong import
- Confidence: 5
- Assessed: 0.26.0
- Kept true by: check
- Evidence: .eslintrc.js
- Re-checked: every check tier

### S3 Every setting is classified as per profile, device-wide or secret
- Kind: goal
- Stated: DEVELOPMENT-POLICY §3
- Fulfilled: 5 - the profiles test fails on a setting without a classification
- Confidence: 5
- Assessed: 0.26.0
- Kept true by: test
- Evidence: __tests__/domain/profiles.test.ts
- Re-checked: every push (CI)

### S4 Every flow that changes files has a scenario test
- Kind: goal
- Stated: DEVELOPMENT-POLICY §7
- Fulfilled: 3 - most file-changing flows have scenarios; loops have none
- Confidence: 3
- Assessed: 0.26.0
- Kept true by: checklist
- Evidence: DEVELOPMENT-POLICY §8 "changed flows have scenario tests"; docs/dev/test-scenarios.md
- Re-checked: every change (§8)

### S5 An area's line or branch coverage never falls more than 2 points below its baseline
- Kind: goal
- Stated: DEVELOPMENT-POLICY §7
- Fulfilled: 5 - coverage-report fails on a drop of more than 2 points
- Confidence: 5
- Assessed: 0.26.0
- Kept true by: check
- Evidence: scripts/coverage-report.mjs; scripts/coverage-baseline.json
- Re-checked: every push (CI)

### S6 New files stay at or below 1,000 lines, and comments carry no dates or history
- Kind: goal
- Stated: DEVELOPMENT-POLICY §3; DEVELOPMENT-POLICY §6
- Fulfilled: 5 - code-health fails on length and on dates or history in comments
- Confidence: 5
- Assessed: 0.26.0
- Kept true by: check
- Evidence: scripts/lib/codeHealth.mjs; scripts/code-health-baseline.json
- Re-checked: every check tier

### S7 Releases are made only from main by release.ps1, with every check and test on the release commit
- Kind: goal
- Stated: docs/dev/RELEASING.md
- Fulfilled: 5 - release.ps1 stops on a red run and requires main
- Confidence: 4
- Assessed: 0.26.0
- Kept true by: check
- Evidence: scripts/release.ps1
- Re-checked: every release

### S8 The InkHub package is the same .snplg as the GitHub release
- Kind: promise
- Stated: docs/dev/inkhub-listing.md
- Fulfilled: 4 - the listing names the release package; the upload is done by hand
- Confidence: 3
- Assessed: 0.26.0
- Kept true by: checklist
- Evidence: docs/dev/inkhub-listing.md; RELEASING §7
- Re-checked: every InkHub submission

### S9 Kept GTD is free and open source under the MIT license
- Kind: promise
- Stated: README; docs/dev/inkhub-listing.md
- Fulfilled: 5 - LICENSE is the MIT text; README and the listing say MIT
- Confidence: 5
- Assessed: 0.26.0
- Kept true by: nothing
- Evidence: LICENSE
- Re-checked: -
