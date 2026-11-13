import {isoDateOffset} from '../../src/domain/meetingTime';
import {cardHeading, expectNotShows, expectShows, fieldValue, labelled, openApp, openInbox, readTexts, tap, tapLabel, tapTab, type} from '../../test-helpers/scenario/app';
import {areaDir, areaFile, dataFile, INBOX_FILE, loggedErrors, projectFile, putFile, sectionLines} from '../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {sparringSettings} from '../../test-helpers/scenario/setups';

const today = isoDateOffset(0);

scenario('Save to <Name>: an abbreviation tag typed while editing saves the meeting and moves it there', {feature: 'Quick Add', design: 'technical-design-item-card.md', help: 'quick-add.md#filing-directly-with-an-abbreviation'}, () => {
  given('project "Garden renovation" (#GR) and the Inbox meeting "Site visit" today', () => {
    putFile(projectFile('Garden renovation'), dataFile('project', {Scope: [], Tasks: [], Meetings: []}, ['abbrev: GR']));
    putFile(INBOX_FILE, dataFile('inbox', {Tasks: [], Meetings: [`- ${today} 14:00 Site visit`]}));
  });
  when('I open Daily, tap the meeting twice (card, then edit), add "#GR" to its title', async () => {
    await openApp();
    await tapTab('Daily');
    await tap(/^Site visit/);
    await tap(/^Site visit/);
    await type('New meeting', 'Site visit with Tom #GR');
  });
  then('the main button offers "Save to Garden renovat…" instead of Save', () => {
    expectShows(/^Save to Garden renovat/);
    expectNotShows('Save');
  });
  when('I tap it', () => tap(/^Save to Garden renovat/));
  then('the meeting, renamed and without the tag, is in the project and no longer in the Inbox', () => {
    expect(sectionLines(projectFile('Garden renovation'), 'Meetings')).toEqual([expect.stringMatching(new RegExp(`^- ${today} 14:00 Site visit with Tom$`))]);
    expect(sectionLines(INBOX_FILE, 'Meetings')).toEqual([]);
    expect(loggedErrors()).toEqual([]);
  });
});

scenario('After + Add with an abbreviation tag, the next todo starts with that tag', {feature: 'Quick Add', design: 'technical-design-item-card.md', help: 'quick-add.md#filing-directly-with-an-abbreviation'}, () => {
  given('project "Website" (#WEB) and an empty Inbox', () => {
    putFile(projectFile('Website'), dataFile('project', {Scope: [], Tasks: [], Meetings: []}, ['abbrev: WEB']));
    putFile(INBOX_FILE, dataFile('inbox', {Tasks: [], Meetings: []}));
  });
  when('I add "Call the designer #web" from Daily', async () => {
    await openApp();
    await openInbox();
    await type('New todo', 'Call the designer #web');
    await tap(/^\+ Add to Website/);
  });
  then('the box closes; + Todo starts the next todo with "#WEB ", and the button still files to Website', async () => {
    await tap('+ Todo');
    expect(fieldValue('New todo')).toBe('#WEB ');
    expectShows(/^\+ Add to Website/);
  });
  when('I tap + Add with nothing but the tag', () => tap(/^\+ Add to Website/));
  then('nothing is added', () => {
    expect(sectionLines(projectFile('Website'), 'Tasks')).toHaveLength(1);
  });
  when('I write the next todo after the tag and add it', async () => {
    await type('New todo', '#WEB Order photos');
    await tap(/^\+ Add to Website/);
  });
  then('both todos are in Website without the tag, none in the Inbox', () => {
    expect(sectionLines(projectFile('Website'), 'Tasks')).toEqual([
      expect.stringMatching(/^- \[ \] Call the designer( \[created:: [\d-]+\])?$/),
      expect.stringMatching(/^- \[ \] Order photos( \[created:: [\d-]+\])?$/),
    ]);
    expect(sectionLines(INBOX_FILE, 'Tasks')).toEqual([]);
    expectShows(/Added todo "Order photos" to Website/);
  });
  when('I delete the tag from the field and add a todo', async () => {
    await type('New todo', 'Water the plants');
    await tap('+ Add');
  });
  then('it goes to the Inbox, and the next draft starts empty', async () => {
    expect(sectionLines(INBOX_FILE, 'Tasks')).toEqual([expect.stringMatching(/^- \[ \] Water the plants( \[created:: [\d-]+\])?$/)]);
    await tap('+ Todo');
    expect(fieldValue('New todo')).toBe('');
  });
});

