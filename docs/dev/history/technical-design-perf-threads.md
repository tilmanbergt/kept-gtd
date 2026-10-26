# Technical design: fast Threads for big Areas (provenance lookup table)

Status: **approved** (Tilman, 2026-10-26). Release **0.21.0**, steps **S13-S18** on `feature/meetings-moment`,
after 0.21's S0-S12 (`technical-design-meetings-0.21.md`, `technical-design-engage-page-owner.md`). Its device
checklist (§7) runs together with 0.21's device test.
Analysis this design builds on: claude.ai project doc `claude/perf-current-atruvia-analysis.md`
(debug bundle 2026-10-26, Kept GTD 0.21.0-beta+6a3012a). This document is the source for the
implementation. Where the code shows the design is wrong or incomplete, update this document in the same
commit and note it under "As built".

## 1. Requirements (as decided in conversation, 2026-10-26)

- **R1 Same results, less work.** Threads, Review "Tending threads", the thread and counterpart
  overviews, the counterpart filter, Engage and Capture show exactly what they show today. Only the
  amount of computation changes. No change to files, settings or the UI, except R5.
- **R2 Each meeting's comparison key is built once.** A meeting's provenance key (date + display title,
  fitted to the keyword limit, normalized) is computed once per distinct meeting, not once per lookup.
- **R3 Lookup table instead of search.** Resolving a todo's or agreement's `meeting` field becomes a table
  lookup per Project/Area file instead of a scan of every meeting. The table is rebuilt only when that file's
  data changes (new cache object).
- **R4 One answer per todo per roster.** While one scope's roster is built, each todo's meeting is resolved
  once and shared by all counterparts of that scope.
- **R5 One computation per open.** Opening a Project/Area page computes the Threads roster once, with the
  final thread types, not first with `wf`/`owe` only and then again after the settings load.
- **R6 No idle work.** With Debug logging on and the plugin idle, nothing runs every 5 s: a granted file
  permission is remembered for the session, so the log-file flush no longer logs (and re-arms itself).
- **R7 Measurable.** Each roster build logs one line with counts and ms (no names), and records a perf span,
  so later debug bundles and perf traces show the cost directly.
- **Not in this change:** meeting IDs (decided: later, if at all), building the roster in one pass per scope or
  computing a counterpart's details only on ▸ (analysis §4 A3/A4), progressive rendering (B), persisted caches
  or a database (C/D). These are decided after the device numbers of this change (§10).

## 2. Current state

- `domain/provenance.ts` `resolveProvenance(task, sources, scopePaths)`:
  1. `key = normalizeMeetingKey(task.fields.meeting)`; empty → null.
  2. Exact: the first meeting, sources in order, first index in a source, with `meetingKey(m) === key`, first
     among the sources in `scopePaths`, then among all sources. Cancelled meetings **can** match.
  3. Fallback (only when the key starts with a date and names at least one thread tag): the first meeting
     not cancelled, with that date and a thread tag named in the key, in scope first, then all.
  - `meetingKey(m) = normalizeMeetingKey(meetingPageKeyword(m))`. That is `stripBareTags` (builds 3 RegExps),
    `fitKeyword` (up to about 6 regex passes for titles over 43 characters) and 2 more regex passes. It is
    computed for **every meeting visited, in every lookup**.
- Callers of `resolveProvenance`: `domain/threadLens.ts` (`provenanceOf`, through `relationOf` for every todo
  in scope and for agreements), `domain/engageOwner.ts` (3 places), `domain/agreementOwner.ts`
  (`agreementMadeIn`).
- `storage/threadAggregate.ts` `buildThreadOverview(items, inbox, tag, lens, ownerPath)` builds a new
  `threadLensContext` (new sources, new closures) and goes over every todo of the scope, calling
  `provenanceOf(task)` for each one with a `meeting` field.
- `storage/tendingRoster.ts` `buildScopeRoster` calls `buildThreadOverview` once **per counterpart** (new,
  active and inactive). The provenance of a todo does not depend on the counterpart, but it is recomputed for
  each one. `buildTendingRoster` (Review) does this for every scope.
- `screens/thread/useTending.ts` `useTendingData` starts with `ruleTypes = threadTypesOf([])` (`wf`, `owe`).
  After `loadSettings()` resolves it sets a new array, which re-runs ThreadsTab's `useMemo`: the roster is
  built twice per open. It is also rebuilt when the loaded types are the same, because the array is new.
- `storage/settingsStorage.ts` `loadSettings()` reads and parses AsyncStorage on every call, with migrations.
  There is no in-memory snapshot. The single writer is `writeSettings`.
