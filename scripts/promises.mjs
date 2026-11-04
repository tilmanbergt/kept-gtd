#!/usr/bin/env node
// What Kept GTD promises, docs/dev/promises.md (docs/dev/history/technical-design-claims-assessment.md §4).
//
//   npm run promises                      check it and print its report
//   node scripts/promises.mjs --check     exit 1 on a malformed entry or an evidence path that
//                                         doesn't exist (every check tier)

import {existsSync, readFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkPromises, numberedSections, parsePromises, renderPromises} from './lib/promises.mjs';
import {importTs} from './lib/tsModule.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTER = join(ROOT, 'docs', 'dev', 'promises.md');
const read = path => readFileSync(path, 'utf8').replace(/^﻿/, '');

const {pageAnchors} = await importTs(join(ROOT, 'src', 'domain', 'helpLinks.ts'));
const headlines = parsePromises(read(REGISTER));
const problems = checkPromises(headlines, {
  exists: path => existsSync(join(ROOT, path)),
  anchorsOf: path => (path.endsWith('.md') ? pageAnchors(read(join(ROOT, path))) : null),
  sections: {
    'DEVELOPMENT-POLICY': numberedSections(read(join(ROOT, 'docs', 'dev', 'DEVELOPMENT-POLICY.md'))),
    RELEASING: numberedSections(read(join(ROOT, 'docs', 'dev', 'RELEASING.md'))),
  },
});

if (problems.length) {
  console.error(`promises: ${problems.length} ${problems.length === 1 ? 'problem' : 'problems'} in docs/dev/promises.md:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
const count = headlines.reduce((n, h) => n + h.rows.length, 0);
if (process.argv.includes('--check')) console.log(`promises: ${headlines.length} headlines, ${count} promises, every evidence path exists`);
else console.log(renderPromises(headlines));
