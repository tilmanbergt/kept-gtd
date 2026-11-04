#!/usr/bin/env node
// Tally of the answers to review findings (docs/dev/history/technical-design-quality-assurance.md
// §8.4, R10): every reply on a merged pull request starts with [fixed], [not applicable] or [noise].
// The claims audit (docs/dev/claims-audit.md) uses it to decide which review guidelines in AGENTS.md
// to sharpen, add or remove. Needs the GitHub CLI `gh`, signed in.
//
//   node scripts/review-tally.mjs --since v0.26.0     PRs merged since that tag's date
//   node scripts/review-tally.mjs --since 2026-11-01  PRs merged since that date

import {execFileSync} from 'node:child_process';
import {countTags, parseSince, renderTally} from './lib/reviewTally.mjs';

const REPO = 'tilmanbergt/kept-gtd';

function gh(args) {
  return execFileSync('gh', args, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit']});
}

function git(args) {
  return execFileSync('git', args, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim();
}

const i = process.argv.indexOf('--since');
const since = parseSince(i > 0 ? process.argv[i + 1] : undefined, tag => git(['log', '-1', '--format=%cs', tag]));

const prs = JSON.parse(gh(['pr', 'list', '--repo', REPO, '--state', 'merged', '--limit', '200', '--search', `merged:>=${since}`, '--json', 'number,title,url']));
const replies = [];
for (const pr of prs) {
  const inline = JSON.parse(gh(['api', '--paginate', `repos/${REPO}/pulls/${pr.number}/comments`]));
  const issue = JSON.parse(gh(['api', '--paginate', `repos/${REPO}/issues/${pr.number}/comments`]));
  for (const c of [...inline, ...issue]) replies.push({pr: pr.number, url: c.html_url, body: c.body ?? ''});
}
console.log(renderTally(countTags(replies), {since, prs: prs.length}));
