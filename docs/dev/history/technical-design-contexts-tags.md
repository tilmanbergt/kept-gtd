# Technical design: flexible contexts (Show / Except, tags, loop and thread roots)

Status: APPROVED 2026-11-01. Requirements: `requirements-contexts-tags.md` (R1-R7).
Release 0.24.0 "Launch ready" (scope exception, named in `technical-design-launch-ready.md` §7).
Branch `feature/contexts-tags` from `feature/launch-ready` at `22166b2` (after L7a). Implemented in a cloud
session together with 0.24's remaining L7 and L8 (`claude/contexts-tags-implementation-prompt.md`).
Feature area: `contexts`.

## 1. Current state (what changes and why)
| Where | Today | Problem |
|---|---|---|
| `domain/contexts.ts` `passes()` | non-empty `shows` → must match any entry | rows are checked with no tags (`itemShown` passes `[]`), so a tag-only context hides every Project/Area (c) |
| `itemShown(item)` | item entries only | same; also used for Review rosters and the Tend line |
| `taskShown(item, task, today)` | `today` and `dueDate` are unused since due todos follow the context | dead parameter in every caller |
| `contextSummary()` | "Shows … · hides …" | replaced by the sentence (R7) |
| `ContextEditor.tsx` tags | tags in use, `/` tags dropped, no field | (a), (b) |
| `useContextMatcher()` | filter on, "Show" = temporary Everything | Review needs the opposite default (R6) |
| `useReviewData` | always filters | R6 |

## 2. Design

### 2.1 Domain — `domain/contexts.ts`
**Model.** It is stored per profile, with one new optional field (absent = off):
```ts
export interface ContextDef {
  id: string; name: string;
  shows: ContextEntry[];   // UI "Show"
  hides: ContextEntry[];   // UI "Except"
  /** R2: Where AND What (only when both parts have entries). */
  onlyInPlaces?: boolean;
  outsideMeetings: 'dim' | 'show';
  minMinutes?: MinMinutes;
}
```
- `ContextEntry` is unchanged.
- A loop/thread root is a plain tag entry (`read`, `jf`): `tagMatchesSetupTag` already matches `read/xyz`.
- The storage keys stay `shows`/`hides`.

**One test for everything.** It replaces `passes`/`matchesAny`:
```ts
function shown(ctx: ContextDef, item: ContextItem | null, tags: readonly string[]): boolean {
  if (ctx.hides.some(e => entryMatches(e, item, tags))) return false;          // R5
  const where = ctx.shows.filter(isItemEntry), what = ctx.shows.filter(isTagEntry);
  if (where.length === 0 && what.length === 0) return true;                    // R1
  const inWhere = item !== null && where.some(e => itemEntryMatches(e, item));
  const inWhat = what.some(e => tagEntryMatches(e, tags));
  return ctx.onlyInPlaces && where.length > 0 && what.length > 0 ? inWhere && inWhat : inWhere || inWhat;  // R2
}
```

**The matcher is built once, with the items (R3).** The shown rows are precomputed, so `itemShown(item)`
keeps its signature and none of its callers change:
```ts
export interface ContextContentItem extends ContextItem {
  tasks: ReadonlyArray<Pick<Task, 'tags' | 'done' | 'cancelled'>>;
  meetings: ReadonlyArray<Pick<Meeting, 'tags' | 'cancelled' | 'date'>>;
}
export function contextMatcher(ctx: ContextDef | null, items: readonly ContextContentItem[], today: string): ContextMatcher
```
- **Rows:** `rows` is a `Set<"kind:name">`.
  - An item is in it if `shown(ctx, item, [])`, or if it has an open todo (`!done && !cancelled`) or a
    meeting (`!cancelled && date >= today`) with `shown(ctx, item, tags)`.
  - An Area is also added when one of its Projects (`project.area === area.name`) qualifies through its
    content.
  - It takes one pass over the open todos and meetings, memoised per context and cache.
- `itemShown(item)` is `rows.has(key(item))`. An item the matcher doesn't know falls back to
  `shown(ctx, item, [])`.
- `taskShown(item, task)` is true for the Inbox, else `shown(ctx, item, task.tags)`. The `today` parameter
  and `dueDate` go.
- `meetingState(item, meeting)` uses the same test and returns `'dimmed'`/`'shown'` as today.

