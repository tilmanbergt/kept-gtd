// docs/dev/history/technical-design-quickadd-redesign.md §3.8 F7, D3: success and info go by
// themselves and replace each other; errors stay and block the strips.
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {StatusEntry, StatusProvider, useStatusApi, useStatusBlocking, useStatusList} from '../../src/ui/status/StatusProvider';

let list: StatusEntry[] = [];
let blocking = false;
let api: ReturnType<typeof useStatusApi> | null = null;

function Probe(): null {
  list = useStatusList();
  blocking = useStatusBlocking();
  api = useStatusApi();
  return null;
}

function mount(): void {
  act(() => {
    TestRenderer.create(
      <StatusProvider>
        <Probe />
      </StatusProvider>,
    );
  });
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('StatusProvider timers', () => {
  it('removes a success after 8 s and calls its onDismiss', () => {
    mount();
    const onDismiss = jest.fn();
    act(() => api!.show('a', {kind: 'success', text: 'Saved', onDismiss}));
    act(() => jest.advanceTimersByTime(7900));
    expect(list.map(e => e.msg.text)).toEqual(['Saved']);
    act(() => jest.advanceTimersByTime(200));
    expect(list).toEqual([]);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('keeps a message with Undo for 16 s', () => {
    mount();
    act(() => api!.show('a', {kind: 'success', text: 'Filed', actions: [{label: 'Undo', onPress: () => {}}]}));
    act(() => jest.advanceTimersByTime(15000));
    expect(list).toHaveLength(1);
    act(() => jest.advanceTimersByTime(1100));
    expect(list).toEqual([]);
  });

  it('lets a new success replace the old one', () => {
    mount();
    const first = jest.fn();
    act(() => api!.show('a', {kind: 'success', text: 'One', onDismiss: first}));
    act(() => api!.show('b', {kind: 'info', text: 'Two'}));
    expect(list.map(e => e.msg.text)).toEqual(['Two']);
    expect(first).toHaveBeenCalledTimes(1);
  });

  it('keeps errors, warnings and app-wide notices until answered', () => {
    mount();
    act(() => api!.show('e', {kind: 'error', text: 'Broken'}));
    act(() => api!.show('w', {kind: 'warning', text: 'Careful'}));
    act(() => api!.show('g', {kind: 'info', scope: 'global', text: 'Updated'}));
    act(() => api!.show('s', {kind: 'success', text: 'Saved'}));
    act(() => jest.advanceTimersByTime(60000));
    expect(list.map(e => e.msg.text).sort()).toEqual(['Broken', 'Careful', 'Updated']);
  });

  it('restarts the timer when the same message is shown again, and a clear stops it', () => {
    mount();
    act(() => api!.show('a', {kind: 'success', text: 'One'}));
    act(() => jest.advanceTimersByTime(6000));
    act(() => api!.show('a', {kind: 'success', text: 'One more'}));
    act(() => jest.advanceTimersByTime(6000));
    expect(list).toHaveLength(1);
    act(() => api!.clear('a'));
    expect(list).toEqual([]);
  });

  it('blocks while a confirm, modal or error shows', () => {
    mount();
    expect(blocking).toBe(false);
    act(() => api!.show('w', {kind: 'warning', text: 'Careful'}));
    expect(blocking).toBe(false);
    act(() => api!.show('e', {kind: 'error', text: 'Broken'}));
    expect(blocking).toBe(true);
    act(() => api!.clear('e'));
    act(() => api!.show('c', {kind: 'confirm', text: 'Sure?'}));
    expect(blocking).toBe(true);
  });
});
