/**
 * Parses the small markdown subset used by CHANGELOG.md and the user docs
 * into blocks the app can render and page (ui/MarkdownBlocks.tsx;
 * docs/dev/history/technical-design-about-debug-experimental.md §3.5).
 *
 * Supported: `#`-`######` headings, `-`/`*`/`1.` list items (one nesting
 * level; wrapped continuation lines join the item), paragraphs,
 * `> quotes` (rendered as paragraphs), inline `**bold**`, `*italic*`, `` `code` `` and
 * `[text](url)` (a link to another help page, `page.md` or `page.md#heading`,
 * keeps its target as `link`; any other link shows as its text;
 * docs/dev/history/technical-design-easy-start.md §2.1), and fenced code blocks (lines between
 * two ``` fences, kept verbatim; long ones are split into chunks of
 * CODE_CHUNK_LINES so a pager can place them). Anything else is shown as
 * plain text.
 * Pure; no RN imports.
 */

export interface HelpLinkTarget {
  /** A docs/user page id (file name without `.md`). */
  page: string;
  /** A heading slug (domain/helpLinks.ts's headingSlug), or null for the page top. */
  anchor: string | null;
}

export type InlineSpan = {text: string; bold?: boolean; italic?: boolean; code?: boolean; link?: HelpLinkTarget};

/** The only link targets that stay links: a help page, optionally with a heading anchor. */
const PAGE_LINK = /^([a-z0-9-]+)\.md(?:#([a-z0-9-]+))?$/;

/** The help page a link target points to, or null for anything else (web addresses, images, other files). */
export function helpLinkTarget(target: string): HelpLinkTarget | null {
  const m = PAGE_LINK.exec(target);
  return m ? {page: m[1], anchor: m[2] ?? null} : null;
}

export type MarkdownBlock =
  | {kind: 'heading'; level: number; spans: InlineSpan[]}
  | {kind: 'item'; depth: number; marker: string; spans: InlineSpan[]}
  | {kind: 'paragraph'; spans: InlineSpan[]}
  | {kind: 'code'; lines: string[]};

/** Longest code block kept together; longer ones continue in the next block. */
export const CODE_CHUNK_LINES = 14;
const FENCE = /^\s*```/;

const HEADING = /^(#{1,6})\s+(.*)$/;
const ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

/** Plain or link spans of a text without bold or code: a page link keeps its target, other links become their text. */
function linkSpans(text: string, extra: {bold?: boolean; italic?: boolean}): InlineSpan[] {
  const spans: InlineSpan[] = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {spans.push({text: text.slice(last, m.index), ...extra});}
    const link = helpLinkTarget(m[2]);
    spans.push(link ? {text: m[1], ...extra, link} : {text: m[1], ...extra});
    last = m.index + m[0].length;
  }
  if (last < text.length) {spans.push({text: text.slice(last), ...extra});}
  return spans;
}

/** Splits one line of text into bold / italic / code / link / plain spans. A single `*` with a space after it ("5 * 3") stays text. */
export function parseInline(text: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*\s](?:[^*]*[^*\s])?)\*|`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {spans.push(...linkSpans(text.slice(last, m.index), {}));}
    if (m[2] !== undefined) {spans.push(...linkSpans(m[2], {bold: true}));}
    else if (m[3] !== undefined) {spans.push(...linkSpans(m[3], {italic: true}));}
    else {spans.push({text: m[4], code: true});}
    last = m.index + m[0].length;
  }
  if (last < text.length) {spans.push(...linkSpans(text.slice(last), {}));}
  // A link that stays text joins its neighbours, so a line without page links is the spans it always was.
  const merged: InlineSpan[] = [];
  for (const span of spans) {
    const prev = merged[merged.length - 1];
    if (prev && !prev.link && !span.link && !prev.code && !span.code && !!prev.bold === !!span.bold && !!prev.italic === !!span.italic) {
      merged[merged.length - 1] = {...prev, text: prev.text + span.text};
    } else {
      merged.push(span);
    }
  }
  return merged.length > 0 ? merged : [{text: ''}];
}

export function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  // The block being assembled from several lines (item or paragraph).
  let open: {kind: 'item'; depth: number; marker: string; text: string} | {kind: 'paragraph'; text: string} | null = null;

  const close = () => {
    if (!open) {return;}
    const spans = parseInline(open.text.trim());
    blocks.push(open.kind === 'item' ? {kind: 'item', depth: open.depth, marker: open.marker, spans} : {kind: 'paragraph', spans});
    open = null;
  };

  let code: string[] | null = null;
  const closeCode = () => {
    if (!code) {return;}
    for (let i = 0; i < code.length; i += CODE_CHUNK_LINES) {
      blocks.push({kind: 'code', lines: code.slice(i, i + CODE_CHUNK_LINES)});
    }
    code = null;
  };

  for (const rawLine of markdown.replace(/\r\n/g, '\n').split('\n')) {
    const line = rawLine.replace(/\s+$/, '');
    if (FENCE.test(line)) {
      if (code) {
        closeCode();
      } else {
        close();
        code = [];
      }
      continue;
    }
    if (code) {
      code.push(line);
      continue;
    }
    if (line.trim() === '') {
      close();
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      close();
      blocks.push({kind: 'heading', level: heading[1].length, spans: parseInline(heading[2])});
      continue;
    }
    const item = ITEM.exec(line);
    if (item) {
      close();
      const indent = item[1].replace(/\t/g, '    ').length;
      const marker = /^\d/.test(item[2]) ? item[2] : '•';
      open = {kind: 'item', depth: indent >= 2 ? 1 : 0, marker, text: item[3]};
      continue;
    }
    const text = line.trim().replace(/^>\s?/, '');
    if (open) {
      open.text += ' ' + text; // wrapped continuation of the item/paragraph
    } else {
      open = {kind: 'paragraph', text};
    }
  }
  close();
  closeCode(); // an unclosed fence runs to the end
  return blocks;
}

/** Plain text of a block (for line-count estimates and tests). */
export function blockText(block: MarkdownBlock): string {
  return block.kind === 'code' ? block.lines.join('\n') : block.spans.map(s => s.text).join('');
}
