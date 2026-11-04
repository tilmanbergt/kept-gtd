// The claims register docs/dev/claims.md (docs/dev/history/technical-design-quality-assurance.md §7):
// reading it, checking it, and its report section. Pure: files and sections come in through
// functions, so scripts/test-claims.mjs can test it.

export const KINDS = ['promise', 'goal'];
/** What catches a regression (technical-design-claims-assessment.md §4.1). */
export const KEPT_BY = ['check', 'test', 'checklist', 'nothing'];
export const FIELDS = ['Kind', 'Stated', 'Fulfilled', 'Confidence', 'Assessed', 'Kept true by', 'Evidence', 'Re-checked'];
const KEPT = 'Kept true by';

/** `4 - phrase` → {score: 4, why: 'phrase'}; null when malformed. */
export function fulfilledOf(claim) {
  const m = /^([1-5]) - (\S.*)$/.exec(claim.fields.Fulfilled ?? '');
  return m ? {score: Number(m[1]), why: m[2]} : null;
}

/** The Confidence score 1-5, or null. */
export function confidenceOf(claim) {
  return /^[1-5]$/.test(claim.fields.Confidence ?? '') ? Number(claim.fields.Confidence) : null;
}

/** A checklist step as evidence: `DEVELOPMENT-POLICY §8 "UI rules kept"` or `RELEASING §6`. */
const STEP = /^(DEVELOPMENT-POLICY|RELEASING) §(\d+)(?: "([^"]+)")?$/;

/**
 * The claims of the register: [{id, title, group, line, fields: {Kind, …}}]. `## ` starts a group,
 * `### <id> <claim>` a claim, `- Field: value` lines its fields.
 */
export function parseClaims(markdown) {
  const claims = [];
  let group = null;
  let current = null;
  markdown.replace(/\r\n/g, '\n').split('\n').forEach((text, i) => {
    const g = /^## (.+)$/.exec(text);
    if (g) {
      group = g[1].trim();
      current = null;
      return;
    }
    const c = /^### (\S+) (.+)$/.exec(text);
    if (c) {
      current = {id: c[1], title: c[2].trim(), group, line: i + 1, fields: {}};
      claims.push(current);
      return;
    }
    const f = current && /^- ([A-Za-z][A-Za-z -]*?): (.*)$/.exec(text);
    if (f) current.fields[f[1]] = f[2].trim();
  });
  return claims;
}

