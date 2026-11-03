/**
 * Settings → About (docs/dev/history/technical-design-about-debug-experimental.md §3.5):
 * left - wordmark, name and slogan (docs/dev/history/technical-design-kept-gtd.md §3.2),
 * version/build/device and an invitation to report problems and ideas (the debug tools are on
 * Advanced, docs/dev/history/technical-design-settings-tabs.md T6);
 * below them Updates (UpdatesBlock.tsx, docs/dev/history/technical-design-in-app-updates.md §6.2);
 * the left column scrolls where it is taller than the screen (ScrollColumn.tsx);
 * right - "What's new" from the bundled CHANGELOG, paged, no scrolling: the last three versions
 * (docs/dev/history/technical-design-launch-ready.md L6), so their tabs fit even a narrow screen;
 * older ones are in CHANGELOG.md on GitHub. A newer release known from GitHub comes first, as
 * "X.Y.Z · new", with its release notes in the same pager, in place of the oldest of the three.
 */
import React, {useEffect, useMemo, useState} from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {buildVersionText} from '../../domain/buildVersionText';
import {UpdateCheckMode} from '../../domain/updateCheck';
import {knownUpdate} from '../../storage/updates';
import {BUILD_INFO} from '../../generated/buildInfo';
import {CHANGELOG} from '../../generated/changelog';
import {getRuntimeDiagnostics, RuntimeDiagnostics} from '../../supernote/pluginRuntime';
import MarkdownPager from '../../ui/MarkdownBlocks';
import MiniTabs, {MiniTabDef} from '../../ui/MiniTabs';
import {FONT, SPACING} from '../../ui/theme';
import {useUpdateSnapshot} from '../../ui/useUpdateNotice';
import ScrollColumn from './ScrollColumn';
import UpdatesBlock from './UpdatesBlock';

/** The Unreleased changelog section's heading: the release it is for, when the build knows it. */
function unreleasedHeader(): string {
  return BUILD_INFO.nextVersion ? `${BUILD_INFO.nextVersion} (in progress)` : 'Not yet released';
}
import {formatDate} from '../../domain/dateFormat';

const PROJECT_URL = 'github.com/tilmanbergt/kept-gtd';
const SLOGAN = 'Kept GTD – for those who write, where they write.';
/** Shown for a few releases after the rename (R9). */
const FORMERLY = 'Formerly gtdpara';
/** How many versions What's new offers; older ones are on GitHub. */
export const WHATS_NEW_VERSIONS = 3;
const SHOWN_RELEASES = CHANGELOG.slice(0, WHATS_NEW_VERSIONS);
const WORDMARK = require('../../../assets/wordmark.png');

interface Props {
  updateCheck: UpdateCheckMode;
  onToggleUpdateCheck: () => void;
  textColor: string;
  borderColor: string;
}

/** The What's-new tab key of a release known from GitHub (no bundled version is named like it). */
const UPDATE_TAB_PREFIX = 'update:';

