/**
 * End-to-end pipeline test against a real SQLite engine (Node's built-in
 * node:sqlite) using the same migrations and repositories as the app.
 */
import { migrate, Row, SqlExecutor, SqlValue } from '../src/database/database';
import { createCategoryRepository } from '../src/database/categoryRepository';
import { createSettingsRepository } from '../src/database/settingsRepository';
import { createTransactionRepository } from '../src/database/transactionRepository';
import { generateSampleSms } from '../src/services/sampleData';
import { createTransactionService, normalizeSender } from '../src/services/transactionService';
import { NON_TRANSACTION_FIXTURES, NOW, TRANSACTION_FIXTURES } from './fixtures/smsFixtures';

jest.mock('@op-engineering/op-sqlite', () => ({ open: jest.fn() }));

const { DatabaseSync } = require('node:sqlite');

function memoryDb(): SqlExecutor {
  const db = new DatabaseSync(':memory:');
  const exec: SqlExecutor = {
    async query(sql: string, params: SqlValue[] = []) {
      return db.prepare(sql).all(...params) as Row[];
    },
    async run(sql: string, params: SqlValue[] = []) {
      if (params.length) db.prepare(sql).run(...params);
      else db.exec(sql);
    },
    async transaction(fn) {
      db.exec('BEGIN');
      try {
        await fn(exec);
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return exec;
}

async function setup() {
  const db = memoryDb();
  await migrate(db);
  const txRepo = createTransactionRepository(db);
  const catRepo = createCategoryRepository(db);
  const service = createTransactionService({ txRepo, catRepo });
  return { db, txRepo, catRepo, service };
}

describe('database', () => {
  it('migrates, seeds categories and is idempotent', async () => {
    const { db, catRepo } = await setup();
    await migrate(db);
    const cats = await catRepo.getAll();
    expect(cats.map(c => c.name)).toEqual(
      expect.arrayContaining(['Food', 'Shopping', 'Travel', 'Fuel', 'Bills', 'Entertainment', 'Healthcare', 'Rent', 'Education', 'Subscriptions', 'Transfers', 'Other']),
    );
    const v = await db.query('PRAGMA user_version');
    expect(Number(v[0].user_version)).toBe(1);
  });

  it('settings round-trip with defaults', async () => {
    const { db } = await setup();
    const repo = createSettingsRepository(db);
    expect((await repo.load()).trackingEnabled).toBe(false);
    await repo.set('disabledSenders', ['HDFCBK']);
    expect((await repo.load()).disabledSenders).toEqual(['HDFCBK']);
  });
});

describe('ingestion pipeline', () => {
  it('stores transactions, ignores non-transactions, and skips duplicates on re-scan', async () => {
    const { service, txRepo } = await setup();
    const inbox = [...TRANSACTION_FIXTURES.map(f => f.sms), ...NON_TRANSACTION_FIXTURES.map(f => f.sms)];
    const first = await service.ingest(inbox, { now: NOW });
    expect(first.errors).toBe(0);
    expect(first.ignored).toBe(NON_TRANSACTION_FIXTURES.length);
    const stored = await txRepo.getAll();
    expect(stored.length).toBe(first.inserted.length);
    expect(stored.length).toBeGreaterThanOrEqual(TRANSACTION_FIXTURES.length - 2);

    const second = await service.ingest(inbox, { now: NOW });
    expect(second.inserted).toHaveLength(0);
    expect(second.duplicates).toBe(first.inserted.length + first.duplicates);
    expect((await txRepo.getAll()).length).toBe(stored.length);
  });

  it('the same payment reported by two differently-worded SMS is stored once', async () => {
    const { service, txRepo } = await setup();
    const at = new Date(2026, 8, 28, 20, 42).getTime();
    await service.ingest(
      [
        { sender: 'VM-HDFCBK', body: 'Rs.450.00 debited from A/c XX1234 on 28-09-26 to VPA swiggy@icici (UPI Ref No 426123456789). -HDFC Bank', receivedAt: at },
        { sender: 'JM-HDFCBK', body: 'Sent Rs.450.00\nFrom HDFC Bank A/C *1234\nTo SWIGGY\nOn 28/09/26\nRef 426123456789\nNot You?', receivedAt: at + 60_000 },
      ],
      { now: NOW },
    );
    expect(await txRepo.getAll()).toHaveLength(1);
  });

  it('pairs transfers between own accounts', async () => {
    const { service, txRepo } = await setup();
    const at = new Date(2026, 8, 18, 12, 0).getTime();
    await service.ingest(
      [
        { sender: 'VM-HDFCBK', body: 'Rs.5,000.00 debited from A/c XX4821 on 18-09-26 via IMPS to ARJUN K. Ref 426355566677 -HDFC Bank', receivedAt: at },
        { sender: 'VK-SBIINB', body: 'Rs.5,000.00 credited to A/c XX7710 on 18-09-26 by IMPS from ARJUN K. Ref 999355566677 -SBI', receivedAt: at + 90_000 },
      ],
      { now: NOW },
    );
    const all = await txRepo.getAll();
    expect(all).toHaveLength(2);
    expect(all.every(t => t.type === 'transfer')).toBe(true);
  });

  it('respects disabled senders', async () => {
    const { service } = await setup();
    const r = await service.ingest([TRANSACTION_FIXTURES[0].sms], { disabledSenders: ['HDFCBK'], now: NOW });
    expect(r.inserted).toHaveLength(0);
    expect(normalizeSender('VM-HDFCBK')).toBe('HDFCBK');
    expect(normalizeSender('AD-HDFCBK-S')).toBe('HDFCBK');
  });

  it('sample data parses into a realistic dataset with some items needing review', async () => {
    const { service, txRepo } = await setup();
    const sms = generateSampleSms(NOW);
    const r = await service.ingest(sms, { source: 'sample', now: NOW });
    expect(r.errors).toBe(0);
    expect(r.ignored).toBe(0);
    const all = await txRepo.getAll();
    expect(all.length).toBeGreaterThan(250);
    const review = all.filter(t => !t.isCategorized && t.type !== 'income');
    expect(review.map(t => t.merchant).sort()).toEqual(['Bank transfer', 'PAY*RAZORPAY 8839', 'UPI-9876543210@ybl']);
    expect(all.find(t => t.merchant === 'Rahul Sharma')?.category).toBe('Transfers');
    expect(all.filter(t => t.merchant === 'Salary').every(t => t.category === 'Income')).toBe(true);
  });

  it('assigning a category with "remember" creates a rule and applies it to similar items', async () => {
    const { service, catRepo } = await setup();
    const base = { sender: 'VM-HDFCBK', receivedAt: new Date(2026, 8, 20, 10).getTime() };
    const r = await service.ingest(
      [
        { ...base, body: 'Rs.850.00 spent on HDFC Bank Card XX4821 at PAY*RAZORPAY 8839 on 20-09-26. -HDFC Bank' },
        { ...base, receivedAt: base.receivedAt + 86_400_000, body: 'Rs.300.00 spent on HDFC Bank Card XX4821 at PAY*RAZORPAY 8839 on 21-09-26. -HDFC Bank' },
      ],
      { now: NOW },
    );
    const all = r.inserted;
    const m = await service.setCategory(all, all[0].id, 'Shopping', true);
    expect(m.after).toHaveLength(2);
    expect(m.after.every(t => t.category === 'Shopping' && t.isCategorized)).toBe(true);
    expect((await catRepo.getRules())[0]).toMatchObject({ pattern: 'pay razorpay 8839', category: 'Shopping' });

    // Next SMS from the same merchant is categorized automatically.
    const next = await service.ingest(
      [{ ...base, receivedAt: base.receivedAt + 3 * 86_400_000, body: 'Rs.99.00 spent on HDFC Bank Card XX4821 at PAY*RAZORPAY 8839 on 23-09-26. -HDFC Bank' }],
      { now: NOW },
    );
    expect(next.inserted[0].category).toBe('Shopping');
  });

  it('undo restores previous versions', async () => {
    const { service, txRepo } = await setup();
    const r = await service.ingest([TRANSACTION_FIXTURES[0].sms], { now: NOW });
    const t = r.inserted[0];
    const m = await service.setExcluded(t, true);
    expect((await txRepo.getById(t.id))?.isExcluded).toBe(true);
    await service.restore(m.before);
    expect((await txRepo.getById(t.id))?.isExcluded).toBe(false);
  });

  it('removing a custom category uncategorizes its transactions', async () => {
    const { service, catRepo, txRepo } = await setup();
    const c = await service.addCategory('Pets', await catRepo.getAll());
    await expect(service.addCategory('pets', await catRepo.getAll())).rejects.toThrow();
    const r = await service.ingest([TRANSACTION_FIXTURES[0].sms], { now: NOW });
    await service.setCategory(r.inserted, r.inserted[0].id, 'Pets', false);
    await service.removeCategory(c);
    const t = await txRepo.getById(r.inserted[0].id);
    expect(t?.category).toBeNull();
    expect(t?.isCategorized).toBe(false);
  });
});
