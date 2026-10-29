/**
 * Settings → Contexts' state (docs/dev/history/technical-design-time-and-place.md
 * §3.3): which context is open in the editor, its draft, and Save / Delete,
 * which write `contexts` at once (and mirror it into the Settings draft, so a
 * later Save on another tab keeps it) - the Note setups pattern - and
 * `handleActivate`, which makes a context (or Everything, '') the active one.
 * Everything opens in the editor too, with only its Given time threshold,
 * which is written at once (`givenTimeMinMinutes`).
 */
import {useState} from 'react';
import {ContextDef, ContextEntry, DEFAULT_MIN_MINUTES, EVERYTHING_LABEL, MinMinutes, newContext, toggleEntry} from '../../../domain/contexts';
import {GtdParaSettings} from '../../../domain/settings';
import {patchSettings} from '../../../storage/settingsStorage';
import {useStatusApi} from '../../../ui/status/StatusProvider';
import {errorMessage} from '../../../utils/errorMessage';
import {log, logError} from '../../../utils/log';
import {requestEinkRefresh} from '../../../utils/screenRefresh';

export type ContextListSide = 'shows' | 'hides';

export interface ContextsDraft {
  draft: ContextDef | null;
  /** Everything is open in the editor (no draft then). */
  everythingOpen: boolean;
  /** The open context's Given time threshold, or Everything's. */
  minMinutes: MinMinutes;
  /** The draft is a context not saved yet. */
  isNew: boolean;
  side: ContextListSide;
  setSide: (side: ContextListSide) => void;
  handleNew: () => void;
  handleEdit: (id: string) => void;
  handleEditEverything: () => void;
  /** The draft's threshold; Everything's is written at once. */
  setMinMinutes: (scope: keyof MinMinutes, minutes: number) => void;
  setName: (name: string) => void;
  toggle: (entry: ContextEntry) => void;
  setOutsideMeetings: (value: ContextDef['outsideMeetings']) => void;
  handleSave: () => void;
  handleDelete: () => void;
  handleCancel: () => void;
  /** Makes `id` the active context ('' = Everything), written at once. */
  handleActivate: (id: string) => void;
}

export function useContextsDraft(values: GtdParaSettings, setValues: (update: (v: GtdParaSettings) => GtdParaSettings) => void): ContextsDraft {
  const [draft, setDraft] = useState<ContextDef | null>(null);
  const [everythingOpen, setEverythingOpen] = useState(false);
  const everything = values.givenTimeMinMinutes ?? DEFAULT_MIN_MINUTES;
  const [side, setSide] = useState<ContextListSide>('shows');
  const statusApi = useStatusApi();
  const contexts = values.contexts ?? [];
  const isNew = draft !== null && !contexts.some(c => c.id === draft.id);

  const store = (next: ContextDef[], patch: Partial<GtdParaSettings> = {}, message: string) => {
    setValues(v => ({...v, contexts: next, ...patch}));
    patchSettings({contexts: next, ...patch})
      .then(() => {
        log('Settings: contexts saved', `${next.length} contexts`);
        const id = 'Settings.contexts';
        statusApi.show(id, {kind: 'success', text: message, onDismiss: () => statusApi.clear(id)});
      })
      .catch(e => {
        logError('Settings: saving contexts failed', errorMessage(e));
        const id = 'Settings.contextsError';
        statusApi.show(id, {kind: 'error', text: `Contexts not saved: ${errorMessage(e)}`, onDismiss: () => statusApi.clear(id)});
      });
  };

  const update = (change: (d: ContextDef) => ContextDef) => setDraft(d => (d ? change(d) : d));
  return {
    draft,
    everythingOpen,
    minMinutes: draft?.minMinutes ?? everything,
    isNew,
    side,
    setSide,
    handleNew: () => {
      setDraft(newContext(contexts));
      setEverythingOpen(false);
      setSide('shows');
    },
    handleEdit: id => {
      setDraft(contexts.find(c => c.id === id) ?? null);
      setEverythingOpen(false);
      setSide('shows');
    },
    handleEditEverything: () => {
      setDraft(null);
      setEverythingOpen(true);
    },
    setMinMinutes: (scope, minutes) => {
      if (draft) {
        update(d => ({...d, minMinutes: {...(d.minMinutes ?? everything), [scope]: minutes}}));
        return;
      }
      if (!everythingOpen) return;
      const next = {...everything, [scope]: minutes};
      setValues(v => ({...v, givenTimeMinMinutes: next}));
      patchSettings({givenTimeMinMinutes: next})
        .then(() => {
          log('Settings: given time threshold saved', `week ${next.week} min`, `month ${next.month} min`);
          const id = 'Settings.contexts';
          statusApi.show(id, {kind: 'success', text: 'Everything saved.', onDismiss: () => statusApi.clear(id)});
        })
        .catch(e => logError('Settings: saving the given time threshold failed', errorMessage(e)));
    },
    setName: name => update(d => ({...d, name})),
    toggle: entry => update(d => (side === 'shows' ? {...d, shows: toggleEntry(d.shows, entry)} : {...d, hides: toggleEntry(d.hides, entry)})),
    setOutsideMeetings: value => update(d => ({...d, outsideMeetings: value})),
    handleSave: () => {
      if (!draft) return;
      const named = {...draft, name: draft.name.trim() || 'Unnamed'};
      const next = isNew ? [...contexts, named] : contexts.map(c => (c.id === named.id ? named : c));
      setDraft(named);
      store(next, {}, `Context "${named.name}" saved.`);
    },
    handleDelete: () => {
      if (!draft) return;
      if (!isNew) {
        const wasActive = values.activeContextId === draft.id;
        store(contexts.filter(c => c.id !== draft.id), wasActive ? {activeContextId: ''} : {}, `Context "${draft.name}" deleted.`);
      }
      setDraft(null);
    },
    handleCancel: () => {
      setDraft(null);
      setEverythingOpen(false);
    },
    handleActivate: id => {
      if (id === (values.activeContextId ?? '')) return;
      const name = contexts.find(c => c.id === id)?.name || EVERYTHING_LABEL;
      setValues(v => ({...v, activeContextId: id}));
      patchSettings({activeContextId: id})
        .then(() => {
          log('Context: switched', `${contexts.length} contexts`);
          const statusId = 'Settings.contextActive';
          statusApi.show(statusId, {kind: 'success', text: `Context: ${name}`, scope: 'global', onDismiss: () => statusApi.clear(statusId)});
          requestEinkRefresh();
        })
        .catch(e => logError('Settings: switching the context failed', errorMessage(e)));
    },
  };
}