- `supernote/pluginPermissions.ts` `ensurePluginPermission` calls `hasPermission` on the host before every file
  operation and logs 2 lines each time. With Debug logging on, `utils/logSink.ts` flushes 5 s after a line is
  queued. The flush's file write calls `ensureFileWritePermission`, which logs 2 lines, which schedule the next
  flush: an endless 5-second loop (823 of 1000 lines in the analysed bundle).
- Measured in the bundle (debug logging on): Atruvia (83 todos, 126 meetings; the scope adds its Projects)
  blocks the JS thread for about 7 s plus about 10 s per open. Its file is read in 60 ms and parsed in 160 ms.

## 3. Design

### 3.1 Meeting keys are memoized by content (`domain/provenance.ts`)

```ts
export function meetingKey(meeting: Pick<Meeting, 'date' | 'title'>): string  // same signature, memoized
```
- Memo: `Map<string, string>` from `date + '\u0000' + title` to the key. It is keyed by **content**, not by
  object, so a caller passing a draft or a changed copy can never get a stale key.
- Bounded: cleared when it reaches 4,000 entries (one person's data set has a few hundred meetings; drafts add a
  few).
- `meetingKey` stays a pure function of `date` and `title` (the memo is invisible to callers). The domain-layer
  rule (no I/O, no RN) is kept. Module state in `domain/` is allowed for pure memos and is stated in the module
  doc comment.

### 3.2 A lookup table per meetings list (`domain/provenance.ts`)

```ts
interface MeetingListIndex {
  length: number;                    // the list's length when the index was built (guard, see below)
  byKey: Map<string, number[]>;      // meetingKey → meeting indexes, ascending
  byDate: Map<string, number[]>;     // meeting.date → meeting indexes, ascending (cancelled included)
}
function indexOf(meetings: readonly Meeting[]): MeetingListIndex   // WeakMap<readonly Meeting[], MeetingListIndex>
```
- Built the first time a list is searched and cached by the **array object** (WeakMap). The cache's arrays
  are replaced, never changed, when a file changes (parser builds them; every mutation maps or spreads into a new
  array: `storage/itemMutations.ts`, `screens/ProjectDataPanel.tsx`). So a changed file brings a new array and
  thus a new index. Nothing has to be invalidated, and old ones are garbage-collected with their arrays.
- **Guard:** if `meetings.length !== index.length`, the index is rebuilt. This catches an accidental `push` on a
  cached array. Replacing an element in place is not caught; S14 audits that no code does it (§5) and
  `design-overview.md` §3 states the rule.
- The Inbox's list is an array of the cached Inbox, so it gets its index the same way.

### 3.3 `resolveProvenance` uses the tables (same signature, same result)

```
key = normalizeMeetingKey(task.fields.meeting); if !key → null
exact:  for each source (in scopePaths, in sources order): i = indexOf(source.meetings).byKey.get(key)?.[0]
        → first hit; else the same over all sources
fallback (date and key threads as today):
        for each source (in scope, then all): first i in byDate.get(date) with
        !m.cancelled && threadsOfTags(m.tags) ∩ keyThreads ≠ ∅
```
- This is **exactly** today's order: sources in the given order, scope first, the first index inside a
  source. Today's `findIn(inScope, …) ?? findIn(sources, …)` is replaced by two loops over the same order.
- Cost per lookup: one normalize of the todo's key plus at most 2 × (number of sources) map lookups (about 70 for
  your data), instead of up to 225 key builds.

### 3.4 One answer per todo while a roster is built (`domain/threadLens.ts`, `storage/threadAggregate.ts`,
`storage/tendingRoster.ts`)

```ts
export type ProvenanceMemo = Map<object, ProvenanceMatch | null>;
threadLensContext(scopeItems, sources, inboxPath, tag, lens, ownerPath, memo?: ProvenanceMemo)
buildThreadOverview(items, inbox, tag, lens, ownerPath, now?, opts?: {provenanceMemo?: ProvenanceMemo})
```
- `provenanceOf(task)` looks in `memo` first (keyed by the task or agreement object), else resolves and stores.
- `buildScopeRoster` creates **one memo per scope** and passes it to every `rosterEntryOf` → `buildThreadOverview`
  of that scope. This is correct by construction: within one scope roster the sources and the scope are the
  same for every counterpart, because the owner is the scope's owner. The memo lives only for that one
  synchronous build, so it needs no invalidation.
- `buildTendingRoster` gets one memo per scope through `buildScopeRoster`. Other callers pass none and behave as
  today (they still profit from §3.1-3.3).

