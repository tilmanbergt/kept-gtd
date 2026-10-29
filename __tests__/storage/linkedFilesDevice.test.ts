jest.mock('../../src/supernote/fileSystem', () => ({listFolderEntries: jest.fn(), openPath: jest.fn(), getRememberedLaunchNotePath: jest.fn()}));
jest.mock('../../src/supernote/currentPage', () => ({getCurrentPageNum: jest.fn()}));

import {DEFAULT_SETTINGS, resolvePaths} from '../../src/domain/settings';
import {linkRootPath, locateLinkedFile, pickedPath, toLinkedFile} from '../../src/storage/linkedFiles';

const paths = resolvePaths(DEFAULT_SETTINGS);
const item = `${paths.projects}/Garden renovation`;

describe('linked files outside Note (docs/dev/history/technical-design-easy-start.md §6)', () => {
  it('pickedPath joins a relative pick and keeps an absolute one with its page', () => {
    expect(pickedPath('/storage/emulated/0', 'Document/Book.pdf')).toBe('/storage/emulated/0/Document/Book.pdf');
    expect(pickedPath('/storage/emulated/0/', '/storage/1234-ABCD/Books/Guide.epub#page=3')).toBe('/storage/1234-ABCD/Books/Guide.epub#page=3');
  });
  it('the device root is the internal storage', () => {
    expect(linkRootPath('device', paths, item, null)).toBe('/storage/emulated/0');
  });
  it('outside the base the link stays absolute, inside it relative (L5)', () => {
    expect(toLinkedFile(paths, '/storage/emulated/0/Document/Book.pdf')).toBe('/storage/emulated/0/Document/Book.pdf');
    expect(toLinkedFile(paths, `${item}/Ideas.note#page=2`)).toBe('1 Projects/Garden renovation/Ideas.note#page=2');
  });
  it('locate finds a file on the internal storage on the Device tab, an SD card nowhere', () => {
    expect(locateLinkedFile(paths, item, '/storage/emulated/0/Document/Garden/Book.pdf#page=12')).toEqual({root: 'device', folderPath: 'Document/Garden', fileName: 'Book.pdf'});
    expect(locateLinkedFile(paths, item, '/storage/1234-ABCD/Guide.epub')).toBeNull();
    expect(locateLinkedFile(paths, item, '1 Projects/Garden renovation/plan.pdf')).toEqual({root: 'item', folderPath: '', fileName: 'plan.pdf'});
  });
});
