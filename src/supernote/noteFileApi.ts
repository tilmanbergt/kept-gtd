/**
 * Reading and changing a .note's pages, keywords and elements through
 * PluginFileAPI/PluginCommAPI (docs/dev/history/technical-design-filesystem-split.md §3).
 */
import {PluginCommAPI, PluginFileAPI} from 'sn-plugin-lib';
import {ensureFileWritePermission, logFileCallFailure} from './pluginPermissions';
import {log, logError, logWarn} from '../utils/log';
import {errorMessage} from '../utils/errorMessage';
import {notifyFolderChanged, parentFolder} from './fileNative';
import {callHost, recordDebugLogEntry} from './hostCall';
import {SdkResponse} from './sdkElements';
import {getRememberedLaunchNotePath} from './hostContext';
import {isHostCreateRefusal, launchKind, NoteCreationBlockedError} from '../domain/noteCreation';

export interface NoteTemplate {
  name: string;
  vUri: string;
  hUri: string;
}

/** One page keyword, exactly as `docs.supernote.com/.../plugin-file-api/get-key-words` describes it - `index` is 1-based within its page (what `deleteKeyWord` consumes), not a global count. */
export interface KeyWord {
  keyword: string;
  page: number;
  index: number;
}

export const ELEMENT_TYPE_TEXT = 500;
export const ELEMENT_TYPE_LINK = 600;

/**
 * The universal element shape (docs.supernote.com/.../types/trail) every
 * visible item on a page is represented as - only the sub-fields this
 * codebase actually touches are typed here (not `stroke`/`geometry`/
 * `fiveStar`/`picture`/`title`/`recognizeResult`/`angles`/`contoursSrc` -
 * add them, typed for real against the docs, if something here ever needs
 * to read/write one of those). `userData` is the one field this whole
 * meeting-note-block feature is built around - a free-form string that
 * round-trips through getElements/insertElements/modifyElements untouched,
 * letting a plugin-inserted element be found again later by tag rather than
 * by position (docs/dev/history/technical-design-meeting-notes.md §3.1/§5.1's "why not
 * PluginNoteAPI.insertText" note - that convenience call has no such field).
 */
export interface Element {
  uuid: string;
  type: number;
  pageNum: number;
  layerNum: number;
  /** 1-indexed position within the page - what deleteElements' numsInPage array actually identifies (NOT uuid, despite uuid existing on this type too). */
  numInPage: number;
  /**
   * Free-form marker this plugin sets on elements it inserts. Absent
   * (undefined/null) on every element it did NOT write - handwriting strokes,
   * textboxes the user typed - so anything READING this off a getElements
   * result must treat it as optional (an unguarded `.startsWith` on it would
   * crash re-opening a meeting note). Writing a string to it, as
   * createElement callers do, is fine.
   */
  userData?: string | null;
  textBox: ElementTextBox | null;
  link: ElementLink | null;
  /** Present on the real API response; deliberately untyped (`unknown`) here since nothing in this codebase reads it yet. */
  status?: unknown;
  maxX?: number;
  maxY?: number;
  thickness?: number;
}

/**
 * A top-left/bottom-right box - Rect (docs.supernote.com/.../types/rect) is
 * `{left, top, right, bottom}`, NOT `{x, y, width, height}`: passing an
 * `{x,y,width,height}` object as textRect fails on the device with
 * "textRect.left is required". Use toRect() below to build one from
 * a left/top/width/height box (the shape settings.ts's
 * meetingNoteBlockTopX/Y/MaxWidth naturally produce) rather than
 * constructing this by hand at each call site.
 */
export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** `{left, top, width, height}` -> Rect. The one conversion point every caller building a textRect should go through (and Element.link too, should it turn out to want a Rect rather than its documented flat X/Y/width/height - unconfirmed), rather than hand-computing `right`/`bottom` inline. */
export function toRect(left: number, top: number, width: number, height: number): Rect {
  return {left, top, right: left + width, bottom: top + height};
}

