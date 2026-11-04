# Technical design - 0.26.0 "Promises kept": quality assurance beyond tests

Status: approved 2026-11-04.

- Requirements: `docs/dev/history/requirements-quality-assurance.md` (ids L, S, C, D, R below refer to it).
- Branch: `feature/promises-kept`.

## 1. Current state (what this builds on)

- **Scenarios**: `scenario(title, {feature, design}, body)` in `test-helpers/scenario/scenario.ts`.
  `scripts/lib/scenarioCatalog.mjs` reads the meta from the source with regexes (single-quoted
  strings). `scripts/scenario-catalog.mjs --check` keeps `docs/dev/test-scenarios.md` current.
- **Help**:
  - `scripts/gen-bundled-content.mjs` bundles `docs/user/*.md` into `src/generated/userDocs.ts`
    (not committed);
  - `scripts/lib/userDocs.mjs` `checkLinks` fails on broken help links, using
    `domain/helpLinks.ts`'s `pageAnchors`/`headingSlug` (loaded via `scripts/lib/tsModule.mjs`);
  - `__tests__/docs/userDocs.test.ts` enforces the device-safe subset, which has no images.
- **Help renderer**:
  - `domain/markdownBlocks.ts` parses the subset into heading, item, paragraph and code blocks;
  - `ui/MarkdownBlocks.tsx` (`MarkdownPager`) pages the blocks with `PagedSection`, using row
    heights estimated against the measured column width;
  - the help page column is about 70 % of the screen (`ui/HelpOverlay.tsx`, list 30 %).
- **Images in the app**: RN `<Image>` already works in the plugin host:
  - the note template preview and "Choose background" load `file://` images
    (`ui/NoteTemplatePreview.tsx`, `screens/Settings.tsx`);
  - lasso marks show their captured pictures.
- **Device units** (`docs/dev/design-device-rendering.md`): 1 dp = 1.41 px on the A5 X; the
  screen is about 994 dp wide.
- **Coverage**:
  - `npm run coverage` ends with `scripts/coverage-report.mjs`, which writes the area matrix
    `coverage/areas.md` (`scripts/lib/testAreas.mjs` `renderMatrix`);
  - CI appends it to the job summary (`.github/workflows/check.yml`);
  - `release.ps1` copies it to `docs/dev/history/test-coverage-<version>.md`;
  - `scripts/test-areas.json` assigns tests, sources and help pages to areas.
- **Poster**: `docs/dev/inkhub-poster/render.mjs` renders HTML to PNG with Playwright, which is
  installed by hand, not as a dependency. Local fonts (Archivo, Caveat, OFL) are in
  `docs/dev/inkhub-poster/fonts/`.
- **GitHub**:
  - `.github/pull_request_template.md` is aimed at outside contributors;
  - there is no `AGENTS.md` and no `SECURITY.md`;
  - private vulnerability reporting is on (Tilman, 2026-11-04).

## 2. Overview

New pieces:

| Piece | What | Fails the check? |
|---|---|---|
| `help:` on scenarios | scenario → help headings it proves | broken reference: yes |
| `npm run quality` → `coverage/quality.md` | help coverage, labels, quoted messages, claims, diagrams | no (report) |
| `docs/dev/claims.md` + claims check | the register | malformed entry or missing evidence path: yes |
| `docs/user/diagrams/` + `npm run diagrams` | sources → PNG + manifest | PNG out of date / missing / unreferenced source: yes |
| image block in help | `![alt](images/diagrams/x.png)` | bad image line: yes (doc check) |
| `AGENTS.md`, `SECURITY.md`, PR template | review guidelines, security policy | - |

"Fails" items are mistakes (typos, stale generated files), like broken help links today. Every
judgement about *coverage* is report-only, as decided.

## 3. Scenarios ↔ help (S1-S6)

### 3.1 Meta

`ScenarioMeta` gets `help?: string`: one or more references separated by `, `, each
`page.md#anchor` or `page.md` (the whole page).

```ts
scenario('Weekly Review: get the Inbox to zero …', {
  feature: 'Weekly Review',
  design: 'technical-design-review-hub.md',
  help: 'review.md#inbox-to-zero',
}, () => { … });
```

- A single-quoted string, like `feature` and `design`, so the regex reader stays simple.
- `META_RE` in `scenarioCatalog.mjs` adds `help`, and `parseScenarios` returns
  `help: string[]`.
