/**
 * What a todo row shows and how tall it is (docs/dev/technical-design-
 * waiting-for-0.7.md §3.3). The title and its labels (domain/taskLabels.ts)
 * are one text flow in ui/TaskRow.tsx, so one estimate covers both and the
 * row height always matches what is drawn.
 *
 * When title plus labels would need more than MAX_LINES lines, the title is
 * shortened with "…" so the labels always show in full (W4). The labels are
 * measured at the title's font size although they render smaller - that
 * errs on the safe side (a bit of space left over rather than a cut label).
 *
 * `taskRowLayout` is the one place both the row (render) and its callers
 * (height for ui/PagedSection.tsx) read, so the two can't disagree. Its
 * result is remembered per Task object (docs/dev/history/technical-design-daily-slim.md
 * §3.4): the key holds every argument plus `task.text`, which carries every tag
 * the layout reads, and the due date, so a Task changed in place or a new day gets a fresh layout.
 * Perf counters: `calc:taskRowLayout` (computed), `calc:taskRowLayoutHit`.
 */
import {TaskLabel, TaskLabelContext, displayTaskText, taskLabels} from '../domain/taskLabels';
import {todayIso} from '../domain/meetingTime';
import {Task} from '../domain/types';
import {activeLineEstimator} from '../domain/textLineEstimator';
import {FONT} from './theme';
import {perfCount} from '../utils/perf';

/** A todo row never shows more than two lines of text. */
export const TASK_ROW_MAX_LINES = 2;
/** The usual column width of a todo list (two equal columns, design-device-rendering §5.1). */
export const TASK_COLUMN_WIDTH_PX = 678;
// Checkbox glyph width + its marginRight (ui/TaskRow.tsx styles.checkbox).
const CHECKBOX_WIDTH_PX = 28;
// Note icon (📓 / +📓) and clip icon with their margins, both assumed shown -
// they sit beside the text block and take its width.
const TRAILING_ICON_ALLOWANCE_PX = 90;
/** Space between the title and each label, as rendered. */
export const LABEL_GAP = '  ';
const ELLIPSIS = '…';

/** Width the title-and-labels text gets in a row of `columnWidthPx`. */
export function taskTextWidthPx(columnWidthPx: number): number {
  return Math.max(1, columnWidthPx - CHECKBOX_WIDTH_PX - TRAILING_ICON_ALLOWANCE_PX);
}

function linesFor(text: string, widthPx: number): number {
  return activeLineEstimator.estimateLines(text, widthPx, FONT.medium);
}

/** The labels as they follow the title: each one after LABEL_GAP. */
export function labelSuffix(labels: TaskLabel[]): string {
  return labels.map(l => `${LABEL_GAP}${l.text}`).join('');
}

/**
 * `title` unchanged if `title + suffix` fits in `maxLines` at `widthPx`;
 * otherwise the longest start of `title` that fits with "…" - cut at a word
 * boundary when one is in the last half of the cut. Returns "…" alone when
 * even the labels barely fit.
 */
export function fitTitleToLines(title: string, suffix: string, widthPx: number, maxLines: number): string {
  if (linesFor(title + suffix, widthPx) <= maxLines) return title;
  // Width grows with every character, so a binary search over the cut length finds the longest fit.
  let lo = 0;
  let hi = title.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (linesFor(title.slice(0, mid).trimEnd() + ELLIPSIS + suffix, widthPx) <= maxLines) lo = mid;
    else hi = mid - 1;
  }
  let cut = title.slice(0, lo);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > cut.length / 2) cut = cut.slice(0, lastSpace);
  return cut.trimEnd() + ELLIPSIS;
}

export interface TaskRowLayout {
  /** The title as shown: tags a label already shows are removed, shortened if needed. */
  title: string;
  labels: TaskLabel[];
  /** Lines the title and labels take together (1..TASK_ROW_MAX_LINES). */
  lines: number;
}

const layoutCache = new WeakMap<Task, {key: string; layout: TaskRowLayout}>();

export function taskRowLayout(
  task: Task,
  columnWidthPx: number,
  context: TaskLabelContext,
  contextActive = false,
  today: string = todayIso(),
): TaskRowLayout {
  const key = `${columnWidthPx}|${context}|${contextActive}|${today}|${task.dueDate ?? ''}|${task.text}`;
  const known = layoutCache.get(task);
  if (known && known.key === key) {
    perfCount('calc:taskRowLayoutHit');
    return known.layout;
  }
  perfCount('calc:taskRowLayout');
  const layout = computeTaskRowLayout(task, columnWidthPx, context, contextActive, today);
  layoutCache.set(task, {key, layout});
  return layout;
}

function computeTaskRowLayout(task: Task, columnWidthPx: number, context: TaskLabelContext, contextActive: boolean, today: string): TaskRowLayout {
  const labels = taskLabels(task, context, today, contextActive);
  const suffix = labelSuffix(labels);
  const widthPx = taskTextWidthPx(columnWidthPx);
  const title = fitTitleToLines(displayTaskText(task, context, contextActive), suffix, widthPx, TASK_ROW_MAX_LINES);
  const lines = Math.min(TASK_ROW_MAX_LINES, linesFor(title + suffix, widthPx));
  return {title, labels, lines};
}
