# Technical design: Engage and Capture follow the page's section

Status: **approved** (Tilman, 2026-10-25). Release **0.21.0**, steps **S8-S12** on `feature/meetings-moment`,
after 0.21's S0-S7 (`technical-design-meetings-0.21.md` §16). 0.21's device test (§14 there) runs once, after
S12, together with §6.3 here.
Requirements: `docs/dev/history/requirements-engage-page-owner.md` (P1-P11). This document is the source for
the implementation. Where the code shows the design is wrong or incomplete, update this document in the same
commit and note it under "As built".

## 1. Requirements (summary; the decisions are in the requirements doc)

- **P1** A home notebook belongs to its Project/Area, even when it is also an active loop's note.
- **P2/P3** A page that nothing claims directly takes its owner from the nearest earlier **section page**: a page
  with a Supernote title, or with a Kept GTD keyword (todo, meeting, reflection, `home`, `loop …`).
- **P4** Your own heading, and the Home page, start a section owned by the notebook owner. A loop page belongs to
  its loop while that loop is active.
- **P5** A todo page's follow-ups make that todo current. A meeting page's follow-ups pass on the meeting (moment
  line, strip, From tab).
- **P6** All shared notebooks. **P7** Fallback: the notebook owner.
- **P8** A cancelled item's page starts a section with its item's owner; no current todo, no page meeting.
- **P9** Section line in Engage: the title, or "Handwritten section", and "from p. N".
- **P10** Capture: a meeting's follow-up page records the meeting; For chips put the section's thread/loop first.
- **P11** One page index per file, shared with Contents.

## 2. Current state (0.21 S0-S7)

- `storage/noteOwnerOf.ts` `noteContextOf(absPath, page, source, paths)`:
  1. `entryForNotePage`: own note, `#page=N` link, or a shared page carrying the entry's keyword (one
     `getKeyWords` call for that page). Cancelled entries are skipped.
  2. `loopNoteOwner`: the file's name equals what some active loop's note name renders to; the first active line
     in `## Loops` wins, on every page.
  3. `findEnclosingItem` → the item.
- `domain/notePageEntry.ts`: pure candidates (`notePageCandidates`, `sharedPageHit`), meetings before todos,
  reflection keywords map to their meeting.
- `storage/notebookContents.ts`: per-file cache `{mtimeMs, keywords, titles}`. It reads with
  `readAllKeywords` (one call), `getTitles(all pages)` (one call), and one `getElements` per titled page without
  a gtdpara keyword of *this item*. It is item-dependent and used only by the Notebook tab.
- Engage: `useEngageFlow.resolveOpening` → `decideOpening` → the `open` event with `owner`, `current`,
  `pageMeeting`. `pageMeeting` drives the moment line, the strip, the From tab and the Quick Add provenance.
- Capture: `screens/CaptureScreen.tsx` resolves `sourceMeeting` once per source page through
  `storage/threadProvenance.ts` `meetingForNotePage(path, page, threadSources)`, which is `entryForNotePage` for
  meetings (its sources include the Inbox). `useProvenance` feeds the grey line, and `ui/capture/agreementFor.ts`
  builds the For chips from `pageMeeting` and the note's destination.

## 3. Design

### 3.1 One page index per file (`storage/notebookPages.ts`, new; the Contents cache moves here)

```ts
interface NotebookPageIndex {
  mtimeMs: number;
  totalPages: number;
  keywords: PageKeyword[];                                                   // all pages, one getKeyWords call
  titles: Array<{page: number; y: number; rect: PageRect; trail: number[]}>; // one getTitles call
}
loadPageIndex(path): Promise<NotebookPageIndex>          // statFiles → cache hit, else read
headingTextOf(path, index, page): Promise<string | null> // getElements(page) once, memoized per (path, mtimeMs, page)
cachedPageIndexCount(): number                           // debug bundle (replaces cachedContentsCount)
```
- The read and the cache are what `storage/notebookContents.ts` does today, minus the item-dependent part.
  Heading texts are resolved lazily per page and memoized in the same entry.
- `loadContents` becomes: index → `gtdparaPages(index.keywords, item)` → `headingTextOf` for the other titled
  pages → `buildContents`. It behaves the same as today.
- The Notebook tab, Engage and Capture share one read.
- Not tied to the Contents switch (Settings › Advanced): that switch still only hides the tab's Contents.
- In memory, rebuildable, keyed by path + mtime; an unknown mtime (`-1`) is never cached.
- Logs: pages, titles, ms, hit/miss. Never texts or names.

