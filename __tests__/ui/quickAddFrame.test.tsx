// The Quick Add box keeps one height in every state (docs/dev/history/technical-design-item-card.md
// §4, K2; docs/dev/history/technical-design-quickadd-redesign.md §3.1): the frame is QUICK_ADD_HEIGHT
// and the form's field, row 3 and row 4 have their fixed heights, so the lists below never move.
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
const mockRecent = Array.from({length: 30}, (_, i) => `tag${i}`);
jest.mock('../../src/storage/tagUsage', () => ({
  getRecentTags: () => new Promise(() => undefined),
  getRecentTagsSync: () => mockRecent,
  recordTagsUsed: async () => undefined,
}));
jest.mock('../../src/ui/useAbbrevItems', () => ({
  useAbbrevItems: () => [{kind: 'project', name: 'Garden renovation', path: '/p/garden', abbrev: 'GR', status: 'active'}],
}));

import React from 'react';
import {Pressable, StyleSheet, Text, TextInput, View, ViewStyle} from 'react-native';
import {KIND_BUTTON_GAP, KIND_BUTTON_HEIGHT} from '../../src/ui/quickAdd/KindButtons';
import TestRenderer, {act} from 'react-test-renderer';
import QuickAddWidget, {editTargetFor, QuickAddEditTarget} from '../../src/ui/QuickAddWidget';
import {QUICK_ADD_HEIGHT, QUICK_ADD_ROWS} from '../../src/ui/quickAdd/QuickAddFrame';
import {QuickAddAdds} from '../../src/ui/quickAdd/ProvenanceLine';
import {FORM_FIELD_HEIGHT} from '../../src/ui/quickAdd/form/FormField';
import {StatusProvider} from '../../src/ui/status/StatusProvider';
import {Meeting, Task} from '../../src/domain/types';
import {meetingCardModel, todoCardModel} from '../../src/domain/itemCard';
import {EMPTY_NOTE_SETUP_CONFIG} from '../../src/domain/noteSetups';
import {MeetingCardData} from '../../src/ui/itemCard/useMeetingCard';
import {TodoCardData} from '../../src/ui/itemCard/useTodoCard';

const task = {text: 'Call Tom #tag1', done: false, cancelled: false, tags: [], dueDate: null, flowState: null, waitingOn: null, notePath: '', linkedFile: 'Docs/plan.pdf', fields: {meeting: null}} as unknown as Task;
const meeting: Meeting = {title: 'Sync', date: '2026-10-22', time: '10:00', endTime: '', days: 1, tags: [], cancelled: false, notePath: '', linkedFile: 'Docs/a.pdf'};

interface Setup {
  editTarget?: QuickAddEditTarget | null;
  provenance?: QuickAddAdds;
  meetingCard?: MeetingCardData | null;
  todoCard?: TodoCardData | null;
  collapsible?: boolean;
}

/** Card data for `m` as useMeetingCard builds it, every handler a mock. */
function cardFor(m: Meeting, extra: Partial<Parameters<typeof meetingCardModel>[0]> = {}): MeetingCardData {
  const model = meetingCardModel({meeting: m, setups: EMPTY_NOTE_SETUP_CONFIG, nowMs: Date.now(), reflection: 'none', ownerName: 'Coaching', canLink: true, canRefile: true, ...extra});
  const fn = () => jest.fn();
  return {
    meeting: m, model, busy: false, onEdit: fn(), onClose: fn(), onCheckpoint: fn(), onMonthly: fn(), onNote: fn(), onReflect: fn(),
    onOpenFile: fn(), onUnlink: fn(), onLink: fn(), onOpenOwner: fn(), onRefile: fn(), onCancelMeeting: fn(), onOpenThread: fn(),
  };
}

function render({editTarget = null, provenance, meetingCard, todoCard, collapsible}: Setup = {}) {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <StatusProvider>
        <QuickAddWidget
          fixedDestination={{type: 'inbox'}}
          onAddTask={async () => undefined}
          onAddMeeting={async () => undefined}
          onAddNote={async () => undefined}
          noteFolderPath="/p/garden"
          editTarget={editTarget}
          onSaveEditTask={async () => undefined}
          onSaveEditMeeting={async () => undefined}
          onCancelEdit={() => undefined}
          onDeleteEdit={() => undefined}
          onRefile={() => undefined}
          onQuickFile={async () => undefined}
          provenance={provenance}
          meetingCard={meetingCard}
          todoCard={todoCard}
          collapsible={collapsible}
          textColor="#000"
          borderColor="#000"
          placeholderColor="#888"
        />
      </StatusProvider>,
    );
  });
  return r;
}

