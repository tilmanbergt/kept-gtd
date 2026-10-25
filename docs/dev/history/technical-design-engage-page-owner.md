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
  - `Section: Sparring Mieke · Tue 14 Oct` (on the section page itself);
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

Filled in step by step: differences from §3 and the reason.
