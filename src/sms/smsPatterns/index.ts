import { bankPatterns } from './bankPatterns';
import { genericCredit } from './genericCredit';
import { genericDebit } from './genericDebit';
import { genericUpi } from './genericUpi';
import { SmsPattern } from './types';

/**
 * Bank-specific layouts are tried first (in order); the first match wins.
 * Register new bank formats in bankPatterns.ts.
 */
export const specificPatterns: SmsPattern[] = bankPatterns;

/** Fallbacks used when no specific layout located the counterparty. */
export const fallbackPatterns = {
  upi: genericUpi,
  debit: genericDebit,
  credit: genericCredit,
};

export * from './types';
