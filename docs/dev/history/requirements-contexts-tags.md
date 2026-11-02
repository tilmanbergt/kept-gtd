# Requirements: flexible contexts (Show / Except, tags, loop and thread roots)

Status: decided 2026-11-01 (three rounds with Tilman). Release 0.24.0 "Launch ready", as a named scope
exception: it fixes a bug launch users hit, plus the small additions that make tag contexts usable.
Design: `technical-design-contexts-tags.md`. Builds on `requirements-time-and-place.md` (D20-D25).

## Problem (found on the device)
Creating a context "Errands" that only shows `#errand`, `#shopping`, … (no areas or projects):
- a) Tags not in use yet can't be added in the editor.
- b) Loop/thread types can't be picked (all `#read/…` loops, all `#jf/…` threads across all projects).
- c) With no area or project picked, the Projects and Areas tabs (and Review's item steps) are empty.
- d) The Shows / Hides tabs read as two alternative modes.

## Decisions
- **R1 Show has two parts.**
  - *Where*: areas and projects.
  - *What*: tags plus loop/thread roots.
  - Within a part, entries combine with OR.
  - An empty part sets no restriction. Both parts empty = everything ("everything except …").
- **R2 One switch between the parts:** "Only inside the selected areas and projects".
  - It is offered only when both parts have entries.
  - Off (default, the 0.22 behaviour): an item is shown if it matches Where OR What.
  - On: an item is shown only if it matches Where AND What.
- **R3 Project/Area rows** (Projects tab, Areas tab, Review item steps when filtered):
  - A row shows if the item itself passes the context, or if it holds an open todo or a meeting dated
    today or later (not cancelled) that the context shows. Past meetings don't count.
  - An Area row also shows when one of its Projects holds shown content.
  - The rest is counted in the hidden line.
- **R4 The Tags tab**, in this order:
  1. a "New tag" field: free text, lowercased, no `#`; a typed nested tag (`project/piplanning`) is
     allowed and becomes a plain chip;
  2. the loop/thread roots, one chip per Note setup tag, types only ("All #read loops", "All #jf
     threads");
  3. the tags in use.
  - There is no separate Loops & threads tab and no subtag picker.
- **R5 Except** (was Hides) is a plain cut-out:
  - anything matching any Except entry is hidden, and Except always wins;
  - there is no switch on Except;
  - "Except X only inside Y" is out of scope.
- **R6 Review ignores the context by default**, because contexts are meant for doing work. This
  changes D22/Q2 of 0.22.
  - The hub says "Context Errands is set · Review only in Errands". The link narrows every step until
    Review is left.
  - While narrowed: the hub says "Reviewing in Errands · Review everything", and step titles end
    "· in Errands". The "+n in other contexts" counts work as in 0.22.
  - Reviewed marks and the overdue date stay global.
  - When narrowed, the Tending, Open loops and Agreements steps filter by place (R3 rows), not thread
    by thread.
  - The Tend line on Week and Month opens Review already narrowed.
- **R7 Summary sentence**: always visible at the top of the editor, live, and used in the contexts
  list.
  - Places are joined with "and", tags with "or". A root reads "all #read loops".
  - Examples:
    - "Show Work, Coaching and Home"
    - "Show #computer everywhere"
    - "Show Work, Coaching and Home, plus #computer everywhere" (switch off)
    - "Show #computer in Work, Coaching and Home except #wifi" (switch on)
    - "Show #computer everywhere except in Home"
    - "Show everything except Home, Work and #computer"
  - Long lists shorten: "Work, Coaching and 3 more".
- Unchanged: the Inbox always shows; meetings are never hidden (dimmed outside the context).
