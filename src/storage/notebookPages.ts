/**
 * One page index per notebook file
 * (docs/dev/history/technical-design-engage-page-owner.md §3.1): every page's
 * keywords (one `getKeyWords` call, also the page count) and every heading
 * (one `getTitles` call), cached in memory per file and modification time.
 * The Notebook tab's Contents (storage/notebookContents.ts), Engage and
 * Capture (storage/pageSection.ts) share one read, whatever the Contents
 * switch says.
 *
 * A heading's typed text needs the page's elements: `headingTextsOf` reads
 * them with one `getElements` per page, only when asked, and memoizes the
 * result in the same entry. The cache is rebuildable from the file at any
 * time; a file whose modification time is unknown is never cached. Logs
 * counts, hit/miss and ms - never headings or file names.
 */
import {headingText, PageElementForHeading, PageRect} from '../domain/notebookContents';
import {PageKeyword} from '../domain/sharedNotePages';
import {getElements, statFiles} from '../supernote/fileSystem';
import {ElementWithTitle, getTitles, NoteTitle} from '../supernote/noteTitles';
import {recycleElements} from '../supernote/sdkElements';
import {log} from '../utils/log';
import {readAllKeywords} from './sharedNotePages';

/** One heading as getTitles reports it: its page (0-based), top, rectangle and the `numInPage`s it covers. */
export interface IndexTitle {
  page: number;
  y: number;
  rect: PageRect;
  trail: number[];
}

export interface NotebookPageIndex {
  /** The file's modification time; -1 when unknown. */
  mtimeMs: number;
  totalPages: number;
  keywords: PageKeyword[];
  titles: IndexTitle[];
}

interface CachedIndex {
  index: NotebookPageIndex;
  /** Per page: the typed text under each of its headings, in index order (null: handwriting). */
  headings: Map<number, Array<string | null>>;
}

const cache = new Map<string, CachedIndex>();

/** How many files the page index holds (the debug bundle's count). */
export function cachedPageIndexCount(): number {
  return cache.size;
}

/** A heading's rectangle as getTitles reports it. */
export function titleRect(title: Pick<NoteTitle, 'X' | 'Y' | 'width' | 'height'>): PageRect {
  return {left: title.X, top: title.Y, right: title.X + title.width, bottom: title.Y + title.height};
}

/** A page's elements as domain/notebookContents.ts's `headingText` reads them. */
export function headingElementsOf(elements: readonly ElementWithTitle[]): PageElementForHeading[] {
  return elements.map(el => ({
    numInPage: el.numInPage,
    textbox: el.textBox?.textRect ? {rect: el.textBox.textRect, text: el.textBox.textContentFull ?? ''} : null,
    title: el.title ? {rect: titleRect(el.title), trail: el.title.controlTrailNums ?? []} : null,
  }));
}

async function readIndex(path: string, mtimeMs: number): Promise<NotebookPageIndex> {
  const start = Date.now();
  const {keywords, totalPages} = await readAllKeywords(path);
  const titles = await getTitles(path, Array.from({length: Math.max(0, totalPages)}, (_, i) => i));
  const index: NotebookPageIndex = {
    mtimeMs,
    totalPages,
    keywords,
    titles: titles.map(t => ({page: t.page, y: t.Y, rect: titleRect(t), trail: t.controlTrailNums ?? []})),
  };
  log('NotebookPages: index miss', `${totalPages} pages`, `${keywords.length} keywords`, `${titles.length} titles`, `${Date.now() - start} ms`);
  return index;
}

/**
 * The page index of the notebook at `path`: from the cache while the file's
 * modification time is unchanged, else read again. Throws when the note
 * can't be read; every caller has a fallback of its own.
 */
export async function loadPageIndex(path: string): Promise<NotebookPageIndex> {
  const start = Date.now();
  const stat = (await statFiles([path]))?.[0];
  const mtimeMs = stat?.exists ? stat.lastModified : -1;
  const hit = cache.get(path);
  if (hit && mtimeMs >= 0 && hit.index.mtimeMs === mtimeMs) {
    log('NotebookPages: index hit', `${hit.index.totalPages} pages`, `${Date.now() - start} ms`);
    return hit.index;
  }
  const index = await readIndex(path, mtimeMs);
  if (mtimeMs >= 0) cache.set(path, {index, headings: new Map()});
  else cache.delete(path);
  return index;
}

/**
 * The typed text under each heading of `page`, in the order the index lists
 * that page's headings; null for a handwritten one. One `getElements` call
 * per page, memoized with the index it was read for. Throws when the page
 * can't be read.
 */
export async function headingTextsOf(path: string, index: NotebookPageIndex, page: number): Promise<Array<string | null>> {
  const entry = cache.get(path);
  const memo = entry && entry.index === index ? entry.headings : null;
  const known = memo?.get(page);
  if (known) return known;
  const pageTitles = index.titles.filter(t => t.page === page);
  if (pageTitles.length === 0) return [];
  const elements = await getElements(page, path);
  let texts: Array<string | null>;
  try {
    const onPage = headingElementsOf(elements);
    texts = pageTitles.map(t => headingText({rect: t.rect, trail: t.trail}, onPage));
  } finally {
    recycleElements(elements);
  }
  memo?.set(page, texts);
  log('NotebookPages: headings read', `${pageTitles.length} titles`, `${texts.filter(t => t !== null).length} typed`);
  return texts;
}

/** The typed text of the topmost heading on `page`, or null (handwritten, or no heading). */
export async function headingTextOf(path: string, index: NotebookPageIndex, page: number): Promise<string | null> {
  const pageTitles = index.titles.filter(t => t.page === page);
  if (pageTitles.length === 0) return null;
  const texts = await headingTextsOf(path, index, page);
  let top = 0;
  pageTitles.forEach((t, i) => {
    if (t.y < pageTitles[top].y) top = i;
  });
  return texts[top] ?? null;
}
