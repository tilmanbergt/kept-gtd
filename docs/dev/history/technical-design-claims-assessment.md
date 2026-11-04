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

## 7. From claims to promises (A3)

Agreed with Tilman after A2, in conversation: 65 specific claims read as a catalogue, not as what
Kept is. The register becomes the product's vision, spelled out in promises that guide the roadmap
and the answers to wishes.

- **P1** `docs/dev/claims.md` becomes `docs/dev/promises.md`, "What Kept GTD promises";
  `claims-audit.md` becomes `promises-audit.md`, the scripts `promises.mjs`, `lib/promises.mjs`,
  `test-promises.mjs`, `npm run promises`.
- **P2** Four headlines, in the order of the README's tagline: 1. Your promises, kept (GTD and PARA
  as the frame, flexible within it); 2. Your files, kept yours and kept safe (content sustainable
  beyond Kept and the Supernote, the close-out PDF, open source, privacy); 3. Well made
  (documented, openly developed, tested, robust, bug reports, a clear path through updates);
  4. Made for the Supernote (e-ink, handwriting, native features, calm). "The whole life of a
  project" is not a headline; its PDF record is promise 2.2.
- **P3** Each headline: a vision line, its own ratings (judged on its own, informed by its
  promises), where it is stated, a table of at most ten promises (id `n.m`, Fulfilled, Confidence,
  Kept true by, Why), a "Rules out" line, and an Evidence list per promise. Kind, Stated and
  Re-checked per promise are gone: Stated is on the headline, Re-checked follows from Kept true by.
- **P4** "Kept true by" combines the keepers that would really catch a break (`test + checklist`);
  weak ones are dropped. `check`/`test` need a file, `checklist` a checklist step as evidence.
- **P5** The engineering goals of the first register (layers, file length, error logging, the
  coverage ratchet, the help checks) are not promises of their own: they are evidence of 3.7
  ("tested before it reaches you") or 3.1, where they keep a promise true.
- **P6** A "Using this to decide" section: a wish that contradicts a promise or a "Rules out" line
  is declined, or becomes an experiment behind a switch. The terms *your content*, *your setup*
  and *Kept's own data* are defined there, for the register only.
- **P7** The README's "Why Kept GTD" says the four headlines in short and links to the register.

## As built

- Built as designed in A1 and A2. With getting-started excluded, help coverage reads 73 / 169.
- The first ratings (0.26.0): 13 claims are not fully true or unsure. Two ratings changed from what
  the first audit assumed:
  - F10 (Kept never deletes notes) is 4: removing the demo space with Remove Kept's data deletes
    the demo folder, notes included.
  - V6 (outside the private folders, only empty folders are deleted natively) is 2: Remove Kept's
    data also uses `deleteKeptTree` and `deleteKeptFile`. `AGENTS.md`'s delete rule now names them,
    so a review doesn't flag Remove Kept's data.
- P8 was made true by its wording: PRIVACY.md splits file read from file write and names what Kept
  reads elsewhere (a linked file from the Device tab, a background from MyStyle, the file Kept was
  opened from); SECURITY.md and the InkHub listing say the same in short.
- A3: the register is `docs/dev/promises.md`, four headlines, 26 promises: 6 not fully kept or
  unsure (3.8 security reports, never tried; 1.4 renegotiating not always explicit; 3.1 help
  coverage; 4.1 two screens scroll; 2.4 two automatic changes; 2.2 the PDF only checked on the
  device), 7 kept true only by a checklist or by nothing. Every claim of A2 went into a promise or
  its evidence. DEVELOPMENT-POLICY §6 also says that a wish against a promise is declined or
  becomes an experiment.