/** Field names/order confirmed against https://docs.supernote.com/en/api-reference/supernote-plugin/types/text-box - NOT the same shape as PluginNoteAPI.insertText's standalone `textBox` param (that one has no `textDigestData`; that one's `textRect` was assumed to match this one's - unconfirmed either way, since insertText itself is unused by this codebase, see the "why not PluginNoteAPI" note near insertElements below). */
export interface ElementTextBox {
  fontSize: number;
  fontPath: string | null;
  textContentFull: string | null;
  textRect: Rect;
  textDigestData: string | null;
  textAlign: number;
  textBold: number;
  textItalics: number;
  textFrameWidthType: number;
  textFrameStyle: number;
  /** 1 = user can tap in and edit normally afterward (what this feature wants - the block stays a real, editable Supernote textbox, not a locked/baked-in one), 0 = not editable. Exact accepted values unconfirmed against the docs (only the field's existence is documented) - 0/1 is a working guess. */
  textEditable: number;
}

/**
 * Field names/order confirmed against https://docs.supernote.com/en/api-
 * reference/supernote-plugin/types/link - deliberately DIFFERENT shape from
 * PluginNoteAPI.insertTextLink's standalone param (that one nests `rect:
 * Rect`; this one is flat X/Y/width/height/page, and adds `category`/
 * `controlTrailNums` that the convenience call doesn't expose at all).
 * `category`/`style` meanings are undocumented beyond "number" - 0 is used
 * for both as a neutral default (docs/dev/history/technical-design-meeting-notes.md §8).
 */
export interface ElementLink {
  category: number;
  X: number;
  Y: number;
  width: number;
  height: number;
  page: number;
  style: number;
  /** 1 = other note file, 2 = document (with page nav), 3 = image file, 4 = URL - per docs.supernote.com's insertTextLink page; unconfirmed whether Element.link's own linkType uses the identical numbering (it's presented as the same conceptual field, but insertTextLink and Element.link are documented on separate pages with no cross-reference either way). */
  linkType: number;
  destPath: string;
  destPage: number;
  fontSize: number;
  fullText: string;
  showText: string;
  italic: number;
  controlTrailNums: number[];
}

/**
 * The built-in note templates the host offers (PluginCommAPI's own call) -
 * for picking a default template when creating a linked note, since
 * PluginFileAPI.createNote requires a non-empty template name and there's
 * no "just give me a blank note" shortcut.
 */
export async function getNoteSystemTemplates(): Promise<NoteTemplate[]> {
  log('getNoteSystemTemplates: start');
  try {
    const templates = (await PluginCommAPI.getNoteSystemTemplates()) as NoteTemplate[] | null | undefined;
    const result = templates ?? [];
    log('getNoteSystemTemplates: done', `${result.length} templates`);
    return result;
  } catch (e) {
    logError('getNoteSystemTemplates: failed', errorMessage(e));
    throw e;
  }
}

/**
 * Creates a real Supernote .note file at `path` using `template`. This
 * expects one of the *names* getNoteSystemTemplates() reports (e.g.
 * "style_8mm_ruled_line") - passing a vUri/hUri resource reference instead
 * fails with "Background template file does not exist", since createNote
 * doesn't resolve those. This is the official note-creation call, not our
 * own text-file I/O - it needs FILE:WRITE the same way writing a
 * project.txt does, since it's putting a new file on disk in the user's
 * Note folder.
 *
 * Opened from a PDF or EPUB, the host refuses note creation
 * (docs/dev/supernote-host-facts.md §2): Kept then throws
 * NoteCreationBlockedError without calling the host, and maps the host's
 * own refusal to the same error when it comes anyway
 * (docs/dev/history/technical-design-launch-ready.md §3).
 */