### 3.5 Thread tags are parsed once per string (`domain/threads.ts`)

- `threadOf(tag)` is memoized in a `Map<string, ThreadRef | null>` (cleared at 4,000 entries). It is called for
  every tag of every todo and meeting in each counterpart's pass (`belongsToCounterpart`, `typesForCounterpart`).
  The returned objects are shared, so callers must not mutate them. They don't today; the type becomes
  `Readonly<ThreadRef>`.

### 3.6 One roster computation per open (`storage/settingsStorage.ts`, `screens/thread/useTending.ts`,
`screens/thread/ThreadsTab.tsx`)

```ts
export function peekSettings(): GtdParaSettings | null   // settingsStorage: last settings read or written, or null
```
- Set by `loadSettings` after a successful read and by `writeSettings` (the single writer, used by
  `saveSettings`, `replaceUnreadableSettings`, `resetSettingsToDefaults` and review-steps updates). It is not set
  while settings are unreadable, so callers fall back to loading as today. App loads the settings at start, so
  the snapshot exists before any page opens.
- `useTendingData`: the initial `ruleTypes` come from `peekSettings()` (`ready = true` when it exists). The
  existing `loadSettings()` effect stays, so settings changes still arrive. It sets the new types **only when
  they differ by value** (`setRuleTypes(prev => sameList(prev, next) ? prev : next)`).
- `ThreadsTab`: while `!ready`, no roster is built. The PagedSection shows the header and the empty hint
  "Loading threads…". In practice this never shows, because the snapshot is there. It exists so a cold path
  never computes with the wrong types.
- Review's `useTendingRoster` already waits for `settings`; unchanged.

### 3.7 File permissions are remembered for the session (`supernote/pluginPermissions.ts`, `supernote/fileSystem.ts`)

- `ensurePluginPermission`: a permission that was granted (`hasPermission > 0` or `requestPermission > 0`) is
  stored in a module-level `Set`. Later calls return `true` at once: no bridge call, no log line. A denial, an
  error or a timeout is never stored, so the next call asks again, as today.
- `forgetPermissionGrants()`: clears the set. It is called by the file-system wrappers in
  `supernote/fileSystem.ts` when a native file call fails, so a permission revoked while the plugin runs is
  asked for again on the next call.
- This removes the 5-second log loop at its source: the log file's own write no longer logs anything once
  write permission was granted.
- Policy wording (`DEVELOPMENT-POLICY.md` §3 "Permissions") becomes: "every file or network call checks its
  permission right before use (`supernote/pluginPermissions.ts`); a grant is remembered for the session and
  forgotten when a file call fails".
- `logSink`: no change. Its test gets the case "a flush whose write logs nothing schedules no further flush".

### 3.8 Measuring (`storage/tendingRoster.ts`)

- `buildScopeRoster` wraps its work in `perfStart`/`perfEnd('calc:roster', token, meta)` with
  `meta = {counterparts, todos, meetings, provenanceLookups, ms}`.
- One log line per build:
  `log('tendingRoster: built', '<n> counterparts', '<t> todos', '<m> meetings', '<l> lookups', '<ms> ms')`.
  It has counts only, no names (policy §5), and runs once per page open or Review step build, not in a loop.
- `provenanceLookups` counts the memo misses in that build (memo size).

## 4. Expected effect

- Key builds per Atruvia open: from tens of thousands (counterparts × todos with a meeting × meetings visited,
  twice) to at most one per distinct meeting per session plus one per changed meeting.
- Lookups per roster: at most one per todo with a meeting (memo), each about 70 map lookups.
- Target (device, debug logging off): Threads roster for Atruvia **≤ 300 ms**. The Atruvia page then opens in
  about the time of a small Area today (≈ 3-4 s). That remaining base time is a separate topic (§10).
- Review "Tending threads", the counterpart filter, Engage and Capture lookups get faster with no change of
  their own.

## 5. Files

