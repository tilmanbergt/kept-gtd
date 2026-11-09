// docs/dev/history/technical-design-writing-help.md §1.5, §3.2: learned corrections per profile.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  forgetFix,
  getLearnedFixesSync,
  keepTypoTag,
  keptTypoTags,
  learnedFixList,
  learnFix,
  loadLearnedFixes,
  MAX_LEARNED_FIXES,
} from '../../src/storage/learnedTagFixes';
import {setActiveProfileId} from '../../src/storage/profileKeys';
import {DEFAULT_PROFILE_ID} from '../../src/domain/profiles';

beforeEach(async () => {
  setActiveProfileId(DEFAULT_PROFILE_ID);
  await AsyncStorage.clear();
  setActiveProfileId('reset');
  setActiveProfileId(DEFAULT_PROFILE_ID);
});

describe('learnedTagFixes', () => {
  it('learns a pair, most recent first, and stores it under kept:tagFixes:v1', async () => {
    await learnFix('DaiIy', 'daily');
    await learnFix('Iena', 'lena');
    expect(learnedFixList()).toEqual([
      {from: 'iena', to: 'lena'},
      {from: 'daiiy', to: 'daily'},
    ]);
    expect(getLearnedFixesSync().get('daiiy')).toBe('daily');
    expect(JSON.parse((await AsyncStorage.getItem('kept:tagFixes:v1'))!).fixes).toHaveLength(2);
  });

  it('replaces the pair for the same written tag and forgets it', async () => {
    await learnFix('daiiy', 'daily');
    await learnFix('DAIIY', 'dairy');
    expect(learnedFixList()).toEqual([{from: 'daiiy', to: 'dairy'}]);
    await forgetFix('Daiiy');
    expect(learnedFixList()).toEqual([]);
  });

  it('keeps at most 200 pairs', async () => {
    for (let i = 0; i <= MAX_LEARNED_FIXES; i++) await learnFix(`t${i}`, `x${i}`);
    expect(learnedFixList()).toHaveLength(MAX_LEARNED_FIXES);
    expect(learnedFixList()[0].from).toBe(`t${MAX_LEARNED_FIXES}`);
  });

  it('keeps typo tags as written, once each', async () => {
    await keepTypoTag('Offsite27');
    await keepTypoTag('offsite27');
    expect(Array.from(keptTypoTags())).toEqual(['offsite27']);
  });

  it('is per profile', async () => {
    await learnFix('daiiy', 'daily');
    setActiveProfileId('demo');
    await loadLearnedFixes();
    expect(learnedFixList()).toEqual([]);
    await learnFix('iena', 'lena');
    expect(await AsyncStorage.getItem('kept:tagFixes:v1:demo')).toContain('iena');
    setActiveProfileId(DEFAULT_PROFILE_ID);
    await loadLearnedFixes();
    expect(learnedFixList()).toEqual([{from: 'daiiy', to: 'daily'}]);
  });

  it('starts empty from an unreadable store', async () => {
    await AsyncStorage.setItem('kept:tagFixes:v1', '{not json');
    setActiveProfileId('x');
    setActiveProfileId(DEFAULT_PROFILE_ID);
    await loadLearnedFixes();
    expect(learnedFixList()).toEqual([]);
  });
});
