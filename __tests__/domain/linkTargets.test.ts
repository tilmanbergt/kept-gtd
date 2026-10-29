import {deviceEntryVisible, thisFileStartsOn, thisFileTargets} from '../../src/domain/linkTargets';

describe('thisFileTargets', () => {
  it('a PDF with its page: both targets, the page 1-based like a lasso link', () => {
    expect(thisFileTargets('/storage/emulated/0/Document/Book.pdf', 11)).toEqual({
      path: '/storage/emulated/0/Document/Book.pdf',
      label: 'Book.pdf',
      kind: 'document',
      page: 11,
      withPage: '/storage/emulated/0/Document/Book.pdf#page=12',
      withoutPage: '/storage/emulated/0/Document/Book.pdf',
    });
  });
  it('a note is a note; without a readable page only the plain target', () => {
    const t = thisFileTargets('/storage/emulated/0/Note/1 Projects/Garden renovation/Ideas.note', null);
    expect(t).toMatchObject({kind: 'note', page: null, withPage: null, label: 'Ideas.note'});
  });
  it('nothing from Home or from a data file', () => {
    expect(thisFileTargets(null, 3)).toBeNull();
    expect(thisFileTargets('', 3)).toBeNull();
    expect(thisFileTargets('/storage/emulated/0/Note/1 Projects/Garden renovation/project.txt', 0)).toBeNull();
  });
  it('a negative page counts as none', () => {
    expect(thisFileTargets('/x/Book.epub', -1)?.withPage).toBeNull();
  });
  it('starts on for a document, off for a note', () => {
    expect(thisFileStartsOn('document')).toBe(true);
    expect(thisFileStartsOn('note')).toBe(false);
  });
});

describe('deviceEntryVisible', () => {
  it('on the internal storage only the Supernote folders', () => {
    expect(['Document', 'Download', 'EXPORT', 'INBOX', 'MyStyle', 'Note', 'SCREENSHOT'].every(n => deviceEntryVisible(n, true))).toBe(true);
    expect(['Android', 'DCIM', 'Alarms', 'Kiwix', '.thumbnails'].some(n => deviceEntryVisible(n, true))).toBe(false);
  });
  it('on an SD card everything but hidden and system folders', () => {
    expect(deviceEntryVisible('Books', false)).toBe(true);
    expect(deviceEntryVisible('Android', false)).toBe(false);
    expect(deviceEntryVisible('LOST.DIR', false)).toBe(false);
    expect(deviceEntryVisible('.trash', false)).toBe(false);
  });
});
