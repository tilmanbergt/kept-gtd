// Plain-node checks for scripts/lib/reviewTally.mjs.  Run: node scripts/test-review-tally.mjs
import assert from 'node:assert/strict';
import {countTags, parseSince, renderTally, replyTag} from './lib/reviewTally.mjs';

assert.equal(replyTag('[fixed] moved the write into writeDataFile'), 'fixed');
assert.equal(replyTag('  [Not applicable] the design says so'), 'not applicable');
assert.equal(replyTag('[noise] style'), 'noise');
assert.equal(replyTag('Thanks! [fixed]'), null, 'the tag must come first');
assert.equal(replyTag(undefined), null);

const tally = countTags([
  {pr: 7, url: 'u1', body: '[fixed] done'},
  {pr: 7, url: 'u2', body: '[noise] formatting only\nmore'},
  {pr: 8, url: 'u3', body: '[not applicable] historical doc'},
  {pr: 8, url: 'u4', body: 'a review finding without a tag'},
]);
assert.deepEqual(tally.counts, {fixed: 1, 'not applicable': 1, noise: 1});
assert.deepEqual(tally.listed.map(l => [l.tag, l.pr, l.reason]), [['noise', 7, 'formatting only'], ['not applicable', 8, 'historical doc']]);

assert.equal(parseSince('2026-11-01', () => null), '2026-11-01');
assert.equal(parseSince('v0.26.0', tag => (tag === 'v0.26.0' ? '2026-11-20' : null)), '2026-11-20');
assert.throws(() => parseSince(undefined, () => null), /required/);
assert.throws(() => parseSince('v9', () => ''), /no date for tag v9/);

const text = renderTally(tally, {since: '2026-11-01', prs: 2});
assert.ok(text.includes('Review answers on 2 PRs merged since 2026-11-01'));
assert.ok(text.includes('[noise] #7 formatting only  u2'));
console.log('review-tally: 4 groups passed');
