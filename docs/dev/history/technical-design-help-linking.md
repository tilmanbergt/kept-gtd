# Technical design — linking the help pages

Status: **APPROVED** (open points decided as proposed, §8). Part of 0.23.0 "Easy start", after S6, on
`feature/easy-start`. Builds on `docs/dev/history/technical-design-easy-start.md` (H1-H4, and its As
built "Help typography").

## 1. Why

Links and ‹ Back work in the app and on GitHub, but the help still reads like a manual where the reader
has to know where to look next. Today the 23 pages hold **784 bold texts and 275 page links**. The
typography pass of 0.23 linked only the first bold mention per page of about 45 labels, and turned a few
terms into italics. Most bold texts are labels (buttons, tabs, list names), and many of them name a
screen, a step, a panel or a setting that another page explains - but they are not links. Getting
started, the page new users read first, has 24 links but still leaves **Projects**, **Areas**,
**Next**, **w/f**, **Someday**, **Week**, **Month**, the note icon, the status line and others unlinked.

Goal: from any page, every thing that is explained somewhere else is one tap away, and the styles tell
the reader at a glance what is a link, what is a button, what is a term and what is typed.

## 2. Styles: what each one means

| Style | Means | Example |
|---|---|---|
| **Link** (bold + underlined in the app, a link on GitHub) | explained elsewhere - tap to go there | [Daily](daily.md), [Run Integrity Check](settings.md#advanced) |
| **Bold** | a label exactly as the app shows it, explained right here (or a button whose effect the sentence says) | **Save**, **+ Add**, **✕** |
| *Italic* | a term this page defines, at its definition; the lead word of a definition list | a *counterpart* is …; *Something looks outdated*: … |
| `Code` | what is typed or stored: tags, file and folder names, lines of a file, typed time | `#next`, `Note/kept-gtd-demo`, `14-15.30` |
| "Quotes" | a message or line the app shows | "Saved to Team · hidden by Home" |
| Plain | everything else, including a term mentioned again after it was linked or defined | |

A link keeps the label's own words, so a linked label still reads like the label on screen (it is bold
anyway). Bold never marks emphasis; italics never mark a label.

## 3. Linking rules

1. **What gets a link**: a mention of something another page or section explains - a tab or screen, a
   panel or list (the card, the context panel, the Files pane, the Threads tab …), a Review step, a
   setting or Settings tab, a feature (focus block, Reflection page, home notebook …), a chip or icon
   whose meaning is explained elsewhere (**Next**, **w/f**, **M**, **F**, the note icon), or a term
   defined on another page (thread, counterpart, loop, context, owner).
2. **Where**: the first mention in each section (`##`, or `###` where a page has them) - not only the
   first on the page. On long pages a reader lands in the middle (Back, links with anchors), so each
   section stands on its own.
3. **Getting started** is the exception: every mention in it links (at most one link per target per
   sentence). Each of its steps should hold several links, and none of its bold texts stays unlinked
   unless it is a button explained in the same sentence.
4. **Target**: the most specific heading that explains it (`page.md#heading`); the page only when no
   heading fits. The label dictionary (§4) fixes the target per label, so the same label always goes to
   the same place.
5. **Not linked**: a label explained in the same section; the page's own subject in its own sections;
   buttons that only confirm, cancel or close (**Save**, **Cancel**, **✕**, **OK**); headings; the same
   label twice in one sentence (two labels with one target, like Create Project or Create Area, each link).
6. **Cross-references in prose become links**: `see "Home notebooks" below`, `("Which owner a page
   belongs to" in Engage)`, `see the next section` → a link to that heading (a link to a heading of the
   same page works too, and Back returns).
7. **A link replaces a "see …" to the same place** in the same sentence; "See [Page](page.md)." at the end
   of a paragraph stays only when the paragraph links nothing of that page yet.
8. **"See also"** at the end of a page stays optional (H3): only for important related pages the text
   does not link.
9. **Missing targets get a heading**, not a workaround: where a much-referenced thing has no section of
   its own, a short section is added on the page that owns it (§5.2).

## 4. Label dictionary (targets)

The fixed target for the labels and terms that recur. Applying the rules uses this table; a label not in
it gets the most specific heading by rule 4 and is added here.