- The catalog line becomes ``Test: `…` · design: `…` · help: `review.md#inbox-to-zero` ``.

### 3.2 Validation (S2, fails)

- `scripts/lib/scenarioCatalog.mjs` gets `checkHelpRefs(scenarios, pages, anchorsOf)`. It returns
  `"<file>: <scenario title>: <ref> (no such page|no such heading)"` lines, using the same
  `anchorsOf` as `checkLinks`.
- `scenario-catalog.mjs --check` runs it, loading `domain/helpLinks.ts` via `tsModule.mjs` as
  `gen-bundled-content.mjs` does, and exits 1 on any finding. So quick and every higher tier
  catch it.

### 3.3 Help coverage (S3-S5, report)

`scripts/lib/helpCoverage.mjs` (pure):

- `helpHeadings(pages, anchorsOf)` → per page, its `##`/`###` headings
  `{page, anchor, title, level}`. The page title `#` counts as the page itself.
- `coverHeadings(headings, scenarios)` → per heading, the scenarios that name it.
  - A reference to a `##` covers only the `##`, not the `###` under it. Specific references are
    what show gaps.
  - A page-only reference covers the page row, not its headings.
- `EXCLUDED` lives in `scripts/help-coverage.json`: `{page: reason}` for pages that make no
  testable claims. Proposed: `index`, `philosophy`, `features`, `troubleshooting`. Headings can
  be listed too (`"settings.md#about": "static text"`).
- `renderHelpCoverage(…)`:
  - per page: `covered / total` headings, then the uncovered headings as
    `- page.md#anchor - Title`;
  - pages without any covered heading come first;
  - a final line gives the overall totals.

**Area column (S4)**: `renderMatrix` gets an optional `helpByArea: {id: {covered, total}}`. It adds
the column **Help ✓** (`12 / 20`), using the help-page → area mapping from `test-areas.json`.
`coverage-report.mjs` computes it with `helpCoverage.mjs`.

### 3.4 Backfill (S6)

Step S2 (§11) adds `help:` to the existing ~196 scenarios:

- the design doc each scenario names, plus its feature, usually points to one help page;
- the session reads that page and picks the heading whose text describes the scenario's
  behavior;
- where no heading fits, the scenario gets a page-only reference and the session notes the
  missing heading;
- the list of uncovered headings after the backfill goes to the backlog (gaps), not into the
  repo.

## 4. Help labels and quoted messages (L1-L5, report)

### 4.1 What the app's strings are

`scripts/lib/appStrings.mjs` collects the texts the app can show. It uses the TypeScript
compiler API (`typescript` is already a dependency) on every `src/**/*.ts(x)` (not
`src/generated/`) and `App.tsx`:

- `StringLiteral`, `NoSubstitutionTemplateLiteral` and `JsxText` → **literals** (trimmed,
  whitespace collapsed);
- `TemplateExpression` → **patterns**: the static parts joined by a gap
  (`` `Save to ${name}` `` → `Save to ⟨…⟩`), turned into a regex where each gap is `.+?`.

Strings in comments are not collected, since the compiler drops them. Imports and the like are
collected too; that only adds harmless candidates.

### 4.2 What the help claims

`scripts/lib/helpLabels.mjs`:

- **Labels (L1)**: every `**…**` outside code fences and inline code in `docs/user/*.md`, with
  page and line.
  - A label with ` → ` (a path such as **Settings → Data → Profiles**) is split, and each part
    is checked.
  - A trailing ` ›` or leading `‹ ` is tried with and without.
