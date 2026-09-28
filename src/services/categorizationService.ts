import { INCOME, TRANSFERS } from '../constants/categories';
import { MerchantRule, PaymentMethod, TransactionType } from '../types/transaction';
import { normalizeMerchantKey } from '../utils/transactionUtils';

export interface CategorizationInput {
  merchant: string;
  vpa?: string | null;
  type: TransactionType;
  method?: PaymentMethod;
  isSalary?: boolean;
}

export interface CategorizationResult {
  category: string | null;
  /** 0..1 — below CONFIDENT the transaction is left for review. */
  confidence: number;
  source: 'user-rule' | 'keyword' | 'type' | 'none';
}

/**
 * Any categorizer (rule-based today, possibly on-device ML or an AI service later)
 * implements this interface. The rest of the app only calls `categorize()`.
 */
export interface CategorizationEngine {
  categorize(input: CategorizationInput, rules: MerchantRule[]): CategorizationResult;
}

export const CONFIDENT = 0.6;

/** Built-in merchant keywords. Matched on word boundaries against merchant + VPA. */
export const KEYWORD_RULES: { category: string; keywords: string[] }[] = [
  {
    category: 'Food',
    keywords: [
      'swiggy', 'zomato', 'bigbasket', 'blinkit', 'zepto', 'instamart', 'dunzo', 'starbucks', 'blue tokai',
      'dominos', "domino's", 'mcdonald', 'mcdonalds', 'kfc', 'pizza hut', 'burger king', 'subway', 'eatfit',
      'chai point', 'haldiram', 'restaurant', 'cafe', 'bakery', 'dmart', 'grocery', 'groceries', 'eatclub',
    ],
  },
  {
    category: 'Shopping',
    keywords: [
      'amazon', 'amzn', 'flipkart', 'myntra', 'ajio', 'nykaa', 'meesho', 'decathlon', 'croma', 'reliance digital',
      'tata cliq', 'lifestyle', 'westside', 'ikea', 'shoppers stop', 'firstcry', 'lenskart', 'snapdeal',
    ],
  },
  {
    category: 'Travel',
    keywords: [
      'uber', 'ola', 'olacabs', 'rapido', 'irctc', 'indigo', 'air india', 'vistara', 'spicejet', 'akasa',
      'makemytrip', 'goibibo', 'redbus', 'cleartrip', 'yatra', 'metro', 'fastag', 'blusmart', 'ixigo',
    ],
  },
  {
    category: 'Fuel',
    keywords: ['indian oil', 'iocl', 'hp petrol', 'hpcl', 'bharat petroleum', 'bpcl', 'shell', 'nayara', 'petrol', 'fuel'],
  },
  {
    category: 'Bills',
    keywords: [
      'airtel', 'jio', 'vodafone', 'vi postpaid', 'bsnl', 'bescom', 'electricity', 'tata power', 'adani electricity',
      'act fibernet', 'broadband', 'hathway', 'water bill', 'gas bill', 'indane', 'bharat gas', 'mahanagar gas',
      'postpaid', 'recharge', 'dth', 'tata play',
    ],
  },
  {
    category: 'Entertainment',
    keywords: ['pvr', 'inox', 'bookmyshow', 'cinepolis', 'district', 'steam', 'playstation', 'gaming'],
  },
  {
    category: 'Healthcare',
    keywords: [
      'apollo', 'pharmacy', 'pharmeasy', 'netmeds', '1mg', 'tata 1mg', 'practo', 'hospital', 'clinic', 'diagnostic',
      'medplus', 'dental', 'lab', 'cult fit', 'cultfit',
    ],
  },
  { category: 'Rent', keywords: ['rent', 'nobroker', 'nestaway', 'housing', 'landlord', 'society maintenance'] },
  {
    category: 'Education',
    keywords: ['coursera', 'udemy', 'byju', 'unacademy', 'school', 'college', 'university', 'tuition', 'upgrad', 'edx'],
  },
  {
    category: 'Subscriptions',
    keywords: [
      'netflix', 'spotify', 'youtube premium', 'youtube', 'prime video', 'amazon prime', 'hotstar', 'jiocinema',
      'sonyliv', 'zee5', 'apple.com', 'apple services', 'google one', 'icloud', 'linkedin premium', 'chatgpt', 'claude',
    ],
  },
  { category: 'Other', keywords: ['general store', 'kirana', 'laundry', 'dry clean', 'salon', 'barber', 'stationery'] },
];

