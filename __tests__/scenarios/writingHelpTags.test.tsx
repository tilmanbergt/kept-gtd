// docs/dev/history/technical-design-writing-help.md §6, scenarios 1-10: tags in Quick Add.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {act, fireEvent, screen} from '@testing-library/react-native';
import {NoteSetup, seedNoteSetupDefaults} from '../../src/domain/noteSetups';
import {GtdParaSettings} from '../../src/domain/settings';
import {expectNotShows, expectShows, fieldValue, focus, openApp, tap, tapTab, textsBetween, type} from '../../test-helpers/scenario/app';
import {dataFile, projectFile, putFile, sectionLines} from '../../test-helpers/scenario/files';
import {given, scenario, then, when} from '../../test-helpers/scenario/scenario';

const TITLE = 'New meeting title';

function setup(id: string, name: string, tag: string, notebook: string): NoteSetup {
  return {id, name, kind: 'thread', tags: [tag], enabled: true, notebook: {name: notebook, folder: 'Meetings'}, pages: {}, tracking: {trackPrep: false, trackReview: false}};
}

/** Note setups "Daily" on `#daily` (notebook Meetings/Daily.note) and "One on one" on `#101`. */
function settings(): Partial<GtdParaSettings> {
  return {noteSetups: [setup('s1', 'Daily', 'daily', 'Daily'), setup('s2', 'One on one', '101', '{tag} {subtag}')], noteSetupDefaults: seedNoteSetupDefaults(), nextNoteSetupId: 3};
}

/** Project "Website" with `meetings`, opened on its page, the Meeting tab chosen and the cursor in the title. */
async function openMeetingTab(meetings: string[] = [], tasks: string[] = []): Promise<void> {
  putFile(projectFile('Website'), dataFile('project', {Scope: [], Tasks: tasks, Meetings: meetings}, ['abbrev: WEB']));
  await openApp({settings: settings()});
  await tapTab('Projects');
  await tap(/^Website/);
  await tap('Meeting');
  await focus(TITLE);
}


scenario('Handwriting writes #DaiIy: the strip suggests #daily', {feature: 'Writing help', design: 'technical-design-writing-help.md', help: 'quick-add.md#tag-suggestions'}, () => {
  when('recognition writes "stand-up #DaiIy" into the meeting title', async () => {
    await openMeetingTab();
    await type(TITLE, 'stand-up #DaiIy');
  });
  then('the strip shows → #daily, Keep and Edit ›, and the title is unchanged', () => {
    expectShows('→ #daily');
    expectShows('Keep');
    expectShows('Edit ›');
    expect(fieldValue(TITLE)).toBe('stand-up #DaiIy');
  });
  when('I tap → #daily', async () => {
    await tap('→ #daily');
  });
  then('the title reads "stand-up #daily" and the strip says where its page goes', () => {
    expect(fieldValue(TITLE)).toBe('stand-up #daily');
    expectShows('✓ Daily · Meetings/Daily.note');
  });
});

scenario('A learned correction is applied directly, with Undo', {feature: 'Writing help', design: 'technical-design-writing-help.md', help: 'tags.md#learned-corrections'}, () => {
  when('I correct #DaiIy to #daily once and then write "#DaiIy" again', async () => {
    await openMeetingTab();
    await type(TITLE, 'stand-up #DaiIy');
    await tap('→ #daily');
    await type(TITLE, '');
    await type(TITLE, 'retro #DaiIy');
  });
  then('the title reads "retro #daily" and the strip says "read as #daily" with Undo', () => {
    expect(fieldValue(TITLE)).toBe('retro #daily');
    expectShows('read as #daily');
    expectShows('Undo');
  });
  when('I tap Undo', async () => {
    await tap('Undo');
  });
  then('#DaiIy is back and the pair is forgotten', async () => {
    expect(fieldValue(TITLE)).toBe('retro #DaiIy');
    expect(JSON.parse((await AsyncStorage.getItem('kept:tagFixes:v1')) ?? '{}').fixes).toEqual([]);
    expectNotShows('→ #daily');
  });
});

