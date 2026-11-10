/**
 * Quick Add's rows while nobody sees them (docs/dev/history/technical-design-calmer-screens.md
 * §3.1): while a card shows in their place or the box is collapsed, a render
 * that keeps them hidden is skipped - the hidden rows (inputs, strips, chips
 * of four kinds) made up most of a tap's time on the device. They stay
 * mounted, so drafts survive, and draw once with the current draft when they
 * show again. `buildKey` still lets the other kinds' rows be built while
 * hidden (QuickAddWidget's `allTabs`).
 */
import React from 'react';

interface Props {
  hidden: boolean;
  buildKey: unknown;
  children: React.ReactNode;
}

function FrozenWhileHidden({children}: Props): React.JSX.Element {
  return <>{children}</>;
}

export default React.memo(FrozenWhileHidden, (prev, next) => prev.hidden && next.hidden && prev.buildKey === next.buildKey);
