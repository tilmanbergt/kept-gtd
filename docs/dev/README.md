# Kept GTD — developer notes

> **About this document.** The entry point for developers: how to build and check the plugin,
> how to write user docs, a short code tour, and which documents in `docs/dev/` are living and
> which are historical. Present tense, current state only. Update it when the build, the checks,
> the code layout or the set of living documents changes.

Everything here is for people working on the code. **Start with `DEVELOPMENT-POLICY.md`**: the
rules and checklists every change and every release has to meet. End-user documentation lives in
`docs/user/` (start page: `index.md`).

## Building

Prerequisites (Windows is the tested setup):

- Node.js 18 or newer, `npm install` in the repo root
- Android SDK + JDK as required by React Native 0.79 (Android Studio is the easiest way to get both)
- A Supernote with the plugin firmware to test on (A5 X / A6 X Chauvet 2.27.42, Manta / Nomad Chauvet
  3.30.45 or later; Kept pins `sn-plugin-lib` 0.2.3, which needs it)

Build the plugin package:

```powershell
./buildPlugin.ps1
```

The script first stamps the build info (`scripts/gen-bundled-content.mjs --build`: version and
`nextVersion` from `package.json`, stage (`-Stage alpha|beta`), build number, git commit, changelog →
`src/generated/`, not committed), then
bundles the JavaScript (`npx react-native bundle`), compiles the native Android modules
(`gradlew buildCustomApkDebug`), and packs everything into `build/outputs/kept-gtd.snplg`, plus a
copy named after the build label, e.g. `kept-gtd-0.9.0-alpha+a1b2c3d.snplg` (labels:
`RELEASING.md` §4).

The build number (`versionCode`) is the number of minutes since 2026-01-01 UTC, so every build
counts as a new version for the Supernote host (see `technical-design-host-update-crash.md`). It
is written only into the packaged copy of `PluginConfig.json`; the root file isn't changed by
builds. Details: `technical-design-versioning-release.md`. `buildPlugin.sh` is not maintained.

Copy the `.snplg` to the device and install it over the existing plugin. Logcat shows the running
build right at startup: `App: Kept GTD <label> build <number>`.

`npm install` also generates `src/generated/` (via `postinstall`); after pulling changes to
`CHANGELOG.md` you can refresh it with `npm run gen`.

Releases: see `RELEASING.md`.

## Checking your changes

- `npm run check` runs everything: `src/generated/`, `npx tsc --noEmit` and ESLint (at the same
  time), `npm run test:scripts`, the scenario catalog check, `npm run code-health` (the rules are in
  `scripts/lib/codeHealth.mjs`; long existing files are listed in `scripts/code-health-baseline.json`
  and may only shrink; every file belongs to a feature area of `scripts/test-areas.json`), then
  Jest. Smaller tiers (which moment runs which: `DEVELOPMENT-POLICY.md` §7):
  - `npm run check:quick`: everything but Jest;
  - `npm run check:smoke`: quick + `__tests__/scenarios/smoke/`;
  - `npm run check -- --area planning,threads`: quick + the tests of those feature areas;
  - `npm run check:affected`: quick + `jest --findRelatedTests` on the files changed against
    `origin/main` (committed or not) + smoke;
  - flags combine, e.g. `npm run check -- --area planning --smoke`.
- `npm run coverage`: the full check with coverage, then `coverage/areas.md` - per feature area the
  unit, UI, scenario and smoke tests, catalogued scenarios, source lines and line/branch coverage -
  and the ratchet against `scripts/coverage-baseline.json` (`scripts/coverage-report.mjs`). GitHub
  Actions runs it on every branch push and pull request (`.github/workflows/check.yml`), shows the
  table in the job summary and keeps `coverage/` as an artifact for 14 days. On a branch push the
  same workflow then builds the plugin on Windows (`buildPlugin.ps1`, checked by
  `scripts/ci-build.mjs verify`) and keeps the `.snplg` for 30 days, with `TESTING.md` from
  `scripts/test-notes.mjs` (what the build contains and how to test it; `npm run test-notes` writes
  it locally); betas come from `.github/workflows/beta.yml` (`RELEASING.md` §4).
- `npm run scenarios` runs only the scenario tests and writes `docs/dev/test-scenarios.md`
  (see "Writing scenarios" below).
- A useful smoke test mounts `<App />` with `react-test-renderer`.
  `tsc` alone cannot catch a broken default export of `App.tsx`, because `index.js` isn't type
  checked. See `design-overview.md` for the mocks this needs (`sn-plugin-lib`, AsyncStorage,
  Clipboard).
