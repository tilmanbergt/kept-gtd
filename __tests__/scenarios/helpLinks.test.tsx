import {expectNotShows, expectShows, openApp, shows, tap, tapTab} from '../../test-helpers/scenario/app';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';

const OVERVIEW_LINE = /: the way in - install/;

/** Pages forward (›) through the open help page until `text` is on screen. */
async function pageTo(text: string): Promise<void> {
  for (let i = 0; i < 10 && !shows(text); i++) await tap('›');
}

scenario('Follow links between help pages and walk back with ‹ Back', {feature: 'Help', design: 'technical-design-easy-start.md'}, () => {
  given('Kept is open on the Projects tab', async () => {
    await openApp();
    await tapTab('Projects');
  });
  when('I open the help', async () => {
    await tap('?');
  });
  then('it shows Projects and Areas, without ‹ Back', () => {
    expectShows(/^Projects and Areas/);
    expectNotShows('‹ Back');
  });
  when('I pick Overview in the list and tap its link Threads', async () => {
    await tap(/Overview$/);
    expectShows(OVERVIEW_LINE);
    await tap('Threads');
  });
  then('the Threads page opens, with ‹ Back', () => {
    expectShows(/^Threads/);
    expectNotShows(OVERVIEW_LINE);
    expectShows('‹ Back');
  });
  when('I tap ‹ Back twice', async () => {
    await tap('‹ Back');
    expectShows(OVERVIEW_LINE);
    await tap('‹ Back');
  });
  then('Projects and Areas shows again and there is nothing more to go back to', () => {
    expectShows(/^Projects and Areas/);
    expectNotShows('‹ Back');
  });
  when('I pick Quick Add and capture, page to its link Mark for later and tap it', async () => {
    await tap(/Quick Add and capture$/);
    await pageTo('Mark for later');
    await tap('Mark for later');
  });
  then('the Lasso page opens on the screen with its heading Marking for later', () => {
    expectShows('Marking for later');
  });
  when('I tap ‹ Back', async () => {
    await tap('‹ Back');
  });
  then('Quick Add and capture shows again on the screen with the link', () => {
    expectShows(/^Quick Add and capture/);
    expectShows('Mark for later');
  });
  and('after ✕ Close and opening the help again there is no ‹ Back', async () => {
    expectShows('‹ Back');
    await tap('✕ Close');
    await tap('?');
    expectNotShows('‹ Back');
  });
});
