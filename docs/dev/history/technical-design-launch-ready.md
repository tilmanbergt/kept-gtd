# Technical design - 0.24.0 "Launch ready"

Status: **APPROVED with decisions O5, O6, O10 (2026-10-30)**. Requirements: `docs/dev/history/requirements-launch-ready.md`
(C, S, N, M, L, Polish) plus **H** (§2, carried over from 0.23.0).
Base: `main` at `4450ec2` (0.23.0 released, nextVersion 0.24.0) **plus the newer work from `feature/easy-start`** (`ab70037`):
Settings tabs (8 → 6, Data tab) and Remove Kept's data (designs in `docs/dev/history/technical-design-settings-tabs.md`
and `-remove-data.md`). That work also removed Touch test and Check device files (`deviceCheck.ts`,
`touchDiag`). Branch: `feature/launch-ready`, created from `main` with `feature/easy-start` merged in
(test merge: clean).

**Implementation: locally, in the Cowork session, not in a cloud Claude Code session.**
- Claude works in its own clone of the public repo at the branch head, runs
  `npm run check -- --affected` (or the full tier) there, and writes the changed files into
  Tilman's local repository. Every write is verified by re-staging the file and
  comparing checksums.
- Claude can't delete or rename files there. For those it gives `git rm` / `git mv` lines.
- Tilman commits each step with the message Claude gives (it includes the Device test block) and
  pushes. CI builds the test `.snplg`; `buildPlugin.ps1` is the local alternative.
- Before each step Claude re-fetches the branch, so it must be pushed. Local edits Tilman makes on
  the branch must be pushed (or mentioned) before the next step.

Goal: **robustness, not tuned layouts.** On the A5 X in portrait nothing changes visibly. On a Manta,
in landscape and on a (simulated) Nomad, nothing is cut off, unreachable or placed off the page.
Where Kept can't do something, it says so plainly.

## 1. Overview

| Part | Where | Size |
|---|---|---|
| H "Home" wording | `hostCall.ts`, `debugBundle.ts`, `hostContext.ts`, `deviceCheck.ts`, `ThisFileRows.tsx`, `linkTargets.ts`, `quick-add.md`, test-scenarios + `deviceLinks.test.tsx`, easy-start design As built | tiny |
| C Create-note limitation | `domain/noteCreation.ts` (new, pure), `storage/noteCreationGuard.ts` (new), the 6 creators, `noteFileApi.ts`, help | small |
| S Screen size + simulate | `domain/screenLayout.ts` (new), `ui/ScreenSize.tsx` (new), App root, every `678`/`1872` user, Settings → Advanced | medium |
| N Page frame | `domain/pageFrame.ts` (new), `storage/pageFrames.ts` (new), the element writers | medium |
| Spike | Settings → Advanced → **Check screen and pages** (debug) | small |
| Checklist + fixes | `docs/dev/device-checklist.md` (new), fixes per finding, `ui/TwoPane.tsx` only if needed | open |
| L/Polish | README, inkhub-listing, help, design-device-rendering, host facts | small |

No file format change. No new settings key: the simulation lasts only for the session (§4.3).

## 2. H - no "Home" on Supernote

