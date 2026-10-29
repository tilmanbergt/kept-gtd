# Technical design — 0.23.0 "Easy start"

Status: **APPROVED (2026-10-28).** Requirements: `docs/dev/history/requirements-easy-start.md` (H, N, G, S, L).
Base: `feature/time-and-place` as merged into `main` (0.22.0). Branch: `feature/easy-start`.

## 1. Overview

| Part | Where | Size |
|---|---|---|
| Help links + Back (H1-H4) | `domain/markdownBlocks.ts`, `domain/helpLinks.ts` (new), `ui/MarkdownBlocks.tsx`, `ui/HelpOverlay.tsx`, `screens/useAppOverlays.tsx`, `scripts/lib/userDocs.mjs` | small |
| Demo rename + name check (N) | `domain/demoSpace.ts`, `__tests__/userDocsExamples.test.ts` (new), DEVELOPMENT-POLICY | small |
| Help rewrite (G, H3, N3) | `docs/user/*.md` | medium, text only |
| Setup assistant (S) | `domain/setupAssistant.ts` (new), `storage/setupAssistant.ts` (new), `screens/settings/SetupAssistant.tsx` (new), Settings, App start | medium |
| Device tab + This file (L) | `domain/linkTargets.ts` (new), `storage/linkedFiles.ts`, `storage/deviceRoots.ts` (new), `ui/FileBrowserPane.tsx` + `ui/fileBrowser/ThisFileRows.tsx` (new), Quick Add | medium |

No file format change: `+[[…]]` and `#page=n` exist already; absolute paths are already read
(`resolveLinkedFilePath`, Lasso from PDFs). Rollback to 0.22 is safe; 0.22 ignores the new settings key.

## 2. Help links and Back (H1-H4)

### 2.1 Parsing (`domain/markdownBlocks.ts`)
- `InlineSpan` gains `link?: {page: string; anchor: string | null}`.
- `parseInline` keeps `[text](target)`: when `target` matches `^([a-z0-9-]+)\.md(?:#([a-z0-9-]+))?$` the
  span carries `link`; anything else (http…, images) stays plain text as today. Bold inside link text is
  not supported (not used).
- CHANGELOG rendering uses the same parser: its links have no `.md` page targets in the bundle, so
  `MarkdownPager` gets an optional `onLink`; without it link spans render as plain text.

### 2.2 Anchors (`domain/helpLinks.ts`, new, pure)
- `headingSlug(text)`: GitHub's rule (lowercase, drop everything but letters, digits, spaces and `-`,
  spaces → `-`), so the same links work on GitHub.
- `findAnchorBlock(blocks, anchor)`: index of the first heading block whose slug matches, or -1 (→ page
  top). Same function the check script uses (exported for node via the generated module, or duplicated in
  `userDocs.mjs` with a shared test vector list).

### 2.3 Rendering (`ui/MarkdownBlocks.tsx`)
- A link span renders as a nested `<Text onPress>` with `textDecorationLine: 'underline'` (no colour; e-ink).
  `hitSlop` does not exist on nested Text; the line height (BODY_LINE) is the tap target, which is enough
  on the A5X (checked in the device test).
- `MarkdownPager` gains `onLink?(page, anchor)` and `jumpToRow?: number | null` (passed to PagedSection's
  existing `jumpTo`) and `onFirstRowChange` (exists) to report the position for Back.
