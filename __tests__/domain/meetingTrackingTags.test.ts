/** State tags out of the edit title (docs/dev/history/technical-design-meeting-reflection.md §2.5, M7). */
import {deriveMeetingFields} from '../../src/domain/markdown';
import {stripTrackingTags, toggleMeetingTracking, withTrackingTagsOf} from '../../src/domain/meetingTracking';
import {setHighlight} from '../../src/domain/monthHighlight';

const stored = (title: string) => ({title, ...deriveMeetingFields(title)});

describe('stripTrackingTags / withTrackingTagsOf', () => {
  it('round trip: the edit title has no state tags, Save puts them back as stored', () => {
    const meeting = stored('Sparring Jordan #sparring/jordan #prepped');
    const shown = stripTrackingTags(meeting.title);
    expect(shown).toBe('Sparring Jordan #sparring/jordan');
    expect(withTrackingTagsOf(shown, meeting)).toBe('Sparring Jordan #sparring/jordan #prepped');
  });

  it('a tick added on disk after the edit was loaded survives Save', () => {
    const loaded = stored('Sparring Jordan #sparring/jordan #prepped');
    const edited = `${stripTrackingTags(loaded.title).replace('Jordan', 'Jordan roles')}`;
    const current = toggleMeetingTracking(loaded, 'review');
    const saved = withTrackingTagsOf(edited, current);
    expect(saved).toBe('Sparring Jordan roles #sparring/jordan #prepped #reviewed');
  });

  it('a tag typed into the title does not override the stored state', () => {
    expect(withTrackingTagsOf('Sparring #reviewed', stored('Sparring'))).toBe('Sparring');
  });

  it('leaves #monthly to the M toggle', () => {
    const meeting = stored('Retro #monthly #reviewed');
    const shown = stripTrackingTags(setHighlight(meeting.title, false));
    expect(shown).toBe('Retro');
    expect(withTrackingTagsOf(setHighlight(shown, true), meeting)).toBe('Retro #monthly #reviewed');
  });
});
