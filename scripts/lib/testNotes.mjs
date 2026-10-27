// Pure parts of the test notes every CI build carries (TESTING.md): commit messages with their
// "Device test:" block, feature areas touched, scenario and changelog differences, and the Markdown.
// No I/O here, so scripts/test-test-notes.mjs can test them.
// Design: docs/dev/history/technical-design-build-test-notes.md

import {areaOf} from './testAreas.mjs';
import {compareVersions, isSemver, parseChangelog} from './versioning.mjs';

const BLOCK_START = /^device test:/i;

/**
 * A commit message split into its subject and its "Device test:" block: from the first line that
 * starts with "Device test:" to the end. Text on that line after the colon belongs to the block
 * ("Device test: none - docs only"). none: the block says there is nothing to test.
 */
export function parseCommitMessage(message) {
  const lines = message.replace(/\r\n/g, '\n').replace(/\s+$/, '').split('\n');
  const subject = (lines[0] ?? '').trim();
  const start = lines.findIndex((l, i) => i > 0 && BLOCK_START.test(l.trim()));
  if (start < 0) return {subject, deviceTest: null, none: false};
  const first = lines[start].trim().replace(BLOCK_START, '').trim();
  const rest = lines.slice(start + 1);
  const deviceTest = [first, ...rest].join('\n').replace(/^\n+/, '').replace(/\s+$/, '');
  return {subject, deviceTest, none: /^none\b/i.test(deviceTest)};
}

/** The help pages (docs/user/<page>) an area names belong to it, like its source and test files. */
function areaOfFile(path, areas) {
  const page = /^docs\/user\/([^/]+\.md)$/.exec(path)?.[1];
  if (page) {
    const area = areas.find(a => (a.help ?? []).includes(page));
    if (area) return area.id;
  }
  return areaOf(path, areas);
}

/**
 * The feature areas the changed files belong to, most files first: [{id, name, count}]. Files of
 * no area (scripts, docs, android, ...) are counted as {id: null, name: 'Other'} at the end.
 */
export function areasTouched(files, areas) {
  const counts = new Map();
  let other = 0;
  for (const f of files) {
    const id = areaOfFile(f, areas);
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    else other++;
  }
  const out = [...counts.entries()]
    .map(([id, count]) => ({id, name: areas.find(a => a.id === id)?.name ?? id, count}))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  if (other) out.push({id: null, name: 'Other', count: other});
  return out;
}

/** docs/dev/test-scenarios.md as a Map: title -> {area, text} (text: the Given/When/Then lines). */
export function parseScenarios(markdown) {
  const map = new Map();
  let area = '';
  let current = null;
  for (const raw of (markdown ?? '').replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    if (line.startsWith('## ')) {
      area = line.slice(3).trim();
      current = null;
    } else if (line.startsWith('### ')) {
      current = {area, lines: []};
      map.set(line.slice(4).trim(), current);
    } else if (current && line.startsWith('- ')) {
      current.lines.push(line);
    }
  }
  return new Map([...map].map(([title, s]) => [title, {area: s.area, text: s.lines.join('\n')}]));
}

/** Scenarios added, changed (same title, other steps) and removed: [{title, area, text}] each. */
export function diffScenarios(before, after) {
  const added = [];
  const changed = [];
  const removed = [];
  for (const [title, s] of after) {
    const old = before.get(title);
    if (!old) added.push({title, ...s});
    else if (old.text !== s.text) changed.push({title, ...s});
  }
  for (const [title, s] of before) if (!after.has(title)) removed.push({title, ...s});
  return {added, changed, removed};
}

/**
 * The lines CHANGELOG [Unreleased] gained, each under the "### Section" it is in:
 * [{section, lines: [...]}]. A line that was already there (anywhere in [Unreleased]) is not new.
 */
export function changelogAdded(beforeText, afterText) {
  const unreleased = text =>
    parseChangelog(text ?? '').find(r => r.version === 'Unreleased')?.markdown.split('\n') ?? [];
  const old = new Set(unreleased(beforeText).map(l => l.trim()).filter(Boolean));
  const out = [];
  let section = '';
  for (const line of unreleased(afterText)) {
    if (line.startsWith('### ')) {
      section = line.slice(4).trim();
      continue;
    }
    if (!line.trim() || old.has(line.trim())) continue;
    let group = out[out.length - 1];
    if (!group || group.section !== section) out.push((group = {section, lines: []}));
    group.lines.push(line);
  }
  return out;
}

/** The newest release tag (vX.Y.Z, never a beta tag) among `tags`, or null. */
export function lastReleaseTag(tags) {
  const versions = tags.map(t => t.trim()).filter(t => t.startsWith('v') && isSemver(t.slice(1)));
  if (!versions.length) return null;
  return versions.sort((a, b) => compareVersions(b.slice(1), a.slice(1)))[0];
}

/**
 * TESTING.md. commits: newest first, [{sha, subject, deviceTest, none}]; newShas: the commits of
 * the newest push (marked NEW); areas: areasTouched(); scenarios: diffScenarios();
 * changelog: changelogAdded(). Empty sections are left out.
 */
export function renderTestNotes({label, branch, baseDesc, commits, newShas = new Set(), areas = [], scenarios, changelog = []}) {
  const out = [];
  const newCount = commits.filter(c => newShas.has(c.sha)).length;
  out.push(`# Kept GTD ${label} - what to test`, '');
  const counts = `${commits.length} commit${commits.length === 1 ? '' : 's'}` + (newCount ? `, ${newCount} new in this push` : '');
  out.push(`Branch ${branch} · ${baseDesc} · ${counts}`, '');

  if (commits.length) {
    out.push('## Device tests (newest first)', '');
    for (const c of commits) {
      const mark = newShas.has(c.sha) ? 'NEW · ' : '';
      const warn = c.deviceTest === null ? '   ⚠ no Device test block' : '';
      out.push(`### ${mark}${c.sha.slice(0, 7)} ${c.subject}${warn}`);
      if (c.deviceTest !== null) out.push('', c.deviceTest);
      out.push('');
    }
  }

  const real = areas.filter(a => a.id);
  if (areas.length) {
    out.push('## Feature areas touched', '');
    const list = areas.map(a => `${a.name} (${a.count} file${a.count === 1 ? '' : 's'})`).join(', ');
    out.push(real.length ? `${list} - recheck these on the device.` : list, '');
  }

  if (changelog.length) {
    out.push('## User-visible changes (new in CHANGELOG [Unreleased])', '');
    for (const g of changelog) {
      if (g.section) out.push(`**${g.section}**`);
      out.push(...g.lines, '');
    }
  }

  if (scenarios && (scenarios.added.length || scenarios.changed.length || scenarios.removed.length)) {
    out.push('## Covered by scenario tests (off-device)', '');
    const block = (kind, list) => {
      for (const s of list) {
        out.push(`**${kind}:** ${s.title} _(${s.area})_`);
        if (s.text && kind !== 'Removed') out.push('', s.text);
        out.push('');
      }
    };
    block('Added', scenarios.added);
    block('Changed', scenarios.changed);
    block('Removed', scenarios.removed);
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

/** The names of the touched feature areas for a beta's release text ("Please look at: ..."). */
export function touchedAreaNames(areas) {
  return areas.filter(a => a.id).map(a => a.name);
}
