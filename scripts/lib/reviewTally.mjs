// Pure parts of scripts/review-tally.mjs: the reply tags and the tally
// (docs/dev/history/technical-design-quality-assurance.md §8.4). Tested by scripts/test-review-tally.mjs.

export const TAGS = ['fixed', 'not applicable', 'noise'];

/** The tag a reply starts with (`[fixed] …`), or null. */
export function replyTag(body) {
  const m = /^\s*\[(fixed|not applicable|noise)\]/i.exec(body ?? '');
  return m ? m[1].toLowerCase() : null;
}

/** {counts: {tag: n}, listed: [{tag, pr, url, reason}]} - listed are the not applicable and noise replies. */
export function countTags(replies) {
  const counts = Object.fromEntries(TAGS.map(t => [t, 0]));
  const listed = [];
  for (const r of replies) {
    const tag = replyTag(r.body);
    if (!tag) continue;
    counts[tag]++;
    if (tag !== 'fixed') listed.push({tag, pr: r.pr, url: r.url, reason: r.body.replace(/^\s*\[[^\]]+\]\s*/, '').split('\n')[0].slice(0, 120)});
  }
  return {counts, listed};
}

/** `--since`: a date (YYYY-MM-DD) as it is, a tag through `dateOfTag(tag)`. Throws without one. */
export function parseSince(value, dateOfTag) {
  if (!value) throw new Error('--since <tag|YYYY-MM-DD> is required');
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = dateOfTag(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) throw new Error(`no date for tag ${value}`);
  return date;
}

export function renderTally({counts, listed}, {since, prs}) {
  const lines = [`Review answers on ${prs} PRs merged since ${since}:`, ''];
  for (const t of TAGS) lines.push(`  [${t}] ${counts[t]}`);
  if (listed.length) {
    lines.push('', 'Not applicable and noise:');
    for (const l of listed) lines.push(`  [${l.tag}] #${l.pr} ${l.reason}  ${l.url}`);
  }
  return lines.join('\n');
}