- Device logs: `adb logcat -c`, reproduce, then
  `adb logcat -d -s ReactNativeJS:V GtdParaFile:V` (JS logs carry the `[GtdPara]` prefix).

## Writing scenarios

Scenario tests (`__tests__/scenarios/*.test.tsx`, Jest project `scenarios`) run the real app -
`App.tsx`, screens, storage, `supernote/fileSystem.ts` - on a fake Supernote and check the files
afterwards:

- `test-helpers/fakeDevice/`: `FakeFs` stands in for the native `GtdParaFile` module (same rules:
  sorted listings without dot and `.mark` files, moves that refuse an existing target, empty-folder
  deletes only), `FakeSdk` for `sn-plugin-lib` (notes are JSON files with pages, keywords and the
  elements the plugin wrote - textboxes, links, title elements; the open note and page, buttons; a
  simple fake text measurement for `TextboxMetrics`), `FakePdf` for `GtdParaPdf` (the PDF file holds its spec). `setup.ts`
  installs them; `device()` is the current one. Faults: `fs.failNext`, `fs.crashAfter(n)` with
  `fs.restart()`, `fs.editExternally`.
- `test-helpers/scenario/scenario.ts`: `scenario(title, {feature, design}, () => {...})` with
  `given`/`when`/`then`/`and` steps. Each scenario starts on an empty device. The step texts are
  what the catalog shows, so write them for a reader and keep them single-quoted literals.
- `test-helpers/scenario/app.tsx`: `openApp()`, `openEngage({fromNote, page})` (the Engage
  button over a note page), `tapTab`, `tap(text | /pattern/, nth)`,
  `type(placeholder, text)`, `fieldValue`, `shows`/`expectShows`, `describeScreen()` (print it
  while writing a scenario to see the labels). Queries see only visible elements (kept tabs are
  hidden); every view that asks for its size gets a tall page, so paged lists show their rows.
- `test-helpers/scenario/files.ts`: `PATHS`, `projectFile`, `dataFile(kind, sections)`,
  `putFile`, `fileText`, `sectionLines`, `loggedErrors()`; for note pages `pageKeywords`,
  `pageTexts` (what Kept wrote on a page) and `pageHeadings`.
- `test-helpers/scenario/setups.ts`: ready-made Note setups for `openApp({settings})`, e.g.
  `sparringSettings()`.
- `test-helpers/scenario/clock.ts`: `fixedClock(date)` for a scenario whose expectations depend on
  the date (only the clock is faked; restore it with `afterEach(() => jest.useRealTimers())`).
- `readTexts()` and `textsBetween(from, to)` (`app.tsx`): the visible texts as the user reads them -
  a row's title with its labels is one entry, e.g. `Water the lawn  #due 14.10.` - and the part of
  the screen between two texts (one list, column or panel), to check what a list shows in order.
- **Smoke scenarios** (`__tests__/scenarios/smoke/`, `npm run check:smoke`): one fast scenario per
  main flow, marked "(smoke)" in the catalog. Most use the smoke space
  (`test-helpers/scenario/smokeSpace.ts`: `putSmokeSpace()`, `smokeClock()` - Wednesday
  14.10.2026, 10:00). Each opens the app once; the folder stays at or below 60 s.
- Every test file belongs to a feature area (`scripts/test-areas.json`, first matching area wins);
  name a new file so an area's globs place it, or add it to the area.

What the fake device cannot show - layout and row heights, e-ink refreshes, lasso, recognition,
PNG rendering, real SDK behavior - stays on the device checklist. A call the fake SDK doesn't
model answers "not available" and is listed in `device().sdk.unsupported`.

## Writing user docs

The pages in `docs/user/` are read on GitHub and shown in the plugin's help ("?" in the tab bar,
`ui/HelpOverlay.tsx`; design: `technical-design-in-app-help.md`). The build bundles them into
`src/generated/userDocs.ts`; the help's page list follows the groups and order of `index.md`, so a
new page must be linked there. The app renders them with the same renderer as "What's new"
(`domain/markdownBlocks.ts` → `ui/MarkdownBlocks.tsx`), which knows only a small subset, so the
pages stick to it:

- headings, paragraphs, `-` and `1.` lists with at most one nested level, `>` quotes
- `**bold**`, `` `code` ``, links to other pages in the folder as `[text](page.md)` or
  `[text](page.md#heading-slug)` (tappable in the help, which opens the page at that heading and
  offers ‹ Back; the slug is GitHub's, `domain/helpLinks.ts`); links to web addresses show as text
- fenced code blocks (shown in monospace, long ones continue on the next page)
- no tables, images, HTML (not even `<name>` placeholders) or horizontal rules

Write labels exactly as the app shows them, and check a behaviour in the code before describing
it. `__tests__/docs/userDocs.test.ts` fails on anything outside the subset, and the generator
(`npm run gen`, run by every check tier and build) fails on a link to a page that doesn't exist or
to a heading the page doesn't have (`scripts/lib/userDocs.mjs`'s `checkLinks`, with the app's slug
rule), so the checks catch most slips.

