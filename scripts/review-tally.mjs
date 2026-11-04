#!/usr/bin/env node
// Tally of the answers to review findings (docs/dev/history/technical-design-quality-assurance.md
// §8.4, R10): every reply on a merged pull request starts with [fixed], [not applicable] or [noise].
// The promises audit (docs/dev/promises-audit.md) uses it to decide which review guidelines in AGENTS.md
// to sharpen, add or remove. Needs the GitHub CLI `gh`, signed in.
//
//   node scripts/review-tally.mjs --since v0.26.0     PRs merged since that tag's date
//   node scripts/review-tally.mjs --since 2026-11-01  PRs merged since that date

import {execFileSync} from 'node:child_process';
import {countTags, parseJsonLines, parseSince, renderTally} from './lib/reviewTally.mjs';

const REPO = 'tilmanbergt/kept-gtd';

function gh(args) {
  return execFileSync('gh', args, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit']});
}

function git(args) {
  return execFileSync('git', args, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim();
}

const i = process.argv.indexOf('--since');
const since = parseSince(i > 0 ? process.argv[i + 1] : undefined, tag => git(['log', '-1', '--format=%cs', tag]));

// REST only (`gh api`), so it also runs where GraphQL isn't available. --paginate prints one JSON array
// per page; `--jq '.[] | …'` turns every page into one object per line.
const list = (endpoint, fields) => parseJsonLines(gh(['api', '--paginate', endpoint, '--jq', `.[] | ${fields}`]));
const prs = list(`repos/${REPO}/pulls?state=closed&per_page=100`, '{number, merged_at}').filter(pr => pr.merged_at && pr.merged_at.slice(0, 10) >= since);
const replies = [];
for (const pr of prs) {
  const comments = endpoint => list(endpoint, '{html_url, body}');
  const inline = comments(`repos/${REPO}/pulls/${pr.number}/comments`);
  const issue = comments(`repos/${REPO}/issues/${pr.number}/comments`);
  for (const c of [...inline, ...issue]) replies.push({pr: pr.number, url: c.html_url, body: c.body ?? ''});
}
console.log(renderTally(countTags(replies), {since, prs: prs.length}));
