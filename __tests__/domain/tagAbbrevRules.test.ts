// docs/dev/history/technical-design-project-area-abbreviations.md: the abbreviation rules -
// validation, the default for a new name, and resolving a tag to its place.
import {abbrevErrorMessage, generateDefaultAbbrev, resolveAbbrevFileTarget, resolveAbbrevPath, validateAbbrev} from '../../src/domain/abbrev';

const taken = [{value: 'GR', itemName: 'Garden renovation'}];
const items = [
  {kind: 'project' as const, name: 'Garden renovation', path: '/p/garden', abbrev: 'GR', status: 'active' as const},
  {kind: 'area' as const, name: 'Coaching', path: '/a/coaching', abbrev: 'Co', status: 'active' as const},
  {kind: 'project' as const, name: 'Old website', path: '/p/web', abbrev: 'WEB', status: 'done' as const},
];

describe('validateAbbrev', () => {
  it('rejects empty, reserved and taken abbreviations with one reason', () => {
    expect(validateAbbrev('  ', taken)).toEqual({valid: false, reason: {kind: 'empty'}});
    expect(validateAbbrev('next', taken)).toEqual({valid: false, reason: {kind: 'reserved'}});
    expect(validateAbbrev('gr', taken)).toEqual({valid: false, reason: {kind: 'duplicate', usedBy: 'Garden renovation'}});
    expect(validateAbbrev('TO', taken)).toEqual({valid: true});
  });

  it('says what is wrong in one line', () => {
    expect(abbrevErrorMessage({valid: true})).toBe('');
    expect(abbrevErrorMessage(validateAbbrev('', taken))).toBe('Enter an abbreviation.');
    expect(abbrevErrorMessage(validateAbbrev('someday', taken))).toBe('That matches a flow-state tag - pick something else.');
    expect(abbrevErrorMessage(validateAbbrev('GR', taken))).toBe('Already used by "Garden renovation".');
  });
});

describe('generateDefaultAbbrev', () => {
  it('takes the initials of up to three words, or the first three letters of one', () => {
    expect(generateDefaultAbbrev('Team offsite planning', [])).toBe('TOP');
    expect(generateDefaultAbbrev('Team offsite', [])).toBe('TO');
    expect(generateDefaultAbbrev('Coaching', [])).toBe('COA');
    expect(generateDefaultAbbrev('   ', [])).toBe('XX');
  });

  it('widens with the next letters, then numbers, when taken', () => {
    expect(generateDefaultAbbrev('Garden renovation', taken)).toBe('GRE');
    expect(generateDefaultAbbrev('Go', [{value: 'GO', itemName: 'x'}])).toBe('GO2');
  });
});

describe('resolving a tag', () => {
  it('finds the path of an abbreviation in any case', () => {
    expect(resolveAbbrevPath('gr', items)).toBe('/p/garden');
    expect(resolveAbbrevPath(null, items)).toBeNull();
    expect(resolveAbbrevPath('xyz', items)).toBeNull();
  });

  it('files to an active or on-hold place named in the text, never the place itself', () => {
    expect(resolveAbbrevFileTarget('Order soil #GR', items, null)).toEqual({kind: 'project', name: 'Garden renovation', path: '/p/garden', tag: 'gr'});
    expect(resolveAbbrevFileTarget('Order soil #GR', items, '/p/garden')).toBeNull();
    expect(resolveAbbrevFileTarget('Fix the footer #WEB', items, null)).toBeNull();
    expect(resolveAbbrevFileTarget('Nothing tagged', items, null)).toBeNull();
  });
});
