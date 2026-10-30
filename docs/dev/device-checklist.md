# Device checklist: screens and orientations

For a release that touches layout, and before every public release from 0.24.0 on
(docs/dev/history/technical-design-launch-ready.md §9.2). Run it on the build that goes out.

**Columns:** A5 X portrait (regression) · A5 X landscape (turn the device) · Nomad portrait (sim) ·
Nomad landscape (sim). For the Nomad columns: Settings → Advanced → Debug logging on → **Simulate
screen**. Nomad portrait is offered while the device is upright, Nomad landscape while it is turned.

**Per screen, check:** nothing cut off at the right or bottom edge · every button reachable · lists
page with ‹ › instead of running off · no text drawn over other text · tab rows wrap rather than run
past the edge.

Mark each cell ✓, ✗ (with a photo) or – (not applicable). A ✗ goes back as a finding: screen, column,
what is wrong.

## Screens

| Screen | A5 X portrait | A5 X landscape | Nomad portrait | Nomad landscape |
|---|---|---|---|---|
| Tab bar (all tabs, "?", context chip, ✕; demo "D") | | | | |
| Daily (incl. tag filter) | | | | |
| Week (grid: fewer rows on short screens, ‹ › per day) | | | | |
| Month | | | | |
| Projects list | | | | |
| Areas list (incl. On Hold column) | | | | |
| Inbox | | | | |
| Review hub and each step | | | | |
| Threads overview, Loops overview | | | | |
| Project/area page: Todos, Meetings | | | | |
| Project/area page: Files pane (Device tab, This file rows, sub-tabs) | | | | |
| Project/area page: Notebook tab; an area's Projects tab | | | | |
| Item detail, status, scope | | | | |
| Quick Add: each tab, add and edit, chips overflow, This-file line, "+ Add" visible | | | | |
| Quick Add with four tabs (thread overview: Todo, Meeting, Agreement, Note) | | | | |
| Capture: Lasso screen, Mark outcome, Mark for later list | | | | |
| Engage on a meeting page and on a todo page (strip, tabs, Quick Add) | | | | |
| Meeting context panel | | | | |
| Settings → Data (Save and Reset to defaults reachable) | | | | |
| Settings → Contexts, Note setups (editor with preview), Features | | | | |
| Settings → Advanced (Simulate screen, Check screen and pages) | | | | |
| Settings → About (What's new: three version tabs) | | | | |
| Setup assistant (all steps) | | | | |
| Remove Kept's data (open it, don't run it) | | | | |
| Help overlay (links, Back) | | | | |
| What's new notice; close-out wizard (open it, don't run it) | | | | |

## Note checks (real device, not the simulation)

- [ ] a. A5 X: create a meeting note, a home notebook page and a shared-note page. They look exactly
  as in the previous release (compare with a photo).
- [ ] b. A horizontal note made by hand as a home notebook (or shared target): add a page and look at
  the result; a piece that doesn't fit is left out and the status line says so.
- [ ] c. Lasso from a horizontal note.
- [ ] d. Open Kept from a PDF, tap a note icon: the message shows, nothing is created.
- [ ] e. Turn the device with Kept open: Kept redraws for the new size without a restart.

## What the simulation does not show

It draws Kept at the Nomad's size in dp, which is about the Nomad's physical size, so what fits and
what is cut off match. It does not show how the Nomad's host behaves (sidebar, page bar, keyboard,
pen). Those need a tester with a Nomad.
