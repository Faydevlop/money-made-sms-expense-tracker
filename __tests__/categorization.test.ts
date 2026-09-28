import {
  categorize,
  looksLikePersonName,
  ruleBasedCategorizer,
  setCategorizationEngine,
} from '../src/services/categorizationService';
import { MerchantRule } from '../src/types/transaction';

const cat = (merchant: string, extra: Partial<Parameters<typeof categorize>[0]> = {}, rules: MerchantRule[] = []) =>
  categorize({ merchant, type: 'expense', ...extra }, rules).category;

describe('rule-based categorization', () => {
  it.each([
    ['Swiggy', 'Food'],
    ['Zomato', 'Food'],
    ['Uber', 'Travel'],
    ['Ola', 'Travel'],
    ['Amazon', 'Shopping'],
    ['Flipkart', 'Shopping'],
    ['Netflix', 'Subscriptions'],
    ['Indian Oil', 'Fuel'],
    ['BESCOM Electricity', 'Bills'],
    ['PVR Cinemas', 'Entertainment'],
    ['Apollo Pharmacy', 'Healthcare'],
    ['Coursera', 'Education'],
    ['Shree Laundry', 'Other'],
  ])('%s → %s', (merchant, expected) => {
    expect(cat(merchant)).toBe(expected);
  });

  it('matches whole words only', () => {
    // "ola" must not match inside "Cola" or "Motorola"
    expect(cat('Motorola Service')).toBeNull();
  });

  it('uses the VPA when the display name is unhelpful', () => {
    expect(cat('UPI payment', { vpa: 'bigbasket@hdfcbank' })).toBe('Food');
  });

  it('finds brands inside concatenated UPI handles', () => {
    expect(cat('Bluetokaicoffee', { vpa: 'bluetokaicoffee@okaxis' })).toBe('Food');
    expect(cat('Colaking', { vpa: 'colaking@okaxis' })).toBeNull();
  });

  it('leaves unknown merchants uncategorized', () => {
    expect(cat('UPI-9876543210@ybl')).toBeNull();
    expect(cat('PAY*RAZORPAY 8839')).toBeNull();
    expect(cat('Ravi Kumar')).toBeNull();
  });

  it('user rules take precedence over keywords', () => {
    const rules: MerchantRule[] = [{ id: 'r1', pattern: 'swiggy', category: 'Other', createdAt: 0 }];
    expect(cat('Swiggy', {}, rules)).toBe('Other');
    const res = categorize({ merchant: 'Swiggy', type: 'expense' }, rules);
    expect(res.source).toBe('user-rule');
  });

  it('categorizes income and transfers by type', () => {
    expect(cat('Salary', { type: 'income', isSalary: true })).toBe('Income');
    expect(cat('Rahul Sharma', { type: 'income' })).toBe('Transfers');
    expect(cat('Upwork Escrow Inc', { type: 'income' })).toBe('Income');
    expect(cat('Anything', { type: 'transfer' })).toBe('Transfers');
  });

  it('detects person names', () => {
    expect(looksLikePersonName('Rahul Sharma')).toBe(true);
    expect(looksLikePersonName('rahul.sharma')).toBe(true);
    expect(looksLikePersonName('Acme Technologies')).toBe(false);
    expect(looksLikePersonName('Swiggy')).toBe(false);
  });

  it('engine is swappable and failures are contained', () => {
    setCategorizationEngine({
      categorize() {
        throw new Error('boom');
      },
    });
    expect(categorize({ merchant: 'Swiggy', type: 'expense' }, []).category).toBeNull();
    setCategorizationEngine(ruleBasedCategorizer);
    expect(cat('Swiggy')).toBe('Food');
  });
});
