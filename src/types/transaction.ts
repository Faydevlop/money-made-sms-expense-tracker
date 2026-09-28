export type TransactionType = 'expense' | 'income' | 'transfer' | 'unknown';

export type PaymentMethod =
  | 'UPI'
  | 'Card'
  | 'Bank transfer'
  | 'Auto-debit'
  | 'ATM'
  | 'Wallet'
  | 'Other';

/** Where a transaction came from. New sources (bank APIs, AA, manual entry) plug in here. */
export type TransactionSource = 'sms' | 'manual' | 'sample';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  /** Display name — may be edited by the user. */
  merchant: string;
  /** Name as originally extracted; used for merchant rules. */
  originalMerchant: string;
  /** null means uncategorized. */
  category: string | null;
  subcategory: string | null;
  /** Local date, YYYY-MM-DD */
  date: string;
  /** Local time, HH:mm */
  time: string;
  /** Epoch ms of the transaction moment; used for sorting and range queries. */
  timestamp: number;
  paymentMethod: PaymentMethod;
  /** Last 4 digits of the account/card only — never the full number. */
  account: string | null;
  bank: string | null;
  referenceNumber: string | null;
  /** Short machine description, e.g. "UPI debit". */
  description: string | null;
  notes: string;
  originalSms: string | null;
  smsSender: string | null;
  smsHash: string | null;
  source: TransactionSource;
  isCategorized: boolean;
  isExcluded: boolean;
  createdAt: number;
  updatedAt: number;
}

/** A transaction before it has been assigned an id / persisted. */
export type TransactionDraft = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>;

export interface RawSms {
  /** Provider id (Android inbox _id) when available. */
  id?: string;
  sender: string;
  body: string;
  /** Epoch ms the message was received. */
  receivedAt: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isSystem: boolean;
  sortOrder: number;
}

export interface MerchantRule {
  id: string;
  /** Normalized merchant key (lowercase, collapsed whitespace). */
  pattern: string;
  category: string;
  createdAt: number;
}