export async function createNote(
  path: string,
  template: string,
  isPortrait = true,
): Promise<void> {
  const granted = await ensureFileWritePermission();
  if (!granted) {
    logError('createNote: file write permission not granted', path);
    throw new Error('File write permission was not granted.');
  }
  if (launchKind(getRememberedLaunchNotePath()?.path) === 'document') {
    logWarn('createNote: not tried, Kept was opened from a document');
    throw new NoteCreationBlockedError();
  }
  log('createNote: start', path, template);
  const start = Date.now();
  const response = (await PluginFileAPI.createNote({
    notePath: path,
    template,
    mode: 0,
    isPortrait,
  })) as SdkResponse<boolean> | null | undefined;
  const durationMs = Date.now() - start;
  if (!response || !response.success || response.result === false) {
    const hostMessage = response?.error?.message || 'Could not create the note.';
    logFileCallFailure('createNote: failed', path, hostMessage);
    await recordDebugLogEntry('createNote', false, durationMs, {notePath: path, template, isPortrait, errorMessage: hostMessage});
    if (isHostCreateRefusal(hostMessage)) throw new NoteCreationBlockedError();
    // Any other refusal: ensureFileWritePermission() above already succeeded,
    // so this is still the "granted != allowed" situation (a
    // second, separate host-side gate in HostCommImpl.checkAPIAvailable,
    // unrelated to plugin.permission.FILE:WRITE) - the plain host message
    // alone reads like a permission problem and sends people chasing the
    // wrong thing, so lead with the actual shape of the failure and keep the
    // host's own wording attached for debugging/searchability.
    throw new Error(`Though write permission is granted, note creation was blocked by the device: ${hostMessage}`);
  }
  log('createNote: done', path);
  notifyFolderChanged(parentFolder(path));
  await recordDebugLogEntry('createNote', true, durationMs, {notePath: path, template, isPortrait});
}

/** insertNotePage has been seen to hang (sister project NoteDraft/textboxHelper needed the same guard). */
const INSERT_NOTE_PAGE_TIMEOUT_MS = 8000;

/**
 * Inserts a blank page into the note at `path` at zero-indexed position
 * `page` - appending when `page` equals the current page count - using
 * `template` (a template *name* such as "style_white", like createNote).
 * Same permission check and error mapping as createNote, plus an 8 s timeout
 * per call. Used by storage/textNote.ts to build multi-page text notes.
 */
export async function insertNotePage(path: string, page: number, template: string): Promise<void> {
  await callHost<boolean>({
    name: 'insertNotePage',
    permission: 'write',
    path,
    startArgs: [path, `page=${page}`, template],
    call: () => PluginFileAPI.insertNotePage({notePath: path, page, template}) as Promise<SdkResponse<boolean>>,
    ok: r => r.success && r.result !== false,
    failMessage: `Could not add page ${page + 1} to the note.`,
    failArgs: [path, `page=${page}`],
    doneArgs: () => [path, `page=${page}`],
    timeout: {ms: INSERT_NOTE_PAGE_TIMEOUT_MS, message: `Timeout adding page ${page + 1} to the note.`},
  });
}

/**
 * Sets a real Supernote keyword/tag on `path`'s `page` (zero-indexed) - the
 * device's own note-tagging mechanism, distinct from this app's own
 * `#context` markdown tags embedded in project.txt/area.txt text
 * (domain/markdown.ts's extractContextTags). Used by
 * storage/standaloneNotes.ts's createStandaloneNote for the "Note" quick-add
 * tab and by the shared-note page engine. Signature confirmed against
 * https://docs.supernote.com/en/api-reference/supernote-plugin/plugin-file-api/insert-key-word -
 * `getKeyWords`/`deleteKeyWord` (docs/dev/history/technical-design-shared-note-pages.md
 * §4) are wrapped below.
 */
export async function insertKeyWord(path: string, page: number, keyword: string): Promise<void> {
  await callHost<boolean>({
    name: 'insertKeyWord',
    permission: 'write',
    path,
    startArgs: [path, `page=${page}`, keyword],
    call: () => PluginFileAPI.insertKeyWord(path, page, keyword) as Promise<SdkResponse<boolean>>,
    ok: r => r.success && r.result !== false,
    failMessage: 'Could not add the keyword.',
    failArgs: [path, keyword],
    doneArgs: () => [path, keyword],
  });
}