**Sentence (R7).** It replaces `contextSummary`:
```ts
export function contextSentence(ctx: ContextDef | null, kinds: {loopKinds: readonly string[]; threadTypes: readonly string[]}): string
```
- Labels:
  - an item entry → its name;
  - a tag → `#tag`;
  - a root → "all #read loops" / "all #jf threads", by `kinds`.
- Joining:
  - places with "and", tags with "or";
  - more than 3 → "A, B and 3 more".
- Show:
  - none → "Show everything";
  - Where only → "Show W";
  - What only → "Show T everywhere";
  - both, switch off → "Show W, plus T everywhere";
  - both, switch on → "Show T in W".
- Except:
  - only places → " except in X";
  - otherwise → " except X" (places and tags, joined with "and").
- `null` (Everything) → "Show everything". The function is pure.

**Removed:**
- `contextSummary`, `passes` and `matchesAny`;
- the `today` parameter of `taskShown`;
- the rule prose in the file header with its D/Q numbers, rewritten as the rules above with a pointer to
  this doc.

`nextCountOf` builds its matcher from the same items it gets; its `tasks` type loses `dueDate`.

**Tag input (R4):** `normalizeContextTag(text): string | null`.
- It trims, strips a leading `#` and lowercases.
- It rejects an empty result, inner whitespace, and anything `isContextTag` refuses.
- Quick Add's tags follow the same rule; reuse its helper if one exists, never a second copy.

### 2.2 Hook — `ui/context/useContextMatcher.ts`
```ts
export function useContextMatcher(opts?: {startAll?: boolean}): ContextFilter
```
- It reads `useCachedItems()` and memoises `contextMatcher(showAll ? null : context, items, todayIso())`.
- `showAll` starts at `opts.startAll ?? false` and goes back to that value on `useOnScreenHide`.
- New `narrow()` (sets `showAll` false) next to `show()`, and `sentence` for the Review hub.
- `useHiddenAddNotice` builds its matcher from `getCachedData()?.items ?? []`.
- Call sites change only where `taskShown(..., today)` loses its last argument: `dailyAggregate.ts`,
  `reviewAggregate.ts`, `givenTime.ts`, `useHiddenAddNotice.ts`, `nextCountOf`.

### 2.3 Review (R6)
- `useReviewData` calls `useContextMatcher({startAll: true})`. The rest already handles
  `matcher.context === null`: `filterReviewAggregate` returns the aggregate, and `withElsewhere` yields
  no "+n".
- **Hub line.** `ui/ReviewHub.tsx` gets a new optional prop `contextLine: {text; action; onPress} | null`,
  shown as the first row:
  - context set, not narrowed → "Context X is set · **Review only in X**" (`narrow()`);
  - narrowed → "Reviewing in X · **Review everything**" (`show()`);
  - no context → no row.
  - `filter.context` (active) and `matcher.context` (null when not narrowed) tell the states apart.
- **Step title.** While narrowed: "Step 3 of 9 — Stalled projects · in X".
- **Tend line → Review narrowed.**
  - `ReviewStepRequest` gains `inContext?: boolean`.
  - The `onTend` of Week and Month passes `true` when a context is active.
  - ReviewScreen's request effect calls `contextFilter.narrow()` before `enterStep`.
- The rosters (Tending, Open loops, Agreements) keep using `contextItems`, i.e. the R3 rows: they filter
  by place.
- Reviewed marks, empty stamps and the overdue date stay on `countsAll`.

### 2.4 Settings → Contexts editor
`ContextEditor.tsx` stays under 200 lines; split out `ContextTagsPanel.tsx` if needed. Top to bottom:
1. Name row (unchanged).
2. **Sentence**: `contextSentence(draft, kinds)` with `numberOfLines={2}` and a fixed two-line height, so
   the rows below never move.
3. **Side tabs** "Show n" / "Except n" (n = entries, left out at 0). The keys stay `shows`/`hides`.
4. **Kind tabs** Areas · Projects · Tags (unchanged). The Tags hint: "Todos and meetings with the tag,
   wherever they live. A loop or thread type brings all its loops or threads."
5. **Switch row**, only on Show and only when both parts have entries: `CheckToggle` "Only inside the
   selected areas and projects".
