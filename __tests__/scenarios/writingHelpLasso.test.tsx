// docs/dev/history/technical-design-writing-help.md §6, scenario 20: the lasso capture panel checks what was recognized.
import {resetMomentChoices} from '../../src/ui/meetingMomentStore';
import {expectShows, fieldValue, focus, tap} from '../../test-helpers/scenario/app';
import {areaFile, dataFile, projectFile, putFile, sectionLines} from '../../test-helpers/scenario/files';
import {given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {processSportMarks, sport, sportClock, sportMark} from '../../test-helpers/scenario/sportArea';

beforeEach(() => {
  resetMomentChoices();
  sportClock();
});
afterEach(() => jest.useRealTimers());

scenario('The capture panel checks the recognized text when it opens', {feature: 'Writing help', design: 'technical-design-writing-help.md', help: 'lasso.md#capturing-right-away'}, () => {
  given('a mark recognized as "call #Iena", and the tag #lena in use', () => {
    sport({marks: [sportMark(2, 'call #Iena')]});
    putFile(projectFile('Garden renovation'), dataFile('project', {Scope: [], Tasks: ['- [ ] Ask #lena about plants'], Meetings: []}));
  });
  when('I process the mark and put the cursor into the text', async () => {
    await processSportMarks();
    await focus('Todo text');
  });
  then('the strip shows → #Lena and the text is as recognized', () => {
    expectShows('→ #Lena');
    expect(fieldValue('Todo text')).toBe('call #Iena');
  });
  when('I tap → #Lena and save', async () => {
    await tap('→ #Lena');
    await tap(/^Save & close/);
  });
  then('the todo is saved with #Lena', () => {
    expect(sectionLines(areaFile('Sport'), 'Tasks')).toContainEqual(expect.stringMatching(/^- \[ \] call #Lena/));
  });
});
