# What Kept GTD promises

> **About this document.** The vision of Kept GTD as four promises, each spelled out in a few
> concrete ones, with an honest rating of how well Kept keeps it today, how sure that rating is,
> and what keeps it true. It is what the README's "Why Kept GTD" says in short. Kept by
> DEVELOPMENT-POLICY §6 (a change to README, the InkHub listing, PRIVACY, SECURITY or a philosophy
> page updates it in the same change) and §9 (read once per release); the promises audit
> (`promises-audit.md`) re-rates it. `npm run promises` checks its format and every evidence path;
> `npm run quality` lists the promises not (fully) kept or unsure. Last audit: 0.26.0.

## Using this to decide

The promises shape the roadmap and the answers to wishes. A change or a wish that serves a promise
is in scope. One that contradicts a promise or a "Rules out" line is declined, or at most becomes an
experiment behind a switch in Settings → Features, off by default. A promise rated below 5 is a
reason for backlog work, not for a new feature.

Three words are used precisely here: *your content* is what you write (todos, meetings, agreements,
notes, handwriting); *your setup* is how Kept is set up for you (settings, note setups, contexts,
profiles); *Kept's own data* is what Kept keeps for itself (caches, mark pictures, logs).

## How to read the ratings

- *Fulfilled*: how well Kept keeps the promise today. 5 kept everywhere; 4 kept with one minor
  exception; 3 kept in the main paths, with a known exception; 2 partly; 1 not.
- *Confidence*: how sure the Fulfilled rating is. 5 verified in the code and a test would fail if
  it broke; 4 the relevant code read; 3 part of the code or only the docs read; 2 inferred; 1 a
  guess.
- *Kept true by*: what catches it if a promise stops being kept, joined with `+`. `check` (a check of
  `npm run check` fails), `test` (a unit or scenario test fails), `checklist` (a named checklist
  step), `nothing`. Only keepers that would really catch a break count. A promise can be fully kept
  and kept true by nothing: the MIT license, for example.
- *Evidence* (under each table): the files and checklist steps behind "Kept true by", checked by
  `npm run promises`. A test, check or checklist step is listed as `check`, `test` or `checklist`
  only when it would fail, or ask, if the promise broke.

A headline is rated on its own, informed by its promises; *Assessed* is the version of its ratings.

## 1. Your promises, kept

*A faithful GTD and PARA system whose centre is your word: what you promised, to whom, and what you
do about it.*

- Fulfilled: 4 - GTD and PARA are followed closely and commitments to people are well supported; renegotiating is not always an explicit act
- Confidence: 3
- Assessed: 0.26.0
- Stated: README "Why Kept GTD"; docs/user/philosophy.md; docs/dev/inkhub-listing.md

| Id | Promise | Ful. | Conf. | Kept true by | Why |
|---|---|:-:|:-:|---|---|
| 1.1 | Kept follows GTD and PARA rather than a method of its own: capture, clarify, organise into Projects, Areas, Resources and Archive, review, engage | 4 | 3 | test + checklist | Inbox, flow states, Weekly Review and Engage follow GTD; the PARA folders are the file layout; Resources is a folder, not a screen |
| 1.2 | Within that frame the structure is yours: threads, loops, tags, contexts and note setups fit how you work | 4 | 4 | test | threads, loops, contexts and note setups come from your own tags and settings |
| 1.3 | Your commitments are visible where they matter: with whom, from which meeting, owed or awaited, in the place you are working | 4 | 4 | test | what you owe and wait for, and the meeting a todo was agreed in, show in threads, the context panel and Engage |
| 1.4 | Each commitment is kept, renegotiated or dropped as a conscious, visible decision, never by a silent slip | 3 | 3 | test + checklist | Change, End, Set inactive and Cancel are explicit acts; a due date moved in Quick Add changes quietly |
| 1.5 | Every entry is your own decision: nothing is chosen, prioritised or repeated for you | 4 | 3 | checklist | no recurrence, nothing scheduled for you; Engage offers only the same owner and your schedule |
| 1.6 | Once a week the review brings everything back into view, so nothing slips unnoticed | 4 | 4 | test | steps for the Inbox, threads, agreements, loops and stalled projects; it is offered, never forced |
| 1.7 | You decide where your focus goes; Kept shows only what fits now, and honestly where your time went | 4 | 3 | test | contexts filter Daily and the lists; Given time counts meetings and focus blocks, not the work on todos |

