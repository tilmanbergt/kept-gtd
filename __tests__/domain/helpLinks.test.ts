import {findAnchorBlock, headingSlug, pageAnchors} from '../../src/domain/helpLinks';
import {parseMarkdownBlocks} from '../../src/domain/markdownBlocks';

describe('headingSlug', () => {
  it.each([
    ['Marking for later', 'marking-for-later'],
    ['Files outside Note', 'files-outside-note'],
    ['The tabs at a glance', 'the-tabs-at-a-glance'],
    ['Time & place: what, why?', 'time--place-what-why'],
    ['Step 1 · Folders', 'step-1--folders'],
    ['  Café notes ', 'café-notes'],
  ])('%s → %s', (text, slug) => {
    expect(headingSlug(text)).toBe(slug);
  });
});

describe('findAnchorBlock', () => {
  const blocks = parseMarkdownBlocks(['Intro', '## Capturing right away', 'text', '## Marking for later', '- a', '```', '## not a heading', '```'].join('\n'));
  it('finds the heading block by its slug', () => {
    expect(findAnchorBlock(blocks, 'marking-for-later')).toBe(3);
  });
  it('-1 for an unknown anchor or a "heading" inside code', () => {
    expect(findAnchorBlock(blocks, 'nope')).toBe(-1);
    expect(findAnchorBlock(blocks, 'not-a-heading')).toBe(-1);
  });
  it('slugs come from the rendered text: bold, code and links count as text', () => {
    expect(pageAnchors('# Page\n## Files outside `Note`\n## **Bold** [link](tags.md)')).toEqual(['page', 'files-outside-note', 'bold-link']);
  });
});
