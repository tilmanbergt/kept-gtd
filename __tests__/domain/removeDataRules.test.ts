// docs/dev/history/technical-design-remove-data.md §2-§3: defaults, the rules between the rows,
// the order of the removal and its texts.
import {
  countText,
  initialChoices,
  listedKinds,
  outcomeText,
  planRemoval,
  RemovalCounts,
  RemovalInventory,
  removalQuestion,
  rowHint,
  saveProfileOffered,
  toggleChoice,
} from '../../src/domain/dataRemoval';

const counts = (patch: Partial<RemovalCounts> = {}): RemovalCounts => ({
  settings: 1,
  secrets: 2,
  caches: 3,
  privateData: 4,
  logs: 5,
  demo: 6,
  legacy: 0,
  saveCopies: 0,
  dataFiles: 8,
  profiles: 2,
  ...patch,
});
const inventory = (patch: Partial<RemovalInventory> = {}, c: Partial<RemovalCounts> = {}): RemovalInventory => ({counts: counts(c), openMarks: 0, demoProfileActive: false, ...patch});

describe('defaults (R3)', () => {
  it("checks Kept's own data and leaves profiles and data files unchecked", () => {
    expect(initialChoices(inventory())).toEqual({
      settings: true,
      secrets: true,
      caches: true,
      privateData: true,
      logs: true,
      demo: true,
      legacy: false,
      saveCopies: false,
      dataFiles: false,
      profiles: false,
    });
  });
  it('lists the old gtdpara folders and save copies only when there are some', () => {
    expect(listedKinds(inventory()).map(k => k.kind)).not.toContain('legacy');
    expect(listedKinds(inventory({}, {legacy: 3, saveCopies: 1})).map(k => k.kind)).toEqual(expect.arrayContaining(['legacy', 'saveCopies']));
    expect(initialChoices(inventory({}, {legacy: 3})).legacy).toBe(true);
  });
  it('an empty kind stays unchecked and says nothing here', () => {
    const inv = inventory({}, {logs: 0});
    expect(initialChoices(inv).logs).toBe(false);
    expect(toggleChoice(initialChoices(inv), 'logs', inv).logs).toBe(false);
    expect(rowHint('logs', initialChoices(inv), inv)).toBe('nothing here');
  });
});

describe('rules between rows', () => {
  it('checking the settings checks the secrets and caches again; they can be unchecked after', () => {
    const inv = inventory();
    let c = {...initialChoices(inv), settings: false, secrets: false, caches: false};
    c = toggleChoice(c, 'settings', inv);
    expect([c.settings, c.secrets, c.caches]).toEqual([true, true, true]);
    c = toggleChoice(c, 'secrets', inv);
    expect([c.settings, c.secrets]).toEqual([true, false]);
  });
  it('with the demo profile active, the demo space goes only together with the settings', () => {
    const inv = inventory({demoProfileActive: true});
    let c = initialChoices(inv);
    expect(c.demo).toBe(true);
    c = toggleChoice(c, 'settings', inv);
    expect(c.demo).toBe(false);
    expect(toggleChoice(c, 'demo', inv).demo).toBe(false);
    expect(rowHint('demo', c, inv)).toMatch(/only together with the settings/);
  });
  it('offers Save the active profile first only while settings go and profiles stay', () => {
    const c = initialChoices(inventory());
    expect(saveProfileOffered(c)).toBe(true);
    expect(saveProfileOffered({...c, profiles: true})).toBe(false);
    expect(saveProfileOffered({...c, settings: false})).toBe(false);
  });
  it('warns about open marks and about the data files', () => {
    const inv = inventory({openMarks: 2});
    const c = {...initialChoices(inv), dataFiles: true};
    expect(rowHint('privateData', c, inv)).toBe('2 open marks lose their picture and handwriting - process them first.');
    expect(rowHint('dataFiles', c, inv)).toMatch(/^Your todos, meetings and agreements are in these files\. Copy them first/);
    expect(rowHint('dataFiles', {...c, settings: false}, inv)).toMatch(/Kept writes new empty ones on its next start/);
  });
});

describe('order and texts (R5, R6)', () => {
  it('saves the profile first, removes files next and the store last', () => {
    const c = {...initialChoices(inventory()), dataFiles: true};
    expect(planRemoval(c, true)).toEqual(['saveProfile', 'demo', 'logs', 'dataFiles', 'privateData', 'caches', 'secrets', 'settings']);
    expect(planRemoval(c, false)[0]).toBe('demo');
  });
  it('the question names the data files first', () => {
    const c = initialChoices(inventory());
    expect(removalQuestion(c)).toBe("Remove 6 kinds of data? This can't be undone.");
    expect(removalQuestion({...c, dataFiles: true})).toBe("Remove your data files (project.txt, area.txt, Inbox.txt) and 6 more kinds of data? This can't be undone.");
  });
  it('result lines and counts', () => {
    expect(outcomeText({step: 'logs', done: 5, total: 5})).toBe('Debug and performance logs: removed');
    expect(outcomeText({step: 'logs', done: 2, total: 5, error: 'disk busy'})).toBe('Debug and performance logs: partly removed (2 of 5) - disk busy');
    expect(outcomeText({step: 'settings', done: 0, total: 1, error: 'no store'})).toBe('Settings: failed - no store');
    expect(countText('dataFiles', 1)).toBe('1 file');
    expect(countText('caches', 3)).toBe('3 entries');
  });
});

describe('a skipped settings step', () => {
  it('says why the settings stay', () => {
    expect(outcomeText({step: 'settings', done: 0, total: 1, skipped: true})).toBe('Settings: kept, because something above failed - run Remove again to finish');
  });
});