- **Quoted messages (L5)**: every `"…"` of three or more characters outside code, with the same
  normalization. Many quotes are not app texts (titles of examples, a user's own words), so
  they're listed separately and never counted against the labels.
- **Diagram text (L4)**: labels in diagram sources (§6.4) are read the same way.
- **Match**: a label matches when it is a substring of a literal, or matches a pattern in full.
  A quote matches the same way, or when each of its parts outside demo names matches.
  Demo names come from `buildDemoFiles`, as `userDocsExamples.test.ts` already loads them, so
  "Moved to Garden renovation" matches `Moved to ${name}`.
- **Allowlist (L2)**: `scripts/help-labels-allow.json`, `{label: reason}`, for Supernote's own
  menu entries and toolbar names, and keyboard keys, when they're not also among our strings.
  A stale allowlist entry (the label no longer occurs in the help) is reported.

### 4.3 Output

- Section "Help labels" in `coverage/quality.md` (§5):
  - totals: checked / matched / allowlisted / unmatched;
  - the unmatched labels as `- tags.md:42 **Waiting for**`;
  - then "Quoted messages" with the same totals and list.
- Never changes the exit code.

## 5. The quality report

- `scripts/quality-report.mjs` (I/O) + pure libs above. `npm run quality` writes
  `coverage/quality.md` and prints it. It needs no Jest run, so it takes seconds and can be run
  any time.
- Sections:
  1. Help coverage by scenarios (§3.3);
  2. Help labels and quoted messages (§4);
  3. Claims by backing (§7.3);
  4. Diagrams (§6.6: count, total bundled size against the budget).
- `check.mjs --coverage` runs it right after `coverage-report.mjs`, never failing.
- CI: the summary step appends `coverage/quality.md` after `areas.md`.
- `release.ps1` appends `quality.md` below the matrix in `test-coverage-<version>.md`, so each
  release keeps both.
- Quick, smoke, area and affected tiers print one line only: `quality: npm run quality for help
  coverage, labels and claims`. They stay fast and are unchanged otherwise.

## 6. Diagrams (D1-D7)

### 6.1 Files

```
docs/user/diagrams/
  theme.mmd.json          Mermaid config: base theme, black/white/gray, font, sizes
  diagram.css             shared CSS for HTML diagrams (same font and line weights)
  todo-states.mmd         example: one file per diagram, id = file name
  note-setup-pages.html
docs/user/images/diagrams/
  todo-states.png         committed
  manifest.json           {id: {source, hash, width, height, bytes}}
```

Fonts: Archivo from `docs/dev/inkhub-poster/fonts/` is reused by path, so there's no second
copy.

### 6.2 Rendering - `scripts/diagrams.mjs`

- `npm run diagrams` renders every source whose hash changed, or all with `--all`.
- Rendering needs `playwright` and `mermaid` as **devDependencies**, plus Chromium
  (`npx playwright install chromium`, once per machine). CI never renders, so CI needs no
  browser.
- **Mermaid**:
  - a page loads `mermaid` from `node_modules` and the font via `@font-face`;
  - it calls `mermaid.render` with `theme.mmd.json`;
  - it screenshots the SVG at **target width W** (§6.5) with `deviceScaleFactor` chosen so the
    PNG is W px wide.
- **HTML**: as the poster. The page links `diagram.css`; its root element `#diagram` is
  screenshotted at width W.
- A CSS `filter: grayscale(1)` on the root guarantees no color slips in.
- **Hash**: sha256 of the source, `theme.mmd.json` or `diagram.css`, and the renderer version
  constant. A font or renderer change bumps the constant, which marks all diagrams stale.
- Where it runs: on Tilman's computer, or in a cloud session that has Chromium (the step's
  prompt says to check `npx playwright install chromium` first). If neither can render, the
  session commits the source and says the PNG still needs `npm run diagrams`; the check then
  fails until it's rendered. That's deliberate: no stale or missing picture can be merged.

### 6.3 Check - `scripts/diagrams.mjs --check` (quick tier and up, fails)

- every source has a manifest entry whose hash matches, and its PNG exists with the recorded
  byte size;
- every PNG and manifest entry has a source (no orphans);
- every diagram is used by at least one help page, and every image line in a help page names
  a diagram in the manifest;
- the total PNG size is within the **budget of 400 KB**. Over budget fails, because the
  pictures go into the plugin.

`scripts/test-diagrams.mjs` tests the pure parts (`scripts/lib/diagrams.mjs`: hashing input,
manifest compare, reference check).

### 6.4 Text in diagrams

- In Mermaid, an app label is written as a markdown string with bold:
  ``A["`**Waiting for**`"]``.
- In HTML it's `<b class="label">Waiting for</b>`.
- The label extractor (§4.2) reads both. Names and tags in diagrams come from the demo space,
  and `userDocsExamples.test.ts` also scans `docs/user/diagrams/` for nested tags.

### 6.5 Look (D3)

