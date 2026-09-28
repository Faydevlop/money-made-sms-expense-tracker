import { Transaction } from '../types/transaction';

/** Masks an account number to its last 4 digits: "XXXX1234". */
export function maskAccount(account: string | null | undefined): string {
  if (!account) return '';
  const digits = account.replace(/\D/g, '');
  return 'XXXX' + digits.slice(-4);
}

/** Compact form used in lists: "HDFC ••4821". */
export function accountShort(t: Pick<Transaction, 'bank' | 'account'>): string {
  const bank = shortBankName(t.bank);
  if (!t.account) return bank || 'Unknown account';
  return `${bank ? bank + ' ' : ''}••${t.account.slice(-4)}`;
}

/** Long form used in details: "HDFC Bank · ••4821". */
export function accountLong(t: Pick<Transaction, 'bank' | 'account' | 'paymentMethod'>): string {
  const kind = t.paymentMethod === 'Card' ? 'Card' : 'A/c';
  if (!t.account) return t.bank || 'Unknown';
  return `${t.bank ? t.bank + ' · ' : ''}${kind} ${maskAccount(t.account)}`;
}

export function shortBankName(bank: string | null | undefined): string {
  if (!bank) return '';
  return bank.replace(/\s+Bank$/i, '').trim();
}

/**
 * Stable key for grouping by bank/account in filters. Uses the last 3 digits
 * because some banks mask to 3 digits in one SMS format and 4 in another
 * (ICICI "XX093" vs "XX1093").
 */
export function accountKey(t: Pick<Transaction, 'bank' | 'account'>): string {
  return `${t.bank ?? ''}|${t.account ? t.account.slice(-3) : ''}`;
}

/** Only expense/income transactions that are not excluded count towards totals. */
export function isCounted(t: Transaction): boolean {
  return !t.isExcluded && (t.type === 'expense' || t.type === 'income');
}

/** Transactions that should appear in "Needs review". */
export function needsReview(t: Transaction): boolean {
  return !t.isExcluded && !t.isCategorized && t.type !== 'income' && t.type !== 'transfer';
}

export function normalizeMerchantKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9@.]+/g, ' ').replace(/\s+/g, ' ').trim();
}

let counter = 0;
export function generateId(): string {
  counter = (counter + 1) % 1_000_000;
  return `t${Date.now().toString(36)}${counter.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** Small non-cryptographic hash (FNV-1a) used for SMS de-duplication keys. */
/* eslint-disable no-bitwise */
export function hashString(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
/* eslint-enable no-bitwise */
