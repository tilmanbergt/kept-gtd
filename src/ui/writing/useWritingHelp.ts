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
 *   …") and with Undo; everything else waits for a tap. When a spacing fix
 *   shortens the text, the cursor is put where it belongs.
 * - Completion is offered whenever the cursor sits right after an
 *   unfinished tag - after a burst, a typed letter, or a tap that puts the
 *   cursor there - never after a space (§1.3 as built). A cursor report
 *   elsewhere sets no state.
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
import {Selection} from '../../domain/clipboardText';
import {formatFullDate, formatTimeSpan} from '../../domain/dateFormat';
import {tagSpans} from '../../domain/markdown';
import {parseMeetingWhen, todayIso} from '../../domain/meetingTime';
import {applyCompletion, completions, NO_SCOPE, UnfinishedTag, unfinishedTagAt} from '../../domain/writing/completion';
import {caretAfterChange, insertedSpan, isBurst, tagsEndedBy} from '../../domain/writing/insertion';
import {UsualSlot} from '../../domain/writing/meetingHints';
import {hasLookAlike, readDate, readTime} from '../../domain/writing/readDateTime';
import {
  addAgainHint,
  MAX_SHOWN_FIXES,
  newTagFeedback,
  PendingFix,
  placeFeedback,
  readAsLabel,
  StripContent,
  stripContent,
  StripField,
  StripMoment,
  timeLabel,
} from '../../domain/writing/stripContent';
import {checkTags, normalizeTagSpacing, replaceTag, TagFinding} from '../../domain/writing/tagCheck';
import {currentKnownTagIndex, scopeTags} from '../../storage/knownTagIndex';
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
  /**
   * The Project/Area the item goes to with `text` - an abbreviation tag in it
   * switches it - or null for the Inbox; its loops and counterparts come first
   * in completions (§10.4). Absent: no place.
   */
  scopeOf?: (text: string) => string | null;
  /** Where the item's page would go with `text` (§1.7); null when that is not known. */
  place?: (text: string) => {setupName: string | null; file: string} | null;
  /** A meeting's date and time strips: past or overlap. */
  warning?: string | null;
  /** The usual slot of the meeting's series: the date strip offers its date, the empty time strip its time. */
  usual?: UsualSlot | null;
  /** Fills this field - only this one - from the usual slot. */
  onUsual?: (slot: UsualSlot) => void;
}

