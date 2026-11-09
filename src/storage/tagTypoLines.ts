/**
 * Settings → Input's "Tags that look like a typo"
 * (docs/dev/history/technical-design-writing-help.md §1.8, §3.9): every tag
 * used once in the cache (Projects, Areas, the Inbox) that the rules flag,
 * with the one todo or meeting line it is on - and the fix of that one line.
 *
 * The fix goes through storage/itemMutations.ts's `mutateEntryTasks` /
 * `mutateEntryMeetings`, the write path of an edit save: the file is
 * re-read, only that line's span changes, and the cache follows. It runs
 * only on a tap on that line's → in Settings → Input.
 */
import {deriveMeetingFields, tagSpans} from '../domain/markdown';
import {withTaskText} from '../domain/taskEdit';
import {fixSpelling} from '../domain/writing/tagCase';
import {replaceTag} from '../domain/writing/tagCheck';
import {countTags, TagTypo, tagTypos, typoIndex} from '../domain/writing/tagTypos';
import {getCachedData, getCachedInbox, setCachedInbox} from './dataCache';
import {mutateEntryMeetings, mutateEntryTasks} from './itemMutations';
import {knownTagSources} from './knownTagIndex';
import {keptTypoTags} from './learnedTagFixes';
import {peekSettings} from './settingsSnapshot';
import {log} from '../utils/log';

/** A typo tag and the line it is on. */
export interface TypoLine {
  typo: TagTypo;
  item: {kind: 'project' | 'area' | 'inbox'; path: string; name: string};
  entity: 'task' | 'meeting';
  index: number;
  /** The todo's text or the meeting's title, as in the file. */
  text: string;
}

interface Entry {
  item: TypoLine['item'];
  entity: TypoLine['entity'];
  index: number;
  text: string;
  tags: readonly string[];
}

function entries(): Entry[] {
  const data = getCachedData();
  const inbox = getCachedInbox();
  const out: Entry[] = [];
  const lists = [
    ...(data?.items ?? []).filter(i => !i.loadError).map(i => ({item: {kind: i.kind, path: i.path, name: i.name}, tasks: i.tasks, meetings: i.meetings})),
    ...(inbox && data ? [{item: {kind: 'inbox' as const, path: data.paths.inboxFolder, name: 'Inbox'}, tasks: inbox.tasks, meetings: inbox.meetings}] : []),
  ];
  for (const list of lists) {
    list.tasks.forEach((t, index) => out.push({item: list.item, entity: 'task', index, text: t.text, tags: t.tags}));
    list.meetings.forEach((m, index) => out.push({item: list.item, entity: 'meeting', index, text: m.title, tags: m.tags}));
  }
  return out;
}

/** The typo lines of the current data, alphabetically by tag; tags kept as written are left out. */
export function currentTypoLines(): TypoLine[] {
  const all = entries();
  const usage = countTags(all.map(e => e.tags));
  const {setupTags, abbrevs, counterparts, contextTags, reservedTags} = knownTagSources(peekSettings(), []);
  const typos = tagTypos(usage, typoIndex(usage, {setupTags, abbrevs, counterparts, contextTags, reservedTags}), keptTypoTags());
  return typos.flatMap(typo => {
    const at = all.find(e => e.tags.some(t => t.toLowerCase() === typo.tag));
    return at ? [{typo, item: at.item, entity: at.entity, index: at.index, text: at.text}] : [];
  });
}

/** An upper-case suggestion is an abbreviation (domain/writing/tagTypos.ts spells it so). */
const ABBREV_SPELLING = {isAbbrev: (tag: string) => /[A-Z]/.test(tag) && tag === tag.toUpperCase()};

/** `text` with every `#typo` (any case) written as `#suggestion`, its first letter's case kept (domain/writing/tagCase.ts). */
export function fixedText(text: string, typo: TagTypo): string {
  let out = text;
  for (const span of tagSpans(text).reverse()) {
    if (span.tag.toLowerCase() === typo.tag) out = replaceTag(out, span, fixSpelling(span.tag, typo.suggestion, ABBREV_SPELLING)).text;
  }
  return out;
}

/** The line changed since the list was drawn: nothing is written. */
function changedText(line: TypoLine): string {
  return `That ${line.entity === 'task' ? 'todo' : 'meeting'} changed meanwhile - nothing was changed. Settings → Advanced → Reload all files.`;
}

/** Rewrites the tag on that one line of its file (an edit save's write path). */
export async function fixTypoLine(line: TypoLine): Promise<void> {
  const ctx = {inbox: getCachedInbox(), inboxPath: getCachedData()?.paths.inboxFolder ?? null};
  const next = fixedText(line.text, line.typo);
  if (line.entity === 'task') {
    const {nextInbox} = await mutateEntryTasks(
      {item: line.item, taskIndex: line.index, task: {text: line.text}},
      tasks => {
        if (tasks[line.index]?.text !== line.text) throw new Error(changedText(line));
        tasks[line.index] = withTaskText(tasks[line.index], fixedText(tasks[line.index].text, line.typo));
        return tasks;
      },
      ctx,
    );
    if (nextInbox) setCachedInbox(nextInbox);
  } else {
    const {nextInbox} = await mutateEntryMeetings(
      {item: line.item, meetingIndex: line.index, meeting: {title: line.text}},
      meetings => {
        if (meetings[line.index]?.title !== line.text) throw new Error(changedText(line));
        const title = fixedText(meetings[line.index].title, line.typo);
        meetings[line.index] = {...meetings[line.index], title, ...deriveMeetingFields(title)};
        return meetings;
      },
      ctx,
    );
    if (nextInbox) setCachedInbox(nextInbox);
  }
  log(`writing: typo line fixed kind=${line.entity} changed=${next !== line.text ? 1 : 0}`);
}