| File | Change |
|---|---|
| `src/domain/provenance.ts` | `meetingKey` memo (§3.1), `MeetingListIndex` + `indexOf` (§3.2), `resolveProvenance` on the tables (§3.3); module doc comment states the memos and the "arrays are replaced, never changed" rule |
| `src/domain/threads.ts` | `threadOf` memo, `Readonly<ThreadRef>` (§3.5) |
| `src/domain/threadLens.ts` | optional `memo: ProvenanceMemo` (§3.4) |
| `src/storage/threadAggregate.ts` | `buildThreadOverview`/`threadLensContext` pass `provenanceMemo` through |
| `src/storage/tendingRoster.ts` | one memo per scope; perf span + log line (§3.8) |
| `src/storage/settingsStorage.ts` | `peekSettings()` (§3.6) |
| `src/screens/thread/useTending.ts` | initial types from the snapshot; set only on a real change |
| `src/screens/thread/ThreadsTab.tsx` | no roster while `!ready`; "Loading threads…" hint |
| `src/supernote/pluginPermissions.ts` | grant set, `forgetPermissionGrants()` (§3.7) |
| `src/supernote/fileSystem.ts` | call `forgetPermissionGrants()` in the failure paths of native file calls |
| `test-helpers/bigScope.ts` (new) | deterministic generator of an Atruvia-sized data set (§7) |
| `__tests__/…` | see §7 |
| `docs/dev/DEVELOPMENT-POLICY.md` | §3 permission wording |
| `docs/dev/design-overview.md` | §3: "cache arrays and entries are replaced, never changed in place; derived indexes are in-memory and keyed by them" |
| `CHANGELOG.md` | Fixed (§8) |

Audit in S14 (search the whole repo, not only these files): no in-place change of a cached `meetings` or `tasks`
array or of a `Meeting`/`Task` object (`push`, `splice`, `sort`, `reverse`, index assignment, field
assignment) outside the parser's construction in `domain/markdown.ts`. Partial check while drafting: only the
parser's `push` during construction found.

## 6. Test scenarios (Given/When/Then)

1. **Same Threads as before.** Given an Area with 25 counterparts, 130 meetings and 90 todos (half of them agreed in a
   meeting, some in meetings of its Projects, some in the Inbox, two with a renamed meeting), when its page
   opens, then the Threads tab lists the same New/Active/Inactive counterparts with the same last/next dates,
   I-owe and Waiting counts as before this change.
2. **Scope first.** Given two meetings with the same date and title, one in the Area and one in another Area, when a
   todo of the Area names that meeting, then it is matched to the meeting in its own Area. Given only the other
   Area has it, then that one.
3. **First in file.** Given the same meeting line twice in one file, then a todo matches the first one.
4. **Cancelled meetings.** Given a todo naming a cancelled meeting exactly, then it still matches (as today). Given only
   the fallback could match it (renamed title, same date and thread), then the cancelled one is skipped.
5. **Renamed meeting.** Given a meeting renamed after the todo was agreed, with the same date and thread tag, then the todo still
   matches it through the fallback; after changing the date as well, it matches nothing (as today).
6. **Edits are seen.** Given the Threads tab is open, when a meeting's title is changed in Quick Add, then the
   todos agreed in it with the new key resolve to it and the counts update.
7. **One computation.** Given the app has started, when an Area page opens, then the roster is built once.
8. **No idle flush loop.** Given Debug logging on and the plugin idle for 30 s after the last action, then the
   log file is written at most once and there is no "hasPermission" line after the first one.
9. **Revoked permission.** Given a granted read permission, when a file call fails, then the next file call asks the
   host again.

## 7. Test plan

**Automated (`npm run check`):**
- **Golden master, step S13, before any change.** `test-helpers/bigScope.ts` builds the scenario-1 data set
  deterministically (seeded, includes the cases of scenarios 2-5). `__tests__/storage/bigScopeGolden.test.ts`
  serializes the current results and commits them as a snapshot:
  - `buildScopeRoster` for the Area;
  - `buildTendingRoster`;
  - `buildThreadOverview` for 5 tags (thread and counterpart lens);
  - `counterpartMatcher` for 3 counterparts over all todos and meetings;
  - `resolveProvenance` for every todo and agreement;
  - `threadOfTodo`/`agreedInMeeting` for every todo.
  
  Every later step must keep it green unchanged.
- `__tests__/domain/provenance.test.ts`: scenarios 2-5; the index is rebuilt after a `push` (length guard);
  `meetingKey` memo returns the same as the unmemoized function for long titles, tags, `#prepped`/`#reviewed`,
  and is cleared at the cap.
- `__tests__/domain/threads.test.ts`: `threadOf` memo returns equal results; repeated calls return the same
  object.
- `__tests__/storage/tendingRoster.test.ts`: with the big scope, `meetingKey`'s underlying build runs at most
  once per distinct meeting (a test-only counter exported as `__provenanceStatsForTests`). The memo has one
  entry per todo with a meeting.
- `__tests__/ui/currentThreadsTab.test.tsx`: scenario 7: `buildScopeRoster` is called once per mount when the
  snapshot exists, and not again when `loadSettings` resolves with the same types; it is called again when the
  types differ.