scenario('A known tag in another case is never questioned', {feature: 'Writing help', design: 'technical-design-writing-help.md', help: 'quick-add.md#tag-suggestions'}, () => {
  when('I write "stand-up #Daily"', async () => {
    await openMeetingTab();
    await type(TITLE, 'stand-up #Daily');
  });
  then('nothing is flagged and the strip says where its page goes', () => {
    expectNotShows(/^→ #/);
    expectShows('✓ Daily · Meetings/Daily.note');
    expect(fieldValue(TITLE)).toBe('stand-up #Daily');
  });
});

scenario('A space after the slash goes silently, the parent tag is suggested', {feature: 'Writing help', design: 'technical-design-writing-help.md', help: 'quick-add.md#tag-suggestions'}, () => {
  given('the setup on #101 and an earlier meeting with #101/mieke', () => undefined);
  when('I write "#1o1/ Mieke"', async () => {
    await openMeetingTab(['- 2026-10-01 10:00 One on one #101/mieke']);
    await type(TITLE, '#1o1/ Mieke');
  });
  then('the title reads "#1o1/Mieke" and the strip offers → #101/Mieke', () => {
    expect(fieldValue(TITLE)).toBe('#1o1/Mieke');
    expectShows('→ #101/Mieke');
  });
});

scenario('Two flagged tags show in text order, a third is left out', {feature: 'Writing help', design: 'technical-design-writing-help.md', help: 'quick-add.md#tag-suggestions'}, () => {
  when('with #retro, #lena and #garden known I write "for #retros #Iena #gardn"', async () => {
    await openMeetingTab([], ['- [ ] Plan #retro', '- [ ] Call #lena', '- [ ] Dig #garden']);
    await type(TITLE, 'for #retros #Iena #gardn');
  });
  then('the strip shows → #retro, then → #lena, and not → #garden', () => {
    expectShows('→ #retro');
    expectShows('→ #lena');
    expectNotShows('→ #garden');
  });
});

scenario('+ Add with a suggestion open asks once, the second + Add saves as written', {feature: 'Writing help', design: 'technical-design-writing-help.md', help: 'quick-add.md#adding-with-a-suggestion-open'}, () => {
  when('I write "stand-up #DaiIy" and tap + Add', async () => {
    await openMeetingTab();
    await type(TITLE, 'stand-up #DaiIy');
    await tap('+ Add');
  });
  then('nothing is saved and the status line asks', () => {
    expect(sectionLines(projectFile('Website'), 'Meetings')).toEqual([]);
    expectShows('Check #DaiIy, or Add again to keep it');
    expectShows('→ #daily');
  });
  when('I tap + Add again', async () => {
    await tap('+ Add');
  });
  then('the meeting is saved with #DaiIy', () => {
    expect(sectionLines(projectFile('Website'), 'Meetings')).toEqual([expect.stringMatching(/ stand-up #DaiIy$/)]);
  });
});

scenario('A new tag with nothing close is no question', {feature: 'Writing help', design: 'technical-design-writing-help.md', help: 'quick-add.md#tag-suggestions'}, () => {
  when('I write "plan #offsite27"', async () => {
    await openMeetingTab();
    await type(TITLE, 'plan #offsite27');
  });
  then('the strip names the new tag and the home notebook', () => {
    expectShows('New tag #offsite27 · Website 2026.note');
  });
  when('I tap + Add', async () => {
    await tap('+ Add');
  });
  then('the meeting is saved at once', () => {
    expect(sectionLines(projectFile('Website'), 'Meetings')).toEqual([expect.stringMatching(/ plan #offsite27$/)]);
  });
});

scenario('An unfinished tag is completed from the known ones', {feature: 'Writing help', design: 'technical-design-writing-help.md', help: 'quick-add.md#completing-a-tag'}, () => {
  when('with #sparring and #sparring/lena known I write "call #spa"', async () => {
    await openMeetingTab(['- 2026-10-01 10:00 Sparring #sparring', '- 2026-10-08 10:00 Sparring #sparring/lena']);
    await type(TITLE, 'call #spa');
  });
  then('the strip offers both', () => {
    expectShows('#sparring');
    expectShows('#sparring/lena');
  });
  when('I tap #sparring/lena', async () => {
    await tap('#sparring/lena');
  });
  then('the tag is replaced and followed by a space', () => {
    expect(fieldValue(TITLE)).toBe('call #sparring/lena ');
  });
});

scenario('Completion shows an abbreviation with its project', {feature: 'Writing help', design: 'technical-design-writing-help.md', help: 'quick-add.md#completing-a-tag'}, () => {
  given('project "Garden renovation" with the abbreviation GR', () => {
    putFile(projectFile('Garden renovation'), dataFile('project', {Scope: [], Tasks: [], Meetings: []}, ['abbrev: GR']));
  });
  when('I write "#g"', async () => {
    await openMeetingTab();
    await type(TITLE, 'call #g');
  });
  then('the strip offers #gr with "Garden renovation"', () => {
    expectShows('#gr Garden renovation');
  });
});

scenario('One tap fixes every place the tag is written so', {feature: 'Writing help', design: 'technical-design-writing-help.md', help: 'quick-add.md#tag-suggestions'}, () => {
  when('recognition writes "#DaiIy notes for #DaiIy" and I tap → #daily', async () => {
    await openMeetingTab();
    await type(TITLE, '#DaiIy notes for #DaiIy');
    await tap('→ #daily');
  });
  then('both read #daily', () => {
    expect(fieldValue(TITLE)).toBe('#daily notes for #daily');
  });
});

scenario('A learned correction ended by a typed space keeps the cursor after the space', {feature: 'Writing help', design: 'technical-design-writing-help.md', help: 'tags.md#learned-corrections'}, () => {
  when('daiiy → daily is learned and I type "#DaiIy" and then a space', async () => {
    await openMeetingTab();
    await type(TITLE, 'stand-up #DaiIy');
    await tap('→ #daily');
    await type(TITLE, '');
    await type(TITLE, 'x #DaiIy');
    await type(TITLE, 'x #DaiIy ');
  });
  then('the title reads "x #daily " with the cursor at its end', () => {
    expect(fieldValue(TITLE)).toBe('x #daily ');
    expect(screen.getByPlaceholderText(TITLE).props.selection).toEqual({start: 9, end: 9});
  });
});

/** The field reports its cursor, as Android does after a change or a tap. */
async function cursorAt(position: number): Promise<void> {
  await act(async () => {
    fireEvent(screen.getByPlaceholderText(TITLE), 'selectionChange', {nativeEvent: {selection: {start: position, end: position}}});
  });
}

scenario('A space after # is removed and the tag is still completed', {feature: 'Writing help', design: 'technical-design-writing-help.md', help: 'quick-add.md#completing-a-tag'}, () => {
  when('recognition writes "# Dai"', async () => {
    await openMeetingTab();
    await type(TITLE, '# Dai');
  });
  then('the title reads "#Dai" and the cursor is put after it', () => {
    expect(fieldValue(TITLE)).toBe('#Dai');
    expect(screen.getByPlaceholderText(TITLE).props.selection).toEqual({start: 4, end: 4});
  });
  when('the field still reports its cursor where it was before the space went, then where it is now', async () => {
    await cursorAt(5);
    await cursorAt(4);
  });
  then('the strip offers #daily', () => {
    expectShows('#daily');
  });
  when('I tap #daily', async () => {
    await tap('#daily');
  });
  then('the title reads "#daily "', () => {
    expect(fieldValue(TITLE)).toBe('#daily ');
  });
});

scenario('A tag typed letter by letter is completed, not after a space', {feature: 'Writing help', design: 'technical-design-writing-help.md', help: 'quick-add.md#completing-a-tag'}, () => {
  when('I type "#", "D", "a"', async () => {
    await openMeetingTab();
    await type(TITLE, '#');
    await type(TITLE, '#D');
    await type(TITLE, '#Da');
  });
  then('the strip offers #daily', () => {
    expectShows('#daily');
  });
  when('I type a space', async () => {
    await type(TITLE, '#Da ');
  });
  then('the completion is gone', () => {
    expectNotShows('#daily');
  });
});

scenario('Putting the cursor after an unfinished tag offers its completions', {feature: 'Writing help', design: 'technical-design-writing-help.md', help: 'quick-add.md#completing-a-tag'}, () => {
  given('project "Atruvia" with the abbreviation ATR', () => {
    putFile(projectFile('Atruvia'), dataFile('project', {Scope: [], Tasks: [], Meetings: []}, ['abbrev: ATR']));
  });
  when('the title reads "call #AT about it" and I put the cursor right after "#AT"', async () => {
    await openMeetingTab();
    await type(TITLE, 'call #AT about it');
    await cursorAt(8);
  });
  then('the strip offers #atr with "Atruvia"', () => {
    expectShows('#atr Atruvia');
  });
  when('I put the cursor at the start', async () => {
    await cursorAt(0);
  });
  then('the completion is gone', () => {
    expectNotShows('#atr Atruvia');
  });
});

scenario('After type/ the strip offers that type\'s counterparts', {feature: 'Writing help', design: 'technical-design-writing-help.md', help: 'quick-add.md#completing-a-tag'}, () => {
  when('with #101/mieke and #101/jordan known I write "#101/"', async () => {
    await openMeetingTab(['- 2026-10-01 10:00 1:1 #101/mieke', '- 2026-10-08 10:00 1:1 #101/jordan']);
    await type(TITLE, '1:1 #101/');
  });
  then('the strip offers both counterparts', () => {
    expect(textsBetween('Meeting', 'Edit ›').filter(t => t.startsWith('#101/'))).toEqual(['#101/jordan', '#101/mieke']);
  });
});
