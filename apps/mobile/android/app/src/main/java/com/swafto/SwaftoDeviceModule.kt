package com.swafto

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

/**
 * R5 FR-3 AND FR-4: TWO THINGS THE PHONE ALREADY DOES, ASKED FOR.
 *
 * The app lock is the phone's OWN screen lock (PIN, pattern, password or
 * fingerprint, whatever he set) through KeyguardManager - no PIN of ours to
 * forget, store or reset, and no new dependency. `createConfirmDeviceCredentialIntent`
 * is deprecated from API 29 in favour of androidx.biometric, which this build
 * does not carry; it still works on every API this app supports.
 * ponytail: KeyguardManager intent; move to BiometricPrompt(DEVICE_CREDENTIAL) if it is removed.
 *
 * The share is a real file, because an accountant opens a .csv in a spreadsheet
 * and a CSV pasted into a chat message is not one. Written to the cache (never
 * external storage), handed out by FileProvider with a read grant only.
 */
class SwaftoDeviceModule(private val context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context), ActivityEventListener {

  private var pending: Promise? = null

  init {
    context.addActivityEventListener(this)
  }

  override fun getName(): String = "SwaftoDevice"

  /**
   * C-16: the API origin, baked in at build time (app/build.gradle,
   * BuildConfig.API_BASE_URL) and read once by endpoint.ts. A constant, not a
   * method, so JS has it before the first request.
   */
  override fun getConstants(): MutableMap<String, Any> =
      mutableMapOf(
          "API_BASE_URL" to BuildConfig.API_BASE_URL,
          // The NATIVE build type; JS must not infer it from __DEV__ (always false here).
          "isDebugBuild" to BuildConfig.DEBUG,
      )

  private fun keyguard(): KeyguardManager =
      context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager

  @ReactMethod
  fun isDeviceSecure(promise: Promise) {
    promise.resolve(keyguard().isDeviceSecure)
  }

  @Suppress("DEPRECATION")
  @ReactMethod
  fun confirmCredential(title: String, description: String, promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    val intent = keyguard().createConfirmDeviceCredentialIntent(title, description)
    if (activity == null || intent == null) {
      promise.resolve("unavailable")
      return
    }
    // One prompt at a time: a second ask settles the first as cancelled.
    pending?.resolve("cancelled")
    pending = promise
    activity.startActivityForResult(intent, REQUEST_CONFIRM)
  }

  override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode != REQUEST_CONFIRM) return
    pending?.resolve(if (resultCode == Activity.RESULT_OK) "ok" else "cancelled")
    pending = null
  }

  override fun onNewIntent(intent: Intent) {}

  @ReactMethod
  fun shareTextFile(fileName: String, mimeType: String, text: String, chooserTitle: String, promise: Promise) {
    try {
      // The name is ours to make safe: no path separators, nothing hidden.
      val safe = fileName.replace(Regex("[^A-Za-z0-9._-]"), "_").trimStart('.').ifEmpty { "export.txt" }
      val dir = File(context.cacheDir, "exports").apply { mkdirs() }
      val file = File(dir, safe)
      file.writeText(text, Charsets.UTF_8)
      val uri = FileProvider.getUriForFile(context, context.packageName + ".exports", file)
      val send =
          Intent(Intent.ACTION_SEND).apply {
            type = mimeType
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
          }
      val chooser =
          Intent.createChooser(send, chooserTitle).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
      context.startActivity(chooser)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("share_failed", e.message, e)
    }
  }

  /**
   * M3 (FLOWS "Today: phone date is behind the book"): open the phone's own
   * Date and time settings. The app never corrects the date itself - the book
   * stays as recorded and the clock is his to fix - so this only takes him to
   * the screen where he can. Some OEM builds have no such activity; the reject
   * lets the caller fall back to the written instruction.
   */
  @ReactMethod
  fun openDateSettings(promise: Promise) {
    try {
      val intent =
          Intent(android.provider.Settings.ACTION_DATE_SETTINGS).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          }
      context.startActivity(intent)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("date_settings_unavailable", e.message, e)
    }
  }

  companion object {
    private const val REQUEST_CONFIRM = 4711
  }
}