/**
 * Reads every keyword on `path`'s pages in `pageList` (each 0-indexed) in
 * ONE call - docs/dev/history/technical-design-shared-note-pages.md §4's page engine
 * builds `pageList` as every page (0..getNoteTotalPageNum-1) so a shared
 * note's whole keyword index comes back in a single round trip, never one
 * call per page. Signature confirmed against
 * https://docs.supernote.com/en/api-reference/supernote-plugin/plugin-file-api/get-key-words.
 * Resolves `[]` (not an error) when `pageList` is empty or the file has no
 * keywords at all - callers distinguish "no keywords" from "call failed" the
 * same way every other read wrapper here does (via the thrown error).
 */
export async function getKeyWords(path: string, pageList: number[]): Promise<KeyWord[]> {
  const response = await callHost<KeyWord[]>({
    name: 'getKeyWords',
    permission: 'read',
    path,
    startArgs: [path, `${pageList.length} pages`],
    call: () => PluginFileAPI.getKeyWords(path, pageList) as Promise<SdkResponse<KeyWord[]>>,
    ok: r => r.success,
    failMessage: 'Could not read this note\'s keywords.',
    failArgs: [path],
    doneArgs: r => [path, `${(r.result ?? []).length} keywords`],
  });
  return response.result ?? [];
}

/**
 * Removes the keyword at `path`'s `page` whose 1-indexed `KeyWord.index` is
 * `index` (NOT a 0-indexed array position - `index` is exactly the field a
 * prior `getKeyWords` result already carries per keyword, meant to be passed
 * straight through, same "the API's own index field is load-bearing"
 * pattern as `deleteElements`' `numInPage` for elements).
 * Signature confirmed against the `sn-plugin-lib` 0.1.65 typings
 * (`deleteKeyWord(notePath, page, index): Promise<APIResponse<boolean>>`);
 * its docs.supernote.com reference page was not checked.
 */
export async function deleteKeyWord(path: string, page: number, index: number): Promise<void> {
  await callHost<boolean>({
    name: 'deleteKeyWord',
    permission: 'write',
    path,
    startArgs: [path, `page=${page}`, `index=${index}`],
    call: () => PluginFileAPI.deleteKeyWord(path, page, index) as Promise<SdkResponse<boolean>>,
    ok: r => r.success && r.result !== false,
    failMessage: 'Could not remove the keyword.',
    failArgs: [path, `page=${page}`],
    doneArgs: () => [path, `page=${page}`],
  });
}

/**
 * Total page count of the note/doc at `path` - the shared-note-pages page
 * engine's own building block for turning "every keyword on file" into a
 * concrete `pageList` (`[0..count-1]`) to pass to `getKeyWords`, and for
 * knowing where "append at the end" actually is. Signature confirmed
 * against the `sn-plugin-lib` 0.1.65 typings (`getNoteTotalPageNum(notePath):
 * Promise<APIResponse<number>>`); its docs.supernote.com reference page was
 * not checked.
 */
export async function getNoteTotalPageNum(path: string): Promise<number> {
  const response = await callHost<number>({
    name: 'getNoteTotalPageNum',
    permission: 'read',
    path,
    startArgs: [path],
    call: () => PluginFileAPI.getNoteTotalPageNum(path) as Promise<SdkResponse<number>>,
    ok: r => r.success && r.result != null,
    failMessage: 'Could not read this note\'s page count.',
    failArgs: [path],
    doneArgs: r => [path, `${r.result} pages`],
  });
  return response.result as number;
}

/**
 * Allocates a fresh, natively-cached Element of `type` (one of the
 * ELEMENT_TYPE_* constants above) via PluginCommAPI.createElement - the SDK
 * requires every element passed to insertElements to have come from this
 * call (or from a previous getElements read) rather than being a bare JS
 * object, since insertElements resolves the object back to a native cache
 * entry by `uuid`, not by re-serializing the fields it's given (confirmed
 * from insert-trails' own doc: an element whose uuid can't be found in the
 * cache is silently skipped - i.e. the uuid is load-
 * bearing, not decorative). Caller sets whichever sub-fields it needs
 * (`.userData`, `.textBox` or `.link`, `.pageNum`, `.layerNum`) on the
 * returned object before passing it to insertElements, and must call
 * recycleElement (TODO: not wrapped yet - nothing recycles today) when done
 * with it, per the SDK's own memory-management rule.
 */
