import { classifySms, parseSms } from '../src/sms/smsParser';
import {
  detectDirection,
  extractAccount,
  extractAmount,
  extractDate,
  extractReference,
} from '../src/sms/smsPatterns/common';
import { extractTransaction, merchantFromVpa, prettifyName } from '../src/sms/transactionExtractor';
import { NON_TRANSACTION_FIXTURES, NOW, TRANSACTION_FIXTURES } from './fixtures/smsFixtures';

describe('amount extraction', () => {
  it.each([
    ['Rs.450.00 debited from A/c XX1234', 450],
    ['Rs 1,23,456.50 credited', 123456.5],
    ['INR 1,500.00 spent using Card', 1500],
    ['₹99 paid to Chai Point', 99],
    ['A/C X7710 debited by 1200.0 on date', 1200],
  ])('%s → %d', (body, expected) => {
    expect(extractAmount(body)).toBe(expected);
  });

  it('skips balance and limit amounts', () => {
    expect(extractAmount('Avl Bal Rs.62,418.20. Rs.450 debited from A/c XX1')).toBe(450);
    expect(extractAmount('Avl Limit: INR 1,48,210.00 after INR 500 spent')).toBe(500);
  });

  it('returns null when missing', () => {
    expect(extractAmount('Your account was debited')).toBeNull();
  });
});

describe('debit / credit detection', () => {
  it.each([
    ['Rs.450 debited from A/c XX1234', 'debit'],
    ['Rs.450 credited to A/c XX1234', 'credit'],
    ['INR 500 spent on ICICI Bank Credit Card XX1093', 'debit'],
    ['Payment received on your credit card', 'credit'],
    ['Acct XX093 debited for Rs 342.00; UBER credited', 'debit'],
    ['Refund of Rs 200 processed', 'credit'],
    ['Txn of Rs 500 on card', 'unknown'],
  ])('%s → %s', (body, expected) => {
    expect(detectDirection(body)).toBe(expected);
  });
});

describe('field extraction', () => {
  it('extracts account last digits', () => {
    expect(extractAccount('debited from A/c XX1234 on')).toBe('1234');
    expect(extractAccount('ur A/cX7710 credited')).toBe('7710');
    expect(extractAccount('Card XX1093 on')).toBe('1093');
    expect(extractAccount('Kotak Bank AC X4567 to')).toBe('4567');
    expect(extractAccount('no account info')).toBeNull();
  });

  it('extracts reference numbers', () => {
    expect(extractReference('(UPI Ref No 426123456789)')).toBe('426123456789');
    expect(extractReference('Refno 426512345678. If')).toBe('426512345678');
    expect(extractReference('UPI:426712345678. Call')).toBe('426712345678');
    expect(extractReference('UPI/P2M/426812345678/ZOMATO')).toBe('426812345678');
  });

  it('extracts dates in common formats', () => {
    const d = (y: number, m: number, day: number) => new Date(y, m - 1, day).getTime();
    expect(extractDate('on 28-09-26 to', NOW)).toBe(d(2026, 9, 28));
    expect(extractDate('on 27/09/2026', NOW)).toBe(d(2026, 9, 27));
    expect(extractDate('on 24-Sep-26 on', NOW)).toBe(d(2026, 9, 24));
    expect(extractDate('on date 26Sep26 trf', NOW)).toBe(d(2026, 9, 26));
    expect(extractDate('on 2026-09-01', NOW)).toBe(d(2026, 9, 1));
  });

  it('rejects impossible or far-future dates', () => {
    expect(extractDate('on 31-02-26', NOW)).toBeNull();
    expect(extractDate('on 01-01-29', NOW)).toBeNull();
  });
});

describe('merchant extraction', () => {
  it('maps UPI handles to brands, people and unknown handles', () => {
    expect(merchantFromVpa('swiggy@icici')).toBe('Swiggy');
    expect(merchantFromVpa('olacabs@ybl')).toBe('Ola');
    expect(merchantFromVpa('rahul.sharma@okhdfc')).toBe('Rahul Sharma');
    expect(merchantFromVpa('9876543210@ybl')).toBe('UPI-9876543210@ybl');
  });

  it('prettifies names', () => {
    expect(prettifyName('INDIAN OIL')).toBe('Indian Oil');
    expect(prettifyName('ZOMATO LTD')).toBe('Zomato');
    expect(prettifyName('ACME TECHNOLOGIES PVT LTD')).toBe('Acme Technologies');
    expect(prettifyName('PAY*RAZORPAY 8839')).toBe('PAY*RAZORPAY 8839');
  });

  it('falls back to a generic name when no payee is present', () => {
    const r = extractTransaction({ sender: 'VM-HDFCBK', body: 'Rs.300.00 debited from A/c XX4821 on 12-09-26. Ref 426311122233 -HDFC Bank', receivedAt: NOW });
    expect(r.ok && r.draft.merchant).toBe('Unknown merchant');
    expect(r.ok && r.draft.isCategorized).toBe(false);
  });
});

describe('fixtures: transaction SMS', () => {
  it.each(TRANSACTION_FIXTURES.map(f => [f.name, f] as const))('%s', (_name, f) => {
    const r = extractTransaction(f.sms);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const t = r.draft;
    const e = f.expect;
    if (e.type !== undefined) expect(t.type).toBe(e.type);
    if (e.amount !== undefined) expect(t.amount).toBe(e.amount);
    if (e.merchant !== undefined) expect(t.merchant).toBe(e.merchant);
    if (e.category !== undefined) expect(t.category).toBe(e.category);
    if (e.method !== undefined) expect(t.paymentMethod).toBe(e.method);
    if (e.account !== undefined) expect(t.account).toBe(e.account);
    if (e.bank !== undefined) expect(t.bank).toBe(e.bank);
    if (e.reference !== undefined) expect(t.referenceNumber).toBe(e.reference);
    if (e.date !== undefined) expect(t.date).toBe(e.date);
    expect(t.isCategorized).toBe(t.category != null);
    expect(t.originalSms).toBe(f.sms.body);
  });
});

describe('fixtures: non-transaction SMS', () => {
  it.each(NON_TRANSACTION_FIXTURES.map(f => [f.name, f] as const))('%s is ignored', (_name, f) => {
    const r = parseSms(f.sms);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe(f.reason);
  });

  it('classifySms accepts a normal debit', () => {
    expect(classifySms('Rs.450.00 debited from A/c XX1234')).toBeNull();
  });

  it('never throws on garbage input', () => {
    expect(extractTransaction({ sender: '', body: undefined as unknown as string, receivedAt: NaN }).ok).toBe(false);
    expect(extractTransaction({ sender: 'X', body: 'Rs.', receivedAt: NOW }).ok).toBe(false);
  });
});
