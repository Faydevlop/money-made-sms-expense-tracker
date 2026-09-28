import { PaymentMethod, RawSms } from '../../types/transaction';

export type Direction = 'debit' | 'credit' | 'unknown';

/** Everything the parser could extract from one SMS. */
export interface ParsedSms {
  direction: Direction;
  amount: number;
  /** Raw payee/payer text as it appears in the SMS (e.g. "INDIAN OIL"). */
  counterparty: string | null;
  vpa: string | null;
  /** Last digits of account/card, as given in the SMS. */
  account: string | null;
  bank: string | null;
  reference: string | null;
  method: PaymentMethod;
  /** Transaction date (local midnight) when the SMS states one. */
  date: number | null;
  /** Clock time "HH:mm" when the SMS states one. */
  time: string | null;
  isSelfTransfer: boolean;
  isSalary: boolean;
  /** Which pattern produced the counterparty/direction; useful for tests and debugging. */
  patternId: string;
}

/** Fields a pattern may override on top of the generic extraction. */
export type PatternFields = Partial<Omit<ParsedSms, 'patternId'>>;

/**
 * A pattern recognises one SMS layout. Patterns are tried in order and the first
 * one returning a non-null result wins. To support a new bank format, add a
 * pattern to bankPatterns.ts (or a new file) and register it in index.ts.
 */
export interface SmsPattern {
  id: string;
  /** Optional sender-id filter, e.g. /HDFC/i. */
  senders?: RegExp;
  match(body: string, sms: RawSms): PatternFields | null;
}
