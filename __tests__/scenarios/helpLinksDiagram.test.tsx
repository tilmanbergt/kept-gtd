/**
 * A help diagram shows as its own block (docs/dev/history/technical-design-quality-assurance.md §9,
 * scenario 1), with the bundled diagrams of src/generated/helpImages.ts.
 */
import {screen} from '@testing-library/react-native';
import {StyleSheet} from 'react-native';
import {expectShows, openApp, shows, tap, tapTab} from '../../test-helpers/scenario/app';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';

const DIAGRAM = /^Next todos, todos due today, tomorrow or overdue, and Waiting for todos/;
const AFTER = /^Todos marked Someday or Maybe never appear on Daily/;

/** Pages forward (›) through the open help page until `text` is on screen. */
async function pageTo(text: RegExp): Promise<void> {
  for (let i = 0; i < 10 && !shows(text); i++) await tap('›');
}

scenario('A help page with a diagram shows the picture as its own block', {feature: 'Help', design: 'technical-design-quality-assurance.md', help: 'daily.md#what-appears-on-daily'}, () => {
  given('Kept is open on Daily', async () => {
    await openApp();
    await tapTab('Daily');
  });
  when('I open Help, which starts on the Daily page', async () => {
    await tap('?');
  });
  then('the heading "What appears on Daily" shows, and below it the diagram with its alt text as label', () => {
    expectShows('What appears on Daily');
    const image = screen.UNSAFE_root.findAll(n => DIAGRAM.test(String(n.props.accessibilityLabel ?? '')))[0];
    if (!image) throw new Error('no diagram on screen');
    expect(String(image.props.source?.uri ?? '')).toMatch(/^data:image\/png;base64,/);
    const {width, height} = StyleSheet.flatten(image.props.style);
    expect(width).toBe(1340);
    expect(height).toBe(Math.round((1340 * 475) / 960));
  });
  and('the text after it follows on the same page or the next', async () => {
    await pageTo(AFTER);
    expectShows(AFTER);
  });
});
