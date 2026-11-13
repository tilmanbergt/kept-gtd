/**
 * Drives the real App on the fake device (docs/dev/history/technical-design-quality-hardening.md
 * §4.3): open it, tap what the user sees, type into fields by their placeholder,
 * read the status line. Queries go by visible text, so scenarios use the labels
 * the user sees.
 */
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {act, configure, fireEvent, isHiddenFromAccessibility, render, screen} from '@testing-library/react-native';
import App from '../../App';
import {DEFAULT_SETTINGS, GtdParaSettings} from '../../src/domain/settings';
import {ENGAGE_BUTTON_ID} from '../../src/domain/buttonIds';
import {BUILD_INFO} from '../../src/generated/buildInfo';
import {device} from '../fakeDevice/device';
import {SETTINGS_KEY} from '../../src/domain/storeKeys';

// Kept tabs stay mounted with display: none; queries see only what the user sees.
configure({defaultIncludeHiddenElements: false});

let mounted: ReturnType<typeof render> | null = null;

/**
 * Nothing measures in a test, so every view that asks for its size gets one the
 * size of the A5 X screen's content area once: paged lists then show what fits
 * a tall page. Whether rows really fit is checked on the device.
 */
const LAYOUT = {x: 0, y: 0, width: 1340, height: 1500};
const laidOut = new WeakSet<object>();

function layoutPass(): boolean {
  if (!mounted) return false;
  let fired = false;
  for (const node of screen.UNSAFE_root.findAll(n => typeof n.props.onLayout === 'function', {deep: true})) {
    if (laidOut.has(node.props.onLayout)) continue;
    laidOut.add(node.props.onLayout);
    fireEvent(node, 'layout', {nativeEvent: {layout: LAYOUT}});
    fired = true;
  }
  return fired;
}

/** Lets every pending promise and timer chain run (loading, cache refresh, writes) and lays out new views. */
export async function settle(rounds = 8): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    if (layoutPass()) i = Math.max(0, i - 1);
  }
}

/** Stores the settings the app will load; unset fields are the defaults. The What's-new notice is acknowledged. */
export async function storeSettings(patch: Partial<GtdParaSettings> = {}): Promise<void> {
  await AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({...DEFAULT_SETTINGS, lastSeenVersion: BUILD_INFO.version, ...patch}),
  );
}

/**
 * Opens gtdpara, as from the sidebar button; `fromNote` is the note it was opened from. `fresh`: a
 * first start after installing - no settings are stored beforehand.
 */
export async function openApp(options: {fromNote?: string; settings?: Partial<GtdParaSettings>; fresh?: boolean} = {}): Promise<void> {
  if (!options.fresh && (!(await AsyncStorage.getItem(SETTINGS_KEY)) || options.settings)) await storeSettings(options.settings);
  device().sdk.currentFile = options.fromNote ?? null;
  mounted = render(<App />);
  await settle();
}

/**
 * Opens the Engage panel over page `page` (0-based) of the note `fromNote`, as
 * the host does when the Engage sidebar button is pressed (index.js registers
 * it, App.tsx routes it). A gtdpara that is open is closed first.
 */
export async function openEngage(options: {fromNote: string; page?: number; settings?: Partial<GtdParaSettings>}): Promise<void> {
  await closeApp();
  if (!(await AsyncStorage.getItem(SETTINGS_KEY)) || options.settings) await storeSettings(options.settings);
  device().sdk.currentFile = options.fromNote;
  device().sdk.currentPage = options.page ?? 0;
  mounted = render(<App />);
  act(() => device().sdk.pressButton(ENGAGE_BUTTON_ID));
  await settle();
}

/** Closes gtdpara (unmount); the files stay. */
export async function closeApp(): Promise<void> {
  if (!mounted) return;
  mounted.unmount();
  mounted = null;
  // Let debounced work (e-ink refresh requests) finish while the test environment still exists.
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 400));
  });
}

/** Closes and opens gtdpara again, as the host does. */
export async function reopenApp(options: {fromNote?: string} = {}): Promise<void> {
  await closeApp();
  await openApp(options);
}

/** Every text on screen, in order. */
/** The settings as stored now (what a restart would load). */
export async function storedSettings(): Promise<GtdParaSettings> {
  return {...DEFAULT_SETTINGS, ...JSON.parse((await AsyncStorage.getItem(SETTINGS_KEY)) ?? '{}')};
}

export function texts(): string[] {
  return screen
    .queryAllByText(/./)
    .map(t => [t.props.children].flat(Infinity).filter(c => typeof c === 'string' || typeof c === 'number').join(''));
}

type Rendered = {children: Array<string | Rendered>};

/** The text a rendered element shows, nested texts and the texts of components inside it included. */
function renderedText(node: Rendered): string {
  return node.children.map(c => (typeof c === 'string' ? c : renderedText(c))).join('');
}

