import {expectNotShows, expectShows, openApp, readTexts, tap, tapLabel, tapTab, textsBetween, type} from '../../test-helpers/scenario/app';
import {areaFile, dataFile, loggedErrors, projectFile, putFile, sectionLines} from '../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {smokeClock} from '../../test-helpers/scenario/smokeSpace';
import {createNoteSetup} from '../../src/domain/noteSetups';
import {meetingKey} from '../../src/domain/provenance';

// The context panel (docs/dev/history/technical-design-time-and-place.md §3.2, §6 scenarios 3-8). The clock stands at
// Wednesday 14.10.2026, 10:00.
const DESIGN = 'technical-design-time-and-place.md';

afterEach(() => jest.useRealTimers());

const sparring = {...createNoteSetup('1', 'thread'), name: 'Sparring', tags: ['sparring']};
const SETTINGS = {noteSetups: [sparring], noteSetupsMigrated: true};
const LAST = meetingKey({date: '2026-10-07', title: '1:1 Mieke #sparring/mieke'});

function coaching(meetings: string[]): void {
  putFile(
    areaFile('Coaching'),
    dataFile('area', {
      Scope: [],
      Tasks: [`- [ ] Send the slides [meeting:: ${LAST}]`, '- [ ] Her feedback #wf/mieke', '- [ ] Unrelated #next'],
      Meetings: ['- 2026-10-07 10:00-11:00 1:1 Mieke #sparring/mieke', ...meetings],
      Agreements: [`- Feedback only in our 1:1s #sparring/mieke [meeting:: ${LAST}] [created:: 2026-10-07]`],
    }),
  );
}

async function openDaily(): Promise<void> {
  await openApp({settings: SETTINGS});
  await tapTab('Daily');
}

scenario('Daily: tapping a thread meeting shows its card and the context panel', {feature: 'Daily', design: DESIGN}, () => {
  given('"1:1 Mieke #sparring/mieke" today at 15:00, an owed todo from the last 1:1, a waiting todo and an agreement', () => {
    smokeClock();
    coaching(['- 2026-10-14 15:00-16:00 1:1 Mieke #sparring/mieke']);
  });
  when('I tap the meeting on Daily', async () => {
    await openDaily();
    await tap(/^1:1 Mieke/);
  });
  then('the card shows and the panel lists I owe, Waiting for and Agreed last time', () => {
    expectShows('Meeting · today');
    const panel = textsBetween('Thread #sparring/mieke · Coaching', /^\+ Quick Add to meeting/);
    expect(panel).toEqual(expect.arrayContaining(['I owe', 'Waiting for', 'Agreed last time']));
    expect(panel.some(t => t.startsWith('◇ Feedback only in our 1:1s'))).toBe(true);
    expect(panel.some(t => t.startsWith('Send the slides'))).toBe(true);
    expect(panel.some(t => t.startsWith('Unrelated'))).toBe(false);
    expectNotShows('Next todos');
  });
  when('I close the card', () => tapLabel('Close'));
  then('Next todos are back', () => {
    expectShows('Next todos');
    expectNotShows(/^\+ Quick Add to meeting/);
  });
});

scenario('Daily: a plain meeting with nothing linked shows its project', {feature: 'Daily', design: DESIGN}, () => {
  given('"Steering committee" today in project Website, which has the Next todo "Draft homepage"', () => {
    smokeClock();
    putFile(projectFile('Website'), dataFile('project', {Scope: [], Tasks: ['- [ ] Draft homepage #next'], Meetings: ['- 2026-10-14 16:00 Steering committee']}));
  });
  when('I tap it', async () => {
    await openDaily();
    await tap(/^Steering committee/);
  });
  then('the panel says so and lists Website\'s next todos', () => {
    expectShows('Nothing linked to this meeting yet · showing its project');
    expect(textsBetween('Project Website', /^\+ Quick Add to meeting/).some(t => t.startsWith('Draft homepage'))).toBe(true);
  });
});

