/// <reference types="node" />
/**
 * The user docs (docs/user/*.md) are read on GitHub and shown in the app's
 * Help, whose renderer (domain/markdownBlocks.ts) supports only a subset of
 * markdown. This keeps the docs inside that subset and the links working.
 */
import * as fs from 'fs';
import * as path from 'path';
import {IMAGE, parseMarkdownBlocks} from '../../src/domain/markdownBlocks';

const DIR = path.join(__dirname, '..', '..', 'docs', 'user');
const pages = fs.readdirSync(DIR).filter(f => f.endsWith('.md')).sort();

/**
 * An image is allowed only as a help diagram line, `![alt](images/diagrams/<id>.png)`, alone on its
 * line between blank lines, with alt text (docs/dev/history/technical-design-quality-assurance.md §6.6).
 * Returns the problem with the line, or null.
 */
export function imageProblem(lines: string[], i: number): string | null {
  const line = lines[i];
  if (!/!\[/.test(line.replace(/`[^`]*`/g, ''))) {return null;}
  if (/!\[\]\(/.test(line)) {return 'image without alt text';}
  if (!IMAGE.test(line)) {return 'image other than a diagram line ![alt](images/diagrams/<id>.png) alone on its line';}
  const blank = (j: number) => j < 0 || j >= lines.length || lines[j].trim() === '';
  if (!blank(i - 1) || !blank(i + 1)) {return 'image without a blank line before and after';}
  return null;
}

function outsideCode(text: string): string[] {
  const out: string[] = [];
  let inCode = false;
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    if (/^\s*```/.test(line)) {inCode = !inCode; out.push(''); continue;}
    out.push(inCode ? '' : line);
  }
  return out;
}

describe('user docs', () => {
  it('has pages and an index', () => {
    expect(pages).toContain('index.md');
    expect(pages.length).toBeGreaterThan(5);
  });

  it.each(pages)('%s uses only the device-safe markdown subset', page => {
    const text = fs.readFileSync(path.join(DIR, page), 'utf8');
    expect((text.match(/^\s*```/gm) ?? []).length % 2).toBe(0); // fences are closed
    const problems: string[] = [];
    const lines = outsideCode(text);
    lines.forEach((line, i) => {
      const where = `${page}:${i + 1}: ${line.trim()}`;
      if (/^\s*\|.*\|\s*$/.test(line)) {problems.push(`table: ${where}`);}
      const image = imageProblem(lines, i);
      if (image) {problems.push(`${image}: ${where}`);}
      if (/<\/?[a-zA-Z][^>]*>/.test(line.replace(/`[^`]*`/g, ''))) {problems.push(`html: ${where}`);}
      const indent = /^(\s*)([-*+]|\d+[.)])\s/.exec(line)?.[1].length ?? 0;
      if (indent >= 4) {problems.push(`list nested deeper than one level: ${where}`);}
      if (/^\s*(\*\*\*|___|---)\s*$/.test(line) && i > 0) {problems.push(`horizontal rule: ${where}`);}
    });
    expect(problems).toEqual([]);
    expect(parseMarkdownBlocks(text).length).toBeGreaterThan(0);
  });

  it('allows an image only as a diagram line with alt text, alone between blank lines', () => {
    const check = (text: string) => text.split('\n').map((_, i, all) => imageProblem(all, i)).filter(Boolean);
    expect(check('Text\n\n![The states of a todo](images/diagrams/todo-states.png)\n\nMore')).toEqual([]);
    expect(check('![](images/diagrams/todo-states.png)')).toEqual(['image without alt text']);
    expect(check('See ![x](images/diagrams/todo-states.png) here')[0]).toMatch(/other than a diagram line/);
    expect(check('![x](images/screen-daily.png)')[0]).toMatch(/other than a diagram line/);
    expect(check('Text\n![x](images/diagrams/todo-states.png)')).toEqual(['image without a blank line before and after']);
    expect(check('Code `![x](y.png)` is fine')).toEqual([]);
  });

  it.each(pages)('%s links only to existing pages', page => {
    const text = fs.readFileSync(path.join(DIR, page), 'utf8');
    const broken: string[] = [];
    for (const m of text.matchAll(/\[[^\]]+\]\(([^)\s]+)\)/g)) {
      const target = m[1];
      if (/^(https?:|mailto:)/.test(target)) {continue;}
      const file = target.split('#')[0];
      if (file && !fs.existsSync(path.resolve(DIR, file))) {broken.push(target);}
    }
    expect(broken).toEqual([]);
  });
});
