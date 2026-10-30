/**
 * Remove Kept's data (docs/dev/history/technical-design-remove-data.md): the kinds of data Kept
 * puts on the device (§3), their defaults and the rules between them, the order of the removal
 * (R6) and its texts. Pure: the inventory comes from storage/dataRemoval.ts.
 */

export type RemovalKind = 'settings' | 'secrets' | 'caches' | 'privateData' | 'logs' | 'demo' | 'legacy' | 'saveCopies' | 'dataFiles' | 'profiles';

export interface RemovalKindInfo {
  kind: RemovalKind;
  label: string;
  /** Where it is, as the screen shows it. */
  where: string;
  /** Checked when the screen opens and there is something to remove. */
  defaultOn: boolean;
  /** Left out of the list when there is nothing (the old gtdpara folders, leftover save copies). */
  onlyWhenPresent?: boolean;
  /** How the count reads: "3 files". */
  unit: [string, string];
}

/** In the order of the screen (§3). */
export const REMOVAL_KINDS: readonly RemovalKindInfo[] = [
  {kind: 'settings', label: 'Settings', where: 'stored inside the plugin', defaultOn: true, unit: ['entry', 'entries']},
  {kind: 'secrets', label: 'Gmail app password and calendar link', where: 'stored inside the plugin, for every profile', defaultOn: true, unit: ['profile', 'profiles']},
  {kind: 'caches', label: 'Recent tags, recent places, calendar cache', where: 'stored inside the plugin', defaultOn: true, unit: ['entry', 'entries']},
  {kind: 'privateData', label: 'Lasso mark pictures and temporary files', where: "the plugin's private folder", defaultOn: true, unit: ['file', 'files']},
  {kind: 'logs', label: 'Debug and performance logs', where: 'EXPORT/kept-gtd/debug', defaultOn: true, unit: ['file', 'files']},
  {kind: 'demo', label: 'Demo space', where: 'Note/kept-gtd-demo and the profile Demo', defaultOn: true, unit: ['file', 'files']},
  {kind: 'legacy', label: 'Old gtdpara folders', where: 'EXPORT/gtdpara, Note/gtdpara-demo', defaultOn: true, onlyWhenPresent: true, unit: ['file', 'files']},
  {kind: 'saveCopies', label: 'Leftover save copies', where: 'hidden .gtdpara-tmp files next to data files', defaultOn: true, onlyWhenPresent: true, unit: ['file', 'files']},
  {kind: 'dataFiles', label: "Kept's data files", where: 'project.txt, area.txt and Inbox.txt in your Projects, Areas and Archive folders', defaultOn: false, unit: ['file', 'files']},
  {kind: 'profiles', label: 'Saved profiles', where: 'EXPORT/kept-gtd/profiles', defaultOn: false, unit: ['file', 'files']},
];

export type RemovalCounts = Record<RemovalKind, number>;

export interface RemovalInventory {
  counts: RemovalCounts;
  /** Lasso marks not processed yet: they lose their picture and handwriting with the private data. */
  openMarks: number;
  /** The demo profile is active: the demo space goes only together with the settings (R8). */
  demoProfileActive: boolean;
}

export type RemovalChoices = Record<RemovalKind, boolean>;

export function kindInfo(kind: RemovalKind): RemovalKindInfo {
  return REMOVAL_KINDS.find(k => k.kind === kind)!;
}

/** The kinds the screen lists: every kind, except those only shown when present and empty. */
export function listedKinds(inventory: RemovalInventory): RemovalKindInfo[] {
  return REMOVAL_KINDS.filter(k => !k.onlyWhenPresent || inventory.counts[k.kind] > 0);
}

/** The demo row can't be checked on its own while the demo profile is active. */
export function demoLocked(choices: RemovalChoices, inventory: RemovalInventory): boolean {
  return inventory.demoProfileActive && !choices.settings;
}

/** What the screen starts with: the defaults (R3), nothing checked where there is nothing. */
export function initialChoices(inventory: RemovalInventory): RemovalChoices {
  const choices = Object.fromEntries(REMOVAL_KINDS.map(k => [k.kind, k.defaultOn && inventory.counts[k.kind] > 0])) as RemovalChoices;
  if (demoLocked(choices, inventory)) choices.demo = false;
  return choices;
}

/**
 * A tap on a row. Checking Settings checks the secrets and the caches too (a fresh start with
 * old secrets would be confusing; they can be unchecked again). Unchecking Settings while the
 * demo profile is active unchecks the demo space. Empty and locked rows don't change.
 */
