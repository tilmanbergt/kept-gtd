# Technical design: test notes with every build

> Historical document: requirements, design and as built of `TESTING.md` for CI builds and betas
> (2026-10-27), a follow-up to `technical-design-ci-builds.md`. The current workflow is in
> `docs/dev/RELEASING.md` §3 and §4.

## 1. Requirements

**Goal:** every build says what it contains and how to test it on the device, so Tilman doesn't
depend on chat guides. He sees it where he downloads the build.

- **R1 Where:** the job summary of the build run, and `TESTING.md` inside the artifact zip, next to
  the `.snplg`. A beta gets the same file as a second release asset, and a short "Please look at"
  line in its release text.
- **R2 What, generated automatically:**
  1. **Changes:** the commit subjects since the base, newest first.
  2. **Feature areas touched:** changed files mapped to areas via `scripts/test-areas.json`.
  3. **Covered off-device:** scenarios added, changed or removed in `docs/dev/test-scenarios.md`,
     as their Given/When/Then text.
  4. **User-visible:** lines added to CHANGELOG `[Unreleased]`.
- **R3 What, written by hand:** a **"Device test:" block** at the end of the commit message body.
  It can have several lines, numbered steps and expected results (→). It runs from the line
  `Device test:` to the end of the message. `Device test: none - <reason>` marks commits with
  nothing to test.
- **R4 Base** (what a build is compared against):
  - feature branch: the merge base with `main`, i.e. everything the branch brings; commits of
    the newest push are marked **new**;
  - `main`: the last release tag (`vX.Y.Z`, never a beta tag).
- **R5 Never blocks a build.** If the notes can't be made, the build still succeeds and the notes
  say why.
- **R6 Rule:** the Definition of Done says that every commit with an effect on the device carries a
  "Device test:" block (or `none - <reason>`).

## 2. Example `TESTING.md`

```markdown
# Kept GTD 0.22.0-alpha+a1b2c3d - what to test

Branch feature/time-and-place · compared with main (merge base 9f8e7d6) · 4 commits, 2 new in this push

## Device tests  (newest first)

### NEW · a1b2c3d Show day panel when tapping a Week meeting chip
1. Open Week, tap a meeting chip on a day with 3+ meetings.
   → Day panel opens on that day, the tapped meeting is marked.
2. Regression: long-press on a chip does nothing anymore.

### NEW · b2c3d4e Fix paging on Week with long titles
none - covered by scenario "Week pages long titles"

### c3d4e5f Add place to meetings
...

### d4e5f6a Rename helper   ⚠ no Device test block

## Feature areas touched
Planning (12 files), Meetings (3 files) - recheck these on the device.

## User-visible changes (CHANGELOG [Unreleased], new lines)
- New: ...

## Covered by scenario tests (off-device)
Added: "Week day panel opens on chip tap" (Planning) - Given ... When ... Then ...
Changed: ...
```

## 3. Technical design

### 3.1 Pure logic: `scripts/lib/testNotes.mjs`

- `parseCommitMessage(message)` → `{subject, deviceTest: string | null, none: boolean}`. The block
  starts at the first line matching `^Device test:` (case-insensitive) and runs to the end; text on
  that same line counts (`Device test: none - docs only`). CRLF-safe.
- `areasTouched(files, areas)` → `[{id, name, count}]` via `areaOf` from `testAreas.mjs`. Files
  outside every area are listed as "other" (scripts, docs, android).
- `parseScenarios(markdown)` → map `title → {area, text}` from the `## Area` / `### title` blocks of
  `test-scenarios.md`; `diffScenarios(before, after)` → `{added, changed, removed}`.
- `changelogAdded(beforeText, afterText)` → lines of `[Unreleased]` that are new (uses
  `parseChangelog` from `versioning.mjs`).
- `renderTestNotes({label, branch, baseDesc, commits, newShas, areas, scenarios, changelog})` →
  the Markdown of §2. A commit without a block gets "⚠ no Device test block".
