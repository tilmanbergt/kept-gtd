import {isHostCreateRefusal, launchKind, NOTE_CREATION_BLOCKED_TEXT, NoteCreationBlockedError, planFiles, planNeedsNewFile} from '../../src/domain/noteCreation';
import {NoteCreationPlan} from '../../src/domain/noteCreationPlan';

const plan = (kind: NoteCreationPlan['kind'], alternatives?: NoteCreationPlan[]): NoteCreationPlan => ({
  kind,
  file: 'x.note',
  absolutePath: '/storage/emulated/0/Note/x.note',
  setupName: null,
  ...(alternatives ? {alternatives} : {}),
});

describe('launchKind', () => {
  it('a .note is a note, any other file a document, no path unknown', () => {
    expect(launchKind('/storage/emulated/0/Note/Garden.note')).toBe('note');
    expect(launchKind('/storage/emulated/0/Note/Garden.NOTE')).toBe('note');
    expect(launchKind('/storage/emulated/0/Document/Book.pdf')).toBe('document');
    expect(launchKind('/storage/emulated/0/Document/Guide.epub')).toBe('document');
    expect(launchKind(null)).toBe('unknown');
    expect(launchKind(undefined)).toBe('unknown');
    expect(launchKind('')).toBe('unknown');
  });
});

describe('isHostCreateRefusal', () => {
  it('matches the host gate in any case, nothing else', () => {
    expect(isHostCreateRefusal('This app is not allowed to use this API. Please call a different API.')).toBe(true);
    expect(isHostCreateRefusal('this app is NOT ALLOWED TO USE THIS API')).toBe(true);
    expect(isHostCreateRefusal('Background template file does not exist')).toBe(false);
    expect(isHostCreateRefusal(null)).toBe(false);
  });
});

describe('NoteCreationBlockedError', () => {
  it('carries the sentence the status slot shows', () => {
    const e = new NoteCreationBlockedError();
    expect(e.message).toBe(NOTE_CREATION_BLOCKED_TEXT);
    expect(e.message).toBe("Supernote doesn't let plugins create notes when opened from a PDF or EPUB. Open Kept from a note to create this one.");
  });
});

describe('planNeedsNewFile', () => {
  const other = (kind: NoteCreationPlan['kind']): NoteCreationPlan => ({...plan(kind), absolutePath: '/storage/emulated/0/Note/y.note'});
  it('true when no offered file exists yet, whatever the plan kind', () => {
    expect(planNeedsNewFile(plan('new-own-file'), new Set())).toBe(true);
    expect(planNeedsNewFile(plan('new-reflection'), new Set())).toBe(true);
  });
  it('false when the file exists (a page is added, no new file)', () => {
    expect(planNeedsNewFile(plan('new-page'), new Set(['/storage/emulated/0/Note/x.note']))).toBe(false);
  });
  it('an alternative in an existing file keeps the plan on offer', () => {
    const p = plan('new-own-file', [other('new-page')]);
    expect(planFiles(p)).toEqual(['/storage/emulated/0/Note/x.note', '/storage/emulated/0/Note/y.note']);
    expect(planNeedsNewFile(p, new Set(['/storage/emulated/0/Note/y.note']))).toBe(false);
    expect(planNeedsNewFile(p, new Set())).toBe(true);
  });
});
