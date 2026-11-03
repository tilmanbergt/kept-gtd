/**
 * The in-app updater's part of the App (docs/dev/history/technical-design-in-app-updates.md
 * §6.1, §6.3): the daily check after the first screen, the "Kept GTD X.Y.Z is available"
 * notice, and the download's messages wherever Download was tapped (notice or About).
 *
 * The What's-new notice wins the slot when both are due; this one follows once it is gone.
 * The daily check never runs while the setup assistant is open and never shows a permission
 * dialog; its failures only go to the log.
 */
import {useEffect, useRef, useSyncExternalStore} from 'react';
import {InteractionManager} from 'react-native';
import {AvailableUpdate, availableText, downloadResultText, downloadingText, shouldAutoCheck, shouldNotify} from '../domain/updateCheck';
import {GtdParaSettings} from '../domain/settings';
import {
  checkForUpdate,
  clearLastDownload,
  dismissUpdate,
  downloadUpdate,
  getUpdateSnapshot,
  isUpdateTestMode,
  knownUpdate,
  loadUpdateState,
  subscribeUpdates,
} from '../storage/updates';
import {errorMessage} from '../utils/errorMessage';
import {log, logError} from '../utils/log';
import {useStatus} from './status/StatusProvider';
import {StatusMessage} from './status/types';

/** After the first screen is drawn, so the check never slows the start. */
export const AUTO_CHECK_DELAY_MS = 3000;

/** The promise is not awaited: the download publishes its own outcome and never rejects. */
export function startDownload(update: AvailableUpdate): void {
  downloadUpdate(update);
}

function notNow(version: string): void {
  dismissUpdate(version);
}

export function useUpdateSnapshot() {
  return useSyncExternalStore(subscribeUpdates, getUpdateSnapshot);
}

export function useUpdateNotice(
  settings: GtdParaSettings | null,
  setupRunning: boolean,
  whatsNewShowing: boolean,
  openAbout: () => void,
): void {
  const snap = useUpdateSnapshot();
  const autoChecked = useRef(false);

  useEffect(() => {
    loadUpdateState().catch(e => logError('App: loading the update state failed', errorMessage(e)));
  }, []);

  const mode = settings?.updateCheck;
  const holdBack = settings === null || setupRunning || settings.setupAssistant === 'pending';
  useEffect(() => {
    if (holdBack || autoChecked.current || mode !== 'daily') return;
    autoChecked.current = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => {
        loadUpdateState()
          .then(s => {
            if (!shouldAutoCheck(mode, isUpdateTestMode() ? null : s.lastCheckAt, Date.now())) return;
            log('App: daily update check');
            return checkForUpdate({silent: true});
          })
          .catch(e => logError('App: daily update check failed', errorMessage(e)));
      }, AUTO_CHECK_DELAY_MS);
    });
    return () => {
      task.cancel();
      if (timer) clearTimeout(timer);
    };
  }, [holdBack, mode]);

  const update = knownUpdate(snap);
  const downloadedThis = !!update && snap.downloaded?.version === update.version;
  let msg: StatusMessage | null = null;
  if (snap.busy === 'downloading') {
    msg = {kind: 'info', scope: 'global', text: update ? downloadingText(update) : 'Downloading…'};
  } else if (snap.lastDownload) {
    const ok = snap.lastDownload.kind === 'saved' || snap.lastDownload.kind === 'already';
    msg = {kind: ok ? 'info' : 'error', scope: 'global', text: downloadResultText(snap.lastDownload), onDismiss: clearLastDownload};
  } else if (update && !whatsNewShowing && !downloadedThis && shouldNotify(update, snap.dismissedVersion)) {
    msg = {
      kind: 'info',
      scope: 'global',
      text: availableText(update.version),
      actions: [
        {label: 'Download', primary: true, onPress: () => startDownload(update)},
        {label: 'Details', onPress: openAbout},
      ],
      onDismiss: () => notNow(update.version),
    };
  }
  useStatus('app.update', msg);
}
