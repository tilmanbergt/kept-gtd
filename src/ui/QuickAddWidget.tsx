/**
 * The unified Todo/Meeting/Agreement/Note add-and-edit widget
 * (docs/dev/history/technical-design-unified-quickadd.md). Every screen has exactly
 * one add/edit surface: a box of 174 dp in every state
 * (ui/quickAdd/QuickAddFrame.tsx), holding Quick Add's form
 * (docs/dev/history/technical-design-quickadd-redesign.md §3.1-§3.4,
 * ui/quickAdd/form/):
 *   rows 1-2  one two-line field (the title stays one line of its file),
 *             with the text strip above the box and the date / time /
 *             valid-till strips over row 2;
 *   row 3     per kind: 📅 and w/f; date, time, the warning sign and F;
 *             valid till; the note's folder;
 *   row 4     📎 (or the linked file), the grey origin line, ✕ (create) and
 *             + Add / "+ Add to <Name>" / + Create, or Cancel · Save
 *             ("Save to <Name>" with an abbreviation tag).
 * The kind comes from the kind buttons (ui/quickAdd/KindButtons.tsx), shown
 * while the box is folded; ✕ folds it and keeps the draft. A `collapsible`
 * box starts folded and folds again after an add, the others start on Todo.
 *
 * A meeting, todo or agreement selected once shows its item card in the box
 * instead (`editTarget.mode === 'card'`, ui/itemCard/); delete, Refile, New
 * from this and M act there. A loop's own edit (no card) keeps Refile in row 4.
 *
 * The parts: one hook per draft (ui/quickAdd/useTaskDraft.ts,
 * useMeetingDraft.ts, useNoteDraft.ts, useAgreementDraft.ts) over the shared
 * state of ui/quickAdd/useQuickAddCore.ts; the edit session (loading, focus,
 * save-then-switch) in ui/quickAdd/useEditSession.ts; the form's slots in
 * ui/quickAdd/form/useFormSlots.tsx. The lasso capture panel is its own shell
 * over the same drafts (ui/quickAdd/CaptureQuickAdd.tsx).
 *
 * No key-remount: remounting would wipe the create drafts, so the widget is
 * a stable, long-lived instance per screen and call sites pass no `key`.
 * An edit detour never touches the drafts, and a kind switch never remounts
 * a field (they are hidden with `display: none`).
 *
 * Direct switches (docs/dev/history/technical-design-meeting-lists.md §10):
 * tapping another row while an edit is open switches to it. Before the
 * screen switches, it calls `flushEditRef.current()` (ui/useEditFlush.ts),
 * which saves the current target's changes - only if the fields differ from
 * what was loaded - and resolves false when that save failed, so the screen
 * stays on the current target and the error shows. Leaving the tab
 * (unmount) saves the same way. Drafts of new items are never saved
 * implicitly.
 *
 * "New from this" (docs/dev/technical-design-meeting-date-nudge-and-new-
 * from-this.md §B): on the meeting card; it ends the card through the
 * screen's own `onCancelEdit` and turns the meeting into the create draft.
 */
import React, {useEffect, useRef, useState} from 'react';
import {onNextEinkFlush} from '../utils/einkFlush';
import {Keyboard} from 'react-native';
import {AbbrevFileMatch, resolveAbbrevFileTarget} from '../domain/abbrev';
import {insertTagAtPosition} from '../domain/markdown';
import {normalizeTagSpacing} from '../domain/writing/tagCheck';
import {replacesLabel} from '../domain/agreementText';
import {formatMeetingWhen, todayIso} from '../domain/meetingTime';
import {meetingDisplayTitle} from '../domain/meetingTracking';
import {Destination} from '../domain/destination';
import {log} from '../utils/log';
import {usePerfRender} from '../utils/perf';
import MeetingCard from './itemCard/MeetingCard';
import {MeetingCardData} from './itemCard/useMeetingCard';
import AgreementCard from './itemCard/AgreementCard';
import {AgreementCardData} from './itemCard/useAgreementCard';
import TodoCard from './itemCard/TodoCard';
import {TodoCardData} from './itemCard/useTodoCard';
import {errorMessage} from '../utils/errorMessage';
import {CreateActions, EditActions, EditCommands} from './quickAdd/ActionRow';
import {AgreementHandlers, useAgreementDraft} from './quickAdd/useAgreementDraft';
import ProvenanceLine, {QuickAddAdds} from './quickAdd/ProvenanceLine';
import QuickAddFrame from './quickAdd/QuickAddFrame';
import KindButtons from './quickAdd/KindButtons';
import FrozenWhileHidden from './quickAdd/FrozenWhileHidden';
import {makeSuggest, recentAbbrevs, useFormSlots, useFormWidth} from './quickAdd/form/useFormSlots';
import {MeetingQuickAddFields, QuickAddEditTarget, QuickAddType, QuickFilePayload, sameEditTarget, truncateItemName} from './quickAdd/types';
import {DraftPrefill, MeetingSeed, useDraftRequests} from './quickAdd/useDraftRequests';
import {useEditSession} from './quickAdd/useEditSession';
import {useMeetingDraft} from './quickAdd/useMeetingDraft';
import {useNoteDraft} from './quickAdd/useNoteDraft';
import {useQuickAddCore} from './quickAdd/useQuickAddCore';
import {useQuickAddStatus} from './quickAdd/useQuickAddStatus';
import {useTaskDraft} from './quickAdd/useTaskDraft';
import {useThisFileChoice} from './quickAdd/useThisFileChoice';
import {useSource} from './quickAdd/useProvenance';
import {sourceKey} from '../domain/provenance';
import {resolvePaths} from '../domain/settings';
import {peekSettings} from '../storage/settingsSnapshot';

