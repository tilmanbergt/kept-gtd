/**
 * A diagram taller than the help column (docs/dev/history/technical-design-quality-assurance.md §9,
 * scenarios 2 and 3): the Daily page's diagram is made four times as tall as it is wide here, so it
 * needs a page of its own and has to be shrunk to fit it.
 */
import {screen} from '@testing-library/react-native';
import {StyleSheet} from 'react-native';
import {expectShows, shows, openApp, tap, tapTab} from '../../test-helpers/scenario/app';
import {given, scenario, then, when} from '../../test-helpers/scenario/scenario';

jest.mock('../../src/generated/helpImages', () => ({
  HELP_IMAGES: {'daily-test': {uri: 'data:image/png;base64,AAAA', width: 960, height: 3840}},
}));

/** The fake device lays out every view 1340 × 1500 (test-helpers/scenario/app.tsx). */
const COLUMN = {width: 1340, height: 1500};
const DIAGRAM = /^Next todos, todos due today, tomorrow or overdue, and Waiting for todos/;
const AFTER = /^Todos marked Someday or Maybe never appear on Daily/;

function diagramSize(): {width: number; height: number} | null {
  const image = screen.UNSAFE_root.findAll(n => DIAGRAM.test(String(n.props.accessibilityLabel ?? '')))[0];
  return image ? StyleSheet.flatten(image.props.style) : null;
}

scenario('A tall diagram fits one page', {feature: 'Help', design: 'technical-design-quality-assurance.md', help: 'daily.md#what-appears-on-daily'}, () => {
  given('the Daily page\'s diagram is four times as tall as wide', async () => {
    await openApp();
    await tapTab('Daily');
  });
  when('I open Help on the Daily page and page to the diagram', async () => {
    await tap('?');
    for (let i = 0; i < 5 && !diagramSize(); i++) await tap('›');
  });
  then('the diagram is shrunk to fit below the page header, keeping its aspect', () => {
    const size = diagramSize();
    if (!size) throw new Error('no diagram on screen');
    expect(size.height).toBeLessThanOrEqual(COLUMN.height - 33);
    expect(size.height).toBeGreaterThan(COLUMN.height / 2);
    expect(Math.abs(size.width * 4 - size.height)).toBeLessThanOrEqual(4);
  });
  when('I page on with ›', async () => {
    for (let i = 0; i < 5 && !shows(AFTER); i++) await tap('›');
  });
  then('the text after the diagram shows', () => expectShows(AFTER));
});

scenario('A heading link to a page with a diagram still lands on the heading', {feature: 'Help', design: 'technical-design-quality-assurance.md', help: 'daily.md#labels'}, () => {
  given('Kept is open with Help on the Quick Add page', async () => {
    await openApp();
    await tap('?');
    await tap(/Quick Add and capture$/);
  });
  when('I page to its link "labels" (daily.md#labels, after the diagram) and tap it', async () => {
    for (let i = 0; i < 10 && !shows('labels'); i++) await tap('›');
    await tap('labels');
  });
  then('the Daily page opens with the heading Labels on screen, not the diagram', () => {
    expectShows('Labels');
    expect(diagramSize()).toBeNull();
  });
});
