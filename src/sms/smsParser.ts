import { RawSms } from '../types/transaction';
import {
  detectBank,
  detectDirection,
  detectMethod,
  detectSalary,
  detectSelfTransfer,
  extractAccount,
  extractAmount,
  extractDate,
  extractReference,
  extractTime,
  extractVpa,
} from './smsPatterns/common';
import { fallbackPatterns, ParsedSms, PatternFields, specificPatterns } from './smsPatterns';

export type RejectReason =
  | 'empty'
  | 'otp'
  | 'promotional'
  | 'reminder'
  | 'failed'
  | 'not_financial'
  | 'no_amount';

export type ParseResult = { ok: true; parsed: ParsedSms } | { ok: false; reason: RejectReason };

/** Verbs that only appear once money has actually moved. */
const COMPLETED = /\b(debited|credited|spent|withdrawn|deposited|sent|received|paid|transferred|refunded|reversed)\b/i;
const TXN_HINT = /\b(txn|transaction|purchase)\b/i;
const CURRENCY = /(?:rs\.?|inr|₹)\s*[\d,]*\d/i;

const OTP = /\b(otp|one[- ]time password|verification code|security code|auth(?:entication)? code)\b/i;
const PROMO =
  /\b(offer|pre-?approved|apply now|loan of|win\b|winner|congratulations|voucher|coupon|% off|limited period|click here|avail now|upgrade now|lucky)\b/i;
const REMINDER =
  /\b(is due|due on|due date|due by|minimum amount due|bill (?:is )?generated|statement (?:is )?generated|has requested|collect request|requested money|will be debited|to be debited|would be debited|is scheduled|payment reminder)\b/i;
const FAILED = /\b(failed|declined|unsuccessful|could not be processed|was not successful|rejected)\b/i;

/**
 * Cheap, deterministic classification: is this SMS a completed money movement?
 * Order matters — OTP / promo / reminders are rejected before anything else.
 */
export function classifySms(body: string): RejectReason | null {
  if (!body || !body.trim()) return 'empty';
  const completed = COMPLETED.test(body);
  if (OTP.test(body) && !completed) return 'otp';
  if (REMINDER.test(body)) return 'reminder';
  if (FAILED.test(body) && !/\b(credited|refunded)\b/i.test(body)) return 'failed';
  if (PROMO.test(body) && !completed) return 'promotional';
  if (!CURRENCY.test(body) && !/\b(debited|credited)\s+(?:by|for|with)?\s*\d/i.test(body)) return 'not_financial';
  // "Txn of INR 500 done at X" has no completed verb but is still a transaction.
  if (!completed && !TXN_HINT.test(body)) return 'not_financial';
  return null;
}

function applyFields(base: ParsedSms, f: PatternFields | null): ParsedSms {
  if (!f) return base;
  const out: ParsedSms = { ...base };
  (Object.keys(f) as (keyof PatternFields)[]).forEach(k => {
    const v = f[k];
    if (v !== undefined && v !== null) (out as any)[k] = v;
  });
  return out;
}

/**
 * Parses one SMS into structured fields. Pure and deterministic: the same input
 * always yields the same output, which keeps it easy to unit-test.
 */
export function parseSms(sms: RawSms): ParseResult {
  const body = (sms.body ?? '').replace(/\r/g, '').trim();
  const reason = classifySms(body);
  if (reason) return { ok: false, reason };

  const amount = extractAmount(body);
  if (amount == null) return { ok: false, reason: 'no_amount' };

  let parsed: ParsedSms = {
    direction: detectDirection(body),
    amount,
    counterparty: null,
    vpa: extractVpa(body),
    account: extractAccount(body),
    bank: detectBank(sms.sender ?? '', body),
    reference: extractReference(body),
    method: detectMethod(body),
    date: extractDate(body, sms.receivedAt),
    time: extractTime(body),
    isSelfTransfer: detectSelfTransfer(body),
    isSalary: detectSalary(body),
    patternId: 'none',
  };

  for (const p of specificPatterns) {
    if (p.senders && !p.senders.test(sms.sender ?? '')) continue;
    const f = p.match(body, sms);
    if (f) {
      parsed = applyFields(parsed, f);
      parsed.patternId = p.id;
      break;
    }
  }

  if (!parsed.counterparty) {
    const upi = fallbackPatterns.upi.match(body, sms);
    const generic =
      parsed.direction === 'credit'
        ? fallbackPatterns.credit.match(body, sms)
        : fallbackPatterns.debit.match(body, sms);
    const chosen = upi ?? generic;
    if (chosen) {
      parsed = applyFields(parsed, chosen);
      if (parsed.patternId === 'none') parsed.patternId = upi ? fallbackPatterns.upi.id : parsed.direction === 'credit' ? fallbackPatterns.credit.id : fallbackPatterns.debit.id;
    }
  }

  return { ok: true, parsed };
}
