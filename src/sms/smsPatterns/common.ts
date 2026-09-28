import { PaymentMethod } from '../../types/transaction';
import { parseAmount } from '../../utils/currencyUtils';
import { Direction } from './types';

const CURRENCY_AMOUNT = /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/gi;
const VERB_AMOUNT =
  /(?:debited|credited|withdrawn|deposited|spent|paid|sent|received)\s+(?:by|for|with|of)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i;
const NON_TXN_AMOUNT_CONTEXT = /(bal(?:ance)?|limit|avl|available|outstanding|due)[\s:.a-z]*$/i;

/** First amount that is not a balance/limit figure. */
export function extractAmount(body: string): number | null {
  CURRENCY_AMOUNT.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CURRENCY_AMOUNT.exec(body))) {
    const before = body.slice(Math.max(0, m.index - 24), m.index);
    if (NON_TXN_AMOUNT_CONTEXT.test(before)) continue;
    const v = parseAmount(m[1]);
    if (v != null) return v;
  }
  const vm = VERB_AMOUNT.exec(body);
  if (vm) return parseAmount(vm[1]);
  return null;
}

const DEBIT_WORDS =
  /\b(debited|debit(?!\s*card)|spent|paid|sent|withdrawn|withdrawal|purchase[ds]?|deducted|charged|dr\b\.?)/i;
const CREDIT_WORDS = /\b(credited|received|deposited|refund(?:ed)?|reversed|reversal|cashback|cr\b\.?)/i;

/**
 * Debit vs credit by whichever keyword appears first. "credit card"/"debit card"
 * are removed first so that "spent on credit card" is not read as a credit.
 */
export function detectDirection(body: string): Direction {
  const text = body.replace(/\b(credit|debit)\s*card\b/gi, 'card');
  const d = DEBIT_WORDS.exec(text);
  const c = CREDIT_WORDS.exec(text);
  if (d && c) return d.index <= c.index ? 'debit' : 'credit';
  if (d) return 'debit';
  if (c) return 'credit';
  return 'unknown';
}

// The keyword may run straight into the mask: "A/cX7710".
const ACCOUNT =
  /\b(?:a\/?c|acct|account|ac|card)(?:\b|(?=[x*]))\.?\s*(?:no\.?|number)?\s*(?:ending\s*(?:with|in)?)?\s*[:\-]?\s*[x*•.]*\s*(\d{3,6})\b/i;
const ACCOUNT_LOOSE = /\b[x*]{2,}(\d{3,6})\b/i;

export function extractAccount(body: string): string | null {
  const m = ACCOUNT.exec(body) || ACCOUNT_LOOSE.exec(body);
  return m ? m[1].slice(-4) : null;
}