const frame = (r: TestRenderer.ReactTestRenderer) => r.root.findAll(n => n.type === View && n.props.testID === 'quick-add-frame')[0];
const visible = (style: ViewStyle) => StyleSheet.flatten(style)?.display !== 'none';

/** The heights of the frame and of its visible rows, top to bottom. */
function heights(r: TestRenderer.ReactTestRenderer): {frame: unknown; rows: unknown[]} {
  const box = frame(r);
  // The row Views directly under the frame, through the row components that render them.
  const rowViews = (node: TestRenderer.ReactTestInstance): TestRenderer.ReactTestInstance[] =>
    node.children.flatMap(c =>
      typeof c === 'string' ? [] : c.type === View && c.props.testID === 'quick-add-rows-below' ? (visible(c.props.style) ? rowViews(c) : []) : c.type === View ? [c] : rowViews(c),
    );
  // The rows sit in one wrapper, hidden while the item card shows in their place.
  const wrapper = box.findAll(n => n.type === View && n.props.testID === 'quick-add-rows')[0];
  const container = visible(wrapper.props.style) ? wrapper : rowViews(box).filter(v => v !== wrapper)[0];
  const rows = rowViews(container)
    .filter(v => visible(v.props.style))
    .map(v => StyleSheet.flatten(v.props.style).height);
  return {frame: StyleSheet.flatten(box.props.style).height, rows};
}

const FIXED = [FORM_FIELD_HEIGHT, QUICK_ADD_ROWS.meta, QUICK_ADD_ROWS.extra];
/** A card keeps the four rows. */
const CARD_FIXED = [QUICK_ADD_ROWS.tabs, QUICK_ADD_ROWS.input, QUICK_ADD_ROWS.meta, QUICK_ADD_ROWS.extra];
const pressText = (r: TestRenderer.ReactTestRenderer, label: string) =>
  act(() => {
    r.root.findAll(n => n.type === Pressable && n.findAllByType(Text).some(t => t.props.children === label))[0].props.onPress();
  });

describe('Quick Add box height', () => {
  it('is 174 dp: border, padding, four rows and three gaps', () => {
    expect(QUICK_ADD_HEIGHT).toBe(174);
  });

  it('two rows of kind buttons fit the collapsed box, so nothing is cut when they wrap', () => {
    const inside = QUICK_ADD_HEIGHT - 2 * (1 + 10);
    expect(2 * (KIND_BUTTON_HEIGHT + KIND_BUTTON_GAP)).toBeLessThanOrEqual(inside);
  });

  // docs/dev/history/technical-design-calmer-screens.md §6 scenario 1, §3.2.
  it('collapsed: the kind buttons in R1, the rest hidden, the box as high as ever; + Todo opens the rows, ✕ collapses', () => {
    const r = render({collapsible: true});
    // R1 has no fixed height while collapsed: the large kind buttons may wrap.
    expect(heights(r)).toEqual({frame: QUICK_ADD_HEIGHT, rows: [undefined]});
    const labels = r.root.findAllByType(Text).map(t => String(t.props.children));
    expect(labels.filter(l => /^\+ (Todo|Meeting|Note|Agreement)$/.test(l))).toEqual(['+ Todo', '+ Meeting', '+ Note']);
    pressText(r, '+ Todo');
    expect(heights(r)).toEqual({frame: QUICK_ADD_HEIGHT, rows: FIXED});
    act(() => r.root.findAll(n => n.props.accessibilityLabel === 'Close Quick Add' && typeof n.props.onPress === 'function')[0].props.onPress());
    expect(heights(r)).toEqual({frame: QUICK_ADD_HEIGHT, rows: [undefined]});
  });

  it('the two-line field is rows 1 and 2 with their gap', () => {
    expect(FORM_FIELD_HEIGHT).toBe(QUICK_ADD_ROWS.tabs + QUICK_ADD_ROWS.gap + QUICK_ADD_ROWS.input);
  });

  const cases: Array<[string, () => TestRenderer.ReactTestRenderer]> = [
    ['create Todo', () => render()],
    ['create Meeting', () => {
      const r = render({collapsible: true});
      pressText(r, '+ Meeting');
      return r;
    }],
    ['create Note', () => {
      const r = render({collapsible: true});
      pressText(r, '+ Note');
      return r;
    }],
    ['create Todo, w/f', () => {
      const r = render();
      pressText(r, 'w/f');
      return r;
    }],
    ['create Todo, due date open', () => {
      const r = render();
      act(() => r.root.findAll(n => n.props.accessibilityLabel === 'Due date' && typeof n.props.onPress === 'function')[0].props.onPress());
      return r;
    }],
    ['create Todo with provenance', () =>
      render({provenance: [{key: 'meeting', label: '↳ from Retro alpha · Wed 30.9.', onClear: () => undefined}]})],
    ['edit todo with a linked file', () => render({editTarget: editTargetFor('task:1', {task})})],
    ['edit todo with "Save to"', () => {
      const r = render({editTarget: editTargetFor('task:1', {task})});
      act(() => r.root.findAllByType(TextInput).find(i => i.props.placeholder === 'New todo')!.props.onChangeText('Call Tom #gr'));
      return r;
    }],
    ['edit meeting', () => render({editTarget: editTargetFor('meeting:1', {meeting})})],
    ['edit meeting where the screen has a card', () => render({editTarget: editTargetFor('meeting:1', {meeting}), meetingCard: cardFor(meeting)})],
    ['meeting card, ahead', () => {
      const ahead = {...meeting, date: '2999-01-01'};
      return render({editTarget: editTargetFor('meeting:1', {meeting: ahead}, 'card'), meetingCard: cardFor(ahead)});
    }],
    ['meeting card, over, with a linked file', () =>
      render({editTarget: editTargetFor('meeting:1', {meeting}, 'card'), meetingCard: cardFor(meeting, {reflection: 'exists'})})],
    ['todo card', () => {
      const model = todoCardModel({task, today: '2026-10-21', ownerName: 'Garden renovation', canLink: true, canRefile: true});
      const fn = () => jest.fn();
      const data: TodoCardData = {
        task, model, onEdit: fn(), onClose: fn(), onToggleDone: fn(), onFlow: fn(), onNote: fn(), onUnlink: fn(), onDelete: fn(),
      };
      return render({editTarget: editTargetFor('task:1', {task}, 'card'), todoCard: data});
    }],
    ['edit todo where the screen has a card', () =>
      render({editTarget: editTargetFor('task:1', {task}), todoCard: {} as TodoCardData})],
    ['meeting card, cancelled', () => {
      const cancelled = {...meeting, cancelled: true};
      return render({editTarget: editTargetFor('meeting:1', {meeting: cancelled}, 'card'), meetingCard: cardFor(cancelled)});
    }],
  ];

  it.each(cases)('%s: the frame and its rows keep their heights', (name, make) => {
    const r = make();
    expect(heights(r)).toEqual({frame: QUICK_ADD_HEIGHT, rows: / card/.test(name) && !name.startsWith('edit') ? CARD_FIXED : FIXED});
  });
});

