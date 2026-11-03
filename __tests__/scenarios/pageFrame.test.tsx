import {isoDateOffset} from '../../src/domain/meetingTime';
import {GtdParaSettings} from '../../src/domain/settings';
import {NoteSetup} from '../../src/domain/noteSetups';
import {pageFitText} from '../../src/ui/usePageFitNotice';
import {device} from '../../test-helpers/fakeDevice/device';
import {expectShows, openApp, tap, tapLabel, tapTab} from '../../test-helpers/scenario/app';
import {areaDir, areaFile, dataFile, pageTexts, putFile} from '../../test-helpers/scenario/files';
import {given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {reflectionPageWith, sparringSettings} from '../../test-helpers/scenario/setups';

const DESIGN = 'technical-design-launch-ready.md';
const d1 = isoDateOffset(-3);
const NOTEBOOK = `${areaDir('Coaching')}/Meetings/sparring jordan ${d1.slice(0, 4)}.note`;
const MEETING_KW = `${d1} Sparring Jordan #sparring/jordan`;
const QUESTION = 'What did I notice?';

/** Sparring settings whose Reflection page puts its question at reference y `y`. */
function settingsWithQuestionAt(y: number): Partial<GtdParaSettings> {
  const base = sparringSettings();
  const layout = reflectionPageWith(QUESTION);
  const pieces = layout.pieces.map(p => (p.type === 'text' ? {...p, y} : p));
  const setup = {...(base.noteSetups as NoteSetup[])[0], pages: {review: {...layout, pieces}}};
  return {...base, noteSetups: [setup]};
}

function coachingWithNotebook(size: {width: number; height: number}, machineType: number): void {
  putFile(areaFile('Coaching'), dataFile('area', {Scope: [], Tasks: [], Meetings: [`- ${d1} 10:00-11:00 Sparring Jordan #sparring/jordan → [[Meetings/sparring jordan ${d1.slice(0, 4)}.note#${MEETING_KW}]]`]}, ['abbrev: Co']));
  device().sdk.putNote(NOTEBOOK, [{keywords: [d1, MEETING_KW]}], 'style_white', {size, machineType});
}

async function reflect(settings: Partial<GtdParaSettings>): Promise<void> {
  await openApp({settings});
  await tapTab('Areas');
  await tap(/^Coaching/);
  await tap(/^Sparring Jordan/);
  await tapLabel('Reflect');
  await tap('Add page');
}

function textBoxesOn(page: number): Array<{text: string; x: number; y: number; fontSize: number}> {
  return device()
    .sdk.note(NOTEBOOK)!
    .pages[page].elements.filter(el => el.textBox)
    .map(el => {
      const box = el.textBox as unknown as {textContentFull: string; textRect: {left: number; top: number}; fontSize: number};
      return {text: box.textContentFull, x: box.textRect.left, y: box.textRect.top, fontSize: box.fontSize};
    });
}

scenario('On a Manta notebook the reflection page keeps its layout, scaled to the bigger page', {feature: 'Note setups', design: DESIGN}, () => {
  given('a sparring notebook made on a Manta (1920 × 2560 px pages)', () => coachingWithNotebook({width: 1920, height: 2560}, 5));
  when('I reflect on the session', () => reflect(settingsWithQuestionAt(400)));
  then('the question sits at the Manta position of reference (x, 400), in a bigger font', () => {
    const question = textBoxesOn(1).find(b => b.text === QUESTION)!;
    expect(question.y).toBe(Math.round(400 * (1920 / 1404)));
    expect(question.fontSize).toBeGreaterThan(36);
  });
});

scenario('On a horizontal notebook a piece that would land below the page is left out, and Kept says so', {feature: 'Note setups', design: DESIGN}, () => {
  given('a sparring notebook with horizontal pages (1872 × 1404 px)', () => coachingWithNotebook({width: 1872, height: 1404}, 3));
  when('I reflect with a setup whose question sits at reference y 1600', () => reflect(settingsWithQuestionAt(1600)));
  then('the page gets its heading but not the question, and the status line explains', () => {
    expect(pageTexts(NOTEBOOK, 1)).not.toContain(QUESTION);
    expect(pageTexts(NOTEBOOK, 1).length).toBeGreaterThan(0);
    expectShows(pageFitText(1));
  });
});

scenario('On an A5 X notebook every piece stays exactly where the setup puts it', {feature: 'Note setups', design: DESIGN}, () => {
  given('a sparring notebook made on the A5 X', () => coachingWithNotebook({width: 1404, height: 1872}, 3));
  when('I reflect with the question at reference y 1600', () => reflect(settingsWithQuestionAt(1600)));
  then('the question is written at y 1600, unscaled', () => {
    expect(textBoxesOn(1).find(b => b.text === QUESTION)?.y).toBe(1600);
  });
});
