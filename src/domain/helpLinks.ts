/**
 * Heading anchors of the help pages (docs/dev/history/technical-design-easy-start.md §2.2):
 * `page.md#heading-slug` opens a page at that heading, in the app and on
 * GitHub. One slug rule for the app (ui/HelpOverlay.tsx via
 * screens/useAppOverlays.tsx) and the link check of the help generator
 * (scripts/lib/userDocs.mjs loads this file). Pure.
 */
import {blockText, MarkdownBlock, parseMarkdownBlocks} from './markdownBlocks';

/**
 * GitHub's anchor for a heading's text: lowercase, everything but letters,
 * digits, spaces, `-` and `_` dropped, each space a `-` (runs of `-` stay, as
 * on GitHub). Letters are Latin ones (accents included), written as a range
 * rather than a Unicode property class so every JS engine reads it.
 */
export function headingSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u024f _-]/g, '')
    .replace(/ /g, '-');
}

/** Index of the first heading block whose slug is `anchor`, or -1 (then the page opens at its top). */
export function findAnchorBlock(blocks: MarkdownBlock[], anchor: string): number {
  return blocks.findIndex(b => b.kind === 'heading' && headingSlug(blockText(b)) === anchor);
}

/** The slugs of every heading of a page, in order - what a link's `#anchor` may name. */
export function pageAnchors(markdown: string): string[] {
  return parseMarkdownBlocks(markdown).flatMap(b => (b.kind === 'heading' ? [headingSlug(blockText(b))] : []));
}
