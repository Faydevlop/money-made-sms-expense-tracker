import { RawSms } from '../types/transaction';
import { groupIndian } from '../utils/currencyUtils';
import { addDays, monthIndexOf, pad2 } from '../utils/dateUtils';

/**
 * Development / demo data: ~12 months of realistic bank SMS for three accounts.
 * The messages are fed through the real SMS pipeline, so sample data exercises
 * the parser, categorizer and duplicate detection exactly like live SMS would.
 * All account numbers, references and VPAs are fictional.
 */

type Acct = 'HDFC' | 'ICICI' | 'SBI';
type Method = 'UPI' | 'Card' | 'Bank transfer' | 'Auto-debit';

const L4: Record<Acct, string> = { HDFC: '4821', ICICI: '1093', SBI: '7710' };
const BANK: Record<Acct, string> = { HDFC: 'HDFC Bank', ICICI: 'ICICI Bank', SBI: 'SBI' };
const SENDER: Record<Acct, string> = { HDFC: 'VM-HDFCBK', ICICI: 'AD-ICICIB', SBI: 'VK-SBIUPI' };
const VPA: Record<string, string> = {
  Swiggy: 'swiggy@icici',
  Zomato: 'zomato@hdfcbank',
  Amazon: 'amazonpay@apl',
  Flipkart: 'flipkart@axisbank',
  Uber: 'uber@axisbank',
  Ola: 'olacabs@ybl',
  BigBasket: 'bigbasket@hdfcbank',
  IRCTC: 'irctc@sbi',
  'Rahul Sharma': 'rahul.sharma@okhdfc',
  UNKNOWN_PHONE: '9876543210@ybl',
};

interface Spec {
  ts: number;
  name: string;
  amount: number;
  dir: 'in' | 'out';
  method: Method;
  acct: Acct;
  payer?: string;
  ref: string;
}

// Deterministic PRNG (mulberry32) so sample data is identical on every run.
/* eslint-disable no-bitwise */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* eslint-enable no-bitwise */

