import {blockText, CODE_CHUNK_LINES, helpLinkTarget, parseInline, parseMarkdownBlocks} from '../../src/domain/markdownBlocks';

describe('parseInline', () => {
  it('splits bold, code and links', () => {
    expect(parseInline('a **b** `c` [d](http://x) e')).toEqual([
      {text: 'a '},
      {text: 'b', bold: true},
      {text: ' '},
      {text: 'c', code: true},
      {text: ' d e'},
    ]);
  });
  it('plain text', () => {
    expect(parseInline('plain')).toEqual([{text: 'plain'}]);
  });
});

describe('parseMarkdownBlocks', () => {
  it('parses a changelog section', () => {
    const md = [
      'First public release.',
      '',
      '### New',
      '- **Daily** view: today and',
      '  tomorrow.',
      '  - nested item',
      '1. numbered',
      '',
      '> quoted note',
    ].join('\r\n');
    const blocks = parseMarkdownBlocks(md);
    expect(blocks.map(b => b.kind)).toEqual(['paragraph', 'heading', 'item', 'item', 'item', 'paragraph']);
    expect(blockText(blocks[2])).toBe('Daily view: today and tomorrow.');
    expect(blocks[2]).toMatchObject({kind: 'item', depth: 0, marker: '•'});
    expect(blocks[3]).toMatchObject({kind: 'item', depth: 1});
    expect(blocks[4]).toMatchObject({kind: 'item', marker: '1.'});
    expect(blockText(blocks[5])).toBe('quoted note');
    expect(blocks[1]).toMatchObject({kind: 'heading', level: 3});
  });
  it('empty input gives no blocks', () => {
    expect(parseMarkdownBlocks('')).toEqual([]);
  });
  it('keeps fenced code verbatim', () => {
    const md = ['Before', '```', '---', '- [ ] not an item', '## not a heading', '```', 'After'].join('\n');
    const blocks = parseMarkdownBlocks(md);
    expect(blocks.map(b => b.kind)).toEqual(['paragraph', 'code', 'paragraph']);
    expect(blocks[1]).toEqual({kind: 'code', lines: ['---', '- [ ] not an item', '## not a heading']});
  });
  it('splits long code blocks into chunks', () => {
    const lines = Array.from({length: CODE_CHUNK_LINES + 3}, (_, i) => `line ${i}`);
    const blocks = parseMarkdownBlocks(['```', ...lines, '```'].join('\n'));
    expect(blocks).toHaveLength(2);
    expect(blockText(blocks[1])).toBe(lines.slice(CODE_CHUNK_LINES).join('\n'));
  });
});

describe('help page links', () => {
  it('keeps a page link and its anchor; other links become text', () => {
    expect(parseInline('See [Threads](threads.md), [later](lasso.md#marking-for-later) or [web](https://x.org).')).toEqual([
      {text: 'See '},
      {text: 'Threads', link: {page: 'threads', anchor: null}},
      {text: ', '},
      {text: 'later', link: {page: 'lasso', anchor: 'marking-for-later'}},
      {text: ' or web.'},
    ]);
  });
  it('a link inside bold stays bold; a link inside code stays code', () => {
    expect(parseInline('**[Tags](tags.md)** `[x](y.md)`')).toEqual([
      {text: 'Tags', bold: true, link: {page: 'tags', anchor: null}},
      {text: ' '},
      {text: '[x](y.md)', code: true},
    ]);
  });
  it('helpLinkTarget accepts only help pages', () => {
    expect(helpLinkTarget('daily.md')).toEqual({page: 'daily', anchor: null});
    expect(helpLinkTarget('../dev/x.md')).toBeNull();
    expect(helpLinkTarget('images/a.png')).toBeNull();
    expect(helpLinkTarget('Daily.md')).toBeNull();
  });
});