/**
 * Every visible text as the user reads it, in screen order: a text with nested parts (a row's title with its
 * labels, a day header with its count) is one entry, where texts() lists only the plain parts.
 */
export function readTexts(): string[] {
  type Node = {type: unknown; parent: Node | null};
  const isText = (n: Node) => n.type === 'Text';
  const nested = (n: Node) => {
    for (let p = n.parent; p; p = p.parent) if (isText(p)) return true;
    return false;
  };
  return screen.UNSAFE_root.findAll(n => isText(n) && !nested(n) && !isHiddenFromAccessibility(n), {deep: true})
    .map(n => renderedText(n as unknown as Rendered))
    .filter(t => t.trim());
}

/** The open card's first row as one line (`Todo · GR › · next`), its refile arrow left out; '' without a card. */
export function cardHeading(): string {
  const found = screen.UNSAFE_root.findAll(n => n.props.testID === 'card-heading', {deep: true});
  const last = found[found.length - 1];
  return last ? renderedText(last as unknown as Rendered) : '';
}

const matchesText = (text: string, label: string | RegExp) => (typeof label === 'string' ? text === label : label.test(text));

/**
 * The part of readTexts() after the first entry matching `from` and before the next one matching `to` (to the
 * end without `to`): what one list, column or panel shows. Throws when `from` is not on screen.
 */
export function textsBetween(from: string | RegExp, to?: string | RegExp): string[] {
  const all = readTexts();
  const start = all.findIndex(t => matchesText(t, from));
  if (start < 0) throw new Error(`no text ${String(from)}; the screen shows: ${describeScreen()}`);
  const rest = all.slice(start + 1);
  const end = to === undefined ? -1 : rest.findIndex(t => matchesText(t, to));
  return end < 0 ? rest : rest.slice(0, end);
}

/** The visible texts joined, for failure messages and while writing a scenario. */
export function describeScreen(): string {
  return texts()
    .filter(t => t.trim())
    .slice(0, 80)
    .join(' | ');
}

/** Taps the `nth` element showing exactly `label` (a button, a row, a tab). */
export async function tap(label: string | RegExp, nth = 0): Promise<void> {
  // A Quick Add kind: the user opens it from its button, closing the open form first
  // (the form has no kind tabs, docs/dev/history/technical-design-quickadd-redesign.md §3.1).
  if (typeof label === 'string' && QUICK_ADD_TABS.has(label) && screen.queryAllByText(label).length <= nth) {
    await openQuickAddKind(`+ ${label}`);
    return;
  }
  // The card has no Edit button: a tap on its title edits (docs/dev/history/technical-design-quickadd-redesign.md §3.6).
  if (label === 'Edit' && screen.queryAllByText(label).length <= nth) {
    const title = screen.queryAllByAccessibilityHint('Edit');
    if (title.length > 0) {
      fireEvent.press(title[title.length - 1]);
      await settle();
      return;
    }
  }
  const found = screen.queryAllByText(label);
  if (found.length <= nth) throw new Error(`nothing to tap with text ${String(label)}; the screen shows: ${describeScreen()}`);
  fireEvent.press(found[nth]);
  await settle();
}

/** Quick Add's kinds; the collapsed box (docs/dev/history/technical-design-calmer-screens.md §3.2) opens one from its `+ <kind>` button. */
const QUICK_ADD_TABS = new Set(['Todo', 'Meeting', 'Agreement', 'Agree', 'Note']);
const QUICK_ADD_FIELD_KIND: Record<string, string> = {
  'New meeting': '+ Meeting',
  'YYYY-MM-DD': '+ Meeting',
  '15 · 15-16.30 · 2d': '+ Meeting',
  'New agreement': '+ Agreement',
  'New note': '+ Note',
};

/**
 * Opens a Quick Add kind from its button; an open form is closed with its ✕ first. The last box
 * on screen is the one in front: an overlay (thread overview) comes after the screen below it.
 */
async function openQuickAddKind(button: string): Promise<void> {
  const close = screen.queryAllByLabelText('Close Quick Add');
  const buttons = screen.queryAllByText(button);
  if (close.length > 0 && (buttons.length === 0 || close.length >= buttons.length)) {
    fireEvent.press(close[close.length - 1]);
    await settle();
  }
  const found = screen.queryAllByText(button);
  if (found.length === 0) return;
  fireEvent.press(found[found.length - 1]);
  await settle();
}

/**
 * A Quick Add field that isn't shown while its box is collapsed: taps the kind button that opens it
 * first (`+ Todo` for the todo fields), as the user would. Does nothing when the field shows or no
 * such button is on screen.
 */
async function openQuickAddFor(placeholder: string, nth: number): Promise<void> {
  if (screen.queryAllByPlaceholderText(placeholder).length > nth) return;
  await openQuickAddKind(QUICK_ADD_FIELD_KIND[placeholder] ?? '+ Todo');
}