**Rules out:** Kept prioritising or scheduling for you; recurring meetings and todos; scores and
gamification; defaults that follow another method than GTD and PARA.

Evidence:
- 1.1: __tests__/scenarios/inbox.test.tsx; __tests__/scenarios/review.test.tsx; __tests__/scenarios/smoke/review.test.tsx; __tests__/scenarios/engageMoment.test.tsx; DEVELOPMENT-POLICY §8 "Fits the product principles"
- 1.2: __tests__/domain/noteSetups.test.ts; __tests__/scenarios/contexts.test.tsx; __tests__/domain/threads.test.ts; __tests__/domain/loops.test.ts
- 1.3: __tests__/domain/threads.test.ts; __tests__/storage/threadProvenance.test.ts; __tests__/scenarios/meetingContext.test.tsx; __tests__/scenarios/engageMoment.test.tsx
- 1.4: __tests__/scenarios/agreements.test.tsx; __tests__/scenarios/engageMoment.test.tsx; DEVELOPMENT-POLICY §8 "Fits the product principles"
- 1.5: DEVELOPMENT-POLICY §8 "Fits the product principles"
- 1.6: __tests__/scenarios/review.test.tsx; __tests__/ui/reviewTendingStep.test.tsx; __tests__/ui/reviewOpenLoopsStep.test.tsx; __tests__/scenarios/agreements.test.tsx
- 1.7: __tests__/scenarios/contexts.test.tsx; __tests__/scenarios/givenTime.test.tsx

## 2. Your files, kept yours and kept safe

*What you write belongs to you, outlives Kept and the Supernote, and is never changed behind your
back.*

- Fulfilled: 4 - your content is open and every change to it is visible; handwriting needs the Supernote's format, and two automatic changes remain
- Confidence: 4
- Assessed: 0.26.0
- Stated: README "Why Kept GTD"; docs/user/philosophy.md; PRIVACY.md; SECURITY.md; docs/dev/inkhub-listing.md

| Id | Promise | Ful. | Conf. | Kept true by | Why |
|---|---|:-:|:-:|---|---|
| 2.1 | Your content is in open formats in your own folders: plain-text lists and Supernote notes, readable and editable without Kept | 4 | 4 | test | the lists are plain text any editor reads; notes are the Supernote's own format, read with its tools |
| 2.2 | When a project ends, its record lasts: one PDF with a table of contents, archived by year, readable beyond the Supernote | 4 | 2 | test | close-out builds the PDF and archives by year; the PDF itself is only checked on the device |
| 2.3 | Kept is open source: anyone can carry it on, or check what it does | 5 | 5 | nothing | MIT license, public repository |
| 2.4 | Kept never changes your files behind your back: edits made elsewhere are kept, and every move or delete is named and confirmed first | 3 | 4 | test | edits elsewhere are kept and deletes confirmed; a folder made by hand gets its file and an abbreviation unasked, and removing the demo space deletes its notes |
| 2.5 | Your content stays on your device: no account, no server, no telemetry; online only for what you switch on | 5 | 4 | test + checklist | no server or telemetry code; the network only for the calendar, Gmail and the update check, each started by you |
| 2.6 | Secrets stay inside the plugin, and what you share for a bug report gives away no more than needed | 4 | 3 | test + checklist | secrets stay out of profiles and the debug bundle; the bundle keeps file paths, which can hold project names |

