// The texts the app can show, read from its TypeScript sources with the TypeScript compiler API
// (docs/dev/history/technical-design-quality-assurance.md §4.1). Pure: the caller passes the
// `typescript` module and the sources, so scripts/test-app-strings.mjs can test it without files.
//
// - StringLiteral, NoSubstitutionTemplateLiteral and JsxText are literals (trimmed, whitespace
//   collapsed);
// - a TemplateExpression is a pattern: its static parts with a gap for each `${…}`; so is a JSX
//   element whose text is mixed with `{…}` expressions.
// Comments are not read (the compiler skips them). Imports and keys are collected too; they only
// add candidates that no help label is likely to equal.

/** Trimmed, inner whitespace (newlines, double spaces) collapsed to one space. */
export const normalize = text => text.replace(/\s+/g, ' ').trim();

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A pattern from the static parts of a template, e.g. ['Save to ', ''] for `Save to ${name}`. */
export function makePattern(parts) {
  const clean = parts.map(p => p.replace(/\s+/g, ' '));
  // Matched against normalized text, so a leading or trailing space of the template is optional.
  const re = new RegExp(`^${clean.map((p, i) => escapeRe(i === 0 ? p.trimStart() : i === clean.length - 1 ? p.trimEnd() : p)).join('.+?')}$`);
  return {text: normalize(clean.join('⟨…⟩')), parts: clean.map(normalize).filter(Boolean), re};
}

/**
 * The strings of `files` ([{path, source}], .ts or .tsx). Returns {literals: Set<string>,
 * patterns: [{text, parts, re}]}; empty literals are left out.
 */
export function collectAppStrings(ts, files) {
  const literals = new Set();
  const patterns = [];
  for (const {path, source} of files) {
    const kind = path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const sf = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, false, kind);
    const visit = node => {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isJsxText(node)) {
        const text = normalize(node.text);
        if (text) literals.add(text);
      } else if (ts.isJsxElement(node) && node.children.some(c => ts.isJsxExpression(c)) && node.children.some(c => ts.isJsxText(c) && c.text.trim())) {
        // `{n} mark{n === 1 ? '' : 's'} to process`: the element's text with a gap per expression.
        const parts = [''];
        for (const c of node.children) {
          if (ts.isJsxText(c)) parts[parts.length - 1] += c.text;
          else if (ts.isJsxExpression(c)) parts.push('');
          else parts[parts.length - 1] += ' ';
        }
        patterns.push(makePattern(parts));
      } else if (ts.isTemplateExpression(node)) {
        const parts = [node.head.text, ...node.templateSpans.map(s => s.literal.text)];
        if (parts.some(p => p.trim())) patterns.push(makePattern(parts));
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return {literals, patterns};
}

/**
 * Whether `text` is something the app shows: a substring of a literal, or a full match of a
 * pattern. `strings` is collectAppStrings' result.
 */
export function isAppText(text, strings) {
  const t = normalize(text);
  if (!t) return false;
  if (strings.literals.has(t)) return true;
  for (const lit of strings.literals) if (lit.includes(t)) return true;
  return strings.patterns.some(p => p.re.test(t));
}

/** Whether `text` is part of what the app shows: isAppText, or a substring of a pattern's static part. */
export function isAppTextPart(text, strings) {
  const t = normalize(text);
  if (!t) return true;
  return isAppText(t, strings) || strings.patterns.some(p => p.parts.some(part => part.includes(t)));
}
