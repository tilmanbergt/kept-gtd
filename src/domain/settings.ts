/**
 * Plugin-level settings: the base storage root plus the individual folder
 * names layered on top of it (Projects/Areas/Resources/Archive). Pure
 * domain logic - no RN imports, no I/O. Persistence lives in
 * storage/settingsStorage.ts.
 */
import {INBOX_FILE_NAME} from './types';
import type {EngageOwner, EngageTodoKey} from './engageOwner';
import {NoteSetup, NoteSetupDefaults, seedNoteSetupDefaults} from './noteSetups';
import {ReviewStepsMap} from './reviewSteps';
import {DEFAULT_MODULES, Modules} from './features';
import type {ContextDef, MinMinutes} from './contexts';
import type {UpdateCheckMode} from './updateCheck';

export interface GtdParaSettings {
  baseRoot: string;
  projectsFolder: string;
  areasFolder: string;
  resourcesFolder: string;
  archiveFolder: string;
  /**
   * Name of the Inbox's own folder inside the Areas folder
   * (docs/dev/history/technical-design-inbox-as-area.md). Holds Inbox.txt and the
   * Inbox's Todos/Meetings note folders. Never treated as an Area.
   */
  inboxFolder: string;
  /**
   * Per-step review tracking for the Weekly Review (docs/dev/technical-design-
   * review-hub.md). One record per step id: when "Reviewed" was last tapped on it, the recap
   * counts of its last recorded visit, and (backlog steps only) when the hub
   * last saw it empty. Plugin meta, not PARA content - a passive marker only (domain/reviewSteps.ts's
   * isReviewOverdue drives the Review tab's badge), never an active
   * reminder/notification. Written only through storage/settingsStorage.ts's
   * updateReviewSteps.
   */
  reviewSteps: ReviewStepsMap;
  /**
   * Retired: the Current page's "hide done" toggle. Count tabs with a Done tab
   * replace it (docs/dev/history/technical-design-calmer-screens.md §3.5); the
   * key stays stored and in DEFAULT_SETTINGS so an older version still reads
   * it, and nothing reads it here.
   */
  hideDoneProjectTasks: boolean;
  /**
   * Retired: the Inbox tab's "Hide done tasks". The Inbox lives on Daily's Inbox
   * tab, which lists open items only (docs/dev/history/technical-design-calmer-screens.md
   * §3.7); the key stays stored and in DEFAULT_SETTINGS for older versions, and
   * nothing reads it here.
   */
  hideDoneInboxTasks: boolean;
  /**
   * The user's Google Calendar "secret address in iCal format" URL
   * (Settings → Features), or '' if not configured (storage/
   * googleCalendarCache.ts's refreshGoogleCalendar). Plugin meta, not PARA
   * content - same reasoning as every other field here. Read-only: this
   * plugin only ever fetches this URL, never writes to it. Like the rest of
   * this file it sits in plaintext AsyncStorage, same trust level as
   * everything else stored here today - but unlike a folder name, this
   * string is itself a bearer credential (anyone with the URL can read the
   * calendar), worth remembering if this file's storage mechanism ever
   * changes.
   */
  googleCalendarIcsUrl: string;
  /**
   * The Engage panel's current todo and its owner
   * (docs/dev/history/technical-design-engage.md §3.5, D7): per-profile UI
   * state, found again by index and text and dropped silently when it no
   * longer matches. Written only by storage/engageCurrent.ts.
   */
  engageCurrent: (EngageTodoKey & {owner: EngageOwner}) | null;
  /**
   * Note setups (docs/dev/history/technical-design-note-setups.md §3.2): one
   * per thing tracked - tags, kind, where notes go, tracking, own page
   * layouts. List order is priority among setups of the same kind.
   */
  noteSetups: NoteSetup[];
  /** The Default: the page per kind and the tracking for items no setup matches; a fresh install starts with the seeded one. */
  noteSetupDefaults: NoteSetupDefaults;
  /** Next `NoteSetup.id` - a simple counter. */
  nextNoteSetupId: number;
  /**
   * The style of the title elements gtdpara writes for heading pieces
   * (docs/dev/history/technical-design-projects-findable-notes.md §2.1 R4,
   * sn-plugin-lib's `Title.style`): 1 black background, 2 light grey,
   * 3 dark grey, 4 shadow. Global, not per rule. Absent in older settings
   * reads as the default through DEFAULT_SETTINGS.
   */
  noteHeadingStyle: NoteHeadingStyle;
  /**
   * Gmail inbox review step (docs/dev/history/technical-design-review-gmail-inbox.md
   * §2) - the account this plugin reads via IMAP. '' means "not configured",
   * same convention as googleCalendarIcsUrl above: the Gmail step then shows
   * a "set up in Settings" hint instead of trying to fetch. Plugin meta, not
   * PARA content, same reasoning as every other field here.
   */
  gmailEmail: string;
  /**
   * A Google "App Password" (myaccount.google.com/apppasswords), NOT the
   * account's regular password - Gmail's IMAP access requires this once
   * 2-step verification is on, and even without it a dedicated app password
   * is the safer thing to store here. Same plaintext-AsyncStorage trust
   * level as googleCalendarIcsUrl (see that field's own doc comment) - this
   * one is a credential rather than a read-only bearer URL, so it's worth
   * being even more deliberate if this file's storage mechanism ever
   * changes.
   */
  gmailAppPassword: string;
  /**
   * IMAP host, default 'imap.gmail.com'. Kept editable (Settings shows it
   * de-emphasized, "advanced") rather than hardcoded purely so a Google
   * Workspace domain with a different IMAP endpoint isn't a dead end - not
   * expected to be touched by most users.
   */
  gmailImapHost: string;
  /**
   * "Hide handled emails by default" - mirrors hideDoneProjectTasks/
   * hideDoneInboxTasks's default-false convention (see their own doc
   * comment above). "Handled" here means "has at least one Todo/Meeting
   * created from it" (storage/gmailInboxCache.ts) - independent of archive,
   * since an email can be fully handled without being archived yet (the
   * user reads mail elsewhere too) or archived without ever being handled
   * (some mail just gets read and archived with no follow-up).
   */
  gmailHideHandled: boolean;
  /**
   * Performance tracing on/off (docs/dev/history/technical-design-perf-tracing.md §6) -
   * when on, utils/perf.ts writes one small JSONL file per tab switch / cold
   * start / reopen to the debug log folder's perf/ subfolder. Default off;
   * a diagnostic switch, not a user feature.
   */
  perfTracing: boolean;
  /**
   * "Keep tabs in memory" (docs/dev/history/technical-design-keep-tabs-alive.md §3.1):
   * Daily, Week, Month, Current, Projects and Areas stay mounted (hidden)
   * after their first visit, so switching back needs no rebuild. Default
   * on; the switch is a safety net during the test phase.
   */
  keepTabsAlive: boolean;
  /**
   * Experimental switches (docs/dev/history/technical-design-about-debug-experimental.md
   * §3.1): the Google Calendar and Gmail integrations are only shown when on.
   * Off hides their entry points; their configuration above stays stored.
   * Read them through domain/features.ts's featuresOf.
   */
  experimentalGoogleCalendar: boolean;
  experimentalGmail: boolean;
  /**
   * Module switches (Settings → Features, docs/dev/history/technical-design-daily-slim.md
   * §3.6): `closeOut` - Project close-out, on by default. Per profile. Read
   * through domain/features.ts's featuresOf/modulesOf, which fill a missing
   * key from its default, so stored settings without the map need no migration.
   */
  modules: Modules;
  /**
   * Contexts (docs/dev/history/technical-design-time-and-place.md §3.3,
   * domain/contexts.ts): Work, Home, Café - what Daily, Week, Month, Projects,
   * Areas and Review show. Per profile; edited in Settings → Contexts.
   */
  contexts: ContextDef[];
  /** The active context's id; '' = Everything. Per profile; chosen from the tab bar's chip. */
  activeContextId: string;
  /** Everything's Given time threshold for loops and counterparts (a context without its own uses it too). Per profile. */
  givenTimeMinMinutes: MinMinutes;
  /** Debug logging: also append every log line to a rotating file in the debug folder (utils/logSink.ts). */
  debugLogging: boolean;
  /**
   * "Notebook contents" (docs/dev/history/technical-design-home-notebooks.md
   * §3.5): the Notebook tab lists the home notebook's headings. Experimental,
   * default on; off shows name, years and Open only.
   */
  notebookContentsEnabled: boolean;
  /**
   * The setup assistant (docs/dev/history/technical-design-easy-start.md §5): 'pending' only on a
   * fresh install (domain/features.ts's prepareFreshInstall), until it is finished or skipped;
   * it then opens once by itself. Per profile.
   */
  setupAssistant: 'pending' | 'done';
  /**
   * The last release version whose "Updated to x.y.z" notice the user
   * acknowledged (tapped What's new or ✕). '' = none yet.
   */
  lastSeenVersion: string;
  /**
   * Kept runs on fresh settings (docs/dev/history/technical-design-fresh-start-profile.md §3.1):
   * set on a fresh install (domain/features.ts's prepareFreshInstall), cleared when a profile is
   * loaded or saved. While set, a saved profile file is never written from these settings without
   * asking, and the active profile can be restored from its file. Device-wide.
   */
  freshStart: boolean;
  /**
   * The GitHub update check (docs/dev/history/technical-design-in-app-updates.md §3): 'manual'
   * only when the user taps Check now, 'daily' also once a day when Kept opens. Device-wide: it
   * concerns the installed build, not a profile's data. Stored settings without it read as 'manual'.
   */
  updateCheck: UpdateCheckMode;
  /**
   * Which profile is active (docs/dev/history/technical-design-profiles-demo-space.md) -
   * the file name of its JSON in EXPORT/kept-gtd/profiles, without ".json".
   * Device-wide; 'production' is the default profile.
   */
  activeProfileId: string;
}

