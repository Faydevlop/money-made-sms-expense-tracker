import { customCategoryPastels } from '../constants/colors';
import { INCOME, TRANSFERS } from '../constants/categories';
import { CategoryRepository } from '../database/categoryRepository';
import { TransactionRepository } from '../database/transactionRepository';
import { extractTransaction } from '../sms/transactionExtractor';
import { Category, MerchantRule, RawSms, Transaction, TransactionSource, TransactionType } from '../types/transaction';
import { generateId, normalizeMerchantKey } from '../utils/transactionUtils';
import { findDuplicate, findTransferPair, TRANSFER_WINDOW_MS } from './duplicateDetection';

export interface IngestOptions {
  source?: TransactionSource;
  /** Normalized sender ids to skip (see normalizeSender). */
  disabledSenders?: string[];
  now?: number;
  /**
   * Called every CHUNK messages with the rows stored since the last call, so the
   * UI can show transactions as a long import progresses.
   */
  onProgress?: (inserted: Transaction[], updated: Transaction[]) => void;
}

/** Messages processed between progress callbacks / UI yields. */
const CHUNK = 40;
const yieldToUi = () => new Promise<void>(resolve => setTimeout(resolve, 0));

export interface IngestReport {
  scanned: number;
  ignored: number;
  duplicates: number;
  errors: number;
  transfersPaired: number;
  inserted: Transaction[];
  /** Existing rows modified during ingestion (e.g. the other leg of a transfer). */
  updated: Transaction[];
}

/** "VM-HDFCBK" / "AD-HDFCBK-S" → "HDFCBK". Phone numbers are returned as-is. */
export function normalizeSender(sender: string | null | undefined): string {
  if (!sender) return '';
  const s = sender.trim().toUpperCase();
  if (/^\+?\d+$/.test(s)) return s;
  const parts = s.split('-');
  if (parts.length >= 2 && parts[0].length <= 2) return parts[1];
  return parts.length === 3 ? parts[1] : parts[parts.length - 1];
}

/** Result of an edit: rows before and after, so the UI can offer undo. */
export interface Mutation {
  before: Transaction[];
  after: Transaction[];
}

const DAY = 86_400_000;

