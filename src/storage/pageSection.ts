/**
 * The section a note page belongs to, for Engage and Capture
 * (docs/dev/history/technical-design-engage-page-owner.md §3.3): an entry's
 * own note needs no read; any other note walks back over its page index
 * (storage/notebookPages.ts, cached per file and modification time) to the
 * nearest page with a claim (domain/pageSection.ts). A heading section also
 * gets its typed text. When the index can't be read, the single-page lookup
 * (storage/notePageEntry.ts) answers instead, so neither Engage nor Capture
 * fails because of it (P7). Logs kinds, distances and ms - never texts or
 * paths.
 */
import {ALL_PAGE_ENTRY_KINDS, notePageCandidates, PageEntrySource} from '../domain/notePageEntry';
import {claimOfPage, PageSection, sectionOfPage} from '../domain/pageSection';
import {errorMessage} from '../utils/errorMessage';
import {log, logWarn} from '../utils/log';
import {headingTextOf, loadPageIndex} from './notebookPages';
import {entryForNotePage} from './notePageEntry';

export interface PageSectionResult<R> {
  section: PageSection<R> | null;
  /** Open page minus section page; 0 without a section. */
  distance: number;
  /** A heading section's typed text (null: handwritten); null for every other claim. */
  headingText: string | null;
  /** False for an own note and for the single-page fallback. */
  indexRead: boolean;
  /** The whole file is one entry's own note. */
  ownNote: boolean;
}

const NONE = {section: null, distance: 0, headingText: null} as const;

/** Today's single-page lookup: the entry whose page this is, as a section at distance 0. */
async function singlePage<R extends {path: string}>(absPath: string, page: number | null, sources: ReadonlyArray<PageEntrySource<R>>): Promise<PageSectionResult<R>> {
  const entry = await entryForNotePage(absPath, page, sources);
  if (!entry) return {...NONE, indexRead: false, ownNote: false};
  return {section: {page: page ?? 0, claim: {kind: 'entry', entry, cancelled: false, reflection: false}}, distance: 0, headingText: null, indexRead: false, ownNote: false};
}

/** The section of `absPath`'s 0-based `page` among the entries of `sources`. Never throws. */
export async function pageSectionOf<R extends {path: string}>(
  absPath: string,
  page: number | null,
  sources: ReadonlyArray<PageEntrySource<R>>,
): Promise<PageSectionResult<R>> {
  const plain = notePageCandidates(absPath, page, sources);
  if (plain.ownNote && plain.direct) {
    const claim = {kind: 'entry' as const, entry: plain.direct, cancelled: false, reflection: false};
    return {section: {page: page ?? 0, claim}, distance: 0, headingText: null, indexRead: false, ownNote: true};
  }
  if (page === null) return singlePage(absPath, page, sources);
  const start = Date.now();
  let index;
  try {
    index = await loadPageIndex(absPath);
  } catch (e) {
    logWarn('pageSection: index not read', errorMessage(e));
    return singlePage(absPath, page, sources);
  }
  const all = notePageCandidates(absPath, page, sources, ALL_PAGE_ENTRY_KINDS, {includeCancelled: true});
  const input = {keywords: index.keywords, titles: index.titles, pageLinks: all.pageLinks, sharedCandidates: all.shared};
  const section = sectionOfPage(page, p => claimOfPage(p, input));
  let headingText: string | null = null;
  if (section?.claim.kind === 'heading') {
    try {
      headingText = await headingTextOf(absPath, index, section.page);
    } catch (e) {
      // The heading still starts the section; without its text it reads as handwritten.
      logWarn('pageSection: heading text not read', errorMessage(e));
    }
  }
  const distance = section ? page - section.page : 0;
  log('pageSection: found', `claim=${section?.claim.kind ?? 'none'}`, `distance=${distance}`, `${Date.now() - start} ms`);
  return {section, distance, headingText, indexRead: true, ownNote: false};
}
