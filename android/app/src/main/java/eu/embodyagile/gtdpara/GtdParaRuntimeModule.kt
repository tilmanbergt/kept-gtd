package eu.embodyagile.gtdpara

import android.os.Build
import android.os.Process
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeMap

/**
 * JS surface for PluginRuntimeGuard (docs/dev/history/technical-design-host-update-crash.md):
 * the build and device facts for About and the debug bundle.
 *
 * JS side: supernote/pluginRuntime.ts (bridge name "GtdParaRuntime").
 */
class GtdParaRuntimeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    init {
        PluginRuntimeGuard.onModuleCreated(NAME)
    }

    companion object {
        private const val NAME = "GtdParaRuntime"
    }

    override fun getName(): String = NAME

    override fun invalidate() {
        PluginRuntimeGuard.onModuleInvalidated(NAME)
        super.invalidate()
    }

    /**
     * Resolves {buildId, versionCode, loaderId, pid, processAgeMs, npkPath,
     * model, manufacturer, display, androidRelease}.
     */
    @ReactMethod
    fun getRuntimeDiagnostics(promise: Promise) {
        PluginRuntimeGuard.trace("$NAME.getRuntimeDiagnostics")
        try {
            val map = WritableNativeMap()
            map.putString("buildId", PluginRuntimeGuard.buildId)
            map.putString("versionCode", PluginRuntimeGuard.versionCode)
            map.putString("loaderId", PluginRuntimeGuard.loaderId)
            map.putInt("pid", Process.myPid())
            map.putDouble("processAgeMs", PluginRuntimeGuard.processAgeMs().toDouble())
            map.putString("npkPath", PluginRuntimeGuard.npkPath)
            // Device facts for the debug bundle (docs/dev/technical-design-about-debug-experimental.md §3.4).
            map.putString("model", Build.MODEL ?: "")
            map.putString("manufacturer", Build.MANUFACTURER ?: "")
            map.putString("display", Build.DISPLAY ?: "")
            map.putString("androidRelease", Build.VERSION.RELEASE ?: "")
            promise.resolve(map)
        } catch (e: Throwable) {
            promise.reject("E_DIAGNOSTICS", "${e.javaClass.simpleName}: ${e.message}", e)
        }
    }
}
