/**
 * The "Updated to x.y.z" notice with its "What's new" button
 * (docs/dev/history/technical-design-about-debug-experimental.md §3.6, P3),
 * and the one-time line "Focus is retired. …" after an update from a release
 * with focus (docs/dev/history/technical-design-time-and-place.md R7): it
 * stays until ✕, which stores `focusRetiredNoticeSeen`.
 * Only a tap on "What's new" or ✕ stores lastSeenVersion - not merely
 * showing it - a first start after an update can be short (the user only
 * marks something, or a warning outranks info in the status slot), so the
 * notice must survive to the next start.
 */
import {useState} from 'react';
import {shouldShowFocusRetired, shouldShowWhatsNew} from '../domain/features';
import {GtdParaSettings} from '../domain/settings';
import {BUILD_INFO} from '../generated/buildInfo';
import {patchSettings} from '../storage/settingsStorage';
import {errorMessage} from '../utils/errorMessage';
import {logError} from '../utils/log';
import {useStatus} from './status/StatusProvider';

export const FOCUS_RETIRED_TEXT = 'Focus is retired. Contexts decide what Daily shows: Settings → Contexts.';

export function useWhatsNewNotice(
  settings: GtdParaSettings | null,
  onSettingsStored: (settings: GtdParaSettings) => void,
  openAbout: () => void,
): void {
  const [acknowledged, setAcknowledged] = useState(false);
  const [retiredSeen, setRetiredSeen] = useState(false);
  const dismissRetired = () => {
    setRetiredSeen(true);
    patchSettings({focusRetiredNoticeSeen: true})
      .then(onSettingsStored)
      .catch(e => logError('App: storing focusRetiredNoticeSeen failed', errorMessage(e)));
  };
  const showRetired = settings !== null && !retiredSeen && shouldShowFocusRetired(settings.lastSeenVersion, settings.focusRetiredNoticeSeen);
  useStatus(
    'app.focusRetired',
    showRetired ? {kind: 'info', scope: 'global', text: FOCUS_RETIRED_TEXT, onDismiss: dismissRetired} : null,
  );
  const acknowledge = () => {
    setAcknowledged(true);
    patchSettings({lastSeenVersion: BUILD_INFO.version})
      .then(onSettingsStored)
      .catch(e => logError('App: storing lastSeenVersion failed', errorMessage(e)));
  };
  const show = settings !== null && !acknowledged && shouldShowWhatsNew(settings.lastSeenVersion, BUILD_INFO);
  useStatus(
    'app.whatsNew',
    show
      ? {
          kind: 'info',
          scope: 'global',
          text: `Updated to Kept GTD ${BUILD_INFO.version}.`,
          actions: [
            {
              label: "What's new",
              primary: true,
              onPress: () => {
                acknowledge();
                openAbout();
              },
            },
          ],
          onDismiss: acknowledge,
        }
      : null,
  );
}
