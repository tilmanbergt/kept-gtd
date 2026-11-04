// The claims register docs/dev/claims.md (docs/dev/history/technical-design-quality-assurance.md §7):
// reading it, checking it, and its report section. Pure: files and sections come in through
// functions, so scripts/test-claims.mjs can test it.

export const KINDS = ['promise', 'goal'];
export const BACKINGS = ['enforced', 'tested', 'reviewed', 'none'];
export const FIELDS = ['Kind', 'Stated', 'Backing', 'Evidence', 'Re-checked'];

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
    const f = current && /^- ([A-Za-z-]+): (.*)$/.exec(text);
    if (f) current.fields[f[1]] = f[2].trim();
  });
  return claims;
}

/** Text without bold, italic and code marks, so a quoted step matches `**PRIVACY.md** still true`. */
const plain = text => text.replace(/[*`]/g, '').replace(/\s+/g, ' ');

/** The evidence items of a claim, split at `; `. */
export const evidenceOf = claim => (claim.fields.Evidence ?? '').split(';').map(s => s.trim()).filter(Boolean);

/**
 * Everything wrong with the register, as lines (§7.2): a missing field, an unknown kind or backing,
 * a duplicate id, an evidence path that doesn't exist (a file; `file#anchor` with a heading of that
 * markdown file; `DEVELOPMENT-POLICY §n` / `RELEASING §n`, whose section must exist and contain the
 * quoted step), and `enforced` or `tested` without a file as evidence.
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
    if (c.fields.Backing && !BACKINGS.includes(c.fields.Backing)) out.push(`${where}: backing "${c.fields.Backing}" is not one of ${BACKINGS.join(', ')}`);
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
    if ((c.fields.Backing === 'enforced' || c.fields.Backing === 'tested') && files === 0) {
      out.push(`${where}: ${c.fields.Backing} needs at least one file as evidence`);
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

/** The report section "Claims" (§7.3): counts per backing and per group, then the gap list. */
export function renderClaims(claims) {
  const count = list => BACKINGS.map(b => list.filter(c => c.fields.Backing === b).length);
  const lines = ['## Claims', '', 'The claims register `docs/dev/claims.md` by backing. Report only; what to do about a gap lives in the backlog.', ''];
  lines.push(`| Group | ${BACKINGS.join(' | ')} | All |`, `|---|${BACKINGS.map(() => '---:').join('|')}|---:|`);
  const groups = [...new Set(claims.map(c => c.group))];
  for (const g of groups) {
    const list = claims.filter(c => c.group === g);
    lines.push(`| ${g} | ${count(list).join(' | ')} | ${list.length} |`);
  }
  lines.push(`| **All** | ${count(claims).join(' | ')} | ${claims.length} |`, '');
  const gaps = claims.filter(c => c.fields.Backing === 'reviewed' || c.fields.Backing === 'none');
  lines.push(`Backed only by review or not at all (${gaps.length}):`, '');
  for (const c of gaps) lines.push(`- ${c.id} (${c.fields.Backing}) ${c.title}`);
  return lines.join('\n') + '\n';
}
