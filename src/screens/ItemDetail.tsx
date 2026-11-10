/**
 * ItemDetail — a single Project or Area.
 *
 * Rendered by App.tsx as the content of the "Current" tab (App.tsx's
 * tab-based navigation) whenever `currentItem` is set - no header/back
 * button of its own; switching tabs is the only navigation.
 *
 * Left: ui/FileBrowserPane.tsx, with two roots (technical-design-linked-
 * files.md §5/§8) - 'project' (this item's own folder, always scoped to the
 * *project/area root* regardless of how deep the pane is drilled, same as
 * the Todos/Meetings on the right) and 'resources' (the user's shared
 * Resources folder, per domain/settings.ts's resolvePaths - the "attach an
 * existing file" flow's second, more common source). See FileBrowserPane's
 * own module doc comment for the roots/locating/arming/pin behavior it owns
 * (ui/FileBrowserPane.tsx).
 *
 * `linkTarget` (locating a linked file's row, or arming a "pick a file for
 * this task/meeting" selection) is owned by ProjectDataPanel - the right
 * pane's Todos/Meetings own the one edit-or-arm target for this whole
 * screen (technical-design-linked-files.md §8's EditTarget/armTarget) - and
 * reported up through `onLinkTargetChange` into this screen's own
 * `dataPanelLinkTarget` state.
 *
 * **Area-assignment arming** (technical-design-project-area-assignment.md
 * §4.1/§4.3) adds a second source of LinkTarget: "Assign to Area…" on ⚙
 * Settings (screens/item/StatusBlock.tsx) reports its arming/cancel through
 * `onRequestAreaAssignment` into a *separate* `areaLinkTarget` state, and ⚙
 * shows a Files pane with that target while it picks. Two states instead of
 * one shared setter: ProjectDataPanel's own onLinkTargetChange effect
 * re-fires (with `null`) on its own changes and would cancel the pick.
 *
 * `handleSetDefaultResourceFolder` (the Resources root's pin) is
 * deliberately NOT part of that edit/arm bubbling - it's its own small,
 * independent read-modify-write against this item's frontmatter (same
 * "extract, don't lift" / independent-load pattern screens/item/StatusBlock.tsx
 * uses for Status+Archive), since pinning a subfolder has nothing to do
 * with which task/meeting is being edited.
 *
 * Right: ProjectDataPanel - the item's own Todos and Meetings, always
 * scoped to the project/area root.
 *
 * **⚙ Settings** (screens/item/ItemSettings.tsx,
 * docs/dev/history/technical-design-calmer-screens.md §3.8) replaces both
 * panes while open: abbreviation, scope, status, Close out / Archive, Area and
 * "Show on this page". The header shows the abbreviation read only.
 *
 * **File browser roots** (technical-design-project-area-assignment.md §4.4):
 * a Project always gets 'project'/'resources', plus a third 'area' root once
 * one is assigned, pointed at that Area's own folder. An Area gets
 * 'project' (labeled "Area Files") and 'resources' as tabs; its third root,
 * 'projectFiles' (every Project whose `area` matches this one, via
 * entryFilter), is the Projects tab's `armingRoot`: shown in that tab's slot
 * only while arming (docs/dev/history/technical-design-projects-findable-notes.md
 * §1.2). `findCachedItem` (storage/dataCache.ts) is what that filter reads -
 * the same already-warm cache every other cross-item lookup in this app
 * prefers over a filesystem scan.
 *
 * 'browse' - a two-level, always-Active-only Projects/Areas browser
 * (ui/FileBrowserPane.tsx's `sources`) - is no tab of its own: it is the
 * Project Files root's `alternate` (the Browse merge,
 * docs/dev/history/technical-design-tending-threads.md §3.9.4, decision D4).
 * While a refile or an area-assignment is picked, the Project Files slot shows
 * Browse (labelled "Browse") and switches back when the arm ends; while a file
 * is link-armed, the top of that slot's list offers "Other Projects/Areas ›",
 * which opens Browse in the same slot. Outside arming Browse is not offered
 * (the Projects/Areas tabs open other items).
 * `isRefileArming`/`isAreaAssignmentArming`/`disableOthersWhileArming` below
 * grey out every other root (never remove them) while either a refile or an
 * area-assignment is being picked.
 *
 * Top tabs: **Threads**, **Loops** (Projects on an Area), **Notebook** and
 * **Files** (FileBrowserPane's `groupLabel`, docs/dev/history/technical-design-note-setups-finish.md
 * §2): the roots share the Files tab, and a second row inside it picks
 * Project · Area (when assigned) · Resources, or Area · Resources. Which of
 * the first three show, and which tab the page opens on, follow "Show on this
 * page" (domain/pageShow.ts leftTabs/startTab, from screens/item/usePageFacts.ts):
 * Auto shows a tab with something in it; Files always shows. The open tab is
 * FileBrowserPane's `startKey`, which settles with the cache until a tab is
 * tapped. An arm (link a file, refile, assign Area) switches to the matching
 * file root and back to the tab it started on when it ends.
 *
 * **Threads** (screens/thread/ThreadsTab.tsx, an `extraTabs` entry of
 * FileBrowserPane) lists the counterparts of this item's scope. Tapping one
 * sets `counterpartFilter`, which ProjectDataPanel applies to its Todos and
 * Meetings; "+ next" on a thread row fills Quick Add's meeting draft
 * (`meetingSeed`), to the item of the thread's latest meeting. Both are view
 * state only. On an Area **Projects** (screens/area/ProjectsTab.tsx) lists its
 * assigned Projects with their signals; a row opens the Project.
 *
 * Header (screens/item/ItemHeader.tsx): name, kind, a Project's Area, the
 * given time this week, the abbreviation, and the scope when set. Under the
 * Files pane: Notebook, Engage ›, ⚙ Settings.
 *
 * Reloading: leaving the tab and "Reload all files" (Settings → Advanced)
 * remount this screen, which loads the item again; FileBrowserPane scans its
 * open folder itself whenever it (re)mounts or drills.
 */
