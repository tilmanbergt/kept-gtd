# Easy start — help that links, a setup assistant, link files from anywhere (requirements)

Status: **REQUIREMENTS DECIDED (2026-10-28).** Technical design: docs/dev/history/technical-design-easy-start.md.
Release: **0.23.0 "Easy start"** (working title), built on 0.22.0 "Time and place" once that is merged.
Agenda, planned as 0.23.0 by the 0.22 plan, is off the release plan for now.

## 1. Why

New users meet a help that names people and companies from Tilman's own work, a Getting started page
that lists tabs instead of showing a way in, and a first start that creates nothing and asks nothing.
Someone with simple needs - capture todos and meetings, write notes about them - should find a straight
path, see where everything lands, and know where to change it later. Separately, files worth linking to a
todo or meeting (a PDF in `Document/`, an export) often live outside the PARA folders.

## 2. Decisions

**Help: links (H)**
- H1 Links between help pages are tappable and open the target page; `page.md#heading` opens the target
  page at that heading. Links to outside addresses stay plain text.
- H2 The help gets a **‹ Back** button that walks back through the pages you came from.
- H3 Pages link a term where it first appears (`#next`, home notebook, Mark for later, Quick Add …).
  A short **See also** list at the end of a page is optional, only for important related pages not
  already linked in the text.
- H4 A broken link or heading anchor fails the checks.

**Help: no personal names (N)**
- N1 Help pages use only names from the demo space; the rule is written into DEVELOPMENT-POLICY.
- N2 The demo space changes first: its sparring counterpart becomes **Jordan** (`#sparring/jordan`);
  "Sparring" and the area "Coaching" stay.
- N3 In the docs every person's name becomes Jordan, **Lena** or **Sam** (demo people), every company or
  team name becomes the demo area **Team**, `#101/…` becomes the demo's sparring thread and `#retro/alpha`
  the demo loop `#workshop/offsite`. The new docs don't list the old names.
- N4 A check fails when a help page uses a nested tag (`#x/y`) that the demo space doesn't contain
  (small allowlist for placeholders like `#wf/name`).
- N5 The teaser video script keeps its own invented names; no change needed.

**Getting started (G)**
- G1 The existing page is reworked (no extra page) into a story for simple needs, each step linking to its
  detail page: install · your folders · projects and areas · todos · meetings · notes · capture while you
  write · once a week · when you want more.
- G2 Folders: explains that Kept creates folders only when they are first needed (or in the setup
  assistant), that an existing folder system can be used by pointing Settings → Folders at it, that every
  subfolder then is a project or area, and that nothing is moved.
- G3 Notes are told with the default (one notebook per project and year; everything of a project lands in
  that notebook, in time order). "Own note per item" is only linked.
- G4 Todos: Quick Add, `#next` (what Daily shows), due, waiting for, someday. Meetings: today's meetings with
  a time; Week and Month in one line. Capture: Lasso and Mark for later. Once a week: Review.
- G5 "When you want more": Threads, Loops, Agreements, Engage, Contexts, and Settings → Features.
- G6 "The tabs at a glance" and "Opening Kept from a note" move to the Overview page.

**Setup assistant (S)**
- S1 On a **fresh install** the assistant opens by itself once. Existing installs never see it by itself.
  It is always available as **Run setup assistant** at the top of Settings → Folders.
- S2 Steps, one per screen, each with **? Help** (opens the matching help page) and a line saying where to
  change it later:
  1. **Folders** - the base folder and the four PARA folders, with what Kept finds ("exists · 12 folders"
     or "will be created"). Common existing names (`Projects`, `1 Projects`, `01 Projects`, … and the same
     for Areas, Resources, Archive) are suggested. Says: nothing is moved; every subfolder becomes a project
     or area. Later: Settings → Folders.
  2. **Notes** - how the Default note setup works: **One notebook per project and year** (recommended) or
     **Own note per todo or meeting**. Later: Settings → Note setups → Default.
  3. **Features** - **Simple** (Project close-out, Google Calendar, Gmail and Notebook contents off) or
     **Everything** (all on; Calendar and Gmail still need their addresses in Settings). Later:
     Settings → Features.
  4. **Look around first?** - optional **Create demo space**, with how to switch to it. Later:
     Settings → Advanced.
- S3 **Finish** shows exactly which folders it will create, creates them, saves the choices and opens the
  Projects tab with a hint to create the first project. **Skip** closes it without changes. Back/Next
  between steps.

**Linked files (L)**
- L1 Linking stays where it is offered today (Files pane on a project's or area's page and in the Inbox,
  the item card's **+** clip). One linked file per todo or meeting, focus blocks included.
- L2 The Files pane gets a **Device** tab: the whole internal storage (system and hidden folders left out),
  and the SD card when one is in. Any file there can be linked.
- L3 **This file**: when Kept was opened from a note or document, the Files pane shows two rows at the top
  of its list: **This file · p. 12** (links that page) and **This file** (no page - opens where you last
  left it). Tapping one while linking links it.
- L4 **Quick Add** shows the same two choices for a new todo or meeting, as a small line with a toggle:
  on by default when Kept was opened from a document (PDF, EPUB …), off when opened from a note.
- L5 Files outside `Note/` are stored with their full path, as Lasso already does for PDFs; files inside
  stay relative. Opening, the missing-file ⚠ and removing a link work as today.

## 3. Out of scope

Several files per item; starting a link from Daily, Engage or a meeting card without a Files pane; a
setup assistant for existing installs or new profiles by itself; translating the help.

## 4. Open for the device check (before the linking steps)

Reading folders outside `Note/` and on the SD card; opening EPUB/PDF/other files there; current file and
page when Kept is opened from a document; what "open without page" does for a PDF and a note.