**Rules out:** a cloud or sync of our own; proprietary formats or a hidden database; automatic
changes to your files; telemetry; accounts.

Evidence:
- 2.1: __tests__/domain/meetingsRoundTrip.test.ts; __tests__/domain/taskLine.test.ts; __tests__/scenarios/fileSafety.test.tsx; __tests__/storage/refreshCache.test.ts; __tests__/scenarios/smoke/outsideEdits.test.tsx
- 2.2: __tests__/scenarios/closeOut.test.tsx
- 2.3: LICENSE
- 2.4: __tests__/storage/dataFileWrite.test.ts; __tests__/storage/writeConflicts.test.ts; __tests__/storage/outsideEdits.test.ts; __tests__/scenarios/fileSafety.test.tsx; __tests__/scenarios/removeData.test.tsx; __tests__/scenarios/removeDataRun.test.ts; __tests__/supernote/removeDataNative.test.ts; __tests__/domain/fileChangeText.test.ts
- 2.5: __tests__/storage/updates.test.ts; __tests__/scenarios/updates.test.tsx; __tests__/domain/features.test.ts; DEVELOPMENT-POLICY §9 "PRIVACY.md still true"
- 2.6: __tests__/domain/profiles.test.ts; __tests__/domain/redact.test.ts; __tests__/storage/debugBundleEngage.test.ts; DEVELOPMENT-POLICY §9 "Logging"

## 3. Well made: documented, openly developed, tested

*Kept is software you can rely on: it does what its help says, it is developed in the open, and every
update has a clear path.*

- Fulfilled: 4 - checks, documents and the release path are thorough; help coverage and what only the device can show are the weak parts
- Confidence: 4
- Assessed: 0.26.0
- Stated: README "Why Kept GTD"; SECURITY.md; CHANGELOG.md; docs/dev/inkhub-listing.md

| Id | Promise | Ful. | Conf. | Kept true by | Why |
|---|---|:-:|:-:|---|---|
| 3.1 | The help explains what you need, inside the app, and describes the app as it is | 3 | 3 | check + test + checklist | every tab has its help page and every link is checked; 13 labels don't match the app and 96 help headings have no scenario |
| 3.2 | Every release says what changed; when storage changes, it says how to move on safely | 5 | 4 | checklist | What's new shows the changelog; every change of storage had an Upgrade note |
| 3.3 | Updates keep your content and your setup; you decide when to update, and downloads are checked | 4 | 4 | test + checklist | older files are read, settings kept, downloads compared with the release's checksum; 0.25 was a deliberate new install |
| 3.4 | Robust: an interrupted save or move loses nothing | 4 | 4 | test | refile and close-out are tested at every stop; not every multi-step flow is |
| 3.5 | When something goes wrong, reporting it is easy and gives what is needed to fix it: issue templates, an optional debug bundle and logs, the integrity check | 4 | 3 | test | the bug template asks for what is needed; the bundle, logs and integrity check exist on request; their content is only partly tested |
| 3.6 | Developed in the open: design decisions, changelog and issues are public, and every change is reviewed independently | 5 | 4 | checklist | the designs are in the repository; Codex reviews every pull request and every finding gets an answer |
| 3.7 | Tested before it reaches you: every check and test runs on every change and every release; experiments stay behind a switch until they are reliable | 4 | 5 | check + test | CI runs everything on every push, release.ps1 on the release commit; what the fake device can't show waits for the device test |
| 3.8 | Security reports are handled privately and fixed promptly | 3 | 1 | nothing | a new promise; no report has come in yet |

**Rules out:** silent breaking changes; releases without the checks; experimental services switched
on by default; behavior the help doesn't describe.

