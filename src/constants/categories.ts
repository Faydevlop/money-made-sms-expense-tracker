import { Category, PaymentMethod } from '../types/transaction';

export const UNCATEGORIZED = 'Uncategorized';
export const INCOME = 'Income';
export const TRANSFERS = 'Transfers';

/** Built-in categories seeded on first launch. Users can add more (see categoryRepository). */
export const DEFAULT_CATEGORIES: Omit<Category, 'sortOrder'>[] = [
  { id: 'food', name: 'Food', icon: 'utensils', color: '#f7dccb', isSystem: true },
  { id: 'shopping', name: 'Shopping', icon: 'bag', color: '#e4d9f3', isSystem: true },
  { id: 'travel', name: 'Travel', icon: 'car', color: '#d3e6ee', isSystem: true },
  { id: 'fuel', name: 'Fuel', icon: 'fuel', color: '#dfe7c3', isSystem: true },
  { id: 'bills', name: 'Bills', icon: 'receipt', color: '#f5ecc2', isSystem: true },
  { id: 'entertainment', name: 'Entertainment', icon: 'film', color: '#f5d6e3', isSystem: true },
  { id: 'healthcare', name: 'Healthcare', icon: 'heart', color: '#d6eee2', isSystem: true },
  { id: 'rent', name: 'Rent', icon: 'home', color: '#e8e2d6', isSystem: true },
  { id: 'education', name: 'Education', icon: 'cap', color: '#dde1f5', isSystem: true },
  { id: 'subscriptions', name: 'Subscriptions', icon: 'repeat', color: '#ecdcf0', isSystem: true },
  { id: 'transfers', name: TRANSFERS, icon: 'swap', color: '#e6e3e8', isSystem: true },
  { id: 'other', name: 'Other', icon: 'dot', color: '#ebe7ee', isSystem: true },
  { id: 'income', name: INCOME, icon: 'in', color: '#d8ecd9', isSystem: true },
];

export const PAYMENT_METHODS: PaymentMethod[] = ['UPI', 'Card', 'Bank transfer', 'Auto-debit', 'ATM', 'Wallet', 'Other'];

/** Payment methods shown as filter chips (the design's set, plus ATM when present). */
export const FILTER_METHODS: PaymentMethod[] = ['UPI', 'Card', 'Bank transfer', 'Auto-debit'];