| Label or term | Target |
|---|---|
| Projects, Areas (tabs) | `projects-and-areas.md` |
| Create Project, Create Area | `projects-and-areas.md#creating-one` |
| Current (tab), project's or area's page | `projects-and-areas.md#the-current-tab` |
| Daily | `daily.md` |
| Week / Month | `week-and-month.md#week` / `#month` |
| Inbox (tab, the Inbox) | `quick-add.md#the-inbox` |
| Review, Weekly Review | `review.md` |
| Settings (tab) | `settings.md` |
| Settings → Folders / Contexts / Note setups / Features / Advanced / About | `settings.md#folders`, `contexts.md#setting-up-contexts`, `note-setups.md`, `settings.md#features`, `#advanced`, `#about` |
| Settings → Calendar / Gmail | `features.md#google-calendar` / `#gmail` |
| Quick Add | `quick-add.md` |
| Todo / Meeting / Agreement / Note tab of Quick Add | `quick-add.md#adding-a-todo`, `#adding-a-meeting`, `#adding-an-agreement`, `#adding-a-note` |
| Next, w/f, Someday, Maybe (chips), `#next` | `tags.md#flow-tags-for-todos` |
| due date | `tags.md#due-dates` |
| the card (todo) | `quick-add.md#the-card-one-tap-selects` |
| the meeting card, New from this, Cancel meeting | `meetings.md#the-meeting-row-and-its-card` |
| the grey line | `quick-add.md#the-grey-line-where-a-todo-comes-from` |
| time field forms (`15-16.30`, `2d`) | `week-and-month.md#meeting-length` |
| M (monthly highlight) | `week-and-month.md#month` |
| F, focus block | `meetings.md#focus-blocks` |
| P / R, Prepare before, Review after | `meetings.md#preparation-and-review` |
| Reflect, Reflection page | `meetings.md#reflection-page` |
| the context panel, + Quick Add to meeting | `meetings.md#the-context-panel` |
| the note icon, the clip, linked file | `quick-add.md#notes-and-files-on-a-todo-or-meeting` |
| This file, Device | `files-and-folders.md#files-outside-note` |
| Files pane | `projects-and-areas.md#files-and-linked-files` |
| Threads tab | `projects-and-areas.md#threads` |
| Projects tab (on an area) | `projects-and-areas.md#projects-of-an-area` |
| Loops tab, loop rows | `loops.md#where-loops-show` |
| Notebook, Notebook tab | `projects-and-areas.md#the-notebook-tab` |
| home notebook, notebook icon | `projects-and-areas.md#home-notebooks`, `#the-notebook-icon` |
| Home page | `projects-and-areas.md#the-home-page` |
| Status, Active / On Hold / Done | `projects-and-areas.md#status` |
| Assign to Area… | `projects-and-areas.md#assigning-a-project-to-an-area` |
| abbreviation (`#GR`) | `projects-and-areas.md#abbreviations`; filing with it: `quick-add.md#filing-directly-with-an-abbreviation` |
| Close out…, close-out | `close-out.md#where-to-start-it` |
| Archive…, Quick archive… | `close-out.md#areas` (areas), `close-out.md#quick-archive` |
| thread, counterpart, type | `threads.md` (term), `threads.md#which-items-belong-to-a-thread` |
| thread overview | `threads.md#opening-the-overview` |
| Ahead / Looking back | `threads.md#ahead` / `#looking-back` |
| + Next \<type\> | `threads.md#-next-sparring` |
| Tend, Not, Set inactive | `threads.md#tending-counterparts` |
| loop, loop overview, loop note | `loops.md`, `loops.md#the-loop-overview`, `#the-loop-note` |
| agreement, valid till / Change, End | `agreements.md`, `#adding-one` / `#changing-and-ending` |
| Engage, Engage ›, owner | `engage.md`, `engage.md#opening-engage`, `#which-owner-a-page-belongs-to` |
| From Thread / Next / Plan / Waiting tabs of Engage | `engage.md#the-tabs` |
| context, the context chip, Everything | `contexts.md`, `contexts.md#choosing-one` |
| Given time | `week-and-month.md#given-time` |
| lasso, Capture Todo/Meeting | `lasso.md`, `lasso.md#capturing-right-away` |
| Mark for later, marks, n marks to process, Process › | `lasso.md#marking-for-later`, `#processing-marks` |
| Note setup, Default, One notebook / Own note per item | `note-setups.md`, `#the-default`, `#what-a-setup-is` |
| Since last time | `note-setups.md#since-last-time` |
| Heading style | `note-setups.md#heading-style` |
| Review steps: Week ahead, Meetings to close out, Inbox to zero, Stalled projects, Done awaiting review, On Hold reconsideration, Neglected areas | `review.md#the-steps` |
| Review steps with a section: Tending threads, Agreements, Someday / Maybe, Open loops | `review.md#tending-threads`, `#agreements`, `#someday--maybe`, `#open-loops` |
| Project close-out (switch), Experimental | `features.md#project-close-out`, `#experimental` |
| Run Integrity Check, Reload all files, Keep tabs in memory, Touch test, Check device files | `settings.md#advanced` |
| Profiles, Create demo space, demo space | `profiles-and-demo.md#profiles`, `#the-demo-space` |
| Debug logging, Export debug bundle | `troubleshooting.md#reporting-a-problem` |
| What's new, Upgrade notes | `settings.md#about` |
| setup assistant, Run setup assistant | `settings.md#setup-assistant` |
| the status line | `index.md#the-status-line` (new, §5.2) |
| Obsidian | `files-and-folders.md#using-kept-gtd-with-obsidian` |

## 5. Changes

### 5.1 One generator rule (index.md)

`index.md`'s page list (the help's left column) is built from list items that link a page. That is why
"The tabs at a glance" may not link its tabs today. New rule in `scripts/lib/userDocs.mjs`'s
`parseIndexGroups`: only a list item that **starts** with a link (`- [Daily](daily.md) …`) adds a page;
an item starting with anything else (`- **Daily**: … [Daily](daily.md)`) does not. The tabs list then
links each tab. Script tests cover both shapes; the existing check (no page in two groups, none missing)
stays.

