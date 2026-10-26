// docs/dev/history/technical-design-perf-threads.md §3.6, §6 scenario 7: the Threads tab builds its roster
// once per open, with the final thread types.
jest.mock('react-native-svg', () => {
  const ReactLib = require('react');
  const stub = (props: object) => ReactLib.createElement('Svg', props);
  return {Svg: stub, Path: stub, Circle: stub, Rect: stub, Line: stub, Polyline: stub, G: stub};
});
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('sn-plugin-lib', () => ({PluginManager: {}, PluginCommAPI: {}, PluginFileAPI: {}, PluginNoteAPI: {}}));
jest.mock('../../src/supernote/fileSystem', () => ({}));
jest.mock('../../src/utils/screenRefresh', () => ({requestEinkRefresh: jest.fn(), useEinkRefreshOnLoad: jest.fn()}));
jest.mock('../../src/utils/log', () => ({log: jest.fn(), logWarn: jest.fn(), logError: jest.fn()}));

const mockLoad: {next: () => Promise<unknown>} = {next: async () => ({})};
jest.mock('../../src/storage/settingsStorage', () => ({loadSettings: () => mockLoad.next()}));
jest.mock('../../src/storage/tendingRoster', () => {
  const actual = jest.requireActual('../../src/storage/tendingRoster');
  return {...actual, buildScopeRoster: jest.fn(actual.buildScopeRoster)};
});
const mockItems: {items: unknown[]} = {items: []};
jest.mock('../../src/ui/useCachedItems', () => ({useCachedItems: () => mockItems.items}));
jest.mock('../../src/ui/useCachedInbox', () => ({useCachedInbox: () => null}));

import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {createNoteSetup} from '../../src/domain/noteSetups';
import {DEFAULT_SETTINGS, GtdParaSettings} from '../../src/domain/settings';
import {deriveMeetingFields} from '../../src/domain/markdown';
import {parseThreadsSpan} from '../../src/domain/threadsSection';
import {rememberSettings} from '../../src/storage/settingsSnapshot';
import {buildScopeRoster} from '../../src/storage/tendingRoster';
import ThreadsTab from '../../src/screens/thread/ThreadsTab';
import {item, meeting, task} from '../../test-helpers/fixtures';

const area = item('area', 'Coaching', {
  tasks: [task('Draft agenda #retro/alpha'), task('Ask Anna #wf/anna')],
  meetings: [meeting('2026-01-07', 'Retro #retro/alpha', {...deriveMeetingFields('Retro #retro/alpha'), time: '10:00', endTime: '11:00'})],
  threads: parseThreadsSpan('## Threads\n- alpha: active\n').threads,
});
mockItems.items = [area];

const withSetups = (tags: string[]): GtdParaSettings => ({
  ...DEFAULT_SETTINGS,
  noteSetups: tags.map((tag, i) => ({...createNoteSetup(`t${i}`, 'thread'), name: tag, tags: [tag]})),
});
const built = buildScopeRoster as jest.Mock;

/** A load that resolves when the test says so. */
function deferredLoad(): (settings: GtdParaSettings) => Promise<void> {
  let resolve!: (s: GtdParaSettings) => void;
  const promise = new Promise<GtdParaSettings>(r => (resolve = r));
  mockLoad.next = () => promise;
  return async settings => {
    await act(async () => {
      resolve(settings);
      await promise;
    });
  };
}

async function mount(): Promise<TestRenderer.ReactTestRenderer> {
  let r!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(
      <ThreadsTab path={area.path} selected={null} onSelect={() => undefined} onNextMeeting={() => undefined} viewportHeight={600} textColor="#000" borderColor="#000" />,
    );
  });
  return r;
}

const list = (r: TestRenderer.ReactTestRenderer) => r.root.findAll(n => n.props.header === 'Threads' && Array.isArray(n.props.rows))[0].props;

beforeEach(() => {
  built.mockClear();
  rememberSettings(null);
});

describe('Threads tab: one roster per open (scenario 7)', () => {
  it('builds once from the snapshot, and not again when the load brings the same types', async () => {
    rememberSettings(withSetups(['retro']));
    const finishLoad = deferredLoad();
    const r = await mount();
    expect(built).toHaveBeenCalledTimes(1);
    expect(list(r).rows.map((row: {kind: string}) => row.kind)).toContain('active');
    await finishLoad(withSetups(['retro']));
    expect(built).toHaveBeenCalledTimes(1);
    act(() => r.unmount());
  });

  it('builds again when the loaded types differ', async () => {
    rememberSettings(withSetups(['retro']));
    const finishLoad = deferredLoad();
    const r = await mount();
    await finishLoad(withSetups(['retro', '101']));
    expect(built).toHaveBeenCalledTimes(2);
    act(() => r.unmount());
  });

  it('without a snapshot, waits for the settings and shows "Loading threads…" meanwhile', async () => {
    const finishLoad = deferredLoad();
    const r = await mount();
    expect(built).not.toHaveBeenCalled();
    expect(list(r).rows).toEqual([]);
    expect(list(r).emptyHint).toBe('Loading threads…');
    await finishLoad(withSetups(['retro']));
    expect(built).toHaveBeenCalledTimes(1);
    expect(list(r).rows.map((row: {kind: string}) => row.kind)).toContain('active');
    act(() => r.unmount());
  });
});