export type {CaptureSaveMode, CaptureSeed, MeetingQuickAddFields, QuickAddEditTarget, QuickFilePayload} from './quickAdd/types';
export {editTargetFor} from './quickAdd/types';

interface Props extends AgreementHandlers {
  /**
   * Optional id of the screen slot this widget sits in (e.g. 'daily',
   * 'current') - its tag-row widths are remembered under it, so a revisit
   * needs no re-measure render (docs/dev/history/technical-design-render-perf-ab.md §3
   * A2). Omitted: widths are measured fresh on every mount.
   */
  layoutKey?: string;
  /** Every add/edit goes to this one destination - no picker is ever shown (docs/dev/history/technical-design-filing-unification.md §7). */
  fixedDestination: Destination;
  /** Default false. When true, row 1 still renders both tabs (uniform shape everywhere), but Meeting is permanently greyed and non-interactive. */
  taskOnly?: boolean;
  /** Meeting create-mode default date (e.g. Daily's Today/Tomorrow toggle). Ignored while editing a meeting. */
  initialDate?: string;
  /** Meeting create-mode default for the "M" (month highlight) toggle - the Month view's day panel passes true. Ignored while editing. */
  initialMonthly?: boolean;
  /**
   * Whether a meeting dated `date` shows up in the list this screen is
   * currently displaying (Week: inside the displayed week; Daily: the shown
   * Today/Tomorrow tab's day). When given and it returns false for a
   * just-added meeting, the status-slot success message says where it went - `Added meeting "Team
   * sync" - next week` / `- tomorrow` / `- 09/28` (domain/dateLabel.ts) - so an
   * Add that legitimately lands off-screen is never mistaken for a lost one
   * (docs/dev/history/technical-design-cache-subscription-and-shared-add-path.md §C).
   * Omit on screens that list every meeting anyway (Inbox, Project/Area,
   * Review): no suffix, message unchanged.
   */
  isMeetingDateVisible?: (date: string) => boolean;

  /** `linkedFile`: the This-file line's choice (only with `thisFileLine`), already relative to the base folder where it lies inside it. */
  onAddTask: (text: string, destination: Destination, linkedFile?: string) => Promise<void>;
  onAddMeeting: (fields: MeetingQuickAddFields, destination: Destination, linkedFile?: string) => Promise<void>;
  /**
   * Create mode, Todo and Meeting tabs: offer the note or document Kept was opened from as the new
   * entry's linked file (ui/quickAdd/useThisFileChoice.ts, `📎 This file` on the strip). Set only where `onAddTask`/`onAddMeeting`
   * pass `linkedFile` on to the entry they build.
   */
  thisFileLine?: boolean;