describe('Quick Add rows', () => {
  const allTexts = (r: TestRenderer.ReactTestRenderer) => r.root.findAllByType(Text).map(t => [t.props.children].flat().join(''));

  it('row 4 holds ✕ and + Add while creating, Cancel · Save while editing; Save to <Name> with an abbreviation tag', () => {
    const create = render();
    expect(allTexts(create)).toEqual(expect.arrayContaining(['✕', '+ Add']));
    const edit = render({editTarget: editTargetFor('task:1', {task})});
    expect(allTexts(edit)).toEqual(expect.arrayContaining(['Cancel', 'Save']));
    act(() => edit.root.findAllByType(TextInput).find(i => i.props.placeholder === 'New todo')!.props.onChangeText('Call Tom #gr'));
    expect(allTexts(edit)).toContain('Save to Garden renovat…');
  });

  it('a newline in the text becomes a space: the title stays one line', () => {
    const r = render();
    act(() => r.root.findAllByType(TextInput).find(i => i.props.placeholder === 'New todo')!.props.onChangeText('Call Tom\nabout the fence'));
    expect(r.root.findAllByType(TextInput).find(i => i.props.placeholder === 'New todo')!.props.value).toBe('Call Tom about the fence');
  });

  it('the provenance line takes R4 while creating a todo', () => {
    const r = render({provenance: [{key: 'meeting', label: '↳ from Retro alpha', onClear: () => undefined}]});
    expect(allTexts(r)).toContain('↳ from Retro alpha');
  });

  it('the edit form has no delete, New from this or M (they are on the card); the linked file shows with its ✕', () => {
    const r = render({editTarget: editTargetFor('meeting:1', {meeting})});
    expect(r.root.findAll(n => n.props.accessibilityLabel === 'Delete' && typeof n.props.onPress === 'function')).toHaveLength(0);
    expect(allTexts(r)).not.toContain('New from this');
    expect(allTexts(r)).not.toContain('M');
    expect(allTexts(r)).toContain('a.pdf');
    expect(r.root.findAll(n => n.props.accessibilityLabel === 'Unlink' && typeof n.props.onPress === 'function').length).toBeGreaterThan(0);
  });
});
