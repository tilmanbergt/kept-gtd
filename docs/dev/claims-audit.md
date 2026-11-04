# Claims audit

> **About this document.** The prompt for the independent claims audit
> (`technical-design-quality-assurance.md` §8.5): a fresh session - Claude without this project's
> context, or a Codex task - re-rates `docs/dev/claims.md` against the code. It runs before every
> InkHub submission or resubmission and every third minor release (DEVELOPMENT-POLICY §9). Keep
> this prompt current when the register's format or the review tally changes.

## How to run it

1. Start a fresh session on the repository (no project documents, no memory), on `main`.
2. Paste the prompt below.
3. The session writes its new ratings into `docs/dev/claims.md` (Fulfilled, Confidence, Assessed
   per claim, and the line "Last claims audit") on a branch, and hands its report to Tilman.
   Wrong claims, missing claims and guideline changes go to the backlog, not into the register.

## The prompt

```
You audit the claims of Kept GTD, a Supernote plugin. Your input is this repository only.

1. Read docs/dev/claims.md, its scales first. For every claim:
   a. Fulfilled: how true is it in the code today, 1-5, with one phrase why? Read the code it is
      about, not only the evidence.
   b. Confidence: how sure is that rating, 1-5, by the scale (5 = verified in the code and a test
      would fail if it broke; 1 = a guess)?
   c. Kept true by: does the evidence really catch a regression? A test keeps a claim true only
      when it would fail if the claim became untrue. Is check / test / checklist / nothing right?
      Put a change you'd make here into the report; don't edit it.
   Write the new Fulfilled, Confidence and "Assessed: <current version>" into the entry; change
   nothing else in the register except the line "Last claims audit".
2. Read README.md, docs/dev/inkhub-listing.md, PRIVACY.md, SECURITY.md, docs/user/philosophy.md,
   docs/dev/design-philosophy.md and the help pages in docs/user/. List every promise they make
   that the register misses ("never", "always", "only", "no ...").
3. Run `node scripts/review-tally.mjs --since <tag of the last audit>` (needs gh). Which review
   guidelines in AGENTS.md produced noise or "not applicable" answers? Which bugs reached a
   release that a guideline could have caught?
4. Run `npm run claims`, commit the register with the message "Claims audit <version>", and write
   one report: every claim whose ratings you changed (old → new, why), the "Kept true by" values
   you would change, the
   claims now at Fulfilled 3 or less or Confidence 2 or less, the missing claims, and the
   guideline changes you propose (sharpen, add, remove), each with its reason.
```
