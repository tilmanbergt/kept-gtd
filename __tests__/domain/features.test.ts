import {featuresOf, modulesOf, prepareFreshInstall, shouldShowWhatsNew} from '../../src/domain/features';

const base = {
  experimentalGoogleCalendar: false,
  experimentalGmail: false,
  googleCalendarIcsUrl: '',
  gmailEmail: '',
  lastSeenVersion: '',
  setupAssistant: 'done' as 'pending' | 'done',
  freshStart: false,
};

describe('featuresOf', () => {
  it('is all off without settings, close-out on', () => {
    expect(featuresOf(null)).toEqual({googleCalendar: false, gmail: false, closeOut: true});
  });
  it('reads the flags', () => {
    expect(featuresOf({...base, experimentalGmail: true})).toEqual({googleCalendar: false, gmail: true, closeOut: true});
  });
  it('reads close-out from the modules map', () => {
    expect(featuresOf({...base, modules: {closeOut: false}}).closeOut).toBe(false);
  });
});

describe('modulesOf', () => {
  it('fills a missing map from the defaults (stored settings from before modules existed)', () => {
    expect(modulesOf({})).toEqual({closeOut: true});
    expect(modulesOf(null)).toEqual({closeOut: true});
  });
  it('fills a partial or malformed map key by key', () => {
    expect(modulesOf({modules: {}})).toEqual({closeOut: true});
    expect(modulesOf({modules: {closeOut: 'no' as unknown as boolean}})).toEqual({closeOut: true});
    expect(modulesOf({modules: {closeOut: false, later: true} as unknown as {closeOut: boolean}})).toEqual({closeOut: false});
  });
});

describe('prepareFreshInstall', () => {
  it('fresh install: flags stay off, lastSeenVersion set, setup assistant pending, fresh-start mark set', () => {
    const out = prepareFreshInstall(base, {}, '0.1.0');
    expect(out).toEqual({...base, lastSeenVersion: '0.1.0', setupAssistant: 'pending', freshStart: true});
  });
  it('fresh install with null raw', () => {
    expect(prepareFreshInstall(base, null, '0.1.0').lastSeenVersion).toBe('0.1.0');
  });
  it('stored settings: no-op, same reference, the setup assistant stays done', () => {
    const merged = {...base, googleCalendarIcsUrl: 'https://x/ical/y.ics'};
    const out = prepareFreshInstall(merged, {googleCalendarIcsUrl: 'https://x/ical/y.ics'}, '0.1.0');
    expect(out).toBe(merged);
    expect(out.setupAssistant).toBe('done');
    expect(out.freshStart).toBe(false);
    expect(out.experimentalGoogleCalendar).toBe(false);
  });
});

describe('shouldShowWhatsNew', () => {
  it('only for release builds with a new version', () => {
    expect(shouldShowWhatsNew('', {version: '0.1.0', release: true})).toBe(true);
    expect(shouldShowWhatsNew('0.1.0', {version: '0.1.0', release: true})).toBe(false);
    expect(shouldShowWhatsNew('0.1.0', {version: '0.2.0', release: true})).toBe(true);
    expect(shouldShowWhatsNew('', {version: '0.1.0', release: false})).toBe(false);
  });
});
