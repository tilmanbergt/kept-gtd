/**
 * Central status slot - state + publishing hooks
 * (docs/dev/history/technical-design-status-slot.md §3/§4).
 *
 * Two contexts: `ApiContext` is stable (publishers never re-render because
 * of other messages), `ListContext` carries the sorted message list and is
 * read only by `StatusFrame`/`StatusSlot`.
 *
 * Publishing is declarative: `useStatus(id, msg | null)` - screens keep
 * their existing `error`/`armTarget` state and only stop rendering it
 * themselves. A message is re-published only when its visible content
 * changes; its callbacks always call the publisher's latest closures (via
 * a ref), so passing fresh inline functions every render is fine.
 *
 * Success and info go by themselves
 * (docs/dev/history/technical-design-quickadd-redesign.md §3.8 F7): a new one
 * replaces the others, and each disappears silently after `STATUS_TIMED_MS`
 * (8 s; 16 s with actions such as Undo), calling its `onDismiss` so the owner
 * clears its state. Errors, warnings, confirms and modals stay until
 * answered. App-wide notices (`scope: 'global'` info: What's new, an update,
 * a download) wait for their answer too.
 */
import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {STATUS_PRIORITY, STATUS_TIMED_MS, STATUS_TIMED_WITH_ACTIONS_MS, StatusMessage} from './types';
import {useScreenActivity} from '../screenActivity';
import {log, logWarn} from '../../utils/log';

/** Success and info go by themselves, except app-wide notices that wait for an answer. */
export function isTimedStatus(msg: StatusMessage): boolean {
  if (msg.kind === 'success') return true;
  return msg.kind === 'info' && msg.scope !== 'global';
}

/** How long a timed message stays: 16 s with actions (Undo), else 8 s. */
export function statusLifetimeMs(msg: StatusMessage): number {
  return (msg.actions?.length ?? 0) > 0 ? STATUS_TIMED_WITH_ACTIONS_MS : STATUS_TIMED_MS;
}

export interface StatusEntry {
  id: string;
  msg: StatusMessage;
  /** Publish order - newest wins within the same priority. */
  seq: number;
}

interface StatusApi {
  show: (id: string, msg: StatusMessage) => void;
  clear: (id: string) => void;
}

const ApiContext = createContext<StatusApi | null>(null);
const ListContext = createContext<StatusEntry[]>([]);

export function StatusProvider({children}: {children: React.ReactNode}): React.JSX.Element {
  const [entries, setEntries] = useState<Map<string, StatusEntry>>(() => new Map());
  const seqRef = useRef(0);
  // Mirrors `entries` for the timers and replacements, which call owners' onDismiss outside a state update.
  const entriesRef = useRef<Map<string, StatusEntry>>(new Map());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const stopTimer = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) clearTimeout(timer);
    timersRef.current.delete(id);
  }, []);

  const remove = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      for (const id of ids) stopTimer(id);
      const next = new Map(entriesRef.current);
      for (const id of ids) next.delete(id);
      entriesRef.current = next;
      setEntries(next);
    },
    [stopTimer],
  );

  const show = useCallback(
    (id: string, msg: StatusMessage) => {
      // Every error the user sees is in the log, so a debug bundle shows it too (DEVELOPMENT-POLICY §5).
      if (msg.kind === 'error') logWarn('Status: error shown', id, msg.text);
      seqRef.current += 1;
      const seq = seqRef.current;
      const timed = isTimedStatus(msg);
      // The newest success or info replaces the others; their owners clear their state.
      const replaced = timed ? [...entriesRef.current.values()].filter(e => e.id !== id && isTimedStatus(e.msg)) : [];
      stopTimer(id);
      const next = new Map(entriesRef.current);
      for (const e of replaced) {
        stopTimer(e.id);
        next.delete(e.id);
      }
      next.set(id, {id, msg, seq});
      entriesRef.current = next;
      setEntries(next);
      for (const e of replaced) e.msg.onDismiss?.();
      if (timed) {
        const timer = setTimeout(() => {
          timersRef.current.delete(id);
          const entry = entriesRef.current.get(id);
          if (!entry || entry.seq !== seq) return;
          log(`Status: status expire kind=${entry.msg.kind}`);
          remove([id]);
          entry.msg.onDismiss?.();
        }, statusLifetimeMs(msg));
        // Under Node (tests) a pending expiry must not keep the process alive; React Native's timers have no unref.
        (timer as unknown as {unref?: () => void}).unref?.();
        timersRef.current.set(id, timer);
      }
    },
    [remove, stopTimer],
  );

  const clear = useCallback(
    (id: string) => {
      if (entriesRef.current.has(id)) remove([id]);
      else stopTimer(id);
    },
    [remove, stopTimer],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  const api = useMemo(() => ({show, clear}), [show, clear]);

  const list = useMemo(
    () =>
      [...entries.values()].sort((a, b) => STATUS_PRIORITY[a.msg.kind] - STATUS_PRIORITY[b.msg.kind] || b.seq - a.seq),
    [entries],
  );

  return (
    <ApiContext.Provider value={api}>
      <ListContext.Provider value={list}>{children}</ListContext.Provider>
    </ApiContext.Provider>
  );
}

