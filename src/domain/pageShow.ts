/**
 * "Show on this page" of a project or area (docs/dev/history/technical-design-calmer-screens.md
 * §3.8): one optional frontmatter line, for example
 *
 *     show: loops=always schedule=never open=notebook
 *
 * Parts `threads`, `loops`, `agreements`, `schedule`, `notebook`, `projects`
 * are `auto` (shown when there is something), `always` or `never`; `open`
 * is where the left side opens: `first` (the first tab with content),
 * `notebook`, `files` or `threads`. Todos and Files always show.
 *
 * The line keeps what it doesn't know: every `key=value` stays as written,
 * in its place - an unknown part, or a typo such as `loops=nevr`, which reads
 * as `auto`. Choosing a value replaces that part's token; choosing the
 * default removes it, and with no token left the line goes. A missing line
 * is all defaults. Older versions keep the line as an unknown frontmatter
 * line. Pure.
 */

export type ShowPart = 'threads' | 'loops' | 'agreements' | 'schedule' | 'notebook' | 'projects';
export type ShowValue = 'auto' | 'always' | 'never';
export type OpenRule = 'first' | 'notebook' | 'files' | 'threads';

export const SHOW_PARTS: readonly ShowPart[] = ['threads', 'loops', 'agreements', 'schedule', 'notebook', 'projects'];
export const SHOW_VALUES: readonly ShowValue[] = ['auto', 'always', 'never'];
export const OPEN_RULES: readonly OpenRule[] = ['first', 'notebook', 'files', 'threads'];

/** One `key=value` (a token without `=` has the value ''); `raw` is the token as read, written back unchanged. */
export interface ShowToken {
  key: string;
  value: string;
  raw?: string;
}

export interface PageShow {
  tokens: readonly ShowToken[];
}

export const DEFAULT_PAGE_SHOW: PageShow = {tokens: []};

/** The value of a `show:` line (without `show:`). */
export function parsePageShow(value: string): PageShow {
  const tokens = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((raw): ShowToken => {
      const at = raw.indexOf('=');
      return at < 0 ? {key: raw, value: '', raw} : {key: raw.slice(0, at), value: raw.slice(at + 1), raw};
    });
  return {tokens};
}

/** The line's value, or null when the line is not written (nothing differs from the default). */
export function serializePageShow(show: PageShow): string | null {
  if (show.tokens.length === 0) return null;
  return show.tokens.map(t => t.raw ?? `${t.key}=${t.value}`).join(' ');
}

const tokenOf = (show: PageShow, key: string): ShowToken | undefined => show.tokens.find(t => t.key === key);

/** A part's setting; anything not understood reads as `auto`. */
export function showValue(show: PageShow, part: ShowPart): ShowValue {
  const value = tokenOf(show, part)?.value;
  return (SHOW_VALUES as readonly string[]).includes(value ?? '') ? (value as ShowValue) : 'auto';
}

/** Where the left side opens; anything not understood reads as `first`. */
export function openRule(show: PageShow): OpenRule {
  const value = tokenOf(show, 'open')?.value;
  return (OPEN_RULES as readonly string[]).includes(value ?? '') ? (value as OpenRule) : 'first';
}

function withToken(show: PageShow, key: string, value: string, isDefault: boolean): PageShow {
  const exists = show.tokens.some(t => t.key === key);
  if (isDefault) return {tokens: show.tokens.filter(t => t.key !== key)};
  if (exists) return {tokens: show.tokens.map(t => (t.key === key ? {key, value} : t))};
  return {tokens: [...show.tokens, {key, value}]};
}

/** `part` set to `value`; `auto` removes the part's token. */
export function withShowValue(show: PageShow, part: ShowPart, value: ShowValue): PageShow {
  return withToken(show, part, value, value === 'auto');
}

/** The left side opens on `rule`; `first` removes the token. */
export function withOpenRule(show: PageShow, rule: OpenRule): PageShow {
  return withToken(show, 'open', rule, rule === 'first');
}

/** Whether each part has something to show (from the cache: threads, active loops, own agreements, meetings or F blocks, a home notebook, assigned projects). */
export type ShowPresence = Record<ShowPart, boolean>;

/** Which parts the page shows: `auto` as the presence says, `always`, `never`. */
export function visibleParts(show: PageShow, presence: ShowPresence): Record<ShowPart, boolean> {
  const out = {} as Record<ShowPart, boolean>;
  for (const part of SHOW_PARTS) {
    const value = showValue(show, part);
    out[part] = value === 'always' ? true : value === 'never' ? false : presence[part];
  }
  return out;
}

/** How much each part has (the same sources as ShowPresence). */
export type ShowCounts = Record<ShowPart, number>;

export function presenceOf(counts: ShowCounts): ShowPresence {
  const out = {} as ShowPresence;
  for (const part of SHOW_PARTS) out[part] = counts[part] > 0;
  return out;
}

const COUNT_NOUN: Record<ShowPart, [string, string]> = {
  threads: ['thread', 'threads'],
  loops: ['loop', 'loops'],
  agreements: ['agreement', 'agreements'],
  schedule: ['meeting', 'meetings'],
  notebook: ['notebook', 'notebooks'],
  projects: ['project', 'projects'],
};

/** "Never · 2 loops" for a part set to Never that has content, so nothing is hidden silently; null otherwise. */
export function hiddenHint(show: PageShow, part: ShowPart, count: number): string | null {
  if (showValue(show, part) !== 'never' || count <= 0) return null;
  const [one, many] = COUNT_NOUN[part];
  return `Never · ${count} ${count === 1 ? one : many}`;
}
