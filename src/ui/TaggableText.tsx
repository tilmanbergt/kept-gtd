/**
 * The `#tags` in a row's title as tap targets - one helper for ui/TaskRow.tsx
 * and ui/MeetingRow.tsx (docs/dev/history/technical-design-tending-threads.md §3.7).
 *
 * `text` is split with domain/markdown.ts's `splitTextWithTags` (callers pass
 * what the row displays, e.g. `displayTaskText`'s output, never the raw text).
 *
 * - A nested context tag (`#retro/alpha`) is always a tap target: it opens
 *   the thread overview (thread lens) with the row's item as owner
 *   (`ownerPath`; null when the row doesn't know it). `#owe/<name>` opens
 *   the counterpart lens for `<name>` instead (ui/overviewStore.ts).
 * - Plain tags and reserved words (flow state, `#wf/…`, `#now`, due) stay plain text; the
 *   `#w/f Name` label (ui/TaskLabels.tsx) is the tap target for `#wf/<name>`.
 *
 * A tag's `onPress` wins over the row's own tap: React Native gives a touch
 * to the innermost element with its own `onPress`.
 *
 * A plain function returning text nodes, not a component, so the segments
 * sit directly inside the row's title `<Text>` and wrap and clamp with it.
 */
import React from 'react';
import {StyleSheet, Text} from 'react-native';
import {isContextTag} from '../domain/flowState';
import {splitTextWithTags} from '../domain/markdown';
import {threadOf} from '../domain/threads';
import {log} from '../utils/log';
import {openOverview} from './overviewStore';

/** `text` as plain runs and tappable tag spans - see the module doc comment. `ownerPath`: the row's item (the Inbox folder for Inbox rows), the overview's owner. */
export function renderTaggableText(text: string, ownerPath?: string | null): React.ReactNode {
  const segments = splitTextWithTags(text);
  const nested = (tag: string) => isContextTag(tag) && threadOf(tag) !== null;
  if (!segments.some(s => s.kind === 'tag' && nested(s.value))) return text;
  return segments.map((segment, index) => {
    if (segment.kind === 'text') return segment.value;
    if (nested(segment.value)) {
      return (
        <Text
          key={`tag-${index}`}
          onPress={() => {
            // No tag in the log: tags can hold client names.
            log('TaggableText: thread tag tapped');
            openOverview({tag: segment.value, ownerPath: ownerPath ?? null});
          }}
          style={styles.tag}>
          {segment.raw}
        </Text>
      );
    }
    return segment.raw;
  });
}

const styles = StyleSheet.create({
  tag: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