  /** The item being edited, or null/absent (create mode). Build it with `editTargetFor`. */
  editTarget?: QuickAddEditTarget | null;
  /**
   * The selected meeting's card (ui/itemCard/useMeetingCard.ts), shown in the
   * box while `editTarget` is a meeting in 'card' mode. Where a screen passes
   * it, the meeting's edit form holds fields only: the commands are on the card.
   */
  meetingCard?: MeetingCardData | null;
  /** The selected todo's card (ui/itemCard/useTodoCard.ts), the same way: shown while `editTarget` is a todo in 'card' mode. */
  todoCard?: TodoCardData | null;
  /** A card that is not an item's (Week's and Month's owner card, ui/period/useOwnerCard.tsx): shown while there is no `editTarget`. */
  ownerCard?: React.ReactNode;
  /** Shown instead of the item's own card while `editTarget` is in 'card' mode (the Inbox card, ui/itemCard/InboxCard.tsx). */
  cardOverride?: React.ReactNode;
  /** The selected agreement's card (ui/itemCard/useAgreementCard.ts): shown while `editTarget` is an agreement in 'card' mode. */
  agreementCard?: AgreementCardData | null;
  /** Resolve `false` when the save failed (the screen showed its own error) - the widget then keeps the edit open. */
  onSaveEditTask?: (nextText: string, nextLinkedFile: string) => Promise<void | boolean>;
  onSaveEditMeeting?: (fields: MeetingQuickAddFields, nextLinkedFile: string) => Promise<void | boolean>;
  /**
   * Save-then-switch (docs/dev/history/technical-design-meeting-lists.md §10): the
   * widget puts a `flush()` here that saves pending edits of the current
   * target (only when something changed) and resolves whether the screen
   * may move on. ui/useEditFlush.ts wraps a screen's "start editing another
   * row" handlers with it.
   */
  flushEditRef?: React.MutableRefObject<(() => Promise<boolean>) | null>;
  onCancelEdit?: () => void;
  onDeleteEdit?: () => void;
  /** Renders the "Refile" button in edit mode when provided (storage/inboxFiling.ts's module doc comment) - arms the caller's own Files pane (Projects/Areas tabs) for the item currently being edited, same shape onDeleteEdit has. Only passed by screens with a Files pane to arm (Current tab, Inbox tab, Review's Inbox-to-zero step) - its absence (Daily, Review's week-ahead/stalled-project/neglected-area cards) is what makes those screens' edit mode show no Refile control at all, rather than a disabled one. */
  onRefile?: () => void;
  /**
   * Performs the abbreviation quick-file move directly (no Browse picker)
   * once a recognized #tag resolves to a registered Project/Area's
   * abbreviation, while editing an existing task/meeting - renders
   * "File: <Name>" in Refile's own Row 4 slot whenever a match is present,
   * independent of onRefile's own presence (so it also works on a screen
   * with no Files pane to arm, like Daily, which never passes onRefile at
   * all). Absent entirely (no fallback, no error) on a screen whose edit mode
   * doesn't support moving an item to a different file. See
   * `QuickFilePayload`'s own doc comment for why this also hands the caller
   * the fully-composed, tag-stripped current text/fields rather than just
   * the target.
   */
  onQuickFile?: (target: AbbrevFileMatch, payload: QuickFilePayload) => Promise<void>;
  /**
   * The REAL current location of the item being edited right now, for
   * resolveAbbrevFileTarget's self-exclude check - `null` when it's an Inbox
   * item (Inbox never carries an abbreviation, so it can never self-match
   * anyway). Omit this prop entirely on a screen where `fixedDestination`
   * already always names whatever's being edited (Current tab,
   * Review's Inbox-to-zero step - every one of those is either always
   * `{type: 'inbox'}` or always that Project/Area's own path): the exclude
   * check then derives it from `fixedDestination`. Daily is the one screen
   * where that fallback is wrong and this prop is required: Daily's
   * `fixedDestination` is always `{type: 'inbox'}` (its own create-mode
   * default, unrelated to any given entry), while the
   * DailyTaskEntry/DailyMeetingEntry actually being edited can live in
   * Inbox OR any Project/Area - passing this prop lets self-exclusion
   * check the entry's real path instead of always assuming Inbox (which
   * would otherwise show a same-place "File: <Name>" no-op button whenever
   * the tag typed while editing named the item's own current Project/Area).
   */
  editingItemPath?: string | null;
  /**
   * After an add filed through an abbreviation tag, the next draft starts with that tag
   * (docs/dev/history/technical-design-quickadd-redesign.md §3.5 F3). Only Daily passes it;
   * elsewhere the screen's own place is already where the next item goes.
   */
  prefillAbbrev?: boolean;
  linkedFileMissing?: boolean;

  /**
   * Renders Row 1's third "Note" mini-tab when passed - creates a
   * standalone, unlinked .note file (storage/standaloneNotes.ts) at
   * `noteFolderPath`. `title` is already tag-stripped; `tags` are the
   * `#tag` tokens the widget parsed back out of the typed title, to be
   * applied as real Supernote page-keywords. Absent entirely (no tab
   * rendered at all) on screens with no Files pane to source a destination
   * from (ui/quickAdd/useNoteDraft.ts).
   */
  onAddNote?: (title: string, tags: string[], folderPath: string) => Promise<void>;
  /**
   * Where a new Note would be created *right now* - the Files pane's
   * currently active location, `null` whenever its active root isn't the
   * item's own root ('Project Files'/'Area Files'). Re-read at the moment
   * "+Add" is pressed, not captured when the Note tab was opened. Ignored
   * when `onAddNote` isn't passed.
   */
  noteFolderPath?: string | null;

