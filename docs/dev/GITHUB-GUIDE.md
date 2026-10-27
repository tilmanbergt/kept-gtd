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

*(coming: workflow **next version**: Actions → next version → Run workflow, enter e.g. `0.23.0`.)*
Today, locally: `npm run next-version -- 0.23.0`, commit, push (`RELEASING.md` §4).

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

## What runs by itself

| When | Workflow | What it does |
|---|---|---|
| every push to a branch, every pull request | **check**, job `check` | all checks and tests with coverage; the coverage table by feature area in the summary |
| after that, on a push | **check**, job `build` | builds the `.snplg` (Windows), "what to test" in the summary, artifact for 30 days |
| a tag is pushed | nothing | the release commit was already checked when it reached `main` |

## Words

- **Artifact**: a file a run keeps (30 days for builds); always downloaded as a zip.
- **Pull request**: the proposal to merge a branch into `main`, with its review and checks.
- **Merge commit**: how a branch joins `main` here; keeps all its commits as they are.
- **Pre-release** (beta): a release on the Releases page that never becomes "Latest".
- **Draft**: a release only you can see, until you publish it.
- **Tag**: a fixed name for one commit, e.g. `v0.22.0` (release) or `v0.22.0-beta.1` (beta).
- **Label** of a build: the version the app shows, e.g. `0.22.0-alpha+a1b2c3d` (test build),
  `0.22.0-beta+…` (beta), `0.22.0` (release).
