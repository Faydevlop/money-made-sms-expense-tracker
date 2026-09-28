import { findDuplicate, findTransferPair, isDuplicate } from '../src/services/duplicateDetection';
import { extractTransaction } from '../src/sms/transactionExtractor';
import { NOW, TRANSACTION_FIXTURES } from './fixtures/smsFixtures';
import { tx } from './helpers';

const MIN = 60_000;

describe('duplicate detection', () => {
  it('treats the same SMS processed twice as a duplicate', () => {
    const f = TRANSACTION_FIXTURES[0];
    const a = extractTransaction(f.sms);
    const b = extractTransaction({ ...f.sms });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(isDuplicate(b.draft, a.draft)).toBe(true);
  });

  it('matches on reference number across different SMS texts', () => {
    const a = tx({ timestamp: NOW, amount: 450, referenceNumber: '426123456789', merchant: 'Swiggy' });
    const b = tx({ timestamp: NOW + 3 * 60 * MIN, amount: 450, referenceNumber: '426123456789', merchant: 'UPI payment' });
    expect(isDuplicate(b, a)).toBe(true);
  });

  it('different references are never duplicates', () => {
    const a = tx({ timestamp: NOW, amount: 450, referenceNumber: '111111111111' });
    const b = tx({ timestamp: NOW, amount: 450, referenceNumber: '222222222222' });
    expect(isDuplicate(b, a)).toBe(false);
  });

  it('without references, requires same amount, account, close time and similar merchant', () => {
    const base = tx({ timestamp: NOW, amount: 380, merchant: 'Blue Tokai Coffee', account: '4821' });
    expect(isDuplicate(tx({ timestamp: NOW + 2 * MIN, amount: 380, merchant: 'BLUE TOKAI COFFEE', account: '4821' }), base)).toBe(true);
    expect(isDuplicate(tx({ timestamp: NOW + 2 * MIN, amount: 381, merchant: 'Blue Tokai Coffee', account: '4821' }), base)).toBe(false);
    expect(isDuplicate(tx({ timestamp: NOW + 2 * MIN, amount: 380, merchant: 'Blue Tokai Coffee', account: '1093' }), base)).toBe(false);
    expect(isDuplicate(tx({ timestamp: NOW + 30 * MIN, amount: 380, merchant: 'Blue Tokai Coffee', account: '4821' }), base)).toBe(false);
    expect(isDuplicate(tx({ timestamp: NOW + 2 * MIN, amount: 380, merchant: 'Starbucks', account: '4821' }), base)).toBe(false);
  });

  it('income and expense of the same amount are not duplicates', () => {
    const a = tx({ timestamp: NOW, amount: 500, type: 'expense' });
    const b = tx({ timestamp: NOW, amount: 500, type: 'income' });
    expect(isDuplicate(b, a)).toBe(false);
  });

  it('findDuplicate returns the matching existing transaction', () => {
    const list = [tx({ timestamp: NOW, amount: 10 }), tx({ timestamp: NOW, amount: 20, referenceNumber: 'R12345678' })];
    expect(findDuplicate(tx({ timestamp: NOW, amount: 20, referenceNumber: 'R12345678' }), list)).toBe(list[1]);
    expect(findDuplicate(tx({ timestamp: NOW, amount: 30 }), list)).toBeUndefined();
  });
});

describe('self-transfer pairing', () => {
  it('pairs a debit and credit of the same amount on different own accounts', () => {
    const debit = tx({ timestamp: NOW, amount: 5000, type: 'expense', account: '4821', paymentMethod: 'Bank transfer' });
    const credit = tx({ timestamp: NOW + 2 * MIN, amount: 5000, type: 'income', account: '7710', paymentMethod: 'Bank transfer' });
    expect(findTransferPair(credit, [debit])).toBe(debit);
  });

  it('does not pair card spends or distant transactions', () => {
    const debit = tx({ timestamp: NOW, amount: 5000, type: 'expense', account: '4821', paymentMethod: 'Card' });
    const credit = tx({ timestamp: NOW + 2 * MIN, amount: 5000, type: 'income', account: '7710', paymentMethod: 'Bank transfer' });
    expect(findTransferPair(credit, [debit])).toBeUndefined();
    const far = tx({ timestamp: NOW - 5 * 60 * MIN, amount: 5000, type: 'expense', account: '4821', paymentMethod: 'UPI' });
    expect(findTransferPair(credit, [far])).toBeUndefined();
  });
});