export interface WritingStripActions {
  apply: (index: number) => void;
  keep: () => void;
  edit: () => void;
  undo: () => void;
  choose: (value: string) => void;
  complete: (tag: string) => void;
  usual: () => void;
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
  const [hint, setHint] = useState<string | null>(null);
  const keptRef = useRef(new Set<string>());
  const undoRef = useRef<{text: string; forget: string[]} | null>(null);
  const completionRef = useRef<UnfinishedTag | null>(null);
  // Where the last change left the cursor (and, before a spacing fix, where
  // the field itself put it): a cursor report there is the change's own; one
  // anywhere else is a touch.
  const ownCursorsRef = useRef<number[]>([]);
  const askedRef = useRef(false);
  const statusId = useRef(`writing.${++nextHelpInstance}`).current;
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
    ownCursorsRef.current = cursor === null ? [] : [cursor];
    setMoment(next);
  };
  const refocus = () => {
    const input = inputRef?.current;
    if (input && !input.isFocused?.()) input.focus();
  };

  /** The feedback line for `text` (§1.7), or null without a place. */
  const feedbackFor = (text: string, newTag: string | null): StripMoment | null => {
    const place = options.place?.(text);
    if (!place) return null;
    return {kind: 'feedback', text: newTag ? newTagFeedback(newTag, place.file) : placeFeedback(place.setupName, place.file)};
  };

  /**
   * The completions for the unfinished tag right before `cursor`, or null:
   * none after a space, none for a tag that is complete and known (`#daily`),
   * except `type/`, which offers that type's counterparts (§1.3).
   */
  const completionAt = (text: string, cursor: number, known?: ReturnType<typeof currentKnownTagIndex>) => {
    const unfinished = unfinishedTagAt(text, cursor);
    if (!unfinished) return null;
    const index = known ?? currentKnownTagIndex(options.recentTags ?? NO_RECENT);
    const token = unfinished.token.toLowerCase();
    if (!token.endsWith('/') && index.has(token)) return null;
    const scope = options.scopeOf ? scopeTags(options.scopeOf(text)) : NO_SCOPE;
    const offered = completions(unfinished.token, index, scope);
    return offered.length > 0 ? {unfinished, offered} : null;
  };
  /** Shows `offer` - unless the strip shows these completions already, so a cursor report costs no render. */
  const offerCompletion = (offer: NonNullable<ReturnType<typeof completionAt>>, cursor: number) => {
    const same =
      moment?.kind === 'complete' &&
      completionRef.current?.start === offer.unfinished.start &&
      completionRef.current?.end === offer.unfinished.end &&
      moment.options.map(o => o.tag).join(' ') === offer.offered.map(o => o.tag).join(' ');
    completionRef.current = offer.unfinished;
    if (same) {
      ownCursorsRef.current = [cursor];
      return;
    }
    setShowClipboard(false);
    startMoment({kind: 'complete', options: offer.offered}, cursor);
  };

  /**
   * One change of a text field. `rawCursor` is where the field itself puts the
   * cursor before the spacing fix: its next cursor report may still say so.
   */
  const changeText = (next: string, span: ReturnType<typeof insertedSpan>, normalized: boolean, rawCursor: number) => {
    const burst = isBurst(span);
    const checked = burst && span ? [span] : tagsEndedBy(next, span);
    const caret = caretAfterChange(value, next);
    const index = checked.length > 0 ? currentKnownTagIndex(options.recentTags ?? NO_RECENT) : undefined;
    const found = index ? checked.flatMap(s => checkTags(next, s, index, keptRef.current, getLearnedFixesSync())) : [];
    const learned = found.filter(f => f.kind === 'learned');
    let text = next;
    for (const f of [...learned].reverse()) text = replaceTag(text, f, f.suggestion ?? f.written).text;
    const flagged = found.filter(f => f.kind === 'fix');
    const tagCount = tagSpans(next).filter(t => checked.some(s => t.end > s.start && t.start < s.end)).length;
    if (burst && span) log(`writing: burst len=${span.end - span.start} tags=${tagCount} fix=${flagged.length} learned=${learned.length}`);
    write(text);
    // After what was inserted: a burst's end, or the typed space or punctuation that ended the tag.
    const end = checked.length > 0 ? Math.max(caret, checked[checked.length - 1].end) : caret;
    const cursor = end + (text.length - next.length);
    // A spacing fix or a learned fix shortened the text: the field's cursor is put where it belongs.
    if (learned.length > 0 || normalized) moveCursor(cursor);
    const merged = mergeFixes(pending, flagged, text);
    if (flagged.length > 0) {
      setPending(merged);
      setShowClipboard(false);
      log(`writing: strip fixes n=${merged.length}`);
    }
    if (learned.length > 0) {
      undoRef.current = {text: next, forget: learned.map(f => f.written)};
      startMoment({kind: 'read', label: readAsLabel(learned.map(f => `#${f.suggestion}`).join(' '))}, cursor);
    } else {
      const offer = completionAt(text, cursor, index);
      if (offer) offerCompletion(offer, cursor);
      else if (checked.length > 0) {
        const fresh = found.find(f => f.kind === 'new');
        startMoment(merged.length === 0 && tagCount > 0 ? feedbackFor(text, fresh?.written ?? null) : null, cursor);
      } else if (moment) startMoment(null, cursor);
    }
    ownCursorsRef.current = [cursor, rawCursor];
  };

  /**
   * One change of a date or time field (§1.6, §10.4). A reading that writes
   * into the field needs recognition's burst or a look-alike letter (`g` for
   * 9), so digits typed one by one are never rewritten halfway; a choice
   * writes nothing and is offered on every change (`1` -> 13:00 or 1:00).
   */
  const changeDateTime = (next: string, span: ReturnType<typeof insertedSpan>) => {
    const burst = isBurst(span);
    const lookAlike = field !== 'text' && hasLookAlike(field, next);
    const reading = !next.trim() ? null : field === 'date' ? readDate(next, todayIso(new Date())) : readTime(next);
    if (reading && (burst || lookAlike)) log(`writing: ${burst ? 'burst' : 'look-alike'} field=${field} reading=${reading.kind}`);
    if (reading?.kind === 'read' && (burst || lookAlike)) {
      write(reading.value);
      undoRef.current = {text: next, forget: []};
      const what = field === 'date' ? formatFullDate(reading.value) : timeLabel(reading.value) ?? reading.value;
      startMoment({kind: 'read', label: readAsLabel(what)}, reading.value.length);
      moveCursor(reading.value.length);
      return;
    }
    write(next);
    if (reading?.kind === 'choice') {
      startMoment({kind: 'choice', options: reading.values.map(v => ({value: v, label: choiceLabel(field, v)}))}, caretAfterChange(value, next));
    } else if (moment) startMoment(null, null);
  };

  const onChangeText = (raw: string) => {
    const next = field === 'text' ? normalizeTagSpacing(raw) : raw;
    const span = insertedSpan(value, next);
    askedRef.current = false;
    if (hint) setHint(null);
    if (isBurst(span) && showClipboard) setShowClipboard(false);
    if (field === 'text') changeText(next, span, next !== raw, caretAfterChange(value, raw));
    else changeDateTime(next, span);
  };

  /**
   * A cursor report. The change's own is ignored. A touch that puts the cursor
   * right after an unfinished tag offers its completions; any other touch ends
   * a moment. Most reports set no state at all (domain/clipboardText.ts says
   * why that matters on this hardware).
   */
  const onSelectionChange = (selection: Selection) => {
    if (!selection) return;
    const collapsed = selection.start === selection.end;
    if (collapsed && ownCursorsRef.current.includes(selection.start)) return;
    ownCursorsRef.current = collapsed ? [selection.start] : [];
    const offer = collapsed && field === 'text' ? completionAt(value, selection.start) : null;
    if (offer) offerCompletion(offer, selection.start);
    else if (moment) startMoment(null, null);
  };

  /** A new focus starts at rest (the strip was hidden while the field had none). */
  const onFocus = () => {
    if (moment) startMoment(null, null);
    if (showClipboard) setShowClipboard(false);
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
      if (liveFixes(rest, text).length === 0) startMoment(feedbackFor(text, null), cursor);
      refocus();
    },
    keep: () => {
      log(`writing: tap keep n=${fixes.length}`);
      for (const f of fixes) keptRef.current.add(f.written.toLowerCase());
      setPending([]);
      startMoment(feedbackFor(value, null), selectionRef.current?.end ?? null);
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

  const strip: StripContent = stripContent({field, value, fixes, moment, showClipboard, warning: options.warning, usual: options.usual});
  return {strip, actions, onChangeText, onSelectionChange, onFocus, confirmAdd, reset, checkSeed};
}

export type WritingHelp = ReturnType<typeof useWritingHelp>;
