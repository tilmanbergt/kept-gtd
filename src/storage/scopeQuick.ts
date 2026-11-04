/**
 * Sets the scope of a project or area from the header's quick field.
 */
import {dataFilePath} from './projectFile';
import {CachedItem} from './dataCache';
import {readTextFile, writeTextFile} from '../supernote/fileSystem';

/** Replaces the `scope:` line of the item's file with `scope`. */
export async function setScopeQuick(item: CachedItem, scope: string): Promise<void> {
  const path = dataFilePath(item.kind, item.path);
  const content = (await readTextFile(path)) ?? '';
  const lines = content.split('\n').filter(line => !line.startsWith('scope:'));
  lines.splice(1, 0, `scope: ${scope}`);
  await writeTextFile(path, lines.join('\n'));
}