export async function createElement(type: number): Promise<Element> {
  const response = await callHost<Element>({
    name: 'createElement',
    permission: null,
    startArgs: [`type=${type}`],
    call: () => PluginCommAPI.createElement(type) as Promise<SdkResponse<Element>>,
    ok: r => r.success && !!r.result,
    failMessage: 'Could not create the element.',
    failArgs: [type],
    failLog: 'error',
    doneArgs: r => [type, (r.result as Element).uuid],
  });
  return response.result as Element;
}

/**
 * Reads every element on `path`'s `page` (0-indexed) - file-level, no
 * dependence on that note being the one currently open in the NOTE app
 * (unlike PluginNoteAPI's calls - see docs/dev/technical-design-meeting-
 * notes.md §5.1's "why not PluginNoteAPI" note).
 * Param order is (page, path) - PluginFileAPI's read-only calls put page
 * first, write calls put path first (gtdpara_project.md's own gotcha #10),
 * confirmed here against the docs.
 */
export async function getElements(page: number, path: string): Promise<Element[]> {
  // Diagnostic (docs/dev/history/technical-design-shared-note-pages.md): records BOTH
  // outcomes via recordDebugLogEntry, here and on insertElements/openPath, to
  // localize which call fails with "File does not exist. Cannot call the API."
  // on a page just inserted via insertNotePage - without needing adb logcat.
  const response = await callHost<Element[]>({
    name: 'getElements',
    permission: 'read',
    path,
    startArgs: [path, `page=${page}`],
    call: () => PluginFileAPI.getElements(page, path) as Promise<SdkResponse<Element[]>>,
    ok: r => r.success,
    failMessage: 'Could not read this page\'s elements.',
    failArgs: [path],
    doneArgs: r => [path, `${(r.result ?? []).length} elements`],
    record: {fields: {path, page}, okFields: r => ({elementCount: (r.result ?? []).length})},
  });
  return response.result ?? [];
}

/**
 * Inserts `elements` (each from createElement or a previous getElements
 * read - see createElement's own doc comment) onto `path`'s `page`. Used by
 * the meeting-note-block feature to write its textbox + (optionally) link
 * element in one call, so a failure partway can't leave one without the
 * other (docs/dev/history/technical-design-meeting-notes.md §5 step 5).
 */
export async function insertElements(path: string, page: number, elements: Element[]): Promise<void> {
  // Diagnostic - see getElements' own comment above for why.
  await callHost<boolean>({
    name: 'insertElements',
    permission: 'write',
    path,
    startArgs: [path, `page=${page}`, `${elements.length} elements`],
    call: () => PluginFileAPI.insertElements(path, page, elements) as Promise<SdkResponse<boolean>>,
    ok: r => r.success && r.result !== false,
    failMessage: 'Could not insert the elements.',
    failArgs: [path],
    doneArgs: () => [path],
    record: {fields: {path, page, elementCount: elements.length}},
  });
}

/**
 * Deletes elements on `path`'s `page` by their 1-indexed `numInPage`
 * position (NOT uuid - confirmed against docs.supernote.com's delete-
 * elements page; `Element.numInPage`'s own doc comment flags
 * "starts from 1"). Used by the meeting-note-block feature to
 * remove whatever it inserted last time before inserting the fresh version
 * ("always regenerate" - docs/dev/history/technical-design-meeting-notes.md §5 step 2).
 */
export async function deleteElements(path: string, page: number, numsInPage: number[]): Promise<void> {
  await callHost<boolean>({
    name: 'deleteElements',
    permission: 'write',
    path,
    startArgs: [path, `page=${page}`, numsInPage],
    call: () => PluginFileAPI.deleteElements(path, page, numsInPage) as Promise<SdkResponse<boolean>>,
    ok: r => r.success && r.result !== false,
    failMessage: 'Could not delete the elements.',
    failArgs: [path],
    doneArgs: () => [path],
  });
}
