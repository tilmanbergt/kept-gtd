// Plain-node checks for scripts/lib/diagrams.mjs.  Run: node scripts/test-diagrams.mjs
import assert from 'node:assert/strict';
import {deflateSync} from 'node:zlib';
import {decodePng, encodeGrayPng, toGrayPng} from './lib/pngGray.mjs';
import {checkDiagrams, diagramHash, diagramOf, imageRefs, renderDiagramSummary, staleIds} from './lib/diagrams.mjs';

let n = 0;
const t = (name, fn) => {
  fn();
  n++;
};

t('ids and kinds from file names', () => {
  assert.deepEqual(diagramOf('docs/user/diagrams/todo-states.mmd'), {id: 'todo-states', kind: 'mmd'});
  assert.deepEqual(diagramOf('note-setup-pages.html'), {id: 'note-setup-pages', kind: 'html'});
  assert.equal(diagramOf('theme.mmd.json'), null);
  assert.equal(diagramOf('diagram.css'), null);
});

t('a change to the source, the shared file or the renderer version marks a diagram stale', () => {
  const base = {source: 'flowchart TD\n A --> B', shared: '{"theme":"base"}', rendererVersion: 1};
  const h = diagramHash(base);
  assert.equal(diagramHash({...base, source: 'flowchart TD\r\n A --> B'}), h, 'line endings do not count');
  assert.notEqual(diagramHash({...base, source: 'flowchart TD\n A --> C'}), h);
  assert.notEqual(diagramHash({...base, shared: '{"theme":"dark"}'}), h);
  assert.notEqual(diagramHash({...base, rendererVersion: 2}), h);
  const sources = [{id: 'a', hash: 'h1'}, {id: 'b', hash: 'h2'}, {id: 'c', hash: 'h3'}];
  assert.deepEqual(staleIds(sources, {a: {hash: 'h1'}, b: {hash: 'old'}}), ['b', 'c']);
});

t('image lines of the help pages, outside code', () => {
  const pages = [{id: 'tags', markdown: 'x\n\n![The states](images/diagrams/todo-states.png)\n\n```\n![x](images/diagrams/in-code.png)\n```'}];
  assert.deepEqual(imageRefs(pages), [{page: 'tags.md', line: 3, id: 'todo-states'}]);
});

const ok = {
  sources: [{id: 'todo-states', path: 'docs/user/diagrams/todo-states.mmd', hash: 'h'}],
  manifest: {'todo-states': {source: 'docs/user/diagrams/todo-states.mmd', hash: 'h', width: 960, height: 900, bytes: 100}},
  pngs: {'todo-states': 100},
  refs: [{page: 'tags.md', line: 3, id: 'todo-states'}],
};

t('all well: no findings', () => assert.deepEqual(checkDiagrams(ok), []));

t('stale, missing, wrong size', () => {
  assert.match(checkDiagrams({...ok, manifest: {'todo-states': {...ok.manifest['todo-states'], hash: 'old'}}})[0], /out of date/);
  assert.match(checkDiagrams({...ok, manifest: {}}).join('\n'), /not rendered/);
  assert.match(checkDiagrams({...ok, pngs: {}}).join('\n'), /todo-states\.png is missing/);
  assert.match(checkDiagrams({...ok, pngs: {'todo-states': 99}})[0], /99 bytes, the manifest says 100/);
});

t('orphan PNG and orphan manifest entry', () => {
  const r = checkDiagrams({...ok, pngs: {...ok.pngs, old: 5}, manifest: {...ok.manifest, gone: {hash: 'x', bytes: 1}}});
  assert.ok(r.some(l => /old\.png: no source/.test(l)));
  assert.ok(r.some(l => /manifest\.json: gone has no source/.test(l)));
});

t('unreferenced diagram and unknown image line', () => {
  assert.match(checkDiagrams({...ok, refs: []})[0], /no help page shows it/);
  assert.match(checkDiagrams({...ok, refs: [...ok.refs, {page: 'daily.md', line: 7, id: 'nope'}]})[0], /daily\.md:7: images\/diagrams\/nope\.png is not a rendered diagram/);
});

t('duplicate and bad ids', () => {
  const r = checkDiagrams({...ok, sources: [...ok.sources, {id: 'todo-states', path: 'docs/user/diagrams/todo-states.html', hash: 'h'}]});
  assert.ok(r.some(l => /same id/.test(l)));
  assert.ok(checkDiagrams({...ok, sources: [{...ok.sources[0], id: 'Todo_States'}]}).some(l => /lowercase/.test(l)));
});

t('budget', () => {
  assert.match(checkDiagrams({...ok, budget: 99}).join('\n'), /over the budget/);
  assert.deepEqual(checkDiagrams({...ok, budget: 100}), [], 'exactly the budget is fine');
  const md = renderDiagramSummary(ok.manifest, 1000);
  assert.ok(md.includes('1 diagram, 0.1 KB of the 1.0 KB budget (10 %).'));
  assert.ok(md.includes('- todo-states: 960 × 900 px'));
});

t('PNGs are re-encoded as 8-bit greyscale with the same pixels', () => {
  // A 3 × 2 RGB PNG built by hand: black, white, mid grey / red, green, blue; filter 0 on each row.
  const raw = Buffer.from([0, 0, 0, 0, 255, 255, 255, 128, 128, 128, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255]);
  const rgb = encodeLike(3, 2, 2, raw);
  const gray = decodePng(toGrayPng(rgb));
  assert.deepEqual([gray.width, gray.height, gray.channels], [3, 2, 1]);
  assert.deepEqual([...gray.data], [0, 255, 128, 76, 150, 29]);
  const round = decodePng(encodeGrayPng(4, 3, Buffer.from([0, 10, 20, 30, 30, 20, 10, 0, 255, 255, 0, 0])));
  assert.deepEqual([...round.data], [0, 10, 20, 30, 30, 20, 10, 0, 255, 255, 0, 0], 'every filter decodes back');
  assert.throws(() => decodePng(Buffer.from('not a png')), /not a PNG/);
});

/** A PNG of color type `colorType` from already filtered rows, to feed the decoder. */
function encodeLike(width, height, colorType, filtered) {
  const crcless = (type, data) => {
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, 'ascii');
    data.copy(out, 8);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = colorType;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), crcless('IHDR', ihdr), crcless('IDAT', deflateSync(filtered)), crcless('IEND', Buffer.alloc(0))]);
}

console.log(`diagrams: ${n} groups passed`);
