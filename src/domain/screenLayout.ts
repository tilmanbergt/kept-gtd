/**
 * Screen sizes beyond the A5 X in portrait
 * (docs/dev/history/technical-design-launch-ready.md §4.2,
 * docs/dev/design-device-rendering.md §1): the one place that turns the size
 * Kept's root view gets into the figures layout code budgets with. Pure.
 *
 * The line estimators (domain/textLineEstimator.ts) are tuned together with
 * one column figure, 678, on the A5 X. On a screen at least as wide that
 * figure stays, so an estimate can only err long (a row gets more room than
 * it needs, nothing is cut off) and nothing moves on the A5 X. A narrower
 * screen (a Nomad, ~750 dp) scales it down with the real column width.
 */

export interface ScreenSize {
  width: number;
  height: number;
}

/** The A5 X in portrait, in dp (1404 × 1872 px at 1.41 px per dp). */
export const A5X_PORTRAIT: ScreenSize = {width: 994, height: 1325};

/** The column figure the line estimators are tuned for on the A5 X. */
export const A5X_ESTIMATOR_WIDTH = 678;

/** Screen padding left and right, and the gap between two columns (SPACING.base). */
const SIDE_PADDING = 16;
const COLUMN_GAP = 16;

/** Width of one column of the standard two-column layout. */
export function realColumnWidth(screen: ScreenSize): number {
  return (screen.width - 2 * SIDE_PADDING - COLUMN_GAP) / 2;
}

/** How much narrower than the A5 X a screen may be and still count as A5 X width (rounding, borders). */
const SAME_WIDTH_TOLERANCE = 8;

/** The column figure for the line estimators on `screen` (see the module comment). */
export function estimatorWidthFor(screen: ScreenSize): number {
  if (screen.width >= A5X_PORTRAIT.width - SAME_WIDTH_TOLERANCE) return A5X_ESTIMATOR_WIDTH;
  const ratio = realColumnWidth(screen) / realColumnWidth(A5X_PORTRAIT);
  return Math.max(1, Math.round(A5X_ESTIMATOR_WIDTH * ratio));
}

/** Below this width two columns side by side get too narrow; screens that break offer one column with a toggle. */
export const NARROW_BELOW = 800;

export type LayoutClass = 'wide' | 'narrow';

export function layoutWidthClass(screen: ScreenSize): LayoutClass {
  return screen.width < NARROW_BELOW ? 'narrow' : 'wide';
}

/** Rows per day block of the Week grid: 4 on weekdays and 2 on the weekend where they fit (the A5 X in portrait). */
export interface WeekGridRows {
  weekday: number;
  weekend: number;
}

export const FULL_WEEK_GRID_ROWS: WeekGridRows = {weekday: 4, weekend: 2};

/**
 * How many chip rows the Week grid's seven day blocks get in `height` dp: the full
 * 4 + 2 where they fit, otherwise fewer (a shorter screen, a turned A5 X, a Nomad) - the
 * weekend gives up its second row first - down to one row each. A day with more meetings than its rows pages on its own, so nothing is lost.
 * `blockOverhead` is a block's header and gap, `rowHeight` one chip row.
 */
export function weekGridRows(height: number | null, rowHeight: number, blockOverhead: number): WeekGridRows {
  if (!height || height <= 0) return FULL_WEEK_GRID_ROWS;
  const units = Math.floor((height - 7 * blockOverhead) / rowHeight);
  for (let weekday = FULL_WEEK_GRID_ROWS.weekday; weekday >= 1; weekday--) {
    for (let weekend = Math.min(FULL_WEEK_GRID_ROWS.weekend, weekday); weekend >= 1; weekend--) {
      if (5 * weekday + 2 * weekend <= units) return {weekday, weekend};
    }
  }
  return {weekday: 1, weekend: 1};
}

/** Screens the debug "Simulate screen" can draw Kept in (docs/dev/history/technical-design-launch-ready.md §4.3). */
export type SimulatedScreen = 'nomad-portrait' | 'nomad-landscape';

/** The Nomad's whole screen in dp (1404 × 1872 px at 300 ppi, 1.875 px per dp); a dp is about the same physical size on the A5 X. */
export const SIMULATED_SCREENS: ReadonlyArray<{key: SimulatedScreen; label: string; size: ScreenSize}> = [
  {key: 'nomad-portrait', label: 'Nomad portrait', size: {width: 749, height: 998}},
  {key: 'nomad-landscape', label: 'Nomad landscape', size: {width: 998, height: 749}},
];

export function simulatedScreen(key: SimulatedScreen): {key: SimulatedScreen; label: string; size: ScreenSize} {
  return SIMULATED_SCREENS.find(s => s.key === key)!;
}

/**
 * Space around the simulated box: it sits this far from the top and left edge, so
 * anything the host draws at the screen's own edge stays visibly outside it.
 */
export const SIMULATION_INSET = 16;

/** The simulations that fit on `real` with their inset and frame (a larger box can't be drawn). */
export function simulationsThatFit(real: ScreenSize): SimulatedScreen[] {
  const room = SIMULATION_INSET + 2;
  return SIMULATED_SCREENS.filter(s => s.size.width + room <= real.width && s.size.height + room <= real.height).map(s => s.key);
}