  /**
   * Appends text to the Todo or Meeting create draft and shows that tab, once
   * per nonce (ui/quickAdd/useDraftRequests.ts) - Gmail inbox review's
   * selected email text. Line breaks collapse to spaces; never touches
   * date/time/flow state or focuses a field (no soft keyboard on e-ink).
   */
  prefill?: DraftPrefill | null;
  /** "+ Next <type>": replaces the Meeting draft and shows the Meeting tab, once per nonce (ui/quickAdd/useDraftRequests.ts). */
  meetingSeed?: MeetingSeed | null;
  /** Create mode, Todo and Agreement tabs: one grey line saying what the screen adds to the new entry, a ✕ per part (ui/quickAdd/ProvenanceLine.tsx). */
  provenance?: QuickAddAdds | null;

  /** Create mode: "+ Add to <Name>" where the destination is not the screen's own (the context panel's meeting, §10 C4). A recognized abbreviation tag still wins. */
  addToName?: string;
  /** Shows the Todo tab whenever it changes to a new non-null value (the context panel's Quick Add, §10 C4). */
  showTodoKey?: string | null;

  /**
   * The box starts collapsed: R1 shows one button per kind (ui/quickAdd/KindButtons.tsx),
   * a tap opens that kind with the cursor in its field, ✕ collapses it again
   * (the draft is kept), and so does a successful add or the end of an edit
   * (docs/dev/history/technical-design-calmer-screens.md §3.2). The box keeps its height.
   */
  collapsible?: boolean;
  /** Todo field only; defaults to "New todo" everywhere. */
  placeholder?: string;
  textColor: string;
  borderColor: string;
  placeholderColor: string;
}

