// Pure parts of scripts/diagrams.mjs (docs/dev/history/technical-design-quality-assurance.md §6.2-6.3):
// what a diagram's hash covers, which diagrams are stale, and the check of sources, manifest, PNGs,
// help references and the size budget. No file access, so scripts/test-diagrams.mjs can test it.

import {createHash} from 'node:crypto';

/**
 * Bumped when the renderer changes what a PNG looks like (fonts, width, scale, the page around a
 * diagram): every diagram is then stale and `npm run diagrams` renders them all again.
 */
export const RENDERER_VERSION = 1;

/** The rendered width of every diagram in pixels: about the help column on the A5 X (§6.5). */
export const DIAGRAM_WIDTH = 960;

/** The total size of all diagram PNGs, which are bundled into the plugin (§6.3). */
export const BUDGET_BYTES = 400 * 1024;

/** A diagram id is its file name: lowercase letters, digits and `-`, as the help's image line allows. */
export const ID = /^[a-z0-9-]+$/;

/** `docs/user/diagrams/todo-states.mmd` → {id: 'todo-states', kind: 'mmd'}; null for other files. */
export function diagramOf(path) {
  const m = /([^/]+)\.(mmd|html)$/.exec(path);
  return m ? {id: m[1], kind: m[2]} : null;
}

/**
 * The hash of a diagram: sha256 over its source, the shared file of its kind (theme.mmd.json for
 * Mermaid, diagram.css for HTML) and RENDERER_VERSION. A change to any of them makes it stale.
 */
export function diagramHash({source, shared, rendererVersion = RENDERER_VERSION}) {
  const norm = s => s.replace(/\r\n/g, '\n');
  return createHash('sha256').update(`renderer ${rendererVersion}\n`).update(norm(shared)).update('\n--source--\n').update(norm(source)).digest('hex');
}

/** The ids whose manifest entry is missing or has another hash: what `npm run diagrams` renders. */
export function staleIds(sources, manifest) {
  return sources.filter(s => manifest[s.id]?.hash !== s.hash).map(s => s.id);
}

/** The diagram image lines of the help pages ([{id, markdown}]) outside code: [{page, line, id}]. */
export function imageRefs(pages) {
  const refs = [];
  for (const p of pages) {
    let inCode = false;
    p.markdown.replace(/\r\n/g, '\n').split('\n').forEach((text, i) => {
      if (/^\s*```/.test(text)) inCode = !inCode;
      const m = !inCode && /^!\[[^\]]*\]\(images\/diagrams\/([^)]+)\.png\)\s*$/.exec(text.trim());
      if (m) refs.push({page: `${p.id}.md`, line: i + 1, id: m[1]});
    });
  }
  return refs;
}

const kb = bytes => `${(bytes / 1024).toFixed(1)} KB`;

/**
 * Everything wrong with the diagrams, as lines; empty when all is well. Fails on (§6.3):
 *   - a source without a manifest entry, or with another hash (stale), or whose PNG is missing or
 *     has another size than recorded;
 *   - two sources with the same id, or an id the help's image line can't name;
 *   - a PNG or manifest entry without a source (orphan);
 *   - a diagram no help page uses, and an image line naming a diagram not in the manifest;
 *   - the PNGs together over `budget` bytes.
 * sources: [{id, path, hash}]; manifest: {id: {source, hash, width, height, bytes}};
 * pngs: {id: bytes on disk}; refs: imageRefs(pages).
 */
export function checkDiagrams({sources, manifest, pngs, refs, budget = BUDGET_BYTES}) {
  const out = [];
  const byId = new Map();
  for (const s of sources) {
    if (byId.has(s.id)) out.push(`${s.path}: same id as ${byId.get(s.id).path}`);
    byId.set(s.id, s);
    if (!ID.test(s.id)) out.push(`${s.path}: the id "${s.id}" may only have lowercase letters, digits and -`);
    const entry = manifest[s.id];
    if (!entry) out.push(`${s.path}: not rendered (no manifest entry) - run npm run diagrams`);
    else if (entry.hash !== s.hash) out.push(`${s.path}: the PNG is out of date - run npm run diagrams`);
    if (!(s.id in pngs)) out.push(`${s.path}: images/diagrams/${s.id}.png is missing - run npm run diagrams`);
    else if (entry && entry.bytes !== pngs[s.id]) out.push(`images/diagrams/${s.id}.png: ${pngs[s.id]} bytes, the manifest says ${entry.bytes} - run npm run diagrams`);
  }
  for (const id of Object.keys(pngs)) if (!byId.has(id)) out.push(`images/diagrams/${id}.png: no source in docs/user/diagrams/ (orphan)`);
  for (const id of Object.keys(manifest)) if (!byId.has(id)) out.push(`images/diagrams/manifest.json: ${id} has no source (orphan)`);
  const used = new Set(refs.map(r => r.id));
  for (const s of sources) if (!used.has(s.id)) out.push(`${s.path}: no help page shows it - add ![alt](images/diagrams/${s.id}.png) or remove it`);
  for (const r of refs) if (!manifest[r.id]) out.push(`${r.page}:${r.line}: images/diagrams/${r.id}.png is not a rendered diagram`);
  const total = Object.values(pngs).reduce((n, b) => n + b, 0);
  if (total > budget) out.push(`the diagrams take ${kb(total)}, over the budget of ${kb(budget)} - make them simpler or smaller`);
  return out;
}

/** The report section "Diagrams" (§5): count and total size against the budget. */
export function renderDiagramSummary(manifest, budget = BUDGET_BYTES) {
  const entries = Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b));
  const total = entries.reduce((n, [, e]) => n + (e.bytes ?? 0), 0);
  const lines = ['## Diagrams', '', 'Help diagrams (`docs/user/diagrams/`, `npm run diagrams`), bundled into the plugin.', ''];
  lines.push(`${entries.length} ${entries.length === 1 ? 'diagram' : 'diagrams'}, ${kb(total)} of the ${kb(budget)} budget (${Math.round((100 * total) / budget)} %).`, '');
  for (const [id, e] of entries) lines.push(`- ${id}: ${e.width} × ${e.height} px, ${kb(e.bytes ?? 0)}`);
  return lines.join('\n') + '\n';
}
