import { cleanCounterparty } from './common';
import { SmsPattern } from './types';

const PAYEE = [
  // "spent on HDFC Bank Card XX1093 at BLUE TOKAI COFFEE on 25-09-26"
  /\bat\s+([A-Za-z0-9][^.\n]*?)\s+(?:on|dated)\s/i,
  // "debited ... towards ACT FIBERNET"
  /\btowards\s+([A-Za-z0-9][^.\n(]*)/i,
  // "debited ... via NEFT to Shree Laundry. Ref 1234"
  /\b(?:trf|transfer(?:red)?|paid|sent|debited)\b.*?\bto\s+([A-Za-z][^.\n]*?)(?:\s+(?:on|ref|via|upi)\b|\.|$)/i,
  // "... at MERCHANT." (card POS without a date after it)
  /\bat\s+([A-Za-z0-9][^.\n]{1,40})\./i,
];

export const genericDebit: SmsPattern = {
  id: 'generic-debit',
  match(body) {
    for (const re of PAYEE) {
      const m = re.exec(body);
      const cp = m ? cleanCounterparty(m[1]) : null;
      if (cp && !/^(your|a\/?c|account|atm)\b/i.test(cp)) return { counterparty: cp };
    }
    return null;
  },
};
