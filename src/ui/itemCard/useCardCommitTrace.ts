/**
 * Ends the measured part of a row tap (docs/dev/history/technical-design-calmer-screens.md
 * §3.1): every commit of a card marks `card:commit` in a running perf trace;
 * the first one after a `tap` trace began logs how long the card took. Costs
 * one check per commit while tracing is off.
 */
import {useLayoutEffect} from 'react';
import {perfCardCommit} from '../../utils/perf';
import {log} from '../../utils/log';

export function useCardCommitTrace(kind: 'todo' | 'meeting' | 'agreement' | 'inbox' | 'owner'): void {
  useLayoutEffect(() => {
    const first = perfCardCommit({kind});
    if (first) log(`ItemCard: tap card screen=${String(first.meta?.screen ?? '?')} kind=${kind} ms=${first.ms}`);
  });
}