/** Text without bold, italic and code marks, so a quoted step matches `**PRIVACY.md** still true`. */
const plain = text => text.replace(/[*`]/g, '').replace(/\s+/g, ' ');

/** The evidence items of a claim, split at `; `. */
export const evidenceOf = claim => (claim.fields.Evidence ?? '').split(';').map(s => s.trim()).filter(Boolean);

/**
 * Everything wrong with the register, as lines (§7.2): a missing field, an unknown kind or kept-true-by value,
 * a duplicate id, an evidence path that doesn't exist (a file; `file#anchor` with a heading of that
 * markdown file; `DEVELOPMENT-POLICY §n` / `RELEASING §n`, whose section must exist and contain the
 * quoted step), malformed scores (Fulfilled, Confidence, Assessed), and `check` or `test` without a
 * file as evidence.
 *   exists(path): whether the repository has the file
 *   anchorsOf(path): the heading slugs of a markdown file
 *   sections: {'DEVELOPMENT-POLICY': {n: text}, RELEASING: {n: text}}
 */
export function checkClaims(claims, {exists, anchorsOf, sections}) {
  const out = [];
  const seen = new Map();
  for (const c of claims) {
    const where = `claims.md:${c.line} ${c.id}`;
    if (!/^[A-Z]\d+$/.test(c.id)) out.push(`${where}: an id is a capital letter and a number`);
    if (seen.has(c.id)) out.push(`${where}: duplicate id (also line ${seen.get(c.id)})`);
    seen.set(c.id, c.line);
    for (const field of FIELDS) if (!c.fields[field]) out.push(`${where}: missing "- ${field}:"`);
    if (c.fields.Kind && !KINDS.includes(c.fields.Kind)) out.push(`${where}: kind "${c.fields.Kind}" is not ${KINDS.join(' or ')}`);
    const kept = c.fields[KEPT];
    if (kept && !KEPT_BY.includes(kept)) out.push(`${where}: kept true by "${kept}" is not one of ${KEPT_BY.join(', ')}`);
    if (c.fields.Fulfilled && !fulfilledOf(c)) out.push(`${where}: Fulfilled is "<1-5> - <why>", not "${c.fields.Fulfilled}"`);
    if (c.fields.Confidence && confidenceOf(c) === null) out.push(`${where}: Confidence is 1-5, not "${c.fields.Confidence}"`);
    if (c.fields.Assessed && !/^\d+\.\d+\.\d+$/.test(c.fields.Assessed)) out.push(`${where}: Assessed is a version x.y.z, not "${c.fields.Assessed}"`);
    let files = 0;
    for (const item of evidenceOf(c)) {
      const step = STEP.exec(item);
      if (step) {
        const text = sections[step[1]]?.[step[2]];
        if (text === undefined) out.push(`${where}: ${step[1]} has no §${step[2]}`);
        else if (step[3] && !plain(text).includes(step[3])) out.push(`${where}: ${step[1]} §${step[2]} has no step "${step[3]}"`);
        continue;
      }
      const [path, anchor] = item.split('#');
      if (/\s/.test(path)) {
        out.push(`${where}: evidence "${item}" is neither a path nor a checklist step`);
        continue;
      }
      if (!exists(path)) {
        out.push(`${where}: ${path} does not exist`);
        continue;
      }
      files++;
      if (anchor !== undefined && !(anchorsOf(path) ?? []).includes(anchor)) out.push(`${where}: ${path} has no heading #${anchor}`);
    }
    if ((kept === 'check' || kept === 'test') && files === 0) out.push(`${where}: kept true by ${kept} needs at least one file as evidence`);
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
 * The report section "Claims" (§7.3; technical-design-claims-assessment.md §4.3): counts per
 * "Kept true by" and group, then the claims not (fully) true or unsure - Fulfilled ≤ 3 or
 * Confidence ≤ 2, lowest first - and the claims only a checklist or nothing keeps true.
 */
export function renderClaims(claims) {
  const count = list => KEPT_BY.map(b => list.filter(c => c.fields[KEPT] === b).length);
  const lines = [
    '## Claims',
    '',
    'The claims register `docs/dev/claims.md`: how true each claim is (Fulfilled 1-5), how sure that is',
    '(Confidence 1-5), and what catches a regression (Kept true by). Report only; gaps go to the backlog.',
    '',
  ];
  lines.push(`| Group | ${KEPT_BY.join(' | ')} | All |`, `|---|${KEPT_BY.map(() => '---:').join('|')}|---:|`);
  for (const g of [...new Set(claims.map(c => c.group))]) {
    const list = claims.filter(c => c.group === g);
    lines.push(`| ${g} | ${count(list).join(' | ')} | ${list.length} |`);
  }
  lines.push(`| **All** | ${count(claims).join(' | ')} | ${claims.length} |`, '');
  const scored = claims.map(c => ({c, f: fulfilledOf(c), k: confidenceOf(c)}));
  const weak = scored
    .filter(x => (x.f && x.f.score <= 3) || (x.k !== null && x.k <= 2))
    .sort((a, b) => (a.f?.score ?? 0) - (b.f?.score ?? 0) || (a.k ?? 0) - (b.k ?? 0) || a.c.id.localeCompare(b.c.id, undefined, {numeric: true}));
  lines.push(`### Not (fully) true, or unsure (${weak.length})`, '', 'Fulfilled ≤ 3 or Confidence ≤ 2, lowest first.', '');
  for (const {c, f, k} of weak) lines.push(`- ${c.id} fulfilled ${f?.score ?? '?'}, confidence ${k ?? '?'}: ${c.title} - ${f?.why ?? ''}`);
  const loose = claims.filter(c => c.fields[KEPT] === 'checklist' || c.fields[KEPT] === 'nothing');
  lines.push('', `### Kept true only by a checklist, or by nothing (${loose.length})`, '');
  for (const c of loose) lines.push(`- ${c.id} (${c.fields[KEPT]}) ${c.title}`);
  return lines.join('\n') + '\n';
}
