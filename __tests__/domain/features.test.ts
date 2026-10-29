import {featuresOf, migrateExperimentalFlags, modulesOf, shouldShowWhatsNew} from '../../src/domain/features';

const base = {
  experimentalGoogleCalendar: false,
  experimentalGmail: false,
  googleCalendarIcsUrl: '',
  gmailEmail: '',
  lastSeenVersion: '',
  setupAssistant: 'done' as 'pending' | 'done',
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

describe('migrateExperimentalFlags', () => {
  it('fresh install: flags stay off, lastSeenVersion set', () => {
    const out = migrateExperimentalFlags(base, {}, '0.1.0');
    expect(out).toEqual({...base, lastSeenVersion: '0.1.0', setupAssistant: 'pending'});
  });
  it('fresh install with null raw', () => {
    expect(migrateExperimentalFlags(base, null, '0.1.0').lastSeenVersion).toBe('0.1.0');
  });
  it('existing install: configured integrations switched on, notice pending', () => {
    const merged = {...base, googleCalendarIcsUrl: 'https://x/ical/y.ics', gmailEmail: ''};
    const out = migrateExperimentalFlags(merged, {googleCalendarIcsUrl: 'https://x/ical/y.ics'}, '0.1.0');
    expect(out.experimentalGoogleCalendar).toBe(true);
    expect(out.experimentalGmail).toBe(false);
    expect(out.lastSeenVersion).toBe('');
  });
  it('existing install with gmail only', () => {
    const merged = {...base, gmailEmail: 'a@b.c'};
    const out = migrateExperimentalFlags(merged, {gmailEmail: 'a@b.c'}, '0.1.0');
    expect(out.experimentalGmail).toBe(true);
    expect(out.experimentalGoogleCalendar).toBe(false);
  });
  it('existing install: the setup assistant stays done', () => {
    expect(migrateExperimentalFlags(base, {baseRoot: '/storage/emulated/0/Note'}, '0.1.0').setupAssistant).toBe('done');
  });
  it('keys already stored: no-op, same reference', () => {
    const merged = {...base, googleCalendarIcsUrl: 'https://x/ical/y.ics'};
    const raw = {experimentalGoogleCalendar: false, experimentalGmail: false, googleCalendarIcsUrl: 'x'};
    expect(migrateExperimentalFlags(merged, raw, '0.1.0')).toBe(merged);
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
