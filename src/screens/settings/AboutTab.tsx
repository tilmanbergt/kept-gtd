/**
 * Settings → About (docs/dev/history/technical-design-about-debug-experimental.md §3.5):
 * left - wordmark, name and slogan (docs/dev/history/technical-design-kept-gtd.md §3.2),
 * version/build/device and an invitation to report problems and ideas (the debug tools are on
 * Advanced, docs/dev/history/technical-design-settings-tabs.md T6);
 * right - "What's new" from the bundled CHANGELOG, paged, no scrolling: the last three versions
 * (docs/dev/history/technical-design-launch-ready.md L6), so their tabs fit even a narrow screen;
 * older ones are in CHANGELOG.md on GitHub.
 */
import React, {useEffect, useMemo, useState} from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {buildVersionText} from '../../domain/buildVersionText';
import {BUILD_INFO} from '../../generated/buildInfo';
import {CHANGELOG} from '../../generated/changelog';
import {getRuntimeDiagnostics, RuntimeDiagnostics} from '../../supernote/pluginRuntime';
import MarkdownPager from '../../ui/MarkdownBlocks';
import MiniTabs, {MiniTabDef} from '../../ui/MiniTabs';
import {FONT, SPACING} from '../../ui/theme';

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
  textColor: string;
  borderColor: string;
}

export default function AboutTab({textColor, borderColor}: Props): React.JSX.Element {
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

  const releaseTabs: MiniTabDef<string>[] = useMemo(
    () => SHOWN_RELEASES.map(r => ({key: r.version, label: r.version === 'Unreleased' ? (BUILD_INFO.nextVersion ?? 'Unreleased') : r.version})),
    [],
  );
  const [selectedVersion, setSelectedVersion] = useState<string>(SHOWN_RELEASES[0]?.version ?? '');
  const selected = SHOWN_RELEASES.find(r => r.version === selectedVersion) ?? SHOWN_RELEASES[0];

  const device = diag ? [diag.manufacturer, diag.model].filter(Boolean).join(' ') : '';
  const builtDate = b.builtAt.slice(0, 10);

  return (
    <View style={styles.row}>
      <View style={[styles.column, styles.columnLeft]}>
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

        <Text style={[styles.heading, {color: textColor}]}>Problems and ideas</Text>
        <Text style={[styles.hint, {color: textColor}]}>
          Reports are very welcome - they are how Kept GTD gets better. Open an issue at {PROJECT_URL}: a bug report, an idea, a question. For a
          bug, Settings → Advanced → Reporting a problem saves a debug bundle to attach.
        </Text>
      </View>

      <View style={[styles.vr, {backgroundColor: borderColor}]} />

      <View style={styles.column}>
        <Text style={[styles.heading, {color: textColor}]}>What's new</Text>
        {selected ? (
          <>
            {releaseTabs.length > 1 && (
              <MiniTabs
                tabs={releaseTabs}
                activeKey={selected.version}
                onChange={setSelectedVersion}
                textColor={textColor}
                borderColor={borderColor}
              />
            )}
            <MarkdownPager
              markdown={selected.markdown}
              header={selected.version === 'Unreleased' ? unreleasedHeader() : `${selected.version}${selected.date ? ` · ${formatDate(selected.date)}` : ''}`}
              resetKey={selected.version}
              emptyHint="No notes for this version."
              textColor={textColor}
              borderColor={borderColor}
            />
            {CHANGELOG.length > WHATS_NEW_VERSIONS && (
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
  columnLeft: {marginRight: SPACING.base},
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
