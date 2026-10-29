// Imports a pure TypeScript module of src/domain from a node script, so a script and the app share
// one implementation (docs/dev/history/technical-design-easy-start.md §2.5: the help link check uses
// src/domain/helpLinks.ts). Each file and its relative imports are transpiled with the project's own
// TypeScript into a temporary folder as .mjs, imported, and the folder is removed again.

import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, relative, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const RELATIVE_IMPORT = /(from\s+|import\s*\(\s*)(['"])(\.{1,2}\/[^'"]+)\2/g;

/** Transpiles `file` and everything it imports relatively into `outRoot`, mirroring paths below `base`. */
function emit(ts, file, base, outRoot, done) {
  if (done.has(file)) return;
  done.add(file);
  const source = readFileSync(file, 'utf8');
  const {outputText} = ts.transpileModule(source, {
    compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020, verbatimModuleSyntax: false},
    fileName: file,
  });
  const deps = [];
  const code = outputText.replace(RELATIVE_IMPORT, (_all, lead, quote, spec) => {
    deps.push(resolve(dirname(file), `${spec}.ts`));
    return `${lead}${quote}${spec}.mjs${quote}`;
  });
  const out = join(outRoot, relative(base, file)).replace(/\.ts$/, '.mjs');
  mkdirSync(dirname(out), {recursive: true});
  writeFileSync(out, code, 'utf8');
  for (const dep of deps) emit(ts, dep, base, outRoot, done);
}

/**
 * The module namespace of the TypeScript file `file` (absolute), with its relative imports.
 * TypeScript is loaded here, not at the top, so the script's other commands run without node_modules
 * (the "next version" workflow).
 */
export async function importTs(file) {
  const ts = (await import('typescript')).default;
  const base = dirname(dirname(file));
  const outRoot = mkdtempSync(join(tmpdir(), 'kept-ts-'));
  try {
    emit(ts, file, base, outRoot, new Set());
    return await import(pathToFileURL(join(outRoot, relative(base, file)).replace(/\.ts$/, '.mjs')).href);
  } finally {
    rmSync(outRoot, {recursive: true, force: true});
  }
}