Evidence:
- 3.1: scripts/lib/userDocs.mjs; __tests__/docs/userDocs.test.ts; __tests__/domain/helpTopics.test.ts; DEVELOPMENT-POLICY §9 "Help pages"
- 3.2: CHANGELOG.md; DEVELOPMENT-POLICY §9 "CHANGELOG [Unreleased]"
- 3.3: __tests__/scenarios/rollback.test.tsx; __tests__/domain/rollbackShims.test.ts; __tests__/domain/profiles.test.ts; __tests__/storage/settingsUnreadable.test.ts; __tests__/storage/updates.test.ts; DEVELOPMENT-POLICY §9 "Device checklist"
- 3.4: __tests__/scenarios/interruptions.test.tsx; __tests__/domain/writeLeftovers.test.ts; __tests__/domain/closeOutInterrupted.test.ts
- 3.5: __tests__/scenarios/keptGtd.test.tsx; __tests__/storage/debugBundleEngage.test.ts; .github/ISSUE_TEMPLATE/bug_report.yml; docs/user/troubleshooting.md#reporting-a-problem
- 3.6: AGENTS.md; docs/dev/history; DEVELOPMENT-POLICY §8 "Review comments answered"
- 3.7: .github/workflows/check.yml; scripts/check.mjs; scripts/release.ps1; scripts/coverage-report.mjs; scripts/lib/codeHealth.mjs; __tests__/domain/features.test.ts
- 3.8: SECURITY.md

## 4. Made for the Supernote: e-ink, handwriting, calm

*Kept is a companion to writing by hand on e-ink, not a phone app on a Supernote.*

- Fulfilled: 4 - built for the A5 X's e-ink and the Supernote's own notes; two screens still scroll
- Confidence: 3
- Assessed: 0.26.0
- Stated: README "Why Kept GTD"; docs/user/philosophy.md; docs/dev/inkhub-listing.md

| Id | Promise | Ful. | Conf. | Kept true by | Why |
|---|---|:-:|:-:|---|---|
| 4.1 | Built for e-ink: pages, not scrolling; sharp; greyscale; refreshed when content appears | 3 | 3 | checklist | paged lists, greyscale, a refresh after loading; the capture screen and the settings column scroll |
| 4.2 | Handwriting at the centre: you write in notes, and Kept turns what you wrote into commitments where you write it | 4 | 3 | test | lasso capture and marks turn handwriting into todos and agreements; Engage works on the page; recognition is the Supernote's |
| 4.3 | Kept uses what the Supernote already does - notes, templates, keywords, links, the lasso - instead of building its own | 4 | 3 | test + checklist | notes, backgrounds, keywords, headings and links are the Supernote's; threads, loops and Engage are Kept's own, on top |
| 4.4 | Calm: no notifications, timers or streaks; nothing pushes the next thing at you; there is room for rest | 5 | 4 | checklist | no notification, timer or streak code; nothing appears unasked |
| 4.5 | Made first for the A5 X; other Supernote models are supported as far as they are checked | 4 | 3 | test | used daily on the A5 X; Manta, Nomad and landscape checked in simulation |

**Rules out:** feeds and notifications; duplicates of Supernote features; designs that need colour,
scrolling or fast touch; typing-first workflows as the default.

Evidence:
- 4.1: DEVELOPMENT-POLICY §8 "UI rules kept"
- 4.2: __tests__/scenarios/smoke/captureTodo.test.tsx; __tests__/scenarios/agreements.test.tsx; __tests__/scenarios/engageMoment.test.tsx; __tests__/scenarios/pageSection.test.tsx
- 4.3: __tests__/domain/noteKeywords.test.ts; __tests__/domain/noteHeadings.test.ts; __tests__/scenarios/meetingReflection.test.tsx; DEVELOPMENT-POLICY §8 "Fits the product principles"
- 4.4: DEVELOPMENT-POLICY §8 "Fits the product principles"
- 4.5: __tests__/scenarios/narrowScreen.test.tsx; __tests__/scenarios/screenSimulation.test.tsx; __tests__/scenarios/pageFrame.test.tsx