/** sn-plugin-lib `Title.style` values a heading can take (0 = remove is not one). */
export type NoteHeadingStyle = 1 | 2 | 3 | 4;

export const DEFAULT_SETTINGS: GtdParaSettings = {
  baseRoot: '/storage/emulated/0/Note',
  projectsFolder: '1 Projects',
  areasFolder: '2 Areas',
  resourcesFolder: '3 Resources',
  archiveFolder: '4 Archive',
  inboxFolder: '0 Inbox',
  reviewSteps: {},
  hideDoneProjectTasks: false,
  hideDoneInboxTasks: false,
  googleCalendarIcsUrl: '',
  engageCurrent: null,
  noteSetups: [],
  noteSetupDefaults: seedNoteSetupDefaults(),
  nextNoteSetupId: 1,
  noteHeadingStyle: 3,
  gmailEmail: '',
  gmailAppPassword: '',
  gmailImapHost: 'imap.gmail.com',
  gmailHideHandled: false,
  perfTracing: false,
  keepTabsAlive: true,
  experimentalGoogleCalendar: false,
  experimentalGmail: false,
  modules: DEFAULT_MODULES,
  contexts: [],
  activeContextId: '',
  givenTimeMinMinutes: {week: 60, month: 120},
  debugLogging: false,
  notebookContentsEnabled: true,
  setupAssistant: 'done',
  lastSeenVersion: '',
  freshStart: false,
  updateCheck: 'manual',
  activeProfileId: 'production',
};

