// The meeting card in Quick Add's place (docs/dev/history/technical-design-item-card.md K8): its slots
// per model, its buttons, and New from this.
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
jest.mock('../../src/ui/useAbbrevItems', () => ({
  useAbbrevItems: () => [{kind: 'area', name: 'Coaching', path: '/a/coaching', abbrev: 'Co', status: 'active'}],
}));

import React from 'react';
import {Text, TextInput} from 'react-native';
import TestRenderer, {act} from 'react-test-renderer';
import QuickAddWidget, {editTargetFor} from '../../src/ui/QuickAddWidget';
import {meetingCardModel, MeetingCardInput} from '../../src/domain/itemCard';
import {deriveMeetingFields} from '../../src/domain/markdown';
import {createNoteSetup} from '../../src/domain/noteSetups';
import {Meeting} from '../../src/domain/types';
import {MeetingCardData} from '../../src/ui/itemCard/useMeetingCard';
import {StatusProvider} from '../../src/ui/status/StatusProvider';

const sparring = {...createNoteSetup('1', 'thread'), name: 'Sparring', tags: ['sparring'], tracking: {trackPrep: true, trackReview: true}};
const setups = {setups: [sparring], defaults: {pages: {}, tracking: {trackPrep: false, trackReview: false}, notebook: null}};
const mk = (date: string, extra: Partial<Meeting> = {}): Meeting => ({
  title: 'Sparring Jordan #sparring/jordan',
  date,
  time: '10:00',
  endTime: '11:00',
  days: 1,
  cancelled: false,
  notePath: '',
  linkedFile: '',
  ...deriveMeetingFields('Sparring Jordan #sparring/jordan'),
  ...extra,
});
const ahead = mk('2999-01-01');
const over = mk('2000-01-03');

function card(m: Meeting, extra: Partial<MeetingCardInput> = {}, handlers: Partial<MeetingCardData> = {}): MeetingCardData {
  const model = meetingCardModel({meeting: m, setups, nowMs: Date.now(), reflection: 'none', ownerName: 'Coaching', canLink: false, canRefile: false, ...extra});
  return {
    meeting: m, model, busy: false, onEdit: jest.fn(), onClose: jest.fn(), onCheckpoint: jest.fn(), onMonthly: jest.fn(), onNote: jest.fn(),
    onReflect: jest.fn(), onUnlink: jest.fn(), onCancelMeeting: jest.fn(), onOpenThread: jest.fn(), ...handlers,
  };
}

/** Quick Add with `m`'s card, as a screen holds it: ending the edit clears the target. */
function Screen({m, data, onCancelEdit}: {m: Meeting; data: MeetingCardData; onCancelEdit: () => void}) {
  const [selected, setSelected] = React.useState(true);
  return (
    <QuickAddWidget
      fixedDestination={{type: 'inbox'}}
      onAddTask={async () => undefined}
      onAddMeeting={async () => undefined}
      editTarget={selected ? editTargetFor('meeting:0', {meeting: m}, 'card') : null}
      meetingCard={selected ? data : null}
      onCancelEdit={() => {
        onCancelEdit();
        setSelected(false);
      }}
      textColor="#000"
      borderColor="#000"
      placeholderColor="#888"
    />
  );
}

function render(m: Meeting, data: MeetingCardData, onCancelEdit = jest.fn()) {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <StatusProvider>
        <Screen m={m} data={data} onCancelEdit={onCancelEdit} />
      </StatusProvider>,
    );
  });
  return r;
}

const labels = (r: TestRenderer.ReactTestRenderer) =>
  r.root.findAll(n => typeof n.props.accessibilityLabel === 'string' && typeof n.props.onPress === 'function').map(n => n.props.accessibilityLabel as string);
const press = (r: TestRenderer.ReactTestRenderer, label: string) =>
  act(() => r.root.findAll(n => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0].props.onPress());
const pressText = (r: TestRenderer.ReactTestRenderer, text: string) =>
  act(() => r.root.findAll(n => typeof n.props.onPress === 'function' && n.findAllByType(Text).some(t => t.props.children === text))[0].props.onPress());
const texts = (r: TestRenderer.ReactTestRenderer) => r.root.findAllByType(Text).map(t => [t.props.children].flat().join(''));

