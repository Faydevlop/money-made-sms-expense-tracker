import { Transaction } from '../src/types/transaction';
import { toIsoDate, toIsoTime } from '../src/utils/dateUtils';

let n = 0;

/** Builds a transaction with sensible defaults for tests. */
export function tx(p: Partial<Transaction> & { timestamp: number }): Transaction {
  n++;
  return {
    id: 'x' + n,
    type: 'expense',
    amount: 100,
    merchant: 'Shop',
    originalMerchant: 'Shop',
    category: 'Other',
    subcategory: null,
    date: toIsoDate(p.timestamp),
    time: toIsoTime(p.timestamp),
    paymentMethod: 'UPI',
    account: '1234',
    bank: 'HDFC Bank',
    referenceNumber: null,
    description: null,
    notes: '',
    originalSms: null,
    smsSender: null,
    smsHash: null,
    source: 'sms',
    isCategorized: true,
    isExcluded: false,
    createdAt: 0,
    updatedAt: 0,
    ...p,
  };
}
