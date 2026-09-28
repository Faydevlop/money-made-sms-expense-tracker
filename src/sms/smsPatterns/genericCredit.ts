import { cleanCounterparty } from './common';
import { SmsPattern } from './types';

const PAYER = [
  // "credited ... by NEFT from ACME TECHNOLOGIES PVT LTD. Ref ..."
  /\bby\s+(?:neft|imps|rtgs)\s+from\s+([^.\n]+)/i,
  // "received from RAHUL SHARMA" / "credited ... from ACME"
  /\b(?:received|credited|deposited)\b.*?\bfrom\s+(?!a\/?c\b|your\b)([A-Za-z][^.\n(]*?)(?:\s+(?:on|ref|via|upi|\()|\.|$)/i,
  // "credited ... by ACME CORP."
  /\bcredited\b.*?\bby\s+(?!neft|imps|rtgs|rs)([A-Za-z][^.\n(]*?)(?:\s+(?:on|ref|via|\()|\.|$)/i,
];

export const genericCredit: SmsPattern = {
  id: 'generic-credit',
  match(body) {
    for (const re of PAYER) {
      const m = re.exec(body);
      const cp = m ? cleanCounterparty(m[1]) : null;
      if (cp) return { counterparty: cp };
    }
    return null;
  },
};
