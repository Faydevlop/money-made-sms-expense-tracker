import { Transaction, TransactionDraft } from '../types/transaction';
import { normalizeMerchantKey } from '../utils/transactionUtils';

type Comparable = Pick<
  TransactionDraft,
  'type' | 'amount' | 'merchant' | 'timestamp' | 'account' | 'referenceNumber' | 'smsHash' | 'paymentMethod'
>;

/** Window within which two reference-less SMS for the same amount are the same payment. */
export const DUPLICATE_WINDOW_MS = 10 * 60_000;
/** Window within which a debit and a credit of the same amount form a self-transfer. */
export const TRANSFER_WINDOW_MS = 30 * 60_000;

const GENERIC = /^(upi payment|card payment|bank transfer|auto-debit|atm withdrawal|wallet payment|unknown merchant|money received)$/;

function merchantsSimilar(a: string, b: string): boolean {
  const x = normalizeMerchantKey(a);
  const y = normalizeMerchantKey(b);
  if (!x || !y) return true;
  if (x === y || x.includes(y) || y.includes(x)) return true;
  return GENERIC.test(x) || GENERIC.test(y);
}

function typesCompatible(a: Comparable['type'], b: Comparable['type']): boolean {
  return a === b || a === 'unknown' || b === 'unknown';
}

/**
 * Decides whether `candidate` describes the same payment as `existing`.
 *
 * 1. Identical SMS (same sender + body) → duplicate.
 * 2. Both have a reference number → duplicate iff references and amounts match.
 * 3. Otherwise → same amount, compatible type and account, within 10 minutes,
 *    and a similar merchant name.
 */
export function isDuplicate(candidate: Comparable, existing: Comparable): boolean {
  if (candidate.smsHash && existing.smsHash && candidate.smsHash === existing.smsHash) return true;
  if (Math.abs(candidate.amount - existing.amount) > 0.009) return false;
  if (candidate.referenceNumber && existing.referenceNumber) {
    return candidate.referenceNumber === existing.referenceNumber;
  }
  if (!typesCompatible(candidate.type, existing.type)) return false;
  if (candidate.account && existing.account && candidate.account.slice(-3) !== existing.account.slice(-3)) return false;
  if (Math.abs(candidate.timestamp - existing.timestamp) > DUPLICATE_WINDOW_MS) return false;
  return merchantsSimilar(candidate.merchant, existing.merchant);
}

export function findDuplicate<T extends Comparable>(candidate: Comparable, existing: T[]): T | undefined {
  return existing.find(e => isDuplicate(candidate, e));
}

/**
 * Finds the other leg of a transfer between the user's own accounts: an opposite
 * direction transaction of the same amount, on a different known account,
 * close in time.
 */
export function findTransferPair(candidate: Comparable, existing: Transaction[]): Transaction | undefined {
  if (candidate.type !== 'expense' && candidate.type !== 'income') return undefined;
  if (!candidate.account) return undefined;
  const opposite = candidate.type === 'expense' ? 'income' : 'expense';
  return existing.find(
    e =>
      e.type === opposite &&
      !e.isExcluded &&
      e.account != null &&
      e.account !== candidate.account &&
      Math.abs(e.amount - candidate.amount) < 0.01 &&
      Math.abs(e.timestamp - candidate.timestamp) <= TRANSFER_WINDOW_MS &&
      (e.paymentMethod === 'Bank transfer' || e.paymentMethod === 'UPI') &&
      (candidate.paymentMethod === 'Bank transfer' || candidate.paymentMethod === 'UPI'),
  );
}
