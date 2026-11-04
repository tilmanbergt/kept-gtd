/**
 * Sets the scope of a project or area from the header's quick field.
 */
import {dataFilePath} from './projectFile';
import {CachedItem} from './dataCache';
import {readTextFile, writeTextFile} from '../supernote/fileSystem';
import {writeDataFile} from './dataFileWrite';
import {DATA_FILE_HEADINGS, writeSectionLines} from '../domain/markdown';

/** Replaces the `scope:` line of the item's file with `scope`. */
export async function setScopeQuick(item: CachedItem, scope: string): Promise<void> {
  const path = dataFilePath(item.kind, item.path);
  const content = (await readTextFile(path)) ?? '';
  const lines = content.split('\n').filter(line => !line.startsWith('scope:'));
  lines.splice(1, 0, `scope: ${scope}`);
  await writeTextFile(path, lines.join('\n'));
}

/** The same change through the shared write path: only the Scope section, outside edits kept. */
export async function setScopeSafely(item: CachedItem, scope: string): Promise<string> {
  const apply = (raw: string): string => writeSectionLines(raw, DATA_FILE_HEADINGS.scope, [scope]);
  return writeDataFile(item.kind, item.path, dataFilePath(item.kind, item.path), item.rawContent, {parts: [DATA_FILE_HEADINGS.scope], apply});
}