6. **Tags chips:**
   - a New tag field + Add (the `SetupTagPicker` pattern). Add normalises the text and toggles it on the
     current side; a rejected text gets a status message;
   - root chips (`loopKindsOf`, `threadTypesOf`);
   - the tags the context names (typed nested ones included);
   - the tags in use without `/`.
7. Meetings outside / Given time / Preview (unchanged).

Elsewhere:
- `useContextsDraft` gets `setOnlyInPlaces`. `onlyInPlaces` is saved only when it is true and both parts
  have entries.
- `ContextsList`: `${n} next · ${sentence}`.
- Comment cleanup in the touched files: no Q/D numbers, no prose that repeats the code, one pointer to
  this doc.

### 2.5 Unchanged
- The Inbox always shows; meetings are dimmed, never hidden.
- Daily, Week, Month, Projects and Areas keep the hidden line and "Show".
- Engage, the Inbox tab and the single item page.
- `renameItemInContexts`, `unknownContextEntries` and the demo contexts.

## 3. Rollback
- 0.23.x ignores `onlyInPlaces`: a context with the switch on reads as OR there, so it shows more, never
  less.
- 0.23.x also filters Review again.
- No file format change, no migration.

## 4. Files
| File | Change |
|---|---|
| `src/domain/contexts.ts` | `shown`, matcher with rows, `contextSentence`, tag helper, drop `contextSummary`/`today` |
| `src/ui/context/useContextMatcher.ts`, `useHiddenAddNotice.ts` | items, `startAll`, `narrow`, `sentence` |
| `src/storage/dailyAggregate.ts`, `reviewAggregate.ts`, `src/domain/givenTime.ts` | `taskShown` without `today` |
| `src/screens/review/useReviewData.ts`, `ReviewScreen.tsx`, `reviewNav.ts`, `src/ui/ReviewHub.tsx` | R6 |
| `src/screens/MonthView.tsx` and Week's planning panel | Tend → `inContext` |
| `src/screens/settings/contexts/*` | R2, R4, R5 labels, R7 |
| `src/ui/period/GivenTimePanel.tsx` | local `contextItems` → `ownerShown` |
| `docs/user/contexts.md`, `docs/user/review.md` | Show/Except, tags, roots, switch, sentence, Review default |
| `docs/dev/design-overview.md` | §2 as built, §5 decision (Review ignores contexts by default) |

## 5. Test scenarios (Given / When / Then)
1. **Tag-only context lists its places.**
   - Given: "Errands" shows #errand, Garden holds "Buy bulbs #errand", Team has no errand todo.
   - When: I open Areas under Errands.
   - Then: Garden is listed, Team is not, and the hidden line says "Hidden by Errands: 1 area".
2. **Area through its project.**
   - Given: Project Shed (Area Garden) has "Paint #errand"; Garden itself has none.
   - Then: Garden is listed.
3. **Upcoming meeting keeps a place.**
   - Given: "Coaching" shows the `jf` root. Project Leadership has no `#jf/…` todo, a meeting
     "Sparring #jf/anna" next Tuesday and one last month.
   - Then: Leadership is listed under Coaching.
   - Then, with only the past meeting left: it is not.
4. **Loop root.**
   - Given: a loop setup `read`, `#read/novel` in Home and `#read/paper` in Team.
   - Then: a context with "All #read loops" shows both on Daily, and the sentence reads "Show all #read
     loops everywhere".
5. **New tag.**
   - Given: no todo carries #shopping.
   - When: I type "#Shopping" in New tag and tap Add.
   - Then: the "#shopping" chip is on and the sentence reads "Show #shopping everywhere". After Save, the
     context is in the list.
   - Then: a typed `project/piplanning` becomes a plain chip and also matches `#project/piplanning/q1`.
6. **Either/or.**
   - Given: Show Area Work + #computer, switch off.
   - Then: a #computer todo in Home and every Work todo show; the sentence reads "Show Work, plus
     #computer everywhere".
7. **Only inside.**
   - Given: the same with the switch on.
   - Then: only Work's #computer todos show; the sentence reads "Show #computer in Work".
   - Then, after removing #computer: the switch row is gone.
8. **Except.**
   - Given: Show Home, Except #computer.
   - Then: Home is listed and its #computer todo is hidden; the sentence reads "Show Home except
     #computer".
   - Given instead: Show #computer, Except Home.
   - Then: the sentence reads "Show #computer everywhere except in Home".