export function toggleChoice(choices: RemovalChoices, kind: RemovalKind, inventory: RemovalInventory): RemovalChoices {
  if (inventory.counts[kind] === 0) return choices;
  if (kind === 'demo' && demoLocked(choices, inventory)) return choices;
  const next = {...choices, [kind]: !choices[kind]};
  if (kind === 'settings' && next.settings) {
    next.secrets = inventory.counts.secrets > 0;
    next.caches = inventory.counts.caches > 0;
  }
  if (demoLocked(next, inventory)) next.demo = false;
  return next;
}

/** "Save the active profile first" is offered when the settings go and the profiles stay (R8). */
export function saveProfileOffered(choices: RemovalChoices): boolean {
  return choices.settings && !choices.profiles;
}

/** The second line a row shows for its current state, or null. */
export function rowHint(kind: RemovalKind, choices: RemovalChoices, inventory: RemovalInventory): string | null {
  if (inventory.counts[kind] === 0) return 'nothing here';
  if (kind === 'privateData' && choices.privateData && inventory.openMarks > 0) {
    const n = inventory.openMarks;
    return `${n} open ${n === 1 ? 'mark loses its' : 'marks lose their'} picture and handwriting - process them first.`;
  }
  if (kind === 'demo' && demoLocked(choices, inventory)) return 'The demo profile is active: the demo space goes only together with the settings.';
  if (kind === 'dataFiles' && choices.dataFiles) {
    return choices.settings
      ? 'Your todos, meetings and agreements are in these files. Copy them first if you want to keep them.'
      : 'Your todos, meetings and agreements are in these files. Without the settings removed too, Kept writes new empty ones on its next start.';
  }
  return null;
}

/** "3 files", "1 entry", "nothing here". */
export function countText(kind: RemovalKind, count: number): string {
  if (count === 0) return 'nothing here';
  const [one, many] = kindInfo(kind).unit;
  return `${count} ${count === 1 ? one : many}`;
}

export type RemovalStep = RemovalKind | 'saveProfile';

/**
 * The order of the removal (R6): the active profile first when asked, then the files - so a
 * failure leaves the settings in place and the removal can run again - then the private folders,
 * and the store last.
 */
export const REMOVAL_ORDER: readonly RemovalKind[] = ['legacy', 'demo', 'logs', 'saveCopies', 'dataFiles', 'profiles', 'privateData', 'caches', 'secrets', 'settings'];

export function planRemoval(choices: RemovalChoices, saveProfileFirst: boolean): RemovalStep[] {
  const steps: RemovalStep[] = saveProfileFirst && saveProfileOffered(choices) ? ['saveProfile'] : [];
  return [...steps, ...REMOVAL_ORDER.filter(kind => choices[kind])];
}

/** The status-line question (R5). The data files, when checked, are named first. */
export function removalQuestion(choices: RemovalChoices): string {
  const kinds = REMOVAL_ORDER.filter(kind => choices[kind]);
  const others = kinds.filter(kind => kind !== 'dataFiles').length;
  const what = choices.dataFiles
    ? `your data files (project.txt, area.txt, Inbox.txt)${others > 0 ? ` and ${others} more ${others === 1 ? 'kind' : 'kinds'} of data` : ''}`
    : `${others} ${others === 1 ? 'kind' : 'kinds'} of data`;
  return `Remove ${what}? This can't be undone.`;
}

/** `skipped`: the settings stay because an earlier step failed - they find the rest on a second run. */
export type StepOutcome = {step: RemovalStep; done: number; total: number; error?: string; skipped?: boolean};

/** One result line: removed, partly removed, failed. */
export function outcomeText(outcome: StepOutcome): string {
  const label = outcome.step === 'saveProfile' ? 'Save the active profile' : kindInfo(outcome.step).label;
  if (outcome.skipped) return `${label}: kept, because something above failed - run Remove again to finish`;
  if (!outcome.error) return `${label}: ${outcome.step === 'saveProfile' ? 'saved' : 'removed'}`;
  if (outcome.done > 0) return `${label}: partly removed (${outcome.done} of ${outcome.total}) - ${outcome.error}`;
  return `${label}: failed - ${outcome.error}`;
}

/** The step's text for the log: counts only, no paths. */
export function outcomeLogLine(outcome: StepOutcome): string {
  return `${outcome.step} ${outcome.skipped ? 'skipped' : outcome.error ? 'failed' : 'ok'} ${outcome.done}/${outcome.total}`;
}