- Black lines on white, gray (#888 or lighter) only for secondary boxes. No meaning carried by
  color. Lines at least 2 px at W, text at least the help body size after scaling.
- Aspect: at most 1 : 1.3 (portrait), so a diagram fits a help page together with its heading.
- **W = 960 px**, computed rather than measured:
  - the help column is about 70 % of 994 dp minus padding, so about 680 dp;
  - at 1.41 px per dp that is about 960 px.
  On the A5 X a PNG pixel is then about one screen pixel, so lines stay sharp on e-ink.
  Narrower screens (Nomad) scale it down; `resizeMode="contain"` keeps the aspect. If the S4
  device test shows the column differs, W is one constant in `scripts/diagrams.mjs`, and
  `--all` re-renders.

### 6.6 In the app (D5)

**Markdown.** An image line is `![alt text](images/diagrams/<id>.png)` alone on its line,
separated by blank lines.

**Parser.** `domain/markdownBlocks.ts` gets `{kind: 'image'; id: string; alt: string}`:

- `IMAGE = /^!\[([^\]]+)\]\(images\/diagrams\/([a-z0-9-]+)\.png\)$/`;
- an image anywhere else, or with another path, stays plain text in the app and fails the doc
  check below.

**Doc check.** `__tests__/docs/userDocs.test.ts` (device-safe subset):

- an image is allowed only as such a line;
- alt text is required;
- the README "Writing user docs" list gains this one rule.

**Bundling.** `gen-bundled-content.mjs` writes `src/generated/helpImages.ts`:

```ts
export const HELP_IMAGES: Record<string, {uri: string; width: number; height: number}> = {
  'todo-states': {uri: 'data:image/png;base64,…', width: 960, height: 1100},
};
```

- **Data URIs.** The app's existing images are `file://` images from the user's folders. The
  help pictures ship inside the plugin, and a data URI keeps them in the JS bundle, with no
  dependence on how the plugin package handles image assets.
- RN's `<Image>` on Android loads data URIs with the same loader as `file://`. The S4 device
  test confirms it.
- The 400 KB budget keeps the JS bundle growth to about 550 KB.

**Rendering.** `ui/MarkdownBlocks.tsx` draws `<Image source={{uri}} accessibilityLabel={alt}
resizeMode="contain">`, as `NoteTemplatePreview` does for its background.

- Width: the column width. Height: `width × h / w`, capped at the measured column height minus
  the pager header.
- `MarkdownPager` measures the height as well as the width (`onLayout`). A capped image keeps
  its aspect, centered.
- `markdownBlockHeight` gets the image case, and an image is one row, as every block.
- An unknown id (should not happen, as the check catches it) renders the alt text as a
  paragraph.
- E-ink refresh: the help already refreshes on page change. An image that finishes loading
  after the page is drawn calls `requestEinkRefresh()` from `onLoad` (DEVELOPMENT-POLICY §4,
  content that appears without a tap).

**What's new and other screens.** The same `MarkdownPager` would show images in What's new if
the CHANGELOG ever had them. It doesn't, and the CHANGELOG check isn't changed. Reuse in other
screens (D7) goes through `HELP_IMAGES` + `<Image>` later.

### 6.7 First diagrams (D6) - content to agree in S6

Draft subjects. The exact boxes and labels are agreed with Tilman before rendering:

1. **States of a todo** (`tags.md` or `daily.md`): Inbox → filed → `#next` / `#waiting` /
   `#someday` / due date → done, and where each shows (Daily, Week, Review).
2. **Hierarchy** (`projects-and-areas.md`): Area → Projects → todos and meetings; loops and
   threads as tags across them; notes and note setups attached.
3. **Pages into a note file** (`note-setups.md`, HTML): a note setup's pages (prep, meeting,
   reflection) flowing into one shared `.note` with headings and keywords.
