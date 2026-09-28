package com.tally.expensetracker.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import org.json.JSONObject

/**
 * Receives incoming SMS (manifest-registered, so it also fires when the app is closed).
 * Multipart messages are joined, queued locally, and forwarded to JS if it is running.
 * Filtering and parsing happen in JS; message content is never logged.
 */
class SmsReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
    if (!PendingSmsStore.isTrackingEnabled(context)) return

    val parts = try {
      Telephony.Sms.Intents.getMessagesFromIntent(intent)
    } catch (e: Exception) {
      null
    } ?: return

    val bySender = LinkedHashMap<String, Pair<StringBuilder, Long>>()
    for (p in parts) {
      if (p == null) continue
      val sender = p.originatingAddress ?: ""
      val entry = bySender.getOrPut(sender) { Pair(StringBuilder(), p.timestampMillis) }
      entry.first.append(p.messageBody ?: "")
    }

    for ((sender, entry) in bySender) {
      val body = entry.first.toString()
      if (!SmsFilter.mightBeTransaction(body)) continue
      val receivedAt = if (entry.second > 0) entry.second else System.currentTimeMillis()
      val msg = JSONObject()
        .put("id", "rx-$receivedAt-${sender.hashCode()}")
        .put("sender", sender)
        .put("body", body)
        .put("receivedAt", receivedAt.toDouble())
      PendingSmsStore.add(context, msg)
      SmsModule.emitReceived(msg)
    }
  }
}