scenario('In a thread overview, Quick Add adds the thread tag it shows in Row 4', {feature: 'Quick Add', design: 'technical-design-item-card.md', help: 'threads.md#adding-from-the-overview'}, () => {
  given('area "Coaching" has the todo "Draft agenda #retro/alpha"', () => {
    putFile(areaFile('Coaching'), dataFile('area', {Scope: [], Tasks: ['- [ ] Draft agenda #retro/alpha'], Meetings: []}));
  });
  when('I open the thread overview from the tag and add the todo "Book room"', async () => {
    await openApp();
    await tapTab('Areas');
    await tap(/^Coaching/);
    await tap('#retro/alpha');
    expectShows('Looking back');
  });
  when('I add the todo "Book room" there', async () => {
    // The overview draws over the Area page: its Quick Add is the second one.
    await type('New todo', 'Book room');
    await tap('+ Add');
  });
  then('the area has the new todo with the thread tag', () => {
    expect(sectionLines(areaFile('Coaching'), 'Tasks')).toEqual([
      '- [ ] Draft agenda #retro/alpha',
      expect.stringMatching(/^- \[ \] Book room #retro\/alpha/),
    ]);
  });
});

const nextWeek = isoDateOffset(7);
const lastWeek = isoDateOffset(-7);

scenario('Tap a meeting shows its card; ✕ brings back the half-typed todo', {feature: 'Quick Add', design: 'technical-design-item-card.md', help: 'quick-add.md#the-card-one-tap-selects'}, () => {
  given('project Website\'s meeting "Team sync" next week', () => {
    putFile(projectFile('Website'), dataFile('project', {Scope: [], Tasks: [], Meetings: [`- ${nextWeek} 10:00 Team sync`]}));
  });
  when('I start the todo "Call Anna" on Website\'s page and tap the meeting', async () => {
    await openApp();
    await tapTab('Projects');
    await tap(/^Website/);
    await type('New todo', 'Call Anna');
    await tap(/^Team sync/);
  });
  then('the card names the meeting in Quick Add\'s place', () => {
    expect(cardHeading()).toMatch(/^Meeting · .+ · \w{3} \d+\.\d+\. [\d:-]+$/);
    expect(labelled('Close')).not.toBeNull();
    expectNotShows('+ Add');
  });
  when('I tap ✕ on the card', () => tapLabel('Close'));
  then('Quick Add is back, closed; + Todo shows "Call Anna" still in the field', async () => {
    expectShows('+ Todo');
    expect(cardHeading()).not.toMatch(/^Meeting · /);
    await tap('+ Todo');
    expect(fieldValue('New todo')).toBe('Call Anna');
  });
});

scenario('A second tap edits; Save writes it and shows the card again', {feature: 'Quick Add', design: 'technical-design-item-card.md', help: 'quick-add.md#editing'}, () => {
  given('project Website\'s meeting "Team sync" next week', () => {
    putFile(projectFile('Website'), dataFile('project', {Scope: [], Tasks: [], Meetings: [`- ${nextWeek} 10:00 Team sync`]}));
  });
  when('I tap the meeting, tap Edit, rename it and Save', async () => {
    await openApp();
    await tapTab('Projects');
    await tap(/^Website/);
    await tap(/^Team sync/);
    await tap('Edit');
    await type('New meeting', 'Team sync and planning');
    await tap('Save');
  });
  then('Website\'s file has the new title', () => {
    expect(sectionLines(projectFile('Website'), 'Meetings')).toEqual([`- ${nextWeek} 10:00 Team sync and planning`]);
  });
  and('the card shows the meeting again, not the edit form', () => {
    expect(cardHeading()).toMatch(/^Meeting · .+ · \w{3} \d+\.\d+\. [\d:-]+$/);
    expectShows('Team sync and planning');
    expectNotShows('Save');
  });
});

scenario('Tick R and M on the card: only the tags change', {feature: 'Meetings', design: 'technical-design-item-card.md', help: 'meetings.md#the-meeting-row-and-its-card'}, () => {
  const line = `- ${lastWeek} 10:00-11:00 Sparring Jordan #sparring/jordan`;
  given('area "Coaching" has a sparring session last week, tracked for review', () => {
    putFile(areaFile('Coaching'), dataFile('area', {Scope: [], Tasks: [], Meetings: [line]}, ['abbrev: Co']));
  });
  when('I tap the session on Coaching and tap R and M on its card', async () => {
    await openApp({settings: sparringSettings()});
    await tapTab('Areas');
    await tap(/^Coaching/);
    await tap(/^Sparring Jordan/);
    await tapLabel('Reviewed');
    await tapLabel('Month highlight');
  });
  then('the line gains #reviewed and #monthly and nothing else', () => {
    expect(sectionLines(areaFile('Coaching'), 'Meetings')).toEqual([`${line} #reviewed #monthly`]);
  });
  and('both show filled on the card', () => {
    expect(labelled('Reviewed')?.on).toBe(true);
    expect(labelled('Month highlight')?.on).toBe(true);
  });
});

scenario('Refile a meeting from the card\'s area chip', {feature: 'Meetings', design: 'technical-design-item-card.md', help: 'quick-add.md#the-card-one-tap-selects'}, () => {
  given('project "Garden renovation" with the meeting "Kick-off" next week, and project "Website"', () => {
    putFile(projectFile('Garden renovation'), dataFile('project', {Scope: [], Tasks: [], Meetings: [`- ${nextWeek} 10:00 Kick-off`]}));
    putFile(projectFile('Website'), dataFile('project', {Scope: [], Tasks: [], Meetings: []}));
  });
  when('I tap the meeting, tap the refile arrow and pick Website in the Files pane', async () => {
    await openApp();
    await tapTab('Projects');
    await tap(/^Garden renovation/);
    await tap(/^Kick-off/);
    await tapLabel('Refile');
    await tap('📁 Projects ›');
    await tap(/Website/);
  });
  then('the meeting is in Website and no longer in Garden renovation', () => {
    expect(sectionLines(projectFile('Website'), 'Meetings')).toEqual([`- ${nextWeek} 10:00 Kick-off`]);
    expect(sectionLines(projectFile('Garden renovation'), 'Meetings')).toEqual([]);
  });
});

scenario('New from this and Cancel meeting from the card', {feature: 'Meetings', design: 'technical-design-item-card.md', help: 'meetings.md#the-meeting-row-and-its-card, meetings.md#cancelling-and-repeating'}, () => {
  given('project Website\'s meeting "Retro" next week', () => {
    putFile(projectFile('Website'), dataFile('project', {Scope: [], Tasks: [], Meetings: [`- ${nextWeek} 15:00-16:00 Retro`]}));
  });
  when('I tap the meeting and New from this on its card', async () => {
    await openApp();
    await tapTab('Projects');
    await tap(/^Website/);
    await tap(/^Retro/);
    await tapLabel('New from this');
  });
  then('Create · Meeting holds the title, date and time; the card is closed', () => {
    expect(fieldValue('New meeting')).toBe('Retro');
    expect(fieldValue('15 · 15-16.30 · 2d')).toBe('15:00-16:00');
    expectShows('+ Add');
  });
  when('I tap the meeting again, Cancel meeting, and confirm', async () => {
    await tap(/^Retro/);
    await tapLabel('Cancel meeting');
    expectShows(/^Cancel "Retro"\?/);
    await tap('Cancel meeting');
  });
  then('the meeting is marked cancelled in Website\'s file, and the card says so', () => {
    expect(sectionLines(projectFile('Website'), 'Meetings')).toEqual([`- [-] ${nextWeek} 15:00-16:00 Retro`]);
    expect(cardHeading()).toMatch(/^Meeting · .+ · cancelled$/);
    expect(labelled('Cancel meeting')).toBeNull();
  });
});

scenario('Switching to another meeting while editing saves first and shows the other\'s card', {feature: 'Quick Add', design: 'technical-design-item-card.md', help: 'quick-add.md#editing'}, () => {
  given('project Website\'s meetings "Team sync" and "Retro" next week', () => {
    putFile(projectFile('Website'), dataFile('project', {Scope: [], Tasks: [], Meetings: [`- ${nextWeek} 10:00 Team sync`, `- ${nextWeek} 15:00 Retro`]}));
  });
  when('I edit "Team sync", rename it, and tap "Retro"', async () => {
    await openApp();
    await tapTab('Projects');
    await tap(/^Website/);
    await tap(/^Team sync/);
    await tap('Edit');
    await type('New meeting', 'Team sync moved');
    await tap(/^Retro/);
  });
  then('the rename is saved', () => {
    expect(sectionLines(projectFile('Website'), 'Meetings')).toEqual([`- ${nextWeek} 10:00 Team sync moved`, `- ${nextWeek} 15:00 Retro`]);
  });
  and('"Retro" shows as card', () => {
    expect(cardHeading()).toMatch(/^Meeting · .+ · \w{3} \d+\.\d+\. [\d:-]+$/);
    expect(labelled('Close')).not.toBeNull();
    // The card's title follows its R1 (caption, + Meeting, ✕).
    const shown = readTexts();
    const at = shown.findIndex(t => t === '+ Meeting');
    expect(shown.slice(at, at + 4)).toContain('Retro');
  });
});

scenario('Link a file from the card on an Area page, and unlink it in Edit', {feature: 'Meetings', design: 'technical-design-item-card.md', help: 'quick-add.md#notes-and-files-on-a-todo-or-meeting'}, () => {
  given('area "Coaching" has the meeting "Sparring" next week and the file "brief.pdf" in its folder', () => {
    putFile(areaFile('Coaching'), dataFile('area', {Scope: [], Tasks: [], Meetings: [`- ${nextWeek} 10:00 Sparring`]}));
    putFile(`${areaDir('Coaching')}/brief.pdf`, '%PDF');
  });
  when('I tap the meeting, tap +clip on its card and pick the file in the Files pane', async () => {
    await openApp();
    await tapTab('Areas');
    await tap(/^Coaching/);
    await tap(/^Sparring/);
    await tapLabel('Link file');
    expectShows(/^Select attachment/);
    await tap('📄 brief.pdf');
  });
  then('the meeting links the file, and the card\'s clip is filled', () => {
    expect(sectionLines(areaFile('Coaching'), 'Meetings')[0]).toMatch(/brief\.pdf/);
    expect(labelled('Open linked file')?.on).toBe(true);
  });
  when('I tap the title to edit and tap ✕ next to the file in the last row, then Save', async () => {
    await tap('Edit');
    await tapLabel('Unlink');
    await tap('Save');
  });
  then('the line has no link any more, and the card offers +clip again', () => {
    expect(sectionLines(areaFile('Coaching'), 'Meetings')).toEqual([`- ${nextWeek} 10:00 Sparring`]);
    expect(labelled('Link file')).not.toBeNull();
  });
});

scenario('Todo card: a flow chip, done and delete act at once; a retired #now leaves with Next', {feature: 'Quick Add', design: 'technical-design-item-card.md', help: 'quick-add.md#the-card-one-tap-selects'}, () => {
  given('project "Garden renovation" has the todos "Order soil #next #now" (left from focus mode) and "Fix the fence"', () => {
    putFile(projectFile('Garden renovation'), dataFile('project', {Scope: [], Tasks: ['- [ ] Order soil #next #now', '- [ ] Fix the fence'], Meetings: []}));
  });
  when('I tap "Order soil" on the project page', async () => {
    await openApp();
    await tapTab('Projects');
    await tap(/^Garden renovation/);
    await tap('Order soil');
  });
  then('its card shows it as Next, with no Now', () => {
    expect(cardHeading()).toMatch(/^Todo · .+ · next$/);
    expect(labelled('Now')).toBeNull();
  });
  when('I tap Someday on the card', () => tap('Someday'));
  then('it is Someday, and #now went with Next', () => {
    expect(sectionLines(projectFile('Garden renovation'), 'Tasks')[0]).toBe('- [ ] Order soil #someday');
    expect(cardHeading()).toMatch(/^Todo · .+ · someday$/);
  });
  when('I tick it done on the card', () => tapLabel('Done'));
  then('it is done with today\'s completion date', () => {
    expect(sectionLines(projectFile('Garden renovation'), 'Tasks')[0]).toMatch(/^- \[x\] Order soil #someday \[completion:: \d{4}-\d{2}-\d{2}\]$/);
  });
  when('I tap the row "Fix the fence", Delete on its card, and confirm', async () => {
    // After the tick, Engage's prompt in the status line offers "Fix the fence" first; the row is the second.
    await tap('Fix the fence', 1);
    await tapLabel('Delete');
    expectShows(/^Delete "Fix the fence"\?/);
    await tap('Delete');
  });
  then('it is marked cancelled, and Quick Add is back', () => {
    expect(sectionLines(projectFile('Garden renovation'), 'Tasks')[1]).toBe('- [-] Fix the fence');
    expectShows('+ Todo');
  });
});

scenario('Todo card: the meeting a todo was agreed in opens its thread', {feature: 'Threads', design: 'technical-design-item-card.md', help: 'threads.md#where-a-todo-was-agreed'}, () => {
  given('area "Coaching" has a sparring session last week and a todo agreed in it', () => {
    putFile(
      areaFile('Coaching'),
      dataFile('area', {
        Scope: [],
        Tasks: [`- [ ] Send Jordan the role canvas [meeting:: ${lastWeek} Sparring Jordan sparring/jordan]`],
        Meetings: [`- ${lastWeek} 10:00-11:00 Sparring Jordan #sparring/jordan`],
      }),
    );
  });
  when('I tap the todo on Coaching', async () => {
    await openApp();
    await tapTab('Areas');
    await tap(/^Coaching/);
    await tap('Send Jordan the role canvas');
  });
  then('its card names the meeting', () => expectShows('↳ Sparring Jordan ›'));
  when('I tap it', () => tap('↳ Sparring Jordan ›'));
  then('the thread overview opens', () => {
    expectShows('Looking back');
    expectShows('#sparring/jordan');
  });
});
