import { RawSms } from '../../src/types/transaction';

/** 28 Sep 2026, 21:05 local — matches the design's sample "now". */
export const NOW = new Date(2026, 8, 28, 21, 5).getTime();

const at = (d: number, h: number, m: number) => new Date(2026, 8, d, h, m).getTime();

export interface SmsFixture {
  name: string;
  sms: RawSms;
  expect: {
    type?: 'expense' | 'income' | 'transfer' | 'unknown';
    amount?: number;
    merchant?: string;
    category?: string | null;
    method?: string;
    account?: string | null;
    bank?: string | null;
    reference?: string | null;
    date?: string;
  };
}

/**
 * Representative transaction SMS from Indian banks / UPI apps. Account numbers
 * and references are synthetic.
 */
export const TRANSACTION_FIXTURES: SmsFixture[] = [
  {
    name: 'HDFC UPI debit to VPA',
    sms: {
      sender: 'VM-HDFCBK',
      body: 'Rs.450.00 debited from A/c XX1234 on 28-09-26 to VPA swiggy@icici (UPI Ref No 426123456789). Not you? Call 18002586161 -HDFC Bank',
      receivedAt: at(28, 20, 42),
    },
    expect: { type: 'expense', amount: 450, merchant: 'Swiggy', category: 'Food', method: 'UPI', account: '1234', bank: 'HDFC Bank', reference: '426123456789', date: '2026-09-28' },
  },
  {
    name: 'HDFC multi-line "Sent" UPI',
    sms: {
      sender: 'AD-HDFCBK',
      body: 'Sent Rs.342.00\nFrom HDFC Bank A/C *4821\nTo UBER INDIA\nOn 27/09/26\nRef 426700011122\nNot You?\nCall 18002586161/SMS BLOCK UPI to 7308080808',
      receivedAt: at(27, 22, 10),
    },
    expect: { type: 'expense', amount: 342, merchant: 'Uber India', category: 'Travel', method: 'UPI', account: '4821', reference: '426700011122', date: '2026-09-27' },
  },
  {
    name: 'SBI UPI debit to a person (uncategorized)',
    sms: {
      sender: 'VK-SBIUPI',
      body: 'Dear UPI user A/C X7710 debited by 1200.0 on date 26Sep26 trf to RAVI KUMAR Refno 426512345678. If not u? call 1800111109. -SBI',
      receivedAt: at(26, 18, 47),
    },
    expect: { type: 'expense', amount: 1200, merchant: 'Ravi Kumar', category: null, method: 'UPI', account: '7710', bank: 'SBI', reference: '426512345678', date: '2026-09-26' },
  },
  {
    name: 'SBI UPI credit from a person → Transfers',
    sms: {
      sender: 'VK-SBIUPI',
      body: 'Dear SBI UPI User, ur A/cX7710 credited by Rs4500 on 15Sep26 by RAHUL SHARMA (Ref no 426598765432)',
      receivedAt: at(15, 14, 18),
    },
    expect: { type: 'income', amount: 4500, merchant: 'Rahul Sharma', category: 'Transfers', account: '7710', date: '2026-09-15' },
  },
  {
    name: 'ICICI credit card spend',
    sms: {
      sender: 'AD-ICICIB',
      body: 'INR 1,500.00 spent using ICICI Bank Card XX1093 on 24-Sep-26 on INDIAN OIL. Avl Limit: INR 1,48,210.00. If not you, call 1800 2662/SMS BLOCK 1093 to 9215676766.',
      receivedAt: at(24, 19, 30),
    },
    expect: { type: 'expense', amount: 1500, merchant: 'Indian Oil', category: 'Fuel', method: 'Card', account: '1093', bank: 'ICICI Bank', date: '2026-09-24' },
  },
  {
    name: 'ICICI UPI debit with payee before "credited"',
    sms: {
      sender: 'JD-ICICIT',
      body: 'ICICI Bank Acct XX093 debited for Rs 342.00 on 27-Sep-26; UBER credited. UPI:426712345678. Call 18002662 for dispute. SMS BLOCK 093 to 9215676766.',
      receivedAt: at(27, 22, 11),
    },
    expect: { type: 'expense', amount: 342, merchant: 'Uber', category: 'Travel', method: 'UPI', account: '093', reference: '426712345678' },
  },
  {
    name: 'HDFC card spend at merchant',
    sms: {
      sender: 'VM-HDFCBK',
      body: 'Rs.380.00 spent on HDFC Bank Card XX4821 at BLUE TOKAI COFFEE on 25-09-26. Avl Limit Rs.1,48,210. Not you? SMS BLOCK 4821 to 5676766 -HDFC Bank',
      receivedAt: at(25, 10, 20),
    },
    expect: { type: 'expense', amount: 380, merchant: 'Blue Tokai Coffee', category: 'Food', method: 'Card', account: '4821' },
  },
  {
    name: 'Axis UPI P2M multi-line',
    sms: {
      sender: 'BZ-AXISBK',
      body: 'INR 612.00 debited\nA/c no. XX5678\n26-09-26, 13:05:10\nUPI/P2M/426812345678/ZOMATO LTD\nNot you? SMS BLOCKUPI Cust ID to 919951860002\nAxis Bank',
      receivedAt: at(26, 13, 6),
    },
    expect: { type: 'expense', amount: 612, merchant: 'Zomato', category: 'Food', method: 'UPI', account: '5678', bank: 'Axis Bank', reference: '426812345678', date: '2026-09-26' },
  },
  {
    name: 'Kotak Sent UPI',
    sms: {
      sender: 'AX-KOTAKB',
      body: 'Sent Rs.250.00 from Kotak Bank AC X4567 to zomato@kotak on 28-09-26.UPI Ref 426912345678. Not you, https://kotak.com/KBANKT/Fraud',
      receivedAt: at(28, 13, 0),
    },
    expect: { type: 'expense', amount: 250, merchant: 'Zomato', category: 'Food', method: 'UPI', account: '4567', bank: 'Kotak Bank', reference: '426912345678' },
  },
  {
    name: 'Salary credit by NEFT',
    sms: {
      sender: 'VM-HDFCBK',
      body: 'Rs.37,900.00 credited to A/c XX4821 on 28-09-26 by NEFT from ACME TECHNOLOGIES PVT LTD SALARY SEP. Ref N271261234567. Avl Bal Rs.62,418.20 -HDFC Bank',
      receivedAt: at(28, 9, 15),
    },
    expect: { type: 'income', amount: 37900, merchant: 'Salary', category: 'Income', method: 'Bank transfer', account: '4821' },
  },
  {
    name: 'Freelance NEFT credit',
    sms: {
      sender: 'AD-ICICIB',
      body: 'Rs.2,600.00 credited to A/c XX1093 on 20-09-26 by NEFT from UPWORK ESCROW INC. Ref N263001122334. Avl Bal Rs.12,410.00 -ICICI Bank',
      receivedAt: at(20, 10, 5),
    },
    expect: { type: 'income', amount: 2600, merchant: 'Upwork Escrow Inc', category: 'Income', method: 'Bank transfer' },
  },
  {
    name: 'e-mandate auto-debit',
    sms: {
      sender: 'VM-HDFCBK',
      body: 'Your A/c XX4821 is debited for Rs.999.00 on 15-09-26 towards AIRTEL POSTPAID (e-mandate). Ref 426100099988 -HDFC Bank',
      receivedAt: at(15, 10, 0),
    },
    expect: { type: 'expense', amount: 999, merchant: 'Airtel Postpaid', category: 'Bills', method: 'Auto-debit' },
  },
  {
    name: 'Netflix card auto-debit',
    sms: {
      sender: 'AD-ICICIB',
      body: 'Rs.649.00 spent on ICICI Bank Card XX1093 at NETFLIX on 11-09-26. Avl Limit Rs.1,48,210. Not you? SMS BLOCK 1093 to 5676766 -ICICI Bank',
      receivedAt: at(11, 6, 0),
    },
    expect: { type: 'expense', amount: 649, merchant: 'Netflix', category: 'Subscriptions', method: 'Card' },
  },
  {
    name: 'Unknown UPI handle (phone number)',
    sms: {
      sender: 'VK-SBIUPI',
      body: 'Rs.1,200.00 debited from A/c XX7710 on 26-09-26 to VPA 9876543210@ybl (UPI Ref No 426177788899). Not you? Call 1800111109 -SBI',
      receivedAt: at(26, 18, 47),
    },
    expect: { type: 'expense', amount: 1200, merchant: 'UPI-9876543210@ybl', category: null, method: 'UPI' },
  },
  {
    name: 'Payment gateway descriptor (uncategorized)',
    sms: {
      sender: 'VM-HDFCBK',
      body: 'Rs.850.00 spent on HDFC Bank Card XX4821 at PAY*RAZORPAY 8839 on 24-09-26. Avl Limit Rs.98,000. Not you? SMS BLOCK 4821 to 5676766 -HDFC Bank',
      receivedAt: at(24, 11, 12),
    },
    expect: { type: 'expense', amount: 850, merchant: 'PAY*RAZORPAY 8839', category: null, method: 'Card' },
  },
  {
    name: 'ATM withdrawal',
    sms: {
      sender: 'VM-HDFCBK',
      body: 'Rs.2000.00 withdrawn at ATM S1AW0123 from A/c XX4821 on 21-09-26. Avl Bal Rs.40,110.00 -HDFC Bank',
      receivedAt: at(21, 17, 0),
    },
    expect: { type: 'expense', amount: 2000, merchant: 'ATM withdrawal', category: 'Other', method: 'ATM' },
  },
  {
    name: 'Self transfer to own account',
    sms: {
      sender: 'VM-HDFCBK',
      body: 'Rs.5,000.00 debited from A/c XX4821 on 18-09-26 via IMPS to self A/c XX7710. Ref 426355566677 -HDFC Bank',
      receivedAt: at(18, 12, 0),
    },
    expect: { type: 'transfer', amount: 5000, category: 'Transfers' },
  },
  {
    name: 'Credit card bill payment received → transfer',
    sms: {
      sender: 'AD-ICICIB',
      body: 'Dear Customer, Payment of INR 12,000.00 has been received towards your ICICI Bank Credit Card XX1093 on 05-09-26. Thank you.',
      receivedAt: at(5, 11, 0),
    },
    expect: { type: 'transfer', amount: 12000 },
  },
  {
    name: 'Refund credited',
    sms: {
      sender: 'VM-HDFCBK',
      body: 'Rs.1,299.00 refund credited to your A/c XX4821 from AMAZON on 22-09-26. Ref 426400011122 -HDFC Bank',
      receivedAt: at(22, 16, 0),
    },
    expect: { type: 'income', amount: 1299 },
  },
  {
    name: 'Paytm wallet payment',
    sms: {
      sender: 'VM-PAYTMB',
      body: 'Paid Rs.120 to Chai Point from Paytm Balance. Updated Balance: Paytm Wallet- Rs 230. More Details: https://p.paytm.me/xCTH',
      receivedAt: at(23, 9, 0),
    },
    expect: { type: 'expense', amount: 120, merchant: 'Chai Point', category: 'Food', method: 'Wallet' },
  },
  {
    name: 'Transaction without direction keyword → unknown',
    sms: {
      sender: 'VM-HDFCBK',
      body: 'Txn of INR 540.00 done on HDFC Bank Card XX4821 at DECATHLON on 14-09-26.',
      receivedAt: at(14, 17, 2),
    },
    expect: { type: 'unknown', amount: 540, merchant: 'Decathlon', category: 'Shopping' },
  },
];