export interface ResolvedParaPaths {
  base: string;
  projects: string;
  areas: string;
  resources: string;
  archive: string;
  /**
   * The Inbox's own folder (`<areas>/<inboxFolder>`) - the Inbox's item path:
   * Inbox.txt and its Todos/Meetings note folders live here.
   */
  inboxFolder: string;
  /** The untriaged-capture file, `<inboxFolder>/Inbox.txt`. */
  inbox: string;
}

function joinPath(base: string, segment: string): string {
  const trimmedBase = base.replace(/\/+$/, '');
  const trimmedSegment = segment.replace(/^\/+/, '');
  return `${trimmedBase}/${trimmedSegment}`;
}

/**
 * Turns the base root + per-folder names into the absolute paths the
 * native file module reads. Falls back field-by-field to DEFAULT_SETTINGS
 * for anything blank, so a partially-filled-in settings form still
 * resolves to something sensible.
 */
export function resolvePaths(settings: GtdParaSettings): ResolvedParaPaths {
  const base = (settings.baseRoot || DEFAULT_SETTINGS.baseRoot).replace(/\/+$/, '');
  const areas = joinPath(base, settings.areasFolder || DEFAULT_SETTINGS.areasFolder).replace(/\/+$/, '');
  const inboxFolder = joinPath(areas, (settings.inboxFolder || DEFAULT_SETTINGS.inboxFolder).trim()).replace(/\/+$/, '');
  return {
    base,
    projects: joinPath(base, settings.projectsFolder || DEFAULT_SETTINGS.projectsFolder),
    areas,
    resources: joinPath(base, settings.resourcesFolder || DEFAULT_SETTINGS.resourcesFolder),
    archive: joinPath(base, settings.archiveFolder || DEFAULT_SETTINGS.archiveFolder),
    inboxFolder,
    inbox: joinPath(inboxFolder, INBOX_FILE_NAME),
  };
}

