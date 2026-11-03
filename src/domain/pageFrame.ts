/**
 * Where Kept's text boxes and links go on a real note page
 * (docs/dev/history/technical-design-launch-ready.md §5). Note setups place
 * pieces in A5 X reference pixels (1404 × 1872, what the Settings preview
 * shows); a page of another size gets the same layout scaled by its short side
 * (a Manta page 1920 × 2560: × 1.37; a horizontal A5 X page 1872 × 1404: × 1).
 *
 * A placed box that would end past the page is left out - never clipped or
 * moved. On a page of another shape (horizontal) the band the host covers with
 * its page bar counts as past the page too. A page of the reference's shape
 * (A5 X, Manta) keeps exactly what fits the A5 X. Pure.
 */

export interface PageSize {
  width: number;
  height: number;
}

export interface PageFrame extends PageSize {
  /** Factor from reference pixels to this page's pixels. */
  scale: number;
}

export interface PageRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The A5 X page in pixels: the reference every Note setup layout is defined in. */
export const REFERENCE_PAGE: PageSize = {width: 1404, height: 1872};

/** Kept free at the bottom of a page of another shape, in reference pixels: the host draws its page bar over it. */
export const PAGE_BOTTOM_MARGIN_PX = 100;

export const REFERENCE_FRAME: PageFrame = {...REFERENCE_PAGE, scale: 1};

/** The frame of a page of `size`; an unknown size is the reference. */
export function frameFor(size: PageSize | null | undefined): PageFrame {
  if (!size || size.width <= 0 || size.height <= 0) return REFERENCE_FRAME;
  const scale = Math.min(size.width, size.height) / REFERENCE_PAGE.width;
  return {width: size.width, height: size.height, scale};
}

/** A box in reference pixels, placed on `frame`'s page. */
export function placeRect(rect: PageRect, frame: PageFrame): PageRect {
  const s = frame.scale;
  return {x: Math.round(rect.x * s), y: Math.round(rect.y * s), width: Math.round(rect.width * s), height: Math.round(rect.height * s)};
}

/** A font size in reference pixels, on `frame`'s page. */
export function placeFontSize(size: number, frame: PageFrame): number {
  return Math.round(size * frame.scale);
}

/** Whether `frame`'s page has the reference's portrait shape (3 : 4). */
export function hasReferenceShape(frame: PageSize): boolean {
  return Math.abs(frame.width / frame.height - REFERENCE_PAGE.width / REFERENCE_PAGE.height) < 0.01;
}

/** Whether a placed box lies on the page (and, on a page of another shape, above the bottom band). */
export function fitsOnPage(placed: PageRect, frame: PageFrame): boolean {
  const band = hasReferenceShape(frame) ? 0 : Math.round(PAGE_BOTTOM_MARGIN_PX * frame.scale);
  const bottomLimit = frame.height - band;
  return placed.x >= 0 && placed.y >= 0 && placed.x < frame.width && placed.y + placed.height <= bottomLimit;
}
