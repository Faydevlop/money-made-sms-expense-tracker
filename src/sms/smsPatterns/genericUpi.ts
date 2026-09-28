import { cleanCounterparty } from './common';
import { SmsPattern } from './types';

/** "... to VPA swiggy@icici ..." / "... from VPA rahul.sharma@okhdfc ..." / "... to swiggy@upi ..." */
export const genericUpi: SmsPattern = {
  id: 'generic-upi',
  match(body) {
    const vpa = /\b(to|from)\s+(?:vpa\s+)?([a-z0-9][a-z0-9._-]{1,63}@[a-z][a-z0-9]{1,31})\b/i.exec(body);
    if (!vpa) return null;
    return {
      vpa: vpa[2].toLowerCase(),
      counterparty: cleanCounterparty(vpa[2].toLowerCase()),
      method: 'UPI',
    };
  },
};