import {LeftTab, leftTabs, openRule, PageShow, presenceOf, showValue, startTab, visibleParts} from '../domain/pageShow';
import {RetainedFocus} from '../storage/projectFile';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {ItemStatus} from '../domain/types';
import EngageButton from '../ui/EngageButton';
import HomeNotebookButton from '../ui/HomeNotebookButton';
import {useHomeNotebooks} from '../ui/useHomeNotebooks';
import {useHomeNotebookActions} from '../ui/useHomeNotebookTap';
import {useHomeNotebookRenameOffer} from '../ui/useHomeNotebookRenameOffer';
import NotebookTab from './notebook/NotebookTab';
import {ResolvedParaPaths, resolvePaths} from '../domain/settings';
import {CachedItem, ensureItemCached, findCachedItem, frontMatterOf, updateItemFrontMatter} from '../storage/dataCache';
import {saveFrontMatter} from '../storage/projectFile';
import {samePaths, useSettingsValue} from '../ui/useSettings';
import {FolderEntry} from '../supernote/fileSystem';
import {logError} from '../utils/log';
import {useEinkRefreshOnLoad} from '../utils/screenRefresh';
import {common} from '../ui/commonStyles';
import {FONT, useThemeColors} from '../ui/theme';
import FileBrowserPane, {FileBrowserExtraTab, FileBrowserRoot, LinkTarget} from '../ui/FileBrowserPane';
import ItemSettings from './item/ItemSettings';
import ProjectDataPanel from './ProjectDataPanel';
import ThreadsTab, {CounterpartSelection} from './thread/ThreadsTab';
import ProjectsTab from './area/ProjectsTab';
import {useLoopLinkArm} from './area/useLoopLinkArm';
import {Destination} from '../domain/destination';
import {NextMeetingOffer} from '../storage/threadAggregate';
import {MeetingSeed} from '../ui/quickAdd/useDraftRequests';
import {usePerfRender} from '../utils/perf';
import {useOnScreenShow} from '../ui/screenActivity';
import {errorMessage} from '../utils/errorMessage';
import ItemHeader from './item/ItemHeader';
import {usePageFacts} from './item/usePageFacts';