scenario('Quick Add to meeting before it starts: an agenda item with the thread tag', {feature: 'Daily', design: DESIGN}, () => {
  given('the thread meeting "1:1 Mieke" today at 15:00', () => {
    smokeClock();
    coaching(['- 2026-10-14 15:00-16:00 1:1 Mieke #sparring/mieke']);
  });
  when('I tap it, use + Quick Add to meeting and add "Bring the numbers"', async () => {
    await openDaily();
    await tap(/^1:1 Mieke/);
    await tap('+ Quick Add to meeting');
    await type('New task', 'Bring the numbers');
    await tap('+ Add to Coaching');
  });
  then('the todo carries the thread tag and no meeting field', () => {
    expect(sectionLines(areaFile('Coaching'), 'Tasks')).toContainEqual(expect.stringMatching(/^- \[ \] Bring the numbers #sparring\/mieke( \[created:: 2026-10-14\])?$/));
  });
  and('the card is back and the panel lists it', () => {
    expectShows('Meeting · today');
    expect(readTexts().some(t => t.startsWith('Bring the numbers'))).toBe(true);
    expect(loggedErrors()).toEqual([]);
  });
});

scenario('Quick Add to meeting during it: the meeting is recorded', {feature: 'Daily', design: DESIGN}, () => {
  given('the thread meeting "1:1 Mieke" today 9:30-10:30, running now', () => {
    smokeClock();
    coaching(['- 2026-10-14 09:30-10:30 1:1 Mieke #sparring/mieke']);
  });
  when('I add "Send the contract" through + Quick Add to meeting', async () => {
    await openDaily();
    await tap(/^1:1 Mieke/);
    await tap('+ Quick Add to meeting');
    await type('New task', 'Send the contract');
    await tap('+ Add to Coaching');
  });
  then('the todo has the thread tag and [meeting:: …] of this meeting', () => {
    const key = meetingKey({date: '2026-10-14', title: '1:1 Mieke #sparring/mieke'});
    expect(sectionLines(areaFile('Coaching'), 'Tasks')).toContainEqual(expect.stringMatching(new RegExp(`^- \\[ \\] Send the contract #sparring/mieke \\[meeting:: ${key.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}\\]`)));
  });
});

scenario('Quick Add to meeting opens the Todo tab and names where it adds, without an abbreviation in the text', {feature: 'Daily', design: DESIGN}, () => {
  given('the thread meeting "1:1 Mieke" today at 15:00, and Quick Add left on its Meeting tab', () => {
    smokeClock();
    coaching(['- 2026-10-14 15:00-16:00 1:1 Mieke #sparring/mieke']);
  });
  when('I switch Quick Add to Meeting, tap the meeting and + Quick Add to meeting', async () => {
    await openDaily();
    await tap('Meeting');
    await tap(/^1:1 Mieke/);
    await tap('+ Quick Add to meeting');
  });
  then('the Todo tab shows, its button reads "+ Add to Coaching" and the text is empty', () => {
    expectShows('+ Add to Coaching');
    expectShows('Next');
    expect(readTexts()).not.toContain('#COA');
  });
});

scenario('A todo in the panel opens its card and edit form; Save and ✕ return to the meeting', {feature: 'Daily', design: DESIGN}, () => {
  given('the thread meeting "1:1 Mieke" today at 15:00 with "Send the slides" owed', () => {
    smokeClock();
    coaching(['- 2026-10-14 15:00-16:00 1:1 Mieke #sparring/mieke']);
  });
  when('I tap the meeting, then "Send the slides" in the panel', async () => {
    await openDaily();
    await tap(/^1:1 Mieke/);
    await tap(/^Send the slides/);
  });
  then('the todo\'s card shows in Quick Add\'s place; the panel stays', () => {
    expectShows('Todo · open');
    expectShows('I owe');
  });
  when('I close the todo\'s card', () => tapLabel('Close'));
  then('the meeting\'s card is back', () => {
    expectShows('Meeting · today');
    expectShows('I owe');
  });
  when('I tap "Send the slides" twice, change it to "Send the final slides" and save', async () => {
    await tap(/^Send the slides/);
    // The card's title comes first now; the panel's row is the second.
    await tap(/^Send the slides/, 1);
    await type('New task', 'Send the final slides');
    await tap('Save');
  });
  then('the file has the new text and the meeting\'s card is back', () => {
    expect(sectionLines(areaFile('Coaching'), 'Tasks')).toContainEqual(expect.stringMatching(/^- \[ \] Send the final slides \[meeting:: /));
    expectShows('Meeting · today');
    expect(loggedErrors()).toEqual([]);
  });
});

scenario('✕ Close in the panel\'s header closes the meeting: Daily shows its next todos again', {feature: 'Daily', design: DESIGN}, () => {
  given('the thread meeting "1:1 Mieke" today at 15:00', () => {
    smokeClock();
    coaching(['- 2026-10-14 15:00-16:00 1:1 Mieke #sparring/mieke']);
  });
  when('I tap the meeting, then ✕ Close next to Overview ›', async () => {
    await openDaily();
    await tap(/^1:1 Mieke/);
    await tap('✕ Close');
  });
  then('the card and the panel are gone; Next todos shows', () => {
    expectNotShows('Meeting · today');
    expectNotShows('I owe');
    expectShows('Next todos');
  });
});

scenario('The panel gives the full context: Next, Planned and a Waiting for dated later, which Daily leaves out', {feature: 'Daily', design: DESIGN}, () => {
  given('the thread meeting "1:1 Mieke" today, an agenda point without a flow state and a Waiting for due on 30.10.', () => {
    smokeClock();
    putFile(
      areaFile('Coaching'),
      dataFile('area', {
        Scope: [],
        Tasks: ['- [ ] Read her draft #sparring/mieke #next', '- [ ] Agenda point #sparring/mieke', '- [ ] Her reply #wf/mieke [due:: 2026-10-30]'],
        Meetings: ['- 2026-10-14 15:00-16:00 1:1 Mieke #sparring/mieke'],
      }),
    );
  });
  when('I open Daily', openDaily);
  then('Next todos lists neither the agenda point nor the later Waiting for', () => {
    expectNotShows(/^Agenda point/);
    expectNotShows(/^Her reply/);
  });
  when('I tap the meeting', () => tap(/^1:1 Mieke/));
  then('the panel lists Next, Planned and Waiting for', () => {
    const panel = textsBetween('Thread #sparring/mieke · Coaching', /^\+ Quick Add to meeting/);
    expect(panel).toEqual(expect.arrayContaining(['Next', 'Planned', 'Waiting for']));
    expect(panel.indexOf('Next')).toBeLessThan(panel.indexOf('Planned'));
    expect(panel.some(t => t.startsWith('Agenda point'))).toBe(true);
    expect(panel.some(t => t.startsWith('Her reply'))).toBe(true);
  });
});

scenario('Tapping the title on a card opens its edit form, like Edit', {feature: 'Daily', design: DESIGN}, () => {
  given('the thread meeting "1:1 Mieke" today with "Send the slides" owed', () => {
    smokeClock();
    coaching(['- 2026-10-14 15:00-16:00 1:1 Mieke #sparring/mieke']);
  });
  when('I tap "Send the slides" in the panel, then the title on its card', async () => {
    await openDaily();
    await tap(/^1:1 Mieke/);
    await tap(/^Send the slides/);
    await tap(/^Send the slides/);
  });
  then('the todo\'s edit form shows with Save', () => {
    expectShows('Save');
    expect(readTexts()).not.toContain('Todo · open');
  });
});

scenario('Week: a day header opens the day, a chip the card and panel, "‹ Back to Week 42" the normal side', {feature: 'Week and Month', design: DESIGN}, () => {
  given('"1:1 Mieke" on Thursday 15.10.', () => {
    smokeClock();
    coaching(['- 2026-10-15 15:00-16:00 1:1 Mieke #sparring/mieke']);
  });
  when('I open Week and tap Thursday\'s header', async () => {
    await openApp({settings: SETTINGS});
    await tapTab('Week');
    await tap(/^Th 15/);
  });
  then('the day panel shows', () => expectShows(/^Thu 15\.10\. · 1 meeting$/));
  when('I tap the chip', () => tap(/^1:1 Mieke/));
  then('the card and the panel show, with the back row', () => {
    expectShows('Meeting · ahead');
    expectShows('‹ Back to Week 42');
    expectShows('Thu 15.10. · 1 meeting ›');
    expectShows('Thread #sparring/mieke · Coaching');
  });
  when('I tap "‹ Back to Week 42"', () => tap('‹ Back to Week 42'));
  then('the panel is gone and the day panel is there again', () => {
    expectNotShows('‹ Back to Week 42');
    expectShows(/^Thu 15\.10\. · 1 meeting$/);
  });
});

scenario('Month: a day, then a meeting in it, then "‹ Back to October 2026"', {feature: 'Week and Month', design: DESIGN}, () => {
  given('"1:1 Mieke" on 15.10.', () => {
    smokeClock();
    coaching(['- 2026-10-15 15:00-16:00 1:1 Mieke #sparring/mieke']);
  });
  when('I open Month, tap the 15th and the meeting in its day panel', async () => {
    await openApp({settings: SETTINGS});
    await tapTab('Month');
    await tap(/^Th 15/);
    await tap(/^1:1 Mieke/);
  });
  then('the card and panel show with the back row', () => {
    expectShows('‹ Back to October 2026');
    expectShows('Thu 15.10. · 1 meeting ›');
  });
  when('I tap the day link', () => tap('Thu 15.10. · 1 meeting ›'));
  then('the day panel shows again', () => expectShows(/^Thu 15\.10\. · 1 meeting$/));
  when('I tap the meeting again and then "‹ Back to October 2026"', async () => {
    await tap(/^1:1 Mieke/);
    await tap('‹ Back to October 2026');
  });
  then('neither the panel nor the day panel shows', () => {
    expectNotShows('‹ Back to October 2026');
    expectNotShows(/^Thu 15\.10\. · 1 meeting$/);
  });
});
