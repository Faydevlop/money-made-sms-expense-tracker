import { cleanCounterparty, extractDate } from './common';
import { SmsPattern } from './types';

/**
 * Bank-specific layouts. These run before the generic patterns because they
 * know exactly where the payee sits in the message.
 */

/** HDFC multi-line UPI: "Sent Rs.450.00\nFrom HDFC Bank A/C *1234\nTo SWIGGY\nOn 28/09/26\nRef 4261..." */
export const hdfcSentUpi: SmsPattern = {
  id: 'hdfc-sent-upi',
  match(body) {
    const m = /^\s*sent\s+rs\.?\s*[\d,.]+\s+from\s+.*?\s+to\s+(.+?)\s+on\s+(\S+)/is.exec(body);
    if (!m) return null;
    return { direction: 'debit', counterparty: cleanCounterparty(m[1]), method: 'UPI' };
  },
};

/** SBI UPI debit: "A/C X7710 debited by 1200.0 on date 26Sep26 trf to RAHUL SHARMA Refno 4265..." */
export const sbiUpiDebit: SmsPattern = {
  id: 'sbi-upi-debit',
  match(body) {
    const m = /debited by\s*(?:rs\.?)?\s*[\d,.]+\s+on date\s+(\S+)\s+trf to\s+(.+?)\s+ref\s*no/i.exec(body);
    if (!m) return null;
    return { direction: 'debit', counterparty: cleanCounterparty(m[2]), method: 'UPI' };
  },
};

/** SBI UPI credit: "ur A/cX7710 credited by Rs4500 on 15Sep26 by RAHUL SHARMA (Ref no 4265...)" */
export const sbiUpiCredit: SmsPattern = {
  id: 'sbi-upi-credit',
  match(body) {
    const m = /credited by\s*(?:rs\.?)?\s*[\d,.]+\s+on\s+\S+\s+(?:by|from)\s+(.+?)\s*\(?\s*ref\s*no/i.exec(body);
    if (!m) return null;
    return { direction: 'credit', counterparty: cleanCounterparty(m[1]), method: 'UPI' };
  },
};

/** ICICI UPI: "ICICI Bank Acct XX093 debited for Rs 342.00 on 27-Sep-26; UBER credited. UPI:4267..." */
export const iciciUpiDebit: SmsPattern = {
  id: 'icici-upi-debit',
  match(body) {
    const m = /debited for\s+(?:rs\.?|inr)\s*[\d,.]+\s+on\s+[\w-]+;\s*(.+?)\s+credited/i.exec(body);
    if (!m) return null;
    return { direction: 'debit', counterparty: cleanCounterparty(m[1]), method: 'UPI' };
  },
};

/** ICICI card: "INR 1,500.00 spent using ICICI Bank Card XX1093 on 24-Sep-26 on INDIAN OIL. Avl Limit..." */
export const iciciCardSpent: SmsPattern = {
  id: 'icici-card-spent',
  match(body, sms) {
    const m = /spent\s+(?:using|on)\s+.*?card\s+\S+\s+on\s+(\S+?)\s+(?:on|at)\s+(.+?)\.\s/i.exec(body);
    if (!m) return null;
    return {
      direction: 'debit',
      counterparty: cleanCounterparty(m[2]),
      method: 'Card',
      date: extractDate(m[1], sms.receivedAt),
    };
  },
};

/** Axis: "INR 500.00 debited\nA/c no. XX5678\n28-09-26, 14:32:10\nUPI/P2M/4268.../ZOMATO LTD\n..." */
export const axisUpi: SmsPattern = {
  id: 'axis-upi',
  match(body) {
    const m = /upi\/(p2[am]|dr|cr)\/\d+\/([^\n/]+)/i.exec(body);
    if (!m) return null;
    const dir = m[1].toLowerCase() === 'cr' ? 'credit' : undefined;
    return { counterparty: cleanCounterparty(m[2]), method: 'UPI', ...(dir ? { direction: dir } : {}) };
  },
};

/** Kotak: "Sent Rs.250.00 from Kotak Bank AC X4567 to zomato@kotak on 28-09-26.UPI Ref 4269..." */
export const kotakSentUpi: SmsPattern = {
  id: 'kotak-sent-upi',
  match(body) {
    const m = /^\s*sent\s+rs\.?\s*[\d,.]+\s+from\s+.*?\bac\b.*?\s+to\s+(\S+)\s+on\s/i.exec(body);
    if (!m) return null;
    return { direction: 'debit', counterparty: cleanCounterparty(m[1]), method: 'UPI' };
  },
};

/** Paytm wallet: "Paid Rs.120 to Chai Point from Paytm Balance." */
export const paytmWallet: SmsPattern = {
  id: 'paytm-wallet',
  match(body) {
    const m = /^\s*paid\s+rs\.?\s*[\d,.]+\s+to\s+(.+?)\s+from\s+paytm/i.exec(body);
    if (!m) return null;
    return { direction: 'debit', counterparty: cleanCounterparty(m[1]), method: 'Wallet', bank: 'Paytm' };
  },
};

/** Auto-debit/e-mandate: "Your A/c XX4821 is debited for Rs.999.00 on 15-09-26 towards AIRTEL POSTPAID (e-mandate)." */
export const mandateDebit: SmsPattern = {
  id: 'mandate-debit',
  match(body) {
    const m = /debited for\s+(?:rs\.?|inr)\s*[\d,.]+\s+on\s+\S+\s+towards\s+(.+?)\s*\(/i.exec(body);
    if (!m) return null;
    return { direction: 'debit', counterparty: cleanCounterparty(m[1]), method: 'Auto-debit' };
  },
};

/** ATM: "Rs.2000 withdrawn at ATM ... from A/c XX1234" */
export const atmWithdrawal: SmsPattern = {
  id: 'atm-withdrawal',
  match(body) {
    if (!/\bwithdrawn\b|\bcash withdrawal\b/i.test(body) || !/\batm\b/i.test(body)) return null;
    return { direction: 'debit', method: 'ATM' };
  },
};

export const bankPatterns: SmsPattern[] = [
  hdfcSentUpi,
  kotakSentUpi,
  sbiUpiDebit,
  sbiUpiCredit,
  iciciUpiDebit,
  iciciCardSpent,
  axisUpi,
  paytmWallet,
  mandateDebit,
  atmWithdrawal,
];
