// docs/dev/history/technical-design-quickadd-redesign.md §3.7, §7: the second origin, `[source::]` -
// its key, apply and replace (never together with `meeting::`), resolving it, and the round trip.
import {applyProvenance, applySource, resolveSource, sourceKey, sourceLabel, sourceName} from '../../src/domain/provenance';
import {parseTasksSpan, serializeTaskLine} from '../../src/domain/markdown';

const parseTaskLine = (line: string) => parseTasksSpan(`## Tasks\n${line}\n`).tasks[0];

const ROOT = '/storage/emulated/0/Note';

describe('sourceKey', () => {
  it('is the note path below the Note root without its extension or page', () => {
    expect(sourceKey(`${ROOT}/1 Projects/Garden renovation/Ideas.note`, ROOT)).toBe('1 Projects/Garden renovation/Ideas');
    expect(sourceKey(`${ROOT}/1 Projects/Garden renovation/Ideas.note#page=3`, `${ROOT}/`)).toBe('1 Projects/Garden renovation/Ideas');
  });

  it('leaves out what would end the field or read as a tag, and nothing outside the root', () => {
    expect(sourceKey(`${ROOT}/Notes/[draft] #1.note`, ROOT)).toBe('Notes/draft 1');
    expect(sourceKey('/storage/emulated/0/Document/Book.pdf', ROOT)).toBeNull();
  });
});

describe('applySource and applyProvenance', () => {
  it('writes [source::] after the other fields', () => {
    expect(applySource('Order soil [created:: 2026-11-11]', 'Notes/Ideas')).toBe('Order soil [created:: 2026-11-11] [source:: Notes/Ideas]');
  });

  it('never leaves both: each replaces the other', () => {
    const withSource = applySource('Order soil', 'Notes/Ideas');
    expect(applyProvenance(withSource, '2026-11-11 Sparring Jordan sparring/jordan')).toBe('Order soil [meeting:: 2026-11-11 Sparring Jordan sparring/jordan]');
    expect(applySource('Order soil [meeting:: 2026-11-11 Retro]', 'Notes/Ideas')).toBe('Order soil [source:: Notes/Ideas]');
  });

  it('labels the grey line by the note\'s name', () => {
    expect(sourceName('1 Projects/Garden renovation/Ideas')).toBe('Ideas');
    expect(sourceLabel('Ideas')).toBe('↳ from Ideas');
  });
});

describe('resolveSource', () => {
  const candidates = [
    {itemPath: `${ROOT}/1 Projects/Garden renovation`, notePath: 'Todos/Order soil.note', entry: 'order-soil'},
    {itemPath: `${ROOT}/1 Projects/Garden renovation`, notePath: '', entry: 'no-note'},
  ];

  it('finds the todo whose own note it is', () => {
    expect(resolveSource('1 Projects/Garden renovation/Todos/Order soil', candidates, ROOT)).toEqual({kind: 'todo', entry: 'order-soil'});
  });

  it('else names the note', () => {
    expect(resolveSource('1 Projects/Garden renovation/Ideas', candidates, ROOT)).toEqual({kind: 'file', name: 'Ideas'});
  });
});

describe('a todo line with [source::]', () => {
  it('reads and writes it unchanged, and older lines without it stay as they are', () => {
    const line = '- [ ] Sketch the beds #garden [created:: 2026-11-11] [source:: 1 Projects/Garden renovation/Ideas]';
    const task = parseTaskLine(line)!;
    expect(task.fields.source).toBe('1 Projects/Garden renovation/Ideas');
    expect(task.fields.meeting).toBeNull();
    expect(serializeTaskLine(task)).toBe(line);
    const old = '- [ ] Order soil [meeting:: 2026-10-14 Sparring Jordan sparring/jordan] [created:: 2026-10-14]';
    expect(serializeTaskLine(parseTaskLine(old)!)).toBe(old);
  });
});