- `__tests__/supernote/pluginPermissions.test.ts` (new): a grant is cached (no second `hasPermission`, no log);
  denial and timeout are not cached; `forgetPermissionGrants` makes the next call ask again.
- `__tests__/utils/logSink.test.ts`: a flush whose writer logs nothing schedules no further flush (fake timers,
  scenario 8).
- Scenario test `__tests__/scenarios/threadsBigArea.test.tsx`: scenarios 1 and 6 on the fake device (open the big
  Area, compare the Threads rows; edit a meeting title via Quick Add; rows update).

**On the device (build with `buildPlugin.ps1`, production profile):**
- [ ] Debug logging **off**, perf tracing on: open Atruvia from the sidebar button and from the Areas list 3 times
      each; note the times (perf trace `nav current`). Compare with a Zen open.
- [ ] Debug logging **on**: the bundle shows `tendingRoster: built … ms`; Atruvia ≤ 300 ms.
- [ ] Threads content of Atruvia is unchanged: for 3 counterparts compare last/next, I-owe, Waiting with a
      screenshot taken before installing the new build.
- [ ] Filter by a counterpart on Atruvia; open a counterpart's overview; Review → Tending threads; Engage on a
      page of `Atruvia 2026.note`. Same contents as before, noticeably faster.
- [ ] Leave the plugin idle for 1 minute with Debug logging on, then export a bundle: no repeating
      `ensurePluginPermission` lines.

## 8. CHANGELOG (`[Unreleased]` → Fixed, part of 0.21.0)

- Project and Area pages with many meetings and threads open much faster: the Threads tab no longer compares
  every meeting again for every person. Review's "Tending threads", the counterpart filter and Engage profit
  too.
- With Debug logging on, Kept GTD no longer writes to its log file every few seconds while idle.

## 9. Steps (one commit each, `npm run check` green, prefix `meetings: S<n> -`)

| Step | Content | Check |
|---|---|---|
| S13 | `bigScope` generator + golden-master snapshot of today's results; §3.8 measurement line (no behavior change) | `npm run check`; optional device "before" numbers with this build |
| S14 | Repo audit (§5); §3.1 key memo, §3.2 tables, §3.3 `resolveProvenance`; §3.5 `threadOf` memo | golden master unchanged; provenance and threads tests |
| S15 | §3.4 memo per scope roster | golden master unchanged; tendingRoster counter test |
| S16 | §3.6 settings snapshot, single computation | currentThreadsTab test |
| S17 | §3.7 permission grants | pluginPermissions + logSink tests |
| S18 | Scenario test; docs (policy, design-overview, CHANGELOG); "As built" | `npm run check`; `npm run scenarios`; device test §7 together with 0.21's |

## 10. Open points

- **O1 Release - decided:** part of 0.21.0 (steps S13-S18 on `feature/meetings-moment`, CHANGELOG under
  0.21.0's "Fixed"), so 0.21's device test runs on the fast version.
- **O2 After the device numbers:** if Atruvia's roster is still above ≈ 300 ms, the next step is analysis A3/A4
  (one pass per scope, details only on ▸). If the page as a whole is still slow while the roster is fast, the next
  thing to measure is the ≈ 3-4 s base time that small Areas also show (render, the 2.4 s before the first folder
  listing, debug-only diagnostics). That goes into a new perf trace round, not this change.

## As built

- **S13.** `test-helpers/bigScope.ts` writes the data set as files (`bigScopeFiles`, for the fake device) and
  parses them for unit tests (`bigScopeCache`) with the domain parsers `parseProjectFileContent` uses:
  `storage/projectFile.ts` itself cannot be imported in a unit test, it pulls in the SDK. Seeded (Park-Miller,
  ESLint forbids bitwise operators), "now" fixed at 2026-10-26 12:00 local time. Atruvia's scope has 26
  counterparts (25 in use plus one status line nobody uses), 133 meetings, 97 todos (50 with a `meeting` field) and
  14 agreements; around it an Area Zen, a lone Project Solo and the Inbox.
- **S13.** The golden master is a committed JSON file, `__tests__/storage/__golden__/bigScope.json`, not a Jest
  snapshot, so `jest -u` cannot overwrite it; it is recorded only with `GOLDEN_WRITE=1`. Entries are written as
  `<item>:<list><index>`. Besides the §7 list it also pins the overviews without an owner (fallback owner) and
  `agreementMadeIn` for every agreement. One more test checks the §6 scenario 2-5 cases by name; today's code
  gives the expected result for all of them.
- **S13.** Until the memo exists (S15), the log line's `lookups` is the number of resolves the build does:
  counterparts × the scope's todos (not cancelled) and agreements with a `meeting` field.