9. **Review ignores the context.**
   - Given: Home is active.
   - Then: the Review hub reads "Context Home is set · Review only in Home", and Stalled counts every
     stalled project, with no "+n".
10. **Review narrowed.**
    - When: I tap "Review only in Home".
    - Then: Stalled counts Home's projects with "+1 in other contexts", and the step title ends
      "· in Home".
    - Then, after leaving Review and coming back: it shows Everything.
11. **Tend opens Review narrowed, by place.**
    - Given: Coaching (jf root); Area Team has a `#jf/anna` meeting and a `#retro/demand` thread.
    - When: I tap the Tend line on Week.
    - Then: Tending threads lists both of Team's threads, and the title ends "· in Coaching".
12. **Contexts list.**
    - Then: Café reads "1 next · Show #reading everywhere except #computer".

## 6. Test plan
- `__tests__/domain/contexts.test.ts`:
  - matcher table (R1, R2, R5);
  - R3 rows (own match, todo, upcoming and past meeting, Area via Project, Except beats content);
  - `contextSentence` table (every case of §2.1, incl. "and 3 more" and roots);
  - the tag helper;
  - the summary tests rewritten.
- `__tests__/scenarios/contexts.test.tsx`:
  - scenarios 1-12;
  - the existing "filters Areas, Projects and Review" scenario becomes 9/10;
  - the Café scenario uses Show/Except and the sentence.
- Smoke runs without a context, so it stays unchanged. Grep smoke for "Hides"/summary text.
- Tiers:
  - per step: affected + `--area contexts,review,planning`;
  - before the PR: full + coverage.
- Device (in the 0.24.0 beta test, `docs/dev/device-checklist.md` gets a "Settings → Contexts editor"
  row in all four columns):
  - [ ] the editor fits: name/Save, sentence, tabs, switch, New tag, chips, preview;
  - [ ] Errands (tags only) lists the right projects and areas; the hidden line counts look right;
  - [ ] "All #read loops" filters Daily;
  - [ ] Review hub line, narrowing, reset on leaving; Tend opens Review narrowed;
  - [ ] Projects tab and Daily open no slower under a context.

## 7. Steps
- **CT1** Domain + wiring: `shown`, matcher with rows, drop `today`, sentence, tag helper, hook; Daily,
  Week, Month, Projects, Areas. Unit tests; scenarios 1-4 and 6-8.
- **CT2** Review (R6) + the Tend request. Scenarios 9-11.
- **CT3** Editor + list (R2, R4, R5, R7). Scenarios 5 and 12; help pages; design-overview; CHANGELOG lines.
- **CT4** The editor after the first device test (§8). Scenarios 13-15.

## 8. Addendum: the editor after the first device test (CT4)

Decided 2026-11-02 with Tilman, from screenshots of the alpha on the A5 X (upright, turned) and the
Nomad simulation (portrait, landscape).

**Found:**
- The sentence's second line is cut: its box was a fixed 40 dp for two 20 dp lines, while the device
  draws text at font scale 1.15.
- The chip list gets what the dozen fixed rows leave: on a Nomad in landscape about half a row, so no
  chip can be tapped; on a turned A5 X the last row is cut. Chips don't page.
- The Tags tab offers "All #wf threads" and "All #owe threads": `threadTypesOf` adds both for the
  counterpart lens, but neither is a place.
- Save next to the name reads as "save the name"; tapped chips seemed not to need it.
- Nomad portrait: the name field is cut at the left.

**Decided:**
- **Header**, the same on every tab: the name bold and read-only, **Save** and **Delete** (Discard for
  a new context) on its row; Save is active only while the draft differs from the stored context.
  Below it the sentence, at most two lines, its box reserved for two lines at the device's font scale;
  then "Shows 3 of 21 next todos".
- **Tabs** General · Show n · Except n. A new context opens on General, an existing one on Show.
  - General: the name field, Meetings outside this context, Given time.
  - Show / Except: Areas · Projects · Tags with ‹ › at the right of that row; the "Only inside" switch
    (Show only, when both parts have entries); in Tags the New tag field; the chips.
- **Chips page** instead of being cut: the grid lays the chips out, measures where each one lands and
  shows only those that fit whole; › starts the next page at the first one that didn't. No "page n of
  m", as in `PagedSection`.
