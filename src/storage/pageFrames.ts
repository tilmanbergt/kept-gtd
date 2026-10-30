/**
 * The real size of a note page, as a domain/pageFrame.ts frame
 * (docs/dev/history/technical-design-launch-ready.md §5.2). Read for every
 * page Kept writes on (one cheap host call next to the writes); a read that
 * fails gives the A5 X reference (what Kept did before it read sizes) and is
 * logged.
 *
 * `reportSkippedPieces` collects pieces a writer left out because they would
 * not fit; ui/usePageFitNotice.ts says so in the status slot.
 */
import {frameFor, PageFrame, REFERENCE_FRAME} from '../domain/pageFrame';
import {getNotePageSize} from '../supernote/pdfNative';
import {errorMessage} from '../utils/errorMessage';
import {log, logWarn} from '../utils/log';

export async function readPageFrame(notePath: string, page: number): Promise<PageFrame> {
  try {
    const size = await getNotePageSize(notePath, page);
    if (!size.ok || !size.result) {
      logWarn('pageFrames: page size unreadable, using the A5 X page', size.error ?? 'no answer');
      return REFERENCE_FRAME;
    }
    const frame = frameFor(size.result);
    if (frame.scale !== 1 || frame.width !== REFERENCE_FRAME.width) log('pageFrames: page', `${frame.width}x${frame.height}`, `scale=${frame.scale.toFixed(3)}`);
    return frame;
  } catch (e) {
    logWarn('pageFrames: reading the page size failed, using the A5 X page', errorMessage(e));
    return REFERENCE_FRAME;
  }
}

type SkipListener = (count: number) => void;
const skipListeners = new Set<SkipListener>();

/** Called by a writer that left `count` pieces out of a page because they would not fit. */
export function reportSkippedPieces(count: number): void {
  if (count <= 0) return;
  logWarn('pageFrames: pieces left out, they would not fit the page', `count=${count}`);
  skipListeners.forEach(l => l(count));
}

export function subscribeSkippedPieces(listener: SkipListener): () => void {
  skipListeners.add(listener);
  return () => skipListeners.delete(listener);
}