Plugins open only from the Note or the Document app, so there is no "Home" launch. A launch path of
null means **"launch file unknown"** (reading it failed, or it isn't captured yet), not Home.
- Code: `hostCall.ts` writes `launch=(unknown)` instead of `(Home)`; `debugBundle.ts` writes
  `none (unknown)`. Fix the comments in `hostContext.ts`, `ThisFileRows.tsx` and `linkTargets.ts`
  (`deviceCheck.ts` no longer exists).
- Help: in `quick-add.md`, replace "opened from Home it doesn't show" with "when Kept can't tell which
  file it was opened from, it doesn't show".
- Tests: rename the scenario "…from Home nothing is offered" to "…launch file unknown: nothing is
  offered" in `deviceLinks.test.tsx` and `test-scenarios.md`. The behaviour is unchanged.
- `history/technical-design-easy-start.md`: one As-built line pointing to this fix.

## 3. C - create-note limitation

### 3.1 Domain (`domain/noteCreation.ts`, pure)
- `launchKind(path: string | null): 'note' | 'document' | 'unknown'`: `.note` = note; `.pdf`,
  `.epub` or any other file = document; null = unknown. This reuses `linkTargets.ts`'s extension rule
  (move it here, or import from there).
- `NOTE_CREATION_BLOCKED_TEXT = "Supernote doesn't let plugins create notes when opened from a PDF or
  EPUB. Open Kept from a note to create this one."` (decided, O10).
- `isHostCreateRefusal(message)`: true for the host's "not allowed to use this API" text, matched
  case-insensitively on "not allowed to use this api".

### 3.2 Guard (`storage/noteCreationGuard.ts`)
- `assertCanCreateNote()`: reads `getRememberedLaunchNotePath()`. When it is `'document'`, it throws
  `NoteCreationBlockedError` with the text above, before any host call. For `'note'` and
  `'unknown'` it does nothing.
- The six creators call it first: `homeNotebooks.ts`, `itemNotePlan.ts`, `noteLinks.ts`,
  `textNote.ts`, `standaloneNotes.ts` and `sharedNotePages.ts` (where it creates a file). Better still,
  one call in `noteFileApi.createNote` itself, if every UI path already reports a thrown error in the
  status slot. Decide in step L1 after checking the callers, and note the decision in As built.
- `noteFileApi.createNote`: when `isHostCreateRefusal(hostMessage)`, it throws
  `NoteCreationBlockedError` with the same text instead of today's "Though write permission is
  granted, note creation was blocked by the device: …". The host text stays in the log and in
  `recordDebugLogEntry`.
- UI: the status slot shows `error.message` as today (`utils/errorMessage.ts`). No new UI. Where an
  action creates a note and also writes something else first (for example, a todo added and then its
  note), check that the order leaves nothing half done. If it does, the guard moves before the first
  write.

### 3.3 Help
`files-and-folders.md` gets a new section "Known limitations" with three short items:
- notes can't be created from a PDF/EPUB;
- which devices and orientations are checked (§8);
- new notes are portrait.

`note-setups.md` and `getting-started.md` (Notes) link to it. The link check from 0.23 covers the
anchor.

## 4. S - screen size from one place, simulate screen

### 4.1 Source (`ui/ScreenSize.tsx`)
- `ScreenSizeProvider` wraps App's root view. It measures its own box with `onLayout` and provides
  `{width, height, simulated: boolean}` through a context. Before the first layout it uses
  `Dimensions.get('window')`; if that is 0, it falls back to `A5X_PORTRAIT` (994×1325).
- `useScreenSize()` reads the context. Nothing else in `src/ui` or `src/screens` reads `Dimensions` (the touch
  diagnostics that did were removed with the settings rework).
- Rotation: `onLayout` fires again and the context updates. Screens that compute budgets in `useMemo`
  must depend on the size. Whether the host rotates the plugin view at all, or restarts the plugin, is
  spike question K1.

### 4.2 Derived values (`domain/screenLayout.ts`, pure)
- `A5X_PORTRAIT = {width: 994, height: 1325}`. The exact measured root size goes in here after spike
  K3.
- `estimatorColumnWidth(screen)`: the figure the line estimators take (today the constant `678`).
  - It returns exactly `678` when `screen.width` is within ±8 dp of the A5 X reference, so pagination
    on the A5 X does not move.
  - Otherwise it returns `round(678 × realColumnWidth(screen) / realColumnWidth(A5X_PORTRAIT))`, with
    `realColumnWidth = (width − 2·16 − 16) / 2` for the standard two-column layout.
  - Single-column screens (§4.4) pass their real width instead.
- `layoutWidthClass(screen): 'wide' | 'narrow'`: narrow below **800 dp** (O4).
- `listBudgetHeight(screen, chrome)` replaces ItemsList's `1872 − …`. That mixed pixels and dp; it is
  the known "On Hold column cut off" candidate.

Call sites (from the inventory on `d864b5e`):
- Replace every `COLUMN_WIDTH_PX = 678` / `TASK_COLUMN_WIDTH_PX` with `estimatorColumnWidth(useScreenSize())`:
  - `ui/itemEntryRow.ts`, `ui/taskRowLayout.ts`, `ui/FileBrowserPane.tsx`, `ui/TaskRow.tsx`
    (default prop), `screens/InboxScreen.tsx`, `screens/daily/dailyRows.ts`;
  - the importers in Review steps (`shared.tsx`, `ItemListStep`, `SomedayStep`, `InboxStep`), thread
    (`AheadSection`, `PastMeetingPanel`), `MeetingContextPanel`, `useEngagePrompt`, `engageStyles`
    (`TouchTestRows` is gone).
  - Pure helpers keep taking the width as a parameter; only components read the hook.
- `screens/ItemsList.tsx`: `COLUMN_BUDGET_PX`/`FULL_VIEWPORT_PX` become a self-measuring
  `PagedSection` (as most lists already are) or `listBudgetHeight`. The "on purpose" comment at line
  ~341 is resolved.
- `ui/MarkOutcomeScreen.tsx`: `box.width: 820` becomes `maxWidth: 820, width: '100%'`. 820 is wider
  than a Nomad.
- Other fixed widths found (`ThreadOverview` lens 380, `noteSetupsStyles` card height 260, `AboutTab`
  wordmark, small label widths) are checked by the checklist, not changed blindly.

### 4.3 Simulate screen (debug)
- Settings → Advanced, in the Tools column, shown while debug logging is on: **Simulate
  screen** with the options Off / Nomad portrait (750×1000) / Nomad landscape (1000×750) /
  A5 X landscape (1325×994), the last for when you don't want to rotate.
- It is held in a small store (`ui/screenSimStore.ts`, the same pattern as `keepAliveStore`), **not
  saved**: a plugin restart turns it off, so nobody can get stuck in a small box.
- With a simulation on, `ScreenSizeProvider` renders the app inside a `View` of that exact size at
  the top left, with a 2 dp black frame. The rest of the screen is white with one grey line: "Simulated
  Nomad portrait · Settings → Advanced to turn off". `onLayout` then reports the simulated size, so
  everything downstream reacts as on the real device.
- Physical match: a dp is about the same physical size on the A5 X (226 ppi) and the Nomad (300 ppi),
  so text size, tap targets and how much fits match the Nomad. The frame only proves layout and
  reachability, not host behaviour.

### 4.4 Narrow layouts (only where the checklist finds breakage)
- `ui/TwoPane.tsx` (new, only if needed): `wide` shows two columns as today; `narrow` shows one column
  with a `MiniTabs` toggle (existing component) naming both sides, for example "Todos | Meetings".
- Likely candidates (O4): Daily, ProjectDataPanel with the Files pane, InboxScreen with the Files
  pane, Review master/detail steps, the Areas/Projects list. Each is converted only when the checklist
  shows it breaking at 750 dp.

## 5. N - page frame for notes

### 5.1 Rule
Note setups, pieces and headings are defined in **A5 X reference pixels** (1404×1872), as today and as
the Settings preview shows them. When Kept writes into a page, it maps that reference onto the page's
real size:
- `scale = min(page.width, page.height) / 1404`, based on the short side:
  - A5 X portrait or horizontal: 1.0;
  - Manta 1920×2560: ≈ 1.37, which is about the same physical size, since the Manta is also ~10".
- x, y, width, height and font size are multiplied by `scale`. Link rects too.
- **Fit check:** an element whose scaled rect goes past the page's right or bottom edge is left out,
  never clipped or moved.
  - In practice this happens only in horizontal notes, for anything placed below y ≈ 1404 in the
    reference.
  - The writer returns `{written, skipped}`. When `skipped > 0` the status line says: "1 piece didn't
    fit on this horizontal page and was left out."
- Keywords have no geometry and are unchanged.
- Headings (`noteFindability.ts` titles) are elements and follow the same rule.

### 5.2 Code
- `domain/pageFrame.ts` (pure):
  - `PageFrame {width, height, scale}`;
  - `frameFor(size)`;
  - `placeSpec(spec, frame)` for text boxes, `placeLink(link, frame)`, `fits(rect, frame)`.
  - Unit-tested: A5 X identity; Manta scale; horizontal A5 X drops a piece at y = 1600 and keeps one
    at y = 100.
- `storage/pageFrames.ts`: `readPageFrame(path, page)` via `noteFileApi`/`pdfNative.getNotePageSize`,
  cached per path+page for the session. On failure it uses the A5 X frame, logs a warning, and keeps
  today's behaviour.
- Writers that switch to the frame (inventory on `d864b5e`):
  - `supernote/noteElements.ts` (`toRect(spec.x, …)`) takes a frame. This is the main entry for
    pieces.
  - `storage/sharedNotePages.ts:305` (`toRect(DEFAULT_PIECE_X, …)`).
  - `storage/meetingNoteContent.ts:296/307`. Its second call re-inserts elements it built itself
    without links: these must be scaled **once**.
  - `storage/textNote.ts`: the text rect from `NOTE_PAGE_*` minus margins becomes the frame's
    width/height minus scaled margins. This is used for the Gmail email note and other text notes.
  - `storage/noteFindability.ts:61` (titles).
- Rule: elements read from a page (`getElements`) and written back are **never** scaled. Only
  elements built from a spec are. A test pins this.
- Not changed: `NoteTemplatePreview` (shows the reference), the PDF archive text page `A5X_PAGE` (a
  PDF of its own), `pdfExport` (already reads the real size), `lassoRead` (already reads
  `getPageSize`).
- New notes stay portrait (`createNote(..., isPortrait = true)`, unchanged).

## 6. Spike (step L0, ~20 min on the device)

A debug action **Check screen and pages** in Settings → Advanced → Tools (only while debug logging is
on; 0.24's settings rework removed the older Check device files, so this one is temporary: it is
removed again in L8 once K1-K5 are recorded). It shows text to photograph, and logs only sizes and
counts:

| # | Question | How | Fallback if "no" |
|---|---|---|---|
| K1 | Does the plugin view rotate with the device, and does Kept restart? | Shows the root size from `onLayout`, `Dimensions` window and screen, `PixelRatio`, and a count of layout changes since start. Tilman rotates with Kept open and taps **Refresh**. | Kept is checked only after opening it in the new orientation; the help says "reopen Kept after rotating". |
| K2 | What does `getPageSize` return for a horizontal note? | **Create horizontal test note**: `createNote(EXPORT/kept-gtd/debug/landscape-test.note, style_white, isPortrait=false)`, then `getPageSize` page 0. | Width/height swapped or an orientation flag → `frameFor` adapts. |
| K3 | Root size on the A5 X in portrait and in landscape | Same screen as K1. | (always answered) |
| K4 | Does `insertNotePage` add a horizontal page to a horizontal note? | **Insert page** on the test note → page count + `getPageSize` page 1 → **Open** it. | If portrait pages appear: Kept refuses to insert into horizontal notes, with a message (stricter N2). |
| K5 | Do pieces land right? | **Write test piece** at reference (100, 100) and (100, 1600) through §5 → open the note. | (a fix, not a fallback) |

- The test note lives in `EXPORT/kept-gtd/debug/`, not in the user's notes. The note-creation steps
  need Kept opened from a note (C).
- K1 and K3 go into `supernote-host-facts.md` §5, K2/K4 into §2, and the action stays as a
  diagnostic.

## 7. Steps (each green, installable, one commit or more)

- **L0** Spike action (§6) and **H** (§2). Then the device-dependent work (§4.2 reference size, §5
  orientation) **pauses until K1-K5 are reported**; L1 and L2 can continue meanwhile.
- **L1** C: guard, error mapping, help "Known limitations" (first two items).
- **L2** S foundation: `ScreenSizeProvider`, `screenLayout.ts`, all `678`/`1872` call sites,
  MarkOutcome width. Must show no visible change on the A5 X in portrait; this is verified by the
  existing pagination tests passing unchanged.
- **L3** Simulate screen (§4.3).
- **L4** N: page frame and writers, using K2/K4/K5.
- **L5 Device checklist round 1** (Tilman, §9.2) on the CI build of L4. Findings go back to the
  session as a list.
- **L6** Fixes from the checklist, plus `TwoPane` where needed.

  **Cut line:** if more than ~3 screens need a narrow layout, ship 0.24.0 with Nomad "not supported
  yet" in the listing and move the narrow layouts to 0.25.0.
- **L7** Polish:
  - Obsidian help page check (the session compares it with the Obsidian Tasks docs; Tilman confirms
    in his vault);
  - smoke renders for every Review step, also at 750×1000;
  - `PAGE_SIZE` leftovers;
  - the stale comments listed in the backlog.
- **L8** Docs and release prep:
  - README and `inkhub-listing.md` device lines (§8);
  - `design-device-rendering.md` §1 "Other screens" (Manta, Nomad, landscape; the estimator rule);
  - `design-overview.md` §2/§5;
  - CHANGELOG (Changed: clearer note-creation message, works in landscape, Manta notes; no upgrade
    note needed);
  - `test-scenarios.md`;
  - full `npm run check`.

Feature areas (`scripts/test-areas.json`): `noteCreation`/guard → notes area; `screenLayout`,
`ScreenSize`, `screenSimStore` → `foundation`; `pageFrame`/`pageFrames` → notes area;
`device-checklist.md` → docs only.

## 8. Listing wording (after L5/L6 and M)

- With a Manta tester: "Made on the Supernote A5 X; checked on Manta, in landscape and on a
  simulated Nomad. Beta."
- Without one: "Made on the Supernote A5 X; checked in landscape and on a simulated Nomad; Manta
  should work."
- If the cut line applies: "Nomad: not supported yet."

## 9. Testing

### 9.1 Automated (the session)
- Unit:
  - `screenLayout` (A5 X → exactly 678; Manta; Nomad portrait/landscape; A5 X landscape;
    `layoutWidthClass` threshold);
  - `pageFrame` (identity, Manta scale, horizontal drop, links, font size);
  - `noteCreation` (`launchKind`, refusal matching).
- Scenarios (`__tests__/scenarios/`, written as user stories):
  1. Opened from a PDF, tapping a todo's note icon creates nothing, makes no host call, and the status
     says the limitation sentence.
  2. Opened from a note, the host refuses anyway: the same sentence appears; the log has the host
     text.
  3. Launch file unknown: no This-file line, and note creation is tried (H + C).
  4. A home notebook page in a horizontal note (fake page size 1872×1404): pieces above the fold are
     written, one below is left out, and the status says so.
  5. A meeting note on a Manta-sized page (1920×2560): piece positions scaled ×1.37.
  6. Elements read and re-inserted are not scaled again.
- Render: the smoke scenarios (`appStarts`, `daily`, `areaPage`, `review`, `engagePage`,
  `weekAndMonth`, `captureTodo`) also run inside a `ScreenSizeProvider` fixed at 750×1000 and at
  1325×994. They assert no crash and no "Element type is invalid". react-test-renderer has no layout
  engine, so overflow is a device question (9.2).
- `fakeSdk.getPageSize` becomes configurable per path (today it is fixed at 1404×1872).
- The existing pagination tests must pass unchanged after L2 (the A5 X regression guard).

### 9.2 Device (Tilman), `docs/dev/device-checklist.md`
Four columns: **A5 X portrait** (regression), **A5 X landscape** (real), **Nomad portrait (sim)**,
**Nomad landscape (sim)**. Per screen: nothing cut off, every button reachable, lists page, text not
overlapping. Rows:
- Main tabs: Daily (incl. tag filter), Week, Month, Projects, Areas (incl. On Hold column), Inbox,
  Review hub and each step, Threads, Loops.
- Project/area page: Todos, Meetings, Files pane (incl. Device tab, This file rows), Notebook tab,
  Projects tab of an area; item detail/status/scope.
- Quick Add: each tab, add and edit, chips overflow, This-file line.
- Capture: Lasso screen, Mark outcome, Mark for later list.
- Engage on a meeting page and on a todo page (strip, tabs, Quick Add inside).
- Overviews: thread, loop, meeting context panel.
- Settings: every sub-tab, the setup assistant (all steps), the Note setups editor with preview,
  Check screen and pages, Remove Kept's data (open it, don't run it).
