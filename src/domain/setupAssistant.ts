/**
 * The setup assistant's decisions (docs/dev/history/technical-design-easy-start.md §5.2,
 * requirements S1-S3): which existing folders to suggest for the four PARA
 * roles, what Kept finds for each, and what Finish saves and creates. Pure; the
 * screen is screens/settings/SetupAssistant.tsx, the writes storage/setupAssistant.ts.
 */
import {modulesOf} from './features';
import {DEFAULT_HOME_NOTEBOOK} from './noteSetups';
import {GtdParaSettings} from './settings';

export type FolderRole = 'projects' | 'areas' | 'resources' | 'archive';
export const FOLDER_ROLES: FolderRole[] = ['projects', 'areas', 'resources', 'archive'];

/** The settings key of each role's folder name. */
export const ROLE_KEY: Record<FolderRole, 'projectsFolder' | 'areasFolder' | 'resourcesFolder' | 'archiveFolder'> = {
  projects: 'projectsFolder',
  areas: 'areasFolder',
  resources: 'resourcesFolder',
  archive: 'archiveFolder',
};

/** "Projects", "1 Projects", "01 Projects", "1_projects", "2. Area" … for each role. */
const ROLE_NAME: Record<FolderRole, RegExp> = {
  projects: /^(\d{1,2}[\s._-]*)?projects?$/i,
  areas: /^(\d{1,2}[\s._-]*)?areas?$/i,
  resources: /^(\d{1,2}[\s._-]*)?resources?$/i,
  archive: /^(\d{1,2}[\s._-]*)?archives?$/i,
};

export interface RootEntry {
  name: string;
  isFolder: boolean;
}

/** For each role, the one folder in the base folder whose name fits it; a role with no or several fitting folders gets none. */
export function suggestFolders(rootEntries: RootEntry[]): Partial<Record<FolderRole, string>> {
  const out: Partial<Record<FolderRole, string>> = {};
  for (const role of FOLDER_ROLES) {
    const matches = rootEntries.filter(e => e.isFolder && ROLE_NAME[role].test(e.name.trim()));
    if (matches.length === 1) out[role] = matches[0].name;
  }
  return out;
}

export interface FolderStatus {
  exists: boolean;
  /** Subfolders in it (each one a project or area); 0 when it doesn't exist. */
  subfolders: number;
}

/** What Kept finds for a folder `name` of the base folder; `childCounts` holds the subfolder count of every folder listed. */
export function folderStatus(name: string, rootEntries: RootEntry[], childCounts: Record<string, number>): FolderStatus {
  const exists = rootEntries.some(e => e.isFolder && e.name === name.trim());
  return {exists, subfolders: exists ? childCounts[name.trim()] ?? 0 : 0};
}

/** The line under a folder field: "exists · 12 folders" or "will be created". */
export function folderStatusText(status: FolderStatus): string {
  if (!status.exists) return 'will be created';
  return `exists · ${status.subfolders} ${status.subfolders === 1 ? 'folder' : 'folders'}`;
}

export type NotesChoice = 'notebook' | 'own';
export type FeaturesChoice = 'simple' | 'everything';

export interface SetupChoices {
  baseRoot: string;
  folders: Record<FolderRole, string>;
  notes: NotesChoice;
  features: FeaturesChoice;
}

/** The choices the assistant starts with: the current settings, with a suggested existing folder for each role. */
export function initialChoices(current: GtdParaSettings, suggested: Partial<Record<FolderRole, string>>): SetupChoices {
  const folders = {} as Record<FolderRole, string>;
  for (const role of FOLDER_ROLES) folders[role] = suggested[role] ?? current[ROLE_KEY[role]];
  return {
    baseRoot: current.baseRoot,
    folders,
    notes: current.noteSetupDefaults.notebook ? 'notebook' : 'own',
    features: current.experimentalGoogleCalendar && current.experimentalGmail ? 'everything' : 'simple',
  };
}

export interface FinishPlan {
  settingsPatch: Partial<GtdParaSettings>;
  /** Folder names in the base folder that Finish creates (the missing ones only), in role order. */
  foldersToCreate: string[];
}

/**
 * What Finish does (S3): save the folder names, the Default's notes (one
 * notebook per project and year, or an own note per item), the features
 * (Simple: close-out, Google Calendar, Gmail and Notebook contents off;
 * Everything: all on) and `setupAssistant: 'done'`; create only the folders
 * `statuses` says are missing. Nothing is moved, renamed or deleted.
 */
export function planFinish(choices: SetupChoices, current: GtdParaSettings, statuses: Record<FolderRole, FolderStatus>): FinishPlan {
  const everything = choices.features === 'everything';
  const settingsPatch: Partial<GtdParaSettings> = {
    baseRoot: choices.baseRoot.trim() || current.baseRoot,
    noteSetupDefaults: {...current.noteSetupDefaults, notebook: choices.notes === 'notebook' ? {...DEFAULT_HOME_NOTEBOOK} : null},
    modules: {...modulesOf(current), closeOut: everything},
    experimentalGoogleCalendar: everything,
    experimentalGmail: everything,
    notebookContentsEnabled: everything,
    setupAssistant: 'done',
  };
  const foldersToCreate: string[] = [];
  for (const role of FOLDER_ROLES) {
    const name = choices.folders[role].trim() || current[ROLE_KEY[role]];
    settingsPatch[ROLE_KEY[role]] = name;
    if (!statuses[role].exists) foldersToCreate.push(name);
  }
  return {settingsPatch, foldersToCreate};
}