4. **Meeting flow** (`meetings.md`): before (prep page, agenda, what's open with the person),
   during (the meeting page, Engage, marks and agreements), after (reflection page, follow-up
   todos, waiting-for, close-out in Review), and where each step happens in Kept.
5. **Review cycle** (`review.md`), only if 1-4 work well.

## 7. Claims register (C1-C7)

### 7.1 `docs/dev/claims.md` (living document)

The format is parseable and still readable on GitHub:

```md
# Claims register

> About this document: every promise Kept makes (README, InkHub listing, PRIVACY, SECURITY,
> help, philosophy) and every goal behind DEVELOPMENT-POLICY, with how each is backed. Kept by:
> DEVELOPMENT-POLICY §6 and §9. Last claims audit: 0.26.0.

## Your files

### F1 Your content lives in plain files you can read without Kept
- Kind: promise
- Stated: README "Features at a glance"; docs/user/philosophy.md; docs/dev/inkhub-listing.md
- Backing: tested
- Evidence: __tests__/domain/markdownRoundTrip.test.ts; __tests__/scenarios/fileSafety.test.tsx
- Re-checked: every push (CI)
```

- Groups (proposal):
  - Your files;
  - Changes you can see (moves, deletes, migrations);
  - Privacy, network and accounts;
  - Updates and upgrades;
  - Calm and e-ink;
  - Help tells the truth;
  - Diagnostics and bug reports;
  - Development and supply chain.
- Ids: a letter per group plus a number, stable once given. A retired claim is removed, not
  renumbered.
- Backing values: `enforced` (a check fails), `tested`, `reviewed` (names the checklist step,
  e.g. `DEVELOPMENT-POLICY §9 "PRIVACY.md still true"`), or `none`.
- Kind: `promise` or `goal`.

### 7.2 Check - `scripts/lib/claims.mjs` + `scripts/claims.mjs --check` (quick tier and up)

**Fails on:**

- an entry missing a field;
- an unknown kind or backing;
- a duplicate id;
- an evidence path that doesn't exist (a file, `file#anchor` for markdown headings, or
  `DEVELOPMENT-POLICY §n` / `RELEASING §n`, whose section must exist);
- `enforced` or `tested` without at least one file as evidence.

Tested by `scripts/test-claims.mjs`.

### 7.3 Report

The section "Claims" in `quality.md`:

- counts per backing, per group;
- the list of claims backed `reviewed` or `none` (id + one-line claim) - the gap view.

The details of what to do about each gap live in the backlog (C5).

### 7.4 Writing it (S7 = the first audit)

- The session reads README, `docs/dev/inkhub-listing.md`, PRIVACY.md, SECURITY.md (new),
  `docs/user/philosophy.md`, `docs/dev/design-philosophy.md`, DEVELOPMENT-POLICY §2-§5 and the
  help pages' promises ("never", "always", "only").
- It writes one entry per distinct claim (C3: implicit goals included) and looks up the real
  evidence.
- It reports gaps as a list for the backlog in its final message, never in the repo.

### 7.5 Policy wiring (C6)

- §6 Documentation: "A change to README, the InkHub listing, PRIVACY, SECURITY or a philosophy
  page updates `docs/dev/claims.md` in the same change."
- §9 Release checklist:
  - "Claims register still true; new claims added";
  - "`coverage/quality.md` read once: new help gaps or unmatched labels?";
  - "Claims audit due? (before each InkHub (re)submission, every third minor release)".
- `docs/dev/README.md`: claims.md in the list of living documents.

## 8. Independent review (R1-R10)

### 8.1 `AGENTS.md` (root)

Short, about 60 lines.

- **Purpose line**: Kept GTD, a Supernote plugin; the rules for every change are in
  `docs/dev/DEVELOPMENT-POLICY.md`; promises in `docs/dev/claims.md`.
- **`## Review guidelines`** (the heading Codex reads; R8):
  - P0 rules, each as *invariant - flag when - instead*. Examples:
    - "Data files are written only through `storage/dataFileWrite.ts` `writeDataFile`, span by
      span. Flag any other write to `project.txt` / `area.txt` / `Inbox.txt`, or a whole-file
      regeneration. Instead: `getSpan`/`setSpan` + `writeDataFile`."
    - deletes (confirmation → `ensureFileDeletePermission` → `deleteEmptyFolder`);
    - secrets (never in files, logs, debug bundle, profiles);
    - network only in `src/integrations/` and the update check;
    - file format (parser + serializer + round-trip test + older files read + Upgrade note);
    - settings kept on update (default, migration, classification in `domain/profiles.ts`).
  - P1 rules:
    - file-changing flow without a scenario test;
    - help or CHANGELOG not updated for a user-visible change;
    - new permission or data flow without PRIVACY.md / SECURITY.md;
    - a change that makes a claim in `docs/dev/claims.md` untrue;
    - a caught error neither logged nor marked `// silent: <reason>`.
  - **Don't flag**: what `npm run check` enforces (tsc, ESLint layer rules, code-health: file
    length, console/Alert, error text, comments with dates or history, date formatting);
    formatting and style; naming preferences; `docs/dev/history/` documents (historical by
    design).
  - **Context**: "The PR description names the design document and its requirement ids. Review
    against them: flag behavior the design doesn't describe, and design items the change
    claims but doesn't implement."
- **`CLAUDE.md`**: one line pointing to `AGENTS.md` for review rules. Neither duplicates the
  policy.

