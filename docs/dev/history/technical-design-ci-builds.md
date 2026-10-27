# Technical design: test builds and betas on GitHub Actions

> Historical document: requirements, design and as built of the CI builds (2026-10-27). The
> current workflow is in `docs/dev/RELEASING.md` §4.

## 1. Requirements

Goal: test builds and betas come from GitHub, so Tilman no longer builds them on his computer. He
downloads the `.snplg` and installs it on the Supernote as before.

- **R1 Alpha build on every push.** Every push to any branch builds a `.snplg` once the checks of
  that push passed, labelled exactly like a local build (`0.22.0-alpha+a1b2c3d`), attached to the
  Actions run for 30 days.
- **R2 Beta pre-release by button.** Actions → beta → Run workflow builds a beta from `main` and
  publishes it as a GitHub pre-release: tag `v0.22.0-beta.1`, title "Kept GTD 0.22.0 beta 1",
  text = a note for testers + CHANGELOG `[Unreleased]`, asset = the `.snplg`.
- **R3 Releases unchanged.** `release.ps1` keeps building and publishing the final release locally.
  Pre-releases never become GitHub's "Latest".
- **R4 Same plugin, either source.** A CI build installs over a local build and vice versa (same
  committed `android/app/debug.keystore`, same pluginID).
- **R5 Local builds keep working** exactly as before, including `-Stage beta`.

Decisions (confirmed 2026-10-27):

- **D1** Alpha builds on all branches; a newer push cancels a running build of the same branch.
- **D2** Betas only from `main` and only with a `nextVersion` above the current version.
- **D3** The beta number is not in the app's label (`0.22.0-beta+a1b2c3d`); it is in the tag and
  release title only. How labels are made is unchanged.
- **D4** Beta pre-releases stay on the Releases page after the final release.

## 2. Design

### 2.1 Job "build" in `check.yml` (R1)

`needs: check`, only for `push` events, `windows-latest` (`buildPlugin.ps1` is PowerShell and
calls `gradlew.bat`; the image has the Android SDK). Checkout with `fetch-depth: 0` (the label
needs commit and tags), Node 22, Temurin JDK 17 with Gradle cache, `npm ci`,
`./buildPlugin.ps1` under Windows PowerShell 5.1, then `node scripts/ci-build.mjs verify`, then
`upload-artifact` of the labelled `.snplg` as `kept-gtd-<label>` (GitHub zips every artifact).
`concurrency: build-<ref>` with `cancel-in-progress`.

`buildPlugin.ps1` never exits with an error code and still packages when Gradle failed (without the
native modules). So `verify` decides: `build/build-info.json` present, the labelled `.snplg`
present, `build/generated/app.npk` present and referenced as `nativeCodePackage`. A `.dirty`
label is a warning for alpha builds.

### 2.2 Workflow `beta.yml` (R2)

`workflow_dispatch` only. Job `check` (Ubuntu): refuses any branch but `main`, then
`npm run check`. Job `beta` (Windows, `contents: write`): like 2.1, plus `ci-build.mjs next-beta`
(the number: one above the highest `v<target>-beta.N` tag, fails without a target),
`ci-build.mjs notes` (fails on an empty `[Unreleased]`), `buildPlugin.ps1 -Stage beta`,
`ci-build.mjs verify --beta` (additionally: stage beta towards a next version, not dirty, not a
release), then `gh release create <tag> <snplg> --prerelease --target <sha>`. The tag is created
by the release on the built commit. `concurrency: beta` keeps two runs from taking the same number.

### 2.3 Scripts

- `scripts/lib/ciBuild.mjs`: pure `nextBeta(target, tags)`, `checkBuild(...)`, `betaNotes(...)`.
- `scripts/ci-build.mjs`: the commands `next-beta`, `verify [--beta]`, `notes`; writes step outputs
  (`$GITHUB_OUTPUT`) and the job summary.
- `scripts/test-ci-build.mjs`: plain-node tests, part of `npm run test:scripts` and every check tier.
- Versioning (`scripts/lib/versioning.mjs`, `gen-bundled-content.mjs`) is unchanged: the release
  logic only ever looks for the exact tag `v<version>`, so beta tags don't disturb it.

### 2.4 Effects on the release

`release.ps1` requires the `check.yml` run of the release commit to be green; that run now includes
the build. A release therefore waits for the build too, and a failing CI build stops it.

### 2.5 Risks, checked on the first run

- The Windows build works at all (the NDK version of `android/build.gradle` may be installed on the
  first run - slow but automatic).
- The label is not `.dirty` on CI (line endings, generated files).
- R4: the first CI build installs over the current local build on the device.
- Build time about 10-15 minutes per push (free for public repositories).

## 3. Test plan

- `scripts/test-ci-build.mjs`: beta numbers (none, several, gaps, other versions, 10+, CRLF),
  missing target; `checkBuild` for a good build, each missing piece, dirty alpha vs beta, wrong
  stage, release commit; beta notes text and empty `[Unreleased]`.
- First push of branch `ci/build-on-github`: the run builds, the artifact installs over the local
  build, Settings → About shows the label.
- First beta: the button on `main` with `nextVersion` set gives pre-release beta 1 with text and
  `.snplg`; a second run gives beta 2.

## 4. As built

Built as designed, with one change against the first draft: the beta number and the build check
live in a new `scripts/lib/ciBuild.mjs` + `scripts/ci-build.mjs` instead of `versioning.mjs` /
`gen-bundled-content.mjs`, because the build check was added (2.1) and keeps CI-only code apart from
the local build. Device results of 2.5: open.
