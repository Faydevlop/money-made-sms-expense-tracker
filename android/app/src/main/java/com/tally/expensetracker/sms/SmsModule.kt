package com.tally.expensetracker.sms

import android.Manifest
import android.content.pm.PackageManager
import android.provider.Telephony
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableMap
import org.json.JSONObject
import java.lang.ref.WeakReference
import java.util.concurrent.Executors

class SmsModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {

  companion object {
    const val NAME = "TallySms"
    const val EVENT_RECEIVED = "TallySmsReceived"
    private var current: WeakReference<ReactApplicationContext>? = null
    private val io = Executors.newSingleThreadExecutor()

    fun emitReceived(msg: JSONObject) {
      val rc = current?.get() ?: return
      if (!rc.hasActiveReactInstance()) return
      try {
        rc.emitDeviceEvent(EVENT_RECEIVED, toMap(msg))
      } catch (e: Exception) {
        // JS not ready; the message stays queued in PendingSmsStore.
      }
    }

    private fun toMap(o: JSONObject): WritableMap = Arguments.createMap().apply {
      putString("id", o.optString("id"))
      putString("sender", o.optString("sender"))
      putString("body", o.optString("body"))
      putDouble("receivedAt", o.optDouble("receivedAt"))
    }
  }

  init {
    current = WeakReference(ctx)
  }

  override fun getName() = NAME

  private fun hasReadPermission() =
    ContextCompat.checkSelfPermission(ctx, Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED

  @ReactMethod
  fun isAvailable(promise: Promise) {
    val pm = ctx.packageManager
    promise.resolve(pm.hasSystemFeature(PackageManager.FEATURE_TELEPHONY_MESSAGING) || pm.hasSystemFeature(PackageManager.FEATURE_TELEPHONY))
  }

  /**
   * Reads inbox messages newer than [sinceMs] (newest first, up to [limit]) that
   * pass the native pre-filter. Resolves { scanned, messages }.
   */
  @ReactMethod
  fun readInbox(sinceMs: Double, limit: Double, promise: Promise) {
    if (!hasReadPermission()) {
      promise.reject("E_PERMISSION", "SMS permission not granted")
      return
    }
    io.execute {
      try {
        val out = Arguments.createArray()
        var scanned = 0
        val cursor = ctx.contentResolver.query(
          Telephony.Sms.Inbox.CONTENT_URI,
          arrayOf(Telephony.Sms._ID, Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE),
          "${Telephony.Sms.DATE} > ?",
          arrayOf(sinceMs.toLong().toString()),
          "${Telephony.Sms.DATE} DESC",
        )
        cursor?.use { c ->
          val iId = c.getColumnIndexOrThrow(Telephony.Sms._ID)
          val iAddr = c.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
          val iBody = c.getColumnIndexOrThrow(Telephony.Sms.BODY)
          val iDate = c.getColumnIndexOrThrow(Telephony.Sms.DATE)
          while (c.moveToNext() && scanned < limit.toInt()) {
            scanned++
            val body = c.getString(iBody) ?: continue
            if (!SmsFilter.mightBeTransaction(body)) continue
            out.pushMap(Arguments.createMap().apply {
              putString("id", "inbox-" + c.getLong(iId))
              putString("sender", c.getString(iAddr) ?: "")
              putString("body", body)
              putDouble("receivedAt", c.getLong(iDate).toDouble())
            })
          }
        }
        promise.resolve(Arguments.createMap().apply {
          putInt("scanned", scanned)
          putArray("messages", out)
        })
      } catch (e: SecurityException) {
        promise.reject("E_PERMISSION", "SMS permission not granted")
      } catch (e: Exception) {
        promise.reject("E_READ", "Could not read SMS inbox")
      }
    }
  }

  @ReactMethod
  fun getPending(promise: Promise) {
    try {
      val arr = PendingSmsStore.read(ctx)
      val out = Arguments.createArray()
      for (i in 0 until arr.length()) arr.optJSONObject(i)?.let { out.pushMap(toMap(it)) }
      promise.resolve(out)
    } catch (e: Exception) {
      promise.resolve(Arguments.createArray())
    }
  }

  @ReactMethod
  fun ackPending(ids: ReadableArray) {
    val set = HashSet<String>()
    for (i in 0 until ids.size()) ids.getString(i)?.let { set.add(it) }
    PendingSmsStore.remove(ctx, set)
  }

  @ReactMethod
  fun setTrackingEnabled(enabled: Boolean) {
    PendingSmsStore.setTrackingEnabled(ctx, enabled)
  }

  // Required for NativeEventEmitter on the JS side.
  @ReactMethod
  fun addListener(eventName: String) {}

  @ReactMethod
  fun removeListeners(count: Double) {}
}