Rule wording is kept so each rule can be tested with the three-case test (R10). S8's prompt
includes a test PR on a throwaway branch with one deliberate P0 violation, a safe
counterexample and an unrelated change. That PR is closed, not merged.

### 8.2 `SECURITY.md` (root, R7)

Sections:

- **Supported versions**: the latest release; betas while they're current.
- **Reporting a vulnerability**:
  - privately via GitHub "Report a vulnerability" (private vulnerability reporting is on);
  - not in public issues;
  - what to include.
- **What happens next**: acknowledgment within a week (best effort, one-person project), fix
  in a patch release, credit if wanted.
- **What Kept touches**:
  - local files in the user's Supernote folders;
  - the plugin's private folder;
  - optional experimental Google Calendar (ICS link) and Gmail, off by default;
  - the update check and download from this repository's GitHub releases.
  Link to PRIVACY.md.
- Every statement here becomes a claim in `claims.md` (group "Privacy, network and accounts" or
  "Updates").

### 8.3 PR template (R9)

`.github/pull_request_template.md` keeps its contributor part and adds:

```md
## Design and scope
- Design: docs/dev/history/<technical-design-…>.md (requirement ids: …)
- Verified off-device:
- Still needs the device:

## Touches (reviewers look harder here)
- [ ] data files / file format   - [ ] deletes or moves   - [ ] secrets, logs, debug bundle
- [ ] network                    - [ ] settings / upgrade  - [ ] permissions
```

Cloud sessions fill it via `gh pr create --body-file`.

### 8.4 Answering the review (R3, R10)

**In the implementation prompt template** (project doc, used for every release from 0.26.0 on):

1. After `gh pr create`, wait for the Codex review: poll with `gh pr view <n> --json reviews`
   every 2 minutes, at most 15 minutes.
2. Read both kinds of comment:
   - review-level: `gh pr view <n> --comments`;
   - inline: `gh api repos/tilmanbergt/kept-gtd/pulls/<n>/comments`.
3. For each finding:
   - fix it in a commit, or not;
   - reply in its thread (`gh api …/pulls/<n>/comments/<id>/replies -f body=…`) starting with
     one tag, `[fixed]`, `[not applicable]` or `[noise]`, then the reason.
4. Re-run the tier for the moment; push.

**GITHUB-GUIDE**: a section "When Codex reviewed after the session ended". Reopen the cloud
session and say "Address the Codex review on PR #n". The prompt template's step applies.

**DEVELOPMENT-POLICY §8**: "- [ ] Codex review comments answered (fixed / not applicable /
noise) - §10".

**Tally (R10)**: `scripts/review-tally.mjs` (needs `gh`):

- counts the reply tags on PRs merged since a date or tag;
- prints per tag;
- lists the `[noise]` and `[not applicable]` findings with links.

The claims audit runs it to decide which rules to sharpen or drop.

### 8.5 Claims audit (R4-R6)

`docs/dev/claims-audit.md` (living, short) holds the prompt for a fresh session (Claude without
this project, or a Codex task):

- Input: the repository only.
- Task, per claim in `docs/dev/claims.md`:
  1. Is it true in the code today?
  2. Does the evidence prove it, or only touch it?
  3. Is the backing level right?
- Also: claims the README, listing, PRIVACY, SECURITY or help make that the register misses.
- Plus: run `scripts/review-tally.mjs` since the last audit; which guidelines produced noise,
  which bugs got through.
- Output: one report (true / doubtful / false per claim, missing claims, guideline changes),
  handed to Tilman. Findings go to the backlog. Only the "Last claims audit" line in
  `claims.md` changes in the repo.
- Cadence: before each InkHub (re)submission, every third minor release (release checklist,
  §7.5).

## 9. Test scenarios (Given/When/Then)

Scenario tests (fake device):

1. **A help page with a diagram shows the picture as its own block**
   - Given the help has page "Daily" with a diagram line under a heading;
   - When I open Help and the page;
   - Then the image shows below the heading with its alt text as label, and the text after it
     follows on the same page or the next.
2. **A tall diagram fits one page**
   - Given a diagram taller than the help column;
   - When I open its page;
   - Then the image is scaled to fit and the page's ‹ › paging still reaches the text after it.
3. **A heading link to a page with a diagram still lands on the heading**
   - Given a link to `daily.md#heading-after-the-diagram`;
   - When I tap it;
   - Then that heading is on screen.

Script tests (pure libs, `scripts/test-*.mjs`):

