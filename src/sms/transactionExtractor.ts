import { categorize, CONFIDENT } from '../services/categorizationService';
import { MerchantRule, PaymentMethod, RawSms, TransactionDraft, TransactionType } from '../types/transaction';
import { startOfDay, toIsoDate, toIsoTime } from '../utils/dateUtils';
import { hashString } from '../utils/transactionUtils';
import { ParsedSms } from './smsPatterns';
import { parseSms, RejectReason } from './smsParser';

/** Known UPI handle prefixes → brand display names. */
const VPA_BRANDS: [RegExp, string][] = [
  [/^swiggy/, 'Swiggy'],
  [/^zomato/, 'Zomato'],
  [/^(amazon|amzn)/, 'Amazon'],
  [/^flipkart/, 'Flipkart'],
  [/^myntra/, 'Myntra'],
  [/^uber/, 'Uber'],
  [/^(olacabs|ola)/, 'Ola'],
  [/^rapido/, 'Rapido'],
  [/^bigbasket/, 'BigBasket'],
  [/^(blinkit|grofers)/, 'Blinkit'],
  [/^zepto/, 'Zepto'],
  [/^irctc/, 'IRCTC'],
  [/^netflix/, 'Netflix'],
  [/^spotify/, 'Spotify'],
  [/^airtel/, 'Airtel'],
  [/^jio/, 'Jio'],
  [/^bookmyshow/, 'BookMyShow'],
  [/^starbucks/, 'Starbucks'],
  [/^dominos/, "Domino's"],
  [/^makemytrip/, 'MakeMyTrip'],
  [/^apollo/, 'Apollo Pharmacy'],
  [/^pvr/, 'PVR Cinemas'],
];

const FALLBACK_NAMES: Record<PaymentMethod, string> = {
  UPI: 'UPI payment',
  Card: 'Card payment',
  'Bank transfer': 'Bank transfer',
  'Auto-debit': 'Auto-debit',
  ATM: 'ATM withdrawal',
  Wallet: 'Wallet payment',
  Other: 'Unknown merchant',
};

function titleWord(w: string): string {
  if (!/^[A-Za-z]+$/.test(w)) return w;
  if (w.length <= 3 && w === w.toUpperCase() && !/[AEIOU]/.test(w)) return w; // acronyms: HP, PVR, ACT
  if (w === w.toUpperCase() || w === w.toLowerCase()) return w[0].toUpperCase() + w.slice(1).toLowerCase();
  return w;
}

/** "INDIAN OIL" → "Indian Oil", "ZOMATO LTD" → "Zomato". Leaves codes like "PAY*RAZORPAY" alone. */
export function prettifyName(raw: string): string {
  let s = raw.replace(/\s+/g, ' ').trim();
  s = s.replace(/\s*\b(pvt\.?|private)?\s*(ltd\.?|limited)$/i, '').trim();
  if (/[*#]/.test(s)) return s;
  return s
    .split(' ')
    .map(titleWord)
    .join(' ');
}

export function merchantFromVpa(vpa: string): string {
  const local = vpa.split('@')[0];
  for (const [re, name] of VPA_BRANDS) if (re.test(local)) return name;
  if ((local.match(/\d/g) || []).length >= 4) return `UPI-${vpa}`;
  const words = local.split(/[._-]+/).filter(w => /^[a-z]+$/i.test(w));
  if (words.length) return words.map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  return `UPI-${vpa}`;
}

export function resolveMerchant(p: ParsedSms): string {
  if (p.isSalary && p.direction === 'credit') return 'Salary';
  if (p.method === 'ATM') return FALLBACK_NAMES.ATM;
  const cp = p.counterparty;
  if (cp && /@/.test(cp)) return merchantFromVpa(cp);
  if (cp) return prettifyName(cp);
  if (p.vpa) return merchantFromVpa(p.vpa);
  if (p.direction === 'credit') return 'Money received';
  return FALLBACK_NAMES[p.method];
}

function resolveType(p: ParsedSms): TransactionType {
  if (p.isSelfTransfer) return 'transfer';
  if (p.direction === 'debit') return 'expense';
  if (p.direction === 'credit') return 'income';
  return 'unknown';
}

/**
 * Chooses the transaction moment: the date stated in the SMS (if any) combined
 * with the stated time, else the SMS receive time.
 */
export function resolveTimestamp(p: ParsedSms, receivedAt: number): number {
  if (p.date == null) return receivedAt;
  const d = new Date(p.date);
  if (p.time) {
    const [h, m] = p.time.split(':').map(Number);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).getTime();
  }
  if (startOfDay(receivedAt) === p.date) return receivedAt;
  const r = new Date(receivedAt);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), r.getHours(), r.getMinutes()).getTime();
}

export function smsHash(sms: RawSms): string {
  return hashString(`${(sms.sender || '').toUpperCase()}|${sms.body.trim()}`);
}

/** Converts a parsed SMS into a normalized, categorized transaction draft. */
export function buildTransaction(sms: RawSms, p: ParsedSms, rules: MerchantRule[]): TransactionDraft {
  const type = resolveType(p);
  const merchant = resolveMerchant(p);
  const ts = resolveTimestamp(p, sms.receivedAt);
  const cat = categorize({ merchant, vpa: p.vpa, type, method: p.method, isSalary: p.isSalary }, rules);
  const confident = cat.category != null && cat.confidence >= CONFIDENT;

  return {
    type,
    amount: Math.round(p.amount * 100) / 100,
    merchant,
    originalMerchant: merchant,
    category: confident ? cat.category : null,
    subcategory: null,
    date: toIsoDate(ts),
    time: toIsoTime(ts),
    timestamp: ts,
    paymentMethod: p.method,
    account: p.account,
    bank: p.bank,
    referenceNumber: p.reference,
    description: `${p.method} ${p.direction === 'unknown' ? 'transaction' : p.direction}`,
    notes: '',
    originalSms: sms.body,
    smsSender: sms.sender || null,
    smsHash: smsHash(sms),
    source: 'sms',
    isCategorized: confident,
    isExcluded: false,
  };
}

export type ExtractResult = { ok: true; draft: TransactionDraft } | { ok: false; reason: RejectReason | 'error' };

/** Full SMS → transaction draft pipeline. Never throws. */
export function extractTransaction(sms: RawSms, rules: MerchantRule[] = []): ExtractResult {
  try {
    const r = parseSms(sms);
    if (!r.ok) return r;
    return { ok: true, draft: buildTransaction(sms, r.parsed, rules) };
  } catch {
    return { ok: false, reason: 'error' };
  }
}
