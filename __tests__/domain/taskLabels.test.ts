import {displayTaskText, isFlowStateConveyed, quietMeta, taskLabels} from '../../src/domain/taskLabels';
import {isWaitingForShownOnDaily} from '../../src/domain/flowState';
import {task} from '../../test-helpers/fixtures';

const TODAY = '2026-10-04';
const texts = (t: string, context: 'flat' | 'grouped' = 'flat') => taskLabels(task(t), context, TODAY).map(l => l.text);

describe('taskLabels - flat', () => {
  it('#next, and a retired #now as #next', () => {
    expect(texts('Draft offer #next')).toEqual(['#next']);
    expect(texts('Draft offer #next #now')).toEqual(['#next']);
    expect(texts('Draft offer #now')).toEqual(['#next']);
  });
  it('#w/f with and without a name', () => {
    expect(texts('Signed NDA #waiting-for:meier-sohn')).toEqual(['#w/f Meier Sohn']);
    expect(texts('Signed NDA #waiting-for')).toEqual(['#w/f']);
  });
  it('shortens a long waiting name', () => {
    const [label] = texts('x #waiting-for:a-very-long-company-name-gmbh');
    expect(label.startsWith('#w/f ')).toBe(true);
    expect(label.endsWith('…')).toBe(true);
    expect(label.length).toBeLessThanOrEqual('#w/f '.length + 20);
  });
  it('#someday gets no label', () => {
    expect(texts('Idea #someday')).toEqual([]);
  });
  it('due and overdue after the flow state', () => {
    expect(texts('Price sheet #next #due:2026-10-05')).toEqual(['#next', '#due 5.10.']);
    expect(texts('Price sheet #due:2026-09-28')).toEqual(['#due 28.9. !']);
    expect(texts('Today #due:2026-10-04')).toEqual(['#due 4.10.']);
  });
  it('nothing for a plain todo', () => {
    expect(texts('Book train')).toEqual([]);
  });
});

describe('taskLabels - grouped', () => {
  it('leaves out what the heading shows', () => {
    expect(texts('Draft #next', 'grouped')).toEqual([]);
    expect(texts('NDA #waiting-for', 'grouped')).toEqual([]);
    expect(texts('Idea #someday', 'grouped')).toEqual([]);
  });
  it('keeps the waiting name and the due date', () => {
    expect(texts('NDA #waiting-for:meier #due:2026-10-05', 'grouped')).toEqual(['#w/f Meier', '#due 5.10.']);
  });
});

describe('displayTaskText / isFlowStateConveyed', () => {
  it('strips tags a label shows (flat)', () => {
    expect(displayTaskText(task('Draft #next #now'), 'flat')).toBe('Draft');
    expect(displayTaskText(task('NDA #waiting-for'), 'flat')).toBe('NDA');
    expect(displayTaskText(task('NDA #waiting-for:meier #due:2026-10-05'), 'flat')).toBe('NDA');
  });
  it('keeps #someday in a flat list', () => {
    expect(isFlowStateConveyed(task('Idea #someday'), 'flat')).toBe(false);
    expect(displayTaskText(task('Idea #someday'), 'flat')).toBe('Idea #someday');
  });
  it('strips the flow state under its heading (grouped)', () => {
    expect(displayTaskText(task('NDA #waiting-for'), 'grouped')).toBe('NDA');
    expect(displayTaskText(task('Maybe this #maybe'), 'grouped')).toBe('Maybe this');
  });
  it('keeps context tags', () => {
    expect(displayTaskText(task('Call #lena #next'), 'flat')).toBe('Call #lena');
  });
});

describe('isWaitingForShownOnDaily', () => {
  it('no date or date reached: shown', () => {
    expect(isWaitingForShownOnDaily(task('x #waiting-for'), TODAY)).toBe(true);
    expect(isWaitingForShownOnDaily(task('x #waiting-for #due:2026-10-04'), TODAY)).toBe(true);
    expect(isWaitingForShownOnDaily(task('x #waiting-for #due:2026-09-01'), TODAY)).toBe(true);
  });
  it('future date (tomorrow too): hidden', () => {
    expect(isWaitingForShownOnDaily(task('x #waiting-for #due:2026-10-05'), TODAY)).toBe(false);
  });
  it('other flow states: false', () => {
    expect(isWaitingForShownOnDaily(task('x #next'), TODAY)).toBe(false);
  });
});

// The quiet row (docs/dev/history/technical-design-calmer-screens.md §3.4).
describe('quiet mode', () => {
  const today = '2026-11-03';
  const t = (text: string, extra: Parameters<typeof task>[1] = {}) => task(text, extra);
  it('keeps the words and free tags, drops #next/#now, the due field and the #wf tag; no labels', () => {
    expect(displayTaskText(t('Order soil #next', {flowState: 'next', dueDate: '2026-11-05'}), 'quiet')).toBe('Order soil');
    expect(displayTaskText(t('Collect topics #lena #next', {flowState: 'next'}), 'quiet')).toBe('Collect topics #lena');
    expect(displayTaskText(t('Plan #someday', {flowState: 'someday'}), 'quiet')).toBe('Plan #someday');
    expect(taskLabels(t('Order soil #next', {flowState: 'next'}), 'quiet', today)).toEqual([]);
  });
  it('quietMeta: due today and overdue strong, a later due plain, else w/f, else nothing', () => {
    expect(quietMeta(t('a', {dueDate: today}), today)).toEqual({text: 'due today', strong: true});
    expect(quietMeta(t('a', {dueDate: '2026-11-01'}), today)).toEqual({text: 'overdue 1.11.', strong: true});
    expect(quietMeta(t('a', {dueDate: '2026-11-05'}), today)).toEqual({text: 'due 5.11.', strong: false});
    expect(quietMeta(t('a #wf/marco', {flowState: 'waiting-for', waitingOn: 'marco'}), today)).toEqual({text: 'w/f Marco', strong: false});
    expect(quietMeta(t('a #wf', {flowState: 'waiting-for', waitingOn: null}), today)).toEqual({text: 'w/f', strong: false});
    expect(quietMeta(t('a'), today)).toBeNull();
    expect(quietMeta(t('a', {dueDate: '2026-11-01', done: true}), today)).toBeNull();
  });
});
