// docs/dev/history/technical-design-writing-help.md §1.2: Rules A, B and P.
import {oneStepOff, pluralMatch, tagSkeleton} from '../../../src/domain/writing/tagSkeleton';

describe('tagSkeleton (Rule A)', () => {
  it.each([
    ['l', '1'],
    ['I', '1'],
    ['i', '1'],
    ['1', '1'],
    ['|', '1'],
    ['!', '1'],
    ['o', '0'],
    ['O', '0'],
    ['0', '0'],
    ['s', '5'],
    ['S', '5'],
    ['5', '5'],
    ['z', '2'],
    ['2', '2'],
    ['g', '9'],
    ['q', '9'],
    ['9', '9'],
    ['b', '6'],
    ['6', '6'],
    ['B', '8'],
    ['8', '8'],
    ['rn', 'm'],
    ['cl', 'd'],
    ['vv', 'w'],
    ['ä', 'a'],
    ['ö', '0'],
    ['ü', 'u'],
    ['ß', '55'],
  ])('folds %s to %s', (from, to) => {
    expect(tagSkeleton(from)).toBe(to);
  });

  it('gives the look-alikes of the trigger the same skeleton', () => {
    expect(tagSkeleton('DaiIy')).toBe(tagSkeleton('daily'));
    expect(tagSkeleton('1o1')).toBe(tagSkeleton('101'));
    expect(tagSkeleton('Iena')).toBe(tagSkeleton('lena'));
    expect(tagSkeleton('rnieke')).toBe(tagSkeleton('mieke'));
    expect(tagSkeleton('cloud')).toBe(tagSkeleton('doud'));
  });

  it('ignores case', () => {
    expect(tagSkeleton('Retro')).toBe(tagSkeleton('retro'));
  });

  it('keeps letters it does not fold', () => {
    expect(tagSkeleton('team-x')).toBe('team-x');
  });

  it('reads B as 8 but b as 6', () => {
    expect(tagSkeleton('Bob')).toBe('806');
  });
});

describe('oneStepOff (Rule B)', () => {
  it('finds one added, missing or changed character', () => {
    expect(oneStepOff('retro', 'retros')).toBe(true);
    expect(oneStepOff('retros', 'retro')).toBe(true);
    expect(oneStepOff('garden', 'gardn')).toBe(true);
    expect(oneStepOff('garden', 'garten')).toBe(true);
  });

  it('finds two swapped neighbours', () => {
    expect(oneStepOff('garden', 'gadren')).toBe(true);
    expect(oneStepOff('garden', 'agrden')).toBe(true);
  });

  it('rejects equal strings and more than one step', () => {
    expect(oneStepOff('garden', 'garden')).toBe(false);
    expect(oneStepOff('garden', 'gorten')).toBe(false);
    expect(oneStepOff('garden', 'gard')).toBe(false);
    expect(oneStepOff('garden', 'gaerdn')).toBe(false);
  });
});

describe('pluralMatch (Rule P)', () => {
  it.each(['s', 'e', 'n', 'en', 'er'])('matches the ending -%s both ways', ending => {
    expect(pluralMatch('retro', `retro${ending}`)).toBe(true);
    expect(pluralMatch(`retro${ending}`, 'retro')).toBe(true);
  });

  it('compares lowercased and rejects other endings', () => {
    expect(pluralMatch('Retros', 'retro')).toBe(true);
    expect(pluralMatch('retro', 'retroxy')).toBe(false);
    expect(pluralMatch('retro', 'retro')).toBe(false);
    expect(pluralMatch('retro', 'metros')).toBe(false);
  });
});