- Help overlay (links, Back), What's new, close-out wizard (open it, don't run it).

Plus the note checks:
- a. A5 X: create a meeting note, a home notebook page and a shared-note page. They should look
  exactly as in 0.23.0 (compare with a photo).
- b. Pick a horizontal note you made by hand as a home notebook (or a shared target), add a page,
  and look at the result.
- c. Lasso from a horizontal note.
- d. Open Kept from a PDF, tap a note icon: you see the message, and nothing is created.
- e. Rotate with Kept open (behaviour per K1).

### 9.3 Manta tester (M2)
Beta build from L6. The tester:
- creates a meeting note with a setup that has pieces;
- adds a home notebook page;
- captures one lasso todo;
- photographs Daily, a project page and Quick Add;
- sends a debug bundle (Settings → About).

What we look for: are the pieces in the right place and size, is any text cut off, and do lasso
links land on the right spot.

## 10. Open points

| # | Point | Who / when |
|---|---|---|
| O1 | Does the plugin view rotate live (K1)? Decides "reopen after rotating" vs. live re-layout. | Spike L0 |
| O2 | Page size and orientation of horizontal notes, and whether inserted pages stay horizontal (K2/K4). | Spike L0 |
| O3 | Exact root size on the A5 X (K3), the reference that keeps 678 unchanged. | Spike L0 |
| O4 | Narrow threshold (proposed 800 dp) and which screens get one column. | Checklist L5 |
| O5 | Pieces on a Manta: same relative layout (`scale` by short side). | **Decided: yes** |
| O6 | Simulate screen not saved across restarts. | **Decided: yes** |
| O7 | A Manta tester: who, and when the beta goes out (after L6). | Tilman is checking |
| O8 | Obsidian page: Tilman confirms the Tasks setting names in his vault. | L7 |
| O9 | Does `createNote` on a Manta make a Manta-size page (assumed yes)? | Manta tester |
| O10 | Wording: "Supernote doesn't let plugins create notes when opened from a PDF or EPUB. Open Kept from a note to create this one." | **Decided** |
| O11 | Cut line for Nomad narrow layouts (§7 L6). | After L5 |
| O12 | Guard in each creator vs. once in `createNote` (§3.2). | L1, As built |

