import {isoDateOffset} from '../../src/domain/meetingTime';
import {validTillOf} from '../../src/domain/agreements';
import {describeScreen, expectNotShows, expectShows, openApp, tap, tapTab, type} from '../../test-helpers/scenario/app';
import {areaDir, areaFile, dataFile, fileText, projectFile, putFile, sectionLines} from '../../test-helpers/scenario/files';
import {device} from '../../test-helpers/fakeDevice/device';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {sparringSettings} from '../../test-helpers/scenario/setups';

const today = isoDateOffset(0);
const past = isoDateOffset(-10);
const year = today.slice(0, 4);
const sparringLine = `- ${past} 10:00-11:00 Sparring Jordan #sparring/jordan`;

/** Area "Coaching" with a past sparring session and the given agreement lines. */
function coaching(agreements: string[], extra: Record<string, string[]> = {}): void {
  putFile(areaFile('Coaching'), dataFile('area', {Scope: [], Tasks: [], Meetings: [sparringLine], Threads: ['- jordan: active'], Agreements: agreements, ...extra}, ['abbrev: Co']));
}

async function openJordanOverview(): Promise<void> {
  await openApp({settings: sparringSettings()});
  await tapTab('Areas');
  await tap(/^Coaching/);
  await tap('#sparring/jordan');
  expectShows('Looking back');
}

scenario('An agreement in the thread overview: it shows in the block "Agreements", another thread\'s does not', {feature: 'Agreements', design: 'technical-design-meetings-0.21.md'}, () => {
  given('area "Coaching" has an agreement tagged #jordan and one tagged #sparring/sven', () => {
    coaching([`- Feedback only in our 1:1s #jordan [created:: ${past}]`, `- Sven owns the slides #sparring/sven [created:: ${past}]`]);
  });
  when('I open Jordan\'s thread overview', openJordanOverview);
  then('Ahead lists the block "Agreements" with the first one only', () => {
    expectShows('Agreements');
    expectShows('◇ Feedback only in our 1:1s #jordan');
    expectNotShows('◇ Sven owns the slides #sparring/sven');
  });
  when('I switch to All jordan', () => tap('All jordan'));
  then('the agreement shows there too', () => expectShows('◇ Feedback only in our 1:1s #jordan'));
});

scenario('Add an agreement from the thread overview with valid till end of year', {feature: 'Agreements', design: 'technical-design-meetings-0.21.md'}, () => {
  given('area "Coaching" has a past sparring session with Jordan and no agreements', () => coaching([]));
  when('I open Jordan\'s thread overview, choose the Agreement tab and type "No calls after six"', async () => {
    await openJordanOverview();
    await tap('Agreement', 1);
    await type('New agreement', 'No calls after six');
  });
  and('I tap "valid till" and choose "end of year", then + Add', async () => {
    await tap('valid till');
    await tap('end of year');
    expectShows(`till 31.12.`);
    await tap('+ Add', 1);
  });
  then('the area file has the agreement with the thread tag, the meeting it was made in, today and the valid-till date', () => {
    expect(sectionLines(areaFile('Coaching'), 'Agreements')).toEqual([
      `- No calls after six #sparring/jordan [meeting:: ${past} Sparring Jordan sparring/jordan] [created:: ${today}] [valid:: ${year}-12-31]`,
    ]);
  });
  and('the status slot says where it went, and the overview lists it', () => {
    expectShows('Agreement added to Coaching');
    expectShows('◇ No calls after six #sparring/jordan');
  });
});

scenario('Change an agreement: the old one is ended, the new one added; Cancel changes nothing', {feature: 'Agreements', design: 'technical-design-meetings-0.21.md'}, () => {
  const line = `- Feedback only in our 1:1s #sparring/jordan [created:: ${past}] [valid:: ${year}-12-31]`;
  given('area "Coaching" has the agreement "Feedback only in our 1:1s" with Jordan', () => coaching([line]));
  when('I open Jordan\'s thread overview, tap the agreement and Change on its card, then Cancel', async () => {
    await openJordanOverview();
    await tap('◇ Feedback only in our 1:1s #sparring/jordan');
    expectShows(/^Agreement · since/);
    await tap('Change');
    expectShows(/^↳ replaces 'Feedback only in our 1:1s'/);
    await tap('Cancel');
  });
  then('the file is unchanged', () => expect(sectionLines(areaFile('Coaching'), 'Agreements')).toEqual([line]));
  when('I tap Change again, edit the words to "Feedback only in our 1:1s, except urgent" and tap + Add', async () => {
    await tap('◇ Feedback only in our 1:1s #sparring/jordan');
    await tap('Change');
    await type('New agreement', 'Feedback only in our 1:1s, except urgent #sparring/jordan');
    await tap('+ Add', 1);
  });
  then('the old line is ended today and the new one is added after it, made in the meeting the overview shows', () => {
    expect(sectionLines(areaFile('Coaching'), 'Agreements')).toEqual([
      `${line} [ended:: ${today}]`,
      `- Feedback only in our 1:1s, except urgent #sparring/jordan [meeting:: ${past} Sparring Jordan sparring/jordan] [created:: ${today}] [valid:: ${year}-12-31]`,
    ]);
  });
  and('the overview lists only the new one, and Looking back counts the ended one', () => {
    expectShows('◇ Feedback only in our 1:1s, except urgent #sparring/jordan');
    expectNotShows('◇ Feedback only in our 1:1s #sparring/jordan');
    expectShows('1 agreement ended ›');
  });
});