const dmy = (ts: number) => {
  const d = new Date(ts);
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${String(d.getFullYear()).slice(2)}`;
};

function vpaFor(name: string): string {
  return VPA[name] ?? name.toLowerCase().replace(/[^a-z0-9]/g, '') + '@okaxis';
}

function smsBody(t: Spec): string {
  const a = groupIndian(t.amount) + '.00';
  const l = L4[t.acct];
  const b = BANK[t.acct];
  const d = dmy(t.ts);
  if (t.dir === 'in') {
    return t.method === 'UPI'
      ? `Rs.${a} credited to A/c XX${l} on ${d} from VPA ${vpaFor(t.name)} (UPI Ref No ${t.ref}). -${b}`
      : `Rs.${a} credited to A/c XX${l} on ${d} by NEFT from ${t.payer ?? t.name.toUpperCase()}. Ref ${t.ref}. Avl Bal Rs.62,418.20 -${b}`;
  }
  if (t.name === 'NEFT_NO_NAME') return `Rs.${a} debited from A/c XX${l} on ${d} via NEFT. Ref ${t.ref} -${b}`;
  if (t.method === 'UPI') {
    return `Rs.${a} debited from A/c XX${l} on ${d} to VPA ${vpaFor(t.name)} (UPI Ref No ${t.ref}). Not you? Call 18002586161 -${b}`;
  }
  if (t.method === 'Card') {
    return `Rs.${a} spent on ${b} Card XX${l} at ${t.name.toUpperCase()} on ${d}. Avl Limit Rs.1,48,210. Not you? SMS BLOCK ${l} to 5676766 -${b}`;
  }
  if (t.method === 'Auto-debit') {
    return `Your A/c XX${l} is debited for Rs.${a} on ${d} towards ${t.name.toUpperCase()} (e-mandate). Ref ${t.ref} -${b}`;
  }
  return `Rs.${a} debited from A/c XX${l} on ${d} via NEFT to ${t.name}. Ref ${t.ref} -${b}`;
}

export function generateSampleSms(now: number = Date.now(), months = 12): RawSms[] {
  const R = rng(42);
  const specs: Spec[] = [];
  const pick = <T,>(a: T[]) => a[Math.floor(R() * a.length)];
  const ref = () => String(426000000000 + Math.floor(R() * 9e8));
  const cur = monthIndexOf(now);

  const add = (y: number, m: number, d: number, h: number, mi: number, name: string, amount: number, dir: 'in' | 'out', method: Method, acct: Acct, payer?: string) => {
    const ts = new Date(y, m, d, h, mi).getTime();
    if (ts > now) return;
    specs.push({ ts, name, amount: Math.round(amount), dir, method, acct, payer, ref: ref() });
  };

  for (let k = months - 1; k >= 0; k--) {
    const idx = cur - k;
    const y = Math.floor(idx / 12);
    const m = idx % 12;
    const dim = new Date(y, m + 1, 0).getDate();
    const rd = () => 1 + Math.floor(R() * dim);
    const rv = (a: number, b: number) => a + R() * (b - a);
    const g = (count: number, list: [string, number, number][], methods: Method[], accts: Acct[]) => {
      for (let i = 0; i < count; i++) {
        const [nm, a, b] = pick(list);
        add(y, m, rd(), 8 + Math.floor(R() * 14), Math.floor(R() * 60), nm, rv(a, b), 'out', pick(methods), pick(accts));
      }
    };
    g(6 + Math.floor(R() * 3), [['Swiggy', 250, 700], ['Zomato', 300, 800], ['BigBasket', 1200, 2600], ['Starbucks', 300, 520], ['Blue Tokai Coffee', 250, 450]], ['UPI', 'UPI', 'Card'], ['HDFC', 'HDFC', 'ICICI']);
    g(2 + Math.floor(R() * 3), [['Amazon', 400, 2500], ['Myntra', 900, 3000], ['Flipkart', 500, 2200]], ['UPI', 'Card'], ['HDFC', 'ICICI']);
    g(3 + Math.floor(R() * 3), [['Uber', 180, 650], ['Ola', 150, 450], ['IRCTC', 900, 2200]], ['UPI'], ['HDFC', 'ICICI']);
    g(2, [['Indian Oil', 1100, 1600], ['HP Petrol', 1100, 1600]], ['Card'], ['ICICI']);
    g(Math.floor(R() * 3), [['PVR Cinemas', 400, 1200], ['BookMyShow', 300, 900]], ['Card'], ['HDFC']);
    g(Math.floor(R() * 3), [['Apollo Pharmacy', 200, 900]], ['Card'], ['HDFC']);
    g(1 + Math.floor(R() * 2), [['Ravi General Store', 150, 600], ['Shree Laundry', 300, 800]], ['Bank transfer'], ['SBI']);
    add(y, m, 15, 10, 0, 'Airtel Postpaid', 999, 'out', 'Auto-debit', 'HDFC');
    add(y, m, 10, 12, 30, 'BESCOM Electricity', rv(1600, 2600), 'out', 'Auto-debit', 'HDFC');
    add(y, m, 5, 9, 0, 'ACT Fibernet', 1200, 'out', 'Auto-debit', 'HDFC');
    add(y, m, 11, 6, 0, 'Netflix', 649, 'out', 'Card', 'ICICI');
    add(y, m, 11, 6, 2, 'Spotify', 119, 'out', 'Card', 'ICICI');
    add(y, m, 4, 7, 30, 'YouTube Premium', 149, 'out', 'Card', 'ICICI');
    add(y, m, Math.min(28, dim), 9, 15, 'Salary', 37900, 'in', 'Bank transfer', 'HDFC', 'ACME TECHNOLOGIES PVT LTD SALARY');
    if (R() < 0.5) add(y, m, rd(), 10, 5, 'Upwork', rv(1500, 6000), 'in', 'Bank transfer', 'ICICI', 'UPWORK ESCROW INC');
    if (k === 10) add(y, m, 2, 18, 40, 'Croma', 12999, 'out', 'Card', 'ICICI');
    if (k === 9) add(y, m, 14, 8, 10, 'IndiGo', 6450, 'out', 'Card', 'ICICI');
    if (k === 8) add(y, m, 9, 20, 0, 'Coursera', 2999, 'out', 'Card', 'ICICI');
  }

  // A few that the categorizer cannot place, so "Needs review" has content.
  const recent = (daysAgo: number, h: number) => {
    const d = new Date(addDays(now, -daysAgo));
    return [d.getFullYear(), d.getMonth(), d.getDate(), h] as const;
  };
  const [y1, m1, d1] = recent(2, 0);
  add(y1, m1, d1, 18, 47, 'UNKNOWN_PHONE', 1200, 'out', 'UPI', 'SBI');
  const [y2, m2, d2] = recent(4, 0);
  add(y2, m2, d2, 11, 12, 'PAY*RAZORPAY 8839', 850, 'out', 'Card', 'HDFC');
  const [y3, m3, d3] = recent(6, 0);
  add(y3, m3, d3, 12, 3, 'NEFT_NO_NAME', 400, 'out', 'Bank transfer', 'HDFC');
  const [y4, m4, d4] = recent(13, 0);
  add(y4, m4, d4, 14, 18, 'Rahul Sharma', 4500, 'in', 'UPI', 'SBI');

  return specs.map((s, i) => ({ id: `sample-${i}`, sender: SENDER[s.acct], body: smsBody(s), receivedAt: s.ts }));
}
