/**
 * Feature switches (Settings → Features, docs/dev/history/technical-design-daily-slim.md
 * §3.6, docs/dev/history/technical-design-about-debug-experimental.md §3.1-3.2).
 * Project close-out is a module (`settings.modules`, on by default); Google
 * Calendar and Gmail depend on external services and are shown only when
 * switched on under Experimental. Switching one off hides its entry points;
 * its configuration and data stay stored.
 *
 * Pure domain logic, structurally typed (no import of settings.ts, which
 * imports reviewSteps.ts, which imports this file).
 */

export interface Features {
  googleCalendar: boolean;
  gmail: boolean;
  /** Project close-out (checklist, outcomes, archive PDF); off archives Done projects directly. */
  closeOut: boolean;
}

/** The module switches stored in `settings.modules`; a missing key reads as its default. */
export interface Modules {
  closeOut: boolean;
}

export const DEFAULT_MODULES: Modules = {closeOut: true};

/** What screens see before settings have loaded: integrations hidden, modules at their defaults. */
export const NO_FEATURES: Features = {googleCalendar: false, gmail: false, ...DEFAULT_MODULES};

interface FeatureFlagFields {
  experimentalGoogleCalendar: boolean;
  experimentalGmail: boolean;
  modules?: Partial<Modules> | null;
}

/** The modules map with every missing or malformed key filled from DEFAULT_MODULES (a partial map, e.g. from a later version, also works). */
export function modulesOf(settings: Pick<FeatureFlagFields, 'modules'> | null | undefined): Modules {
  const stored = settings?.modules && typeof settings.modules === 'object' ? settings.modules : {};
  return {closeOut: typeof stored.closeOut === 'boolean' ? stored.closeOut : DEFAULT_MODULES.closeOut};
}

export function featuresOf(settings: FeatureFlagFields | null | undefined): Features {
  if (!settings) {return NO_FEATURES;}
  return {
    googleCalendar: settings.experimentalGoogleCalendar === true,
    gmail: settings.experimentalGmail === true,
    ...modulesOf(settings),
  };
}

interface MigratableFields extends FeatureFlagFields {
  googleCalendarIcsUrl: string;
  gmailEmail: string;
  lastSeenVersion: string;
}

/**
 * One-time defaults for the switches and the What's-new marker, run on every
 * settings load (storage/settingsStorage.ts), same contract as the other
 * migrations there: returns the SAME object when nothing changes.
 *
 * - Existing install (a stored blob exists) without the switch keys: a switch
 *   starts ON when its integration is already configured, so nothing
 *   disappears after the update. `lastSeenVersion` stays '' so the
 *   "Updated to …" notice shows once.
 * - Fresh install (nothing stored): switches stay OFF (defaults) and
 *   `lastSeenVersion` becomes `currentVersion`, so no notice.
 */
export function migrateExperimentalFlags<T extends MigratableFields>(
  merged: T,
  rawStored: unknown,
  currentVersion: string,
): T {
  const raw = rawStored && typeof rawStored === 'object' ? (rawStored as Record<string, unknown>) : {};
  const freshInstall = Object.keys(raw).length === 0;
  let next = merged;
  if (freshInstall) {
    if (!merged.lastSeenVersion) {next = {...next, lastSeenVersion: currentVersion};}
    return next;
  }
  if (raw.experimentalGoogleCalendar === undefined) {
    next = {...next, experimentalGoogleCalendar: (merged.googleCalendarIcsUrl ?? '').trim() !== ''};
  }
  if (raw.experimentalGmail === undefined) {
    next = {...next, experimentalGmail: (merged.gmailEmail ?? '').trim() !== ''};
  }
  return next;
}

/**
 * Whether the one-time "Updated to x.y.z" notice should show: only for
 * release builds, only when the user hasn't acknowledged this version yet
 * (lastSeenVersion is written only when they tap "What's new" or ✕, so a
 * start that was interrupted by the host's stale-build restart shows it
 * again next time).
 */
export function shouldShowWhatsNew(lastSeenVersion: string, build: {version: string; release: boolean}): boolean {
  return build.release && lastSeenVersion !== build.version;
}

/** The release that retired focus (docs/dev/history/technical-design-time-and-place.md R7). */
const FOCUS_RETIRED_IN = [0, 22, 0];

function versionParts(version: string): number[] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  return match ? match.slice(1).map(Number) : null;
}

/**
 * Whether the one-time line "Focus is retired. …" shows (R7): the user last
 * acknowledged a release before focus was retired and hasn't dismissed the
 * line yet. A fresh install ('' = no release seen) never had focus. Unlike
 * the "Updated to" notice it shows in test builds too.
 */
export function shouldShowFocusRetired(lastSeenVersion: string, seen: boolean): boolean {
  const parts = versionParts(lastSeenVersion);
  if (seen || !parts) return false;
  for (let i = 0; i < 3; i++) if (parts[i] !== FOCUS_RETIRED_IN[i]) return parts[i] < FOCUS_RETIRED_IN[i];
  return false;
}