scenario('End an agreement: asked once, then ended today', {feature: 'Agreements', design: 'technical-design-meetings-0.21.md'}, () => {
  given('area "Coaching" has the agreement "Feedback only in our 1:1s" with Jordan', () =>
    coaching([`- Feedback only in our 1:1s #sparring/jordan [created:: ${past}]`]),
  );
  when('I tap it in Jordan\'s thread overview, tap End on its card and confirm', async () => {
    await openJordanOverview();
    await tap('◇ Feedback only in our 1:1s #sparring/jordan');
    await tap('End');
    expectShows('End "Feedback only in our 1:1s"?');
    // The status slot's End is drawn above the card's.
    await tap('End', 0);
  });
  then('the line gets [ended:: today]', () =>
    expect(sectionLines(areaFile('Coaching'), 'Agreements')).toEqual([`- Feedback only in our 1:1s #sparring/jordan [created:: ${past}] [ended:: ${today}]`]),
  );
  and('the overview shows "1 agreement ended ›" in Looking back', () => {
    expectShows('Ended the agreement');
    expectShows('1 agreement ended ›');
    expectNotShows('◇ Feedback only in our 1:1s #sparring/jordan');
  });
});

scenario('A hand-edited Agreements section keeps every other line byte for byte when one agreement is ended', {feature: 'Agreements', design: 'technical-design-meetings-0.21.md'}, () => {
  given('area "Coaching" has two agreements, one with the unknown field [who:: both], a comment line and a blank line between them', () => {
    coaching([`- Feedback only in our 1:1s #sparring/jordan [created:: ${past}] [who:: both]`, '% agreed on paper', '', `-   Fridays  are quiet #jordan   [created::${past}]`]);
  });
  when('I end the first one in Jordan\'s thread overview', async () => {
    await openJordanOverview();
    await tap('◇ Feedback only in our 1:1s #sparring/jordan');
    await tap('End');
    await tap('End', 0);
  });
  then('only that line changed; everything else is byte-identical', () => {
    const before = dataFile(
      'area',
      {
        Scope: [],
        Tasks: [],
        Meetings: [sparringLine],
        Threads: ['- jordan: active'],
        Agreements: [`- Feedback only in our 1:1s #sparring/jordan [created:: ${past}] [who:: both]`, '% agreed on paper', '', `-   Fridays  are quiet #jordan   [created::${past}]`],
      },
      ['abbrev: Co'],
    );
    expect(fileText(areaFile('Coaching'))).toBe(
      before.replace(`[created:: ${past}] [who:: both]`, `[created:: ${past}] [ended:: ${today}] [who:: both]`),
    );
  });
});

scenario('A Project page lists its own agreements; a thread\'s agreement shows in the thread overview instead', {feature: 'Agreements', design: 'technical-design-meetings-0.21.md'}, () => {
  given('project "Leadership program" has one untagged agreement and one tagged #sparring/jordan', () => {
    putFile(
      projectFile('Leadership program'),
      dataFile('project', {Scope: [], Tasks: ['- [ ] Plan module 2'], Meetings: [sparringLine], Agreements: ['- Slides go out a day ahead', '- Jordan reviews module 1 #sparring/jordan']}),
    );
  });
  when('I open the project', async () => {
    await openApp({settings: sparringSettings()});
    await tapTab('Projects');
    await tap(/^Leadership program/);
  });
  then('its todo list ends with "◇ Agreements 1 ›"', () => expectShows('◇ Agreements 1 ›'));
  when('I tap it', () => tap('◇ Agreements 1 ›'));
  then('the column lists the untagged agreement, with "‹ Todos" back', () => {
    expectShows('‹ Todos');
    expectShows('◇ Slides go out a day ahead');
    expectNotShows('◇ Jordan reviews module 1 #sparring/jordan');
  });
  when('I open Jordan\'s thread overview from the meeting', async () => {
    await tap('‹ Todos');
    await tap('#sparring/jordan');
  });
  then('the tagged one shows there', () => {
    if (!describeScreen().includes('Looking back')) throw new Error(describeScreen());
    expectShows('◇ Jordan reviews module 1 #sparring/jordan');
  });
});