describe('MeetingCard', () => {
  it('a meeting ahead: caption, thread line, P, note, M, More; More holds Edit, the owner, New from this, Cancel', () => {
    const r = render(ahead, card(ahead));
    expect(texts(r)).toEqual(expect.arrayContaining(['Meeting · Coaching · ahead', '#sparring/jordan ›', 'Sparring Jordan #sparring/jordan', 'P', 'M', '+ Note', 'More ›', '✕']));
    expect(labels(r)).toEqual(expect.arrayContaining(['Close', 'Prepped', 'Month highlight', 'Create note', 'More']));
    expect(labels(r)).not.toContain('Reflect');
    press(r, 'More');
    expect(texts(r)).toEqual(expect.arrayContaining(['Edit', 'Coaching']));
    expect(labels(r)).toEqual(expect.arrayContaining(['New from this', 'Cancel meeting', 'Back']));
    expect(labels(r)).not.toContain('Link file');
    expect(labels(r)).not.toContain('Refile');
  });

  it('a meeting that is over: R and Reflect; filled once the page exists', () => {
    const r = render(over, card(over, {reflection: 'exists'}));
    expect(texts(r)).toContain('R');
    expect(labels(r)).toContain('Reflection');
    const reflect = r.root.findAll(n => n.props.accessibilityLabel === 'Reflection' && n.props.accessibilityState)[0];
    expect(reflect.props.accessibilityState).toEqual({disabled: false, selected: true});
  });

  it('a linked file shows its name with ✕; +clip and the refile arrow only where the screen can', () => {
    const linked = {...ahead, linkedFile: 'Resources/brief.pdf'};
    const r = render(linked, card(linked, {canLink: true, canRefile: true}, {onOpenFile: jest.fn(), onRefile: jest.fn(), onLink: jest.fn()}));
    press(r, 'More');
    expect(texts(r)).toContain('brief.pdf');
    expect(labels(r)).toEqual(expect.arrayContaining(['Unlink', 'Open linked file', 'Refile']));
    const plain = render(ahead, card(ahead, {canLink: true}, {onLink: jest.fn()}));
    press(plain, 'More');
    expect(labels(plain)).toContain('Link file');
  });

  it('a cancelled meeting has no Cancel meeting and no P/R', () => {
    const cancelled = {...ahead, cancelled: true};
    const r = render(cancelled, card(cancelled));
    expect(texts(r)).toContain('Meeting · Coaching · cancelled');
    expect(labels(r)).not.toContain('Prepped');
    press(r, 'More');
    expect(labels(r)).not.toContain('Cancel meeting');
  });

  it('every button calls its handler', () => {
    const data = card(over, {canLink: false}, {onOpenOwner: jest.fn()});
    const r = render(over, data);
    pressText(r, '#sparring/jordan ›');
    press(r, 'Close');
    press(r, 'Reviewed');
    press(r, 'Month highlight');
    press(r, 'Create note');
    press(r, 'Reflect');
    press(r, 'More');
    press(r, 'Edit');
    press(r, 'Cancel meeting');
    press(r, 'Open Coaching');
    for (const h of [data.onEdit, data.onClose, data.onCheckpoint, data.onMonthly, data.onNote, data.onReflect, data.onCancelMeeting, data.onOpenOwner, data.onOpenThread]) {
      expect(h).toHaveBeenCalledTimes(1);
    }
  });

  it('New from this fills the Meeting draft from the meeting and closes the card', () => {
    const onCancelEdit = jest.fn();
    const r = render(ahead, card(ahead), onCancelEdit);
    press(r, 'More');
    press(r, 'New from this');
    expect(onCancelEdit).toHaveBeenCalledTimes(1);
    const title = r.root.findAllByType(TextInput).find(i => i.props.placeholder === 'New meeting')!;
    expect(title.props.value).toBe('Sparring Jordan #sparring/jordan');
  });

  it('the create rows stay mounted behind the card, so a half-typed draft survives', () => {
    const r = render(ahead, card(ahead));
    expect(r.root.findAllByType(TextInput).some(i => i.props.placeholder === 'New todo')).toBe(true);
  });
});
