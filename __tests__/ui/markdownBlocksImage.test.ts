/**
 * Height of a help diagram in the help pager (docs/dev/history/technical-design-quality-assurance.md
 * §6.6): as wide as the column, shrunk to fit one page when taller.
 */
jest.mock('../../src/utils/screenRefresh', () => ({requestEinkRefresh: jest.fn()}));

import {imageMaxHeight, imageSize, markdownBlockHeight} from '../../src/ui/MarkdownBlocks';

const IMAGES = {wide: {uri: 'data:', width: 960, height: 480}, tall: {uri: 'data:', width: 960, height: 2400}};

describe('help diagram height', () => {
  it('uncapped: the column width at the diagram\'s aspect, plus the block gap', () => {
    expect(imageSize('wide', 680, Infinity, IMAGES)).toEqual({width: 680, height: 340});
    expect(markdownBlockHeight({kind: 'image', id: 'wide', alt: 'A'}, 680, 1000, IMAGES)).toBe(344);
  });
  it('capped: a tall diagram shrinks to the page, keeping its aspect', () => {
    expect(imageSize('tall', 680, 1000, IMAGES)).toEqual({width: 400, height: 1000});
    expect(markdownBlockHeight({kind: 'image', id: 'tall', alt: 'A'}, 680, 1000, IMAGES)).toBe(1004);
  });
  it('the cap leaves the pager header and the gap', () => {
    expect(imageMaxHeight(1500)).toBe(1500 - 33 - 8);
  });
  it('an unknown id is as high as its alt text as a paragraph', () => {
    expect(imageSize('missing', 680, Infinity, IMAGES)).toBeNull();
    expect(markdownBlockHeight({kind: 'image', id: 'missing', alt: 'Alt'}, 680, 1000, IMAGES)).toBe(
      markdownBlockHeight({kind: 'paragraph', spans: [{text: 'Alt'}]}, 680),
    );
  });
});