const REFERENCE = [
  /upi\/(?:p2[am]|dr|cr)\/(\d{6,})/i,
  /(?:upi\s*)?ref(?:erence)?\.?\s*(?:no\.?|number|id)?\s*[:\-#.]?\s*([a-z0-9]*\d[a-z0-9]{5,})/i,
  /\b(?:refno|rrn|utr(?:\s*no\.?)?|txn\s*(?:id|no\.?)|transaction\s*(?:id|no\.?))\s*[:\-#.]?\s*([a-z0-9]*\d[a-z0-9]{5,})/i,
  /\bupi\s*[:\-]\s*(\d{6,})/i,
];

export function extractReference(body: string): string | null {
  for (const re of REFERENCE) {
    const m = re.exec(body);
    if (m) return m[1].toUpperCase();
  }
  return null;
}

const VPA = /\b([a-z0-9][a-z0-9._-]{1,63}@[a-z][a-z0-9]{1,31})\b/i;

export function extractVpa(body: string): string | null {
  const m = VPA.exec(body);
  if (!m) return null;
  // Exclude e-mail-looking domains (x@bank.com) which are not UPI handles.
  if (/\.[a-z]{2,}$/i.test(m[1].split('@')[1] ?? '')) return null;
  return m[1].toLowerCase();
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

function fullYear(y: string | undefined, fallbackYear: number): number {
  if (!y) return fallbackYear;
  const n = +y;
  return y.length === 2 ? 2000 + n : n;
}

function makeDate(y: number, m: number, d: number): number | null {
  if (m < 0 || m > 11 || d < 1 || d > 31) return null;
  const date = new Date(y, m, d);
  if (date.getMonth() !== m || date.getDate() !== d) return null;
  return date.getTime();
}

/**
 * Extracts a transaction date. Returns local midnight, or null when no plausible
 * date is present. `referenceTs` (the SMS receive time) supplies a missing year and
 * guards against nonsense (dates far in the future or very old).
 */
export function extractDate(body: string, referenceTs: number): number | null {
  const refYear = new Date(referenceTs).getFullYear();
  const candidates: (number | null)[] = [];

  let m = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(body);
  if (m) candidates.push(makeDate(+m[1], +m[2] - 1, +m[3]));

  m = /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})\b/.exec(body);
  if (m) candidates.push(makeDate(fullYear(m[3], refYear), +m[2] - 1, +m[1]));

  m = /\b(\d{1,2})[-\s]?([a-z]{3,4})[-\s,]*(\d{4}|\d{2})?\b/i.exec(body);
  if (m && MONTHS[m[2].toLowerCase()] != null) {
    candidates.push(makeDate(fullYear(m[3], refYear), MONTHS[m[2].toLowerCase()], +m[1]));
  }

  const maxTs = referenceTs + 2 * 86_400_000;
  const minTs = referenceTs - 5 * 366 * 86_400_000;
  for (const c of candidates) {
    if (c != null && c <= maxTs && c >= minTs) return c;
  }
  return null;
}

export function extractTime(body: string): string | null {
  const m = /\b([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?\s*(am|pm)?\b/i.exec(body);
  if (!m) return null;
  let h = +m[1];
  const ap = m[3]?.toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

export function detectMethod(body: string): PaymentMethod {
  const b = body.toLowerCase();
  if (/\b(e-?mandate|auto-?debit|autopay|standing instruction|nach|ecs)\b/.test(b)) return 'Auto-debit';
  if (/\batm\b|cash withdraw/.test(b)) return 'ATM';
  if (/\bupi\b|\bvpa\b|[a-z0-9]@[a-z]/.test(b)) return 'UPI';
  if (/\bwallet\b|paytm balance/.test(b)) return 'Wallet';
  if (/\bcard\b/.test(b)) return 'Card';
  if (/\b(neft|imps|rtgs|net ?banking|fund transfer|trf)\b/.test(b)) return 'Bank transfer';
  return 'Other';
}

/** Sender-id fragments of common Indian banks (e.g. "VM-HDFCBK"). */
const BANK_SENDERS: [RegExp, string][] = [
  [/HDFC/i, 'HDFC Bank'],
  [/ICICI/i, 'ICICI Bank'],
  [/SBI|SBMSMS|SBIINB|SBIUPI|CBSSBI/i, 'SBI'],
  [/AXIS/i, 'Axis Bank'],
  [/KOTAK|KBANK/i, 'Kotak Bank'],
  [/PNB/i, 'PNB'],
  [/BOI|BOIIND/i, 'Bank of India'],
  [/BOB|BARODA/i, 'Bank of Baroda'],
  [/CANBNK|CANARA/i, 'Canara Bank'],
  [/UNION|UBOI/i, 'Union Bank'],
  [/YESBNK|YESBK/i, 'Yes Bank'],
  [/IDFC/i, 'IDFC First Bank'],
  [/INDUS/i, 'IndusInd Bank'],
  [/FEDBNK|FEDERAL/i, 'Federal Bank'],
  [/PAYTM|PYTM/i, 'Paytm Payments Bank'],
  [/AIRBNK|AIRTEL/i, 'Airtel Payments Bank'],
];

export function detectBank(sender: string, body: string): string | null {
  for (const [re, name] of BANK_SENDERS) if (re.test(sender)) return name;
  // Many banks sign off the body: "... -HDFC Bank" / "- SBI"
  const tail = body.slice(-40);
  for (const [re, name] of BANK_SENDERS) if (re.test(tail)) return name;
  return null;
}

export function detectSelfTransfer(body: string): boolean {
  return (
    /\b(to self|self[- ]transfer|own a\/?c|own account|between your accounts)\b/i.test(body) ||
    /(payment|amount)\b.{0,40}\breceived\b.{0,20}\b(towards|on|for|in)\s+your\b.{0,20}\bcredit\s*card/i.test(body)
  );
}

export function detectSalary(body: string): boolean {
  return /\b(salary|sal cr|payroll)\b/i.test(body);
}

/** Trims trailing noise from an extracted payee: dates, refs, punctuation. */
export function cleanCounterparty(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = raw
    .replace(/\s+/g, ' ')
    .replace(/\b(on|dated)\s+\d.*$/i, '')
    .replace(/\b(ref|refno|upi|utr|rrn|avl|avbl|bal|via|using|thru|through|from a\/c|not you).*$/i, '')
    .replace(/[\s.,;:()\-]+$/g, '')
    .replace(/^[\s.,;:()\-]+/g, '')
    .trim();
  if (s.length < 2 || /^\d+$/.test(s)) return null;
  if (s.length > 48) s = s.slice(0, 48).trim();
  return s;
}
