# 0.24.0 "Launch ready" - requirements (draft)

Status: **decided (2026-10-30).** Technical design: `docs/dev/history/technical-design-launch-ready.md`. After 0.23.0 "Easy start". This release prepares the public
InkHub launch. Its goal is **robustness**, not tuned layouts: Kept must not break on a Manta or Nomad,
in landscape, or with notes it didn't create, and it says plainly what it can't do.

Out of the launch scope: the close-out wizard device test (Tilman has used it several times and it
works), and all new features.

## C - Create-note limitation, said clearly

Background: Supernote refuses `createNote` while Kept was opened from a PDF/EPUB ("This app is not
allowed to use this API"). The issue is filed with Ratta; a fix within ~3 months is unlikely.

- **C1 Prevent rather than fail.** When Kept was opened from a document (launch path from 0.23.0) and
  the user starts something that creates a note, Kept doesn't try. It shows in the status slot:
  "Supernote doesn't let plugins create notes when opened from a PDF or EPUB. Open Kept from a note
  to create this one." Things that create notes: the note icon on todos/meetings, Quick Add Note, a home
  notebook page, the reflection page, and any other note creation (inventory in design).
- **C2 Clear fallback.** If the host refuses anyway, Kept shows the same sentence instead of the host
  text. The host text still goes to the log.
- **C3 Help.** files-and-folders.md (or note-setups.md) gets a short "Known limitations" section with
  this one; Getting started links to it where notes are introduced.
- Plugins open only from the Note or the Document app; there is no "Home" on Supernote. So the launch
  context is always a note or a document. When the launch path can't be read (null), Kept tries
  `createNote` as today and relies on C2.

## H - No "Home" launch

Plugins open only from the Note or the Document app; there is no "Home" on Supernote. Wherever Kept
says or logs "Home" for a missing launch path, it means "launch file unknown". Wording only; the
behaviour stays.

## S - Screen sizes and orientation

- **S1 One source for the screen size.** All layout code gets the usable size from one hook. The fixed
  A5 X figures (`COLUMN_WIDTH_PX = 678` in six places, `1872` budgets in ItemsList, `FULL_VIEWPORT_PX`,
  `Dimensions.get('window')`) are replaced by values derived from it. On the A5 X in portrait, nothing
  visible changes.
- **S2 Simulate screen (debug).** Settings → Advanced, shown while debug logging is on: **Simulate
  screen**: Off / Nomad portrait (~750×1000 dp) / Nomad landscape (~1000×750 dp). Kept draws inside a
  framed box of that size, so the A5 X shows how it would fit on a Nomad: a dp is about the same
  physical size on both. It is not saved across restarts.
- **S3 Robust in all four cases:** A5 X/Manta portrait, A5 X/Manta landscape, Nomad portrait
  (simulated), Nomad landscape (simulated). Every screen must:
  - have no control cut off or unreachable;
  - have nothing overlapping;
  - keep every list paging;
  - have Quick Add, the Engage overlay, Settings and Review master/detail fit.

  Where a two-column screen gets too narrow, it falls back to one column with a toggle, only on the
  screens that need it.
- **S4 Screen checklist.** One list of all screens and overlays, checked in the four cases (a table
  in `docs/dev/test-scenarios.md` or its own device-test page). Tilman checks landscape for real and
  Nomad simulated; findings become fixes in the release.
- **S5 Rotation while Kept is open.** Spike: does the plugin view rotate, what size does it report,
  does the host restart the plugin? Kept must at least re-measure and redraw correctly. Keeping the
  current tab and state is wanted but not required.

## N - Notes of any size and orientation

Background: Kept creates portrait notes at A5 X size (1404×1872, `NOTE_PAGE_WIDTH/HEIGHT_PX`). A Manta
note page is 1920×2560 (to confirm via `getPageSize`). Users can have **horizontal notes** (1872×1404 on
the A5 X). The device shows a vertical note in landscape by paging top/bottom, and a horizontal note in
portrait by paging left/right. That is the host's business, not Kept's.

Where Kept writes into or reads from an existing note: shared-note pages and home notebook pages
(`insertNotePage` + pieces/headings as text boxes), keywords, links, Lasso marks (strokes and
coordinates), Engage's page lookup, close-out/PDF export (already reads the page size).

- **N1 Real page size per note.** Pieces keep their layout relative to the page (scaled by the
  page's short side). Every layout that places something on a page uses the page size of
  that note (`getPageSize`), not the A5 X constants. Manta notes get pieces at the right place and size.
- **N2 Horizontal notes treated decently, not fully designed for.** In an existing horizontal note
  (e.g. one picked as home notebook or shared-note target), Kept:
  - never places anything outside the page: pieces are laid out in the page's real width/height, or
    left out when they don't fit, with one status line saying so;
  - keeps keywords, links and headings working (no geometry, or geometry from N1);
  - reads Lasso marks with the page's real size.
- **N3 New notes stay portrait.** No option for horizontal notes in this release.
- Open / spike: can `insertNotePage` add a page to a horizontal note, and is it horizontal then?
  What does `getPageSize` return for a horizontal note (1872×1404, or 1404×1872 plus an orientation
  flag)? Test with a horizontal note Tilman creates by hand.

## M - Manta

- **M1** S1 + N1 are the Manta work. Unit tests at Manta sizes (screen 1024×1365 dp, page 1920×2560).
- **M2** One Manta owner (Reddit or alpha testers) installs a beta and sends screenshots plus a debug
  bundle. Without a tester the listing says "checked on the A5 X; Manta should work".

## L - Listing and help

- **L1** InkHub listing and README: "Made on the A5 X. Manta and landscape checked; Nomad checked in
  simulation. Beta." Wording follows the S/M results.
- **L2** Help "Known limitations": PDF/EPUB note creation (C3), devices/orientation as above, new notes
  are portrait.

## Polish (from the backlog, small)

- Obsidian help page: verify the Tasks setting names and the two example queries.
- Areas tab "On Hold" column cut-off (bug candidate) and the PagedSection header height with arrows:
  both are covered by S3 anyway.
- Smoke renders for every Review step; they can render at the S2 sizes too.
- `PAGE_SIZE` leftovers and the stale comments named in the backlog.

## Not in this release

- A layout tuned for Nomad (only "robust").
- Creating horizontal notes.
- New features of any kind.