/** Whether `folderPath` is the configured Inbox folder (exact match, trailing slashes ignored). Keeps it out of every Area listing. */
export function isInboxFolder(paths: ResolvedParaPaths, folderPath: string): boolean {
  return folderPath.replace(/\/+$/, '') === paths.inboxFolder;
}

/** Whether `filePath` is the Inbox folder or anything inside it. */
export function isUnderInboxFolder(paths: ResolvedParaPaths, filePath: string): boolean {
  return filePath === paths.inboxFolder || filePath.startsWith(`${paths.inboxFolder}/`);
}

/** Problem with a typed Inbox folder name, or null when it can be used. */
export function validateInboxFolderName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'The Inbox folder needs a name.';
  if (trimmed.includes('/') || trimmed.includes('\\')) return 'The Inbox folder name cannot contain a slash.';
  if (trimmed.startsWith('.')) return 'The Inbox folder name cannot start with a dot.';
  if (trimmed.length > 60) return 'The Inbox folder name is too long (60 characters at most).';
  return null;
}

export interface EnclosingItem {
  kind: 'project' | 'area';
  name: string;
  path: string;
}

/**
 * If `filePath` (the note that was open when the plugin launched) lives
 * anywhere under the Projects or Areas root - directly in a Project/Area's
 * own folder, or nested any number of levels deeper (e.g. its own
 * "Meetings"/"Todos" subfolder) - resolves the *top-level* Project/Area
 * folder that owns it. Returns null if `filePath` isn't under either root
 * at all (e.g. it's in Resources/Archive/Inbox, or outside the configured
 * base entirely).
 */
export function findEnclosingItem(
  paths: ResolvedParaPaths,
  filePath: string,
): EnclosingItem | null {
  const roots: Array<{kind: 'project' | 'area'; root: string}> = [
    {kind: 'project', root: paths.projects},
    {kind: 'area', root: paths.areas},
  ];
  // The Inbox folder sits inside Areas but is never an Area
  // (technical-design-inbox-as-area.md §3.1) - a note in it has no
  // enclosing Project/Area.
  if (isUnderInboxFolder(paths, filePath)) return null;
  for (const {kind, root} of roots) {
    const prefix = `${root.replace(/\/+$/, '')}/`;
    if (!filePath.startsWith(prefix)) continue;
    const rest = filePath.slice(prefix.length);
    const name = rest.split('/')[0];
    if (!name) continue;
    return {kind, name, path: `${prefix}${name}`};
  }
  return null;
}
