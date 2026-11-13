/**
 * The writing help of one Quick Add field (docs/dev/history/technical-design-writing-help.md
 * §1, §3.4): wraps the field's change handler, checks what recognition just
 * wrote, and keeps what the strip (ui/writing/WritingStrip.tsx) shows.
 *
 * - Every change goes through `onChangeText`. A text field gets
 *   `normalizeTagSpacing` first; then the inserted part is found. Only a
 *   burst (more than one character - recognition or Paste) is checked, or a
 *   typed space or punctuation that ends a tag. Learned corrections and the
 *   one valid reading of a date or time are applied here, visibly ("read as
 *   …") and with Undo; everything else waits for a tap.
 * - Completion (docs/dev/history/technical-design-quickadd-redesign.md §3.2
 *   F2): whenever the cursor rests right after an unfinished tag - after a
 *   typed character, a burst, or a touch that puts the cursor there - and
 *   known tags complete it, the strip offers them (a flagged fix still comes
 *   first, as everywhere in the strip).
 * - Unanswered flagged tags (`fixes`) stay until they are answered (→, Keep),
 *   or the tag has left the text. The other states are a *moment*:
 *   a touch in the field (a selection change that is not the change's own),
 *   the next focus or the next burst ends it. No timer anywhere.
 * - `confirmAdd` is the Add-twice rule (§1.4): the first + Add with an
 *   unanswered fix shows it and asks in the status slot; the second saves.
 *
 * The selection lives in the draft's ref (domain/clipboardText.ts says why);
 * this hook only reads it and sets the one-render override after a change.
 * Logs counts and kinds only - tags and dates are names (§3.8).
 */
import {MutableRefObject, RefObject, useEffect, useRef, useState} from 'react';
import {TextInput} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {NoteSetup} from '../../domain/noteSetups';
import {insertStarter, StarterKind, starterOptions, startersOffered} from '../../domain/writing/starters';
import {StripView, SuggestOption} from '../../domain/writing/stripContent';
import {Selection} from '../../domain/clipboardText';
import {formatFullDate, formatTimeSpan} from '../../domain/dateFormat';
import {tagSpans} from '../../domain/markdown';
import {parseMeetingWhen, todayIso} from '../../domain/meetingTime';
import {applyCompletion, completions, UnfinishedTag, unfinishedTagAt} from '../../domain/writing/completion';
import {insertedSpan, isBurst, tagsEndedBy} from '../../domain/writing/insertion';
import {UsualSlot} from '../../domain/writing/meetingHints';
import {readDate, readTime} from '../../domain/writing/readDateTime';
import {
  addAgainHint,
  MAX_SHOWN_FIXES,
  PendingFix,
  PagePlace,
  placeFeedback,
  readAsLabel,
  StripContent,
  stripContent,
  StripField,
  StripMoment,
  timeLabel,
} from '../../domain/writing/stripContent';
import {checkTags, normalizeTagSpacing, replaceTag, TagFinding} from '../../domain/writing/tagCheck';
import {currentKnownTagIndex} from '../../storage/knownTagIndex';
import {forgetFix, getLearnedFixesSync, learnFix, loadLearnedFixes} from '../../storage/learnedTagFixes';
import {errorMessage} from '../../utils/errorMessage';
import {log, logWarn} from '../../utils/log';
import {useStatus} from '../status/StatusProvider';

export interface WritingHelpOptions {
  field: StripField;
  /** The field's text as shown. */
  value: string;
  /** Puts `text` into the draft as it is - the help has done its part. */
  write: (text: string) => void;
  selectionRef: MutableRefObject<Selection>;
  setSelectionOverride: (selection: Selection) => void;
  /** Focused again after a tap on the strip, so the strip stays and writing goes on. */
  inputRef?: RefObject<TextInput | null>;
  recentTags?: readonly string[];
  /** Where the item's page would go with `text` (§1.7); null when that is not known. */
  place?: (text: string) => PagePlace | null;
  /** A meeting's date and time strips: past or overlap. */
  warning?: string | null;
  /** A meeting's usual slot, offered while the field is empty. */
  usual?: UsualSlot | null;
  /** Fills date, time and end from the usual slot. */
  onUsual?: (slot: UsualSlot) => void;
  /**
   * An empty title field in create mode: the Note setups its Thread and Loop
   * starters come from (docs/dev/history/technical-design-calmer-screens.md §3.3);
   * null or absent: no starters (edit mode, the other fields).
   */
  starterSetups?: readonly NoteSetup[] | null;
  /**
   * Quick Add's form (docs/dev/history/technical-design-quickadd-redesign.md §3.2): the
   * Suggest view's options for the text as it is, fitted to the strip. Absent: no
   * Suggest view (the note title, the agreement words, the capture panel).
   */
  suggest?: (text: string) => SuggestOption[];
  /** 📎 This file in the Suggest view: links the file Kept was opened from. */
  onThisFile?: () => void;
}