export default function AboutTab({updateCheck, onToggleUpdateCheck, textColor, borderColor}: Props): React.JSX.Element {
  const b = BUILD_INFO;
  const [diag, setDiag] = useState<RuntimeDiagnostics | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRuntimeDiagnostics().then(d => {
      if (!cancelled) {setDiag(d);}
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = knownUpdate(useUpdateSnapshot());
  // The update's tab takes one of the three places, so the tabs still fit a narrow screen.
  const bundledShown = update ? WHATS_NEW_VERSIONS - 1 : WHATS_NEW_VERSIONS;
  const releases = useMemo(
    () => [
      ...(update ? [{key: `${UPDATE_TAB_PREFIX}${update.version}`, label: `${update.version} · new`, version: update.version, date: update.publishedAt?.slice(0, 10) ?? null, markdown: update.notes}] : []),
      ...SHOWN_RELEASES.slice(0, bundledShown).map(r => ({...r, key: r.version, label: r.version === 'Unreleased' ? (BUILD_INFO.nextVersion ?? 'Unreleased') : r.version})),
    ],
    [update, bundledShown],
  );
  const releaseTabs: MiniTabDef<string>[] = releases.map(r => ({key: r.key, label: r.label}));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = releases.find(r => r.key === selectedKey) ?? releases[0];

  const device = diag ? [diag.manufacturer, diag.model].filter(Boolean).join(' ') : '';
  const builtDate = b.builtAt.slice(0, 10);

  return (
    <View style={styles.row}>
      <ScrollColumn left>
        <Image source={WORDMARK} style={[styles.wordmark, {tintColor: textColor}]} resizeMode="contain" accessibilityLabel="Kept GTD" />
        <Text style={[styles.title, {color: textColor}]}>Kept GTD {buildVersionText(b)}</Text>
        <Text style={[styles.line, {color: textColor}]}>{SLOGAN}</Text>
        <Text style={[styles.line, styles.muted, {color: textColor}]}>{FORMERLY}</Text>
        <Text style={[styles.line, {color: textColor}]}>
          build {b.versionCode || 'dev'} · {builtDate}
        </Text>
        <Text style={[styles.line, {color: textColor}]}>
          commit {b.commit}
          {b.release ? '' : b.dirty ? ' · development build, uncommitted changes' : ' · development build'}
        </Text>
        {device !== '' && (
          <Text style={[styles.line, {color: textColor}]}>
            {device}
            {diag?.display ? ` · ${diag.display}` : ''}
          </Text>
        )}
        <Text style={[styles.line, styles.muted, {color: textColor}]}>{PROJECT_URL}</Text>

        <View style={[styles.hr, {backgroundColor: borderColor}]} />

        <UpdatesBlock updateCheck={updateCheck} onToggleUpdateCheck={onToggleUpdateCheck} textColor={textColor} borderColor={borderColor} />

        <View style={[styles.hr, {backgroundColor: borderColor}]} />

        <Text style={[styles.heading, {color: textColor}]}>Problems and ideas</Text>
        <Text style={[styles.hint, {color: textColor}]}>
          Reports are very welcome - they are how Kept GTD gets better. Open an issue at {PROJECT_URL}: a bug report, an idea, a question. For a
          bug, Settings → Advanced → Reporting a problem saves a debug bundle to attach.
        </Text>
      </ScrollColumn>

      <View style={[styles.vr, {backgroundColor: borderColor}]} />

      <View style={styles.column}>
        <Text style={[styles.heading, {color: textColor}]}>What's new</Text>
        {selected ? (
          <>
            {releaseTabs.length > 1 && (
              <MiniTabs
                tabs={releaseTabs}
                activeKey={selected.key}
                onChange={setSelectedKey}
                textColor={textColor}
                borderColor={borderColor}
              />
            )}
            <MarkdownPager
              markdown={selected.markdown}
              header={selected.version === 'Unreleased' ? unreleasedHeader() : `${selected.version}${selected.date ? ` · ${formatDate(selected.date)}` : ''}`}
              resetKey={selected.key}
              emptyHint="No notes for this version."
              textColor={textColor}
              borderColor={borderColor}
            />
            {CHANGELOG.length > bundledShown && (
              <Text style={[styles.hint, {color: textColor}]}>Earlier versions: CHANGELOG.md at {PROJECT_URL}</Text>
            )}
          </>
        ) : (
          <Text style={[styles.hint, {color: textColor}]}>No release notes in this build.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', flex: 1},
  column: {flex: 1},
  vr: {width: 1, marginRight: SPACING.base},
  hr: {height: 1, marginVertical: SPACING.md},
  wordmark: {width: 280, height: 70, marginBottom: SPACING.sm},
  title: {fontSize: FONT.large, fontWeight: '700', marginBottom: SPACING.xs},
  heading: {fontSize: FONT.medium, fontWeight: '700', marginBottom: SPACING.sm},
  line: {fontSize: FONT.small, marginBottom: 2},
  muted: {opacity: 0.6},
  field: {marginBottom: 18},
  inline: {flexDirection: 'row', alignItems: 'center'},
  button: {alignSelf: 'flex-start'},
  buttonText: {fontSize: FONT.small, fontWeight: '600', textDecorationLine: 'underline'},
  hint: {fontSize: FONT.small, opacity: 0.6, marginTop: 4},
  spinner: {marginLeft: SPACING.sm},
});
