// Settings in pieces (technical-design-quality-0.9.md §3.11, technical-design-settings-tabs.md): every tab renders, and each
// block's Save writes only that block.
const mockSaved: unknown[] = [];

jest.mock('react-native-svg', () => {
  const ReactLib = require('react');
  const stub = (props: object) => ReactLib.createElement('Svg', props);
  return {Svg: stub, Path: stub, Circle: stub, Rect: stub, Line: stub, Polyline: stub, G: stub};
});
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@react-native-clipboard/clipboard', () => ({setString: jest.fn(), getString: jest.fn(async () => '')}));
jest.mock('sn-plugin-lib', () => ({NativePluginManager: {}, PluginManager: {}, PluginCommAPI: {}, PluginFileAPI: {}, PluginNoteAPI: {}}));
jest.mock('../../src/utils/screenRefresh', () => ({requestEinkRefresh: jest.fn(), useEinkRefreshOnLoad: jest.fn()}));
jest.mock('../../src/utils/log', () => ({log: jest.fn(), logWarn: jest.fn(), logError: jest.fn()}));
jest.mock('../../src/supernote/fileSystem', () => ({
  ...jest.requireActual('../../src/supernote/fileSystem'),
  listFolderEntries: async () => [{name: 'Lined.png', path: '/MyStyle/Lined.png', isFolder: false}],
}));
jest.mock('../../src/storage/settingsStorage', () => {
  const s = jest.requireActual('../../src/domain/settings');
  const stored = {...s.DEFAULT_SETTINGS, experimentalGoogleCalendar: true, experimentalGmail: true};
  return {
    loadSettings: async () => stored,
    saveSettings: async (v: unknown) => {
      mockSaved.push(v);
    },
    patchSettings: async (patch: object) => {
      mockSaved.push(patch);
      return {...stored, ...patch};
    },
  };
});
jest.mock('../../src/storage/dataCache', () => ({clearCachedData: jest.fn(), rebuildCache: jest.fn()}));
jest.mock('../../src/storage/gmailInboxCache', () => ({clearCachedGmailInbox: jest.fn()}));
jest.mock('../../src/storage/inboxFolder', () => ({renameInboxFolderForSave: async () => 'unchanged'}));

import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {Text, TextInput} from 'react-native';
import Settings, {SettingsTab} from '../../src/screens/settings/Settings';
import {setFeatures} from '../../src/ui/featureStore';
import {StatusProvider} from '../../src/ui/status/StatusProvider';

async function render(tab: SettingsTab) {
  let r!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(
      <StatusProvider>
        <Settings initialTab={tab} />
      </StatusProvider>,
    );
  });
  return r;
}

const texts = (r: TestRenderer.ReactTestRenderer) =>
  r.root.findAllByType(Text).map(t => [].concat(t.props.children).join(''));

beforeAll(() => setFeatures({googleCalendar: true, gmail: true, closeOut: true}));

describe('Settings tabs', () => {
  it.each<[SettingsTab, string]>([
    ['data', 'Projects folder'],
    ['features', 'Google Calendar ICS link'],
    ['features', 'Gmail address'],
    ['templates', '+ New note setup'],
    ['advanced', 'Reload all files'],
    ['advanced', 'Export debug bundle'],
    ['about', 'Problems and ideas'],
  ])('%s renders', async (tab, expected) => {
    const r = await render(tab);
    expect(texts(r).some(t => t.includes(expected))).toBe(true);
  });

  it('offers the Heading style and saves a change at once', async () => {
    const r = await render('templates');
    const tabs = r.root.findAll(n => Array.isArray(n.props.tabs) && n.props.tabs.some((t: {label: string}) => t.label === 'Dark grey'))[0];
    expect(tabs.props.tabs.map((t: {label: string}) => t.label)).toEqual(['Black', 'Light grey', 'Dark grey', 'Shadow']);
    expect(tabs.props.activeKey).toBe('3');
    await act(async () => tabs.props.onChange('1'));
    expect(mockSaved.at(-1)).toMatchObject({noteHeadingStyle: 1});
  });

  it('Save writes the edited folder name', async () => {
    const r = await render('data');
    const input = r.root.findAllByType(TextInput)[1];
    await act(async () => input.props.onChangeText('Projekte'));
    const save = r.root.findAll(n => n.props.onPress && texts({root: n} as never).includes('Save'))[0];
    await act(async () => save.props.onPress());
    expect(mockSaved.at(-1)).toMatchObject({projectsFolder: 'Projekte'});
  });

  it('the calendar block saves only its link, not an unsaved folder edit', async () => {
    const r = await render('features');
    const inputs = r.root.findAllByType(TextInput);
    await act(async () => inputs[0].props.onChangeText(' https://calendar.example/basic.ics '));
    const save = r.root.findAll(n => n.props.onPress && n.props.label === 'Save')[0];
    await act(async () => save.props.onPress());
    expect(mockSaved.at(-1)).toMatchObject({googleCalendarIcsUrl: 'https://calendar.example/basic.ics', projectsFolder: '1 Projects'});
  });

  it('greys Run setup assistant while a folder field is unsaved', async () => {
    const r = await render('data');
    const assistant = () => r.root.findAll(n => n.props.label === 'Run setup assistant')[0];
    expect(assistant().props.disabled).toBe(false);
    await act(async () => r.root.findAllByType(TextInput)[1].props.onChangeText('Projekte'));
    expect(assistant().props.disabled).toBe(true);
    expect(texts(r)).toContain('Save or reset the folder fields first.');
  });
});
