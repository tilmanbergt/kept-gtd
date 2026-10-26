/**
 * Reading a home notebook's Contents
 * (docs/dev/history/technical-design-home-notebooks.md §3.5) on top of the
 * notebook's page index (storage/notebookPages.ts,
 * docs/dev/history/technical-design-engage-page-owner.md §3.1): its keywords
 * and headings come from one cached read per file and modification time, and
 * the typed text under a heading is looked up only on pages gtdpara doesn't
 * title itself. The entries are built from it each time
 * (domain/notebookContents.ts), so a renamed todo shows at once.
 */
import {buildContents, ContentsEntry, ContentsItem, ContentsTitle, gtdparaPages} from '../domain/notebookContents';
import {todayIso} from '../domain/meetingTime';
import {cachedPageIndexCount, headingTextsOf, loadPageIndex} from './notebookPages';

/** How many files the Contents read from: the page index's count (one cache for both). */
export const cachedContentsCount = cachedPageIndexCount;

/**
 * The Contents of the notebook at `path` for `item` (its Project or Area).
 * Throws when the note can't be read; the caller says so in the status slot.
 */
export async function loadContents(path: string, item: ContentsItem): Promise<ContentsEntry[]> {
  const today = todayIso();
  const index = await loadPageIndex(path);
  const own = gtdparaPages(index.keywords, item, today);
  const titles: ContentsTitle[] = [];
  const otherPages: number[] = [];
  for (const title of index.titles) {
    if (own.has(title.page)) titles.push({page: title.page, y: title.y, text: null});
    else if (!otherPages.includes(title.page)) otherPages.push(title.page);
  }
  for (const page of otherPages) {
    const texts = await headingTextsOf(path, index, page);
    index.titles.filter(t => t.page === page).forEach((t, i) => titles.push({page, y: t.y, text: texts[i] ?? null}));
  }
  return buildContents({keywords: index.keywords, titles, item, today});
}