interface Props {
  kind: 'project' | 'area';
  name: string;
  path: string;
  /** Called once ⚙ Settings' Archive action (screens/item/StatusBlock.tsx) has actually moved this item's folder - App.tsx navigates away, since `path` then points at nothing under Projects/Areas. */
  onArchived?: (kind: 'project' | 'area') => void;
  /** Threaded straight through to ProjectDataPanel's MeetingsSection (docs/dev/history/technical-design-google-calendar.md §9) - switches to Settings' Calendar sub-tab from the Google mini-tab's empty state. */
  onOpenCalendarSettings?: () => void;
  /** The Files pane's Browse (see the module doc comment's "browse" note) and an Area's Projects tab - opening a Project/Area there swaps the "Current" tab to that item, via the same App.tsx `openItem` the Projects/Areas tabs open one with. */
  onOpenItem?: (kind: 'project' | 'area', entry: FolderEntry) => void;
  /** Projects: opens the close-out wizard from ⚙ Settings' "Close out…" (docs/dev/history/technical-design-project-close-out.md §6.2). */
  onStartCloseOut?: (projectPath: string) => void;
}

/** Just the frontmatter fields handleSetDefaultResourceFolder needs to read-modify-write - see the module doc comment's "extract, don't lift" note. Mirrors screens/item/StatusBlock.tsx's own StatusPanelState. `area` is read (never written) here - it's this screen's only source for the assigned-Area's own file-browser root (see the module doc comment's "File browser roots" note) and must be carried through unchanged on every save (saveFrontMatter/updateItemFrontMatter both default it to null when omitted). */
interface ResourceFolderState {
  rawContent: string;
  status: ItemStatus;
  focusFlags: RetainedFocus;
  frontMatterExtraLines: string[];
  defaultResourceFolder: string | null;
  area: string | null;
  /** This item's short abbreviation (docs/dev/history/technical-design-project-area-abbreviations.md), or null - carried through unchanged on every write here, same reason `area`/`defaultResourceFolder` already are (see storage/projectFile.ts's saveFrontMatter doc comment), and the header shows it. */
  abbrev: string | null;
  /** "Show on this page" (domain/pageShow.ts) - carried through unchanged on every write here, like `abbrev`. */
  show: PageShow;
}

/** The frontmatter fields this screen keeps of `item` (all of them follow from its text, `rawContent`). */
function resourceFolderStateOf(item: CachedItem): ResourceFolderState {
  return {
    rawContent: item.rawContent,
    status: item.status,
    focusFlags: item.focusFlags,
    frontMatterExtraLines: item.frontMatterExtraLines,
    defaultResourceFolder: item.defaultResourceFolder,
    area: item.area,
    abbrev: item.abbrev,
    show: item.show,
  };
}

import {useDeviceRoot} from '../ui/fileBrowser/useDeviceRoot';

/** The Files pane's extra tab keys and the page's left tabs (domain/pageShow.ts LeftTab). */
const TAB_OF_KEY: Record<string, LeftTab> = {threads: 'threads', projects: 'loops', notebook: 'notebook'};
const KEY_OF_TAB: Record<Exclude<LeftTab, 'files'>, string> = {threads: 'threads', loops: 'projects', notebook: 'notebook'};

