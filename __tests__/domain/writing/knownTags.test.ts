// docs/dev/history/technical-design-writing-help.md §1.2, §1.3, §3.1, §7.
import {buildKnownTagIndex, KnownTagSources} from '../../../src/domain/writing/knownTags';
import {checkTags} from '../../../src/domain/writing/tagCheck';
import {completions, unfinishedTagAt} from '../../../src/domain/writing/completion';

function sources(over: Partial<KnownTagSources> = {}): KnownTagSources {
  return {setupTags: [], abbrevs: [], counterparts: [], contextTags: [], reservedTags: [], recentTags: [], usedTags: [], ...over};
}

describe('buildKnownTagIndex', () => {
  it('knows tags of every source, lowercased, and the first segment of nested ones', () => {
    const index = buildKnownTagIndex(
      sources({
        setupTags: ['Daily'],
        abbrevs: [{tag: 'gr', name: 'Garden renovation'}],
        counterparts: ['101/mieke'],
        contextTags: ['errands'],
        reservedTags: ['next'],
        recentTags: ['sparring'],
        usedTags: [{tag: 'retro/alpha', date: '2026-10-01'}],
      }),
    );
    for (const t of ['daily', 'DAILY', 'gr', '101/mieke', '101', 'mieke', 'errands', 'next', 'sparring', 'retro/alpha', 'retro']) {
      expect(index.has(t)).toBe(true);
    }
    expect(index.has('alpha')).toBe(false);
    expect(index.hasChild('101', 'Mieke')).toBe(true);
    expect(index.size).toBe(7);
  });

  it('ranks setup tags, abbreviations, counterparts, recent tags, then the rest alphabetically', () => {
    const index = buildKnownTagIndex(
      sources({
        setupTags: ['da1ly'],
        abbrevs: [{tag: 'dai1y', name: 'X'}],
        counterparts: ['team/dally'],
        recentTags: ['daliy'],
        usedTags: [{tag: 'daiiy', date: ''}, {tag: 'dailly', date: ''}],
      }),
    );
    // The counterpart's leaf `dally` is a plain tag too.
    expect(index.lookup('daily')).toEqual(['da1ly', 'dai1y', 'dally', 'daliy', 'daiiy']);
    expect(index.bestTop('daily')).toBe('da1ly');
  });

  it('suggests through Rule P and Rule B only when Rule A finds nothing', () => {
    const index = buildKnownTagIndex(sources({usedTags: [{tag: 'retro', date: ''}, {tag: 'garden', date: ''}, {tag: 'team', date: ''}]}));
    expect(index.bestTop('retros')).toBe('retro');
    expect(index.bestTop('gardn')).toBe('garden');
    // Rule B needs four characters on both sides.
    expect(index.bestTop('tea')).toBeNull();
    expect(index.bestTop('offsite27')).toBeNull();
  });

  it('checks a subtag against the subtags of its parent', () => {
    const index = buildKnownTagIndex(sources({setupTags: ['101'], counterparts: ['101/mieke', '101/jordan'], usedTags: [{tag: 'retro/mieka', date: ''}]}));
    expect(index.bestChild('101', 'rnieke')).toBe('mieke');
    expect(index.bestChild('101', 'mieka')).toBe('mieke');
    expect(index.bestChild('retro', 'jordan')).toBeNull();
  });

  it('completes by lowercase prefix or skeleton prefix, with the abbreviation name', () => {
    const index = buildKnownTagIndex(
      sources({
        abbrevs: [{tag: 'atr', name: 'Atruvia'}],
        usedTags: [{tag: 'sparring', date: ''}, {tag: 'sparring/lena', date: ''}, {tag: 'spa', date: ''}],
      }),
    );
    expect(index.complete('spa', 3)).toEqual([{tag: 'sparring'}, {tag: 'sparring/lena'}]);
    expect(index.complete('5pa', 3).map(t => t.tag)).toEqual(['spa', 'sparring', 'sparring/lena']);
    expect(index.complete('at', 3)).toEqual([{tag: 'atr', name: 'Atruvia'}]);
    expect(index.complete('sp', 1)).toHaveLength(1);
  });

  it('lists the subtags of a parent most recent first', () => {
    const index = buildKnownTagIndex(
      sources({
        recentTags: ['101/sam'],
        usedTags: [
          {tag: '101/lena', date: '2026-10-01'},
          {tag: '101/jordan', date: '2026-10-20'},
          {tag: '101/sam', date: '2026-01-01'},
        ],
      }),
    );
    expect(index.childrenOf('101')).toEqual(['sam', 'jordan', 'lena']);
    expect(index.childrenOf('none')).toEqual([]);
  });
});

describe('performance (design §7)', () => {
  it('builds an index of 3,000 tags in under 50 ms, checks a burst and completes a tag in under 1 ms', () => {
    // 3,000 word-like tags (a fixed pseudo-random sequence), a third of them nested.
    let seed = 7;
    const letter = () => {
      seed = (seed * 16807) % 2147483647;
      return 'abcdefghijklmnopqrstuvwxyz'[seed % 26];
    };
    const word = (n: number) => Array.from({length: n}, letter).join('');
    const used = Array.from({length: 3000}, (_, i) => ({tag: i % 3 === 0 ? `type${i % 40}/${word(3 + (i % 7))}` : word(3 + (i % 10)), date: '2026-10-01'}));
    // The best of three builds: the bound is for the work, not for Jest's worker load.
    let build = Infinity;
    let index = buildKnownTagIndex(sources());
    for (let run = 0; run < 3; run++) {
      const t0 = performance.now();
      index = buildKnownTagIndex(sources({usedTags: used, recentTags: used.slice(0, 30).map(u => u.tag)}));
      build = Math.min(build, performance.now() - t0);
    }
    const text = `stand-up #DaiIy with #${used[1].tag}x and #type3/persn9 #${used[4].tag.toUpperCase()}`;
    const runs = 50;
    checkTags(text, null, index, new Set(), new Map());
    const t1 = performance.now();
    for (let i = 0; i < runs; i++) checkTags(text, {start: 0, end: text.length}, index, new Set(), new Map());
    const check = (performance.now() - t1) / runs;
    // The measured times, for the release report.
    process.stdout.write(`writing-help perf: index of ${index.size} tags built in ${build.toFixed(1)} ms, burst check ${check.toFixed(3)} ms\n`);
    // Completion runs on every keystroke and cursor report inside a tag: the unfinished tag and the prefix walk.
    const field = `stand-up #${used[2].tag.slice(0, 2)}`;
    unfinishedTagAt(field, field.length);
    const t2 = performance.now();
    for (let i = 0; i < runs; i++) {
      const unfinished = unfinishedTagAt(field, field.length);
      if (unfinished) completions(unfinished.token, index);
    }
    const complete = (performance.now() - t2) / runs;
    process.stdout.write(`writing-help perf: completion ${complete.toFixed(3)} ms\n`);
    expect(build).toBeLessThan(50);
    expect(check).toBeLessThan(1);
    expect(complete).toBeLessThan(1);
  });
});
