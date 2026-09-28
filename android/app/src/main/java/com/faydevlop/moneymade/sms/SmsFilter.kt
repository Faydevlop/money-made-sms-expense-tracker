package com.faydevlop.moneymade.sms

/**
 * Cheap native pre-filter so that personal messages never cross into JS.
 * The real classification lives in the JS parser (src/sms/smsParser.ts).
 */
object SmsFilter {
  private val currency = Regex("(?i)(rs\\.?|inr|₹)\\s*[\\d,]*\\d")
  private val moneyVerb = Regex("(?i)\\b(debited|credited)\\b")

  fun mightBeTransaction(body: String): Boolean =
    body.isNotBlank() && (currency.containsMatchIn(body) || moneyVerb.containsMatchIn(body))
}