- `lastReleaseTag(tags)` → the highest `vX.Y.Z` (semver only, so beta tags never count).

### 3.2 CLI: `scripts/test-notes.mjs`

`node scripts/test-notes.mjs --out build/TESTING.md [--branch <name>] [--before <sha>] [--label <label>]`

- Base: branch `main` → `lastReleaseTag(git tag --merged HEAD)`. Any other branch →
  `git merge-base origin/main HEAD` (falls back to `main`). If there is no base, the notes cover
  the last 20 commits and say so.
- Commits: `git log --no-merges --format=%H%x1f%B%x1e <base>..HEAD`. "New in this push" =
  `git rev-list <before>..HEAD` when `--before` is a real commit; GitHub's all-zero `before` of a new
  branch means all are new.
- Files: `git diff --name-only <base> HEAD`. Old versions: `git show <base>:docs/dev/test-scenarios.md`
  and `git show <base>:CHANGELOG.md` (missing → empty).
- Label: `--label`, else `build/build-info.json`, else "unbuilt".
- In Actions it also appends the file to `$GITHUB_STEP_SUMMARY`. Any error is caught: a minimal
  `TESTING.md` with the error is written and the exit code is 0 (R5).
- `npm run test-notes` runs it locally (no `--before`), e.g. before a local test build.

### 3.3 Workflows

- `check.yml` job `build`, after "Check the build":
  `node scripts/test-notes.mjs --out build/outputs/TESTING.md --branch ${{ github.ref_name }} --before ${{ github.event.before }}`;
  upload-artifact gets both paths (`.snplg` + `TESTING.md`). Checkout already has `fetch-depth: 0`,
  so `origin/main` and the tags are there.
- `beta.yml`: the same step (branch `main`, base = last release), `TESTING.md` attached to
  `gh release create` as a second asset. `ci-build.mjs notes` adds one line after the tester note:
  "Please look at: <touched area names>".

### 3.4 Rules and docs

- `DEVELOPMENT-POLICY.md` §8 Definition of Done: the "Device test:" block (R6), with the format.
  §10 / `RELEASING.md` §8: Claude gives the commit message as a file plus `git commit -F <file>`
  when it has a body, and every cloud implementation prompt names the convention.
- `RELEASING.md` §3 Commits: the message format (subject, blank line, body, "Device test:" block),
  with the example; §4 "Test builds from GitHub": `TESTING.md` in the zip and in the run summary.
- Design → `docs/dev/history/technical-design-build-test-notes.md`.

### 3.5 Tests (`scripts/test-test-notes.mjs`, added to the script tests)

- Commit parsing: no block, multi-line block, `none - reason` on the same line, lower case, CRLF,
  "Device test:" mid-sentence not counted.
- Scenario diff: added, changed (same title, other text), removed, renamed (= removed + added).
- Changelog: new lines only, empty base.
- Release tag: semver tags only, beta tags ignored, none.
- Render: marks new commits, warns on missing blocks, empty sections are left out.

### 3.6 Open points / limits

- Commits made before the convention show "⚠ no Device test block" until the next release.
- Squash merges would lose the per-commit blocks; we merge with `--no-ff`, which keeps them.
- Area mapping covers `src/` and `__tests__/`; changes elsewhere show as "other".

## 4. As built

Built as designed, with these details:

- Help pages (`docs/user/<page>.md`) count for the area that names them, like its source and test
  files.
- In `beta.yml` the notes are made after the build (they carry the build label); the step output
  `areas` separates names with "; " because area names can contain commas.
- A local run without `--out` writes `build/TESTING.md`.
- Tried end to end on a scratch repository: feature branch against its merge base with NEW marks
  for the newest push, `main` against the last release tag with beta tags ignored, scenario and
  changelog differences. The first CI run with a "Device test:" block: open.
