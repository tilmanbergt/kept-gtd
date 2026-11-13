/**
 * A screen's selection (the one row shown as card or edit form) outside React
 * state (docs/dev/history/technical-design-calmer-screens.md §3.1.2): one
 * store per screen instance, read with `useSyncExternalStore`. Only the parts
 * that show the selection subscribe - the Quick Add zone (`useSelection`) and
 * each row for itself (`useSelectedMode`, re-rendering only when that row's
 * own value flips) - so a tap on a row does not re-render the screen or its
 * lists. ui/useEditTarget.ts keeps its API on top of it.
 */
import {useCallback, useSyncExternalStore} from 'react';

/** `card`: the item card in Quick Add's place; `edit`: Quick Add's edit form; `add`: Quick Add in create mode for the selected meeting. */
export type EditMode = 'card' | 'edit' | 'add';

export interface Selection<T> {
  target: T | null;
  mode: EditMode;
}

export interface SelectionStore<T> {
  get: () => Selection<T>;
  set: (next: Selection<T> | ((current: Selection<T>) => Selection<T>)) => void;
  subscribe: (listener: () => void) => () => void;
  /** The key a row compares with (`useSelectedMode`). */
  keyOf: (target: T) => string;
}

/** What a row reads of a store, whatever the screen's target type. */
export interface SelectionReader {
  get: () => Selection<unknown>;
  subscribe: (listener: () => void) => () => void;
  keyOf: (target: never) => string;
}

const NONE: Selection<never> = {target: null, mode: 'edit'};

/**
 * The key of a target: a string as it is, `{type, key}` (ui/useEntryActions.ts)
 * as `type:key`, `{type, index}` (the Current page) as `type:index`.
 */
export function selectionKey(target: unknown): string {
  if (typeof target === 'string') return target;
  if (target && typeof target === 'object') {
    const t = target as {type?: unknown; key?: unknown; index?: unknown};
    if (typeof t.type === 'string' && (typeof t.key === 'string' || typeof t.index === 'number')) return `${t.type}:${String(t.key ?? t.index)}`;
  }
  return JSON.stringify(target);
}

export function createSelectionStore<T>(keyOf: (target: T) => string = selectionKey): SelectionStore<T> {
  let state: Selection<T> = NONE;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set: next => {
      const value = typeof next === 'function' ? next(state) : next;
      if (value === state || (value.mode === state.mode && value.target === state.target)) return;
      state = value;
      for (const listener of [...listeners]) listener();
    },
    subscribe: listener => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    keyOf,
  };
}

const noSubscribe = () => () => undefined;
const noSelection = () => NONE;

/** The selection, for the one part that shows it (the Quick Add zone). `enabled: false` reads nothing and never re-renders. */
export function useSelection<T>(store: SelectionStore<T>, enabled = true): Selection<T> {
  return useSyncExternalStore(enabled ? store.subscribe : noSubscribe, enabled ? store.get : noSelection) as Selection<T>;
}

/** This row's mode while it is the selected one, else null; re-renders only when that value changes. */
export function useSelectedMode(store: SelectionReader | null | undefined, key: string | null | undefined): EditMode | null {
  const subscribe = store ? store.subscribe : noSubscribe;
  const get = useCallback(() => {
    if (!store || key == null) return null;
    const {target, mode} = store.get();
    return target !== null && store.keyOf(target as never) === key ? mode : null;
  }, [store, key]);
  return useSyncExternalStore(subscribe, get);
}

/** Whether this row is the selected one. */
export function useIsSelected(store: SelectionReader | null | undefined, key: string | null | undefined): boolean {
  return useSelectedMode(store, key) !== null;
}

/** What a row needs to show itself selected: the screen's store and the row's key (`selectionKey`). */
export interface RowSelection {
  store: SelectionReader;
  key: string;
}
