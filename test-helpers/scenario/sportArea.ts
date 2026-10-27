/**
 * Area Sport (docs/dev/history/technical-design-engage-page-owner.md §6): its home notebook "Sport 2026.note" is also
 * the note of its active loop #loop/marathon (Loop setup named "{name} {year}", main date in 2026). Pages are
 * 1-based as in the design; the fake device counts from 0. Used by __tests__/scenarios/pageSection.test.tsx and the
 * smoke scenarios that open Engage on a meeting's page and capture a todo from a mark.
 */
import {meetingKey} from '../../src/domain/provenance';
import {NoteSetup, seedNoteSetupDefaults} from '../../src/domain/noteSetups';
import {GtdParaSettings} from '../../src/domain/settings';
import {device} from '../fakeDevice/device';
import {openApp, openEngage, tap, tapTab, texts} from './app';
import {fixedClock} from './clock';
import {areaDir, areaFile, dataFile, putFile} from './files';
import {sparringSettings} from './setups';

export const SPORT = areaDir('Sport');
export const NOTEBOOK = `${SPORT}/Sport 2026.note`;
export const COACH_DATE = '2026-10-24';
export const COACH_KEY = meetingKey({date: COACH_DATE, title: 'Coach call'});

/** Sunday 2026-10-25, 09:00 - the day after the coach call. */
export const sportClock = () => fixedClock(new Date(2026, 9, 25, 9, 0));

/** The Loop setup "Marathon" on `#loop`; its notes are named `name`. */
export function loopSetup(name: string): NoteSetup {
  return {id: 'l1', name: 'Marathon', kind: 'loop', tags: ['loop'], enabled: true, notebook: {name, folder: ''}, pages: {}, tracking: {trackPrep: false, trackReview: false}};
}

/** Sparring threads, the Marathon loop setup and the seeded Default ("{name} {year}" home notebooks). */
export function settings(loopNoteName = '{name} {year}'): Partial<GtdParaSettings> {
  const sparring = sparringSettings().noteSetups ?? [];
  return {noteSetups: [...sparring, loopSetup(loopNoteName)], noteSetupDefaults: seedNoteSetupDefaults(), nextNoteSetupId: 3, noteSetupsMigrated: true};
}

/** A heading on a page: `typed` puts a textbox under it, otherwise it is handwritten. */
export function headingPage(page: number, typed: string | null): object {
  const rect = {left: 100, top: 120, right: 900, bottom: 180};
  const title = {page, X: 100, Y: 120, width: 800, height: 60, style: 3, controlTrailNums: typed ? [1] : []};
  const textbox = {uuid: 'tb', type: 500, pageNum: page, layerNum: 0, numInPage: 1, textBox: {textContentFull: typed, textRect: rect}, link: null};
  return {titles: [title], elements: typed ? [textbox] : []};
}

/**
 * Area Sport and its notebook: p1 Home, p2 free, p3 meeting "Coach call", p4 free, p5 todo "Plan long runs
 * #loop/marathon", p6 free, p7 typed heading "Training plan", p8 free, p9 handwritten heading, p10 todo "Buy shoes"
 * (keyword, no title), p11 free.
 */
export function sport(options: {loop?: 'active' | 'done'; shoes?: 'open' | 'cancelled'; coach?: 'held' | 'cancelled'; marks?: string[]} = {}): void {
  const shoes = options.shoes === 'cancelled' ? '- [-] Buy shoes' : '- [ ] Buy shoes';
  const coach = `- ${options.coach === 'cancelled' ? '[-] ' : ''}${COACH_DATE} 10:00-11:00 Coach call → [[Sport 2026.note#${COACH_DATE} Coach call]]`;
  putFile(
    areaFile('Sport'),
    dataFile(
      'area',
      {
        Scope: [],
        Tasks: [
          '- [ ] Plan long runs #loop/marathon → [[Sport 2026.note#Plan long runs #loop/marathon]]',
          `${shoes} → [[Sport 2026.note#Buy shoes]]`,
          `- [ ] Book physio [meeting:: ${COACH_KEY}]`,
        ],
        Meetings: [coach],
        Loops: [`- loop/marathon: ${options.loop ?? 'active'}, 2026-11-15`],
        ...(options.marks ? {Marks: options.marks} : {}),
      },
      ['abbrev: Sp'],
    ),
  );
  const t = (p: object) => p as never;
  device().sdk.putNote(NOTEBOOK, [
    {keywords: ['home']},
    {},
    {keywords: [COACH_DATE, `${COACH_DATE} Coach call`]},
    {},
    {keywords: ['Plan long runs #loop/marathon']},
    {},
    t(headingPage(6, 'Training plan\nweek 1-4')),
    {},
    t(headingPage(8, null)),
    {keywords: ['Buy shoes']},
    {},
  ]);
}

/** Engage on page `page` (1-based) of `note`. */
export const engageOn = (page: number, note = NOTEBOOK, loopNoteName?: string) => openEngage({fromNote: note, page: page - 1, settings: settings(loopNoteName)});

export const sectionLine = () => texts().filter(l => l.startsWith('Section: '));

/** A mark in Sport 2026.note on page `page` (1-based) saying `text`. */
export const sportMark = (page: number, text: string) => `- 2026-10-25 09:00 [[Sport 2026.note]] p${page} ${text} ^m-20261025-0900${String(page).padStart(2, '0')}-000`;

/** Sport's page, its marks to process. */
export async function processSportMarks(): Promise<void> {
  await openApp({settings: settings()});
  await tapTab('Areas');
  await tap(/^Sport/);
  await tap(/to process/);
}
