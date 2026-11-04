#!/usr/bin/env node
// Help diagrams (docs/dev/history/technical-design-quality-assurance.md §6): the sources in
// docs/user/diagrams/ (Mermaid .mmd, HTML .html) rendered to PNG in docs/user/images/diagrams/, with
// manifest.json recording each source's hash, size in pixels and bytes. The PNGs are committed, so
// GitHub shows them and CI never renders.
//
//   npm run diagrams                        render every diagram whose hash changed, drop orphans
//   node scripts/diagrams.mjs --all         render all of them
//   node scripts/diagrams.mjs --check       exit 1 when a PNG is stale, missing or orphaned, a diagram
//                                           is unused or unknown, or the budget is exceeded (check tiers)
//
// Rendering needs the devDependencies playwright and mermaid and Chromium (`npx playwright install
// chromium` once per machine). The check needs neither.

import {existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, unlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {checkDiagrams, DIAGRAM_WIDTH, diagramHash, diagramOf, imageRefs, staleIds} from './lib/diagrams.mjs';
import {toGrayPng} from './lib/pngGray.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'docs', 'user', 'diagrams');
const OUT = join(ROOT, 'docs', 'user', 'images', 'diagrams');
const MANIFEST = join(OUT, 'manifest.json');
const USER_DOCS = join(ROOT, 'docs', 'user');
const FONTS = join(ROOT, 'docs', 'dev', 'inkhub-poster', 'fonts');
/** Taller than wide by more than this, a diagram can't share a help page with its heading (§6.5). */
const MAX_ASPECT = 1.3;

const read = path => readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
const rel = path => relative(ROOT, path).split('\\').join('/');

/** The diagram sources with their hashes: [{id, kind, path, file, hash}]. */
function sources() {
  if (!existsSync(SRC)) return [];
  const shared = {mmd: read(join(SRC, 'theme.mmd.json')), html: read(join(SRC, 'diagram.css'))};
  return readdirSync(SRC)
    .sort()
    .map(name => ({name, d: diagramOf(name)}))
    .filter(x => x.d)
    .map(({name, d}) => {
      const file = join(SRC, name);
      return {...d, path: rel(file), file, hash: diagramHash({source: read(file), shared: shared[d.kind]})};
    });
}

const readManifest = () => (existsSync(MANIFEST) ? JSON.parse(read(MANIFEST)) : {});

/** The PNGs in docs/user/images/diagrams/: {id: bytes}. */
function pngs() {
  if (!existsSync(OUT)) return {};
  return Object.fromEntries(readdirSync(OUT).filter(f => f.endsWith('.png')).map(f => [f.slice(0, -4), statSync(join(OUT, f)).size]));
}

function helpPages() {
  return readdirSync(USER_DOCS).filter(f => f.endsWith('.md')).map(f => ({id: f.slice(0, -3), markdown: read(join(USER_DOCS, f))}));
}

/** Width and height of a PNG from its IHDR chunk. */
function pngSize(buffer) {
  return {width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20)};
}

