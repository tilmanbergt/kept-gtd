/**
 * The section the capture's source page belongs to
 * (docs/dev/history/technical-design-engage-page-owner.md §3.6, P10): the
 * meeting its todos and agreements record (the grey "↳ from …" line, a
 * meeting's page or a follow-up of it), and the section's own thread or loop
 * for the Agreement kind's For chips (a todo's page or a loop's page and
 * what follows them). Resolved once per source page through the shared page
 * index; a failing read reads as none.
 */
import {useEffect, useMemo, useRef, useState} from 'react';
import {EngageOwner, EngageSource, ownerOfTodo} from '../../domain/engageOwner';
import {findEnclosingItem, ResolvedParaPaths} from '../../domain/settings';
import {NOTEBOOK_PAGES} from '../../storage/notebookPages';
import {ThreadSource} from '../../storage/threadAggregate';
import {NotePageMeeting, SourceSection, sourceSectionOf} from '../../storage/threadProvenance';
import {errorMessage} from '../../utils/errorMessage';
import {log, logError} from '../../utils/log';

export interface SourceSectionState {
  meeting: NotePageMeeting | null;
  /** The section's own owner (a todo's, or a loop page's active loop); null without one. */
  sectionOwner: EngageOwner | null;
}

const NONE: SourceSection = {meeting: null, todo: null, loopTag: null};

export function useSourceSection(input: {
  sourcePath: string | null;
  /** 0-based. */
  sourcePage: number | null;
  threadSources: readonly ThreadSource[];
  engageSource: EngageSource | null;
  paths: ResolvedParaPaths | null;
}): SourceSectionState {
  const {sourcePath, sourcePage, engageSource, paths} = input;
  const [section, setSection] = useState<SourceSection>(NONE);
  const known = useRef(new Map<string, SourceSection>());
  const sourcesRef = useRef(input.threadSources);
  sourcesRef.current = input.threadSources;
  const sourceKey = sourcePath ? `${sourcePath}#${sourcePage ?? ''}` : null;

  useEffect(() => {
    if (!sourcePath || !sourceKey) {
      setSection(NONE);
      return;
    }
    const hit = known.current.get(sourceKey);
    if (hit) {
      setSection(hit);
      return;
    }
    let alive = true;
    sourceSectionOf(sourcePath, sourcePage, sourcesRef.current, NOTEBOOK_PAGES)
      .then(found => {
        known.current.set(sourceKey, found);
        if (alive) setSection(found);
        const m = found.meeting;
        if (m) log('CaptureScreen: source page belongs to a meeting', m.item.kind, m.meetingIndex, `distance=${m.distance}`);
      })
      .catch(e => logError('CaptureScreen: source section not read', errorMessage(e)));
    return () => {
      alive = false;
    };
    // Resolved once per source page; the sources are read when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey]);

  const sectionOwner = useMemo((): EngageOwner | null => {
    if (!engageSource) return null;
    if (section.todo) return ownerOfTodo({itemPath: section.todo.item.path, task: section.todo.task}, engageSource);
    if (section.loopTag && sourcePath && paths) {
      const enclosing = findEnclosingItem(paths, sourcePath);
      const item = enclosing ? engageSource.items.find(i => i.path === enclosing.path) : undefined;
      if (item?.loops.some(l => l.status === 'active' && l.tag === section.loopTag)) return {kind: 'loop', itemPath: item.path, tag: section.loopTag};
    }
    return null;
  }, [section, engageSource, sourcePath, paths]);

  return {meeting: section.meeting, sectionOwner};
}
