/**
 * Which section a note page belongs to
 * (docs/dev/history/technical-design-engage-page-owner.md §3.2, §3.4, §3.7):
 * what claims a page on its own (an entry's page link or keyword, the Home
 * page, a loop page, a heading), the walk back to the nearest page with a
 * claim (P2), whether a file is a Project's/Area's home notebook (P1), and
 * the section's title for Engage's section line (P9). Pure:
 * storage/pageSection.ts reads the note's page index.
 */
import {formatDate} from './dateFormat';
import {HANDWRITTEN_SECTION} from './engageText';
import {HOME_PAGE_KEYWORD, homeNotebookYears} from './homeNotebook';
import {LOOP_PAGE_KEYWORD_PREFIX} from './loops';
import {loopPageLabel, meetingPageLabel, todoPageLabel} from './notebookContents';
import {isCancelledEntry, NotePageCandidates, pageEntryKeyword, PageEntry, sharedPageHit} from './notePageEntry';
import {PageKeyword} from './sharedNotePages';

export type PageClaim<R> =
  /** A todo's or meeting's page; `reflection` when it is the meeting's Reflection page. */
  | {kind: 'entry'; entry: PageEntry<R>; cancelled: boolean; reflection: boolean}
  | {kind: 'home'}
  | {kind: 'loop'; tag: string}
  /** A Supernote title without a Kept keyword: its topmost one's position. */
  | {kind: 'heading'; y: number}
  | null;

export type SectionClaim<R> = Exclude<PageClaim<R>, null>;

/** What one page's claim is read from: the index's keywords and titles, the entries' page links and shared candidates. */
export interface PageClaimInput<R> {
  keywords: readonly PageKeyword[];
  titles: ReadonlyArray<{page: number; y: number}>;
  pageLinks: NotePageCandidates<R>['pageLinks'];
  sharedCandidates: NotePageCandidates<R>['shared'];
}

function sameEntry<R>(a: PageEntry<R>, b: PageEntry<R>): boolean {
  if (a.item !== b.item) return false;
  return a.kind === 'task' ? b.kind === 'task' && a.taskIndex === b.taskIndex : b.kind === 'meeting' && a.meetingIndex === b.meetingIndex;
}

/**
 * The claim of one page (0-based), first hit wins: an entry's `#page=N`
 * link; an entry's keyword (stored, current, or its meeting's reflection
 * keyword); `home`; `loop …`; the topmost title; else null. A page with
 * both a Kept keyword and a title is the keyword's. A cancelled entry's page
 * still claims (P8); a live entry wins over a cancelled one with the same
 * keyword.
 */
export function claimOfPage<R>(page: number, input: PageClaimInput<R>): PageClaim<R> {
  const link = input.pageLinks.find(l => l.page === page);
  if (link) return {kind: 'entry', entry: link.entry, cancelled: isCancelledEntry(link.entry), reflection: false};
  const onPage = input.keywords.filter(k => k.page === page).map(k => k.keyword);
  if (onPage.length > 0 && input.sharedCandidates.length > 0) {
    const live = input.sharedCandidates.filter(c => !isCancelledEntry(c));
    const hit = sharedPageHit(live, onPage) ?? sharedPageHit(input.sharedCandidates, onPage);
    if (hit) {
      // A meeting hit without its own keyword on the page is its Reflection page.
      const ownPage = input.sharedCandidates.some(c => sameEntry(c, hit) && (onPage.includes(c.keyword) || onPage.includes(pageEntryKeyword(c))));
      return {kind: 'entry', entry: hit, cancelled: isCancelledEntry(hit), reflection: hit.kind === 'meeting' && !ownPage};
    }
  }
  if (onPage.includes(HOME_PAGE_KEYWORD)) return {kind: 'home'};
  const loop = onPage.find(k => k.startsWith(LOOP_PAGE_KEYWORD_PREFIX));
  if (loop) return {kind: 'loop', tag: loop.slice(LOOP_PAGE_KEYWORD_PREFIX.length).trim()};
  const titles = input.titles.filter(t => t.page === page);
  if (titles.length > 0) return {kind: 'heading', y: Math.min(...titles.map(t => t.y))};
  return null;
}

export interface PageSection<R> {
  /** The section page, 0-based. */
  page: number;
  claim: SectionClaim<R>;
}

/** The nearest page at or before `openPage` with a claim (P2), or null when none has one. */
export function sectionOfPage<R>(openPage: number, claimAt: (page: number) => PageClaim<R>): PageSection<R> | null {
  for (let page = openPage; page >= 0; page--) {
    const claim = claimAt(page);
    if (claim) return {page, claim};
  }
  return null;
}

/** What `isHomeNotebookFile` needs of the file, its enclosing item and the Default notebook. */
export interface HomeNotebookFileInput {
  absPath: string;
  /** The enclosing Project's/Area's folder, absolute. */
  itemPath: string;
  itemAbbrev: string;
  /** The Default setup's notebook (`noteSetupDefaults.notebook`); null without one. */
  notebook: {name: string; folder: string} | null;
  /** YYYY-MM-DD. */
  today: string;
}

/**
 * Whether `absPath` is the item's home notebook of this year or an earlier
 * one (P1): it lies in the item's Default notebook folder and its name is
 * one the item's home notebook has in some year. No listing: the open file's
 * own name is the only candidate.
 */
export function isHomeNotebookFile(input: HomeNotebookFileInput): boolean {
  if (!input.notebook) return false;
  const itemPath = input.itemPath.replace(/\/+$/, '');
  const folder = input.notebook.folder ? `${itemPath}/${input.notebook.folder}` : itemPath;
  const slash = input.absPath.lastIndexOf('/');
  if (input.absPath.slice(0, slash) !== folder) return false;
  const fileName = input.absPath.slice(slash + 1);
  const itemName = itemPath.slice(itemPath.lastIndexOf('/') + 1);
  const thisYear = Number(input.today.slice(0, 4));
  const years = homeNotebookYears({template: input.notebook.name, itemName, itemAbbrev: input.itemAbbrev, date: input.today}, [fileName], thisYear);
  return years.some(y => `${y.fileName}.note` === fileName);
}

/** A section's title for the section line: its text, and a date for a meeting's page ('' otherwise). */
export interface SectionTitle {
  text: string;
  detail: string;
}

/** What Engage's section line shows: the section page (0-based), how far back it is, its title. */
export interface SectionInfo {
  page: number;
  distance: number;
  title: SectionTitle;
}

/**
 * The section's title (P9): a todo's page label, a meeting's title with its
 * date ("Reflection · …" for its Reflection page), the notebook owner's name
 * for the Home page, the loop page's label, a heading's first typed line or
 * "Handwritten section". The labels are the Contents' (domain/notebookContents.ts).
 */
export function sectionTitleOf<R>(claim: SectionClaim<R>, input: {ownerName: string; headingText: string | null; today: string}): SectionTitle {
  switch (claim.kind) {
    case 'entry': {
      const {entry} = claim;
      if (entry.kind === 'task') return {text: todoPageLabel(entry.task), detail: ''};
      const title = meetingPageLabel(entry.meeting);
      return {text: claim.reflection ? `Reflection · ${title}` : title, detail: formatDate(entry.meeting.date, input.today)};
    }
    case 'home':
      return {text: input.ownerName, detail: ''};
    case 'loop':
      return {text: loopPageLabel(`${LOOP_PAGE_KEYWORD_PREFIX}${claim.tag}`), detail: ''};
    case 'heading': {
      const typed = input.headingText?.split('\n')[0].trim();
      return {text: typed || HANDWRITTEN_SECTION, detail: ''};
    }
  }
}
