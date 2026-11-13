// ui/selectionStore.ts (docs/dev/history/technical-design-calmer-screens.md §3.1.2).
import React from 'react';
import {Text} from 'react-native';
import {act, render} from '@testing-library/react-native';
import {createSelectionStore, selectionKey, SelectionReader, useSelectedMode, useSelection} from '../../src/ui/selectionStore';

describe('selectionKey', () => {
  it('keys strings, entry keys and indexed targets', () => {
    expect(selectionKey('a')).toBe('a');
    expect(selectionKey({type: 'task', key: 'p#1'})).toBe('task:p#1');
    expect(selectionKey({type: 'meeting', index: 3})).toBe('meeting:3');
  });
});

describe('createSelectionStore', () => {
  it('notifies only on a real change', () => {
    const store = createSelectionStore<string>();
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);
    store.set({target: 'a', mode: 'card'});
    store.set(s => s);
    store.set({target: 'a', mode: 'card'});
    expect(listener).toHaveBeenCalledTimes(1);
    store.set(s => ({...s, mode: 'edit'}));
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    store.set({target: null, mode: 'edit'});
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.get()).toEqual({target: null, mode: 'edit'});
  });
});

describe('the hooks', () => {
  const renders: Record<string, number> = {};
  function Row({store, id}: {store: SelectionReader; id: string}) {
    renders[id] = (renders[id] ?? 0) + 1;
    const mode = useSelectedMode(store, id);
    return <Text>{`${id}:${mode ?? '-'}`}</Text>;
  }
  function Zone({store}: {store: ReturnType<typeof createSelectionStore<string>>}) {
    const {target, mode} = useSelection(store);
    return <Text>{`zone:${target ?? '-'}:${mode}`}</Text>;
  }
  it('re-renders a row only when its own value flips', () => {
    const store = createSelectionStore<string>();
    const screen = render(
      <>
        <Zone store={store} />
        <Row store={store} id="a" />
        <Row store={store} id="b" />
      </>,
    );
    expect(renders).toEqual({a: 1, b: 1});
    act(() => store.set({target: 'a', mode: 'card'}));
    expect(screen.getByText('a:card')).toBeTruthy();
    expect(screen.getByText('zone:a:card')).toBeTruthy();
    expect(renders).toEqual({a: 2, b: 1});
    act(() => store.set({target: 'b', mode: 'card'}));
    expect(renders).toEqual({a: 3, b: 2});
    act(() => store.set({target: 'b', mode: 'edit'}));
    expect(renders).toEqual({a: 3, b: 3});
    expect(screen.getByText('b:edit')).toBeTruthy();
  });
});