### 5.2 New sections where a target is missing

- `index.md` "The status line": the strip under the tab bar - messages, questions with their buttons,
  ✕, paging through several, tap to read a long one. Many pages say "the status line asks …" with
  nothing to point to.
- `review.md`: the steps are list items without headings. Rather than nine new headings, the list
  stays and every step links to `review.md#the-steps`; the four steps with their own section keep their
  section as target (no change to the page's structure).

No other new sections; everything else in §4 has a heading already.

### 5.3 Getting started

Every step gets the links of rule 3. In words (the facts stay as they are):

- *Install*: "What's new" and **Upgrade notes** → Settings "About"; the demo space → "The demo space".
- *Your folders*: `Note` folder structure → Files and folders "The folder layout"; setup assistant and
  Settings → Folders as now; "every subfolder is a project or area" → Projects and Areas "Creating one".
- *Projects and areas*: **Projects** and **Areas** tabs; tap one → "The Current tab".
- *Todos*: **+ Add** → Quick Add "Adding a todo"; **Next**, **w/f**, **Someday**, **Maybe** → Tags "Flow
  tags"; due date → Tags "Due dates"; "parks it" → Review "Someday / Maybe"; Daily.
- *Meetings*: **Meeting** tab → "Adding a meeting"; the time `14-15.30` → "Meeting length"; **Week** /
  **Month** → their sections; focus block (one new clause: "time for yourself is a focus block") →
  Meetings "Focus blocks".
- *Notes*: note icon → Quick Add "Notes and files …"; status line → Overview "The status line"; home
  notebook as now; "only when opened from a note" → Troubleshooting.
- *Capture while you write*: lasso → Lasso; Capture Todo/Meeting, Mark for later as now; "file it later
  from the Inbox" → Lasso "Processing marks"; Inbox.
- *Once a week*: "empty the Inbox" → Inbox to zero, "a next step" → Stalled projects (both
  `review.md#the-steps`), "what you parked" → "Someday / Maybe".
- *When you want more*: as now, plus "Settings → Features" kept.

### 5.4 All other pages

Every page is gone through section by section with rules 1-9 and the dictionary. Rough expectation
from the inventory: about 250-350 more links, most on projects-and-areas, engage, note-setups,
quick-add, meetings, review and agreements; unlinked bold drops to labels explained in place. Pages are
changed in groups, each group one commit:

1. Getting started, Overview (+ "The status line"), Daily, Week and Month
2. Quick Add, Lasso, Tags, Meetings
3. Projects and Areas, Close out, Files and folders
4. Threads, Loops, Agreements, Engage
5. Review, Note setups, Contexts, Settings, Features, Profiles, Troubleshooting, Philosophy

### 5.5 Rules written down

`docs/dev/README.md` "Writing user docs" gets §2 and §3 in short form; the dictionary stays in this
document (historical), and its live form is a section "Link targets" in `docs/dev/README.md` so the next
page change uses the same targets.

## 6. Checks

- The existing link check (every page and anchor resolves) covers every new link.
- New script test: Getting started has no bold text that is in the dictionary (§4) and unlinked - the
  page newcomers read must not drift back. Other pages are not checked mechanically (rule 2 needs
  judgement about sections); their review is the diff.
- Device review per group: page through each changed page; links easy to hit, no page longer than it
  needs to be.

## 7. Out of scope

New help pages; rewriting text beyond what a link needs (facts and wording stay unless a sentence must
change to carry a link); translation; any app change other than the index rule (§5.1).

## 8. Open points for review

1. Rule 2 (first mention per section) vs. per page - per section gives more links on long pages; per page
   keeps pages calmer. Proposed: per section.
2. Getting started: link every mention (rule 3) or first mention per step? Proposed: every mention, at
   most one link per target per sentence.
3. Review steps: one target `#the-steps` for all (proposed), or a heading per step?
4. The script test for Getting started (§6): wanted, or review only?

## As built

- §8 decided as proposed: first mention per section, Getting started every mention, one target
  `review.md#the-steps` for the Review steps without a section, and the script test.
- Rule 5 reads "the same *label* twice in one sentence": two labels with one target (Create Project
  or Create Area, Projects and Areas tabs) each link.
- A link to a heading of the same page is written with the page name (`week-and-month.md#given-time`):
  the app's link rule needs it, and on GitHub it reloads the same page at the heading. Scenario test:
  "A link to a heading of the same page jumps there, and ‹ Back returns".
- §6's script test checks the reverse of a dictionary: Getting started may keep bold only for the
  buttons its sentences explain (**Save**, **+ Add**), so any new bold label there must be a link.
- The Overview's tab list starts each item with "The [Daily](daily.md) tab: …" - a link at the start
  would add a page to the help's page list (§5.1).
- Result: 893 page links (from 275), 667 bold texts left (from 784), nearly all buttons explained in
  their sentence. The live dictionary is "Link targets" in `docs/dev/README.md`.
