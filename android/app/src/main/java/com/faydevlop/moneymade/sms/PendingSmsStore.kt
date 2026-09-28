package com.faydevlop.moneymade.sms

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * Small on-device queue for SMS that arrive while the JS side is not running.
 * Messages stay in the app's private SharedPreferences until JS acknowledges them.
 * Nothing here is logged or sent anywhere.
 */
object PendingSmsStore {
  private const val PREFS = "moneymade_sms"
  private const val KEY_QUEUE = "pending"
  private const val KEY_TRACKING = "tracking_enabled"
  private const val MAX_QUEUE = 500

  private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun isTrackingEnabled(ctx: Context): Boolean = prefs(ctx).getBoolean(KEY_TRACKING, false)

  fun setTrackingEnabled(ctx: Context, enabled: Boolean) {
    prefs(ctx).edit().putBoolean(KEY_TRACKING, enabled).apply()
    if (!enabled) prefs(ctx).edit().remove(KEY_QUEUE).apply()
  }

  @Synchronized
  fun add(ctx: Context, msg: JSONObject) {
    val arr = read(ctx)
    arr.put(msg)
    val trimmed = JSONArray()
    val start = maxOf(0, arr.length() - MAX_QUEUE)
    for (i in start until arr.length()) trimmed.put(arr.get(i))
    prefs(ctx).edit().putString(KEY_QUEUE, trimmed.toString()).apply()
  }

  @Synchronized
  fun read(ctx: Context): JSONArray =
    try {
      JSONArray(prefs(ctx).getString(KEY_QUEUE, "[]"))
    } catch (e: Exception) {
      JSONArray()
    }

  @Synchronized
  fun remove(ctx: Context, ids: Set<String>) {
    val arr = read(ctx)
    val kept = JSONArray()
    for (i in 0 until arr.length()) {
      val o = arr.optJSONObject(i) ?: continue
      if (!ids.contains(o.optString("id"))) kept.put(o)
    }
    prefs(ctx).edit().putString(KEY_QUEUE, kept.toString()).apply()
  }
}
