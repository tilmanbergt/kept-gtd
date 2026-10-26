# Requirements: Engage and Capture follow the page's section

Status: **decided** (Tilman, 2026-10-25). Release **0.21.0** (steps S8-S12 on `feature/meetings-moment`).
Technical design: `docs/dev/history/technical-design-engage-page-owner.md`.
Related: `technical-design-home-notebooks.md` (home notebook, Contents), `technical-design-loops.md` (loop note),
`technical-design-engage-in-context.md` (E4, owner of a todo), `technical-design-meetings-0.21.md` (moment line,
From tab, capture provenance).

## 1. Why

A loop can point at the same file as an Area's home notebook, e.g. a Loop setup named `{name} {year}` gives
`Sport 2026.note`. Today:

- A file counts as a loop note when its name matches what an active loop's note name renders to. The file's
  content isn't checked, and the first active loop in `## Loops` wins, on every page of the file.
- A page belongs to a todo or meeting only when **that exact page** carries its keyword, is its own note, or is
  linked with `#page=N`. Follow-up pages you add by hand carry no keyword.
- So in a shared home notebook, every page you write by hand (the Home page, follow-ups after a meeting page,
  your own sections) belongs to the first active loop instead of the Area.
- And a todo or agreement lassoed on a meeting's follow-up page doesn't record the meeting.

## 2. Decisions

- **P1 Notebook owner.** A Project's/Area's home notebook (this year's or an earlier year's) belongs to that
  Project/Area, even when the file is also an active loop's note. Otherwise it's as today: an active loop's note
  belongs to the loop, and a note in a Project/Area folder to that item.
- **P2 Walk back.** A page that no todo or meeting claims directly takes its owner from the nearest earlier
  **section page**.
- **P3 Section page.** A page that has
  - a Supernote title (gtdpara's or your own, typed or handwritten), **or**
  - a Kept GTD keyword: todo, meeting, reflection, `home`, `loop …`. The keyword alone counts, because Kept
    sometimes fails to turn its textbox into a title.
- **P4 Your own heading starts a section** owned by the notebook owner, so a "Training plan" heading after a
  meeting page goes back to the Area. The Home page belongs to the notebook owner too. A loop page belongs to its
  loop while that loop is active, else to the notebook owner.
- **P5 The item carries over.**
  - A follow-up page of a todo page makes that todo current (if it's open).
  - A follow-up page of a meeting page or its Reflection page passes the meeting on: the moment line, the strip
    and the From tab work as on the meeting page.
- **P6 Scope.** All shared notebooks: home notebooks, loop notes, thread notebooks, other setup notebooks. Where a
  notebook has one owner, nothing changes.
- **P7 Fallback.** No section page before it, or the note can't be read: the notebook owner. Engage never fails
  because of this.
- **P8 Cancelled items' pages are reused.** A page of a cancelled todo or meeting still starts a section with that
  item's owner, but no todo becomes current and there's no page meeting (no moment line, no provenance).
- **P9 Section line.** Engage shows which section the page belongs to:
  - the section's title: a todo's text, a meeting's title and date, the Home page's item name, the loop's name,
    or your typed heading;
  - **"Handwritten section"** when the heading is handwritten;
  - "from p. N" when the section starts on an earlier page.
- **P10 Capture follows the section** (lasso and mark processing).
  - A todo or agreement captured on a meeting's follow-up page records that meeting (`[meeting::]`, the grey
    "↳ from …" line, droppable for one item as today). Your own heading ends that section.
  - The Agreement kind's **For** chips put the section's thread or loop first.
  - The "File to" default stays the note's own Project/Area.
- **P11 Cache.** The Notebook tab's Contents cache is reused: one page index per file and modification time,
  shared by the Notebook tab, Engage and Capture. It works whether the Contents switch is on or off.

## 3. Out of scope

- Writing anything into notes (no new keywords or titles to repair pages where the title failed).
- Changing which file a new loop or home-notebook page goes into.
- Recognizing what a handwritten heading says.
