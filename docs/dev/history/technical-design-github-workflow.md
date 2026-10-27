# Technical design: working from GitHub (branches, merges, versions, releases)

> Historical document: requirements, design and as built of the GitHub flows that replace most of
> the local setup (2026-10-27), after `technical-design-ci-builds.md` and
> `technical-design-build-test-notes.md`. The current flows are in `docs/dev/GITHUB-GUIDE.md` and
> `docs/dev/RELEASING.md`.

## 1. Requirements

**Goal:** the local development setup is only needed for the device and the rare hand-made
change. Cowork (local AI) prepares the work, a cloud session implements it, GitHub does the rest.

| Step | Where |
|---|---|
| Prepare (requirements, design, prompt) | Cowork |
| New branch, implement, open pull request | cloud session (or GitHub's branch menu) |
| Bring `main` into a branch | "Update branch" on the pull request, or the cloud session |
| Review | pull request "Files changed"; small edits in the browser editor (`.`) |
| Merge into `main` | "Merge pull request" (merge commit), branch deleted automatically |
| Set the next version | workflow **next version** |
| Test build, beta | existing workflows |
| Release | workflow **release** → draft → device check → "Publish release" |
| Undo a release that failed its device check | workflow **discard release** |
| Install on the Supernote, InkHub | unchanged (device) |

- **D1** `main` only changes through pull requests whose CI check is green. Only the workflows above
  may write to `main` directly (version and release commits).
- **D2** Pull requests merge with a merge commit only (no squash, no rebase), so every commit keeps
  its "Device test:" block.
- **D3** A release is built as a **draft**; Tilman installs it, does the device check
  (`RELEASING.md` §6) and publishes it by hand. A failed check is undone with "discard release".
- **D4** The next version is set by its own workflow and, optionally, by the release workflow right
  after the release.
- `release.ps1` stays as a fallback (it needs the protection switched off for its push).

## 2. Technical design

### 2.1 How workflows may write to a protected `main`

The workflow token (`GITHUB_TOKEN`) cannot be exempted from branch rules. The workflows therefore
push with a **deploy key** with write access, which a ruleset can exempt:

- one-time: `ssh-keygen -t ed25519 -N "" -f kept-gtd-release` → public key as deploy key "release
  workflows" with write access, private key as Actions secret `RELEASE_DEPLOY_KEY`, local files
  deleted;
- the writing workflows check out with `ssh-key: ${{ secrets.RELEASE_DEPLOY_KEY }}` and push over
  SSH; commits are authored as `github-actions[bot]`;
- pushes made with the deploy key start `check.yml` like any push (so the release commit gets its
  normal CI run); tags still start no run.

To verify in step S1: that the ruleset's bypass list offers "Deploy keys" in this personal
repository. Fallback: a small GitHub App as the bypass actor (`actions/create-github-app-token`).

### 2.2 Workflow `next-version.yml` (D4)

`workflow_dispatch`, input `version` (x.y.z). Checkout `main` with the deploy key, Node 22,
`node scripts/gen-bundled-content.mjs --set-next <version>` (refuses a version not above the current
one), commit `Set next version <version>` with `Device test: none - version only`, push.

### 2.3 Workflow `release.yml` (D3, D4)

`workflow_dispatch`, inputs: `bump` (choice: `next` = package.json's nextVersion, `patch`, `minor`,
`major`), `next_version` (optional x.y.z, the release after this one), `dry_run` (boolean).

1. **Job prepare** (Ubuntu, only on `main`): checkout with the deploy key, `npm ci`; compute the
   version like `release.ps1` (`--target-version` / `--next-version <bump>`; they must agree when
   both are set); tag must not exist; `--check-release`; `--set-version`, `--stamp-changelog`;
   `npm run coverage` (the full checks, as `release.ps1` runs them); commit `Release x.y.z`
   (`Device test: see the device check in RELEASING.md §6`), annotated tag `vx.y.z`; if
   `next_version`: `--set-next` and a second commit. Push `main` and the tag - skipped on a dry run.
2. **Job build** (Windows): checkout the tag (dry run: the prepared commit is handed over as a git
   bundle artifact), build with `buildPlugin.ps1`, `ci-build.mjs verify --release` (new: label equals
   the version, `release` true, not dirty), `test-notes.mjs` (base: the previous release),
   `gen-bundled-content.mjs --release-notes x.y.z`.
3. **Publish as draft**: `gh release create vx.y.z <snplg> <TESTING.md> --draft --title "Kept GTD
   x.y.z" --notes-file …`. Dry run: the `.snplg` and notes become a run artifact instead.

Tilman: download the draft's `.snplg` from the Releases page, device check, **Publish release**.

### 2.4 Workflow `discard-release.yml`

`workflow_dispatch`, input `version`. Refuses unless release `vx.y.z` exists **and is a draft**, and
`main` after the tag holds nothing but the workflow's own "Set next version" commit. Then: delete the
draft and the tag (`gh release delete --cleanup-tag`), `git revert` the "Set next version" and
"Release x.y.z" commits (protected `main` allows no force push; the revert restores version,
`[Unreleased]` and nextVersion), push with the deploy key. Commit `Discard release x.y.z`.

### 2.5 Script changes

- `scripts/lib/testNotes.mjs` `lastReleaseTag(tags, {except})`: the release being built is not its
  own base. `test-notes.mjs --release <version>` passes it.
- `scripts/lib/ciBuild.mjs` `checkBuild(..., {release})` + `ci-build.mjs verify --release`.
- `scripts/lib/ciBuild.mjs` `discardPlan(commits, version)`: which commits after the tag may be
  reverted (only the workflow's own), else the reason to refuse - pure and tested.
- Tests in `scripts/test-ci-build.mjs` and `scripts/test-test-notes.mjs`.

### 2.6 Repository settings (click list for Tilman, step S4)

- Settings → General → Pull Requests: only **Allow merge commits**; **Always suggest updating pull
  request branches**; **Automatically delete head branches**.
- Settings → Rules → Rulesets → New branch ruleset "main": enforcement active, target "Default
  branch"; rules: Restrict deletions, Block force pushes, Require a pull request before merging
  (0 approvals - solo project), Require status checks to pass: `check`; bypass list: the deploy key
  "release workflows" (always).
- No bypass for the owner: a direct fix to `main` also goes through a short pull request.

### 2.7 Docs and conventions

- **`docs/dev/GITHUB-GUIDE.md`** (written 2026-10-27, before S1): Tilman's quick guide - where
  things are on GitHub, "I want to ..." sections (start, test a push, review, update a branch, small
  browser edits, merge, beta, next version, release, discard, issues), what runs by itself, words.
  Planned flows are marked *(coming)*; **every step S1-S4 updates the guide** in the same change.
  Linked from the root README ("For developers"), `docs/dev/README.md` and `RELEASING.md`.
- Workflows started by hand get clear names and input descriptions (shown in the "Run workflow"
  form), and their run summary ends with a "Next:" line (e.g. "install the draft, then Publish").

- `RELEASING.md` §2 (branches and merging via pull requests), §5 (releases via the workflow, draft,
  discard; `release.ps1` as fallback), §7 (after a release: next version via workflow if not given),
  §8 (Claude's guides point to GitHub buttons first, local commands as fallback).
- `DEVELOPMENT-POLICY.md` §7/§8: CI on the pull request is the merge gate.
- Cloud implementation prompts: work on a branch, push, open a pull request with a summary when the
  steps are done; never push to `main`.
- Design → `docs/dev/history/technical-design-github-workflow.md`.

## 3. Steps

- **S1** Deploy key + secret (Tilman, click list); `next-version.yml`; try it once (e.g. set 0.22.0).
- **S2** Script changes (2.5) + `release.yml` with `dry_run`; one dry run.
- **S3** `discard-release.yml`; the next real release goes through the workflow (draft, publish).
- **S4** Repository settings (2.6); first pull request merged via GitHub; docs (2.7).

## 4. Open points

- S1 verifies that deploy keys can be bypass actors here (fallback GitHub App, 2.1).
- While a cloud session works on an old branch, its prompt predates the pull-request rule - tell it
  once (as with the Device test convention).

## 5. As built

- **S1 (2026-10-27):** `.github/workflows/next-version.yml` as in 2.2: on `main` only, refuses a
  missing secret `RELEASE_DEPLOY_KEY` with a pointer to the setup, strips spaces and a leading `v`
  from the input, refuses a version not above the current one (`--set-next`) or equal to the current
  `nextVersion`, commits as `github-actions[bot]` and pushes with the deploy key; the run summary ends
  with a "Next:" line. No `npm ci` needed (`gen-bundled-content.mjs` uses only Node built-ins).
  Concurrency group `write-main`, shared with the later writing workflows. The deploy-key setup is
  in `GITHUB-GUIDE.md` "One-time setup". Bypass check for deploy keys in rulesets: open.