## Code tour

| Folder | What lives there |
|---|---|
| `src/domain/` | Pure TypeScript logic: parsing, dates, tags, rules. **No React Native or `sn-plugin-lib` imports**, so it stays testable with plain Node. |
| `src/storage/` | Reading/writing project files, cache, settings, integrations (I/O) |
| `src/supernote/` | Thin wrappers around `sn-plugin-lib` and the native modules |
| `src/screens/` | One component per tab/screen (Daily, Week, Month, Inbox, Current, …) |
| `src/screens/review/` | Weekly Review: the shell (`ReviewScreen.tsx`: hub, navigation, visit record), shared data (`useReviewData.ts`, `useFrozenStepList.ts`, `reviewVisit.ts`) and one component per step in `steps/` |
| `src/screens/thread/` | The thread overview overlay: frame (`ThreadOverview.tsx`), its sections (row and Quick Add actions in `ui/useEntryActions.ts`, shared with the loop overview); hosted with the help by `screens/useAppOverlays.tsx`. Also tending: the Current page's `ThreadsTab.tsx`, Review's `ThreadSummary.tsx` and their shared `useTending.ts` |
| `src/screens/engage/` | The Engage panel over the note (`mode: 'engage'`): the frame `EngageOverlay.tsx`, its hooks `useEngageFlow.ts` (reducer over `domain/engageFlow.ts`, opening, cache events) and `useEngageView.ts`, one file per part (header, Now box, ack line, option list and row, owner list, owner empty, celebration, marks line, footer) and `engageStyles.ts` |
| `src/screens/projectData/` | The Current page's Todos and Meetings lists and the counterpart filter, used by `screens/ProjectDataPanel.tsx` |
| `src/screens/settings/` | Settings: the shell (`Settings.tsx`), the Save-draft (`useSettingsDraft.ts`) and its tabs (`DraftTabs.tsx`), Advanced/About/Profiles, and Note setups in `noteSetups/` (list, setup page, tag picker, page layout with its Pieces/Add/Background panels, draft hooks) |
| `src/ui/` | Shared components (QuickAddWidget, PagedSection, MeetingRow, …) and styles |
| `src/utils/` | Logging, performance tracing, e-ink refresh helpers |
| `android/…/eu/embodyagile/gtdpara/` | Native modules: file access, Gmail IMAP, PDF, text measurement, runtime guard |

## Design documents

**Living documents** describe the current state and are kept true in every change. They contain
no history and no open work:

- `DEVELOPMENT-POLICY.md`: the rules and checklists for every change and release. **Start here.**
- `design-overview.md`: the architecture as built and intended - structure, file format, cache,
  the binding rules (§3).
- `design-philosophy.md`: the values behind the design and how they show up in it.
- `design-device-rendering.md`: screen facts, row heights and space budgets for the A5 X.
- `supernote-host-facts.md`: how the Supernote and its plugin host behave where the SDK
  documentation is silent or unclear (limits, quirks), as found on the device.
- `GITHUB-GUIDE.md`: which GitHub flow (button, workflow) to use when, and what it does.
- `RELEASING.md`: git, build and release workflow.
- `inkhub-listing.md`: the field values for the InkHub store listing.
- this `README.md`.

`test-scenarios.md` is generated by `npm run scenarios` from the scenario tests and never edited
by hand.

**Historical documents** live in `docs/dev/history/`. They record how something was decided and built. They are written once,
get an "As built" section when the feature ships, and are not updated afterwards - if they
disagree with a living document, the living document is right:

- `technical-design-*.md`: one per feature (requirements, design, as built), including quotes
  from the conversations in which decisions were made.
- `design-meeting-lists.md`, `requirements-*.md`, `spike-*.md`: analyses, requirement notes and
  experiments.
- `public-release-guide.md`: the plan for the first public release (0.1.0).
- `device-test-*.md`: device test records of a release.

Open work - ideas, requirements under discussion, bugs, technical debt, housekeeping - is kept in
the maintainers' internal backlog, not in this repository. Reports and ideas from users go to
GitHub issues.

Workflow used for this project: clarify requirements first, then write a technical design, then
implement. For bugs: pin down the exact failure, find the root cause, then fix.
