# Claims audit

> **About this document.** The prompt for the independent claims audit
> (`technical-design-quality-assurance.md` §8.5): a fresh session - Claude without this project's
> context, or a Codex task - checks `docs/dev/claims.md` against the code. It runs before every
> InkHub submission or resubmission and every third minor release (DEVELOPMENT-POLICY §9). Keep
> this prompt current when the register's format or the review tally changes.

## How to run it

1. Start a fresh session on the repository (no project documents, no memory), on `main`.
2. Paste the prompt below.
3. Hand the report to Tilman. Findings go to the backlog; only the line "Last claims audit" in
   `docs/dev/claims.md` changes in the repository.

## The prompt

```
You audit the claims of Kept GTD, a Supernote plugin. Your input is this repository only. Don't
change any file.

1. Read docs/dev/claims.md. For every claim:
   a. Is it true in the code today? Read the code it is about, not only the evidence.
   b. Does the evidence prove it, or only touch it? A test proves a claim when it would fail if
      the claim became untrue.
   c. Is the backing level right? enforced = a check fails; tested = a test fails; reviewed = a
      named checklist step; none.
   Answer per claim: true / doubtful / false, the backing you would give it, and one or two
   sentences why.
2. Read README.md, docs/dev/inkhub-listing.md, PRIVACY.md, SECURITY.md, docs/user/philosophy.md,
   docs/dev/design-philosophy.md and the help pages in docs/user/. List every promise they make
   that the register misses ("never", "always", "only", "no ...").
3. Run `node scripts/review-tally.mjs --since <tag of the last audit>` (needs gh). Which review
   guidelines in AGENTS.md produced noise or "not applicable" answers? Which bugs reached a
   release that a guideline could have caught?
4. Write one report: the table of claims (id, verdict, backing, why), the missing claims, and
   the guideline changes you propose (sharpen, add, remove), each with its reason.
```
