# Promises audit

> **About this document.** The prompt for the independent promises audit
> (`technical-design-quality-assurance.md` §8.5, `technical-design-claims-assessment.md`): a fresh
> session - Claude without this project's context, or a Codex task - re-rates `docs/dev/promises.md`
> against the code. It runs before every InkHub submission or resubmission and every third minor
> release (DEVELOPMENT-POLICY §9). Keep this prompt current when the register's format or the
> review tally changes.

## How to run it

1. Start a fresh session on the repository (no project documents, no memory), on `main`.
2. Paste the prompt below.
3. The session writes its new ratings into `docs/dev/promises.md` (Fulfilled and Confidence of each
   promise and headline, Assessed, the line "Last audit") on a branch, and hands its report to
   Tilman. Promises it finds broken or missing, and guideline changes, go to the backlog.

## The prompt

```
You audit what Kept GTD, a Supernote plugin, promises. Your input is this repository only.

1. Read docs/dev/promises.md, its "How to read the ratings" first. For every promise in its tables:
   a. Fulfilled: how well does the code keep it today, 1-5? Read the code it is about, not only
      the evidence. Rewrite the Why in one phrase if yours differs.
   b. Confidence: how sure is that rating, 1-5, by the scale (5 = verified in the code and a test
      would fail if it broke; 1 = a guess)?
   c. Kept true by: would each listed test, check or checklist step really catch a break? Put the
      changes you'd make into the report; don't edit this column.
   Then rate each headline on its own, informed by its promises. Write the new Fulfilled,
   Confidence, Why and "Assessed: <current version>" into the register; change nothing else in it
   except the line "Last audit".
2. Read README.md, docs/dev/inkhub-listing.md, PRIVACY.md, SECURITY.md, docs/user/philosophy.md,
   docs/dev/design-philosophy.md and the help pages in docs/user/. List every promise they make
   that the register misses ("never", "always", "only", "no ..."), and anything in the code that
   contradicts a "Rules out" line.
3. Run `node scripts/review-tally.mjs --since <tag of the last audit>` (needs gh). Which review
   guidelines in AGENTS.md produced noise or "not applicable" answers? Which bugs reached a
   release that a guideline could have caught?
4. Run `npm run promises`, commit the register with the message "Promises audit <version>", and
   write one report: every rating you changed (old → new, why), the "Kept true by" values you
   would change, the promises now at Fulfilled 3 or less or Confidence 2 or less, the missing
   promises, and the guideline changes you propose (sharpen, add, remove), each with its reason.
```
