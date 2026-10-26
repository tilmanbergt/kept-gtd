# Technical design: test tiers, smoke scenarios and a coverage overview

Status: **approved** (Tilman, 2026-10-26). Branch `feature/test-tiers`, started from `main` after the 0.21.1 release;
steps T1-T5. No release of its own: it is merged into `main` and ships with whatever release comes next (§9 O2).
Analysis: claude.ai project doc `claude/test-strategy-analysis.md` (measured on `feature/meetings-moment` @ 9747eed, before
0.21.1; T1 re-measures on `main`).
This document is the source for the implementation. Where the code shows the design is wrong or incomplete,
update this document in the same commit and note it under "As built".

## 1. Requirements (as decided in conversation, 2026-10-26)

- **R1 Every test before every release.** All checks and all tests run green on the exact commit that is
  published (`release.ps1`, after the version is stamped), and on every push in CI. There is no way to
  publish past a red run.
- **R2 Not several times for one build.** Merging, preparing a release, the dry run and test builds no longer
  each run the full suite. Each moment runs the smallest tier that covers it (§3.3).
- **R3 Tiers.**
  - **quick**: static checks.
  - **smoke**: quick + one fast scenario per main flow.
  - **area**: quick + every test of chosen feature areas.
  - **affected**: quick + tests related to the changed files + smoke.
  - **full**: everything.