function QuickAddWidget(props: Props): React.JSX.Element {
  usePerfRender('QuickAddWidget');
  const {fixedDestination, editTarget, editingItemPath, taskOnly = false, onAddNote, noteFolderPath = null} = props;
  const {onCancelEdit, onQuickFile, onRefile, provenance, linkedFileMissing, meetingCard, todoCard} = props;
  const {textColor, borderColor, placeholderColor} = props;
  const colors = {textColor, borderColor, placeholderColor};

  // Every box folds to its kind buttons with ✕ - the form has no kind tabs
  // (docs/dev/history/technical-design-quickadd-redesign.md §3.1). A `collapsible` box starts folded
  // and folds again after an add; the others start on Todo and stay open after an add.
  const collapsible = !!props.collapsible;
  const core = useQuickAddCore({fixedDestination, editingItemPath, prefillAbbrev: !!props.prefillAbbrev, startOpen: collapsible ? null : 'task'});
  const {displayType, isEditing, editFields, pending, setError, setPending} = core;
  /** A collapsible box goes back to its kind buttons once an add succeeded (the message is in the status slot). */
  const collapseAfter =
    <A extends unknown[], R>(fn: (...args: A) => Promise<R>) =>
    async (...args: A): Promise<R> => {
      const result = await fn(...args);
      if (collapsible) core.setOpen(null);
      return result;
    };
  const thisFile = useThisFileChoice(!!props.thisFileLine && !isEditing);
  // Opened from a note, a new todo records it as its origin (`[source::]`, §3.7) - unless the screen
  // already names a meeting as its origin (the grey line's provenance part).
  const screenMeeting = !!provenance?.some(part => part.key === 'provenance');
  const launchNote = thisFile.targets?.kind === 'note' && !screenMeeting ? thisFile.targets.path : null;
  const launchSettings = launchNote ? peekSettings() : null;
  const source = useSource(launchNote && launchSettings ? sourceKey(launchNote, resolvePaths(launchSettings).base) : null);
  const addTaskWithSource = (text: string, destination: Destination, linkedFile?: string) =>
    props.onAddTask(source.apply(text), destination, linkedFile).then(result => {
      source.added();
      return result;
    });
  // The text strip's Suggest view (docs/dev/history/technical-design-quickadd-redesign.md §3.2), fitted to the box.
  const [formWidth, setFormWidth] = useFormWidth();
  const suggestContext = {
    thisFile: !!thisFile.targets && thisFile.mode === 'off' && !isEditing,
    recentTags: core.recentTags,
    abbrevs: recentAbbrevs(core.abbrevItems, core.recentTags),
  };
  const task = useTaskDraft(core, {
    fixedDestination,
    editingItemPath,
    editingLoop: editTarget?.kind === 'loop',
    loopsEnabled: true,
    onAddTask: collapseAfter(addTaskWithSource),
    linkedFileForAdd: thisFile.linkedFile,
    form: {suggest: makeSuggest('task', suggestContext, formWidth), onThisFile: thisFile.offer},
    onSaveEditTask: props.onSaveEditTask,
  });
  const meeting = useMeetingDraft(core, {
    fixedDestination,
    initialDate: props.initialDate,
    initialMonthly: props.initialMonthly,
    isMeetingDateVisible: props.isMeetingDateVisible,
    onAddMeeting: collapseAfter(props.onAddMeeting),
    linkedFileForAdd: thisFile.linkedFile,
    form: {suggest: makeSuggest('meeting', suggestContext, formWidth), onThisFile: thisFile.offer},
    onSaveEditMeeting: props.onSaveEditMeeting,
  });
  const note = useNoteDraft(core, {onAddNote: onAddNote && collapseAfter(onAddNote), noteFolderPath});
  const agreement = useAgreementDraft(core, {
    onAddAgreement: props.onAddAgreement && collapseAfter(props.onAddAgreement),
    onSaveEditAgreement: props.onSaveEditAgreement,
    onChangeAgreement: props.onChangeAgreement,
  });
  useEditSession(core, task, meeting, {editTarget, flushEditRef: props.flushEditRef, onCancelEdit, agreement});

  // A tab's rows are built once the tab is needed: shown (as the active tab or by an edit), or all of them
  // right after the page is on screen (the next e-ink flush; every page open asks for one), so the first
  // render builds one tab and a later tab switch finds its rows ready
  // (docs/dev/history/technical-design-perf-current-page.md §3.4). Built rows stay, hidden.
  const [allTabs, setAllTabs] = useState(false);
  useEffect(() => (allTabs ? undefined : onNextEinkFlush(() => setAllTabs(true))), [allTabs]);
  const needs = (type: QuickAddType) => allTabs || displayType === type;

  useDraftRequests(props.prefill, props.meetingSeed, isEditing, {
    text: (kind, addition) => {
      const appendTo = (current: string): string => (current.trim() ? `${current.replace(/\s+$/, '')} ${addition}` : addition);
      if (kind === 'meeting') {
        if (!taskOnly) {
          meeting.showDraft({...meeting.draft, title: normalizeTagSpacing(appendTo(meeting.draft.title))}, null);
          core.setOpen('meeting');
        }
        return;
      }
      core.setOpen('task');
      task.setDraft(d => ({...d, text: normalizeTagSpacing(appendTo(d.text))}));
      task.lastSelectionRef.current = null;
      task.setJustAdded(null);
      task.setTagPage(0);
      core.setActiveType('task');
      setError(null);
    },
    seed: fields => {
      if (taskOnly) return;
      meeting.showDraft({title: fields.title, date: fields.date, time: formatMeetingWhen(fields), monthly: false, focusBlock: fields.focusBlock === true}, null);
      core.setOpen('meeting');
    },
  });

  // The end of an edit or card collapses the box (it opens again from the kind buttons), unless the
  // edit ended into a create draft (New from this: `openAfterEditRef`).
  const hasEditTarget = !!editTarget;
  const hadEditTargetRef = useRef(hasEditTarget);
  const openAfterEditRef = useRef<QuickAddType | null>(null);
  useEffect(() => {
    if (hadEditTargetRef.current && !hasEditTarget) core.setOpen(openAfterEditRef.current ?? (collapsible ? null : core.activeType));
    if (!hasEditTarget) openAfterEditRef.current = null;
    hadEditTargetRef.current = hasEditTarget;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when an edit target comes or goes
  }, [hasEditTarget]);

  const showTodoKey = props.showTodoKey ?? null;
  useEffect(() => {
    if (showTodoKey !== null && !isEditing) {
      core.setActiveType('task');
      core.setOpen('task');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the key changes
  }, [showTodoKey]);

  // A kind button: that kind in the box, then the cursor in its field once the rows are shown.
  const [focusRequest, setFocusRequest] = useState(0);
  const openKind = (type: QuickAddType) => {
    core.setActiveType(type);
    core.setOpen(type);
    setFocusRequest(n => n + 1);
  };
  useEffect(() => {
    if (focusRequest === 0) return;
    if (displayType === 'task') task.inputRef.current?.focus();
    else if (displayType === 'meeting') meeting.inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per request
  }, [focusRequest]);
  /**
   * ✕ next to the main button (docs/dev/history/technical-design-quickadd-redesign.md §11, G5): a new
   * item's draft goes and the box folds; an edit's changes go and its card shows again (or the edit
   * ends where there is no card). Only leaving by another tap keeps and saves what was started.
   */
  const closeForm = () => {
    Keyboard.dismiss();
    if (isEditing) {
      const card = editFields?.kind === 'task' ? todoCard : editFields?.kind === 'meeting' ? meetingCard : null;
      log(`QuickAdd: close editing=true toCard=${!!card?.onBackToCard}`);
      (card?.onBackToCard ?? onCancelEdit)?.();
      return;
    }
    log(`QuickAdd: close kind=${displayType} draft dropped`);
    if (displayType === 'task') task.resetAfterAdd();
    else if (displayType === 'meeting') meeting.resetDraft();
    else if (displayType === 'note') note.resetDraft();
    else if (displayType === 'agreement') agreement.reset();
    thisFile.setMode('off');
    core.setOpen(null);
  };

  // Note has no filing concept - never matched.
  const abbrevTarget = displayType === 'task' ? task.abbrevTarget : displayType === 'meeting' ? meeting.abbrevTarget : null;

  /**
   * Edit-mode quick-file: hands the screen the fields composed exactly the
   * way Save composes them, so every other change made during this edit
   * (text, flow state, due, time, a pending linked-file pick) moves along
   * instead of the last-saved copy; the matched abbreviation tag is
   * additionally stripped.
   */
  const handleQuickFile = () => {
    if (!abbrevTarget || !onQuickFile || !editFields) return;
    Keyboard.dismiss();
    const composed = editFields.kind === 'task' ? task.quickFilePayload(abbrevTarget) : meeting.quickFilePayload(abbrevTarget);
    if (!composed) return;
    setError(null);
    setPending(true);
    onQuickFile(abbrevTarget, composed.payload)
      .then(() => core.recordTags(composed.tags))
      .catch(e => setError(errorMessage(e)))
      .finally(() => setPending(false));
  };

  /**
   * "New from this" - Meeting edit mode only. The edit form's CURRENT values
   * (unsaved tweaks included) become the Meeting create draft, and the edit
   * ends through the screen's own onCancelEdit (nothing saved, original
   * untouched). Not carried over: the linked file and the #prepped/#reviewed
   * tick tags (meetingDisplayTitle strips them), nor M.
   *
   * When the original lives somewhere other than where this widget creates
   * (Daily and Week create in Inbox), its Project/Area abbreviation tag is
   * appended to the draft title - resolveAbbrevFileTarget then matches it,
   * R4 shows "+ Add to <Name>", and the user can override by deleting the
   * tag. Only when the tag will resolve (an abbreviation, Active/On Hold)
   * and the title carries no recognized abbreviation of its own.
   *
   * All state changes happen in one event handler (one batched render), and
   * the draft is set BEFORE the edit ends, so no frame shows an empty draft.
   */
  const newFromThis = (fields: {title: string; date: string; time: string}) => {
    if (!onCancelEdit) return;
    Keyboard.dismiss();
    log('QuickAddWidget: new from this', {fromCard: editTarget?.mode === 'card', tabBefore: core.activeType});
    const displayTitle = meetingDisplayTitle({title: fields.title});
    let draftTitle = displayTitle;
    const {fixedExcludePath, abbrevItems} = core;
    const originPath = editingItemPath !== undefined ? editingItemPath : fixedExcludePath;
    const origin = originPath && originPath !== fixedExcludePath ? abbrevItems.find(item => item.path === originPath) : undefined;
    if (
      origin?.abbrev &&
      (origin.status === 'active' || origin.status === 'on-hold') &&
      !resolveAbbrevFileTarget(displayTitle, abbrevItems, fixedExcludePath)
    ) {
      draftTitle = insertTagAtPosition(displayTitle, origin.abbrev, null).text;
    }
    meeting.showDraft(
      {title: draftTitle, date: fields.date, time: fields.time, monthly: false, focusBlock: false},
      `Copied "${truncateItemName(displayTitle, 16)}" - adjust, then Add`,
    );
    openAfterEditRef.current = 'meeting';
    core.setOpen('meeting');
    onCancelEdit();
  };

  /**
   * `+ Todo` / `+ Meeting` on a card (docs/dev/history/technical-design-quickadd-redesign.md
   * §3.5): the card closes and the form of that kind opens for the same place. On Daily
   * (`prefillAbbrev`) the draft starts with the card owner's abbreviation tag; elsewhere the
   * screen's own place already is that place.
   */
  const newFromCard = (kind: 'task' | 'meeting') => {
    if (!onCancelEdit) return;
    const owner = props.prefillAbbrev && editingItemPath ? core.abbrevItems.find(i => i.path === editingItemPath) : undefined;
    const prefill = owner?.abbrev && (owner.status === 'active' || owner.status === 'on-hold') ? `#${owner.abbrev} ` : '';
    log(`QuickAddWidget: card new kind=${kind} prefill=${prefill ? 'abbrev' : 'none'}`);
    if (kind === 'task') task.setDraft(d => ({...d, text: prefill || d.text}));
    else meeting.setDraft(d => ({...d, title: prefill || d.title}));
    core.setActiveType(kind);
    openAfterEditRef.current = kind;
    setFocusRequest(n => n + 1);
    onCancelEdit();
  };

  const buttonMark = useQuickAddStatus(core, task, meeting, note, agreement);

  const loopMode = task.loopMode;
  // A recognized abbreviation tag while editing: Save files the item there
  // in the same step (technical-design-item-card.md K3).
  const saveTo = onQuickFile && abbrevTarget && loopMode.kind !== 'make' && loopMode.kind !== 'loop' ? abbrevTarget : null;
  const actions = isEditing ? (
    <EditActions
      pending={pending}
      saveLabel={
        agreement.changing
          ? '+ Add'
          : loopMode.kind === 'make'
            ? 'Make loop'
            : loopMode.kind === 'loop'
              ? 'Save loop'
              : saveTo
                ? `Save to ${truncateItemName(saveTo.name)}`
                : 'Save'
      }
      onSave={
        editFields?.kind === 'agreement' ? agreement.submitEdit : saveTo ? handleQuickFile : editFields?.kind === 'meeting' ? meeting.submitEdit : task.submitEdit
      }
      errorOnSave={!!core.errorState && core.errorState.field === null}
      textColor={textColor}
    />
  ) : (
    <CreateActions
      label={
        displayType === 'note'
          ? '+ Create'
          : loopMode.kind === 'add' && displayType === 'task'
            ? '+ Add loop'
            : abbrevTarget
              ? `+ Add to ${truncateItemName(abbrevTarget.name)}`
              : props.addToName
                ? `+ Add to ${truncateItemName(props.addToName)}`
                : '+ Add'
      }
      onPress={
        displayType === 'meeting'
          ? meeting.submitCreate
          : displayType === 'note'
            ? note.submitCreate
            : displayType === 'agreement'
              ? agreement.submitCreate
              : task.submitCreate
      }
      disabled={pending || (displayType === 'task' && loopMode.kind === 'exists')}
      mark={buttonMark}
      textColor={textColor}
    />
  );

  const editKind = editFields?.kind ?? null;
  const collapsed = core.open === null && !isEditing && !editTarget;
  // The item card in the box's place: a meeting selected once, where the screen passes its card.
  const cardShown =
    editTarget?.mode === 'card' &&
    ((editTarget.kind === 'meeting' && !!meetingCard) || (editTarget.kind === 'task' && !!todoCard) || (editTarget.kind === 'agreement' && !!props.agreementCard));
  // The rows go hidden/shown with the card - part of the title-field diagnosis (ui/quickAdd/layoutLog.ts).
  const cardKind = cardShown ? editTarget?.kind ?? null : null;
  useEffect(() => {
    log('QuickAddWidget: card', cardKind ? 'shown' : 'hidden', {kind: cardKind});
  }, [cardKind]);
  // Delete, Refile, New from this and M act on the card (docs/dev/history/technical-design-quickadd-redesign.md
  // §3.4, C2). A loop's own edit (the loop overview) has no card: it keeps them in row 4.
  const loopCommands =
    editKind === 'task' && editTarget?.kind === 'loop' ? (
      <EditCommands
        pending={pending}
        onRefile={
          onRefile && !saveTo
            ? () => {
                Keyboard.dismiss();
                onRefile();
              }
            : undefined
        }
        textColor={textColor}
        borderColor={borderColor}
      />
    ) : null;
  // The grey origin line while creating (what the screen adds, B5); "↳ replaces …" while changing an agreement.
  const originParts = [...(provenance ?? []), ...(source.part ? [source.part] : [])];
  const provenanceLine = originParts.length > 0 && !isEditing ? <ProvenanceLine parts={originParts} textColor={textColor} /> : undefined;
  // A meeting records no source (meeting lines have no trailing fields): its line shows only what the screen adds.
  const meetingOriginLine = provenance && provenance.length > 0 && !isEditing ? <ProvenanceLine parts={provenance} textColor={textColor} /> : undefined;
  const replaces = editTarget?.kind === 'agreementChange' ? editTarget.replaces.agreement : null;
  const agreementOrigin =
    replaces && agreement.changing ? (
      <ProvenanceLine parts={[{key: 'replaces', label: replacesLabel(replaces), onClear: () => onCancelEdit?.()}]} textColor={textColor} />
    ) : (
      meetingOriginLine
    );
  const today = todayIso();
  // Nobody sees the form behind a card or in the collapsed box: its re-renders are skipped then.
  const rowsHidden = collapsed || cardShown || (!editTarget && !!props.ownerCard) || (editTarget?.mode === 'card' && !!props.cardOverride);
  const formSlots = useFormSlots({
    core,
    task,
    meeting,
    note,
    agreement,
    needs,
    rowsHidden,
    main: actions,
    onClose: closeForm,
    origin: {task: loopCommands ?? provenanceLine, meeting: meetingOriginLine, agreement: agreementOrigin},
    createFile: {linkedFile: thisFile.label, onClear: () => thisFile.setMode('off')},
    linkedFileMissing,
    noteFolder: noteFolderLabel(noteFolderPath),
    today,
    placeholder: props.placeholder,
    onFieldLayout: setFormWidth,
    ...colors,
  });

  return (
    <QuickAddFrame
      collapsed={collapsed}
      row1={
        <KindButtons
          hasAgreement={!!props.onAddAgreement}
          hasNote={!!onAddNote}
          taskOnly={taskOnly}
          noteFolderPath={noteFolderPath}
          onOpen={openKind}
          textColor={textColor}
          borderColor={borderColor}
        />
      }
      form={{
        field: (
          <FrozenWhileHidden hidden={rowsHidden} buildKey={allTabs}>
            {formSlots.field}
          </FrozenWhileHidden>
        ),
        row3: (
          <FrozenWhileHidden hidden={rowsHidden} buildKey={allTabs}>
            {formSlots.row3}
          </FrozenWhileHidden>
        ),
        row4: formSlots.row4,
      }}
      card={
        !editTarget && props.ownerCard ? props.ownerCard : editTarget?.mode === 'card' && props.cardOverride ? props.cardOverride : !cardShown ? null : editTarget?.kind === 'agreement' && props.agreementCard ? (
          <AgreementCard card={props.agreementCard} textColor={textColor} borderColor={borderColor} />
        ) : editTarget?.kind === 'task' && todoCard ? (
          <TodoCard key={editTarget.key ?? ''} card={todoCard} onNewTodo={onCancelEdit ? () => newFromCard('task') : undefined} textColor={textColor} borderColor={borderColor} />
        ) : meetingCard ? (
          <MeetingCard
            key={editTarget?.key ?? ''}
            card={meetingCard}
            onNewFromThis={() =>
              newFromThis({title: meetingCard.meeting.title, date: meetingCard.meeting.date, time: formatMeetingWhen(meetingCard.meeting)})
            }
            onNewMeeting={onCancelEdit && !taskOnly ? () => newFromCard('meeting') : undefined}
            textColor={textColor}
            borderColor={borderColor}
          />
        ) : null
      }
      borderColor={borderColor}
    />
  );
}

/** The folder a new note lands in, below the Note root: `Projects/Garden renovation/Notes`. */
function noteFolderLabel(path: string | null): string | null {
  if (!path) return null;
  const at = path.indexOf('/Note/');
  return (at >= 0 ? path.slice(at + '/Note/'.length) : path).replace(/\/$/, '') || null;
}

/** React.memo's prop check: shallow, except that an edit target counts as equal when it names the same item. */
function sameProps(prev: Props, next: Props): boolean {
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)] as Array<keyof Props>);
  for (const key of keys) {
    if (key === 'editTarget' ? !sameEditTarget(prev.editTarget, next.editTarget) : prev[key] !== next[key]) return false;
  }
  return true;
}

/**
 * Memoized (docs/dev/history/technical-design-render-perf-ab.md §3 B2): re-renders only
 * when its props change. Call sites pass stable callbacks
 * (ui/useStableCallback.ts); an unstable prop somewhere only means the memo
 * doesn't skip there, never a stale render.
 */
export default React.memo(QuickAddWidget, sameProps);