function containsKeyword(haystack: string, kw: string): boolean {
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`).test(haystack);
}

const ORG_WORDS =
  /^(inc|llp|llc|ltd|pvt|limited|corp|co|company|technologies|technology|tech|solutions|services|systems|escrow|payments|bank|india|global|labs|ventures|enterprises|industries|store|stores|traders|foods|mart)$/i;

/** "Rahul Sharma", "rahul.sharma" — two or three purely alphabetic words. */
export function looksLikePersonName(name: string): boolean {
  const words = name.trim().split(/[\s._]+/).filter(Boolean);
  if (words.length < 2 || words.length > 3) return false;
  if (!words.every(w => /^[a-z]{2,}$/i.test(w))) return false;
  if (words.some(w => ORG_WORDS.test(w))) return false;
  const joined = normalizeMerchantKey(name);
  return !KEYWORD_RULES.some(r => r.keywords.some(k => containsKeyword(joined, k)));
}

export const ruleBasedCategorizer: CategorizationEngine = {
  categorize(input, rules) {
    if (input.type === 'transfer') return { category: TRANSFERS, confidence: 1, source: 'type' };

    const key = normalizeMerchantKey(input.merchant);
    const rule = rules.find(r => r.pattern === key);
    if (rule) return { category: rule.category, confidence: 1, source: 'user-rule' };

    const vpaLocal = input.vpa ? input.vpa.split('@')[0].replace(/[._-]+/g, ' ') : '';
    const haystack = `${key} ${normalizeMerchantKey(vpaLocal)}`.trim();

    if (input.type === 'income') {
      if (input.isSalary) return { category: INCOME, confidence: 0.95, source: 'keyword' };
      if (looksLikePersonName(input.merchant) || (input.vpa && looksLikePersonName(vpaLocal))) {
        return { category: TRANSFERS, confidence: 0.7, source: 'keyword' };
      }
      return { category: INCOME, confidence: 0.8, source: 'type' };
    }

    for (const r of KEYWORD_RULES) {
      if (r.keywords.some(k => containsKeyword(haystack, k))) {
        return { category: r.category, confidence: 0.85, source: 'keyword' };
      }
    }
    // UPI handles are often concatenated ("bluetokaicoffee@okaxis"): look for
    // longer keywords inside the compacted handle. Short ones ("ola") would misfire.
    const compactVpa = vpaLocal.replace(/[^a-z0-9]/gi, '').toLowerCase();
    if (compactVpa) {
      for (const r of KEYWORD_RULES) {
        const hit = r.keywords.some(k => {
          const ck = k.replace(/[^a-z0-9]/g, '');
          return ck.length >= 5 && compactVpa.includes(ck);
        });
        if (hit) return { category: r.category, confidence: 0.7, source: 'keyword' };
      }
    }
    if (input.method === 'ATM') return { category: 'Other', confidence: 0.7, source: 'keyword' };
    return { category: null, confidence: 0, source: 'none' };
  },
};

let engine: CategorizationEngine = ruleBasedCategorizer;

/** Swap in a different engine (e.g. an AI-backed one) without touching callers. */
export function setCategorizationEngine(e: CategorizationEngine): void {
  engine = e;
}

export function categorize(input: CategorizationInput, rules: MerchantRule[]): CategorizationResult {
  try {
    return engine.categorize(input, rules);
  } catch {
    return { category: null, confidence: 0, source: 'none' };
  }
}
