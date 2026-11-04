/**
 * Renders the markdown subset of domain/markdownBlocks.ts, paged without
 * scrolling (docs/dev/history/technical-design-about-debug-experimental.md §3.5).
 * Used by Settings → About's "What's new" and the in-app Help.
 *
 * A link to another help page (domain/markdownBlocks.ts's `link`) is an
 * bold, underlined nested Text that calls `onLink`, so it stands out from bold
 * labels; without `onLink` (What's new)
 * it is plain text (docs/dev/history/technical-design-easy-start.md §2.3).
 * The underline changes no metrics, so the heights below hold for links too.
 *
 * Each block is one PagedSection row. Row heights are estimated with the
 * app's shared line estimator against the measured column width, so a page
 * holds as many blocks as fit; a block is never split across pages.
 *
 * A help diagram (an `image` block, docs/dev/history/technical-design-quality-assurance.md §6.6)
 * comes from src/generated/helpImages.ts as a data URI. It is as wide as the column; a diagram
 * taller than the page is shrunk to the measured column height minus the pager's header line,
 * keeping its aspect, centered, so it always fits one page whole. An unknown id shows its alt text.
 */
import React, {useMemo, useState} from 'react';
import {Image, LayoutChangeEvent, StyleSheet, Text, View} from 'react-native';
import {HELP_IMAGES, HelpImage} from '../generated/helpImages';
import {requestEinkRefresh} from '../utils/screenRefresh';
import {blockText, HelpLinkTarget, InlineSpan, MarkdownBlock, parseMarkdownBlocks} from '../domain/markdownBlocks';
import PagedSection from './PagedSection';
import {activeLineEstimator} from '../domain/textLineEstimator';
import {FONT} from './theme';

const BODY_LINE = 21;
const CODE_LINE = 19;
const CODE_PAD = 6;
const HEADING_LINE = 24;
const ITEM_INDENT = 18;
const NESTED_INDENT = 18;
const BLOCK_GAP = 4;
const HEADING_TOP = 8;
/** Estimates err on the safe side: a slightly short page beats a clipped block. */
const SAFETY = 1.08;
/**
 * PagedSection's header line above the blocks: padding 4 + 4, line 20, divider 1, margin 4
 * (ui/PagedSection.tsx styles.headerRow). An image is capped so it fits below it.
 */
const PAGER_HEADER = 33;

/** Room for an image on one page of a pager `columnHeight` tall: below the header line, with the block gap. */
export function imageMaxHeight(columnHeight: number): number {
  return Math.max(40, columnHeight - PAGER_HEADER - 2 * BLOCK_GAP);
}

/**
 * The drawn size of a help diagram: the column width and its aspect, shrunk to `maxHeight` when taller
 * (then narrower, keeping the aspect). Null for an id the bundle doesn't have.
 */
export function imageSize(
  id: string,
  widthPx: number,
  maxHeight: number = Infinity,
  images: Record<string, HelpImage> = HELP_IMAGES,
): {width: number; height: number} | null {
  const image = images[id];
  if (!image || image.width <= 0 || image.height <= 0) {return null;}
  const height = (widthPx * image.height) / image.width;
  if (height <= maxHeight) {return {width: widthPx, height: Math.round(height)};}
  return {width: Math.round((maxHeight * image.width) / image.height), height: Math.round(maxHeight)};
}

function indentOf(block: MarkdownBlock): number {
  return block.kind === 'item' ? ITEM_INDENT + block.depth * NESTED_INDENT : 0;
}

/** An image whose id the bundle lacks is shown as its alt text, a paragraph. */
const altParagraph = (alt: string): MarkdownBlock => ({kind: 'paragraph', spans: [{text: alt}]});

export function markdownBlockHeight(
  block: MarkdownBlock,
  widthPx: number,
  maxImageHeight: number = Infinity,
  images: Record<string, HelpImage> = HELP_IMAGES,
): number {
  if (block.kind === 'image') {
    const size = imageSize(block.id, widthPx, maxImageHeight, images);
    return size ? size.height + BLOCK_GAP : markdownBlockHeight(altParagraph(block.alt), widthPx);
  }
  if (block.kind === 'code') {
    const available = Math.max(40, widthPx - 2 * CODE_PAD);
    const lines = block.lines.reduce(
      (n, line) => n + Math.max(1, activeLineEstimator.estimateLines(line, available, FONT.small)),
      0,
    );
    return Math.ceil(lines * CODE_LINE * SAFETY) + 2 * CODE_PAD + BLOCK_GAP;
  }
  const heading = block.kind === 'heading';
  const font = heading ? FONT.medium : FONT.small;
  const lineHeight = heading ? HEADING_LINE : BODY_LINE;
  const available = Math.max(40, widthPx - indentOf(block));
  const lines = Math.max(1, activeLineEstimator.estimateLines(blockText(block), available, font));
  return Math.ceil(lines * lineHeight * SAFETY) + BLOCK_GAP + (heading ? HEADING_TOP : 0);
}

export type OnHelpLink = (link: HelpLinkTarget) => void;

function Spans({spans, textColor, onLink}: {spans: InlineSpan[]; textColor: string; onLink?: OnHelpLink}): React.JSX.Element {
  return (
    <>
      {spans.map((span, i) => {
        const link = onLink ? span.link : undefined;
        return (
          <Text
            key={i}
            style={[span.bold && styles.bold, span.italic && styles.italic, span.code && styles.code, link && styles.link, {color: textColor}]}
            onPress={link ? () => onLink!(link) : undefined}>
            {span.text}
          </Text>
        );
      })}
    </>
  );
}

