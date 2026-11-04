# 0.26.0 "Promises kept" - Quality assurance beyond tests: requirements

Status: decided 2026-11-04. Technical design: `docs/dev/history/technical-design-quality-assurance.md`.

## 1. Why

Kept GTD already has a strong test base: tiers, 196 plain-language scenarios, a coverage
table per area and a release checklist. What's missing are the **links between layers**:

- Help pages make promises, scenarios prove behavior, and nothing connects the two. Whether
  the help still matches the app depends on reading it by hand at each release.
- Broader claims (README, InkHub listing, PRIVACY, philosophy) and the implicit goals behind
  the development policy aren't listed anywhere together with how each one is backed.
- Some help topics (states, hierarchies, how pages flow into a note file, the meeting flow) are
  hard to explain in text alone.
- Design, code, tests and help are all written by the same author (Claude), so a
  misunderstanding can pass everywhere at once. An independent review is missing.

## 2. Help labels vs app (L)

- **L1** A check reads every `**bold**` label in `docs/user/*.md` (bold means "a label exactly
  as the app shows it", README "Writing user docs") and looks for it in the string
  literals under `src/` and `App.tsx` (not `src/generated/`).
- **L2** Labels that belong to Supernote itself (its menus, lasso toolbar and so on) go in an
  allowlist file, each with a one-line reason.
- **L3** **Report only, never fails.** The result shows up next to the coverage report: in the
  output of `npm run coverage` / CI's job summary, and in each release's
  `docs/dev/history/test-coverage-<version>.md`. Content: number of labels checked, matched,
  allowlisted, plus the unmatched ones as `page.md:line label`.
- **L4** Text in diagram sources (§5) is checked the same way.
- **L5** "Quoted" messages the app shows are included as a best-effort match with
  placeholders (for example a project name inside the message). They are listed separately
  in the same report and are also report-only.

## 3. Scenarios ↔ help (S)

- **S1** Each scenario can name one or more help headings it proves (`help: 'loops.md#closing-a-loop'`).
- **S2** A reference to a page or heading that doesn't exist **fails** the check, the same as a
  broken help link.
- **S3** `npm run scenarios` also generates a **help coverage** overview: per help page, its
  headings (`##`, `###`) with the number of scenarios behind each; headings and pages with
  none are listed as gaps. Pages that make no testable claims (for example philosophy, index)
  can be excluded in a config list, each with a reason.
- **S4** The coverage table per area gets a column "help headings with a scenario: x / y".
- **S5** The overview is a view, not a gate.
- **S6** The existing scenarios get their `help:` references in this release (backfill).
  The gaps that turn up go to the backlog; writing the missing scenarios is not part of 0.26.0.

## 4. Claims register (C)

- **C1** New living document `docs/dev/claims.md` (public), listed in `docs/dev/README.md` and
  DEVELOPMENT-POLICY §6 with the other living documents.
- **C2** One row per claim:
  - id;
  - the claim in one sentence;
  - kind: *promise* (said publicly) or *goal* (implicit, behind the policy or design
    philosophy);
  - where it's stated: README, InkHub listing, PRIVACY, SECURITY, help, philosophy, policy;
  - backing: *enforced* (a check fails), *tested* (unit or scenario test), *reviewed* (a named
    checklist step), or *none*;
  - evidence: paths to the tests, checks or checklist steps;
  - when it's re-checked.
- **C3** Implicit goals are made explicit. Examples: no surprises in my files; works offline
  without any account; nothing is chosen for you; no lock-in even if Kept disappears; a bug
  report never leaks private content; an update never loses data or settings.
- **C4** Evidence paths are validated by a check, like doc references.
- **C5** Building the register is the first audit. Every claim backed by *none* or only
  *reviewed* becomes a backlog item, not a line in the repo, as the policy requires.
- **C6** Policy:
  - §6: a change to README, the InkHub listing, PRIVACY, SECURITY or a philosophy page updates
    `claims.md` in the same change;
  - §9: release checklist line "claims register still true; new claims added".
- **C7** Closing the gaps is not part of 0.26.0. All gaps go to the backlog.

## 5. Diagrams in help (D)

- **D1** Diagram sources live in `docs/user/diagrams/`:
  - Mermaid (`.mmd`) for simple ones: states, hierarchies, flows;
  - HTML/SVG templates (`.html`, like the InkHub poster) for hand-designed ones.
  Both are tried in this release.
- **D2** A script (Playwright, as for the poster) renders them to PNG in
  `docs/user/images/diagrams/`. The PNGs are committed, so GitHub shows them without a build.
  A check fails when a PNG is out of date with its source (compared by a hash of the source
  recorded in a manifest, not by pixels).
- **D3** Look:
  - black, white and gray only; no meaning carried by color;
  - lines and text readable on the A5 X at the width of the help pane;
  - names, projects and tags from the demo space;
  - labels exactly as the app shows them (checked by L4).
  A shared Mermaid theme makes this the default.
- **D4** Help pages include a diagram with `![alt text](images/diagrams/x.png)` on its own
  line. The doc check allows images only from that folder and requires alt text.
- **D5** In the app, the help renderer (`domain/markdownBlocks.ts`, `ui/MarkdownBlocks.tsx`)
  gets an image block:
  - the PNGs are bundled with the plugin;
  - an image is scaled to the pane width, and a page fits it whole (shrinking a tall image to
    the page height rather than splitting it);
  - the pager counts its height.
  The total size of the bundled diagrams is shown in the report, with a budget.
- **D6** First diagrams, content agreed with Tilman from rendered drafts:
  1. the states of a todo;
  2. the hierarchy of Areas, Projects, todos, meetings, loops and threads;
  3. how pages flow into a note file (note setups);
  4. the meeting flow: preparing, during, after (reflection, follow-ups, close-out);
  5. possibly the Review cycle.
- **D7** Using diagrams in other app screens is a later release; the image block is built so
  it can be reused.

## 6. Independent review (R)

- **R1** `AGENTS.md` in the repo root. Its review-guidelines section is what Codex code review
  follows. It stays short, points to DEVELOPMENT-POLICY and `docs/dev/claims.md`, and holds the
  rules of R8. `CLAUDE.md` and `AGENTS.md` both point to the same policy; neither copies it.
- **R2** Codex code review is on for the repo, with automatic reviews for every PR.
- **R3** Every implementation prompt for a cloud session gets a closing step:
  1. after the PR is open, read the Codex review with `gh`;
  2. for each comment, fix it or reply in its thread why not;
  3. ignore none, and don't follow any blindly.
  DEVELOPMENT-POLICY §8 gets the line "review comments answered", and GITHUB-GUIDE explains
  how to resume a session to address a review that came in later.
- **R4** **Claims audit**: a written prompt for a fresh session, Claude without project context
  or a Codex task, that gets only `claims.md` and the code. For each claim it answers: is it
  true, and does the evidence really prove it? Findings go to the backlog.
- **R5** Cadence: before every InkHub submission or resubmission, plus every third minor
  release. The release checklist records when it last ran.
- **R6** The first audit runs on the finished register in this release.
- **R7** `SECURITY.md` in the repo root (GitHub's standard security policy): which versions get
  fixes (the latest release), how to report a vulnerability privately (GitHub private
  vulnerability reporting, which is on), what happens after a report, and a short summary of
  what Kept touches (local files, optional experimental Google services, update download from
  GitHub releases) linking to PRIVACY.md. It becomes a source of claims in the register.
- **R8** **Tuning Codex for valuable feedback** - review guidelines written as Kept-specific
  rules, each with the invariant, what to flag and the right alternative:
  - **P0** (must not merge): a data file written outside `writeDataFile` or regenerated whole
    instead of span-scoped; a delete without the confirmation + permission sequence; a secret
    in a file, log, debug bundle or profile; a network call outside the experimental
    integrations and the update check; a file-format change without parser, serializer,
    round-trip test and reading of older files; a settings change that loses existing user
    settings on update.
  - **P1**: a file-changing flow without a scenario test; a changed label or behavior with the
    help page not updated; a user-visible change without a CHANGELOG line or Upgrade note; a
    new permission or data flow without PRIVACY.md (and SECURITY.md where relevant); a claim in
    `claims.md` the change makes untrue; a caught error that is neither logged nor marked
    silent with a reason.
  - **Don't flag**: what ESLint, tsc, code-health and the tests already enforce; formatting and
    style; file length. This keeps the review short and its findings worth reading.
- **R9** Context for the reviewer: every PR body names the design doc and its requirement ids,
  what was verified off-device and what still needs the device. Codex reviews against stated
  intent, so a good PR body makes better findings.
- **R10** Feedback loop:
  - each Codex finding is answered with a tag, *fixed*, *not applicable* or *noise*;
  - at the claims audit, the tally decides which rules to sharpen, add or remove;
  - a bug that reaches a release adds a rule to the guidelines, the same way policy §11 grows
    from mistakes;
  - new rules are tried with the three-case test: a deliberate violation must be flagged, a
    safe counterexample and an unrelated change must stay quiet.

## 7. Decisions

- Claims register is a public living doc; its gaps go to the internal backlog.
- Label check and help coverage never fail; they're reported next to the coverage report.
- A broken `help:` reference in a scenario fails the check.
- Quoted messages are in 0.26.0, best effort, report only.
- Diagrams: both Mermaid and HTML templates; Mermaid for the simple ones. No device spike: the
  app already shows images (template preview, marks).
- Claims audit before each InkHub (re)submission plus every third minor release.
- All gaps go to the backlog.
- Release name "Promises kept".

## 8. Not in scope

- Making the label check or help coverage fail, or ratcheting them.
- Writing the missing scenarios and closing claim gaps (backlog).
- Diagrams outside the help.