/** The page that renders a Mermaid source: mermaid from node_modules, the poster's Archivo, the shared theme. */
function mermaidPage(source) {
  const font = w => pathToFileURL(join(FONTS, `archivo-latin-${w}-normal.woff2`)).href;
  const script = pathToFileURL(join(ROOT, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js')).href;
  return `<!doctype html><html><head><meta charset="utf-8">
<style>
@font-face { font-family: Archivo; font-weight: 500; src: url(${font(500)}); }
@font-face { font-family: Archivo; font-weight: 700; src: url(${font(700)}); }
body { margin: 0; background: #fff; }
#diagram { width: ${DIAGRAM_WIDTH}px; padding: 24px; box-sizing: border-box; background: #fff; filter: grayscale(1); }
#diagram svg { display: block; max-width: none; }
</style>
<script src="${script}"></script></head><body><div id="diagram"></div>
<script id="source" type="text/plain">${source.replace(/</g, '&lt;')}</script></body></html>`;
}

async function renderMermaid(page, d, theme, tmp) {
  const html = join(tmp, `${d.id}.html`);
  writeFileSync(html, mermaidPage(read(d.file)), 'utf8');
  await page.goto(pathToFileURL(html).href);
  await page.evaluate(async ({config, width}) => {
    await document.fonts.load('500 28px Archivo');
    await document.fonts.load('700 28px Archivo');
    const text = document.getElementById('source').textContent.replace(/&lt;/g, '<');
    window.mermaid.initialize(config);
    const {svg} = await window.mermaid.render('d', text);
    const box = document.getElementById('diagram');
    box.innerHTML = svg;
    // Vector scaling to the target width keeps lines sharp; the height follows the viewBox.
    const el = box.querySelector('svg');
    el.setAttribute('width', String(width - 48));
    el.removeAttribute('height');
    el.style.maxWidth = 'none';
  }, {config: theme, width: DIAGRAM_WIDTH});
}

async function renderHtml(page, d) {
  await page.goto(pathToFileURL(d.file).href);
  await page.evaluate(() => document.fonts.ready);
}

async function render(all) {
  const list = sources();
  const manifest = readManifest();
  const todo = all ? list.map(s => s.id) : staleIds(list, manifest);
  mkdirSync(OUT, {recursive: true});
  if (todo.length) {
    const {chromium} = await import('playwright');
    const theme = JSON.parse(read(join(SRC, 'theme.mmd.json')));
    const tmp = mkdtempSync(join(tmpdir(), 'kept-diagrams-'));
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({viewport: {width: DIAGRAM_WIDTH, height: 2400}, deviceScaleFactor: 1});
      for (const id of todo) {
        const d = list.find(s => s.id === id);
        if (d.kind === 'mmd') await renderMermaid(page, d, theme, tmp);
        else await renderHtml(page, d);
        const out = join(OUT, `${id}.png`);
        // Greyscale: what a diagram may contain, in a third of the bytes (lib/pngGray.mjs).
        const buffer = toGrayPng(await page.locator('#diagram').screenshot());
        writeFileSync(out, buffer);
        const {width, height} = pngSize(buffer);
        manifest[id] = {source: d.path, hash: d.hash, width, height, bytes: buffer.length};
        const warn = width !== DIAGRAM_WIDTH ? ` (not ${DIAGRAM_WIDTH} px wide: check #diagram's width)` : height > width * MAX_ASPECT ? ` (taller than 1 : ${MAX_ASPECT}: it won't share a page with its heading)` : '';
        console.log(`diagrams: rendered ${id} - ${width} × ${height} px, ${(buffer.length / 1024).toFixed(1)} KB${warn}`);
      }
    } finally {
      await browser.close();
      rmSync(tmp, {recursive: true, force: true});
    }
  }
  // Drop what no source renders any more.
  const ids = new Set(list.map(s => s.id));
  for (const id of Object.keys(manifest)) if (!ids.has(id)) delete manifest[id];
  for (const id of Object.keys(pngs())) {
    if (!ids.has(id)) {
      unlinkSync(join(OUT, `${id}.png`));
      console.log(`diagrams: removed ${id}.png (no source)`);
    }
  }
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(MANIFEST, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
  console.log(`diagrams: ${todo.length} rendered, ${list.length} in the manifest`);
}

function check() {
  const problems = checkDiagrams({sources: sources(), manifest: readManifest(), pngs: pngs(), refs: imageRefs(helpPages())});
  if (problems.length) {
    console.error(`diagrams: ${problems.length} ${problems.length === 1 ? 'problem' : 'problems'}:\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`diagrams: up to date (${sources().length} diagrams)`);
}

const args = process.argv.slice(2);
if (args.includes('--check')) check();
else await render(args.includes('--all'));
