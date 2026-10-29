// docs/dev/history/technical-design-engage-page-owner.md §3.8: the section line's text, and the section in the
// panel's state - set on opening for the note's owner, cleared like the page's meeting.
import {engageFlow, INITIAL_ENGAGE_STATE} from '../../src/domain/engageFlow';
import {sectionLineText} from '../../src/domain/engageText';

const OWNER = {kind: 'item' as const, itemPath: '/Note/2 Areas/Sport'};
const section = {page: 6, distance: 1, title: {text: 'Training plan', detail: ''}};

describe('sectionLineText', () => {
  it('the title, a meeting\'s date, and the 1-based section page on a follow-up page', () => {
    expect(sectionLineText({text: 'Coach call', detail: '24.10.'}, 2, 0)).toBe('Section: Coach call · 24.10.');
    expect(sectionLineText({text: 'Coach call', detail: '24.10.'}, 2, 1)).toBe('Section: Coach call · 24.10. · from p. 3');
    expect(sectionLineText({text: 'Training plan', detail: ''}, 6, 1)).toBe('Section: Training plan · from p. 7');
  });
});

describe('the section in the Engage state', () => {
  const opened = engageFlow(INITIAL_ENGAGE_STATE, {type: 'open', owner: OWNER, current: null, section});
  it('is set on opening with an owner, never without one', () => {
    expect(opened.section).toBe(section);
    expect(engageFlow(INITIAL_ENGAGE_STATE, {type: 'open', owner: null, current: null, section}).section).toBeNull();
  });
  it('stays while working, goes when another owner is chosen', () => {
    expect(engageFlow(opened, {type: 'selectTab', tab: 'plan'}).section).toBe(section);
    expect(engageFlow(opened, {type: 'ownerChosen', owner: {kind: 'item', itemPath: '/x'}}).section).toBeNull();
  });
});