- `scenarioCatalog`: `help` read and rendered; broken page and broken anchor reported; a page-only
  reference accepted.
- `helpCoverage`: headings counted, excluded pages and headings skipped, a `##` reference
  doesn't cover its `###`, area totals.
- `appStrings`/`helpLabels`: literal and template matches; ` → ` split; `›` stripped; demo names
  in quotes; allowlist hit and stale allowlist entry.
- `diagrams`: hash input change marks stale; orphan PNG; unreferenced diagram; budget.
- `claims`: each failure in §7.2; counts per backing.

Unit tests: `markdownBlocks` (image line, image inside a paragraph stays text, bad path stays
text); `markdownBlockHeight` for images (capped and uncapped).

## 10. Files

**New**

- `AGENTS.md`, `SECURITY.md`;
- `docs/dev/claims.md`, `docs/dev/claims-audit.md`;
- `docs/user/diagrams/*`, `docs/user/images/diagrams/*`;
- `scripts/quality-report.mjs`, `scripts/diagrams.mjs`, `scripts/claims.mjs`,
  `scripts/review-tally.mjs`;
- `scripts/lib/{helpCoverage,appStrings,helpLabels,diagrams,claims}.mjs` with their
  `scripts/test-*.mjs`;
- `scripts/help-coverage.json`, `scripts/help-labels-allow.json`.

**Changed**

- `test-helpers/scenario/scenario.ts` (meta);
- `scripts/lib/scenarioCatalog.mjs`, `scripts/scenario-catalog.mjs`;
- `scripts/lib/testAreas.mjs` (column), `scripts/coverage-report.mjs`;
- `scripts/check.mjs` (diagrams and claims checks in quick; quality after coverage; the new
  script tests);
- `scripts/gen-bundled-content.mjs` (`helpImages.ts`);
- `src/domain/markdownBlocks.ts`, `src/ui/MarkdownBlocks.tsx`;
- `__tests__/docs/userDocs.test.ts`, `__tests__/userDocsExamples.test.ts`;
- all `__tests__/scenarios/**` (help refs);
- `.github/workflows/check.yml` (summary), `.github/pull_request_template.md`;
- `scripts/release.ps1` (append quality.md);
- `package.json`:
  - devDependencies `playwright`, `mermaid`;
  - scripts `quality`, `diagrams`, `claims`;
  - `test:scripts`;
- `scripts/test-areas.json` (new tests and sources into areas: scripts → `foundation`;
  `markdownBlocks`/`MarkdownBlocks` stay in `settings`, where help lives);
