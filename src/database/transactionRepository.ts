import { Transaction } from '../types/transaction';
import { Row, SqlExecutor, SqlValue } from './database';

const COLUMNS: [keyof Transaction, string][] = [
  ['id', 'id'],
  ['type', 'type'],
  ['amount', 'amount'],
  ['merchant', 'merchant'],
  ['originalMerchant', 'original_merchant'],
  ['category', 'category'],
  ['subcategory', 'subcategory'],
  ['date', 'date'],
  ['time', 'time'],
  ['timestamp', 'timestamp'],
  ['paymentMethod', 'payment_method'],
  ['account', 'account'],
  ['bank', 'bank'],
  ['referenceNumber', 'reference_number'],
  ['description', 'description'],
  ['notes', 'notes'],
  ['originalSms', 'original_sms'],
  ['smsSender', 'sms_sender'],
  ['smsHash', 'sms_hash'],
  ['source', 'source'],
  ['isCategorized', 'is_categorized'],
  ['isExcluded', 'is_excluded'],
  ['createdAt', 'created_at'],
  ['updatedAt', 'updated_at'],
];
const COL = new Map(COLUMNS);
const BOOL_FIELDS = new Set<keyof Transaction>(['isCategorized', 'isExcluded']);

function toSql(field: keyof Transaction, v: unknown): SqlValue {
  if (BOOL_FIELDS.has(field)) return v ? 1 : 0;
  if (v === undefined) return null;
  return v as SqlValue;
}

export function rowToTransaction(r: Row): Transaction {
  const t: Record<string, unknown> = {};
  for (const [field, col] of COLUMNS) {
    const v = r[col];
    t[field] = BOOL_FIELDS.has(field) ? Number(v) === 1 : v ?? null;
  }
  t.amount = Number(t.amount);
  t.timestamp = Number(t.timestamp);
  t.createdAt = Number(t.createdAt);
  t.updatedAt = Number(t.updatedAt);
  t.notes = (t.notes as string) ?? '';
  return t as unknown as Transaction;
}

const INSERT_SQL = `INSERT OR REPLACE INTO transactions (${COLUMNS.map(c => c[1]).join(', ')}) VALUES (${COLUMNS.map(() => '?').join(', ')})`;

export function createTransactionRepository(db: SqlExecutor) {
  return {
    async getAll(): Promise<Transaction[]> {
      const rows = await db.query('SELECT * FROM transactions ORDER BY timestamp DESC');
      return rows.map(rowToTransaction);
    },

    async getById(id: string): Promise<Transaction | null> {
      const rows = await db.query('SELECT * FROM transactions WHERE id = ?', [id]);
      return rows[0] ? rowToTransaction(rows[0]) : null;
    },

    async existsSmsHash(hash: string): Promise<boolean> {
      const rows = await db.query('SELECT 1 AS x FROM transactions WHERE sms_hash = ? LIMIT 1', [hash]);
      return rows.length > 0;
    },

    async findByReference(ref: string): Promise<Transaction[]> {
      const rows = await db.query('SELECT * FROM transactions WHERE reference_number = ?', [ref]);
      return rows.map(rowToTransaction);
    },

    /** Candidates for duplicate / transfer matching around a moment in time. */
    async findNear(timestamp: number, windowMs: number): Promise<Transaction[]> {
      const rows = await db.query('SELECT * FROM transactions WHERE timestamp BETWEEN ? AND ?', [
        timestamp - windowMs,
        timestamp + windowMs,
      ]);
      return rows.map(rowToTransaction);
    },

    async insert(t: Transaction, exec: SqlExecutor = db): Promise<void> {
      await exec.run(INSERT_SQL, COLUMNS.map(([f]) => toSql(f, t[f])));
    },

    /** Upserts full rows — used for undo. */
    async putMany(list: Transaction[]): Promise<void> {
      if (!list.length) return;
      await db.transaction(async tx => {
        for (const t of list) await tx.run(INSERT_SQL, COLUMNS.map(([f]) => toSql(f, t[f])));
      });
    },

    async update(id: string, patch: Partial<Transaction>): Promise<void> {
      const fields = (Object.keys(patch) as (keyof Transaction)[]).filter(f => f !== 'id' && COL.has(f));
      if (!fields.length) return;
      const sets = fields.map(f => `${COL.get(f)} = ?`).join(', ');
      await db.run(`UPDATE transactions SET ${sets} WHERE id = ?`, [...fields.map(f => toSql(f, patch[f])), id]);
    },

    async deleteAll(): Promise<void> {
      await db.run('DELETE FROM transactions');
    },

    async deleteBySource(source: Transaction['source']): Promise<void> {
      await db.run('DELETE FROM transactions WHERE source = ?', [source]);
    },

    /** Re-labels transactions whose category was removed. */
    async uncategorize(category: string, now: number): Promise<void> {
      await db.run('UPDATE transactions SET category = NULL, is_categorized = 0, updated_at = ? WHERE category = ?', [now, category]);
    },
  };
}

export type TransactionRepository = ReturnType<typeof createTransactionRepository>;