export default function ItemDetail({
  kind,
  name,
  path,
  onArchived,
  onOpenCalendarSettings,
  onOpenItem,
  onStartCloseOut,
}: Props): React.JSX.Element {
  usePerfRender('ItemDetail');
  const {textColor, borderColor, placeholderColor} = useThemeColors();

  const [error, setError] = useState<string | null>(null);

  // The user's resolved folders (domain/settings.ts) - the 'resources' root's
  // rootPath below - from the settings snapshot (ui/useSettings.ts); a change of
  // another setting ("Hide done tasks") renders nothing here.
  const paths: ResolvedParaPaths | null = useSettingsValue(resolvePaths, samePaths);

  // See the module doc comment's "handleSetDefaultResourceFolder" note.
  // A cached item is there in the first render (docs/dev/history/technical-design-perf-current-page.md §3.3);
  // the load below then keeps the same state, so it renders nothing again.
  const [resourceFolderState, setResourceFolderState] = useState<ResourceFolderState | null>(() => {
    const cached = findCachedItem(path);
    return cached ? resourceFolderStateOf(cached) : null;
  });
  useEffect(() => {
    let cancelled = false;
    ensureItemCached(kind, name, path).then(item => {
      if (cancelled) return;
      setResourceFolderState(prev => (prev && prev.rawContent === item.rawContent ? prev : resourceFolderStateOf(item)));
    });
    return () => {
      cancelled = true;
    };
  }, [kind, name, path]);

  // Home notebook button in the header (docs/dev/history/technical-design-home-notebooks.md §3.3),
  // once the abbreviation is known ({abbr} in the notebook's name).
  const homeItems = useMemo(() => [{path, name, abbrev: resourceFolderState?.abbrev ?? null}], [path, name, resourceFolderState?.abbrev]);
  const homes = useHomeNotebooks(homeItems);
  const homeActions = useHomeNotebookActions('ItemDetail');
  const homeNotebook = resourceFolderState ? homes.of(homeItems[0]) : null;
  useHomeNotebookRenameOffer('ItemDetail', path, !!resourceFolderState && homes.enabled);

  // What the page shows (docs/dev/history/technical-design-calmer-screens.md §3.8): the left tabs are
  // the visible parts (Auto: the ones with something) and Files; the open rule picks the start tab.
  const facts = usePageFacts(path, !!homeNotebook?.exists);
  const pageLayout = useMemo(() => {
    if (!facts) return null;
    const presence = presenceOf(facts.counts);
    const visible = visibleParts(facts.show, presence);
    const tabs = leftTabs(kind, visible, !!homeNotebook);
    return {visible, tabs, start: startTab(openRule(facts.show), tabs, kind, presence), agreements: showValue(facts.show, 'agreements')};
  }, [facts, kind, homeNotebook]);

  // Kept tab shown again (docs/dev/history/technical-design-keep-tabs-alive.md §5.3):
  // re-derive quietly if this item's file changed while hidden.
  useOnScreenShow(() => {
    const item = findCachedItem(path);
    if (!item || item.rawContent === resourceFolderState?.rawContent) return;
    setResourceFolderState(resourceFolderStateOf(item));
  });

  // Explicit e-ink refresh once the initial ensureItemCached load lands -
  // see src/utils/screenRefresh.ts.
  // `resourceFolderState === null` covers the mount-time load above, which
  // has no loading flag of its own.
  useEinkRefreshOnLoad(resourceFolderState === null);

  /** The Resources root's pin (ui/FileBrowserPane.tsx's onSetDefaultSubfolder) - writes the new pinned subfolder into this item's frontmatter, write-through into the shared cache, same as screens/item/StatusBlock.tsx's changeStatus. */
  const handleSetDefaultResourceFolder = useCallback(
    async (subfolderRelativePath: string) => {
      if (!resourceFolderState) return;
      try {
        // Fresh from the cache, not this screen's own snapshot: another panel on this
        // screen (⚙ Settings) may have written the file since -
        // its rawContent/focus flags must not be overwritten with stale values.
        const current = findCachedItem(path) ?? resourceFolderState;
        const fm = {...frontMatterOf(current), defaultResourceFolder: subfolderRelativePath};
        const nextRaw = await saveFrontMatter(kind, path, current.rawContent, fm);
        updateItemFrontMatter(path, nextRaw, fm);
        setResourceFolderState(prev =>
          prev ? {...prev, rawContent: nextRaw, defaultResourceFolder: subfolderRelativePath} : prev,
        );
      } catch (e) {
        const message = errorMessage(e);
        logError('ItemDetail: set default resource folder failed', message);
        setError(message);
      }
    },
    [resourceFolderState, kind, path],
  );

  // Reported up from ProjectDataPanel's Todos/Meetings (the one edit-or-arm
  // target for this whole screen, technical-design-linked-files.md §8), and
  // separately from screens/item/StatusBlock.tsx's "Assign to Area…" - merged
  // below with area-assignment taking priority. See the module doc
  // comment's "Area-assignment arming" note for why these are two states
  // rather than one shared setter.
  const [dataPanelLinkTarget, setDataPanelLinkTarget] = useState<LinkTarget | null>(null);
  const [areaLinkTarget, setAreaLinkTarget] = useState<LinkTarget | null>(null);
  const loopLink = useLoopLinkArm(path, paths, kind === 'project' ? resourceFolderState?.area ?? null : null);
  const linkTarget = areaLinkTarget ?? loopLink.linkTarget ?? dataPanelLinkTarget;

  // Reported up from FileBrowserPane's own onActiveLocationChange (its doc
  // comment) - the Files pane's currently-displayed root/folder, for the
  // "Note" quick-add tab.
  // `noteFolderPath` is that folder's absolute path, but only while the
  // active root is this item's own ('project' key, labeled "Project Files"/
  // "Area Files") - null on every other root (Resources, Area Files of an
  // assigned Area, Project Files of an Area, Browse), same restriction
  // fileBrowserRoots below already encodes. Read fresh by QuickAddWidget at
  // the moment "+Add" is pressed, not frozen when its Note tab was opened.
  // It starts at the pane's first root, this item's own folder, so Quick Add has
  // its Note tab in the first render; the pane's report of the same place
  // changes nothing (docs/dev/history/technical-design-perf-current-page.md §3.3).
  const [activeFilesLocation, setActiveFilesLocation] = useState<{rootKey: string; path: string} | null>(() => ({rootKey: 'project', path}));
  const reportFilesLocation = useCallback(
    (rootKey: string, folderPath: string) =>
      setActiveFilesLocation(prev => (prev?.rootKey === rootKey && prev.path === folderPath ? prev : {rootKey, path: folderPath})),
    [],
  );
  const noteFolderPath = activeFilesLocation?.rootKey === 'project' ? activeFilesLocation.path : null;

  // The Area this Project supports, if any - null for Areas, and null for a
  // Project until resourceFolderState's own load lands (see the module doc
  // comment's "File browser roots" note).
  const assignedArea = kind === 'project' ? resourceFolderState?.area ?? null : null;

  // The Threads tab's counterpart filter and "+ next" seed (see the module doc comment).
  const [counterpartFilter, setCounterpartFilter] = useState<CounterpartSelection | null>(null);
  const [meetingSeed, setMeetingSeed] = useState<MeetingSeed | null>(null);
  const [seedDestination, setSeedDestination] = useState<Destination | null>(null);
  useEffect(() => {
    setCounterpartFilter(null);
    setMeetingSeed(null);
    setSeedDestination(null);
  }, [path]);
  // ⚙ Settings (screens/item/ItemSettings.tsx) in place of the two panes; leaving it ends an Area pick.
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    setSettingsOpen(false);
    setAreaLinkTarget(null);
  }, [path]);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => {
    setAreaLinkTarget(null);
    setSettingsOpen(false);
  }, []);
  const syncFromSettings = useCallback((item: CachedItem) => {
    setResourceFolderState(prev => (prev && prev.rawContent === item.rawContent ? prev : resourceFolderStateOf(item)));
  }, []);
  const handleNextMeeting = useCallback((offer: NextMeetingOffer) => {
    setMeetingSeed({fields: offer.seed, nonce: Date.now()});
    setSeedDestination(offer.item.kind === 'inbox' ? {type: 'inbox'} : {type: 'item', kind: offer.item.kind, name: offer.item.name, path: offer.item.path});
  }, []);
  const clearSeed = useCallback(() => setSeedDestination(null), []);

  // Active-only, same entryFilter every other destination picker in the app
  // uses (technical-design-project-area-assignment.md §4.2,
  // docs/dev/history/technical-design-filing-unification.md §3.1) - shared here by Browse's own
  // `sources` below.
  const activeOnly = (entry: FolderEntry) => findCachedItem(entry.path)?.status === 'active';

  // Refile-arming (storage/inboxFiling.ts's module doc comment):
  // ProjectDataPanel.tsx's own armTarget can arm for 'refile' as well as
  // 'link', both bubbled up through the same dataPanelLinkTarget/onPick
  // shape (its own onLinkTargetChange doc comment). `pickKind === 'folder'`
  // alone isn't enough to tell refile-arming apart from area-assignment's
  // own folder pick (screens/item/StatusBlock.tsx's "Assign to Area…", reported
  // through the separate areaLinkTarget merged below) - both route
  // through Browse (`root: 'browse'`), so checking `dataPanelLinkTarget`
  // specifically (never populated by area-assignment's own, separate
  // areaLinkTarget state) is what actually tells them apart here.
  const isRefileArming =
    dataPanelLinkTarget?.mode === 'arming' && dataPanelLinkTarget.pickKind === 'folder' && dataPanelLinkTarget.root === 'browse';
  // Area-assignment-arming (screens/item/StatusBlock.tsx's "Assign to Area…",
  // picked on Browse via `startAt: 'area'` - see ui/FileBrowserPane.tsx's
  // `startAt` doc comment). Same reasoning as isRefileArming above for
  // disabling every other root while it's active: a tap on e.g. Resources
  // mid-arm would otherwise try to pick a folder there using
  // area-assignment's own onPick, which expects a Browse-shaped
  // (root, relativePath) pair.
  const isAreaAssignmentArming = areaLinkTarget?.mode === 'arming';

  // Browse tab (a two-level Projects/Areas chooser, see
  // ui/FileBrowserPane.tsx's `sources` doc comment), always present - tabs
  // are switched, never added/removed. Three behaviors, all handled by
  // FileBrowserPane itself from `sources`/`onNavigateToItem`/pickKind/
  // `startAt`: plain browsing jumps the "Current" tab to whichever
  // Project/Area you tap (onOpenItem, this screen's own equivalent of
  // App.tsx's `openItem`); picking (pickKind:'folder' - refile-arming, or
  // area-assignment via `startAt: 'area'`) selects one immediately;
  // link-arming (the default pickKind:'file') drills into one so you can
  // pick a file inside it. Neither kind's own roots below offer a way to
  // browse *every* Project (a Project's own roots have no 'projects'
  // sibling) or, for an Area, every other Area - this is that capability,
  // once.
  const browseRoot: FileBrowserRoot | null = paths
    ? {
        key: 'browse',
        label: 'Browse',
        rootPath: paths.base,
        sources: [
          {kind: 'project', path: paths.projects, label: 'Projects'},
          {kind: 'area', path: paths.areas, label: 'Areas'},
        ],
        entryFilter: activeOnly,
        onNavigateToItem: (entryKind, entryName, entryPath) => onOpenItem?.(entryKind, {name: entryName, path: entryPath, isFolder: true}),
      }
    : null;

  // Every other root is disabled (greyed, non-tappable, but still shown -
  // ui/FileBrowserPane.tsx's `disabled` doc comment) while refile-arming OR
  // area-assignment-arming, since Browse is the only valid destination for
  // either anywhere on this screen - same principle the Review steps
  // applies to its own Resources tab. The auto-switch-to-`root` effect
  // already built into ui/FileBrowserPane.tsx's `arming` handling (triggered
  // by `root: 'browse'`, both cases) moves the active tab to Browse the
  // instant either arm starts, so a disabled root is never left showing as
  // "active" either.
  const disableOthersWhileArming = (r: FileBrowserRoot): FileBrowserRoot =>
    isRefileArming || isAreaAssignmentArming ? {...r, disabled: true} : r;
  // The whole device (docs/dev/history/technical-design-easy-start.md §6.2), for linking any file.
  const deviceRoot = useDeviceRoot(isRefileArming || isAreaAssignmentArming);

  const fileBrowserRoots: FileBrowserRoot[] = paths
    ? kind === 'project'
      ? [
          {key: 'project', label: 'Project Files', shortLabel: 'Project', rootPath: path, ...(browseRoot ? {alternate: browseRoot} : {})},
          ...(assignedArea
            ? [disableOthersWhileArming({key: 'area', label: 'Area Files', shortLabel: 'Area', rootPath: `${paths.areas}/${assignedArea}`})]
            : []),
          disableOthersWhileArming({
            key: 'resources',
            label: 'Resources',
            rootPath: paths.resources,
            defaultSubfolder: resourceFolderState?.defaultResourceFolder ?? null,
            onSetDefaultSubfolder: handleSetDefaultResourceFolder,
          }),
          deviceRoot,
        ]
      : [
          disableOthersWhileArming({key: 'project', label: 'Area Files', shortLabel: 'Area', rootPath: path}),
          disableOthersWhileArming({
            key: 'resources',
            label: 'Resources',
            rootPath: paths.resources,
            defaultSubfolder: resourceFolderState?.defaultResourceFolder ?? null,
            onSetDefaultSubfolder: handleSetDefaultResourceFolder,
          }),
          deviceRoot,
        ]
    : [{key: 'project', label: kind === 'project' ? 'Project Files' : 'Area Files', rootPath: path}];

  // An Area's Projects' folders - the Projects tab's slot while arming (see the module doc comment).
  const projectFilesRoot: FileBrowserRoot | undefined =
    paths && kind === 'area'
      ? {
          key: 'projectFiles',
          label: 'Project Files',
          rootPath: paths.projects,
          ...(browseRoot ? {alternate: browseRoot} : {}),
          // Every Project currently assigned to this Area, by bare folder
          // name (same identity `area` itself is stored by) - see
          // storage/areaAssignment.ts's assignedProjects, which this
          // mirrors inline since entryFilter needs a per-entry predicate,
          // not a list.
          entryFilter: entry => findCachedItem(entry.path)?.area === name,
        }
      : undefined;

  const allExtraTabs: FileBrowserExtraTab[] = [
    {
      key: 'threads',
      label: 'Threads',
      render: viewportHeight => (
        <ThreadsTab
          path={path}
          selected={counterpartFilter}
          onSelect={setCounterpartFilter}
          onNextMeeting={handleNextMeeting}
          viewportHeight={viewportHeight}
          textColor={textColor}
          borderColor={borderColor}
        />
      ),
    },
    {
      // An Area's Projects and loops; a Project's loops (docs/dev/history/technical-design-loops.md §4.7).
      key: 'projects',
      label: kind === 'area' ? 'Projects' : 'Loops',
      ...(kind === 'area' ? {armingRoot: projectFilesRoot} : {}),
      render: (viewportHeight: number | undefined) => (
        <ProjectsTab
          ownerKind={kind}
          ownerPath={path}
          areaName={name}
          onOpenItem={onOpenItem}
          onLinkFile={loopLink.arm}
          viewportHeight={viewportHeight}
          showProjects={pageLayout?.visible.projects ?? true}
          showLoops={pageLayout?.visible.loops ?? true}
          textColor={textColor}
          borderColor={borderColor}
        />
      ),
    },
    // The home notebook (docs/dev/history/technical-design-home-notebooks.md §3.4), while the Default has one.
    ...(homeNotebook
      ? [
          {
            key: 'notebook',
            label: 'Notebook',
            render: (viewportHeight: number | undefined) => (
              <NotebookTab nb={homeNotebook} ownerKind={kind} actions={homeActions} viewportHeight={viewportHeight} textColor={textColor} borderColor={borderColor} />
            ),
          },
        ]
      : []),
  ];


  const shownTabs = pageLayout?.tabs ?? ['threads', 'loops', 'notebook', 'files'];
  const extraTabs = allExtraTabs.filter(t => shownTabs.includes(TAB_OF_KEY[t.key]));
  const startKey = pageLayout ? (pageLayout.start === 'files' ? null : KEY_OF_TAB[pageLayout.start]) : undefined;
  const openAreaItem =
    paths && onOpenItem ? (areaName: string) => onOpenItem('area', {name: areaName, path: `${paths.areas}/${areaName}`, isFolder: true}) : undefined;

  return (
    <View style={common.container}>
      <ItemHeader
        kind={kind}
        name={name}
        abbrev={resourceFolderState?.abbrev ?? null}
        area={kind === 'project' ? facts?.area ?? null : null}
        scope={facts?.scope ?? ''}
        weekTime={facts?.weekTime ?? ''}
        onOpenArea={openAreaItem}
        onOpenSettings={openSettings}
        textColor={textColor}
      />

      {settingsOpen ? (
        <ItemSettings
          kind={kind}
          name={name}
          path={path}
          hasHomeNotebook={!!homeNotebook?.exists}
          areaArming={isAreaAssignmentArming}
          filesPane={
            <FileBrowserPane roots={fileBrowserRoots} linkTarget={areaLinkTarget} resetKey={path} groupLabel="Files" textColor={textColor} borderColor={borderColor} />
          }
          onRequestAreaAssignment={setAreaLinkTarget}
          onOpenArea={openAreaItem}
          onArchived={() => onArchived?.(kind)}
          onStartCloseOut={onStartCloseOut}
          onItemChanged={syncFromSettings}
          onClose={closeSettings}
          textColor={textColor}
          borderColor={borderColor}
          placeholderColor={placeholderColor}
        />
      ) : (
      <View style={styles.body}>
        <View style={[styles.leftPane, {borderColor}]}>
          <View style={styles.filesArea}>
            {error && (
              <Text style={[styles.error, {color: textColor}]}>⚠ {error}</Text>
            )}
            <FileBrowserPane
              roots={fileBrowserRoots}
              linkTarget={linkTarget}
              resetKey={path}
              onActiveLocationChange={reportFilesLocation}
              extraTabs={extraTabs}
              startKey={startKey}
              groupLabel="Files"
              thisFileRows
              textColor={textColor}
              borderColor={borderColor}
            />
          </View>
          <View style={styles.bottomRow}>
            <HomeNotebookButton nb={homeNotebook} onPress={homeActions.tap} variant="labeled" textColor={textColor} borderColor={borderColor} />
            <EngageButton owner={{kind: 'item', itemPath: path}} textColor={textColor} borderColor={borderColor} />
            <Pressable onPress={openSettings} hitSlop={8} style={[styles.settingsButton, {borderColor: textColor}]}>
              <Text style={[styles.settingsButtonText, {color: textColor}]}>⚙ Settings</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.rightPane}>
          <ProjectDataPanel
            kind={kind}
            name={name}
            path={path}
            onOpenCalendarSettings={onOpenCalendarSettings}
            onLinkTargetChange={setDataPanelLinkTarget}
            noteFolderPath={noteFolderPath}
            counterpartFilter={counterpartFilter}
            onClearCounterpartFilter={() => setCounterpartFilter(null)}
            meetingSeed={meetingSeed}
            seedDestination={seedDestination}
            onSeedUsed={clearSeed}
            agreementsShow={pageLayout?.agreements ?? 'auto'}
            scheduleShown={pageLayout?.visible.schedule ?? true}
          />
        </View>
      </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingTop: 8,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPane: {
    flex: 1,
    borderRightWidth: 1,
    paddingRight: 16,
    marginRight: 16,
  },
  // The Files pane takes the left pane's height.
  filesArea: {
    flex: 1,
  },
  rightPane: {
    flex: 1,
  },
  error: {
    fontSize: FONT.small,
    marginBottom: 6,
  },
  settingsButton: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginLeft: 8,
    alignSelf: 'center',
  },
  settingsButtonText: {
    fontSize: FONT.small,
    fontWeight: '600',
  },
});