### 3.2 Classifying pages (`domain/pageSection.ts`, new, pure)

```ts
type PageClaim<R> =
  | {kind: 'entry'; entry: PageEntry<R>; cancelled: boolean}  // todo / meeting / reflection
  | {kind: 'home'}
  | {kind: 'loop'; tag: string}
  | {kind: 'heading'; y: number}                              // a title, no Kept keyword
  | null;
claimOfPage(page, {keywords, titles, pageLinks, sharedCandidates}): PageClaim<R>
```
Order on one page:
1. A `#page=N` link of an entry (cancelled included).
2. An entry keyword: shared candidates (cancelled included) through `sharedPageHit` (stored keyword, current
   keyword, reflection keyword).
3. `home`, then `loop …` (`LOOP_PAGE_KEYWORD_PREFIX`).
4. A title (the topmost by `y`) → `heading`.
5. Otherwise null.

A page with both a Kept keyword and a title is the keyword's.

`notePageCandidates` gets an option `includeCancelled` (default false, so today's callers are unchanged), and
returns all page links as a list.

```ts
interface PageSection<R> { page: number; claim: Exclude<PageClaim<R>, null> }
sectionOfPage(openPage, claimAt: (page: number) => PageClaim<R>): PageSection<R> | null // nearest p ≤ openPage with a claim
```

### 3.3 One lookup for Engage and Capture (`storage/pageSection.ts`, new)

```ts
interface PageSectionResult<R> {
  section: PageSection<R> | null;
  distance: number;            // openPage - section.page
  headingText: string | null;  // only for `heading`
  indexRead: boolean;
}
pageSectionOf(absPath, page, sources: PageEntrySource<R>[]): Promise<PageSectionResult<R>>
```
- **Own note** (the whole file is an entry's) → `{section: {page, claim: entry}, distance: 0}`, no index read.
- **Otherwise:** `loadPageIndex` → `sectionOfPage`, plus `headingTextOf` for a heading section only.
- **Index unreadable:** logged (`pageSection: index not read`), then today's single-page `entryForNotePage`, with
  `indexRead: false`. Engage and Capture never fail because of it.

### 3.4 Notebook owner (`domain/pageSection.ts` + `storage/noteOwnerOf.ts`)

`notebookOwnerOf(absPath, source, paths, settings)`:
1. **Home notebook (P1).** The enclosing item's Default notebook folder is the file's folder, and the file name is
   in `homeNotebookYears({template, itemName, itemAbbrev, date: today}, [openFileName], thisYear)` (pure, no
   listing) → `{kind:'item'}`.
2. **Active loop note** (today's `loopNoteOwner`) → the loop.
3. **Enclosing item** → `{kind:'item'}`.
4. **None.**

### 3.5 Engage (`storage/noteOwnerOf.ts`)

```ts
type NoteContextRule = 'todoNote' | 'meetingNote' | 'section' | 'loopNote' | 'item' | 'none';
interface NoteContext { owner; todo; meeting; rule; section: SectionInfo | null }
interface SectionInfo { page: number; distance: number; title: SectionTitle }
```
From `pageSectionOf(absPath, page, pageSourcesOf(source))`:
- **Entry, not cancelled:**
  - todo → `ownerOfTodo`, plus the current todo if it's open;
  - meeting or reflection → `ownerOfMeeting`, plus `meeting`;
  - rule `todoNote`/`meetingNote` at `distance === 0`, else `section`.
- **Entry, cancelled (P8):** the owner as above, `todo: null`, `meeting: null`, rule `section`.
- **`home` / `heading`:** the notebook owner, rule `section`.
- **`loop`:** that loop if it's active in the enclosing item, else the notebook owner.
- **No section:** the notebook owner, rule `loopNote`/`item` as today, `section: null`.
- **Own note:** `section: null`.

### 3.6 Capture (`storage/threadProvenance.ts`, `ui/capture/useSourceSection.ts`, `ui/capture/agreementFor.ts`)

- `meetingForNotePage(absPath, page, sources)` runs on `pageSectionOf` over the thread sources (Inbox included).
  It returns the section's meeting when the section is a meeting or reflection entry that is **not cancelled**,
  else null. Same result type, plus `distance`.
- `ui/capture/useSourceSection.ts` (new) replaces CaptureScreen's inline provenance effect. Once per source page
  (`sourceKey`) it returns `{meeting, sectionOwner}`; `sectionOwner` is `ownerOfTodo` for a non-cancelled todo
  section. `CaptureScreen.tsx` is in the code-health baseline and must shrink or stay the same. The provenance
  line stays "↳ from <meeting> ✕".
- `agreementForChoices(source, pageMeeting, noteOwner, sectionOwner?)`: when there is no page meeting and
  `sectionOwner` is a thread or loop, its chip comes first.
- "File to" default unchanged (the note's enclosing item).
- Log: `CaptureScreen: source page belongs to a meeting <kind> <index> distance=<n>`.

### 3.7 Section title (`domain/pageSection.ts`)

`sectionTitleOf(section, source, headingText): {text; detail}`:
- todo → `tagsAsWords(todoPageKeyword(task))`;
- meeting → `tagsAsWords(meetingDisplayTitle(m))` + `formatDate(m.date)`; reflection → `Reflection · <meeting title>`;
- home → the item's name; loop → the loop name;
- heading → the first line of the typed text, else **"Handwritten section"**.

The labels are shared with `domain/notebookContents.ts`'s `pageEntry` (one source for the texts).

### 3.8 Engage UI

- `NoteContext.section` → `decideOpening` → the `open` event → `EngageState.section`. It is cleared like
  `pageMeeting` when you pick another owner, go back, or switch owner from a focus screen.
- `screens/engage/SectionLine.tsx` (new): one quiet line directly under the header, above MomentLine / LoopLine.
  FONT.small, not tappable, `numberOfLines={1}`:
  - `Section: Sparring Mieke · 14.10.` (on the section page itself; the date as `formatDate`, see "As built");
  - `Section: Training plan · from p. 7` (a follow-up page; page numbers 1-based);
  - `Section: Handwritten section · from p. 12`.
- Shown on the options screen whenever `section` is set; hidden on the focus screens.
- Budget: + ~28 dp. `ENGAGE_LIST_VIEWPORT` stays; at most one row per page fewer. Add the line to the Engage
  budget in `docs/dev/design-device-rendering.md`.
- Texts in `domain/engageText.ts`: `sectionLineText(title, page, distance)`, `HANDWRITTEN_SECTION`.

### 3.9 Logging and debug bundle

- `noteOwnerOf: context rule=section owner=<kind> distance=<n> claim=<entry|home|loop|heading> cancelled=<yes|no>`,
  plus index hit/miss and ms. No texts or paths.
- Debug bundle: `pageIndex: cached n` replaces the Contents count line.

## 4. Files

New:
- `storage/notebookPages.ts`, `storage/pageSection.ts`
- `domain/pageSection.ts`
- `screens/engage/SectionLine.tsx`
- `ui/capture/useSourceSection.ts`
- tests: `__tests__/domain/pageSection.test.ts`, `__tests__/scenarios/pageSection.test.tsx`

Changed:
- `storage/notebookContents.ts`
- `domain/notePageEntry.ts`
- `storage/noteOwnerOf.ts`, `storage/threadProvenance.ts`
- `domain/engageOwner.ts`, `domain/engageFlow.ts`, `domain/engageText.ts`
- `domain/notebookContents.ts`
- `screens/engage/useEngageFlow.ts`, `screens/engage/EngageOverlay.tsx`
- `screens/CaptureScreen.tsx` (shrinks)
- `ui/capture/agreementFor.ts`
- `storage/debugBundle.ts`

Docs:
- help pages `docs/user/engage.md` ("Which owner a page belongs to", the section line), `lasso.md` (a follow-up
  page records the meeting), the home-notebook help (a loop sharing the file);
- `CHANGELOG.md` `[Unreleased]` → **Changed**: Engage and capture follow the page's section (no format change,
  no Upgrade note);
- `docs/dev/design-overview.md` (page index and page section as building blocks),
  `docs/dev/design-device-rendering.md` (the line);
- `technical-design-meetings-0.21.md` §16: one line pointing to this document;
- demo space: the Sport Area's home notebook with a loop sharing it, a meeting page, a follow-up page, a typed and
  a handwritten heading.

## 5. Steps (one commit each, `npm run check` green, prefix `meetings: S<n> -`)

- **S8** `storage/notebookPages.ts`, with Contents on top of it. **No behavior change**: Contents tests stay green.
  Debug bundle line `pageIndex: cached n`.
- **S9** `domain/pageSection.ts` (claims, walk back, notebook owner, section titles), the `notePageEntry` options,
  `storage/pageSection.ts` with the fallback. Unit tests.
- **S10** Engage: `noteOwnerOf` on `pageSectionOf`, `section` in `decideOpening` / `EngageState`, `SectionLine`,
  texts. Scenarios 1-15.
- **S11** Capture: `threadProvenance` on the section, `useSourceSection`, the For chips' section owner.
  Scenarios 16-19.
- **S12** Docs, demo space, `npm run scenarios`, "As built". Then 0.21's **Checkpoint B**: the full device test.

## 6. Test scenarios

### 6.1 Setup

- Area **Sport** with home notebook `Sport 2026.note`.
- Active loop `#loop/marathon` whose Loop setup is named `{name} {year}`, with a 2026 main date, so the loop
  note is the same file.
- Thread `#sparring/mieke` in Area Coaching.

### 6.2 Given / When / Then

**Engage**

1. **Home page.** Given page 1 is the Home page, when I open Engage there, then the owner is **Area Sport** (not
   the loop) and the line reads "Section: Sport".
2. **Free page after Home.** Given page 2 has no title and no keyword, when I open Engage, then the owner is Area
   Sport and the line reads "Section: Sport · from p. 1".
3. **Meeting follow-up.** Given page 3 is the page of meeting "Coach call" (Sport, no loop tag) and page 4 is
   handwritten without a title, when I open Engage on page 4, then the owner is Area Sport, the moment line shows
   "Coach call" with its moment, the From tab offers its group, and the line reads
   "Section: Coach call · Tue 14 Oct · from p. 3".
4. **Loop todo follow-up.** Given page 5 is the page of todo "Plan long runs #loop/marathon" (open) and page 6 is
   a follow-up, when I open Engage on page 6, then the owner is **Loop marathon**, that todo is current, and the
   line names it "from p. 5".
5. **Own heading resets.** Given page 7 has my typed heading "Training plan", when I open Engage on page 8, then
   the owner is Area Sport and the line reads "Section: Training plan · from p. 7".
6. **Handwritten heading.** Given page 9 has a handwritten title, when I open Engage on page 9, then the owner is
   Area Sport and the line reads "Section: Handwritten section".
7. **Keyword without title.** Given page 10 carries the keyword of todo "Buy shoes" but has no title, and page 11
   is a follow-up, when I open Engage on page 11, then "Buy shoes" is current and the section is p. 10.
8. **Cancelled todo's page.** Given the todo of page 10 is cancelled, when I open Engage on page 11, then the
   owner is Area Sport, no todo is current, and the line still reads "Section: Buy shoes · from p. 10".
9. **Loop closed.** Given loop marathon is done, when I open Engage on page 6, then the owner is Area Sport.
10. **Pure loop note.** Given a loop note `2026-11 loop marathon.note` that isn't a home notebook, with a free page
    after its loop page, when I open Engage there, then the owner is the loop and the line names the loop page.
11. **Thread notebook.** Given a thread notebook with a sparring page for Mieke and a follow-up page, when I open
    Engage on the follow-up, then the owner is **Thread #sparring/mieke** and the moment line shows that sparring.
12. **Own note.** Given a todo's own note, when I open Engage on any page, then it's as today and no section line
    shows.
13. **Unreadable index.** Given the page index can't be read, when I open Engage, then it falls back to the
    single-page lookup, the panel opens, and the log has `index not read`.
14. **Cache.** Given Engage was opened on page 4, when I open it again without editing, then no new
    getTitles/getKeyWords call is made (`hit`). After writing on a page and turning it, it reads again (`miss`).
15. **Notebook tab unchanged.** Given the Contents switch is on, when I open the Sport notebook tab, then Contents
    shows the same entries as before.

**Capture**

16. **Lasso on a meeting's follow-up page.** Given scenario 3's page 4, when I lasso "Ask coach about intervals"
    and save it as a todo, then the line ends with `[meeting:: <date> Coach call]` and the panel showed
    "↳ from Coach call ✕".
17. **Mark on a thread follow-up page.** Given scenario 11's follow-up page with a mark, when I process the mark as
    an **Agreement**, then the For chips start with `#sparring/mieke` and the agreement records the sparring
    meeting.
18. **Own heading stops provenance.** Given page 8 (after "Training plan"), when I lasso there, then no meeting is
    recorded and no "↳ from" line shows.
19. **Cancelled meeting.** Given the meeting of page 3 is cancelled, when I lasso on page 4, then no meeting is
    recorded.

Scenario tests (`__tests__/scenarios/pageSection.test.tsx`, fake page index) cover 1-13 and 16-19. Scenarios 14
and 15 are unit tests on the cache.

### 6.3 Device checklist (after S12, demo space, together with 0.21 §14)

1. Engage scenarios 1-9 and 11 in the Sport notebook and a thread notebook.
2. Scenario 14: the log shows hit/miss and ms; note the ms for the largest notebook.
3. Scenario 15: the Notebook tab's Contents is unchanged.
4. Capture scenarios 16-18, by lasso and by mark.
5. Regression: Engage on a meeting page itself (moment line, From tab), on a todo's own note, and in a note
   outside any Project/Area.

## 7. Open points

- **Cost.** The first open in a large notebook after an edit reads all keywords and titles (two calls), plus one
  `getElements` for a heading section. S8 logs ms. If it's too slow on 150+ pages, read titles only for pages ≤
  the open page.
- **Unsaved page.** A heading written on the open page may not be in the file until Supernote saves (page turn).
  Until then the page counts as its previous section. Mentioned in the help.

## As built

Built on `feature/meetings-moment` in S8-S12, one commit each. Every §6.2 scenario is a test:
`__tests__/scenarios/pageSection.test.tsx` (1-13, 16-19), `__tests__/storage/notebookPages.test.ts` (14, 15). Unit
tests: `__tests__/domain/pageSection.test.ts`, `__tests__/storage/pageSection.test.ts`,
`__tests__/domain/engageSection.test.ts`, `__tests__/ui/agreementForSection.test.ts`. The 0.21 scenario tests and
the existing Engage, Contents and Capture tests run unchanged. No file-format change. **Device test: open** (§6.3,
with 0.21 §14). Differences from §3 and the reason, step by step:

- **S8 page index.** Besides `headingTextOf` (the topmost heading's text, for a heading section),
  `storage/notebookPages.ts` has `headingTextsOf(path, index, page)`: the text under every heading of the page, in
  index order, because the Contents lists each heading of a page. Both share the per-page memo. `titleRect` and
  `headingElementsOf` moved there with the read (storage/noteTitlesDiagnostic.ts imports them from it).
  `storage/notebookContents.ts` keeps `cachedContentsCount` as the page index's count, so the Contents test stays
  unchanged. Logs: `NotebookPages: index hit|miss` with pages, keywords, titles and ms. The debug bundle's
  home-notebook line ends `contents on|off · pageIndex: cached n`.
- **S9 claims.** An entry claim carries `reflection` (true for a meeting's Reflection page), which the title needs.
  `notePageCandidates` also returns `ownNote` (the direct hit is the entry's own note, not a page link) and
  `pageLinks` as `{page, entry}`; `isCancelledEntry` is exported with it. When a live and a cancelled entry share a
  keyword, the live one claims the page. `sectionTitleOf(claim, {ownerName, headingText, today})` takes the
  notebook owner's name instead of the source; a todo's title has no detail. The labels come from
  `loopPageLabel`/`meetingPageLabel`/`todoPageLabel`, which `domain/notebookContents.ts`'s Contents uses too.
  `HANDWRITTEN_SECTION` lives in `domain/engageText.ts` from S9 on, because the title needs it.
- **S9 notebook owner, pure part.** `isHomeNotebookFile` in `domain/pageSection.ts` (folder and name check over
  `homeNotebookYears`); the rest of §3.4 is in `storage/noteOwnerOf.ts` (S10).
- **S9 lookup.** `PageSectionResult` also has `ownNote`. With no open page number (`page === null`) the single-page
  lookup answers, as when the index can't be read. When a heading's text can't be read, the section still starts
  there and reads as "Handwritten section" (`pageSection: heading text not read`). Unit tests also in
  `__tests__/storage/pageSection.test.ts` (own note, walk back, fallback).
- **S10 date.** The section line shows a meeting's date as `formatDate` gives it (§3.7, the Contents' detail):
  "Section: Coach call · 24.10.", not "Tue 14 Oct" as §3.8 and §6.2 first sketched; dateFormat.ts has no such
  format. A meeting's title is its page label as words, so a thread meeting reads
  "Sparring Mieke sparring/mieke", as in the Contents.
- **S10 page index reader.** `noteContextOf(absPath, page, source, paths, {notebook, pages})`: the Default
  notebook (P1) and the page index reader (`NOTEBOOK_PAGES`, storage/notebookPages.ts) are handed in by
  `useEngageFlow`, and `pageSectionOf` takes the reader as its fourth argument. The index reads through the SDK
  (`getTitles`, element recycling); handing it in keeps the owner and provenance lookups loadable without it, so
  their unit tests (`noteOwnerOf.test.ts`, `threadProvenance.test.ts`) run unchanged on the single-page path.
- **S10 context.** `NoteContext.section` is optional (absent rather than null) and is set only when the index was
  read: an own note, no section and the single-page fallback show no line (scenario 13). The section does not go
  through `decideOpening`: `useEngageFlow` adds it to the `open` event when the opening's owner is the note's
  owner, so `decideOpening` and its results stay as they are. The line also shows on the owner-empty screen, like
  the meeting lines. The `rule=section` log line adds `distance`, `claim`, `cancelled` to the four usual fields;
  "EngageOverlay: section line distance=n" is a line of its own, so the existing log lines stay.
- **S10 docs in the same commit.** The help (engage.md "Which owner a page belongs to", projects-and-areas.md on a
  loop sharing the home notebook), the CHANGELOG line and the render budget came with S10, not S12
  (DEVELOPMENT-POLICY §6: user-visible change and its help page in one change). `docs/dev/test-scenarios.md` is
  regenerated in every step, since `npm run check` requires it.
- **S10 scenarios.** `__tests__/scenarios/pageSection.test.tsx` 1-13. Scenario 3's meeting is a day back
  (24.10.), because the moment line shows up to seven days after a meeting; its From tab is "From meetings".
  Scenario 13 makes `getTitles` fail. The fresh device of every scenario also clears the page index
  (`clearPageIndex`): the fake file system reuses paths and modification times. Scenarios 14 and 15 are the unit
  tests in `__tests__/storage/notebookPages.test.ts`.
- **S11 provenance.** `storage/threadProvenance.ts` has `sourceSectionOf(absPath, page, sources, pages)`:
  `{meeting (with distance), todo, loopTag}` of the section; `meetingForNotePage` keeps its signature (the page
  index reader is an optional fourth argument) and returns `.meeting`. Without the reader, or when the index can't
  be read, the single page answers, now for todos and meetings alike (a todo's page records no meeting either way).
- **S11 section owner.** `useSourceSection` returns `sectionOwner` for a todo section (`ownerOfTodo`) and also for a
  loop page section (the loop, while it is active in the enclosing item): P10 says "the section's thread or loop",
  and a loop page's follow-ups are that loop's. `agreementForChoices` uses it only when it is a thread or a loop.
  The hook also memoizes the Engage source CaptureScreen builds for the For chips; CaptureScreen.tsx shrinks from
  662 to 648 lines.
- **S11 scenarios.** 16-19 in `__tests__/scenarios/pageSection.test.tsx`, through mark processing: the fake device
  has no lasso, and both paths share the capture panel and its provenance (as 0.21's scenario 14). Unit test of the
  chips' order: `__tests__/ui/agreementForSection.test.ts`. The help (lasso.md) and the CHANGELOG line came with S11.
- **S12 demo space.** Area "Sport" with `#race/marathon` (main date this year) and a fourth demo setup, the Loop
  setup "Races" on `race` named `{name} {year}`, so the loop note is Sport's home notebook; a "Coach call"
  yesterday with an agreed todo, and one in two weeks. The demo writes text files only: the meeting page, its
  follow-up page and the typed and handwritten headings are made on the device during §6.3 (open the Coach call's
  note from Sport's page, add a page after it, write the headings). A demo profile written by an earlier version
  keeps its setups (the profile file is written only when missing); the help says to add the Races setup by hand
  there. `__tests__/domain/demoSpace.test.ts` counts five areas and four setups.
- **S12 docs.** design-overview §2.6 "Page → section" and the building block in §3, the Contents paragraph on the
  shared index; profiles-and-demo.md on Sport; `technical-design-meetings-0.21.md` §16 points here.
- **Cost (§7).** On the fake device the index reads in 0 ms (files in memory); the real figure comes from the
  device test's log (`NotebookPages: index miss … ms`, `pageSection: found … ms`). The "titles only up to the
  open page" fallback of §7 is not built.
