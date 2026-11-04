# Kept GTD - notes for agents and reviewers

Kept GTD is a Supernote e-ink plugin (React Native + `sn-plugin-lib`, native Kotlin modules). The
rules for every change are in `docs/dev/DEVELOPMENT-POLICY.md`; the promises Kept makes, and how
each is backed, are in `docs/dev/claims.md`. This file doesn't repeat them: it says what a code
review looks for.

## Review guidelines

The PR description names the design document and its requirement ids. Review against them: flag
behavior the design doesn't describe, and design items the change claims but doesn't implement.

**P0 - must not merge.** Each rule: the invariant, what to flag, what to do instead.

- **Data files are written only through `storage/dataFileWrite.ts` `writeDataFile`, span by span.**
  Flag any other write to `project.txt`, `area.txt` or `Inbox.txt`, and any whole-file
  regeneration. Instead: change only the section or line (`domain/markdown.ts`
  `readSectionLines`/`writeSectionLines`, `setDueInLine`, `domain/taskEdit.ts`) and save with
  `writeDataFile`, which keeps outside edits to other parts.
- **Deletes need a confirmation, then permission, then the empty-folder delete.** Flag a delete in
  shared storage without a confirmation that names what is deleted, without
  `ensureFileDeletePermission(<text naming it>)`, or with a native delete other than
  `deleteEmptyFolder`, `deleteTempTree` or `deletePrivateDataTree`. Instead: that sequence.
- **Secrets never leave the plugin settings.** Flag a Gmail app password, calendar (ICS) link or
  other secret that reaches a file, a log line, the debug bundle or a profile file. Instead:
  classify it as secret in `domain/profiles.ts` and log counts or yes/no.
- **The network is used only by the experimental integrations and the update check.** Flag a
  `fetch`, socket or native network call outside `storage/googleCalendar*`, `storage/gmail*`,
  `storage/updates.ts` and their native modules (`GmailImapModule.kt`, `KeptUpdateModule.kt`).
  Instead: an integration behind a switch in Settings → Features, off by default, with PRIVACY.md
  updated.
- **A file-format change keeps old files readable.** Flag a change to what Kept writes into data
  files without a parser change, a serializer change, a round-trip test and reading of files
  written by older versions. Instead: all four, plus an Upgrade note in the CHANGELOG.
- **An update keeps the user's settings.** Flag a new or renamed setting without a default in
  `DEFAULT_SETTINGS`, a migration from the setting it replaces, or a classification in
  `domain/profiles.ts`. Instead: all three.

**P1 - fix before merging, or say why not.**

- A flow that changes files without a scenario test (`__tests__/scenarios/`).
- A changed label or behavior whose help page (`docs/user/`) still describes the old one.
- A user-visible change without a line under `## [Unreleased]` in `CHANGELOG.md`, or a settings
  or file-format change without an Upgrade note.
- A new permission or data flow without PRIVACY.md (and SECURITY.md where it touches what Kept
  exposes).
- A change that makes a claim in `docs/dev/claims.md` untrue, or a new public promise not in it.
- A caught error that is neither logged nor marked `// silent: <reason>`.

**Don't flag** - these are checked already or not worth a comment:

- what `npm run check` enforces: tsc, ESLint and its layer rules, code-health (file length,
  `console`/`Alert`, error text, comments with dates or history, date formatting, design-doc
  references), the scenario catalog, help links, diagrams, the claims register;
- formatting, style and naming preferences;
- documents in `docs/dev/history/`: they are historical by design.
