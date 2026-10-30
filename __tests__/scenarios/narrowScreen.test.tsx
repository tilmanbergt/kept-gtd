import {isoDateOffset} from '../../src/domain/meetingTime';
import {CHANGELOG} from '../../src/generated/changelog';
import {setScreenSimulation} from '../../src/ui/screenSimStore';
import {act} from '@testing-library/react-native';
import {expectShows, openApp, settle, tap, tapTab} from '../../test-helpers/scenario/app';
import {areaFile, dataFile, putFile} from '../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {sparringSettings} from '../../test-helpers/scenario/setups';

const past = isoDateOffset(-10);

scenario('On a Nomad-sized screen, Quick Add with four tabs keeps its + Add and calls Agreement "Agree"', {feature: 'Quick Add', design: 'technical-design-launch-ready.md'}, () => {
  given('area "Coaching" has a past sparring session with Jordan, and Kept is drawn at Nomad portrait size', () => {
    putFile(
      areaFile('Coaching'),
      dataFile('area', {Scope: [], Tasks: [], Meetings: [`- ${past} 10:00-11:00 Sparring Jordan #sparring/jordan`], Threads: ['- jordan: active'], Agreements: []}, ['abbrev: Co']),
    );
    setScreenSimulation('nomad-portrait');
  });
  when('I open Jordan\'s thread overview', async () => {
    await openApp({settings: sparringSettings()});
    await tapTab('Areas');
    await tap(/^Coaching/);
    await tap('#sparring/jordan');
  });
  then('its Quick Add shows the short tab name and the main button', () => {
    expectShows('Agree');
    expectShows('+ Add');
  });
  and('back at full size the tab is called Agreement again', async () => {
    await act(async () => setScreenSimulation(null));
    await settle();
    await tapTab('Areas');
    await tap(/^Coaching/);
    await tap('#sparring/jordan');
    expectShows('Agreement');
  });
});

scenario('What\'s new offers the last three versions and says where the earlier ones are', {feature: 'Settings', design: 'technical-design-launch-ready.md'}, () => {
  when('I open Settings → About', async () => {
    await openApp();
    await tapTab('Settings');
    await tap('About');
  });
  then('the newest version\'s notes show, with a pointer to the rest on GitHub', () => {
    expect(CHANGELOG.length).toBeGreaterThan(3);
    expectShows('Earlier versions: CHANGELOG.md at github.com/tilmanbergt/kept-gtd');
  });
});