- **R4 Smoke covers the planning pages' good cases.** On Daily, Week and Month the expected todos, focus
  projects/areas with their goals, and meetings show (and the ones that must not show, don't). Agreements are
  checked where the app shows them (O1). Smoke runs in about a minute or less.
- **R5 Feature areas.** Tests and source files belong to feature areas that follow the help pages. Areas are
  defined once and drive `--area`, the coverage overview and a check that nothing is unassigned.
- **R6 High-level coverage view.** A table per area: unit / UI / scenario test counts, line and branch
  coverage, number of catalogued scenarios. It is shown in CI on every push and kept per release, with a
  ratchet so an area's coverage can't silently drop.
- **Not in this change:** speeding up the four slowest suites, new scenarios beyond the smoke set, and
  coverage for the experimental integrations. These go to the backlog (§10).

## 2. Current state

- `scripts/check.mjs` runs in order:
  - gen;
  - tsc;
  - ESLint;
  - Jest (projects `unit` and `scenarios`, `jest.config.js`);
  - 4 script tests;
  - the scenario-catalog check;
  - code-health.

  `--quick` skips Jest. Measured (2-core container): tsc 19 s, ESLint 19 s, Jest 162 s (unit project 27 s,
  scenarios 87 s), the rest < 1 s; with coverage Jest takes 246 s.
- Full runs per release: `npm test` after the merge (RELEASING §2); CI on `main`; "Prepare" `npm run check`;
  `release.ps1 -DryRun` (its step 3 has no DryRun guard); `release.ps1`; CI on the release commit and again on
  the tag (`on: push` fires for tags). `buildPlugin.ps1 -Check` runs the full check too.
- `release.ps1` step 3 asks "Checks failed. Continue anyway?" and can publish past a red run.
- `scripts/scenario-catalog.mjs` reads only the top level of `__tests__/scenarios/`.
- Scenarios fake the clock per file (`jest.useFakeTimers({now, doNotFake: [...]})`, copied in 3 files).
- Coverage (lines): Daily/Week/Month 49 % (`MonthView` 6 %), Review 50 %, overall 74 %. Daily has 1 scenario
  (adding a meeting); Week and Month have none.
- Agreements show on the Project/Area page ("◇ Agreements n ›"), in the thread/loop overviews, in Engage and in
  Review's "Agreements" step. **They do not show on Daily, Week or Month** (no code there reads them).

## 3. Design

### 3.1 Feature areas (`scripts/test-areas.json`, `scripts/lib/testAreas.mjs`)

```json
{
  "areas": [
    {"id": "planning", "name": "Daily, Week and Month", "help": ["daily.md", "week-and-month.md"],
     "tests": ["__tests__/**/*{daily,week,month,period,focus,planning}*"],
     "sources": ["src/screens/{DailyView,WeekView,WeekPlanner,MonthView,usePlanningScreen}.ts*", "src/ui/{Daily,Period,Week,Month,Focus}*", "src/storage/{daily,weekly,monthly}Aggregate.ts", "..."]},
    ...
  ],
  "smoke": "__tests__/scenarios/smoke/"
}
```
- Areas (ids):
  - `planning`, `current-page` (Projects & Areas, status, Current page);
  - `quick-add` (incl. item card, refile);
  - `meetings`, `threads`, `loops`, `agreements`, `engage`;
  - `lasso` (capture, marks);
  - `review`, `close-out`;
  - `note-setups` (templates, notebooks, headings);
  - `tags`;
  - `files` (cache, writes, safety, integrity);
  - `settings` (profiles, demo, version, help, logging);
  - `integrations` (experimental);
  - `foundation` (shared UI building blocks, utils, `supernote/` wrappers, App shell).
- Each area lists the help pages it explains. Every `docs/user/*.md` except `index.md`, `philosophy.md`,
  `getting-started.md` and `troubleshooting.md` must be named by an area.
- **Assignment: first matching area wins**, in file order. Every file under `__tests__/` and `src/` must match an
  area; `src/generated/` is excluded.
- `scripts/lib/testAreas.mjs` (pure, with its tests in `scripts/test-test-areas.mjs`):
  - `assign(paths, areas)` → `{byArea, unassigned}`;
  - `helpPagesWithoutArea(pages, areas)`;
  - `renderMatrix(…)` (§3.5).
- **code-health rule** `test-areas` (strict, so `--quick` and up): fails naming any unassigned test or source
  file, or a help page without an area. Adding a file means adding it to an area (usually covered by the
  existing globs).

### 3.2 Tiers in `scripts/check.mjs`

| Tier | Flag | Runs |
|---|---|---|
| quick | `--quick` | gen; **tsc and ESLint in parallel**; script tests; catalog check; code-health |
| smoke | `--smoke` | quick + `jest __tests__/scenarios/smoke` |
| area | `--area planning,threads` | quick + Jest on the test files of those areas (paths from §3.1) |
| affected | `--affected` | quick + `jest --findRelatedTests <changed files>` + smoke. Changed = `git diff --name-only $(git merge-base HEAD origin/main)` + uncommitted; nothing changed → smoke only |
| full | (none) | quick + all of Jest (unit and scenarios, smoke included) |
| full + coverage | `--coverage` | full with `--coverage` (json-summary, lcov), then the area matrix and the ratchet (§3.5) |

- Flags combine (`--area planning --smoke`). The last line names the tier: "All checks passed (smoke) in 72 s".
- `npm run check` with no flag stays **full**, so the meaning of the command people already know doesn't
  change. New shortcuts in package.json:
  - `check:quick`;
  - `check:smoke`;
  - `check:affected`;
  - `coverage` (= `check -- --coverage`).
- tsc and ESLint run as two child processes at the same time; the step fails if either fails, and both outputs
  are printed in full.

### 3.3 Who runs what

| Moment | Tier |
|---|---|
| Cloud session, each step | **affected**, plus `--area` for the step's areas when the design names them |
| Cloud session, checkpoint (end of a release's steps) | **full** |
| CI, every push to a branch (not tags) | **full + coverage**; the matrix goes to the job summary, the coverage folder is uploaded as an artifact (14 days) |
| `buildPlugin.ps1` (test build) | none; `-Check` runs **smoke** (was full) |
| Merge into `main` (RELEASING §2) | none locally; CI on the `main` push is the gate |
| Release "Prepare" (RELEASING §5.1) | **quick**, plus: CI for `origin/main` is green (looked up with `gh run list`; if `gh` isn't available, the script says so and asks) |
| `release.ps1 -DryRun` | **quick** (shows what would happen) |
| `release.ps1` | **full + coverage, once, after the version is stamped**. Red stops the release with the undo hints; the "Continue anyway?" prompt is removed (R1) |
| CI on the release tag | skipped (`tags-ignore: ['**']`); the release commit on `main` runs as every push does |

The rule written into DEVELOPMENT-POLICY §7/§9: "Every check and every test runs green on the exact release
commit (`release.ps1`) and on every push (CI). Other moments run the smallest tier that covers the change."

### 3.4 Smoke scenarios (`__tests__/scenarios/smoke/`)

**Smoke space** (`test-helpers/scenario/smokeSpace.ts`): `putSmokeSpace()` writes a small fixed data set. The
clock is fixed at **Wednesday 2026-10-14, 10:00**: mid-week, so the Friday-to-Sunday "coming week" behavior is
not involved, and mid-month. `fixedClock(date)` moves to `test-helpers/scenario/clock.ts` and replaces the three
copies (engageMoment, pageSection, threadsBigArea).

| Item | Focus | Content |
|---|---|---|
| Area **Garden** (GA) | daily, weekly, monthly; weekly goal for W42 "Plant the bulbs", monthly goal for 2026-10 "Beds ready for winter" | todos: "Buy bulbs #next"; "Water the lawn" due 2026-10-14; "Repair the fence #someday"; "Order seeds" done. Meetings: 2026-10-14 14:00 "Neighbour chat"; 2026-10-15 09:00 "Supplier call"; 2026-10-16 "Delivery" (all day); 2026-10-28 "Garden fair #monthly"; 2026-10-20 11:00 "Soil test". Agreement: "Water only in the morning" (active) |
| Project **Website** (WEB) | none | todos: "Draft homepage #next" (not focused → not on Daily); "Send invoice" due 2026-10-13 (overdue); "Feedback on layout" waiting for Lena, no date |
| Project **Garage** (GAR), Area Garden | weekly only, weekly goal "Clear the shelves" | todo "Sort tools #next" |
| Inbox | - | todo "Call the plumber #next"; meeting 2026-10-14 16:00 "Dentist"; todo "Someday idea #maybe" |

Expected on screen (the scenarios assert these, shown and **not** shown):

1. **The app starts and every main tab shows** (feature "Smoke").
   - Given the smoke space, when I open the app and tap through Daily, Week, Month, Projects, Areas, Review,
     Settings and the help,
   - then each shows its main heading, and no error was logged (`loggedErrors()` empty).
2. **Daily shows today's work** (feature "Daily").
   - Given the smoke space, when I open Daily:
   - then the Today tab lists "Neighbour chat" and "Dentist", and Tomorrow lists "Supplier call";
   - the todos shown are:
     - "Buy bulbs" (Next in a daily-focus area);
     - "Water the lawn" (due today);
     - "Send invoice" with the overdue label;
     - "Feedback on layout" with `#w/f Lena`;
     - "Call the plumber" (Inbox Next);
     - "Sort tools" (Next, and its project is in weekly focus: Daily counts daily, weekly and monthly focus);
   - and **not** shown:
     - "Draft homepage" (Next, but its project is in no focus);
     - "Repair the fence", "Someday idea", "Order seeds";
   - the todos are grouped under Garden, Website and Inbox;
   - the focus panel shows Garden with its D badge.
3. **Week shows this week's meetings and weekly focus** (feature "Week and Month").
   - When I open Week:
   - then the grid shows Wednesday 14 "Neighbour chat" and "Dentist", Thursday 15 "Supplier call" and Friday 16
     "Delivery", and not "Soil test" (next week);
   - the weekly focus panel shows Garden with "Plant the bulbs" and Garage with "Clear the shelves";
   - after › the grid shows Tuesday 20 "Soil test".
4. **Month shows highlights and monthly focus** (feature "Week and Month").
   - When I open Month:
   - then the 28th shows "Garden fair" and no other day shows a meeting (none is a highlight);
   - the monthly focus panel shows Garden with "Beds ready for winter";
   - tapping the 14th lists all three meetings of that day on the right.
5. **Quick Add from Daily** (feature "Quick Add").
   - When I add the todo "Check gutters #next" on Daily,
   - then Inbox.txt has it and Daily lists it.
6. **Tick a todo done on Daily** (feature "Daily").
   - When I tick "Water the lawn",
   - then Garden's area.txt has it as done with today's completion date.
7. **The area page** (feature "Projects and Areas").
   - When I open Garden from Areas,
   - then Todos list "Buy bulbs" and "Repair the fence", Meetings list "Neighbour chat", and "◇ Agreements 1 ›"
     opens the list with "Water only in the morning";
   - Garden's folder is not listed until the Files tab is opened (0.21.1: the Files tab's folder is listed only when
     it is opened); after tapping Files, its entries show.
8. **Review hub** (feature "Weekly Review").
   - When I open Review,
   - then the hub lists its steps with counts, and the Inbox step shows "Call the plumber".
9. **Profile switch to the demo space** (feature "Profiles and demo space").
   - When I switch to Demo,
   - then Daily shows the demo's content without errors, and after switching back the smoke space is shown
     again.
10. **A file changed elsewhere is read again** (feature "Your files").
    - Given Daily is open, when Website/project.txt gets a new due-today todo from outside and I reopen the
      plugin,
    - then Daily lists it.

Notes:
- The exact visible texts (labels, badges, headings) are taken from `describeScreen()` while writing; if one
  contradicts this table, stop and check the help page. These are good cases of existing behavior, so a
  contradiction is either a wrong row here or a bug.
- "Sort tools" vs "Draft homepage" pins the subtle Daily rule (daily.md): a Next todo shows when its project or
  area is in daily, weekly or monthly focus, not otherwise.
- Engage and lasso already have fast scenarios in `pageSection`/`engageMoment`. One of them (Engage opens on a
  meeting page, lasso capture of one todo) is **moved**, not copied, into `smoke/`. It keeps its catalog feature.
- Budget: ≤ 60 s for `smoke/` on the 2-core container. Each scenario opens the app once. If over budget, merge
  1 into 2-4 before dropping anything.

### 3.5 Coverage overview and ratchet (`scripts/coverage-report.mjs`)

- Runs after a `--coverage` Jest run. Inputs:
  - `coverage/coverage-summary.json`;
  - the Jest JSON result (`--json --outputFile=coverage/jest-results.json`, for test counts per file);
  - `scripts/test-areas.json`;
  - the scenario catalog (scenarios per area via the scenario's test file).
- Writes `coverage/areas.md`:

  | Area | Unit | UI | Scenario | Smoke | Src lines | Line % | Branch % | Δ vs baseline |
  |---|---|---|---|---|---|---|---|---|

  "Unit" = tests under `__tests__/{domain,storage,utils,supernote,docs}` and the root; "UI" =
  `__tests__/ui`; "Scenario" = `__tests__/scenarios` (smoke counted again in its own column).
- **Ratchet** `scripts/coverage-baseline.json` (`{"planning": {"lines": 49.0, "branches": 40.1}, …}`):
  - the run fails when an area's line or branch % is more than **2.0** points below its baseline;
  - `node scripts/coverage-report.mjs --update-baseline` raises the baseline to the current values. It never
    lowers it; lowering is a hand edit, explained in the commit.
- CI appends `coverage/areas.md` to `$GITHUB_STEP_SUMMARY`.
- `release.ps1` copies it to `docs/dev/history/test-coverage-<version>.md` in the release commit (one file per
  release: the trend).

### 3.6 Scenario catalog

- `scripts/scenario-catalog.mjs` reads `__tests__/scenarios/` recursively.
- Smoke scenarios are marked with "(smoke)" after their title in `docs/dev/test-scenarios.md`.
- The header line says how many are smoke.

## 4. Files

| File | Change |
|---|---|
| `scripts/test-areas.json` (new) | areas, help pages, globs, smoke folder |
| `scripts/lib/testAreas.mjs` (new) + `scripts/test-test-areas.mjs` (new) | pure assignment, help-page check, matrix rendering; script tests |
| `scripts/code-health.mjs` | rule `test-areas` |
| `scripts/check.mjs` | tiers, flags, parallel tsc/ESLint, tier name in the summary |
| `scripts/coverage-report.mjs` (new) + `scripts/coverage-baseline.json` (new) | matrix + ratchet |
| `scripts/scenario-catalog.mjs`, `scripts/lib/scenarioCatalog.mjs` | recursive, "(smoke)" mark |
| `package.json` | `check:quick`, `check:smoke`, `check:affected`, `coverage`; `test:scripts` gets the new script test |
| `jest.config.js` | unchanged projects (smoke lives inside `scenarios`); `coverageReporters` json-summary + lcov |
| `test-helpers/scenario/clock.ts` (new), `smokeSpace.ts` (new) | fixed clock, smoke data set |
| `__tests__/scenarios/smoke/*.test.tsx` (new) | §3.4 scenarios 1-10, plus the moved Engage and lasso scenario |
| `__tests__/scenarios/{engageMoment,pageSection,threadsBigArea}.test.tsx` | use `fixedClock` |
| `.github/workflows/check.yml` | `tags-ignore`, `npm run coverage`, job summary, artifact |
| `scripts/release.ps1` | DryRun → quick; real run → full + coverage once; no "continue anyway"; copy the matrix into the release commit |
| `buildPlugin.ps1` | `-Check` runs `--smoke` |
| `docs/dev/DEVELOPMENT-POLICY.md` §7, §8, §9 | the rule of §3.3; the tiers; smoke must stay ≤ 60 s; new tests belong to an area |
| `docs/dev/RELEASING.md` §2, §4, §5 | merge without local `npm test`; tiers for daily work; Prepare = quick + CI green |
| `docs/dev/README.md` "Writing scenarios" | the smoke folder and space, `fixedClock`, areas |
| `CLAUDE.md` | the Checks line: tiers, and which one a cloud step runs |

No change to the app itself. No CHANGELOG line (not user-visible).

## 5. Test scenarios (Given/When/Then)

1. **Unassigned test file.** Given a new test file no area matches, when `npm run check -- --quick` runs, then
   it fails naming the file and `scripts/test-areas.json`.
2. **Help page without an area.** Given a new help page no area names, when quick runs, then it fails naming the
   page.
3. **Area run.** Given `--area planning`, then Jest runs exactly the planning test files and the summary says
   "(area: planning)".
4. **Affected with no changes.** Given no changes against `origin/main`, when `--affected` runs, then only smoke
   runs.
5. **Ratchet.** Given an area at 49 % with baseline 52 %, when `--coverage` runs, then it fails naming the area
   and both numbers; at 50.5 % it passes.
6. **Baseline only rises.** When `--update-baseline` runs with an area below its baseline, then that area's
   baseline stays.
7. **Release stops on red.** Given a failing test, when `release.ps1` runs, then it stops after the checks with
   the undo hints and does not ask to continue.
8. **Dry run is quick.** When `release.ps1 -DryRun` runs, then it runs the quick tier only.
9. **Smoke planning pages:** §3.4 scenarios 2-4 (and 1, 5-10) are themselves the scenario tests.

Scenarios 1-6 are script tests (`scripts/test-test-areas.mjs`, `scripts/test-coverage-report.mjs`, pure
functions with fixture inputs). 7-8 are checked by hand once (PowerShell, listed in the device/manual
checklist).

## 6. Test plan

- `npm run check` (full) green after every step. The new script tests are part of `test:scripts`.
- Timings recorded in "As built" for each tier on the container: quick, smoke, affected (one changed domain
  file), full, full + coverage.
- Manual, once (Tilman, Windows):
  - [ ] `npm run check:quick`, `check:smoke`, `check:affected`, `npm run check` - note the times.
  - [ ] `./buildPlugin.ps1 -Check` runs smoke.
  - [ ] `./scripts/release.ps1 -DryRun` runs quick only.
  - [ ] A deliberately failing test makes `release.ps1` stop without the continue prompt (on a throwaway branch,
        with `-Version 0.0.0-test`, then reset). Done together with the 0.21.0 release otherwise.
  - [ ] CI: a push shows the area table in the job summary; a tag push starts no run.

## 7. Steps (one commit each, the full check green)

| Step | Content |
|---|---|
| T1 | `test-areas.json`, `testAreas.mjs` + script tests, code-health rule (all current files assigned) |
| T2 | `check.mjs` tiers and flags, parallel tsc/ESLint, package.json shortcuts |
| T3 | `fixedClock`, smoke space, smoke scenarios 1-10, the moved Engage/lasso scenario, catalog recursion and "(smoke)" mark; `npm run scenarios` |
| T4 | `coverage-report.mjs`, baseline from the current values, CI workflow |
| T5 | `release.ps1`, `buildPlugin.ps1 -Check`, docs (policy, RELEASING, README, CLAUDE.md), "As built". Then merge into `main` (RELEASING §2, without the local `npm test` the new rule drops; CI on `main` is the gate) |

## 8. Expected effect

| Moment | Today | After |
|---|---|---|
| Per release, full local runs | 4-5 (≈ 13-17 min on the container) | 1 (≈ 4.5 min with coverage) |
| Cloud step | full ≈ 3.3 min | affected ≈ 1-2 min |
| Test build with `-Check` | full ≈ 3.3 min | smoke ≈ 1-1.5 min |
| Coverage view | none | table per area on every push, per-release history |

## 9. Open points

- **O1 Agreements on the planning pages - backlog.** Agreements don't show on Daily, Week or Month today. The
  smoke set checks them where they are shown (area page, scenario 7; Engage through the moved scenario). Showing
  them on Daily/Week/Month (for example the agreements of the day's meetings, or ones running out this week) is
  a feature with its own requirements, on the backlog.
- **O2 Branch - decided.** Its own branch `feature/test-tiers` from `main` after 0.21.1 is released (0.21.0 and
  0.21.1 both published without it). Not released on its own: merged into `main` once T5 is done and CI is
  green; the next release is the first to use the new `release.ps1`. `nextVersion` is not changed by this branch.
  The areas (§3.1) must also cover the files 0.21.1 added (e.g. `src/utils/einkFlush.ts`,
  `test-helpers/renderCounts.ts`, the `useSettings` hooks).
- **O3 Ratchet tolerance** 2 points: enough for normal refactoring noise, strict enough to catch a dropped test
  file.

## 10. Backlog (not this change)

- Speed up the four slowest suites (`pageSection` 53 s, `appThreadOverlay` 23 s, `interruptions` 22 s,
  `engageOverlay` 20 s).
- More scenarios where coverage is lowest: Review steps, close-out, the Current page's status/archive, Loops,
  Note setups.
- `domain/textPagination.ts` at 1 %: dead code?
- The skipped test in `noteSetupMigration.test.ts`.

## As built

(Filled in during T1-T5.)
