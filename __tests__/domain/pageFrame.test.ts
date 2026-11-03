import {fitsOnPage, frameFor, placeFontSize, placeRect, REFERENCE_FRAME} from '../../src/domain/pageFrame';

describe('frameFor', () => {
  it('an A5 X page is the reference', () => {
    expect(frameFor({width: 1404, height: 1872})).toEqual({width: 1404, height: 1872, scale: 1});
    expect(frameFor(null)).toEqual(REFERENCE_FRAME);
  });
  it('a horizontal A5 X page keeps scale 1 (short side 1404)', () => {
    expect(frameFor({width: 1872, height: 1404}).scale).toBe(1);
  });
  it('a Manta page scales by its short side', () => {
    expect(frameFor({width: 1920, height: 2560}).scale).toBeCloseTo(1920 / 1404);
  });
});

describe('placeRect / placeFontSize', () => {
  it('leave reference boxes unchanged on an A5 X page', () => {
    expect(placeRect({x: 100, y: 100, width: 600, height: 60}, REFERENCE_FRAME)).toEqual({x: 100, y: 100, width: 600, height: 60});
    expect(placeFontSize(36, REFERENCE_FRAME)).toBe(36);
  });
  it('scale position, size and font on a Manta page', () => {
    const manta = frameFor({width: 1920, height: 2560});
    expect(placeRect({x: 100, y: 1000, width: 1304, height: 60}, manta)).toEqual({x: 137, y: 1368, width: 1783, height: 82});
    expect(placeFontSize(36, manta)).toBe(49);
  });
});

describe('fitsOnPage', () => {
  const horizontal = frameFor({width: 1872, height: 1404});
  it('a piece placed low in the reference does not fit a horizontal page', () => {
    expect(fitsOnPage(placeRect({x: 100, y: 100, width: 900, height: 60}, horizontal), horizontal)).toBe(true);
    expect(fitsOnPage(placeRect({x: 100, y: 1300, width: 900, height: 60}, horizontal), horizontal)).toBe(false); // into the page bar
    expect(fitsOnPage(placeRect({x: 100, y: 1600, width: 900, height: 60}, horizontal), horizontal)).toBe(false); // below the page
  });
  it('an A5 X or Manta page keeps everything that is on the page, down to its edge', () => {
    expect(fitsOnPage({x: 100, y: 1790, width: 900, height: 72}, REFERENCE_FRAME)).toBe(true);
    expect(fitsOnPage({x: 100, y: 1820, width: 900, height: 72}, REFERENCE_FRAME)).toBe(false);
    const manta = frameFor({width: 1920, height: 2560});
    expect(fitsOnPage(placeRect({x: 100, y: 1790, width: 900, height: 72}, manta), manta)).toBe(true);
  });
});
