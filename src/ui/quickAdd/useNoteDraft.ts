/**
 * The Note tab of Quick Add: creates a standalone, unlinked .note file
 * (storage/standaloneNotes.ts) - no edit mode, no project.txt/area.txt
 * footprint. Tags aren't a separate input: typing `#tag` into the title (or
 * tapping a tag chip) pins it; the tags are stripped from the title on Add
 * and become real Supernote page keywords (`insertKeyWord`).
 *
 * The destination is the Files pane's currently browsed folder, read at the
 * moment "+ Add" is pressed (`noteFolderPath`), never frozen when the tab
 * was opened.
 */
import {useState} from 'react';
import {Keyboard} from 'react-native';
import {extractContextTags, insertTagAtPosition, removeTagFromText} from '../../domain/markdown';
import {errorMessage} from '../../utils/errorMessage';
import {makeNoteDraft, NoteDraft, truncateItemName} from './types';
import {QuickAddCore} from './useQuickAddCore';
import {useWritingField} from '../writing/useWritingField';

interface Input {
  onAddNote?: (title: string, tags: string[], folderPath: string) => Promise<void>;
  noteFolderPath: string | null;
}

export function useNoteDraft(core: QuickAddCore, {onAddNote, noteFolderPath}: Input) {
  const {setError, setPending} = core;
  const [draft, setDraft] = useState<NoteDraft>(makeNoteDraft);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [tagPage, setTagPage] = useState(0);

  const clearJustAdded = () => {
    if (justAdded !== null) setJustAdded(null);
    core.clearTransientMessages();
  };
  /** Puts the title into the draft as it is - the writing help has run, or a chip changed it. */
  const writeTitle = (t: string) => {
    setDraft(d => ({...d, titleRaw: t}));
    clearJustAdded();
  };
  // The writing help (docs/dev/history/technical-design-writing-help.md §3.5); a note has no note page to name.
  const titleField = useWritingField({value: draft.titleRaw, write: writeTitle, recentTags: core.recentTags});
  const setTitleRaw = titleField.help.onChangeText;
  const insertTag = (tag: string) => writeTitle(insertTagAtPosition(draft.titleRaw, tag, null).text);
  const removeTag = (tag: string) => writeTitle(removeTagFromText(draft.titleRaw, tag));

  const submitCreate = () => {
    Keyboard.dismiss();
    if (!onAddNote) return;
    const tags = extractContextTags(draft.titleRaw);
    const cleanTitle = tags.reduce((t, tag) => removeTagFromText(t, tag), draft.titleRaw).trim();
    if (!cleanTitle) return;
    // The Add-twice rule: an unanswered flagged tag is shown once more first.
    if (!titleField.help.confirmAdd()) return;
    if (!noteFolderPath) {
      setError('Switch the Files pane back to Project Files/Area Files to add a note here.');
      return;
    }
    setError(null);
    setPending(true);
    onAddNote(cleanTitle, tags, noteFolderPath)
      .then(() => {
        setDraft(makeNoteDraft());
        titleField.help.reset();
        setJustAdded(`Created note "${truncateItemName(cleanTitle, 40)}"`);
        setTagPage(0);
        core.recordTags(tags);
      })
      .catch(e => setError(errorMessage(e)))
      .finally(() => setPending(false));
  };

  /** ✕ on the form: the draft goes (quickadd-redesign §11 G5). */
  const resetDraft = () => {
    setDraft(makeNoteDraft());
    titleField.help.reset();
    setTagPage(0);
  };

  return {draft, justAdded, setJustAdded, tagPage, setTagPage, setTitleRaw, titleField, insertTag, removeTag, submitCreate, resetDraft};
}

export type NoteDraftState = ReturnType<typeof useNoteDraft>;
