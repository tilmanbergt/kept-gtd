# Git, build and release workflow

> **About this document.** The current git, build and release workflow, step by step, plus the
> guide Claude gives after every change (§8). Present tense, no history. Update it in the same
> change that alters a script, a branch rule or a release step.

How code gets from an idea to a release: branches, commits, builds, releases and what comes
after. Rules for *what* a change must contain are in `DEVELOPMENT-POLICY.md`; this document is
about *how* it moves. Design of the release scripts: `technical-design-versioning-release.md`.

All commands are PowerShell, run in the repository root.

## 1. One-time setup

```powershell
winget install GitHub.cli        # then open a new PowerShell window
gh auth login                    # GitHub.com, HTTPS, log in with the browser
git config user.email "50413979+tilmanbergt@users.noreply.github.com"   # repo-local, public address
git config user.name "Tilman Bergt"
```

Commits must only ever carry the noreply address - the repository is public.

## 2. Branches

- **`main` is always releasable.** Everything on `main` builds, passes the checks and has been
  tried on the device (or is behind an Experimental switch). Releases are only made from `main`
  (`release.ps1` refuses anything else).
- **Small changes** - a bug fix, a doc correction, a one-session change - are committed directly
  on `main`.
- **Features and anything risky or spanning several sessions** get a branch:
  `feature/<short-name>` (or `fix/<issue-number>-<short-name>` for a larger bug fix).
  Unfinished work never lands on `main`, so a hotfix can always be released from `main`.
- No long-lived branches besides `main`. Merge or delete a branch within days, not months.

Start a branch:

```powershell
git switch main
git pull
git switch -c feature/<short-name>
```

Finish it (after the Definition of Done in `DEVELOPMENT-POLICY.md` §8 is met). The merge runs no
tests locally: CI runs everything with coverage on the `main` push. If CI turns red, fix it on
`main` before anything else - a red `main` can't be released (§5).

```powershell
git switch main
git pull
git merge --no-ff feature/<short-name> -m "Merge feature/<short-name>: <what it adds>"
git push                                     # CI on main runs every check and test: that is the gate
git branch -d feature/<short-name>
git push origin --delete feature/<short-name> # only if the branch was pushed
```

## 3. Commits

- **One logical change per commit**: code, its tests, its help page change and its CHANGELOG
  line together. Don't mix unrelated changes.
- **Message**: short imperative subject (max ~70 characters), e.g.
  `Fix clipped badge row on Daily`, then an empty line and details if useful. Reference issues
  with `Fixes #12` - GitHub closes the issue when it reaches `main`.
- **"Device test:" block** at the end of the message, for every commit with an effect on the
  device: from the line `Device test:` to the end, as many lines as needed - numbered steps,
  expected results after `→`, setup if needed. Nothing to test: `Device test: none - <reason>`.
  The CI build collects these blocks into its `TESTING.md` (§4); a commit without one is flagged
  there.

  ```
  Show day panel when tapping a Week meeting chip

  The chip now opens the same panel as the day header.

  Device test:
  1. Open Week, tap a meeting chip on a day with 3+ meetings.
     → Day panel opens on that day, the tapped meeting is marked.
  2. Regression: long-press on a chip does nothing anymore.
  ```

  A message with a body is easiest to commit from a file: `git commit -F msg.txt`.
- **Never commit**: `build/`, `src/generated/`, `*.snplg`, `node_modules/`, logs, debug bundles,
  personal data or secrets. `.gitignore` covers the usual ones - still look at
  `git status --short` before every commit.
