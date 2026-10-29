/// <reference types="node" />
/**
 * Help examples come from the demo space (docs/dev/history/technical-design-easy-start.md §3,
 * DEVELOPMENT-POLICY §6): every nested tag a help page uses, in text or code, must be one the
 * demo space has, or a placeholder listed here with its reason.
 */
import * as fs from 'fs';
import * as path from 'path';
import {buildDemoFiles} from '../src/domain/demoSpace';

const DIR = path.join(__dirname, '..', 'docs', 'user');
const NESTED_TAG = /#[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)+/g;

/** Nested tags that stand for any name, or show a rule, rather than an example from the demo. */
const ALLOWED_PLACEHOLDERS: Record<string, string> = {
  '#wf/name': 'the syntax of waiting for someone',
  '#owe/name': 'the syntax of a promise to someone',
  '#w/f': 'the label Kept shows for a waiting-for todo, not a tag',
  '#tax/2026': 'the example of a nested tag that is not a thread',
  '#sparring/jordan/2026': 'shows that a deeper tag belongs to the same thread',
};

const demoText = buildDemoFiles(new Date(2026, 9, 1))
  .map(f => f.content)
  .join('\n');
const demoTags = new Set(demoText.match(NESTED_TAG) ?? []);

describe('help examples', () => {
  const pages = fs.readdirSync(DIR).filter(f => f.endsWith('.md')).sort();

  it.each(pages)('%s uses only nested tags of the demo space', page => {
    const text = fs.readFileSync(path.join(DIR, page), 'utf8');
    const unknown = [...new Set(text.match(NESTED_TAG) ?? [])].filter(tag => !demoTags.has(tag) && !(tag in ALLOWED_PLACEHOLDERS));
    expect(unknown).toEqual([]);
  });

  it('every placeholder is still used somewhere', () => {
    const all = pages.map(page => fs.readFileSync(path.join(DIR, page), 'utf8')).join('\n');
    expect(Object.keys(ALLOWED_PLACEHOLDERS).filter(tag => !all.includes(tag))).toEqual([]);
  });

  it('a tag the demo lacks fails', () => {
    const sample = 'Tag a meeting `#sparring/jordan` or `#coaching/someone`.';
    expect((sample.match(NESTED_TAG) ?? []).filter(tag => !demoTags.has(tag) && !(tag in ALLOWED_PLACEHOLDERS))).toEqual(['#coaching/someone']);
  });
});
