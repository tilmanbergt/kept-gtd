/**
 * JS side of the native `GtdParaRuntime` module (GtdParaRuntimeModule.kt /
 * PluginRuntimeGuard.kt) - docs/dev/history/technical-design-host-update-crash.md.
 *
 * `getRuntimeDiagnostics` reports the build and the device for About and the
 * debug bundle. Never throws.
 */
import {NativeModules} from 'react-native';
import {log, logError} from '../utils/log';
import {errorMessage} from '../utils/errorMessage';

const {GtdParaRuntime} = NativeModules;

export interface RuntimeDiagnostics {
  buildId: string;
  versionCode: string;
  loaderId: string;
  pid: number;
  processAgeMs: number;
  npkPath: string | null;
  model: string;
  manufacturer: string;
  /** Android Build.DISPLAY - on the Supernote usually the firmware version string. */
  display: string;
  androidRelease: string;
}

/** null when the native module is missing or the call failed (logged). */
export async function getRuntimeDiagnostics(): Promise<RuntimeDiagnostics | null> {
  if (!GtdParaRuntime?.getRuntimeDiagnostics) {
    logError('pluginRuntime: GtdParaRuntime native module not available');
    return null;
  }
  try {
    const d = (await GtdParaRuntime.getRuntimeDiagnostics()) as RuntimeDiagnostics;
    log('pluginRuntime: diagnostics', {
      buildId: d.buildId,
      versionCode: d.versionCode,
      loaderId: d.loaderId,
      pid: d.pid,
      processAgeMs: d.processAgeMs,
    });
    return d;
  } catch (e) {
    logError('pluginRuntime: getRuntimeDiagnostics failed', errorMessage(e));
    return null;
  }
}