/** Messages that must NOT become transactions. */
export const NON_TRANSACTION_FIXTURES: { name: string; reason: string; sms: RawSms }[] = [
  {
    name: 'OTP',
    reason: 'otp',
    sms: { sender: 'VM-HDFCBK', body: '123456 is your OTP for txn of INR 1,299.00 at AMAZON on HDFC Bank card XX4821. Valid for 5 mins. Do not share OTP with anyone.', receivedAt: NOW },
  },
  {
    name: 'Promotional offer',
    reason: 'promotional',
    sms: { sender: 'AD-HDFCBK', body: 'Congratulations! You are pre-approved for a Personal Loan of Rs.5,00,000. Apply now: hdfc.bank/pl T&C', receivedAt: NOW },
  },
  {
    name: 'Bill due reminder',
    reason: 'reminder',
    sms: { sender: 'AD-ICICIB', body: 'Your ICICI Bank Credit Card XX1093 statement: Total amount due Rs.12,340.00, minimum amount due Rs.620.00. Payment is due on 05-10-26.', receivedAt: NOW },
  },
  {
    name: 'Pre-debit mandate notification',
    reason: 'reminder',
    sms: { sender: 'VM-HDFCBK', body: 'Rs.649.00 will be debited from your A/c XX4821 on 11-10-26 towards NETFLIX (e-mandate).', receivedAt: NOW },
  },
  {
    name: 'UPI collect request',
    reason: 'reminder',
    sms: { sender: 'VK-SBIUPI', body: 'RAHUL SHARMA has requested money Rs.500 from you on UPI. Approve in your UPI app. Ignore if not known.', receivedAt: NOW },
  },
  {
    name: 'Failed transaction',
    reason: 'failed',
    sms: { sender: 'VM-HDFCBK', body: 'Your UPI transaction of Rs.450.00 to swiggy@icici has failed. Any amount debited will be reversed within 3 days.', receivedAt: NOW },
  },
  {
    name: 'Personal chat',
    reason: 'not_financial',
    sms: { sender: '+919812345678', body: 'Hey, are we still meeting for dinner at 8?', receivedAt: NOW },
  },
  {
    name: 'Empty',
    reason: 'empty',
    sms: { sender: 'VM-HDFCBK', body: '   ', receivedAt: NOW },
  },
];