interface BlockViewProps {
  block: MarkdownBlock;
  textColor: string;
  onLink?: OnHelpLink;
  /** The column's width and the room for an image on one page; images need them. */
  widthPx?: number;
  maxImageHeight?: number;
}

export function MarkdownBlockView({block, textColor, onLink, widthPx = 0, maxImageHeight = Infinity}: BlockViewProps): React.JSX.Element {
  if (block.kind === 'image') {
    const size = imageSize(block.id, widthPx, maxImageHeight);
    if (!size) {return <MarkdownBlockView block={altParagraph(block.alt)} textColor={textColor} />;}
    return (
      <Image
        source={{uri: HELP_IMAGES[block.id].uri}}
        accessibilityLabel={block.alt}
        resizeMode="contain"
        style={[styles.image, size]}
        // Shown after the page was drawn: e-ink needs a refresh to show it (DEVELOPMENT-POLICY §4).
        onLoad={requestEinkRefresh}
      />
    );
  }
  if (block.kind === 'code') {
    return (
      <View style={[styles.codeBox, {borderColor: textColor}]}>
        <Text style={[styles.codeText, {color: textColor}]}>{block.lines.join('\n')}</Text>
      </View>
    );
  }
  if (block.kind === 'heading') {
    return (
      <Text style={[styles.heading, {color: textColor}]}>
        <Spans spans={block.spans} textColor={textColor} onLink={onLink} />
      </Text>
    );
  }
  if (block.kind === 'item') {
    return (
      <View style={[styles.itemRow, {paddingLeft: block.depth * NESTED_INDENT}]}>
        <Text style={[styles.marker, {color: textColor}]}>{block.marker}</Text>
        <Text style={[styles.body, styles.itemText, {color: textColor}]}>
          <Spans spans={block.spans} textColor={textColor} onLink={onLink} />
        </Text>
      </View>
    );
  }
  return (
    <Text style={[styles.body, styles.paragraph, {color: textColor}]}>
      <Spans spans={block.spans} textColor={textColor} onLink={onLink} />
    </Text>
  );
}

interface Props {
  markdown: string;
  header: React.ReactNode;
  /** Changes when a different document is shown, so paging starts at page 1 again. */
  resetKey: string;
  emptyHint?: string;
  /** Taps on links to help pages; without it links show as plain text. */
  onLink?: OnHelpLink;
  /** Opens the page that holds this block (a heading anchor, or where Back returns to); a new `key` jumps again. */
  jumpTo?: {key: string | number; row: number} | null;
  /** The index of the first block on screen, whenever it changes. */
  onFirstRowChange?: (row: number) => void;
  textColor: string;
  borderColor: string;
}

/** Fills its (bounded, flex) parent; pages with ‹ › in the header line. */
export default function MarkdownPager({markdown, header, resetKey, emptyHint, onLink, jumpTo, onFirstRowChange, textColor, borderColor}: Props): React.JSX.Element {
  const blocks = useMemo(() => parseMarkdownBlocks(markdown), [markdown]);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    const h = Math.round(e.nativeEvent.layout.height);
    if (w !== width) {setWidth(w);}
    if (h !== height) {setHeight(h);}
  };
  const maxImageHeight = height > 0 ? imageMaxHeight(height) : Infinity;
  const rows = useMemo(() => blocks.map((block, index) => ({block, index})), [blocks]);
  // The width is part of the key: a jump waits for the measured column, whose width decides the pages.
  const jump = useMemo(() => (jumpTo && width > 0 ? {key: `${jumpTo.key}|${width}`, index: jumpTo.row} : null), [jumpTo, width]);
  return (
    <View style={styles.root} onLayout={onLayout}>
      {width > 0 && (
        <PagedSection
          header={header}
          rows={rows}
          rowHeight={row => markdownBlockHeight(row.block, width, maxImageHeight)}
          resetKey={`${resetKey}|${width}`}
          jumpTo={jump}
          onFirstRowChange={onFirstRowChange}
          renderRow={row => (
            <View key={row.index} style={styles.blockBox}>
              <MarkdownBlockView block={row.block} textColor={textColor} onLink={onLink} widthPx={width} maxImageHeight={maxImageHeight} />
            </View>
          )}
          emptyHint={emptyHint}
          textColor={textColor}
          borderColor={borderColor}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  blockBox: {marginBottom: BLOCK_GAP},
  heading: {
    fontSize: FONT.medium,
    lineHeight: HEADING_LINE,
    fontWeight: '700',
    marginTop: HEADING_TOP,
  },
  body: {
    fontSize: FONT.small,
    lineHeight: BODY_LINE,
  },
  paragraph: {},
  itemRow: {flexDirection: 'row'},
  marker: {
    width: ITEM_INDENT,
    fontSize: FONT.small,
    lineHeight: BODY_LINE,
  },
  itemText: {flex: 1},
  bold: {fontWeight: '700'},
  italic: {fontStyle: 'italic'},
  link: {fontWeight: '700', textDecorationLine: 'underline'},
  code: {fontFamily: 'monospace'},
  codeBox: {borderLeftWidth: 2, paddingHorizontal: CODE_PAD, paddingVertical: CODE_PAD},
  codeText: {fontFamily: 'monospace', fontSize: FONT.small, lineHeight: CODE_LINE},
  image: {alignSelf: 'center'},
});