- **Tags order**: the tags the context names when the tab is opened, then a newly typed tag, the loop
  and thread types (without `wf` and `owe`), the tags in use. The order stays while the tab is open,
  so a tap never moves a chip.
- Two columns stay on every screen. The hint lines under the kind tabs go (the help page explains).
  Plain tags stay as they are.

**Test scenarios:**
13. *Save only after a change.* Given Home is open in the editor, Save is inactive; after a tap on a
    chip it is active; after Save it is inactive again and the list shows the new sentence.
14. *General.* Given a new context, the editor opens on General with the name field; typing "Desk"
    shows "Desk" bold in the header.
15. *No wf and owe types.* The Tags tab offers "All #<type> threads" for the Thread setups only.

**Device checks** (added to §6): the editor on all four screens: header, sentence (two lines, not
cut), tabs, chips paging with ‹ ›, nothing cut off; Save inactive until a change.

## As built

Built as designed in three commits (CT1 `eb30817`, CT2 `74f6052`, CT3 `039c0a8`), with these differences:

- **Matcher.** `contextMatcher(ctx, items = [], today = '')`: the items are optional, because
  `taskShown` and `meetingState` never need rows. `useHiddenAddNotice` and `nextCountOf` call it
  without items; only `useContextMatcher` passes the cached items. `nextCountOf` lost its `today`,
  `filterReviewAggregate` its `now`. An Area is added through a Project only when the Project's
  content passes (a Project shown by its own entry doesn't bring its Area), as §2.1 says.
- **Tag helper.** Quick Add has no single-tag helper; it reads tags with `TAG_RE`.
  `normalizeContextTag` is `normalizeSetupTag` (trim, no `#`, lowercase) plus `isWholeTag`, new in
  `domain/markdown.ts` on the same `TAG_RE`, plus `isContextTag`. Add puts the tag on the side being
  edited and never takes it off; a tag that is already there stays.
- **Hook.** `sentence` was not added to `ContextFilter`: the hub line names the context, and nothing
  else would read it. The editor and the list get the loop kinds and thread types from
  `ContextsTab`.
- **Contexts list.** It uses the sentence from CT1 on, because `contextSummary` went in CT1.
- **Tend.** Week and Month pass `inContext` when the tab is filtering
  (`contextFilter.matcher.context !== null`), not merely when a context is active: after **Show** on
  Week the Tend count is Everything's, and Review opens in Everything to match.
- **Editor.** A chip that is on the other side reads "(excepted)" or "(shown)". The root chips are
  always offered (one per loop kind and thread type), before the tags the context names and the tags
  in use. The debug bundle counts the contexts with the switch on ("contexts 3 (only inside 1)").
- **design-overview.** It has no §5; the decision is in §4 "Why it is built this way", the as-built
  text in §2.7 and §2.8.
- **Scenarios.** Scenario 3 is two scenarios (upcoming meeting; past meeting only), 8 is two (Except
  a tag; Except a place), and the switch part of 7 has its own editor scenario. The old "filters
  Areas, Projects and Review" scenario became 9 and 10 in one walk.
- **CT4** (§8), as decided, with these details:
  - `storedContext` (the stored form: trimmed name, the switch only with both parts) and `contextChanged`
    are pure in `domain/contexts.ts`; Save compares the stored form, so turning the switch on and off
    again leaves Save inactive.
  - The chip paging is `ui/PagedChipGrid.tsx` (`useChipPages`, `ChipPager`) on top of `TagChipGrid`,
    which reports each chip's bottom edge and lays out, but hides, the chips of the next page; the fit
    rule is `chipsThatFit` in `domain/screenLayout.ts`. Until the first measurement every chip shows,
    clipped by the box; tests never lay out, so scenarios see every chip.
  - The sentence reserves `2 × ⌈15 × 1.35 × font scale⌉` dp. The count line reads "Shows 3 of 21 next
    todos"; "The Inbox always shows" stays in the help.
  - The Tags field is `NewTagRow.tsx`; the chip order lives in the editor. Areas and Projects keep the
    cache order.
  - `wf` and `owe` are left out in `ContextsTab` (editor and list), so the hidden line still counts
    their threads.
  - Leaving a draft with unsaved changes (another context, another tab) still drops it without asking,
    as before.