export function createTransactionService(deps: { txRepo: TransactionRepository; catRepo: CategoryRepository }) {
  const { txRepo, catRepo } = deps;

  async function ingest(messages: RawSms[], opts: IngestOptions = {}): Promise<IngestReport> {
    const report: IngestReport = { scanned: 0, ignored: 0, duplicates: 0, errors: 0, transfersPaired: 0, inserted: [], updated: [] };
    const disabled = new Set(opts.disabledSenders ?? []);
    const rules = await catRepo.getRules();
    const sorted = [...messages].sort((a, b) => a.receivedAt - b.receivedAt);

    let sentInserted = 0;
    let sentUpdated = 0;
    const flush = () => {
      if (!opts.onProgress) return;
      const ins = report.inserted.slice(sentInserted);
      const upd = report.updated.slice(sentUpdated);
      sentInserted = report.inserted.length;
      sentUpdated = report.updated.length;
      if (ins.length || upd.length) opts.onProgress(ins, upd);
    };

    for (let idx = 0; idx < sorted.length; idx++) {
      const sms = sorted[idx];
      if (idx > 0 && idx % CHUNK === 0) {
        flush();
        // Let touches, scrolling and animations run between chunks.
        await yieldToUi();
      }
      report.scanned++;
      try {
        if (disabled.has(normalizeSender(sms.sender))) {
          report.ignored++;
          continue;
        }
        const r = extractTransaction(sms, rules);
        if (!r.ok) {
          report.ignored++;
          continue;
        }
        const draft = r.draft;

        if (draft.smsHash && (await txRepo.existsSmsHash(draft.smsHash))) {
          report.duplicates++;
          continue;
        }
        if (draft.referenceNumber) {
          const sameRef = await txRepo.findByReference(draft.referenceNumber);
          if (findDuplicate(draft, sameRef)) {
            report.duplicates++;
            continue;
          }
        }
        const near = await txRepo.findNear(draft.timestamp, DAY);
        if (findDuplicate(draft, near)) {
          report.duplicates++;
          continue;
        }

        const now = opts.now ?? Date.now();
        const t: Transaction = { ...draft, id: generateId(), source: opts.source ?? draft.source, createdAt: now, updatedAt: now };

        const pair = findTransferPair(t, near.filter(n => Math.abs(n.timestamp - t.timestamp) <= TRANSFER_WINDOW_MS));
        if (pair) {
          Object.assign(t, { type: 'transfer', category: TRANSFERS, isCategorized: true });
          const pairPatch = { type: 'transfer' as const, category: TRANSFERS, isCategorized: true, updatedAt: now };
          await txRepo.update(pair.id, pairPatch);
          report.updated.push({ ...pair, ...pairPatch });
          report.transfersPaired++;
        }

        await txRepo.insert(t);
        report.inserted.push(t);
      } catch {
        // One bad message must never stop the batch. Content is intentionally not logged.
        report.errors++;
      }
    }
    flush();
    return report;
  }

  async function patch(tx: Transaction, changes: Partial<Transaction>): Promise<Transaction> {
    const updated = { ...tx, ...changes, updatedAt: Date.now() };
    await txRepo.update(tx.id, { ...changes, updatedAt: updated.updatedAt });
    return updated;
  }

  return {
    ingest,

    async getAll() {
      return txRepo.getAll();
    },

    /**
     * Assigns a category. With `remember`, saves a merchant rule and applies it to
     * other uncategorized transactions from the same original merchant.
     */
    async setCategory(all: Transaction[], id: string, category: string, remember: boolean): Promise<Mutation> {
      const target = all.find(t => t.id === id);
      if (!target) return { before: [], after: [] };
      const key = normalizeMerchantKey(target.originalMerchant);
      const affected = all.filter(
        t => t.id === id || (remember && !t.isCategorized && normalizeMerchantKey(t.originalMerchant) === key),
      );
      const after: Transaction[] = [];
      for (const t of affected) {
        const changes: Partial<Transaction> = { category, isCategorized: true };
        if (category === TRANSFERS && t.type === 'unknown') changes.type = 'transfer';
        if (t.type === 'unknown' && category !== TRANSFERS) changes.type = 'expense';
        after.push(await patch(t, changes));
      }
      if (remember && key) {
        const rule: MerchantRule = { id: generateId(), pattern: key, category, createdAt: Date.now() };
        await catRepo.upsertRule(rule);
      }
      return { before: affected, after };
    },

    async renameMerchant(t: Transaction, name: string): Promise<Mutation> {
      const clean = name.trim().slice(0, 60);
      if (!clean) return { before: [], after: [] };
      return { before: [t], after: [await patch(t, { merchant: clean })] };
    },

    /** Money moved between the user's own accounts: not income, not spending. */
    async markTransfer(t: Transaction): Promise<Mutation> {
      return { before: [t], after: [await patch(t, { type: 'transfer', category: TRANSFERS, isCategorized: true })] };
    },

    /** Manual correction of a mis-parsed direction. */
    async setType(t: Transaction, type: TransactionType): Promise<Mutation> {
      if (type === 'transfer') {
        return { before: [t], after: [await patch(t, { type, category: TRANSFERS, isCategorized: true })] };
      }
      const changes: Partial<Transaction> = { type };
      if (type === 'income' && !t.isCategorized) Object.assign(changes, { category: INCOME, isCategorized: true });
      if (type === 'expense' && (t.category === INCOME || t.category === TRANSFERS)) {
        Object.assign(changes, { category: null, isCategorized: false });
      }
      return { before: [t], after: [await patch(t, changes)] };
    },

    async setExcluded(t: Transaction, excluded: boolean): Promise<Mutation> {
      return { before: [t], after: [await patch(t, { isExcluded: excluded })] };
    },

    async setNotes(t: Transaction, notes: string): Promise<Mutation> {
      return { before: [t], after: [await patch(t, { notes: notes.slice(0, 1000) })] };
    },

    /** Writes back full previous versions (undo). */
    async restore(list: Transaction[]): Promise<void> {
      await txRepo.putMany(list);
    },

    async addCategory(name: string, existing: Category[]): Promise<Category> {
      const clean = name.trim().replace(/\s+/g, ' ').slice(0, 24);
      if (!clean) throw new Error('Category name is required');
      if (existing.some(c => c.name.toLowerCase() === clean.toLowerCase())) throw new Error('That category already exists');
      const custom = existing.filter(c => !c.isSystem).length;
      const c: Category = {
        id: 'c_' + generateId(),
        name: clean,
        icon: 'tag',
        color: customCategoryPastels[custom % customCategoryPastels.length],
        isSystem: false,
        sortOrder: 100 + existing.length,
      };
      await catRepo.add(c);
      return c;
    },

    async removeCategory(c: Category): Promise<void> {
      if (c.isSystem) return;
      await txRepo.uncategorize(c.name, Date.now());
      await catRepo.removeRulesForCategory(c.name);
      await catRepo.remove(c.id);
    },
  };
}

export type TransactionService = ReturnType<typeof createTransactionService>;