scenario('Capture an agreement from a mark on a meeting\'s page: it goes to the thread\'s area with the meeting', {feature: 'Lasso', design: 'technical-design-meetings-0.21.md'}, () => {
  const NOTEBOOK_REL = `Meetings/sparring jordan ${year}.note`;
  const meetingKw = `${today} Sparring Jordan #sparring/jordan`;
  given('today\'s sparring with Jordan has its page, and a mark on that page says "Feedback only in our 1:1s"', () => {
    putFile(
      areaFile('Coaching'),
      dataFile(
        'area',
        {
          Scope: [],
          Tasks: [],
          Meetings: [`- ${today} 10:00-11:00 Sparring Jordan #sparring/jordan → [[${NOTEBOOK_REL}#${meetingKw}]]`],
          Threads: ['- jordan: active'],
          Marks: [`- ${today} 10:30 [[${NOTEBOOK_REL}]] p1 Feedback only in our 1:1s ^m-20261024-103000-000`],
        },
        ['abbrev: Co'],
      ),
    );
    device().sdk.putNote(`${areaDir('Coaching')}/${NOTEBOOK_REL}`, [{keywords: [today, meetingKw]}]);
  });
  when('I process the mark and choose Agreement', async () => {
    await openApp({settings: sparringSettings()});
    await tapTab('Areas');
    await tap(/^Coaching/);
    await tap(/to process/);
    await tap('Agreement');
  });
  then('Split lines is not offered; it is for the thread first, with the meeting in the grey line', () => {
    expectNotShows(/Split lines/);
    expectShows('For');
    expectShows('#sparring/jordan');
    expectShows(/^↳ from Sparring Jordan/);
  });
  when('I tap Save & close', () => tap(/^Save & close/));
  then('Coaching\'s file has the agreement with the thread tag and the meeting', () => {
    expect(sectionLines(areaFile('Coaching'), 'Agreements')).toEqual([
      `- Feedback only in our 1:1s #sparring/jordan [meeting:: ${today} Sparring Jordan sparring/jordan] [created:: ${today}]`,
    ]);
    expect(sectionLines(areaFile('Coaching'), 'Marks')).toEqual([]);
  });
});

scenario('Review step "Agreements": keep one past its date for three more months, end one with an inactive thread', {feature: 'Agreements', design: 'technical-design-meetings-0.21.md'}, () => {
  given('area "Coaching" has "Fridays are quiet" valid till yesterday, Jordan set inactive and an active agreement with her', () => {
    putFile(
      areaFile('Coaching'),
      dataFile(
        'area',
        {
          Scope: [],
          Tasks: [],
          Meetings: [],
          Threads: ['- jordan: inactive'],
          Agreements: [`- Fridays are quiet [created:: ${past}] [valid:: ${isoDateOffset(-1)}]`, `- Feedback only in our 1:1s #sparring/jordan [created:: ${past}]`],
        },
        ['abbrev: Co'],
      ),
    );
  });
  when('I open Review and the step "Agreements"', async () => {
    await openApp({settings: sparringSettings()});
    await tapTab('Review');
    await tap('Agreements');
  });
  then('it lists both, with "till … – over" and "thread inactive"', () => {
    expectShows('◇ Fridays are quiet');
    expectShows(/^till .* – over$/);
    expectShows('◇ Feedback only in our 1:1s #sparring/jordan');
    expectShows('thread inactive');
  });
  when('I keep "Fridays are quiet" with "+3 m"', async () => {
    await tap('◇ Fridays are quiet');
    await tap('Keep');
    await tap('+3 m');
  });
  then('its valid-till is three months ahead', () => {
    expect(sectionLines(areaFile('Coaching'), 'Agreements')[0]).toBe(`- Fridays are quiet [created:: ${past}] [valid:: ${validTillOf('3m', today)}]`);
  });
  when('I end the agreement with Jordan', async () => {
    await tap('◇ Feedback only in our 1:1s #sparring/jordan');
    await tap('End');
    await tap('End', 0);
  });
  then('it is ended today, and both rows carry a checkmark', () => {
    expect(sectionLines(areaFile('Coaching'), 'Agreements')[1]).toBe(`- Feedback only in our 1:1s #sparring/jordan [created:: ${past}] [ended:: ${today}]`);
    expectShows('✓ Fridays are quiet');
    expectShows('✓ Feedback only in our 1:1s #sparring/jordan');
  });
});
