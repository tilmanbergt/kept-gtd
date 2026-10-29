/** Focus blocks (docs/dev/history/technical-design-time-and-place.md §3.1, §6). */
import {FOCUS_BLOCK_TAG, isFocusBlock, setFocusBlock} from '../../src/domain/focusBlock';
import {isContextTag} from '../../src/domain/flowState';
import {meetingCardModel} from '../../src/domain/itemCard';
import {deriveMeetingFields} from '../../src/domain/markdown';
import {scheduleCountText} from '../../src/domain/meetingDisplay';
import {stripActions} from '../../src/domain/meetingMoment';
import {meetingDisplayTitle, resolveMeetingTracking, tracksCheckpoint} from '../../src/domain/meetingTracking';
import {createNoteSetup, focusBlockNoteTarget, NoteSetupConfig} from '../../src/domain/noteSetups';
import {reflectionOffered} from '../../src/domain/reflection';
import {Meeting} from '../../src/domain/types';
import {meeting} from '../../test-helpers/fixtures';

const nowMs = new Date(2026, 9, 21, 12, 0).getTime();
const writing = {...createNoteSetup('1', 'loop'), name: 'Writing', tags: ['writing']};
const tracked = {...createNoteSetup('2', 'thread'), name: 'Sparring', tags: ['sparring'], tracking: {trackPrep: true, trackReview: true}};
const config = (defaultsTrack = true): NoteSetupConfig => ({
  setups: [writing, tracked],
  defaults: {pages: {}, tracking: {trackPrep: defaultsTrack, trackReview: defaultsTrack}, notebook: null},
});
const m = (date: string, title: string, extra: Partial<Meeting> = {}) => meeting(date, title, {time: '09:00', endTime: '11:00', ...deriveMeetingFields(title), ...extra});

describe('focusBlock tag', () => {
  it('sets and unsets #focusblock, idempotently', () => {
    const on = setFocusBlock('Writing session #writing/novel', true);
    expect(on).toBe(`Writing session #writing/novel #${FOCUS_BLOCK_TAG}`);
    expect(setFocusBlock(on, true)).toBe(on);
    expect(setFocusBlock(on, false)).toBe('Writing session #writing/novel');
    expect(setFocusBlock('Plain', false)).toBe('Plain');
  });
  it('reads it from the tags, and it is no tag filter word', () => {
    expect(isFocusBlock(deriveMeetingFields('Deep work #focusblock'))).toBe(true);
    expect(isFocusBlock(deriveMeetingFields('Deep work'))).toBe(false);
    expect(isContextTag('focusblock')).toBe(false);
  });
  it('never shows in the displayed title', () => {
    expect(meetingDisplayTitle({title: 'Writing session #writing/novel #focusblock #monthly'})).toBe('Writing session #writing/novel');
  });
});

describe('a focus block is not tracked and has no reflection', () => {
  const block = m('2026-10-20', 'Sparring prep #sparring/mieke #focusblock');
  it('no checkpoint, even when its setup and the Default track', () => {
    expect(tracksCheckpoint(block, config(), 'prep')).toBe(false);
    expect(tracksCheckpoint(block, config(), 'review')).toBe(false);
    expect(resolveMeetingTracking(block, config(), new Date(nowMs))).toBeNull();
    expect(tracksCheckpoint({cancelled: false, tags: ['sparring/mieke']}, config(), 'review')).toBe(true);
  });
  it('no Reflect, also on the Engage strip', () => {
    expect(reflectionOffered(block, nowMs)).toBe(false);
    expect(reflectionOffered({...block, tags: ['sparring/mieke']}, nowMs)).toBe(true);
    const strip = {tracksPrep: false, prepped: false, tracksReview: false, reviewed: false, lastHasNote: false, nextNeeded: false, onReflectionPage: false};
    expect(stripActions('after', {...strip, focusBlock: true})).toEqual([]);
    expect(stripActions('after', strip)).toEqual(['reflect']);
  });
});

describe('the focus block card', () => {
  const card = (mtg: Meeting, extra = {}) =>
    meetingCardModel({meeting: mtg, setups: config(), nowMs, reflection: 'none', ownerName: 'Writing', canLink: false, canRefile: false, ...extra});
  it('says Focus, links its loop by kind and name, offers no P/R and no Reflect', () => {
    const ahead = card(m('2026-10-22', 'Writing session #writing/novel #focusblock'));
    expect(ahead.heading).toBe('Focus · ahead');
    expect(ahead.focusBlock).toBe(true);
    expect(ahead.thread).toEqual({tag: 'writing/novel', label: 'writing novel ›'});
    expect(ahead.checkpoint).toBeNull();
    const over = card(m('2026-10-19', 'Sparring prep #sparring/mieke #focusblock'));
    expect(over.heading).toBe('Focus · over');
    expect(over.reflection).toBeNull();
    expect(over.thread?.label).toBe('#sparring/mieke ›');
  });
  it('a meeting card stays as it is', () => {
    const plain = card(m('2026-10-19', 'Sparring #sparring/mieke'));
    expect(plain.heading).toBe('Meeting · over');
    expect(plain.focusBlock).toBe(false);
    expect(plain.reflection).toBe('none');
    expect(plain.note).toBe('create');
  });
  it('note: by a matching setup as a meeting; else the home notebook; none in the Inbox; an existing link opens', () => {
    expect(card(m('2026-10-22', 'Writing #writing/novel #focusblock')).note).toBe('create');
    expect(card(m('2026-10-22', 'Tax return #focusblock')).note).toBe('home');
    expect(card(m('2026-10-22', 'Tax return #focusblock'), {inbox: true}).note).toBeNull();
    expect(card(m('2026-10-22', 'Tax return #focusblock', {notePath: 'Meetings/x.note'})).note).toBe('open');
  });
});

describe('focusBlockNoteTarget', () => {
  it('meeting with a matching setup, home otherwise, none in the Inbox', () => {
    expect(focusBlockNoteTarget({tags: ['writing/novel', 'focusblock']}, [writing], false)).toBe('meeting');
    expect(focusBlockNoteTarget({tags: ['focusblock']}, [writing], false)).toBe('home');
    expect(focusBlockNoteTarget({tags: ['writing/novel', 'focusblock']}, [writing], true)).toBe('none');
    expect(focusBlockNoteTarget({tags: ['writing/novel']}, [{...writing, enabled: false}], false)).toBe('home');
  });
});

describe('scheduleCountText', () => {
  const e = (title: string) => ({meeting: deriveMeetingFields(title)});
  it('counts meetings and focus blocks apart', () => {
    expect(scheduleCountText([e('a'), e('b')])).toBe('2 meetings');
    expect(scheduleCountText([e('a')])).toBe('1 meeting');
    expect(scheduleCountText([e('a'), e('b #focusblock')])).toBe('1 meeting · 1 focus');
    expect(scheduleCountText([e('b #focusblock')])).toBe('1 focus');
    expect(scheduleCountText([])).toBe('0 meetings');
  });
});
