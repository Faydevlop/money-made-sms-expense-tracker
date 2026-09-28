import { create } from 'zustand';
import { createCategoryRepository } from '../database/categoryRepository';
import { getDatabase } from '../database/database';
import { createSettingsRepository } from '../database/settingsRepository';
import { createTransactionRepository } from '../database/transactionRepository';
import { generateSampleSms } from '../services/sampleData';
import {
  createTransactionService,
  IngestOptions,
  IngestReport,
  Mutation,
  TransactionService,
} from '../services/transactionService';
import { Category, MerchantRule, RawSms, Transaction, TransactionType } from '../types/transaction';

interface Deps {
  service: TransactionService;
  txRepo: ReturnType<typeof createTransactionRepository>;
  catRepo: ReturnType<typeof createCategoryRepository>;
  settingsRepo: ReturnType<typeof createSettingsRepository>;
}

let depsPromise: Promise<Deps> | null = null;
let ingestQueue: Promise<unknown> = Promise.resolve();

/** Lazily wires the database, repositories and service together once. */
export function getDeps(): Promise<Deps> {
  if (!depsPromise) {
    depsPromise = getDatabase()
      .then(db => {
        const txRepo = createTransactionRepository(db);
        const catRepo = createCategoryRepository(db);
        const settingsRepo = createSettingsRepository(db);
        return { txRepo, catRepo, settingsRepo, service: createTransactionService({ txRepo, catRepo }) };
      })
      .catch(e => {
        depsPromise = null;
        throw e;
      });
  }
  return depsPromise;
}

function sortDesc(list: Transaction[]): Transaction[] {
  return list.sort((a, b) => b.timestamp - a.timestamp);
}

function applyRows(list: Transaction[], rows: Transaction[]): Transaction[] {
  if (!rows.length) return list;
  const byId = new Map(rows.map(r => [r.id, r]));
  const out = list.map(t => byId.get(t.id) ?? t);
  const known = new Set(list.map(t => t.id));
  const added = rows.filter(r => !known.has(r.id));
  return added.length ? sortDesc([...out, ...added]) : out;
}

interface TransactionState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  transactions: Transaction[];
  categories: Category[];
  rules: MerchantRule[];

  load(): Promise<void>;
  ingest(messages: RawSms[], opts?: IngestOptions): Promise<IngestReport>;
  setCategory(id: string, category: string, remember: boolean): Promise<Mutation | null>;
  renameMerchant(id: string, name: string): Promise<Mutation | null>;
  markTransfer(id: string): Promise<Mutation | null>;
  setType(id: string, type: TransactionType): Promise<Mutation | null>;
  setExcluded(id: string, excluded: boolean): Promise<Mutation | null>;
  setNotes(id: string, notes: string): Promise<void>;
  undo(m: Mutation): Promise<void>;
  addCategory(name: string): Promise<Category>;
  removeCategory(c: Category): Promise<void>;
  removeRule(id: string): Promise<void>;
  loadSampleData(): Promise<IngestReport>;
  removeSampleData(): Promise<void>;
  deleteAllData(): Promise<void>;
  /** Deletes every transaction, rule, custom category and setting. */
  eraseEverything(): Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set, get) => {
  /** Runs an edit on one transaction and merges the result into state. */
  async function edit(id: string, fn: (s: TransactionService, t: Transaction) => Promise<Mutation>): Promise<Mutation | null> {
    const t = get().transactions.find(x => x.id === id);
    if (!t) return null;
    const { service } = await getDeps();
    const m = await fn(service, t);
    set(s => ({ transactions: applyRows(s.transactions, m.after) }));
    return m;
  }

  async function reloadAll() {
    const { txRepo, catRepo } = await getDeps();
    const [transactions, categories, rules] = await Promise.all([txRepo.getAll(), catRepo.getAll(), catRepo.getRules()]);
    set({ transactions, categories, rules });
  }

  return {
    status: 'idle',
    error: null,
    transactions: [],
    categories: [],
    rules: [],

    async load() {
      set({ status: 'loading', error: null });
      try {
        await reloadAll();
        set({ status: 'ready' });
      } catch {
        set({ status: 'error', error: 'Could not open your transaction data.' });
      }
    },

    ingest(messages, opts) {
      // Serialized: the live listener and an inbox scan may deliver the same SMS
      // concurrently, and duplicate checks must see each other's inserts.
      const run = ingestQueue.then(async () => {
        const { service } = await getDeps();
        // Rows are published chunk by chunk so long imports fill the screens progressively.
        return service.ingest(messages, {
          ...opts,
          onProgress: (inserted, updated) => {
            set(s => ({ transactions: applyRows(s.transactions, [...updated, ...inserted]) }));
            opts?.onProgress?.(inserted, updated);
          },
        });
      });
      ingestQueue = run.catch(() => undefined);
      return run;
    },

    async setCategory(id, category, remember) {
      const { service, catRepo } = await getDeps();
      const m = await service.setCategory(get().transactions, id, category, remember);
      const rules = remember ? await catRepo.getRules() : get().rules;
      set(s => ({ transactions: applyRows(s.transactions, m.after), rules }));
      return m;
    },

    renameMerchant: (id, name) => edit(id, (s, t) => s.renameMerchant(t, name)),
    markTransfer: id => edit(id, (s, t) => s.markTransfer(t)),
    setType: (id, type) => edit(id, (s, t) => s.setType(t, type)),
    setExcluded: (id, excluded) => edit(id, (s, t) => s.setExcluded(t, excluded)),
    async setNotes(id, notes) {
      await edit(id, (s, t) => s.setNotes(t, notes));
    },

    async undo(m) {
      const { service } = await getDeps();
      await service.restore(m.before);
      set(s => ({ transactions: applyRows(s.transactions, m.before) }));
    },

    async addCategory(name) {
      const { service } = await getDeps();
      const c = await service.addCategory(name, get().categories);
      set(s => ({ categories: [...s.categories, c] }));
      return c;
    },

    async removeCategory(c) {
      const { service } = await getDeps();
      await service.removeCategory(c);
      await reloadAll();
    },

    async removeRule(id) {
      const { catRepo } = await getDeps();
      await catRepo.removeRule(id);
      set(s => ({ rules: s.rules.filter(r => r.id !== id) }));
    },

    async loadSampleData() {
      return get().ingest(generateSampleSms(Date.now()), { source: 'sample' });
    },

    async removeSampleData() {
      const { txRepo } = await getDeps();
      await txRepo.deleteBySource('sample');
      set(s => ({ transactions: s.transactions.filter(t => t.source !== 'sample') }));
    },

    async eraseEverything() {
      const { txRepo, catRepo, settingsRepo } = await getDeps();
      await txRepo.deleteAll();
      await catRepo.removeAllUserData();
      await settingsRepo.clear();
      await reloadAll();
    },

    async deleteAllData() {
      const { txRepo } = await getDeps();
      await txRepo.deleteAll();
      set({ transactions: [] });
    },
  };
});
