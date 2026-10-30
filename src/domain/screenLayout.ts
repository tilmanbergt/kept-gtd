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

export function layoutWidthClass(screen: ScreenSize): 'wide' | 'narrow' {
  return screen.width < NARROW_BELOW ? 'narrow' : 'wide';
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
