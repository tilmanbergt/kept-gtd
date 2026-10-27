# Working on GitHub - which flow when

> **About this document.** Tilman's quick guide to the GitHub side of Kept GTD: which button or
> workflow to use for which situation, and what it does. Present tense; flows that are planned but
> not built yet are marked *(coming)*. Update it in the same change that adds or changes a flow.
> The detailed steps behind each flow are in `RELEASING.md`.

**The idea:** Cowork (local AI) prepares the work, a cloud session implements it, GitHub builds,
merges and releases. The local setup is needed for the Supernote and for the rare hand-made change.

## Where things are

| Tab on GitHub | What you find there |
|---|---|
| **Code** | the files; the branch menu (top left) to switch or create a branch; `.` opens the browser editor |
| **Pull requests** | one per branch that should go into `main`: its commits, its changes ("Files changed"), its CI result and the merge button |
| **Actions** | every run of every workflow; the workflows you start by hand are listed on the left |
| **Releases** (right column on Code) | releases, betas (pre-releases) and drafts, each with its `.snplg` |
| **Issues** | bug reports and feature requests |

## I want to ...

### ... start a new feature or fix

1. Prepare in Cowork: requirements, design, implementation prompt (in the claude.ai project).
2. Start a cloud session with the prompt. It creates its own branch (`feature/<name>` or
   `fix/<issue>-<name>`) and pushes to it.
3. Without a cloud session: **Code** → branch menu → type the name → "Create branch … from main".

### ... see what the newest push of a branch contains and test it

Every push is checked and built automatically (workflow **check**, about 15-20 minutes).

1. **Actions** → the run with the branch name and commit message.
2. The run's summary page shows **"… - what to test"**: the commits with their Device test steps
   (the newest push marked NEW, commits without steps flagged ⚠), the feature areas touched, the new
   CHANGELOG lines and the scenarios that are already tested automatically.
3. Bottom of the page, **Artifacts**: `kept-gtd-<label>` - download, unzip, install the `.snplg`
   on the Supernote over the current plugin. The zip also holds `TESTING.md` (the same notes).

A red run: open it, the red step shows the error. Send it to the cloud session or to Cowork.
"Re-run failed jobs" (top right) repeats a run that failed for a passing reason (e.g. a download).

### ... look at the changes of a branch

Open (or create) its **pull request**: GitHub offers "Compare & pull request" after a push, or
**Pull requests** → New → base `main`, compare `<branch>`. Then:

- **Files changed**: every changed line; comment on a line to note something for the cloud session.
- **Commits**: each commit with its message and Device test block.
- **Checks**: the CI result for the newest push.

### ... bring the newest `main` into a branch

On the branch's pull request: **Update branch** (merges `main` into it). Or tell the cloud session:
"merge origin/main into this branch, run the checks, push". Not both at the same time - while a
cloud session is working, let it do it.

### ... make a small change myself without the local setup

Open the repository, switch to the branch, press **`.`** - the browser editor opens. Edit, then
"Commit & Push" in its source-control panel, onto the branch (never onto `main`). CI checks and
builds it like any push.

### ... merge a finished branch into `main`

When the device tests from "what to test" passed and the pull request shows a green check:

1. Pull request → **Merge pull request** → choose **Create a merge commit** (not squash, not
   rebase - they would lose the Device test steps of the single commits) → Confirm.
2. **Delete branch**.
3. The push to `main` is checked and built again; that run is the gate for a release.

### ... let others test the next release (beta)

When the release is complete on `main` and the version being worked on (`nextVersion`) is set:

**Actions** → **beta** → **Run workflow** (branch `main`) → Run workflow. About 20 minutes later
**Releases** has the pre-release "Kept GTD x.y.z beta N" with the `.snplg`, `TESTING.md` and a
"Please look at" line. Share its link. Each further run makes the next beta number.
Details: `RELEASING.md` §4 "Betas".

