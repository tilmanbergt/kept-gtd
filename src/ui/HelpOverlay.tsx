/**
 * In-app help (docs/dev/history/technical-design-in-app-help.md §3.3): an opaque
 * layer over the tab body (App.tsx renders it inside StatusFrame, so the
 * TabBar and the status slot stay visible and the tab screens stay mounted
 * underneath). Left: Overview + the groups/pages of docs/user/index.md;
 * right: the selected page, paged like "What's new". Links between pages are
 * tappable and ‹ Back walks back through the pages read
 * (docs/dev/history/technical-design-easy-start.md §2.4; the history lives in
 * screens/useAppOverlays.tsx).
 *
 * The topic list pages ("+N ›") where it is taller than the screen (a turned device, a
 * Nomad; docs/dev/history/technical-design-launch-ready.md L6b) and always shows the page
 * that holds the selected topic.
 */
import React, {useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {HELP_OVERVIEW_PAGE, stripLeadingTitle} from '../domain/helpTopics';
import {USER_DOCS} from '../generated/userDocs';
import {HelpLinkTarget} from '../domain/markdownBlocks';
import MarkdownPager from './MarkdownBlocks';
import PagedSection from './PagedSection';
import {COLORS, FONT, SPACING, useThemeColors} from './theme';

interface Props {
  pageId: string;
  /** The block to open the page at; `key` changes with every navigation, so the same row can be jumped to again. */
  jumpTo: {key: number; row: number};
  onSelectPage: (pageId: string) => void;
  onLink: (link: HelpLinkTarget) => void;
  /** Shown while there is a page to go back to. */
  onBack: (() => void) | null;
  onFirstRowChange: (row: number) => void;
  onClose: () => void;
}

const ROW_HEIGHT = 40;
/** A group title's row: SPACING.md above the small bold title. */
const GROUP_ROW_HEIGHT = 34;

type NavRow = {kind: 'group'; title: string} | {kind: 'page'; id: string; indent: boolean};

/** Overview, then each group's title and pages, as one list to page through. */
function navRows(): NavRow[] {
  const rows: NavRow[] = USER_DOCS.pages[HELP_OVERVIEW_PAGE] ? [{kind: 'page', id: HELP_OVERVIEW_PAGE, indent: false}] : [];
  for (const group of USER_DOCS.groups) {
    rows.push({kind: 'group', title: group.title});
    for (const id of group.pageIds) rows.push({kind: 'page', id, indent: true});
  }
  return rows;
}

export default function HelpOverlay({pageId, jumpTo, onSelectPage, onLink, onBack, onFirstRowChange, onClose}: Props): React.JSX.Element {
  const {textColor, borderColor} = useThemeColors();
  const page = USER_DOCS.pages[pageId] ?? USER_DOCS.pages[HELP_OVERVIEW_PAGE];
  const shownId = USER_DOCS.pages[pageId] ? pageId : HELP_OVERVIEW_PAGE;
  const markdown = useMemo(() => (page ? stripLeadingTitle(page.markdown) : ''), [page]);
  const rows = useMemo(navRows, []);
  const selectedIndex = rows.findIndex(r => r.kind === 'page' && r.id === shownId);

  const pageRow = (id: string, indent: boolean) => {
    const selected = id === shownId;
    return (
      <Pressable key={id} onPress={() => onSelectPage(id)} style={styles.row} hitSlop={2}>
        <Text
          style={[styles.pageText, indent && styles.indented, {color: textColor}, selected && styles.selected]}
          numberOfLines={1}>
          {selected ? '▸ ' : '  '}
          {USER_DOCS.pages[id]?.title ?? id}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.overlay}>
      <View style={[styles.left, {borderColor}]}>
        <PagedSection<NavRow>
          header="Help"
          headerAccessory={
            <View style={styles.headerButtons}>
              {onBack && (
                <Pressable onPress={onBack} hitSlop={10} style={styles.closeButton}>
                  <Text style={[styles.closeText, {color: textColor}]}>‹ Back</Text>
                </Pressable>
              )}
              <Pressable onPress={onClose} hitSlop={10} style={styles.closeButton}>
                <Text style={[styles.closeText, {color: textColor}]}>✕ Close</Text>
              </Pressable>
            </View>
          }
          rows={rows}
          rowHeight={row => (row.kind === 'group' ? GROUP_ROW_HEIGHT : ROW_HEIGHT)}
          isCountableRow={row => row.kind === 'page'}
          jumpTo={selectedIndex >= 0 ? {key: shownId, index: selectedIndex} : null}
          heightKey="help:topics"
          renderRow={row =>
            row.kind === 'group' ? (
              <View key={`g:${row.title}`} style={styles.groupRow}>
                <Text style={[styles.groupTitle, {color: textColor}]}>{row.title.toUpperCase()}</Text>
              </View>
            ) : (
              pageRow(row.id, row.indent)
            )
          }
          textColor={textColor}
          borderColor={borderColor}
        />
      </View>
      <View style={styles.right}>
        {page ? (
          <MarkdownPager
            markdown={markdown}
            header={page.title}
            resetKey={shownId}
            jumpTo={jumpTo}
            onLink={onLink}
            onFirstRowChange={onFirstRowChange}
            emptyHint="This page is empty."
            textColor={textColor}
            borderColor={borderColor}
          />
        ) : (
          <Text style={[styles.pageText, {color: textColor}]}>No help pages in this build.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    backgroundColor: COLORS.background,
  },
  left: {
    width: '30%',
    borderRightWidth: 1,
    paddingHorizontal: SPACING.base,
  },
  headerButtons: {flexDirection: 'row', alignItems: 'center'},
  groupRow: {height: GROUP_ROW_HEIGHT, justifyContent: 'flex-end'},
  closeButton: {paddingHorizontal: SPACING.sm},
  closeText: {fontSize: FONT.small, fontWeight: '600'},
  groupTitle: {
    fontSize: FONT.small,
    fontWeight: '700',
    opacity: 0.6,
    marginBottom: 2,
  },
  row: {height: ROW_HEIGHT, justifyContent: 'center'},
  pageText: {fontSize: FONT.medium},
  indented: {paddingLeft: SPACING.xs},
  selected: {fontWeight: '700'},
  right: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
  },
});