export interface WritingStripActions {
  apply: (index: number) => void;
  keep: () => void;
  edit: () => void;
  undo: () => void;
  choose: (value: string) => void;
  complete: (tag: string) => void;
  usual: () => void;
  /** Thread or Loop on an empty field: their list. */
  starter: (kind: StarterKind) => void;
  /** A tag of the list: inserted at the cursor. */
  insertStarter: (insert: string) => void;
  /** ‹ on the list: back to the starters. */
  back: () => void;
  /** A Suggest option: a tag inserted at the cursor, or This file linked. */
  suggest: (option: SuggestOption) => void;
  /** The square before ✕: Suggest ⇄ Clipboard. */
  toggleView: () => void;
}

/** Whether the clipboard holds text (hasString where the module has it). */
function clipboardHasText(): Promise<boolean> {
  const module = Clipboard as unknown as {hasString?: () => Promise<boolean>; getString: () => Promise<string>};
  return typeof module.hasString === 'function' ? module.hasString() : module.getString().then(text => text.length > 0);
}

const NO_RECENT: readonly string[] = [];
let nextHelpInstance = 0;

/** The fixes still in `text`, in text order, at most two. */
function liveFixes(pending: readonly PendingFix[], text: string): PendingFix[] {
  if (pending.length === 0) return [];
  const spans = tagSpans(text);
  const at = (fix: PendingFix) => spans.find(t => t.tag === fix.written)?.start ?? -1;
  return pending
    .filter(f => at(f) >= 0)
    .sort((a, b) => at(a) - at(b))
    .slice(0, MAX_SHOWN_FIXES);
}

/** Merges new fixes into the pending ones, unique by written tag, in text order. */
function mergeFixes(pending: readonly PendingFix[], found: readonly TagFinding[], text: string): PendingFix[] {
  const all = [...pending];
  for (const f of found) if (f.suggestion && !all.some(p => p.written === f.written)) all.push({written: f.written, suggestion: f.suggestion});
  return liveFixes(all, text);
}

/** The choice label of a time or date field text. */
function choiceLabel(field: StripField, value: string): string {
  if (field === 'date') return formatFullDate(value);
  const parsed = parseMeetingWhen(value);
  return parsed.ok && parsed.value.time ? formatTimeSpan(parsed.value.time, parsed.value.endTime) : value;
}

