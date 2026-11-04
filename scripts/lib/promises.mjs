// The promises of Kept GTD, docs/dev/promises.md (docs/dev/history/technical-design-claims-assessment.md
// §4): reading it, checking its format and evidence, and its section of the quality report. Pure: files
// and sections come in through functions, so scripts/test-promises.mjs can test it.
//
// The register has headlines (`## 1. Your promises, kept`), each with a vision line in italics, its
// ratings as `- Field: value` lines, a table of promises, a `**Rules out:**` line and an `Evidence:` list
// (`- 1.1: path; path`).

/** What can keep a promise true, joined with ` + ` in a row; `nothing` only alone. */
export const KEEPERS = ['check', 'test', 'checklist', 'nothing'];
export const HEADLINE_FIELDS = ['Fulfilled', 'Confidence', 'Assessed', 'Stated'];

/** A checklist step as evidence: `DEVELOPMENT-POLICY §8 "UI rules kept"` or `RELEASING §6`. */
const STEP = /^(DEVELOPMENT-POLICY|RELEASING) §(\d+)(?: "([^"]+)")?$/;

/** Text without bold, italic and code marks, so a quoted step matches `**PRIVACY.md** still true`. */
const plain = text => text.replace(/[*`]/g, '').replace(/\s+/g, ' ');

/** `4 - phrase` → {score: 4, why: 'phrase'}; null when malformed. */
export function scoreWithWhy(value) {
  const m = /^([1-5]) - (\S.*)$/.exec(value ?? '');
  return m ? {score: Number(m[1]), why: m[2]} : null;
}

/** A score 1-5 from its text, or null. */
export const score = value => (/^[1-5]$/.test(String(value ?? '').trim()) ? Number(String(value).trim()) : null);

/** The keepers of a row's "Kept true by" cell: `test + checklist` → ['test', 'checklist']. */
export const keepersOf = cell => cell.split('+').map(s => s.trim()).filter(Boolean);

/**
 * The register: [{n, title, line, vision, fields: {Fulfilled, …}, rulesOut, rows: [{id, promise,
 * fulfilled, confidence, keptBy, why, line, evidence: [items] | undefined}]}]. Other `## ` sections
 * (how to read it, the scales) are skipped.
 */
export function parsePromises(markdown) {
  const headlines = [];
  let current = null;
  let inEvidence = false;
  markdown.replace(/\r\n/g, '\n').split('\n').forEach((text, i) => {
    const line = i + 1;
    const h = /^## (\d+)\. (.+)$/.exec(text);
    if (h) {
      current = {n: Number(h[1]), title: h[2].trim(), line, vision: null, fields: {}, rulesOut: null, rows: []};
      headlines.push(current);
      inEvidence = false;
      return;
    }
    if (/^## /.test(text)) {
      current = null;
      return;
    }
    if (!current) return;
    if (/^Evidence:\s*$/.test(text)) {
      inEvidence = true;
      return;
    }
    if (inEvidence) {
      const e = /^- (\d+\.\d+): (.*)$/.exec(text);
      if (e) {
        const row = current.rows.find(r => r.id === e[1]);
        const items = e[2].trim() === '-' ? [] : e[2].split(';').map(s => s.trim()).filter(Boolean);
        if (row) row.evidence = items;
        else current.rows.push({id: e[1], orphanEvidence: true, line, evidence: items});
      }
      return;
    }
    // The vision: the first paragraph in italics, possibly wrapped over several lines.
    if (current.visionParts) {
      current.visionParts.push(text.trim());
      if (/\*$/.test(text.trim())) {
        current.vision = current.visionParts.join(' ').replace(/^\*|\*$/g, '');
        delete current.visionParts;
      }
      return;
    }
    if (!current.vision && /^\*[^*]/.test(text.trim())) {
      if (/[^*]\*$/.test(text.trim())) current.vision = text.trim().replace(/^\*|\*$/g, '');
      else current.visionParts = [text.trim()];
      return;
    }
    const f = /^- ([A-Za-z]+): (.*)$/.exec(text);
    if (f && !current.rows.length) {
      current.fields[f[1]] = f[2].trim();
      return;
    }
    const r = /^\|(.*)\|\s*$/.exec(text);
    if (r) {
      const cells = r[1].split('|').map(c => c.trim());
      if (cells.length === 6 && /^\d+\.\d+$/.test(cells[0])) {
        const [id, promise, fulfilled, confidence, kept, why] = cells;
        current.rows.push({id, promise, fulfilled, confidence, keptBy: keepersOf(kept), why, line});
      }
      return;
    }
    const ro = /^\*\*Rules out:\*\* (.+)$/.exec(text);
    if (ro) current.rulesOut = ro[1].trim();
  });
  return headlines;
}

/**
 * Everything wrong with the register, as lines. A headline needs its vision line, its fields (Fulfilled
 * `n - why`, Confidence 1-5, Assessed x.y.z, Stated), a Rules out line and at least one promise. A
 * promise needs an id `<headline>.<n>` used once, Fulfilled and Confidence 1-5, keepers from KEEPERS
 * (`nothing` alone), a why, and an evidence line whose items exist: a file, `file#heading`, or
 * `DEVELOPMENT-POLICY §n` / `RELEASING §n` with its quoted step. `check` or `test` need a file as
 * evidence, `checklist` a checklist step. The scores are never judged: a low one is not a problem.
 *   exists(path), anchorsOf(path): files of the repository and the heading slugs of a markdown file
 *   sections: {'DEVELOPMENT-POLICY': {n: text}, RELEASING: {n: text}}
 */
export function checkPromises(headlines, {exists, anchorsOf, sections}) {
  const out = [];
  const ids = new Map();
  const seenHeadlines = new Set();
  for (const h of headlines) {
    const where = `promises.md:${h.line} headline ${h.n}`;
    if (seenHeadlines.has(h.n)) out.push(`${where}: duplicate headline number`);
    seenHeadlines.add(h.n);
    if (!h.vision) out.push(`${where}: missing its vision line in italics`);
    for (const f of HEADLINE_FIELDS) if (!h.fields[f]) out.push(`${where}: missing "- ${f}:"`);
    if (h.fields.Fulfilled && !scoreWithWhy(h.fields.Fulfilled)) out.push(`${where}: Fulfilled is "<1-5> - <why>", not "${h.fields.Fulfilled}"`);
    if (h.fields.Confidence && score(h.fields.Confidence) === null) out.push(`${where}: Confidence is 1-5, not "${h.fields.Confidence}"`);
    if (h.fields.Assessed && !/^\d+\.\d+\.\d+$/.test(h.fields.Assessed)) out.push(`${where}: Assessed is a version x.y.z, not "${h.fields.Assessed}"`);
    if (!h.rulesOut) out.push(`${where}: missing its "**Rules out:**" line`);
    if (!h.rows.some(r => !r.orphanEvidence)) out.push(`${where}: has no promises`);
    for (const r of h.rows) {
      const at = `promises.md:${r.line} ${r.id}`;
      if (r.orphanEvidence) {
        out.push(`${at}: evidence for a promise that isn't in the table`);
        continue;
      }
      if (!r.id.startsWith(`${h.n}.`)) out.push(`${at}: the id belongs to headline ${r.id.split('.')[0]}, not ${h.n}`);
      if (ids.has(r.id)) out.push(`${at}: duplicate id (also line ${ids.get(r.id)})`);
      ids.set(r.id, r.line);
      if (score(r.fulfilled) === null) out.push(`${at}: Fulfilled is 1-5, not "${r.fulfilled}"`);
      if (score(r.confidence) === null) out.push(`${at}: Confidence is 1-5, not "${r.confidence}"`);
      if (!r.keptBy.length || r.keptBy.some(k => !KEEPERS.includes(k))) out.push(`${at}: kept true by "${r.keptBy.join(' + ')}" - use ${KEEPERS.join(', ')}, joined with +`);
      else if (r.keptBy.includes('nothing') && r.keptBy.length > 1) out.push(`${at}: "nothing" can't be combined with a keeper`);
      if (!r.why) out.push(`${at}: missing its why`);
      if (r.evidence === undefined) {
        out.push(`${at}: no line in Evidence (write "- ${r.id}: -" when there is none)`);
        continue;
      }
      let files = 0;
      let steps = 0;
      for (const item of r.evidence) {
        const step = STEP.exec(item);
        if (step) {
          steps++;
          const text = sections[step[1]]?.[step[2]];
          if (text === undefined) out.push(`${at}: ${step[1]} has no §${step[2]}`);
          else if (step[3] && !plain(text).includes(step[3])) out.push(`${at}: ${step[1]} §${step[2]} has no step "${step[3]}"`);
          continue;
        }
        const [path, anchor] = item.split('#');
        if (/\s/.test(path)) {
          out.push(`${at}: evidence "${item}" is neither a path nor a checklist step`);
          continue;
        }
        if (!exists(path)) {
          out.push(`${at}: ${path} does not exist`);
          continue;
        }
        files++;
        if (anchor !== undefined && !(anchorsOf(path) ?? []).includes(anchor)) out.push(`${at}: ${path} has no heading #${anchor}`);
      }
      for (const k of r.keptBy) {
        if ((k === 'check' || k === 'test') && files === 0) out.push(`${at}: kept true by ${k} needs a file as evidence`);
        if (k === 'checklist' && steps === 0) out.push(`${at}: kept true by checklist needs a checklist step as evidence`);
      }
    }
  }
  return out;
}

/** The numbered sections of a living document: {n: text of `## n.` up to the next `## `}. */
export function numberedSections(markdown) {
  const out = {};
  let current = null;
  for (const line of markdown.replace(/\r\n/g, '\n').split('\n')) {
    const h = /^## (\d+)\./.exec(line);
    if (h) current = h[1];
    else if (/^## /.test(line)) current = null;
    if (current) out[current] = `${out[current] ?? ''}${line}\n`;
  }
  return out;
}

/**
 * The report section "Promises": the headlines with their ratings; the promises not (fully) kept or
 * unsure (Fulfilled ≤ 3 or Confidence ≤ 2), lowest first; the promises only a checklist or nothing
 * keeps true.
 */
export function renderPromises(headlines) {
  const rows = headlines.flatMap(h => h.rows.filter(r => !r.orphanEvidence));
  const lines = [
    '## Promises',
    '',
    'What Kept GTD promises, `docs/dev/promises.md`: how well each is kept (Fulfilled 1-5), how sure that is',
    '(Confidence 1-5), and what keeps it true. Report only; gaps go to the backlog.',
    '',
    '| Headline | Fulfilled | Confidence | Promises |',
    '|---|:-:|:-:|---:|',
  ];
  for (const h of headlines) {
    const f = scoreWithWhy(h.fields.Fulfilled);
    lines.push(`| ${h.n}. ${h.title} | ${f?.score ?? '?'} | ${score(h.fields.Confidence) ?? '?'} | ${h.rows.filter(r => !r.orphanEvidence).length} |`);
  }
  const weak = rows
    .filter(r => score(r.fulfilled) <= 3 || score(r.confidence) <= 2)
    .sort((a, b) => score(a.fulfilled) - score(b.fulfilled) || score(a.confidence) - score(b.confidence) || a.id.localeCompare(b.id, undefined, {numeric: true}));
  lines.push('', `### Not (fully) kept, or unsure (${weak.length})`, '', 'Fulfilled ≤ 3 or Confidence ≤ 2, lowest first.', '');
  for (const r of weak) lines.push(`- ${r.id} fulfilled ${r.fulfilled}, confidence ${r.confidence}: ${r.promise} - ${r.why}`);
  const loose = rows.filter(r => r.keptBy.every(k => k === 'checklist' || k === 'nothing'));
  lines.push('', `### Kept true only by a checklist, or by nothing (${loose.length})`, '');
  for (const r of loose) lines.push(`- ${r.id} (${r.keptBy.join(' + ')}) ${r.promise}`);
  return lines.join('\n') + '\n';
}
