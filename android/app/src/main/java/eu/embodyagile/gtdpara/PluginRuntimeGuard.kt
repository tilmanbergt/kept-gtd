package eu.embodyagile.gtdpara

import android.os.Build
import android.os.Process
import android.os.SystemClock
import android.util.Log
import java.io.File

/**
 * Who this build is, for the private folder and the native logs
 * (docs/dev/history/technical-design-host-update-crash.md).
 *
 * This object is loaded once per class loader, i.e. once per installed build:
 *  - [npkPath], [pluginId], [buildId]: parsed from this class's own class
 *    loader; the plugin's private folder is the npk's folder.
 *  - [versionCode]: from the installed PluginConfig.json next to the npk.
 *  - [trace]: a one-line breadcrumb at the start of every @ReactMethod, so a
 *    crash log shows the last native call and which build made it.
 *
 * Logs under the "GtdParaRuntime" tag:
 *   adb logcat -d -s GtdParaRuntime:V ReactNativeJS:V
 */
object PluginRuntimeGuard {
    private const val TAG = "GtdParaRuntime"
    /** PluginConfig.json's pluginID - fallback when it can't be parsed from the class loader. */
    private const val FALLBACK_PLUGIN_ID = "ndx27q77pojfqh6l"

    private val BUILD_FILE_RE = Regex("""(app_\d+)\.(npk|odex|vdex|art)""")
    private val NPK_PATH_RE = Regex("""(/[^\s"',\]\[]*/plugins/([A-Za-z0-9]+)/app_\d+\.npk)""")

    private val loaderDescription: String = try {
        PluginRuntimeGuard::class.java.classLoader?.toString() ?: "null"
    } catch (e: Throwable) {
        "unavailable: ${e.javaClass.simpleName}"
    }

    /** Hex identity of this build's class loader - distinguishes two loads of the same file. */
    val loaderId: String = Integer.toHexString(System.identityHashCode(PluginRuntimeGuard::class.java.classLoader))

    val npkPath: String? = NPK_PATH_RE.find(loaderDescription)?.groupValues?.get(1)

    val pluginId: String = npkPath?.let { NPK_PATH_RE.find(it)?.groupValues?.get(2) } ?: FALLBACK_PLUGIN_ID

    /** "app_1790688024888" - or "unknown" if the class loader didn't reveal the npk path. */
    val buildId: String = npkPath?.let { BUILD_FILE_RE.find(it)?.groupValues?.get(1) } ?: "unknown"

    /** versionCode from the installed PluginConfig.json next to the npk, if the host keeps one there. */
    val versionCode: String = try {
        val dir = npkPath?.let { File(it).parentFile }
        val config = dir?.let { File(it, "PluginConfig.json") }
        if (config != null && config.isFile) {
            Regex(""""versionCode"\s*:\s*"?(\d+)"?""").find(config.readText())?.groupValues?.get(1) ?: "?"
        } else {
            "?"
        }
    } catch (e: Throwable) {
        "?"
    }

    @Volatile
    private var moduleCount = 0

    init {
        Log.i(
            TAG,
            "build loaded: build=$buildId versionCode=$versionCode loader=$loaderId pid=${Process.myPid()} " +
                "processAgeMs=${processAgeMs()} npk=${npkPath ?: "?"}",
        )
        if (npkPath == null) {
            Log.w(TAG, "build loaded: could not parse npk path from class loader: ${loaderDescription.take(400)}")
        }
    }

    /** Called from every native module's init block. */
    fun onModuleCreated(moduleName: String) {
        moduleCount++
        Log.i(TAG, "module created: $moduleName build=$buildId loader=$loaderId thread=${Thread.currentThread().name}")
    }

    /** Called from every native module's invalidate(). */
    fun onModuleInvalidated(moduleName: String) {
        moduleCount--
        Log.i(TAG, "module invalidated: $moduleName build=$buildId loader=$loaderId remaining=$moduleCount thread=${Thread.currentThread().name}")
    }

    /** One-line breadcrumb at the start of every @ReactMethod. */
    fun trace(call: String) {
        Log.i(TAG, "call $call build=$buildId loader=$loaderId thread=${Thread.currentThread().name}")
    }

    /** Milliseconds since the host process started (-1 if unknown). */
    fun processAgeMs(): Long = try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            SystemClock.elapsedRealtime() - Process.getStartElapsedRealtime()
        } else {
            -1
        }
    } catch (e: Throwable) {
        -1
    }
}
