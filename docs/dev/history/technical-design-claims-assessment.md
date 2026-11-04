# Technical design - help gaps first, and claims with an assessment

Status: agreed with Tilman 2026-11-04 (in conversation, after 0.26.0 "Promises kept" was merged).

- Builds on: `docs/dev/history/technical-design-quality-assurance.md` (§3.3 help coverage, §7 claims).
- Branch: `feature/claims-assessment`. Part of 0.26.0.

## 1. Why

- The help headings without a scenario are in CI's job summary, but below the whole area matrix,
  mixed with fully covered pages: the 105 gaps are hard to see.
- The claims register says how a claim is *kept true* (Backing), not whether it *is* true. "S9
  (none) Kept GTD is MIT" reads as "not true", though it is: nothing would catch a change, that is
  all "none" says. A claim needs both: how true it is today, how sure that rating is, and what
  catches a regression.

## 2. Decisions

- **D1** CI's job summary starts with the help gaps, above the area matrix. Report only, as before.
- **D2** `getting-started.md` is excluded from help coverage: it retells the other pages.
- **D3** Every claim gets **Fulfilled** (1-5 and one phrase why), **Confidence** (1-5) and
  **Assessed** (the version the scores are from). Claude sets the first scores now; the claims
  audit updates them in `docs/dev/claims.md`.
- **D4** *Backing* is renamed **Kept true by**, with the values `check`, `test`, `checklist`,
  `nothing` (were enforced, tested, reviewed, none).
- **D5** P8 (which files Kept touches) is made true by fixing its wording in PRIVACY.md, the InkHub
  listing and the register. E2 (paged, not scrolled) stays as it is; making it true is backlog work.

## 3. Help gaps first (D1, D2)

- `renderHelpCoverage` starts with one totals line, `Help: 73 / 178 headings have a scenario`,
  then the pages with gaps, emptiest first (lowest share covered, then most gaps), each as
  `### page.md - covered / total` with its uncovered headings, one per line. Fully covered pages
  follow as one line, `Covered in full: contexts.md, …`. Excluded pages and headings as before.
- The quality report keeps its order (help coverage is its first section).
- `.github/workflows/check.yml` writes `coverage/quality.md` into the job summary first, then
  `coverage/areas.md`. `release.ps1` keeps matrix-then-report in the release file (a record, not a
  view).
- `scripts/help-coverage.json`: `getting-started.md` with its reason.

## 4. Claims with an assessment (D3-D5)

### 4.1 Format

```md
### S9 Kept GTD is free and open source under the MIT license
- Kind: promise
- Stated: README; docs/dev/inkhub-listing.md
- Fulfilled: 5 - LICENSE is the MIT text; README and the listing say MIT
- Confidence: 5
- Assessed: 0.26.0
- Kept true by: nothing
- Evidence: LICENSE
- Re-checked: -
```

Scales, written at the top of `claims.md`:

- **Fulfilled**: 5 true everywhere; 4 true with one minor exception; 3 true in the main paths, with
  a known exception; 2 partly true; 1 not true.
- **Confidence**: 5 verified in the code and a test would fail if it broke; 4 the relevant code
  read; 3 part of the code or only the docs read; 2 inferred; 1 a guess.
- **Kept true by**: `check` (a check of `npm run check` fails), `test` (a unit or scenario test
  fails), `checklist` (a named checklist step), `nothing`.

### 4.2 Check (`scripts/lib/claims.mjs`, fails)

Unchanged rules, renamed field and values, plus: Fulfilled is `n - phrase` with n 1-5 and a phrase;
Confidence is 1-5; Assessed is `x.y.z`; `check` and `test` need a file as evidence. The values are
never judged: a low score is not a failure.

### 4.3 Report

The Claims section of `quality.md`:

1. counts per *Kept true by* and per group (as before, new names);
2. **Not (fully) true or unsure**: claims with Fulfilled ≤ 3 or Confidence ≤ 2, lowest first, with
   their scores and phrase;
3. **Kept true by checklist or nothing**: the list as before.

### 4.4 Policy and docs

- `docs/dev/claims.md` "About" note: the three questions and the scales.
- `docs/dev/claims-audit.md`: the audit re-rates Fulfilled and Confidence, sets Assessed, and writes
  those changes into `claims.md` (plus the "Last claims audit" line); findings still go to the
  backlog.
- DEVELOPMENT-POLICY §7 (quality report) and §9 (claims register line): the new names.

## 5. Tests

- `scripts/test-help-coverage.mjs`: totals line first; emptiest page first; fully covered pages in
  one line; excluded page left out.
- `scripts/test-claims.mjs`: the new fields and values (each failure: missing, out of range, no
  phrase, bad version, `check`/`test` without a file); the report's two lists and their order.

## 6. Steps

| Step | Content | Device test |
|---|---|---|
| A1 | help gaps first: render, CI order, getting-started excluded | none |
| A2 | claims: format, check, report, register re-rated, P8 wording, audit prompt, policy | none |
