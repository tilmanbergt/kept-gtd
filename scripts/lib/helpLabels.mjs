// Help labels and quoted messages against the app's strings
// (docs/dev/history/technical-design-quality-assurance.md §4.2, requirements L1-L5). Pure: the
// pages, diagram sources, app strings, demo names and allowlist come in as arguments, so
// scripts/test-help-labels.mjs can test it. Report only: nothing here decides an exit code.

import {isAppText, isAppTextPart, normalize} from './appStrings.mjs';

/** The lines of a page with fenced code blanked and inline code removed, numbered from 1. */
function proseLines(markdown) {
  let inCode = false;
  return markdown.replace(/\r\n/g, '\n').split('\n').map((line, i) => {
    if (/^\s*```/.test(line)) {
      inCode = !inCode;
      return {line: i + 1, text: ''};
    }
    return {line: i + 1, text: inCode ? '' : line.replace(/`[^`]*`/g, '')};
  });
}

/** A label's text without link markup (`[Daily](daily.md)` → `Daily`). */
const stripLinks = text => text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');

/** Every `**…**` label of a page outside code: [{file, line, label}]. */
export function extractLabels(markdown, file) {
  const out = [];
  for (const {line, text} of proseLines(markdown)) {
    for (const m of text.matchAll(/\*\*([^*]+)\*\*/g)) {
      const label = normalize(stripLinks(m[1]));
      if (label) out.push({file, line, label});
    }
  }
  return out;
}

/** Every "…" of three or more characters on a page outside code: [{file, line, label}]. */
export function extractQuotes(markdown, file) {
  const out = [];
  for (const {line, text} of proseLines(markdown)) {
    for (const m of text.matchAll(/"([^"]*)"/g)) {
      const label = normalize(stripLinks(m[1]).replace(/\*\*|\*/g, ''));
      if (label.length >= 3) out.push({file, line, label});
    }
  }
  return out;
}

/**
 * The app labels of a diagram source (§6.4): bold inside a Mermaid markdown string
 * (``A["`**Waiting for**`"]``) or `<b class="label">…</b>` in an HTML diagram.
 */
export function extractDiagramLabels(source, file) {
  const out = [];
  source.replace(/\r\n/g, '\n').split('\n').forEach((text, i) => {
    const html = [...text.matchAll(/<b class="label">([^<]+)<\/b>/g)].map(m => m[1]);
    const mermaid = [...text.matchAll(/`([^`]*)`/g)].flatMap(m => [...m[1].matchAll(/\*\*([^*]+)\*\*/g)].map(b => b[1]));
    for (const raw of [...html, ...mermaid]) {
      const label = normalize(raw.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
      if (label) out.push({file, line: i + 1, label});
    }
  });
  return out;
}

/**
 * The texts to look for for one label: a path (`Settings → Data → Profiles`) is split at ` → `
 * into parts; a trailing ` ›` / `›` or leading `‹ ` is tried with and without. Returns
 * [[variants of part 1], [variants of part 2], …].
 */
export function labelParts(label) {
  return label.split(/\s+→\s+/).map(part => {
    const variants = new Set([part]);
    const bare = part.replace(/\s*›$/, '').replace(/^‹\s*/, '');
    if (bare) variants.add(bare);
    return [...variants];
  });
}

/** Whether every part of the label has a variant the app shows, whole or as a template's static text (`Save to`). */
export function labelMatches(label, strings) {
  return labelParts(label).every(variants => variants.some(v => isAppTextPart(v, strings)));
}

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Whether a quoted message matches: as a label, or with each demo name in it taken as a
 * placeholder - every part between the names is part of an app text. A quote that is only
 * demo names (an example title) matches too.
 */
export function quoteMatches(quote, strings, demoNames) {
  if (labelMatches(quote, strings)) return true;
  const names = [...demoNames].filter(n => n.length >= 2 && quote.includes(n)).sort((a, b) => b.length - a.length);
  if (!names.length) return false;
  const parts = quote.split(new RegExp(names.map(escapeRe).join('|'))).map(p => p.trim()).filter(p => /[A-Za-z]/.test(p));
  return parts.every(p => isAppTextPart(p, strings));
}

/**
 * Demo names from the demo space's files ([{path, content}], domain/demoSpace.ts buildDemoFiles):
 * folder and file names, the titles of its todos and meetings, and the names of person tags
 * (`#marco`, `#wf/lena` → Marco, Lena).
 */
export function demoNamesOf(files) {
  const names = new Set();
  for (const f of files) {
    for (const part of f.path.split('/')) {
      names.add(part.replace(/\.(txt|note|md)$/, ''));
      names.add(part.replace(/^\d+\s+/, ''));
    }
    for (const line of f.content.split('\n')) {
      const item = /^\s*-\s+(?:\[.\]\s+)?(?:\d{4}-\d{2}-\d{2}\s+(?:\d{1,2}:\d{2}(?:-\d{1,2}:\d{2})?\s+)?)?(.+)$/.exec(line);
      if (item) {
        const title = normalize(item[1].replace(/\[[a-z]+::[^\]]*\]/g, '').replace(/#\S+/g, ''));
        if (title.length >= 3) names.add(title);
      }
      for (const tag of line.matchAll(/#(?:[a-z]+\/)?([a-z]+)\b/g)) names.add(tag[1][0].toUpperCase() + tag[1].slice(1));
    }
  }
  names.delete('');
  return names;
}

/**
 * Checks labels against the app strings and the allowlist ({label: reason}).
 * Returns {checked, matched, allowlisted, unmatched: [{file, line, label}], stale: [label]}.
 * `stale`: allowlist entries no label equals any more.
 */
export function checkLabels(labels, strings, allow = {}, match = labelMatches) {
  const out = {checked: labels.length, matched: 0, allowlisted: 0, unmatched: [], stale: []};
  const seen = new Set(labels.map(l => l.label));
  for (const l of labels) {
    if (match(l.label, strings)) out.matched++;
    else if (Object.prototype.hasOwnProperty.call(allow, l.label)) out.allowlisted++;
    else out.unmatched.push(l);
  }
  out.stale = Object.keys(allow).filter(label => !seen.has(label));
  return out;
}

/** The report section "Help labels" (§4.3) for the label and quote results. */
export function renderLabels(labels, quotes) {
  const totals = r => `${r.checked} checked · ${r.matched} matched · ${r.allowlisted} allowlisted · ${r.unmatched.length} unmatched`;
  const lines = ['## Help labels', '', 'Bold labels in `docs/user/*.md` and the diagram sources, looked up in the app\'s strings', '(`scripts/lib/helpLabels.mjs`; allowlist `scripts/help-labels-allow.json`). Report only.', '', totals(labels), ''];
  for (const u of labels.unmatched) lines.push(`- ${u.file}:${u.line} **${u.label}**`);
  if (labels.stale.length) {
    lines.push('', 'Allowlist entries no help page uses any more:', '');
    for (const s of labels.stale) lines.push(`- ${s}`);
  }
  lines.push('', '### Quoted messages', '', 'Quotes of three or more characters, matched with demo names as placeholders. Many quotes are', 'examples or a user\'s own words, so this list is a reading aid, not a count of mistakes.', '', totals(quotes), '');
  for (const u of quotes.unmatched) lines.push(`- ${u.file}:${u.line} "${u.label}"`);
  return lines.join('\n') + '\n';
}