- docs:
  - `DEVELOPMENT-POLICY.md` (§6, §7 quality report, §8, §9);
  - `RELEASING.md`, `GITHUB-GUIDE.md`, `docs/dev/README.md` (living docs list, "Writing user
    docs", "Writing scenarios": the `help:` field, "Diagrams");
  - `CLAUDE.md`, `CHANGELOG.md`, help pages with diagrams.

## 11. Steps

Each step ends with `npm run check:affected` green (plus the areas named). It's its own commit
with a "Device test:" block.

| Step | Content | Device test |
|---|---|---|
| S1 | `help:` meta, catalog, validation (§3.1-3.2) + tests | none - scripts only |
| S2 | backfill `help:` on all scenarios (§3.4); catalog regenerated | none |
| S3 | `appStrings`, `helpLabels`, `helpCoverage`, `quality-report.mjs`, `npm run quality`, check.mjs/CI/release.ps1 wiring, matrix column | none |
| S4 | image block: parser, height, renderer, doc rules, `helpImages.ts` generation, scenarios 1-3; one simple test diagram on a help page | the test diagram: sharp, scaled to the column, paging and refresh fine; note the real column width if it differs from W |
| S5 | diagram pipeline: `diagrams.mjs` render + check, theme, CSS, manifest, budget; devDependencies | none |
| S6 | first diagrams (§6.7): sources drafted, **reviewed with Tilman as PNGs before they go into the help**, then inserted; label check covers them; the S4 test diagram is replaced | each diagram on the device: legible, fits |
| S7 | `claims.md` (first audit, §7.4), `claims.mjs`, report section; SECURITY.md | none |
| S8 | AGENTS.md, CLAUDE.md line, PR template, `review-tally.mjs`, `claims-audit.md`; policy, RELEASING, GITHUB-GUIDE, README updates; three-case test PR (closed) | none |
| S9 | checkpoint: full `npm run check` + `npm run coverage`; read `quality.md`; CHANGELOG; As built | release device checklist |
| after S9 | **first independent claims audit** in a fresh session (Tilman starts it); findings → backlog | - |

## 12. Open points

- **OP1** Diagram content (§6.7): agreed in S6 from drafts.
- **OP2** Excluded help pages (§3.3): the proposed list is confirmed in S3.
- **OP3** Codex's guideline heading: OpenAI's docs name `## Review guidelines`; a third-party
  article says `## Code Review Rules`. The three-case test in S8 shows which one Codex follows,
  and only that heading is kept (no duplicated rules).

## As built

Built in S1-S9 on `feature/promises-kept` as designed, with these differences:

- **S2 backfill.** All 201 scenarios have a `help:` reference; four are page-only (`settings.md`
  twice, `note-setups.md`, `files-and-folders.md`) where no heading describes the behavior. Five
  scenarios had double-quoted titles, which the catalog's reader skips, so they were missing from
  `docs/dev/test-scenarios.md`; they are single-quoted now and listed (196 → 201).
- **S3 inputs.** `scripts/lib/qualityInputs.mjs` reads the help pages, scenarios, app sources,
  demo files and diagram sources for both `quality-report.mjs` and `coverage-report.mjs`, so the
  Help ✓ column and the report count the same way. The Help ✓ All row is the total over distinct
  pages (`settings.md` belongs to two areas).
- **S3 matching.** Besides literals and template expressions, a JSX element whose text is mixed
  with `{…}` expressions is a pattern (`{n} mark{…} to process`), and a label also matches when it
  is a template's static text (**Save to** for `Save to ${name}`). The allowlist starts with the
  three buttons of the Supernote's permission dialog only; the other unmatched labels (Obsidian's,
  GitHub's, composed texts) stay listed.
- **S4.** The image cap is the measured column height minus the pager header line (33) and two
  block gaps. `userDocs.test.ts` now numbers lines including fenced code, so its messages give the
  file's line.
- **S5.** `playwright` is pinned to 1.63.0, the version whose Chromium is installed. A Mermaid
  diagram's SVG is scaled to the target width by its `width` attribute (vector scaling) rather than
  by `deviceScaleFactor`; the result is the same 960 px PNG. The renderer warns when a diagram is
  taller than 1 : 1.3. The README "Diagrams" section came with S5, with the pipeline.
- **S6.** The todo states diagram is Mermaid; the hierarchy, the notebook pages and the meeting
  flow are HTML. Mermaid ignored the left-to-right direction of linked subgraphs (the meeting flow
  came out 960 × 4751) and shrank the hierarchy's text below the help's body size. The four RGB
  PNGs took 403.6 KB, over the budget, so the renderer stores 8-bit greyscale
  (`scripts/lib/pngGray.mjs`, `RENDERER_VERSION` 2): 206 KB. The theme wraps Mermaid labels at
  320 px. The Review cycle (5) is not drawn. The S4 test diagram is gone; the S4 scenarios use the
  todo states diagram.
- **S7.** 65 claims: 10 enforced, 27 tested, 21 reviewed, 7 none. The check also verifies that a
  quoted checklist step (`DEVELOPMENT-POLICY §9 "PRIVACY.md still true"`) is in that section,
  ignoring bold and code marks.
- **S8.** `AGENTS.md` names the real section helpers (`readSectionLines` / `writeSectionLines`):
  `getSpan`/`setSpan`, which DEVELOPMENT-POLICY §3 and §8.1 above name, don't exist in the code.
  Scripts, `AGENTS.md`, `SECURITY.md` and the claims documents belong to the area `foundation`, the
  diagram sources and PNGs to `settings`. Cloud sessions can't use GitHub's GraphQL API, so
  `gh pr create` and `gh pr view` don't work there; they open and read pull requests with
  `gh api repos/tilmanbergt/kept-gtd/pulls…` (REST) instead.
- **OP3 (three-case test).** On a throwaway PR (`test/codex-guidelines` → `feature/promises-kept`,
  closed without merging) Codex reviewed within two minutes. It flagged the deliberate violation
  (a direct whole-file write of `project.txt`, bypassing `writeDataFile`) as P0 and cited
  `AGENTS.md` lines 15-19, the data-file rule; the same change through `writeDataFile` and an
  unrelated README line got no finding. So Codex reads `## Review guidelines`; the heading
  `## Code Review Rules` was not tried, and only `## Review guidelines` is kept.