/** The sorted message list (most important first). For the slot only. */
export function useStatusList(): StatusEntry[] {
  return useContext(ListContext);
}

/**
 * True while the slot shows something that must be answered or read first: a confirm, a modal
 * or an error (docs/dev/history/technical-design-quickadd-redesign.md §3.8 D3). Quick Add's
 * strips hide meanwhile.
 */
export function useStatusBlocking(): boolean {
  const list = useContext(ListContext);
  return list.some(e => e.msg.kind === 'confirm' || e.msg.kind === 'modal' || e.msg.kind === 'error');
}

/** Imperative escape hatch for one-shot or global messages (e.g. background failures, D13). No-op outside a provider. */
export function useStatusApi(): StatusApi {
  const api = useContext(ApiContext);
  return useMemo(() => api ?? {show: () => {}, clear: () => {}}, [api]);
}

/**
 * Publishes `msg` under `id` while it's non-null; clears it when it turns
 * null, and on unmount (unless `scope: 'global'`). `id` must be unique per
 * publisher instance - use `'<screen>.<purpose>'`, plus an instance suffix
 * for components that can be mounted more than once.
 *
 * Kept tabs (docs/dev/history/technical-design-keep-tabs-alive.md §4.2): while the
 * publisher's screen is hidden, its screen-scoped message is withdrawn and
 * held back (shown again if still set when the screen is shown). At the
 * moment the screen is hidden, the message's `onCancel` is called (every
 * armed pick publishes one - so picks end on leaving the tab), otherwise
 * its `onDismiss` (errors clear). Outside a kept tab the screen always
 * counts as active.
 */
export function useStatus(id: string, msg: StatusMessage | null): void {
  const api = useContext(ApiContext);
  const activity = useScreenActivity();
  const msgRef = useRef(msg);
  msgRef.current = msg;

  const contentKey = msg
    ? JSON.stringify([
        msg.kind,
        msg.text,
        msg.detail ?? null,
        msg.scope ?? 'screen',
        (msg.actions ?? []).map(a => [a.label, !!a.primary]),
        !!msg.onDismiss,
        !!msg.onCancel,
      ])
    : null;

  // Publishes the current message (or clears it) - callbacks go through the
  // ref so they always run the latest closures. A screen-scoped message of a
  // hidden kept tab is held back.
  const publishRef = useRef<() => void>(() => {});
  publishRef.current = () => {
    if (!api) return;
    const current = msgRef.current;
    if (!current || (!activity.isActive() && current.scope !== 'global')) {
      api.clear(id);
      return;
    }
    api.show(id, {
      ...current,
      actions: current.actions?.map((a, i) => ({
        ...a,
        onPress: () => msgRef.current?.actions?.[i]?.onPress(),
      })),
      onDismiss: current.onDismiss ? () => msgRef.current?.onDismiss?.() : undefined,
      onCancel: current.onCancel ? () => msgRef.current?.onCancel?.() : undefined,
    });
  };

  useEffect(() => {
    publishRef.current();
  }, [api, id, contentKey]);

  // Kept tab hidden: withdraw, and end picks (onCancel) / dismiss errors
  // (onDismiss), same as on unmount. Shown: re-publish whatever is still set.
  // Imperative on purpose - hiding a tab must not re-render its publishers.
  useEffect(
    () =>
      activity.subscribe(active => {
        const current = msgRef.current;
        if (!active && current && current.scope !== 'global') {
          if (current.onCancel) current.onCancel();
          else current.onDismiss?.();
        }
        publishRef.current();
      }),
    [activity],
  );

  // Unmount (or id change): drop screen-scoped messages.
  useEffect(
    () => () => {
      if (api && msgRef.current?.scope !== 'global') api.clear(id);
    },
    [api, id],
  );
}

let nextStatusInstance = 0;

/**
 * Shorthand for the most common case: an existing `error` string state,
 * shown in the status slot instead of an inline "⚠ …" line
 * (docs/dev/history/technical-design-status-slot.md §7.4). Publishes it as an
 * 'error' with ✕ (= `onDismiss`, normally `() => setError(null)`). `name` is
 * made unique per component instance, so the same component can be mounted
 * more than once.
 */
export function useErrorStatus(name: string, error: string | null | undefined, onDismiss?: () => void): void {
  const id = useRef(`${name}.${++nextStatusInstance}`).current;
  useStatus(id, error ? {kind: 'error', text: error, onDismiss} : null);
}
