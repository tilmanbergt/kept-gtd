/**
 * A help diagram shows as its own block (docs/dev/history/technical-design-quality-assurance.md §9,
 * scenario 1), with the bundled diagrams of src/generated/helpImages.ts.
 */
import {screen} from '@testing-library/react-native';
import {StyleSheet} from 'react-native';
import {expectShows, openApp, shows, tap, tapTab} from '../../test-helpers/scenario/app';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {HELP_IMAGES} from '../../src/generated/helpImages';

const DIAGRAM = /^The states of a todo: from the Inbox/;
const AFTER = /^A due date is not a tag but a field/;

/** Pages forward (›) through the open help page until `text` is on screen. */
async function pageTo(text: RegExp): Promise<void> {
  for (let i = 0; i < 10 && !shows(text); i++) await tap('›');
}

scenario('A help page with a diagram shows the picture as its own block', {feature: 'Help', design: 'technical-design-quality-assurance.md', help: 'tags.md#flow-tags-for-todos'}, () => {
  given('Kept is open on Daily', async () => {
    await openApp();
    await tapTab('Daily');
  });
  when('I open Help and pick the Tags page', async () => {
    await tap('?');
    await tap(/^\s*Tags$/);
  });
  then('the heading "Flow tags for todos" shows, and below it the diagram with its alt text as label', () => {
    expectShows('Flow tags for todos');
    const image = screen.UNSAFE_root.findAll(n => DIAGRAM.test(String(n.props.accessibilityLabel ?? '')))[0];
    if (!image) throw new Error('no diagram on screen');
    expect(String(image.props.source?.uri ?? '')).toMatch(/^data:image\/png;base64,/);
    const {width, height} = StyleSheet.flatten(image.props.style);
    expect(width).toBe(1340);
    const png = HELP_IMAGES['todo-states'];
    expect(height).toBe(Math.round((1340 * png.height) / png.width));
  });
  and('the text after it, under Due dates, follows on the same page or the next', async () => {
    await pageTo(AFTER);
    expectShows(AFTER);
  });
});
