/**
 * Status-slot confirm before a Todo/Meeting note is created, recreated or
 * linked (docs/dev/history/technical-design-split-by-tag.md §3.5). Every screen with
 * note icons passes the returned callback to
 * `openOrCreateMeetingNote`/`openOrCreateTodoNote` as `confirmCreate`.
 * When more than one setup matches, a second button offers the best other
 * place (docs/dev/history/technical-design-note-setups.md §4.4); the result
 * is the chosen place's index, `null` on ✕. Built on useStatusChoice (same
 * one-at-a-time and ✕-on-hide/unmount rules).
 *
 * Opened from a PDF or EPUB, a plan whose note files don't exist yet (every
 * choice would create one) is not offered: the callback throws NoteCreationBlockedError instead, so the
 * status slot says why before anything is asked
 * (docs/dev/history/technical-design-launch-ready.md §3).
 */
import {useCallback} from 'react';
import {noteChoiceText} from '../domain/fileChangeText';
import {launchKind, NoteCreationBlockedError, planFiles, planNeedsNewFile} from '../domain/noteCreation';
import {NoteCreateConfirm, NoteCreationPlan} from '../domain/noteCreationPlan';
import {displayPath} from '../supernote/devicePaths';
import {fileExists} from '../supernote/fileSystem';
import {getRememberedLaunchNotePath} from '../supernote/hostContext';
import {useStatusChoice} from './useStatusChoice';

export function useNoteCreateConfirm(name: string): NoteCreateConfirm {
  const choose = useStatusChoice(name);
  return useCallback(
    async (plan: NoteCreationPlan) => {
      if (launchKind(getRememberedLaunchNotePath()?.path) === 'document') {
        const files = planFiles(plan);
        const found = await Promise.all(files.map(path => fileExists(path)));
        const existing = new Set(files.filter((_, i) => found[i]));
        if (planNeedsNewFile(plan, existing)) throw new NoteCreationBlockedError();
      }
      return choose(noteChoiceText(plan, displayPath(plan.absolutePath)));
    },
    [choose],
  );
}
