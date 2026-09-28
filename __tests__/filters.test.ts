import { queryTransactions } from '../src/services/transactionQuery';
import { DEFAULT_FILTERS, Filters } from '../src/store/uiStore';
import { monthIndexOf } from '../src/utils/dateUtils';
import { NOW } from './fixtures/smsFixtures';
import { tx } from './helpers';

jest.mock('@op-engineering/op-sqlite', () => ({ open: jest.fn() }));

const sep = (d: number, h = 12) => new Date(2026, 8, d, h).getTime();
const DATA = [
  tx({ timestamp: sep(28, 20), amount: 450, merchant: 'Swiggy', category: 'Food', paymentMethod: 'UPI' }),
  tx({ timestamp: sep(28, 9), amount: 37900, type: 'income', merchant: 'Salary', category: 'Income', paymentMethod: 'Bank transfer' }),
  tx({ timestamp: sep(25), amount: 380, merchant: 'Blue Tokai', category: 'Food', paymentMethod: 'Card', account: '1093', bank: 'ICICI Bank' }),
  tx({ timestamp: sep(24), amount: 1500, merchant: 'Indian Oil', category: 'Fuel', paymentMethod: 'Card', account: '1093', bank: 'ICICI Bank' }),
  tx({ timestamp: sep(22), amount: 850, merchant: 'PAY*RAZORPAY', category: null, isCategorized: false }),
  tx({ timestamp: new Date(2026, 7, 20).getTime(), amount: 700, merchant: 'Zomato', category: 'Food' }),
];

const q = (f: Partial<Filters>) => queryTransactions(DATA, { ...DEFAULT_FILTERS, ...f }, monthIndexOf(NOW), NOW);

describe('transaction filters', () => {
  it('month + category + type combine', () => {
    const r = q({ period: 'month', categories: ['Food'], type: 'out' });
    expect(r.list.map(t => t.merchant)).toEqual(['Swiggy', 'Blue Tokai']);
    expect(r.spent).toBe(830);
    expect(r.activeFilters).toBe(2);
  });

  it('received / uncategorized', () => {
    expect(q({ type: 'in' }).list.map(t => t.merchant)).toEqual(['Salary']);
    expect(q({ type: 'unc' }).list.map(t => t.merchant)).toEqual(['PAY*RAZORPAY']);
    expect(q({ categories: ['Uncategorized'] }).list).toHaveLength(1);
  });

  it('payment method and account', () => {
    expect(q({ methods: ['Card'] }).list).toHaveLength(2);
    expect(q({ accounts: ['ICICI Bank|093'] }).list.map(t => t.merchant)).toEqual(['Blue Tokai', 'Indian Oil']);
  });

  it('previous month and search', () => {
    expect(q({ period: 'prev' }).list.map(t => t.merchant)).toEqual(['Zomato']);
    expect(q({ query: 'oil' }).list.map(t => t.merchant)).toEqual(['Indian Oil']);
    expect(q({ query: 'food' }).list).toHaveLength(2);
  });

  it('sorting and grouping', () => {
    expect(q({ sort: 'high' }).list[0].merchant).toBe('Salary');
    expect(q({ sort: 'low' }).list[0].merchant).toBe('Blue Tokai');
    expect(q({ sort: 'oldest' }).list[0].merchant).toBe('PAY*RAZORPAY');
    const g = q({ sort: 'newest' }).groups;
    expect(g[0].label).toBe('Today · Mon, 28 Sep');
    expect(g[0].items).toHaveLength(2);
    expect(g[0].spent).toBe(450);
    expect(q({ sort: 'high' }).groups).toHaveLength(1);
  });
});