/** Opens the Inbox: Daily, then its Inbox count tab (docs/dev/history/technical-design-calmer-screens.md §3.7). */
export async function openInbox(): Promise<void> {
  await tapTab('Daily');
  await tap(/^Inbox \d+$/);
}

/** Opens ⚙ Settings of the Project or Area shown on Current (docs/dev/history/technical-design-calmer-screens.md §3.8). */
export async function openItemSettings(): Promise<void> {
  await tap('⚙ Settings');
}

/** Taps a tab in the tab bar (drawn first on screen; a tab may carry a badge, like "Review ●"). */
export async function tapTab(label: string): Promise<void> {
  await tap(new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`));
}

/**
 * Types into the `nth` field showing `placeholder` (replaces its text, like handwriting into it).
 * An overlay (thread overview) draws over the screen below it, so its fields come after that screen's.
 */
export async function type(placeholder: string, text: string, nth = 0): Promise<void> {
  await openQuickAddFor(placeholder, nth);
  const field = screen.queryAllByPlaceholderText(placeholder)[nth];
  if (!field) throw new Error(`no field "${placeholder}"; the screen shows: ${describeScreen()}`);
  fireEvent.changeText(field, text);
  await settle(2);
}

/** Puts the cursor into (`true`) or takes it out of (`false`) the `nth` field showing `placeholder`. */
export async function focus(placeholder: string, focused = true, nth = 0): Promise<void> {
  await openQuickAddFor(placeholder, nth);
  const field = screen.queryAllByPlaceholderText(placeholder)[nth];
  if (!field) throw new Error(`no field "${placeholder}"; the screen shows: ${describeScreen()}`);
  fireEvent(field, focused ? 'focus' : 'blur');
  await settle(2);
}

/** Taps the `nth` icon-only button announcing `label` to screen readers (the item card's P, Reflect, Refile, ...). */
export async function tapLabel(label: string, nth = 0): Promise<void> {
  const found = screen.queryAllByLabelText(label);
  if (found.length <= nth) throw new Error(`no button labelled "${label}"; the screen shows: ${describeScreen()}`);
  fireEvent.press(found[nth]);
  await settle();
}

/** Taps ✕ beside the main button of the box in front (the last on screen): drops the draft or the edit's changes. */
export async function closeQuickAdd(): Promise<void> {
  const found = screen.queryAllByLabelText('Close Quick Add');
  if (found.length === 0) throw new Error(`no ✕ beside a main button; the screen shows: ${describeScreen()}`);
  fireEvent.press(found[found.length - 1]);
  await settle();
}

/** Whether a button labelled `label` is on screen, and whether it is on (filled) - null when there is none. */
export function labelled(label: string): {on: boolean; disabled: boolean} | null {
  const found = screen.queryAllByLabelText(label)[0];
  if (!found) return null;
  const state = (found.props.accessibilityState ?? {}) as {selected?: boolean; disabled?: boolean};
  return {on: !!state.selected, disabled: !!state.disabled};
}

/** Whether `text` is on screen (exact text, or a pattern). */
export function shows(text: string | RegExp): boolean {
  return screen.queryAllByText(text).length > 0;
}

export function expectShows(text: string | RegExp): void {
  if (!shows(text)) throw new Error(`expected the screen to show ${String(text)}; it shows: ${describeScreen()}`);
}

export function expectNotShows(text: string | RegExp): void {
  if (shows(text)) throw new Error(`expected the screen not to show ${String(text)}`);
}

/** The text in the visible field showing `placeholder`. */
export function fieldValue(placeholder: string): string | undefined {
  return screen.queryAllByPlaceholderText(placeholder)[0]?.props.value;
}

/**
 * Which "☐" belongs to the row showing `rowText`: rows draw their checkbox
 * before their text, so it is the last "☐" before that text on screen.
 */
export function firstCheckboxOf(rowText: string): number {
  const all = texts();
  const at = all.indexOf(rowText);
  if (at < 0) throw new Error(`no row "${rowText}"; the screen shows: ${describeScreen()}`);
  return all.slice(0, at).filter(t => t === '☐').length - 1;
}

/** Runs Settings → Advanced → Run Integrity Check and returns its report (EXPORT/kept-gtd/debug). */
export async function runIntegrityCheck(): Promise<string> {
  await tapTab('Settings');
  await tap('Advanced');
  await tap('Run Integrity Check');
  const reports = device()
    .fs.paths('/storage/emulated/0/EXPORT/kept-gtd/debug')
    .filter(p => /integrity-check-.*\.txt$/.test(p))
    .sort();
  const last = reports.at(-1);
  if (!last) throw new Error(`no Integrity Check report was written; the screen shows: ${describeScreen()}`);
  return device().fs.get(last) ?? '';
}
