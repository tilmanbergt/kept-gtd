/**
 * Shared pagination logic (docs/dev/history/technical-design-pagination-edit-reuse.md §2)
 * - every list in the app pages through a fixed set of rows instead of
 * scrolling, so e-ink only ever has to redraw one fixed-size box rather than
 * an arbitrary, growing scroll region.
 *
 * `usePagedByHeight` (docs/dev/history/technical-design-pagination-fixed-height.md)
 * is the app's pagination hook - fits as many rows as their real, per-row
 * `rowHeight` allows into a fixed pixel `viewportHeight`, so the box's total
 * height never varies with content. The viewport is measured
 * (ui/PagedSection.tsx) or passed by the caller.
 *
 * Current page is preserved across data reloads (add/save/toggle-done) and
 * only clamped down if it's now past the new last page (e.g. the last item
 * on the last page was deleted) - never auto-advanced just because the
 * underlying list changed shape. Callers don't need to reset page on their
 * own; `usePagedByHeight` re-derives `pageItems` whenever `rows` changes.
 *
 * The one exception is the optional `resetKey` param: passing a value that
 * changes jumps back to page 0 - for the rare case where `rows` isn't the
 * same list mutating in place but a genuinely different list (e.g.
 * screens/ItemDetail.tsx's file browser drilling into a different folder -
 * unlike an add/save, staying on "page 2" there would be paging into a
 * folder the user never scrolled into). Omit it (the default) to keep the
 * preserve-current-page behavior above.
 *
 * `jumpTo` (technical-design-linked-files.md §5/§9.4) is the same idea, one
 * step more specific: instead of always landing on page 0, jump to whatever
 * page contains a particular item - ui/FileBrowserPane.tsx's `locating` mode
 * needs this to land on the page holding the linked file being auto-
 * navigated to, not necessarily page 0 of that folder. Same opt-in shape as
 * `resetKey` (an optional param) - the caller finds the real item index itself (e.g.
 * `array.findIndex(...)`) and passes it straight through; see the `JumpTo`
 * doc comment below. If both `resetKey` and `jumpTo.key` change on the same
 * render, `jumpTo` wins (its effect runs after resetKey's).
 */
import {useEffect, useRef, useState} from 'react';

/** A `jumpTo` value, used by `usePagedByHeight` below - see the module doc
 * comment. `key` is what's watched for changes (only a *change* triggers
 * the jump, same as `resetKey`); `index` is the real item index to land on
 * (not a page number - the hook works out which page that index falls on
 * itself, by walking rows from the start since row heights vary - see that
 * hook's own jumpTo effect). A caller with a real item index in hand (e.g.
 * `array.findIndex(...)`) passes it directly. */
export interface JumpTo {
  key: string | number;
  index: number;
}

export interface PagedByHeight<T> {
  page: number;
  /** Index (into `rows`) of the first row on the current page - lets a caller keep that row in view across a change that re-flows the pages (ui/MeetingList.tsx's layout switch). */
  startIndex: number;
  pageItems: T[];
  canPrev: boolean;
  canNext: boolean;
  goPrev: () => void;
  goNext: () => void;
}

/**
 * The app's pagination hook (docs/dev/history/technical-design-pagination-fixed-height.md
 * §1.1) - fits as many rows as their real `rowHeight` allows into a fixed-
 * height box, instead of a fixed row count. Used by ui/PagedSection.tsx
 * and ui/FileBrowserPane.tsx.
 *
 * No `totalPages` - deliberately; the page count is never computed in
 * advance. `pageStarts` below is grown lazily, one
 * boundary at a time, only for pages actually visited: a very long list
 * costs no more per page-turn than walking that one page's worth of rows,
 * never the whole list.
 */