- **Push `main` regularly** (it's also the backup). Feature branches may be pushed for backup too.

```powershell
git status --short          # look: only what belongs to this change?
git add -A
git commit -m "<subject>"
git push
```

## 4. Checks and test builds (every day)

```powershell
npm run check:quick            # tsc, lint, script tests, catalog, code health - no Jest (about 20 s)
npm run check:smoke            # quick + the smoke scenarios, one per main flow
npm run check:affected         # quick + the tests related to what changed against origin/main + smoke
npm run check -- --area planning   # quick + every test of a feature area (scripts/test-areas.json)
npm run check                  # everything - at the end of a feature's steps
npm run coverage               # everything with coverage: coverage/areas.md and the ratchet
./buildPlugin.ps1              # test build, labelled for the release being worked on
./buildPlugin.ps1 -Stage beta  # same, once that release is feature-complete (final device test)
./buildPlugin.ps1 -Check       # runs the smoke tier first and stops if it fails
```

- **The release being worked on** is `nextVersion` in `package.json`. Set it when work on the next
  release starts (after the previous release is published):
  `npm run next-version -- 0.10.0`.
- **Labels** say which release a build belongs to: `0.9.0-alpha+a1b2c3d` while the release is
  being built (spikes included), `0.9.0-beta+a1b2c3d` for the final device test, `0.9.0` for the
  release itself. `.dirty` at the end means the build contains uncommitted changes. Without a
  `nextVersion` above the current version a build is labelled `0.8.0+dev.a1b2c3d` and the build
  prints a reminder.
- The build stamps version, stage and changelog into the app, bundles, compiles the native modules
  and writes `build\outputs\kept-gtd.snplg` plus a copy named after the label, e.g.
  `kept-gtd-0.9.0-alpha+a1b2c3d.snplg`. The Supernote's plugin list shows `0.9.0-alpha`.
- **Commit before building** a build you will test seriously: then the label names the exact
  commit.
- Install the `.snplg` on the Supernote **over** the existing plugin. If the "old version still
  loaded" message appears, tap **Restart**.
- After changing `CHANGELOG.md` or `docs/user/` without building, `npm run gen` refreshes
  `src/generated/` for tests and type checks.

### Test builds from GitHub

Every push to any branch builds the plugin on GitHub too, once the checks of that push passed
(job "build" in `.github/workflows/check.yml`, about 15 minutes after the push). The `.snplg` is
labelled like a local build (`0.9.0-alpha+a1b2c3d`) and kept for 30 days:

1. GitHub → **Actions** → the run of the push (branch and commit message are shown).
2. The run's summary page shows **what to test** (see below).
3. At the bottom under **Artifacts**: `kept-gtd-<label>` - download, unzip. It holds the `.snplg`
   and the same notes as `TESTING.md`.
4. Install the `.snplg` over the existing plugin, as above.

`TESTING.md` (`scripts/test-notes.mjs`) compares a feature branch with `main` (the merge base) and
`main` with the last release, and lists: the "Device test:" blocks of the commits, newest first,
those of the newest push marked **NEW** and commits without a block flagged; the feature areas the
changed files belong to (`scripts/test-areas.json`); the new lines of CHANGELOG `[Unreleased]`; and
the scenarios added, changed or removed in `docs/dev/test-scenarios.md` - what is already tested
off-device. `npm run test-notes` writes the same to `build/TESTING.md` for a local build.

A newer push to the same branch cancels a build that is still running. GitHub and local builds
replace each other on the device (same plugin, same signing key). A local build is only needed
for something not pushed yet. `release.ps1` waits for the whole run, the build included: a
failing build stops a release like a failing check.

### Betas

A beta is a test version of the release being worked on (`nextVersion`) that anyone can install.
Make one when that release is feature-complete on `main`, before the release itself:

1. `CHANGELOG.md` `[Unreleased]` reads well for testers (it becomes the beta's text) and is pushed.
2. GitHub → **Actions** → **beta** → **Run workflow**, branch `main` → **Run workflow**
   (works from the phone too).
3. About 20 minutes later the Releases page has the **pre-release** "Kept GTD 0.9.0 beta 1" (tag
   `v0.9.0-beta.1`) with the `.snplg`, labelled `0.9.0-beta+a1b2c3d`, and `TESTING.md` since the
   last release; its text names the feature areas to look at. The next run makes beta 2.

The workflow refuses to run on another branch, without a `nextVersion` above the current version,
with an empty `[Unreleased]`, or when the build has uncommitted changes. Pre-releases never become
the "Latest" release, so users who don't look for them don't see them. They stay on the Releases
page after the release; delete one there (and its tag) if it was a mistake.

## 5. Releases

### When

- **Patch** (`0.1.0 → 0.1.1`): only fixes. Release soon after a fix users are waiting for.
- **Minor** (`0.1.x → 0.2.0`): new features or changed behavior. Release when a set of features
  is done and tested - no fixed schedule.
- Not every merge needs a release. Releases are moments when the Unreleased section of the
  CHANGELOG tells a coherent story.

### Steps

1. **Prepare** - on `main`, clean tree, everything pushed, CI green for that commit:
   ```powershell
   git switch main
   git pull
   git status --short           # must be empty
   npm run check:quick
   ```
   CI on `main` (GitHub → Actions) must be green for the latest commit: it ran every check and test
   with coverage. `release.ps1` looks this up with `gh` and stops when it isn't green; without `gh`
   it says so and asks.
2. **Check** the release checklist in `DEVELOPMENT-POLICY.md` §9 (CHANGELOG read as a user, help
   pages, README, PRIVACY, Experimental, logging).
3. **Dry run** - shows the new version and what would happen, changes nothing; it checks CI on `main`
   and runs the quick tier only:
   ```powershell
   ./scripts/release.ps1 -DryRun                 # releases nextVersion from package.json
   ./scripts/release.ps1 -Bump patch -DryRun     # a hotfix without a nextVersion
   ```
4. **Release**:
   ```powershell
   ./scripts/release.ps1                         # or -Bump patch for a hotfix
   ```
   `-Bump` must agree with `nextVersion` when one is set; `-Version x.y.z` overrides both.
   The script checks that CI is green on `main` for this commit, sets the version in `package.json`,
   `package-lock.json` and `PluginConfig.json`, turns `[Unreleased]` into `[x.y.z] - date` in the
   CHANGELOG, then runs every check and every test once, with coverage (`npm run coverage`), on
   exactly what it is about to commit. If anything is red it **stops** and prints how to undo the
   version changes - there is no way to publish past a red run. It copies the coverage table to
   `docs/dev/history/test-coverage-x.y.z.md`, commits `Release x.y.z`, tags `vx.y.z` and builds
   `build\outputs\kept-gtd-x.y.z.snplg`. Then it **pauses**. The tag starts no CI run; the
   release commit is checked by CI when it is pushed to `main`.
5. **Device check** while the script waits (§6 below), then answer `y` to publish. The script
   pushes `main` with the tag and creates the GitHub release with the `.snplg` and the
   changelog section as text.
   - Answer `N` if anything is wrong: the commit and tag exist only locally, and the script
     prints the two commands to undo them. Fix, commit, start again at step 1.
6. **After publishing** (§7).

### Hotfix

Because `main` holds no unfinished work (§2), a hotfix is just a fix on `main` (with its
CHANGELOG line under Fixed) followed by `./scripts/release.ps1 -Bump patch`.

## 6. Device check before publishing

- [ ] Install `build\outputs\kept-gtd-x.y.z.snplg` **over the previous release** (not a clean
      install).
- [ ] Settings → About shows `x.y.z` (no `+dev`); "What's new" shows the new notes.
- [ ] Settings are still there; Projects and Areas load.
- [ ] Daily, Week, Month and a project's Current tab open and look right.
- [ ] Quick Add: add a todo, edit it, delete it.
- [ ] Review hub opens; Help (**?**) opens on the right page.
- [ ] What this release changed works (the CHANGELOG is the checklist).

## 7. After a release

- Check the release page on GitHub: text and `.snplg` attached.
- If it matters to users: update the InkHub listing with the same `.snplg`, post in the Reddit
  thread (one announcement per minor release; patch releases only if users waited for the fix).
  InkHub runs on the Supernote: copy the `.snplg` (and new screenshots, if screens changed) to
  `EXPORT/kept-gtd/inkhub/`, then InkHub → Upload Item with the values in
  `docs/dev/inkhub-listing.md`. If permissions changed, update the description's permission
  paragraph and `docs/inkhub-review.md` first.
- The next work starts with an empty `## [Unreleased]` section - the script leaves it ready.
  Set the next release with `npm run next-version -- x.y.z` so test builds carry its name.
- Triage new issues: `needs-info` (version or log missing), `confirmed` (reproduced, ideally in
  the demo space), `experimental` (Google Calendar / Gmail). Fixes reference the issue
  (`Fixes #12`).

## 8. Step-by-step guides from Claude

Most changes are made by Claude, but git, builds, installs and releases run on Tilman's computer
and device. So **at the end of every change Claude gives a short, numbered, copy-paste-ready
guide** for what to do next to keep the code base consistent. It covers, as far as relevant:

1. **Where we are**: which branch, what changed, what was verified off-device and what still
   needs the device.
2. **Commit**: `git status --short` to look at, then `git add` / `git commit` with a ready
   message (and on which branch). The message ends with its "Device test:" block (§3); a message
   with a body comes as a file for `git commit -F`.
3. **Build and test**: whether a build is needed now, the command, what exactly to check on the
   device.
4. **Push / merge**: whether to push, whether the feature branch is ready to merge (with the
   commands from §2), or what is still missing.
5. **Release**: whether a release is advisable now (patch or minor) or should wait - and when it
   is due, the full sequence from §5 with the actual version number.

The guide is short and specific to the situation - never a copy of this whole document. If
something on Tilman's side could break integrity (uncommitted work on the wrong branch, a dirty
release build, an un-pushed `main`), the guide says so first.
