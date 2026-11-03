package eu.embodyagile.gtdpara

import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeMap
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.DigestInputStream
import java.security.MessageDigest
import java.util.concurrent.Executors
import java.util.concurrent.RejectedExecutionException
import javax.net.ssl.HttpsURLConnection

/**
 * Downloads a Kept GTD release for the in-app updater
 * (docs/dev/history/technical-design-in-app-updates.md §5). Kept never installs it: the file
 * ends up in `MyStyle/kept-gtd/`, where the Supernote's own Settings → Plugins → Add plugin
 * finds it.
 *
 * - [download] streams an https URL into the private temp folder, hashing it on the way.
 * - [sha256File] hashes a file (for "already downloaded").
 * - [copyIntoFolder] copies a file from the private temp folder into a folder below
 *   `MyStyle/`, through a hidden `.part` file and a rename, never over an existing file.
 *
 * Every call runs on this module's own single thread: React's native-module methods share one
 * thread, so a download there would hold up every GtdParaFile call (todo saves, listings)
 * meanwhile. Nothing here deletes anything outside the private temp folder. The host checks
 * network per socket, so JS asks for the INTERNET permission before [download].
 *
 * Logs under the "KeptUpdate" tag:
 *   adb logcat -c; <reproduce>; adb logcat -d -s ReactNativeJS:V KeptUpdate:V
 */
class KeptUpdateModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "KeptUpdate"
        private const val CONNECT_TIMEOUT_MS = 15_000
        private const val READ_TIMEOUT_MS = 30_000
        private const val MAX_REDIRECTS = 5
        private const val BUFFER_BYTES = 64 * 1024

        /** The only shared folder [copyIntoFolder] writes into (strictly below it). */
        private const val MY_STYLE = "/storage/emulated/0/MyStyle"

        /** A plain file name: no folder part, not hidden. */
        private val PLAIN_NAME = Regex("^[A-Za-z0-9][A-Za-z0-9._ ()-]*$")
    }

    private val executor = Executors.newSingleThreadExecutor()

    init {
        PluginRuntimeGuard.onModuleCreated("KeptUpdate")
    }

    override fun getName(): String = "KeptUpdate"

    /**
     * The React instance is going away (plugin reload or update): stop the thread so it doesn't
     * outlive this build. A running download sees the interrupt between two reads and ends
     * with an error; its partial file stays in the private temp folder.
     */
    override fun invalidate() {
        PluginRuntimeGuard.onModuleInvalidated("KeptUpdate")
        val dropped = executor.shutdownNow().size
        if (dropped > 0) Log.w(TAG, "invalidate: dropped $dropped queued call(s)")
        super.invalidate()
    }

    private fun onThread(call: String, promise: Promise, body: () -> Unit) {
        try {
            executor.execute {
                try {
                    body()
                } catch (error: Throwable) {
                    Log.e(TAG, "$call: failed", error)
                    promise.reject("E_UPDATE", error.message ?: error.javaClass.simpleName, error)
                }
            }
        } catch (error: RejectedExecutionException) {
            promise.reject("E_SHUT_DOWN", "KeptUpdate is shut down", error)
        }
    }

    private fun privateTmpDir(): File = GtdParaFileModule.privateTmpDir(reactApplicationContext)

    private fun isInsidePrivateTmp(file: File): Boolean {
        val tmp = privateTmpDir().canonicalPath
        return file.canonicalPath.startsWith("$tmp/")
    }

    private fun isBelowMyStyle(folder: File): Boolean {
        val root = File(MY_STYLE).canonicalPath
        return folder.canonicalPath.startsWith("$root/")
    }

    private fun hex(bytes: ByteArray): String = bytes.joinToString("") { "%02x".format(it) }

    /** Opens [url] over https, following up to [MAX_REDIRECTS] redirects, each of them https too. */
    private fun openHttps(url: String, userAgent: String): HttpsURLConnection {
        var next = URL(url)
        repeat(MAX_REDIRECTS + 1) {
            if (next.protocol != "https") throw IOException("E_NOT_HTTPS")
            val connection = next.openConnection() as HttpsURLConnection
            connection.instanceFollowRedirects = false
            connection.connectTimeout = CONNECT_TIMEOUT_MS
            connection.readTimeout = READ_TIMEOUT_MS
            connection.setRequestProperty("User-Agent", userAgent)
            connection.setRequestProperty("Accept", "application/octet-stream")
            val code = connection.responseCode
            if (code in 300..399) {
                val location = connection.getHeaderField("Location")
                connection.disconnect()
                if (location.isNullOrEmpty()) throw IOException("E_HTTP_$code")
                next = URL(next, location)
                return@repeat
            }
            if (code != HttpURLConnection.HTTP_OK) {
                connection.disconnect()
                throw IOException("E_HTTP_$code")
            }
            return connection
        }
        throw IOException("E_TOO_MANY_REDIRECTS")
    }

    /**
     * Streams [url] into `<private tmp>/<fileName>` and resolves `{path, size, sha256}`. Rejects
     * with `E_HTTP_<code>`, `E_NOT_HTTPS`, `E_TOO_LARGE` (a Content-Length or a body above
     * [maxBytes]) or `E_NETWORK`; on any failure the partial file in the private temp folder is
     * removed.
     */
    @ReactMethod
    fun download(url: String?, fileName: String?, maxBytes: Double, userAgent: String?, promise: Promise) {
        PluginRuntimeGuard.trace("KeptUpdate.download")
        if (url.isNullOrEmpty() || !url.startsWith("https://")) {
            promise.reject("E_NOT_HTTPS", "Only https downloads: $url")
            return
        }
        if (fileName.isNullOrEmpty() || !PLAIN_NAME.matches(fileName)) {
            promise.reject("E_NAME", "Not a plain file name: $fileName")
            return
        }
        val limit = maxBytes.toLong()
        onThread("download", promise) {
            val tmp = privateTmpDir()
            if (!tmp.exists()) tmp.mkdirs()
            val target = File(tmp, fileName)
            var connection: HttpsURLConnection? = null
            try {
                connection = openHttps(url, userAgent ?: "KeptGTD")
                val declared = connection.contentLengthLong
                if (declared > limit) throw IOException("E_TOO_LARGE")
                val digest = MessageDigest.getInstance("SHA-256")
                var size = 0L
                DigestInputStream(connection.inputStream, digest).use { input ->
                    FileOutputStream(target, false).use { output ->
                        val buffer = ByteArray(BUFFER_BYTES)
                        while (true) {
                            if (Thread.currentThread().isInterrupted) throw IOException("E_INTERRUPTED")
                            val read = input.read(buffer)
                            if (read < 0) break
                            size += read
                            if (size > limit) throw IOException("E_TOO_LARGE")
                            output.write(buffer, 0, read)
                        }
                        output.fd.sync()
                    }
                }
                val result = WritableNativeMap()
                result.putString("path", target.absolutePath)
                result.putDouble("size", size.toDouble())
                result.putString("sha256", hex(digest.digest()))
                Log.d(TAG, "download: done size=$size")
                promise.resolve(result)
            } catch (error: Throwable) {
                if (isInsidePrivateTmp(target)) target.delete()
                val message = error.message ?: ""
                val code = if (message.startsWith("E_")) message else "E_NETWORK"
                Log.e(TAG, "download: failed code=$code", error)
                promise.reject(code, message.ifEmpty { error.javaClass.simpleName }, error)
            } finally {
                connection?.disconnect()
            }
        }
    }

    /** Lowercase hex SHA-256 of [path]. */
    @ReactMethod
    fun sha256File(path: String?, promise: Promise) {
        PluginRuntimeGuard.trace("KeptUpdate.sha256File")
        if (path.isNullOrEmpty()) {
            promise.reject("E_PATH", "No path")
            return
        }
        onThread("sha256File", promise) {
            val digest = MessageDigest.getInstance("SHA-256")
            FileInputStream(File(path)).use { input -> drain(DigestInputStream(input, digest)) }
            promise.resolve(hex(digest.digest()))
        }
    }

    private fun drain(input: InputStream) {
        val buffer = ByteArray(BUFFER_BYTES)
        while (input.read(buffer) >= 0) {
            // reading is the point: the DigestInputStream hashes what passes through
        }
    }

    /**
     * Copies [fromPath] (inside the private temp folder) to `<toFolder>/<fileName>` (a folder
     * below `MyStyle/`, created if missing) and resolves the final path. Writes
     * `.<fileName>.part` first (an old one of the same name is overwritten), then renames it, so
     * the plugin picker never sees half a file. Rejects with `E_DEST_EXISTS` when [fileName] is
     * taken - JS picks a free name first - and never overwrites or deletes anything else.
     */
    @ReactMethod
    fun copyIntoFolder(fromPath: String?, toFolder: String?, fileName: String?, promise: Promise) {
        PluginRuntimeGuard.trace("KeptUpdate.copyIntoFolder")
        if (fromPath.isNullOrEmpty() || toFolder.isNullOrEmpty() || fileName.isNullOrEmpty() || !PLAIN_NAME.matches(fileName)) {
            promise.reject("E_ARGS", "copyIntoFolder needs a source, a folder and a plain file name")
            return
        }
        onThread("copyIntoFolder", promise) {
            val source = File(fromPath)
            val folder = File(toFolder)
            if (!isInsidePrivateTmp(source) || !source.isFile) {
                promise.reject("E_NOT_TEMP", "Copies only from the private temp folder: $fromPath")
                return@onThread
            }
            if (!isBelowMyStyle(folder)) {
                promise.reject("E_NOT_MY_STYLE", "Copies only into a folder below $MY_STYLE: $toFolder")
                return@onThread
            }
            if (!folder.isDirectory && !folder.mkdirs()) {
                promise.reject("E_MKDIR", "Could not create $toFolder")
                return@onThread
            }
            val dest = File(folder, fileName)
            if (dest.exists()) {
                promise.reject("E_DEST_EXISTS", "Already exists: ${dest.absolutePath}")
                return@onThread
            }
            val part = File(folder, ".$fileName.part")
            FileInputStream(source).use { input ->
                FileOutputStream(part, false).use { output ->
                    input.copyTo(output, BUFFER_BYTES)
                    output.fd.sync()
                }
            }
            if (part.length() != source.length()) {
                promise.reject("E_COPY", "Copy is ${part.length()} bytes, source ${source.length()}")
                return@onThread
            }
            if (dest.exists() || !part.renameTo(dest)) {
                promise.reject("E_RENAME", "Could not rename the .part file to $fileName")
                return@onThread
            }
            Log.d(TAG, "copyIntoFolder: done size=${dest.length()}")
            promise.resolve(dest.absolutePath)
        }
    }
}