## 11. Risks

- **Silent A5 X regressions** from replacing `678`. Guarded by the exact-678 rule and the unchanged
  pagination tests, and by checklist column 1.
- **Double scaling** of elements re-inserted after a read (meetingNoteContent). Guarded by scenario 6.
- **The simulation hides host differences** (Nomad firmware, real rotation). Guarded by the listing
  wording, which says "simulated".
- **Scope creep in L6.** The cut line keeps the release about robustness.

## As built

- **L0** (`storage/screenPageCheck.ts`, `screens/settings/ScreenCheckScreen.tsx`): the check also
  shows the device a note was made on (`getFileMachineType`) and writes a third test text box at
  y 1300 (inside a horizontal page) next to 100 and 1600. The fake SDK models a page size and machine
  type per note; `createNote(..., isPortrait = false)` makes a horizontal one.
- **L1**: the guard sits in two places. `noteFileApi.createNote` refuses before the host call when the
  launch file is a document and maps the host's refusal to `NoteCreationBlockedError`
  (`domain/noteCreation.ts`), which covers every creator, also those without a confirm (Quick Add's
  Note tab, the Gmail email note). `ui/useNoteCreateConfirm.ts` throws the same error before asking
  when none of the plan's files exist yet, so nothing is asked first. The rule is "the file doesn't
  exist", not the plan kind: a reflection plan whose notebook is missing creates a file too. Adding a
  page to an existing note is still tried from a document (whether the host allows it is open).
- **L2**: `ScreenSizeProvider` starts from the window size, so the app and its button listener mount
  at once, and follows the root's layout. It keys the app on the estimator figure, so the app is
  drawn anew only when that figure changes (a narrow screen; never on the A5 X or wider). The fake
  device's window is the size the scenario helpers lay out at (1340 × 1500). The six copies of 678
  are gone; `A5X_ESTIMATOR_WIDTH` is the one constant. ItemsList's Areas "On Hold" box measures its
  own height (its budget mixed pixels and dp). Mark outcome's box is at most 820 dp wide and keeps a
  16 dp margin.
