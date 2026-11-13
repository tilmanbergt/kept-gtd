// docs/dev/history/technical-design-quickadd-redesign.md §6 scenarios 22, 23 and 25 (B5, F4): one
// origin per captured todo - the page's meeting, else the note as `[source::]`; never a linked page.
import {resetMomentChoices} from '../../src/ui/meetingMomentStore';
import {expectNotShows, expectShows, tap, tapLabel} from '../../test-helpers/scenario/app';
import {areaFile, sectionLines} from '../../test-helpers/scenario/files';
import {given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {COACH_KEY, processSportMarks, sport, sportClock, sportMark} from '../../test-helpers/scenario/sportArea';

beforeEach(() => {
  resetMomentChoices();
  sportClock();
});
afterEach(() => jest.useRealTimers());

const DESIGN = 'technical-design-quickadd-redesign.md';
const todoLine = (text: string) => sectionLines(areaFile('Sport'), 'Tasks').find(l => l.includes(text)) ?? '';

scenario('A todo captured on a meeting\'s page records the meeting, no source and no linked page', {feature: 'Lasso', design: DESIGN, help: 'lasso.md#capturing-right-away'}, () => {
  given('page 4 follows meeting "Coach call" and has a mark "Ask coach about intervals"', () => sport({marks: [sportMark(4, 'Ask coach about intervals')]}));
  when('I process the mark and save it as a todo', async () => {
    await processSportMarks();
    expectNotShows(/^Link to/);
    await tap(/^Save & close/);
  });
  then('the line has [meeting::], no [source::] and no linked file', () => {
    const line = todoLine('Ask coach about intervals');
    expect(line).toContain(`[meeting:: ${COACH_KEY}]`);
    expect(line).not.toContain('source::');
    expect(line).not.toContain('+[[');
  });
});

scenario('A todo captured on a plain page records the note as its source, no linked page', {feature: 'Lasso', design: DESIGN, help: 'lasso.md#capturing-right-away'}, () => {
  given('page 2 of Sport 2026.note belongs to no meeting and has a mark "Stretch after runs"', () => sport({marks: [sportMark(2, 'Stretch after runs')]}));
  when('I process the mark', processSportMarks);
  then('the panel shows "↳ from Sport 2026"', () => expectShows(/^↳ from Sport 2026/));
  when('I save it as a todo', () => tap(/^Save & close/));
  then('the line has [source:: 2 Areas/Sport/Sport 2026] and no linked file', () => {
    const line = todoLine('Stretch after runs');
    expect(line).toContain('[source:: 2 Areas/Sport/Sport 2026]');
    expect(line).not.toContain('meeting::');
    expect(line).not.toContain('+[[');
  });
});

scenario('The origin line\'s ✕ saves the todo without an origin', {feature: 'Lasso', design: DESIGN, help: 'quick-add.md#the-grey-line-where-a-todo-comes-from'}, () => {
  given('page 2 of Sport 2026.note has a mark "Stretch after runs"', () => sport({marks: [sportMark(2, 'Stretch after runs')]}));
  when('I process the mark, drop the origin with its ✕ and save', async () => {
    await processSportMarks();
    await tapLabel('Drop');
    expectNotShows(/^↳ from Sport 2026/);
    await tap(/^Save & close/);
  });
  then('the line has neither [source::] nor [meeting::]', () => {
    const line = todoLine('Stretch after runs');
    expect(line).toMatch(/^- \[ \] Stretch after runs/);
    expect(line).not.toContain('source::');
    expect(line).not.toContain('meeting::');
  });
});