### ... set the version being worked on

When work on the next release starts (usually right after a release):
**Actions** → **next version** → **Run workflow** (branch `main`), enter e.g. `0.23.0` → Run
workflow. Within a minute `main` has the commit "Set next version 0.23.0"; from then on test builds
are labelled `0.23.0-alpha+…` and the beta workflow makes betas of 0.23.0. It refuses a version that
is not above the current one. Locally the same is `npm run next-version -- 0.23.0` (`RELEASING.md` §4).

A cloud session working on a branch picks up the new `nextVersion` the next time it merges `main`.

### ... release

*(coming: workflow **release**: Actions → release → Run workflow (patch/minor or the version being
worked on, optionally the next version) → a **draft** release appears → install its `.snplg`, device
check (`RELEASING.md` §6) → **Publish release**. A dry run does everything but publish.)*
Today, locally: `./scripts/release.ps1` (`RELEASING.md` §5).

### ... undo a release that failed its device check

*(coming: workflow **discard release**: deletes the draft and its tag and reverts the version
commit.)* Today: answer `N` in `release.ps1` and run the two undo commands it prints.

### ... handle a bug report

**Issues** → the report → label `needs-info`, `confirmed` or `experimental` (`RELEASING.md` §7).
The fix's commit or pull request says `Fixes #<number>`; GitHub closes the issue when it reaches
`main`.

## One-time setup

The workflows that write to `main` (next version; *coming:* release, discard release) push with a
**deploy key**, an SSH key that belongs only to this repository. GitHub's own workflow token may not
write to a protected `main`; the deploy key can be made an exception. Set it up once:

1. In PowerShell, make the key (press Enter twice when asked for a passphrase - it must be empty):
   ```powershell
   ssh-keygen -t ed25519 -C "kept-gtd release workflows" -f "$env:TEMP\kept-gtd-release"
   ```
2. Public key to the clipboard: `Get-Content "$env:TEMP\kept-gtd-release.pub" | Set-Clipboard`.
   GitHub → repository **Settings** → **Deploy keys** → **Add deploy key**: title
   `release workflows`, paste, tick **Allow write access** → Add key.
3. Private key to the clipboard: `Get-Content "$env:TEMP\kept-gtd-release" -Raw | Set-Clipboard`.
   **Settings** → **Secrets and variables** → **Actions** → **New repository secret**: name
   `RELEASE_DEPLOY_KEY`, paste (including the BEGIN and END lines) → Add secret.
4. Delete both files: `Remove-Item "$env:TEMP\kept-gtd-release*"`. GitHub keeps the only copy;
   if it is ever lost, make a new pair and replace both.

## What runs by itself

| When | Workflow | What it does |
|---|---|---|
| every push to a branch, every pull request | **check**, job `check` | all checks and tests with coverage; the coverage table by feature area in the summary |
| after that, on a push | **check**, job `build` | builds the `.snplg` (Windows), "what to test" in the summary, artifact for 30 days |
| a tag is pushed | nothing | the release commit was already checked when it reached `main` |
| a workflow pushes to `main` (e.g. next version) | **check** | like any push: checks and a test build |

## Words

- **Artifact**: a file a run keeps (30 days for builds); always downloaded as a zip.
- **Pull request**: the proposal to merge a branch into `main`, with its review and checks.
- **Merge commit**: how a branch joins `main` here; keeps all its commits as they are.
- **Pre-release** (beta): a release on the Releases page that never becomes "Latest".
- **Draft**: a release only you can see, until you publish it.
- **Deploy key**: an SSH key with access to this one repository; the writing workflows use it.
- **Tag**: a fixed name for one commit, e.g. `v0.22.0` (release) or `v0.22.0-beta.1` (beta).
- **Label** of a build: the version the app shows, e.g. `0.22.0-alpha+a1b2c3d` (test build),
  `0.22.0-beta+…` (beta), `0.22.0` (release).