- Block heights are unchanged (underline doesn't change metrics).

### 2.4 Navigation (`ui/HelpOverlay.tsx`, `useAppOverlays.tsx`)
- Help state becomes `{pageId, row}` plus `history: {pageId, row}[]` (in `useAppOverlays`, cleared when the
  help closes; at most 20 entries).
- Link tap: push the current `{pageId, row}` (row = first row on screen, from `onFirstRowChange`), open the
  target at `findAnchorBlock(...)` (0 when no anchor or not found). Link to the page already shown with an
  anchor: same, so Back returns.
- Left list tap: also pushes (Back means "where I was", however I got there).
- **‹ Back** sits in the left header between "Help" and "✕ Close"; hidden while history is empty.
- `lastHelpRef` keeps working as today (page only).

### 2.5 Checks (`scripts/lib/userDocs.mjs`, `scripts/test-userdocs.mjs`)
- `checkLinks(pages)`: every `x.md` link targets a bundled page; every `#anchor` matches a heading slug of
  that page. `npm run docs:user` (the generator) fails with the list of broken links, so CI and
  `check:affected` catch it. Tests with broken page, broken anchor, external link ignored.

## 3. Demo rename and the name check (N)

- `demoSpace.ts`: the sparring meeting becomes `Sparring Jordan #sparring/jordan`; the Coaching
  todos (`Send Jordan the role canvas`, `Org chart from Jordan #wf`, `Read Jordan's article #jordan #next`,
  `Contract draft #wf/jordan`, `Invite Jordan to the forum #sparring/jordan #someday`), the focus block
  `Think through the sparring #sparring/jordan`, `## Threads` → `- jordan: active`. Existing demo spaces
  keep their names until recreated (help says so in profiles-and-demo.md, one line).
- Demo tests and smoke space: update expectations that name the old counterpart.
- `__tests__/userDocsExamples.test.ts` (feature area: see §8): collect every nested tag `#a/b` in `docs/user/*.md`
  (outside code fences too - examples live there); each must occur in `buildDemoFiles(fixedToday)` or in
  `ALLOWED_PLACEHOLDERS` (`#wf/name`, `#owe/name`, `#tax/2026` as the "not a thread" example …, each with
  a one-line reason). No denylist of old names: it would put real names into the repo. The nested-tag
  rule plus the policy line is the guard.
- DEVELOPMENT-POLICY §8 (help pages): "Examples use names, projects and tags from the demo space."

## 4. Help rewrite (G, H3, N3)

Text-only; the outline (each heading a link target):

**getting-started.md**
1. *Install* - as today, shorter.
2. *Your folders* - four folders in `Note`; created when first needed or by the setup assistant; an
   existing system: Settings → Folders, every subfolder is a project or area, nothing moves; link
   [Files and folders](files-and-folders.md), [setup assistant](settings.md#setup-assistant).
3. *Projects and areas* - one sentence each, Garden renovation / Home; create on the Projects tab.
4. *Todos* - Quick Add on a project's page; `#next` = what Daily shows; due, waiting for (`#wf/marco`),
   someday; link [Tags](tags.md), [Quick Add](quick-add.md).
5. *Meetings* - Meeting tab, today with a time ("Plan the beds", 14:00-15:30); Daily shows them; Week and
   Month for the longer view (one line, link).
6. *Notes* - note icon → page in *Garden renovation 2026*; everything of the project in one notebook per
   year, in time order; Kept asks first and says where; link [Projects and Areas](projects-and-areas.md#home-notebooks),
   [Note setups](note-setups.md).
7. *Capture while you write* - Lasso → todo or meeting; Mark for later, file it later; link
   [Lasso](lasso.md), [Mark for later](lasso.md#marking-for-later) (the anchor is checked by 2.5).
8. *Once a week* - Review, link.
9. *When you want more* - Threads (sparring with Jordan), Loops, Agreements, Engage, Contexts,
   Settings → Features.

**index.md (Overview)** gains "The tabs at a glance" and "Opening Kept GTD from a note" (moved, text kept).
**All pages**: replace names per N3; add first-mention links (H3); `See also` only where needed. Pages with
most changes: threads, agreements, engage, note-setups, tags, meetings, review, files-and-folders,
projects-and-areas, contexts, quick-add, lasso. **settings.md** gets "Setup assistant", **files-and-folders.md**
gets "Files outside Note" (L), **quick-add.md** the This file line (L4).

## 5. Setup assistant (S)

### 5.1 State
- New settings key `setupAssistant: 'pending' | 'done'` (default `'done'`).
- `migrateExperimentalFlags` already distinguishes a fresh install (no stored blob): there it sets
  `'pending'`. Renamed in spirit to "first-start defaults"; one more line, same function, same test file.
- New profiles and the demo profile start `'done'` (they are created by someone who already set up).

### 5.2 Domain (`domain/setupAssistant.ts`, pure)
- `suggestFolders(rootEntries: {name, isFolder}[]): {projects?, areas?, resources?, archive?}` - matches
  `^(\d{1,2}[\s._-]*)?(projects?)$`i etc.; a role with more than one match gets no suggestion.
- `folderStatus(name, rootEntries, childCounts)`: `{exists: boolean; subfolders: number}`.
- `planFinish(choices, current settings, statuses)`: `{settingsPatch, foldersToCreate: string[]}` -
  the patch sets folder names, `noteSetupDefaults.notebook` (`{...DEFAULT_HOME_NOTEBOOK}` or `null`), the
  feature switches (Simple: `modules.closeOut=false`, `experimentalGoogleCalendar=false`,
  `experimentalGmail=false`, `notebookContentsEnabled=false`; Everything: all `true`) and
  `setupAssistant: 'done'`. Unit-tested; this is where the logic lives.

### 5.3 UI (`screens/settings/SetupAssistant.tsx`, new, < 400 lines)
- Rendered inside Settings in place of the sub-tab content while running; the Settings tab strip is hidden
  meanwhile. Header "Setup · 1 of 4", **? Help** (opens HelpOverlay at the step's page), **Skip**.
- Step bodies: radio rows (existing CheckToggle style) and text inputs (Folders step reuses the field
  layout of `FoldersTab`). Every step ends with a grey line "Change later: Settings → …".
- Finish screen: "Kept will create: …" (only missing folders), "and save: notes …, features …";
  **Finish** / **‹ Back**.
- Folders step reads the base folder once (`listFolderEntries(baseRoot)` + one listing per suggested/
  default folder for the subfolder count) through `storage/setupAssistant.ts`.

### 5.4 Storage (`storage/setupAssistant.ts`)
- `finishSetup(plan)`: `saveSettings({...current, ...patch})` first (refused while settings are
  unreadable, as every save), then `ensureFolderExists` for each folder in order; the status line names
  what was created ("Created 1 Projects, 2 Areas …"). A folder that fails is reported, the settings stay
  saved. No deletes, no moves.

### 5.5 Start
- App's first `reorient()` that lands on the tabs: when `settings.setupAssistant === 'pending'`, open the
  Settings tab with the assistant running (instead of Daily). Skip or Finish set `'done'`; Finish then
  switches to the Projects tab with the status line "Create your first project here".
- **Run setup assistant** button at the top of the Folders sub-tab starts it any time (no auto-save of a
  half-edited Folders draft: the button is disabled while the draft has unsaved changes, with the hint).

## 6. Device tab and This file (L)

### 6.1 Roots (`storage/deviceRoots.ts`)
- `INTERNAL_ROOT = '/storage/emulated/0'`. `listDeviceRoots()`: internal always; SD card = entries of
  `listFolderEntries('/storage')` other than `emulated` and `self` that list non-empty (spike K3). Cached
  for the session.
- Device-root entry filter: hide names starting with `.`, and `Android`, `LOST.DIR`. Other folders shown
  as the host lists them (Note, Document, EXPORT, SCREENSHOT, MyStyle, INBOX …).

### 6.2 Files pane (`ui/FileBrowserPane.tsx`, near its 1,000-line limit)
- New root key `device` on the pages that link today (ProjectDataPanel, InboxScreen): label **Device**,
  `rootPath` internal; with an SD card the root is a `sources` root (existing composite-root mechanism) with
  depth-0 entries **Internal** and **SD card**.
- `linkRootPath('device', …)` returns the internal root; `toLinkedFile` already keeps paths outside `base`
  absolute (L5). `locateLinkedFile` gains a last fallback: an absolute path → `{root: 'device', …}` so
  re-editing a link opens the Device tab at its folder.
- **This file rows** live in a new `ui/fileBrowser/ThisFileRows.tsx`, rendered by FileBrowserPane through
  a new optional prop `leadRows?: React.ReactNode` above the listing of every root, only while arming.
  Two rows: "This file · p. 12  Book.pdf" and "This file  Book.pdf". Tapping calls the same `onPick` path as
  a file tap with `linkedFile = path + '#page=' + page` or `path`.

### 6.3 Current file (`domain/linkTargets.ts`, pure + `ui/useThisFile.ts`)
- `thisFileTargets(launchPath, page, paths): {withPage, withoutPage, kind: 'note' | 'document', label}`
  or null (no launch path, or the path is a Kept data file). `kind` by extension (`.note` = note).
- `useThisFile()`: reads `rememberedLaunchNotePath` (exists) and `getCurrentPageNum()` once when arming
  starts or Quick Add opens (page read lazily; a failed read → only the without-page row).

### 6.4 Quick Add (L4)
- `ui/quickAdd/ThisFileLine.tsx` (new): one line under the tag row on the Todo and Meeting tabs, add mode
  only: `📎 Book.pdf · p. 12  [with page] [no page] ✕`, three states: off / with page / without page.
  Default: with page for `kind: 'document'`, off for `'note'`. Hidden when there is no this-file target.
  (The clip glyph is the existing SVG, not an emoji.)
- The add path passes `linkedFile` through to the existing Task/Meeting creation (the serializer already
  writes `+[[…]]`); edit mode keeps today's clip handling.

## 7. Spike before step S4 (device, ~20 min, diagnostic build or Settings → Advanced debug)

| # | Question | Fallback if no |
|---|---|---|
| K1 | `listFolderEntries('/storage/emulated/0')` and `/Document` list everything | Device tab shows only the folders that list; Document added explicitly |
| K2 | `openPath` opens a PDF, an EPUB and a `.note` outside `Note/` | link allowed, open shows the host's error in the status line |
| K3 | `/storage` lists the SD card; its files list and open | no SD entry (L2 says "when one is in") |
| K4 | launch path + `getCurrentPageNum` when opened from a PDF (0-based? same as Lasso's `#page=`) | only the without-page row |
| K5 | `openPath(path, -1)` reopens a PDF / note at the last page read | label the row "This file (first page)" |

## 8. Steps (each green and installable)

- **S0** Spike: a debug action **Check device files** in Settings → Advanced (shown with debug logging on)
  that lists `/storage/emulated/0`, `/Document` and `/storage`, reads launch path and page, and shows the
  results as text Tilman can photograph or find in the log (counts and names of top-level folders only).
  K2 and K5 are checked by hand with **Open** buttons on the first PDF/EPUB it finds. Results go into
  `docs/dev/supernote-host-facts.md` once Tilman reports them; the action stays as a diagnostic.
- **S1** Help links + Back + link check (2.x). Visible: links work on existing pages.
- **S2** Demo rename, name check, policy line (3).
- **S3** Help rewrite (4) - Getting started, Overview, names, first-mention links.
- **S4** Device tab, This file rows, Quick Add line (6), help for it.
- **S5** Setup assistant (5), help for it.
- **S6** CHANGELOG, design-overview §2/§5, test-scenarios, full `npm run check`, device test.


Feature areas (`scripts/test-areas.json`): help rendering, link check and the examples test → `foundation`
(or a new area `help` naming the help pages, if that keeps `foundation` readable - decide in S1, note in As
built); demo space → `foundation`; setup assistant → `settings`; Device tab, This file, `linkTargets` →
`files`; the Quick Add line → `quick-add`.

## 9. Test scenarios (become `__tests__/scenarios/`)

1. Help: tapping `[Threads](threads.md)` opens Threads; `lasso.md#marking-for-later` opens on the screen with
   that heading; Back returns to the previous page at the same screen; Close clears history.
2. A broken link or anchor in `docs/user` fails `docs:user`.
3. A nested tag in `docs/user` that the demo lacks fails the examples test.
4. Fresh install → assistant opens on Settings; existing install → Daily as before.
5. Folders step with `Note/Projects` (3 subfolders) → suggests `Projects`, "exists · 3 folders"; Finish
   saves `projectsFolder: 'Projects'`, creates only the missing folders, moves nothing.
6. Simple → close-out, Calendar, Gmail, Notebook contents off; Everything → all on; notes choice sets the
   Default notebook or null.
7. Skip → `'done'`, nothing saved or created.
8. Device tab lists Document; linking `Document/Book.pdf` stores `+[[/storage/emulated/0/Document/Book.pdf]]`;
   re-edit locates it on the Device tab; missing file shows ⚠.
9. Opened from `Book.pdf` p. 12: Files pane shows both This-file rows while arming; with page →
   `…Book.pdf#page=11` (0-based per K4); Quick Add line on by default; opened from a note → off.
10. Opened from Home (no launch path): no This-file rows, no Quick Add line.

## 10. Risks

- FileBrowserPane at ~920 lines: the new rows go into their own file; if the `device` root wiring pushes it
  over 1,000, split the arming effects into `ui/fileBrowser/useArming.ts` first (no behaviour change).
- Help text drift: the link and name checks catch broken links and stray tags, not prose; review S3 on
  device page by page.
- Settings tab hidden during the assistant: Back/Skip must always be reachable (e-ink, no scroll).

## As built

- **S0** The device check is `storage/deviceCheck.ts` (listings, launch path, page, the first PDF, EPUB
  and `.note` outside `Note/` in `Document/` two levels deep, the internal root and the SD card) and
  `screens/settings/DeviceCheckScreen.tsx`, drawn in place of the settings like the Touch test.
  Besides "Open (last page)" (K5) each sample has "Open at page 1", and the launch file has "Open this
  file (last page)" and "Open this file at page N" with the page the SDK reports, so K4's numbering can
  be compared by eye. The log line holds counts and kinds only. A line in `settings.md` (Advanced) and
  in the CHANGELOG describe it; files in the `settings` area.
- **S1** Help files stay in the `settings` area, where the help renderer, `helpTopics` and the user-docs
  tests already were (no new `help` area; `foundation` stays as it is). One slug function: the
  generator and its script test load `src/domain/helpLinks.ts` itself through
  `scripts/lib/tsModule.mjs` (transpiled with the project's TypeScript, loaded only when needed, so
  the "next version" workflow keeps running without `node_modules`). The generator is `npm run gen`
  (there is no `docs:user` script); every tier and build runs it first. The slug keeps `_` as GitHub
  does, and letters are matched as a Latin range instead of `\p{L}` so every JS engine reads it.
  `PagedSection` holds a `jumpTo` back until its viewport is measured (a jump to a row needs the page
  height); this helps the Files pane's locate too. A list tap pushes onto the history like a link
  (§2.4). Scenario 9.2 is the script test in `scripts/test-userdocs.mjs` (the generator is not a
  Jest scenario). The first anchor link is Quick Add's "Mark for later" → `lasso.md#marking-for-later`.
- **S2** The old counterpart name is replaced in every source file, comment, test, golden file and
  living dev doc, not only in the demo and its tests, so no test or comment keeps it. The examples
  test (`__tests__/userDocsExamples.test.ts`) lands in S3 with the help text it checks: in S2 it would
  fail on every old tag, and the old names may not be allowlisted. The policy line sits in
  DEVELOPMENT-POLICY §6 (help pages), where the other help-page rules are; §8 is the checklist.
- **S3** The demo gets one more Coaching todo, `Send Jordan the book tip #owe/jordan [due:: …]`, so the
  help's I-owe examples (threads, engage) are demo-true; the design's list of demo todos had no `#owe`.
  Placeholders allowed by the examples test: `#wf/name`, `#owe/name`, `#w/f` (a label), `#tax/2026`
  and `#sparring/jordan/2026` (a deeper tag), each with its reason. A loop idea and a loop rename are
  described without an invented tag. The "Tabs at a glance" list on the Overview carries no page links,
  because a linked list item under a `##` heading of `index.md` would add a group to the help's page
  list. Getting started does not link the setup assistant yet (S5 adds that link with its page). The
  other real names the old help used (a company and three people) are also replaced in code, tests and
  goldens with demo names (Team, Sam, Lena, Marco); one test's expected order follows the new names.
- **S4** K1-K5 all answered yes on the device (no SD card was in, so the SD branch is as designed, not
  seen); no fallback of §7 was needed. Facts in `supernote-host-facts.md` §7.
  - **Device tab contents (Tilman's decision on L2)**: on the internal storage the tab shows only the
    Supernote's own folders next to `Note` - `Document`, `EXPORT`, `INBOX`, `MyStyle`, `SCREENSHOT`,
    `Note` - plus `Download` (not a folder the Supernote shows, but useful), as the list
    `DEVICE_FOLDERS` in `domain/linkTargets.ts`; Android's and the apps' folders are not offered. An SD
    card shows everything but hidden folders, `Android` and `LOST.DIR`.
  - **Page links are 1-based** in the file: a This-file link to index 11 (p. 12) is `…Book.pdf#page=12`
    (`buildPageAnchor`, as lasso links), not `#page=11` as §9 scenario 9 said.
  - **One pick path**: `storage/linkedFiles.ts`'s `pickedPath` replaces the four copies of
    "root + relative" in the arm handlers and accepts an absolute pick (SD card, This file).
    `locateLinkedFile`'s last fallback is anywhere on the internal storage, which also locates an
    Area's file inside one of its Projects. An SD file opens but doesn't auto-locate.
  - **The This-file rows** are a `thisFileRows` switch on FileBrowserPane (it renders
    `ui/fileBrowser/ThisFileRows.tsx` itself) instead of a `leadRows` node, so the callers don't create a
    component per render. FileBrowserPane grew from 922 to 934 lines (the switch, the `device` source
    kind); no split was needed.
  - **Quick Add's line** has two chips, **p. 12** and **no page**; tapping the filled one switches it
    off (no separate ✕). It sits in row 4, before the screen's grey line. It shows where the screen sets
    `thisFileLine`, which means its add handlers pass the new optional third argument `linkedFile` on to
    `buildTask`/`buildMeeting`: the project/area page, Inbox, Daily, Week, Month, thread and loop
    overviews, Engage. The Review steps and Gmail don't show it. The launch file is read again after
    every reopen (`noteLaunchChanged` from App's `reorient`).
  - **The Review's Inbox step** also got the Device tab and This-file rows (L1: "in the Inbox").
- **Help typography (asked for after S4)**: links are bold and underlined, so they stand out from the
  bold labels. The markdown subset gains `*italic*` (`domain/markdownBlocks.ts`; a `*` followed by a
  space stays text). In `docs/user` every bold text was looked at: labels as the app shows them stay
  bold; a label or term with its own section elsewhere became a link to it on its first mention per page
  (Create Project → "Creating one", Run Integrity Check → Settings "Advanced", Settings → Folders …,
  dropping a "see …" to the same page right after it); terms the page explains became italics; a tag
  became `code`. The rule is in `docs/dev/README.md` "Writing user docs"; `scripts/test-userdocs.mjs`
  also fails when a page lands in two groups of the help's list.
- **S5** The assistant is `domain/setupAssistant.ts` (suggestions, statuses, `initialChoices`,
  `planFinish`), `storage/setupAssistant.ts` (`scanBaseFolder`, `finishSetup` through `patchSettings` -
  the normal save path, refused while settings are unreadable - then `ensureFolderExists` for the
  missing folders only; `skipSetup`) and `screens/settings/SetupAssistant.tsx` (about 300 lines).
  The base folder is an editable field too; it is read again half a second after a change (at once on
  the first read), and the first read fills in the suggestions. The status text after Finish is
  `domain/fileChangeText.ts`'s `setupFinishedText` plus "Create your first project here.", published
  `global` so it survives the switch to the Projects tab. ? Help goes through a new module store,
  `ui/helpStore.ts`, that `useAppOverlays` opens the help for (Folders → Getting started "Your folders",
  Notes → Note setups "The Default", Features → Features, Demo → "The demo space", Finish → Settings
  "Setup assistant"). App lands on Settings with the assistant only on its first reorient while
  `setupAssistant` is 'pending'; leaving the Settings tab ends that start. Run setup assistant is
  disabled while the folder fields differ from the stored settings. The Create demo space text moved to
  `fileChangeText.ts` (`demoSpaceCreatedText`) for ProfilesSection and the assistant. The debug bundle
  shows `setup assistant pending|done`.
- **S5b** `supernote/fileSystem.ts` was split as `docs/dev/history/technical-design-filesystem-split.md`
  describes (its own As built has the details): devicePaths, hostContext, hostCall (`callHost`),
  noteFileApi, diagnosticFiles, fileSystem and the internal fileNative. `INTERNAL_STORAGE` has one home,
  `supernote/devicePaths.ts`; `useThisFile`, `deviceCheck` and `deviceRoots` read the launch path and the
  page from `supernote/hostContext.ts`.
- **S6** The CHANGELOG keeps the file's own section names (New, Changed, Upgrade notes) rather than
  "Added". README's feature list names the easy start, linking from anywhere and the linked help.
  `design-overview.md` §2.1 (help links), §2.6 (Device tab, This file), §2.12 (setup assistant, Check
  device files) and §2.13/§3 (the supernote/ modules) are current; it has no §5. Coverage: no area fell
  more than 0.7 points; the baselines that grew were raised, none lowered.
- **Scenarios of §9**: 1 `__tests__/scenarios/helpLinks.test.tsx`; 2 `scripts/test-userdocs.mjs` (link
  check); 3 `__tests__/userDocsExamples.test.ts`; 4-7 `__tests__/scenarios/setupAssistant.test.tsx`; 8-10
  `__tests__/scenarios/deviceLinks.test.tsx`; S0's check `__tests__/scenarios/deviceCheck.test.tsx`.