export function usePagedByHeight<T>(
  rows: T[],
  rowHeight: (row: T) => number,
  viewportHeight: number,
  resetKey?: string | number,
  jumpTo?: JumpTo | null,
): PagedByHeight<T> {
  const [page, setPage] = useState(0);
  // pageStarts[i] = the row-index page i starts at. Seeded [0]; every later
  // boundary is discovered on the way forward (goNext below) and kept, so
  // paging back-and-forth over the same pages never re-walks rows it's
  // already measured once.
  const pageStartsRef = useRef<number[]>([0]);

  // Same resetKey convention the module doc comment describes - an opt-in
  // "this is genuinely a different list now" signal (e.g. a different
  // folder, a different filter), not fired by an ordinary reload of the
  // same list.
  useEffect(() => {
    if (resetKey !== undefined) {
      pageStartsRef.current = [0];
      setPage(0);
    }
  }, [resetKey]);

  // `jumpTo` (ui/FileBrowserPane.tsx's `locating` mode -
  // see the module doc comment) - runs after the resetKey effect above, same
  // "jumpTo wins if both fire on the same render" ordering the module doc
  // comment describes. Unlike a fixed page size, a target row's
  // page here can only be found by actually walking rows from the start and
  // re-running the exact same greedy fill the main render loop below uses,
  // page by page, until the walk passes `jumpTo.index` - there's no formula
  // shortcut once row heights vary. This also fully repopulates
  // `pageStartsRef` up to and including the landing page, so paging forward/
  // back from there afterward reuses those boundaries instead of re-walking
  // them (same as any other page reached via goNext). Cost is bounded by
  // however many rows precede the target, not by the whole list - the same
  // "cheap for the pages actually visited" property the rest of this hook
  // already has, not a new scan-everything cost.
  useEffect(() => {
    if (!jumpTo) return;
    const boundaries: number[] = [0];
    let landingPage = 0;
    let start = 0;
    while (true) {
      let used = 0;
      let count = 0;
      for (let i = start; i < rows.length; i++) {
        const h = rowHeight(rows[i]);
        if (count > 0 && used + h > viewportHeight) break;
        used += h;
        count += 1;
      }
      const nextStart = start + count;
      landingPage = boundaries.length - 1;
      if (jumpTo.index < nextStart || nextStart >= rows.length) break;
      boundaries.push(nextStart);
      start = nextStart;
    }
    pageStartsRef.current = boundaries;
    setPage(landingPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTo?.key]);

  // Clamp down (never up/forward) if the page we were on doesn't exist any more -
  // computed rather than corrected via setState during render (this hook
  // self-heals on the next goPrev/goNext).
  let clampedPage = page;
  while (clampedPage > 0 && (pageStartsRef.current[clampedPage] ?? 0) >= rows.length) {
    clampedPage -= 1;
  }

  // Walks forward from this page's start, summing rowHeight until the next
  // row would exceed viewportHeight. Recomputed every render (cheap -
  // bounded by however many rows fit on one page, not by rows.length) so a
  // live edit to `rows` (a task toggled done, a title shortened) is
  // reflected immediately without extra invalidation logic. Always
  // includes at least one row, even an individually oversize one -
  // PagedSection's own `overflow: hidden` clips it rather than the page
  // rendering nothing.
  const start = pageStartsRef.current[clampedPage] ?? 0;
  const pageItems: T[] = [];
  let usedHeight = 0;
  for (let i = start; i < rows.length; i++) {
    const h = rowHeight(rows[i]);
    if (pageItems.length > 0 && usedHeight + h > viewportHeight) break;
    pageItems.push(rows[i]);
    usedHeight += h;
  }

  const nextStart = start + pageItems.length;
  const canNext = nextStart < rows.length;
  const canPrev = clampedPage > 0;

  const goNext = () => {
    if (!canNext) return;
    // Record this boundary the first time it's crossed; a later revisit
    // (forward again after paging back) reuses it instead of re-walking.
    if (pageStartsRef.current[clampedPage + 1] === undefined) {
      pageStartsRef.current[clampedPage + 1] = nextStart;
    }
    setPage(clampedPage + 1);
  };
  const goPrev = () => {
    if (canPrev) setPage(clampedPage - 1);
  };

  return {page: clampedPage, startIndex: start, pageItems, canPrev, canNext, goPrev, goNext};
}

/**
 * How many pages `rows` take in a box of `viewportHeight`, with the same greedy fill as
 * `usePagedByHeight` (at least one row per page). Walks every row, so only lists that show
 * a page count use it (ui/PagedSection.tsx's nav row).
 */
export function pageCount<T>(rows: readonly T[], rowHeight: (row: T) => number, viewportHeight: number): number {
  if (rows.length === 0) return 1;
  let pages = 1;
  let used = 0;
  let count = 0;
  for (const row of rows) {
    const h = rowHeight(row);
    if (count > 0 && used + h > viewportHeight) {
      pages += 1;
      used = 0;
      count = 0;
    }
    used += h;
    count += 1;
  }
  return pages;
}
