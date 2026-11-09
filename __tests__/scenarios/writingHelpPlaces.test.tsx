// docs/dev/history/technical-design-writing-help.md §10.4: completion offers the active loops and counterparts of the place.
import {ContextDef} from '../../src/domain/contexts';
import {NoteSetup, seedNoteSetupDefaults} from '../../src/domain/noteSetups';
import {GtdParaSettings} from '../../src/domain/settings';
import {expectNotShows, expectShows, focus, openApp, tap, tapTab, type} from '../../test-helpers/scenario/app';
import {areaFile, dataFile, projectFile, putFile} from '../../test-helpers/scenario/files';
import {given, scenario, then, when} from '../../test-helpers/scenario/scenario';

function setup(id: string, name: string, tag: string, kind: 'thread' | 'loop'): NoteSetup {
  return {id, name, kind, tags: [tag], enabled: true, notebook: null, pages: {}, tracking: {trackPrep: false, trackReview: false}};
}

const work: ContextDef = {id: 'c1', name: 'Work', shows: [{kind: 'item', itemKind: 'area', name: 'Team'}], hides: [], outsideMeetings: 'dim'};

function settings(withContext = false): Partial<GtdParaSettings> {
  return {
    noteSetups: [setup('s1', 'One on one', '101', 'thread'), setup('s2', 'Workshops', 'workshop', 'loop'), setup('s3', 'Builds', 'build', 'loop')],
    noteSetupDefaults: seedNoteSetupDefaults(),
    nextNoteSetupId: 4,
    ...(withContext ? {contexts: [work], activeContextId: 'c1'} : {}),
  };
}

/** Area "Team" with the new loop #workshop/offsite and the counterpart sven, nothing tagged yet; area "Home" with the loop #build/shed. */
function places(): void {
  putFile(areaFile('Team'), dataFile('area', {Scope: [], Tasks: [], Meetings: [], Threads: ['- sven: active'], Loops: ['- workshop/offsite: active']}, ['abbrev: TE']));
  putFile(areaFile('Home'), dataFile('area', {Scope: [], Tasks: [], Meetings: [], Loops: ['- build/shed: active']}, ['abbrev: HO']));
  putFile(projectFile('Website'), dataFile('project', {Scope: [], Tasks: [], Meetings: []}, ['abbrev: WEB']));
}

async function openArea(name: string): Promise<void> {
  await openApp({settings: settings()});
  await tapTab('Areas');
  await tap(new RegExp(`^${name}`));
  await focus('New task');
}

scenario('A new loop no todo carries yet is offered in its area', {feature: 'Writing help', design: 'technical-design-writing-help.md', help: 'quick-add.md#completing-a-tag'}, () => {
  given('area "Team" has the loop #workshop/offsite, and no todo or meeting uses it', places);
  when('I write "#work" in Team\'s Quick Add', async () => {
    await openArea('Team');
    await type('New task', 'plan #work');
  });
  then('the strip offers #workshop/offsite', () => {
    expectShows('#workshop/offsite');
  });
  when('I write "#workshop/" instead', async () => {
    await type('New task', 'plan #workshop/');
  });
  then('it offers /offsite', () => {
    expectShows('/offsite');
  });
});

scenario('An active counterpart nobody has tagged yet is offered after type/', {feature: 'Writing help', design: 'technical-design-writing-help.md', help: 'quick-add.md#completing-a-tag'}, () => {
  given('area "Team" lists the counterpart sven under Threads, and nothing is tagged #101/sven', places);
  when('I write "#101/" in Team\'s Quick Add', async () => {
    await openArea('Team');
    await type('New task', 'ask #101/');
  });
  then('the strip offers /Sven', () => {
    expectShows('/Sven');
  });
});

scenario('An abbreviation in the text switches the place whose loops and counterparts are offered', {feature: 'Writing help', design: 'technical-design-writing-help.md', help: 'quick-add.md#completing-a-tag'}, () => {
  given('project "Website", and area "Team" (#TE) with the counterpart sven', places);
  when('on Website\'s page I write "#101/"', async () => {
    await openApp({settings: settings()});
    await tapTab('Projects');
    await tap(/^Website/);
    await focus('New task');
    await type('New task', 'ask #101/');
  });
  then('sven is not offered - he belongs to Team', () => {
    expectNotShows('/Sven');
  });
  when('I write "#TE ask #101/" instead', async () => {
    await type('New task', '');
    await type('New task', '#TE ask #101/');
  });
  then('the strip offers /Sven', () => {
    expectShows('/Sven');
  });
});

scenario('Daily offers the loops of the places the active context shows', {feature: 'Writing help', design: 'technical-design-writing-help.md', help: 'quick-add.md#completing-a-tag'}, () => {
  given('the context "Work" shows area Team (loop #workshop/offsite), not Home (loop #build/shed)', places);
  when('on Daily I write "#workshop/"', async () => {
    await openApp({settings: settings(true)});
    await tapTab('Daily');
    await focus('New task');
    await type('New task', 'plan #workshop/');
  });
  then('it offers /offsite', () => {
    expectShows('/offsite');
  });
  when('I write "#build/"', async () => {
    await type('New task', 'plan #build/');
  });
  then('nothing of Home is offered', () => {
    expectNotShows('/shed');
  });
});
