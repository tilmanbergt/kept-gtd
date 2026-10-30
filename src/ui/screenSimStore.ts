/**
 * The debug "Simulate screen" choice (docs/dev/history/technical-design-launch-ready.md §4.3):
 * held in memory only, so a restart of Kept always ends a simulation and nobody gets stuck in a
 * small box. ui/ScreenSize.tsx reads it; Settings → Advanced sets it.
 */
import {SimulatedScreen} from '../domain/screenLayout';

let current: SimulatedScreen | null = null;
const listeners = new Set<() => void>();

export function getScreenSimulation(): SimulatedScreen | null {
  return current;
}

export function setScreenSimulation(next: SimulatedScreen | null): void {
  if (next === current) return;
  current = next;
  listeners.forEach(l => l());
}

export function subscribeScreenSimulation(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