export function useWritingHelp(options: WritingHelpOptions) {
  const {field, value, write, selectionRef, setSelectionOverride, inputRef} = options;
  const [moment, setMoment] = useState<StripMoment | null>(null);
  const [pending, setPending] = useState<PendingFix[]>([]);
  const [showClipboard, setShowClipboard] = useState(false);
  // The form's resting view: Suggest, Clipboard while text is selected or after the square.
  const [view, setViewState] = useState<StripView>('suggest');
  const setView = (next: StripView) => {
    if (next === view) return;
    log(`writing: strip view=${next} field=${field}`);
    setViewState(next);
  };
  const [hint, setHint] = useState<string | null>(null);
  const keptRef = useRef(new Set<string>());
  const undoRef = useRef<{text: string; forget: string[]} | null>(null);
  const completionRef = useRef<UnfinishedTag | null>(null);
  // The cursor right after the change that started the moment: a selection
  // change to anywhere else is a touch, and ends the moment.
  const momentCursorRef = useRef<number | null>(null);
  const askedRef = useRef(false);
  const statusId = useRef(`writing.${++nextHelpInstance}`).current;
  // Paste among the starters: read once per focus (§3.3), never polled.
  const [clipText, setClipText] = useState(false);
  const starterSetups = options.starterSetups ?? null;
  useStatus(statusId, hint ? {kind: 'info', text: hint, onDismiss: () => setHint(null)} : null);

  // The learned corrections are read when the field mounts, before the first burst.
  useEffect(() => {
    if (field !== 'text') return;
    loadLearnedFixes(true).catch(e => logWarn('writing: learned fixes not loaded', errorMessage(e)));
  }, [field]);

  const fixes = liveFixes(pending, value);

  const moveCursor = (cursor: number) => {
    const selection = {start: cursor, end: cursor};
    selectionRef.current = selection;
    setSelectionOverride(selection);
  };
  const startMoment = (next: StripMoment | null, cursor: number | null) => {
    momentCursorRef.current = cursor;
    setMoment(next);
  };
  const refocus = () => {
    const input = inputRef?.current;
    if (input && !input.isFocused?.()) input.focus();
  };

  /**
   * Offers the completions of the unfinished tag right before `cursor` (F2); false - and nothing
   * started - when there is none or no known tag completes it.
   */
  const offerCompletion = (text: string, cursor: number | null, at: 'rest' | 'burst'): boolean => {
    if (field !== 'text' || cursor === null) return false;
    const unfinished = unfinishedTagAt(text, cursor);
    const offered = unfinished ? completions(unfinished.token, currentKnownTagIndex(options.recentTags ?? NO_RECENT)) : [];
    if (!unfinished || offered.length === 0) return false;
    if (moment?.kind !== 'complete') log(`writing: complete at=${at} n=${offered.length}`);
    completionRef.current = unfinished;
    setShowClipboard(false);
    startMoment({kind: 'complete', token: unfinished.token, options: offered}, cursor);
    return true;
  };

  /** The feedback line for `text` (§1.7), or null without a place. */
  const feedbackFor = (text: string): StripMoment | null => {
    const place = options.place?.(text);
    if (!place) return null;
    return {kind: 'feedback', text: placeFeedback(place)};
  };

  const changeText = (next: string, span: ReturnType<typeof insertedSpan>) => {
    const burst = isBurst(span);
    const checked = burst && span ? [span] : tagsEndedBy(next, span);
    if (checked.length === 0) {
      write(next);
      // A typed character: the cursor rests after it.
      if (!offerCompletion(next, span ? span.end : null, 'rest') && moment) startMoment(null, null);
      return;
    }
    const index = currentKnownTagIndex(options.recentTags ?? NO_RECENT);
    const found = checked.flatMap(s => checkTags(next, s, index, keptRef.current, getLearnedFixesSync()));
    const learned = found.filter(f => f.kind === 'learned');
    let text = next;
    for (const f of [...learned].reverse()) text = replaceTag(text, f, f.suggestion ?? f.written).text;
    const flagged = found.filter(f => f.kind === 'fix');
    const tagCount = tagSpans(next).filter(t => checked.some(s => t.end > s.start && t.start < s.end)).length;
    if (burst && span) log(`writing: burst len=${span.end - span.start} tags=${tagCount} fix=${flagged.length} learned=${learned.length}`);
    write(text);
    // After what was inserted: a burst's end, or the typed space or punctuation that ended the tag.
    const end = Math.max(span ? span.end : 0, checked[checked.length - 1].end);
    const cursor = end + (text.length - next.length);
    if (learned.length > 0) moveCursor(cursor);
    const merged = mergeFixes(pending, flagged, text);
    if (flagged.length > 0) {
      setPending(merged);
      setShowClipboard(false);
      log(`writing: strip fixes n=${merged.length}`);
    }
    if (learned.length > 0) {
      undoRef.current = {text: next, forget: learned.map(f => f.written)};
      startMoment({kind: 'read', label: readAsLabel(learned.map(f => `#${f.suggestion}`).join(' '))}, cursor);
      return;
    }
    if (burst && offerCompletion(text, cursor, 'burst')) return;
    startMoment(merged.length === 0 && tagCount > 0 ? feedbackFor(text) : null, cursor);
  };

  const changeDateTime = (next: string, span: ReturnType<typeof insertedSpan>) => {
    if (!isBurst(span)) {
      if (moment) startMoment(null, null);
      write(next);
      return;
    }
    const reading = field === 'date' ? readDate(next, todayIso(new Date())) : readTime(next);
    log(`writing: burst field=${field} reading=${reading.kind}`);
    if (reading.kind === 'read') {
      write(reading.value);
      undoRef.current = {text: next, forget: []};
      const what = field === 'date' ? formatFullDate(reading.value) : timeLabel(reading.value) ?? reading.value;
      startMoment({kind: 'read', label: readAsLabel(what)}, reading.value.length);
      moveCursor(reading.value.length);
      return;
    }
    write(next);
    if (reading.kind === 'choice') {
      startMoment({kind: 'choice', options: reading.values.map(v => ({value: v, label: choiceLabel(field, v)}))}, span ? span.end : null);
    } else if (moment) startMoment(null, null);
  };

  const onChangeText = (raw: string) => {
    const next = field === 'text' ? normalizeTagSpacing(raw) : raw;
    const span = insertedSpan(value, next);
    askedRef.current = false;
    if (hint) setHint(null);
    if (isBurst(span) && showClipboard) setShowClipboard(false);
    if (field === 'text') changeText(next, span);
    else changeDateTime(next, span);
  };

  /**
   * A touch in the field ends a moment; the change's own selection does not. A cursor that comes
   * to rest right after an unfinished tag offers its completions (F2).
   */
  const onSelectionChange = (selection: Selection) => {
    if (!selection) return;
    const collapsed = selection.start === selection.end;
    // A selection shows the clipboard view; when it ends, the suggestions come back.
    if (options.suggest) setView(collapsed ? 'suggest' : 'clipboard');
    if (moment && collapsed && selection.start === momentCursorRef.current) return;
    if (collapsed && fixes.length === 0 && offerCompletion(value, selection.start, 'rest')) return;
    if (moment) startMoment(null, null);
  };

  /** A new focus starts at rest (the strip was hidden while the field had none). */
  const onFocus = () => {
    if (moment) startMoment(null, null);
    if (showClipboard) setShowClipboard(false);
    if (starterSetups) {
      clipboardHasText()
        .then(setClipText)
        .catch(e => logWarn('writing: clipboard not readable', errorMessage(e)));
    }
  };

  const actions: WritingStripActions = {
    apply: i => {
      const fix = fixes[i];
      // Every place the tag is written so is the same tag: one tap fixes them all.
      const spots = fix ? tagSpans(value).filter(t => t.tag === fix.written) : [];
      if (!fix || spots.length === 0) return;
      log(`writing: tap apply n=${spots.length}`);
      let text = value;
      for (const at of [...spots].reverse()) text = replaceTag(text, at, fix.suggestion).text;
      const last = spots[spots.length - 1];
      const cursor = last.start + 1 + fix.suggestion.length + (text.length - value.length) - (fix.suggestion.length - last.tag.length);
      write(text);
      moveCursor(cursor);
      learnFix(fix.written, fix.suggestion).catch(e => logWarn('writing: learning a fix failed', errorMessage(e)));
      const rest = pending.filter(p => p.written !== fix.written);
      setPending(rest);
      if (liveFixes(rest, text).length === 0) startMoment(feedbackFor(text), cursor);
      refocus();
    },
    keep: () => {
      log(`writing: tap keep n=${fixes.length}`);
      for (const f of fixes) keptRef.current.add(f.written.toLowerCase());
      setPending([]);
      startMoment(feedbackFor(value), selectionRef.current?.end ?? null);
      refocus();
    },
    edit: () => {
      log('writing: tap edit');
      setShowClipboard(true);
      refocus();
    },
    undo: () => {
      const undo = undoRef.current;
      if (!undo) return;
      log('writing: tap undo');
      undoRef.current = null;
      write(undo.text);
      for (const from of undo.forget) {
        keptRef.current.add(from.toLowerCase());
        forgetFix(from).catch(e => logWarn('writing: forgetting a fix failed', errorMessage(e)));
      }
      moveCursor(undo.text.length);
      startMoment(null, null);
      refocus();
    },
    choose: next => {
      log('writing: tap choose');
      write(next);
      moveCursor(next.length);
      startMoment(null, null);
      refocus();
    },
    complete: tag => {
      const unfinished = completionRef.current;
      if (!unfinished) return;
      log('writing: tap complete');
      const {text, cursor} = applyCompletion(value, unfinished, tag);
      write(text);
      moveCursor(cursor);
      startMoment(null, null);
      refocus();
    },
    usual: () => {
      if (!options.usual || !options.onUsual) return;
      log('writing: tap usual');
      options.onUsual(options.usual);
    },
    starter: kind => {
      const list = starterOptions(starterSetups ?? [], kind);
      log(`writing: starters kind=${kind} n=${list.length}`);
      startMoment({kind: 'starterList', options: list}, selectionRef.current?.end ?? null);
      refocus();
    },
    insertStarter: insert => {
      log('writing: tap starter');
      const {text, cursor} = insertStarter(value, selectionRef.current?.end ?? null, insert);
      write(text);
      moveCursor(cursor);
      // The tag's counterparts or loops follow, as after a recognized `type/`.
      const unfinished = unfinishedTagAt(text, cursor);
      const offered = unfinished ? completions(unfinished.token, currentKnownTagIndex(options.recentTags ?? NO_RECENT)) : [];
      if (unfinished && offered.length > 0) {
        completionRef.current = unfinished;
        startMoment({kind: 'complete', token: unfinished.token, options: offered}, cursor);
      } else startMoment(null, null);
      refocus();
    },
    back: () => {
      startMoment(null, null);
      refocus();
    },
    suggest: option => {
      if (option.kind === 'thisFile') {
        log('writing: tap suggest kind=thisFile');
        options.onThisFile?.();
        refocus();
        return;
      }
      log('writing: tap suggest kind=tag');
      const {text, cursor} = insertStarter(value, selectionRef.current?.end ?? null, `#${option.tag} `);
      write(text);
      moveCursor(cursor);
      startMoment(null, null);
      refocus();
    },
    toggleView: () => {
      // The clipboard square of a fix, a completion or the place line shows the clipboard over
      // either view: the bolt then goes back to the suggestions.
      if (showClipboard) {
        setShowClipboard(false);
        setView('suggest');
      } else setView(view === 'suggest' ? 'clipboard' : 'suggest');
      refocus();
    },
  };

  /**
   * The Add-twice rule (§1.4): false - and the fixes and the hint shown - for
   * the first + Add while a tag of the text is flagged; true otherwise.
   */
  const confirmAdd = (): boolean => {
    if (field !== 'text') return true;
    if (askedRef.current) {
      askedRef.current = false;
      setHint(null);
      return true;
    }
    const index = currentKnownTagIndex(options.recentTags ?? NO_RECENT);
    const flagged = checkTags(value, null, index, keptRef.current, getLearnedFixesSync()).filter(f => f.kind === 'fix');
    if (flagged.length === 0) return true;
    const merged = mergeFixes(pending, flagged, value);
    askedRef.current = true;
    setPending(merged);
    setShowClipboard(false);
    setHint(addAgainHint(merged));
    log(`writing: add held n=${merged.length}`);
    return false;
  };

  /**
   * The lasso capture panel's recognized text, checked as one burst when the
   * panel opens (§1.8, §3.5). Only offered, never written - a learned
   * correction shows as a suggestion too - so the seed stays as recognized.
   */
  const checkSeed = (text: string) => {
    const index = currentKnownTagIndex(options.recentTags ?? NO_RECENT);
    const found = checkTags(text, null, index, new Set(), getLearnedFixesSync()).filter(f => f.kind !== 'new');
    keptRef.current = new Set();
    askedRef.current = false;
    setHint(null);
    setShowClipboard(false);
    startMoment(null, null);
    const fixesFound = mergeFixes([], found, text);
    setPending(fixesFound);
    if (found.length > 0) log(`writing: capture checked tags=${tagSpans(text).length} fix=${fixesFound.length}`);
  };

  /** The box opened again: the strip starts on Suggest. */
  const resetView = () => setViewState('suggest');

  /** After a save: a new draft starts without fixes, kept tags or hint. */
  const reset = () => {
    setPending([]);
    startMoment(null, null);
    setShowClipboard(false);
    setHint(null);
    keptRef.current = new Set();
    askedRef.current = false;
    undoRef.current = null;
  };

  const starters = starterSetups ? startersOffered(starterSetups, clipText) : null;
  const suggest = options.suggest ? options.suggest(value) : null;
  const strip: StripContent = stripContent({field, value, fixes, moment, showClipboard, warning: options.warning, usual: options.usual, starters, suggest, view});
  return {strip, view, actions, onChangeText, onSelectionChange, onFocus, confirmAdd, reset, resetView, checkSeed};
}

export type WritingHelp = ReturnType<typeof useWritingHelp>;
