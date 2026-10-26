// docs/dev/history/technical-design-perf-current-page.md §3.4, §6 scenario 5: Quick Add builds the active tab's
// rows first and the other tabs' rows right after the page is on screen; an edit builds its tab at once.
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
jest.mock('../../src/storage/tagUsage', () => ({
  getRecentTags: () => new Promise(() => undefined),
  getRecentTagsSync: () => [],
  recordTagsUsed: async () => undefined,
}));
jest.mock('../../src/ui/useAbbrevItems', () => ({useAbbrevItems: () => []}));

import React from 'react';
import {TextInput} from 'react-native';
import TestRenderer, {act} from 'react-test-renderer';
import QuickAddWidget, {editTargetFor, QuickAddEditTarget} from '../../src/ui/QuickAddWidget';
import {StatusProvider} from '../../src/ui/status/StatusProvider';
import {runAfterEinkFlush} from '../../src/utils/einkFlush';
import {meeting} from '../../test-helpers/fixtures';

function mount(): {r: TestRenderer.ReactTestRenderer; setTarget: (t: QuickAddEditTarget | null) => void} {
  const element = (target: QuickAddEditTarget | null) => (
    <StatusProvider>
      <QuickAddWidget
        fixedDestination={{type: 'inbox'}}
        onAddTask={async () => undefined}
        onAddMeeting={async () => undefined}
        onAddNote={async () => undefined}
        noteFolderPath="/Note/2 Areas/Zen"
        editTarget={target}
        onSaveEditMeeting={async () => undefined}
        onCancelEdit={() => undefined}
        textColor="#000"
        borderColor="#000"
        placeholderColor="#888"
      />
    </StatusProvider>
  );
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(element(null));
  });
  return {r, setTarget: target => act(() => r.update(element(target)))};
}
const fields = (r: TestRenderer.ReactTestRenderer) => r.root.findAllByType(TextInput).map(i => i.props.placeholder);

it('builds the Todo rows first and every tab after the e-ink flush', () => {
  const {r} = mount();
  expect(fields(r)).toContain('New task');
  expect(fields(r)).not.toContain('New meeting title');
  expect(fields(r)).not.toContain('New note');
  act(() => runAfterEinkFlush());
  expect(fields(r)).toEqual(expect.arrayContaining(['New task', 'New meeting title', 'New note']));
  act(() => r.unmount());
});

it('builds a meeting edit\'s rows at once, before any flush', () => {
  const {r, setTarget} = mount();
  setTarget(editTargetFor('meeting:0', {meeting: meeting('2026-10-26', 'Sync')}));
  const title = r.root.findAllByType(TextInput).find(i => i.props.placeholder === 'New meeting title');
  expect(title?.props.value).toBe('Sync');
  act(() => r.unmount());
});
