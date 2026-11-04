#!/usr/bin/env node
// The claims register docs/dev/claims.md (docs/dev/history/technical-design-quality-assurance.md §7.2).
//
//   npm run claims                      check it and print the claims report
//   node scripts/claims.mjs --check     exit 1 on a malformed entry or an evidence path that
//                                       doesn't exist (every check tier)

import {existsSync, readFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkClaims, numberedSections, parseClaims, renderClaims} from './lib/claims.mjs';
import {importTs} from './lib/tsModule.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTER = join(ROOT, 'docs', 'dev', 'claims.md');
const read = path => readFileSync(path, 'utf8').replace(/^﻿/, '');

const {pageAnchors} = await importTs(join(ROOT, 'src', 'domain', 'helpLinks.ts'));
const claims = parseClaims(read(REGISTER));
const problems = checkClaims(claims, {
  exists: path => existsSync(join(ROOT, path)),
  anchorsOf: path => (path.endsWith('.md') ? pageAnchors(read(join(ROOT, path))) : null),
  sections: {
    'DEVELOPMENT-POLICY': numberedSections(read(join(ROOT, 'docs', 'dev', 'DEVELOPMENT-POLICY.md'))),
    RELEASING: numberedSections(read(join(ROOT, 'docs', 'dev', 'RELEASING.md'))),
  },
});

if (problems.length) {
  console.error(`claims: ${problems.length} ${problems.length === 1 ? 'problem' : 'problems'} in docs/dev/claims.md:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
if (process.argv.includes('--check')) console.log(`claims: ${claims.length} claims, every evidence path exists`);
else console.log(renderClaims(claims));
