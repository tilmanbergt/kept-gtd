import {folderStatus, folderStatusText, initialChoices, planFinish, suggestFolders} from '../../src/domain/setupAssistant';
import {DEFAULT_HOME_NOTEBOOK} from '../../src/domain/noteSetups';
import {DEFAULT_SETTINGS} from '../../src/domain/settings';

const folder = (name: string) => ({name, isFolder: true});

describe('suggestFolders', () => {
  it('finds the common names of existing PARA folders', () => {
    expect(suggestFolders([folder('Projects'), folder('2 Areas'), folder('03_Resources'), folder('4. Archive'), {name: 'Projects.txt', isFolder: false}])).toEqual({
      projects: 'Projects',
      areas: '2 Areas',
      resources: '03_Resources',
      archive: '4. Archive',
    });
  });
  it('no suggestion for a role with no or two fitting folders', () => {
    expect(suggestFolders([folder('Projects'), folder('1 Projects'), folder('Garden')])).toEqual({});
  });
});

describe('folderStatus', () => {
  const entries = [folder('Projects'), folder('Garden')];
  it('exists with its subfolder count, or will be created', () => {
    expect(folderStatusText(folderStatus('Projects', entries, {Projects: 3}))).toBe('exists · 3 folders');
    expect(folderStatusText(folderStatus('Garden', entries, {Garden: 1}))).toBe('exists · 1 folder');
    expect(folderStatusText(folderStatus('2 Areas', entries, {}))).toBe('will be created');
  });
});

describe('planFinish', () => {
  const statuses = {projects: {exists: true, subfolders: 3}, areas: {exists: false, subfolders: 0}, resources: {exists: false, subfolders: 0}, archive: {exists: true, subfolders: 0}};
  it('saves the folder names, creates only the missing ones, Simple switches off', () => {
    const choices = {...initialChoices(DEFAULT_SETTINGS, {projects: 'Projects'}), notes: 'notebook' as const, features: 'simple' as const};
    const plan = planFinish(choices, DEFAULT_SETTINGS, statuses);
    expect(plan.foldersToCreate).toEqual(['2 Areas', '3 Resources']);
    expect(plan.settingsPatch).toMatchObject({
      projectsFolder: 'Projects',
      areasFolder: '2 Areas',
      modules: {closeOut: false},
      experimentalGoogleCalendar: false,
      experimentalGmail: false,
      notebookContentsEnabled: false,
      setupAssistant: 'done',
    });
    expect(plan.settingsPatch.noteSetupDefaults?.notebook).toEqual(DEFAULT_HOME_NOTEBOOK);
  });
  it('Everything switches all on; own notes clear the Default notebook', () => {
    const choices = {...initialChoices(DEFAULT_SETTINGS, {}), notes: 'own' as const, features: 'everything' as const};
    const plan = planFinish(choices, DEFAULT_SETTINGS, statuses);
    expect(plan.settingsPatch).toMatchObject({modules: {closeOut: true}, experimentalGoogleCalendar: true, experimentalGmail: true, notebookContentsEnabled: true});
    expect(plan.settingsPatch.noteSetupDefaults?.notebook).toBeNull();
  });
  it('a blank name keeps the current one', () => {
    const choices = initialChoices(DEFAULT_SETTINGS, {});
    choices.folders.projects = '  ';
    expect(planFinish(choices, DEFAULT_SETTINGS, statuses).settingsPatch.projectsFolder).toBe('1 Projects');
  });
});
