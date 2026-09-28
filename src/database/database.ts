import { open } from '@op-engineering/op-sqlite';
import { MIGRATIONS } from './migrations';

export type SqlValue = string | number | null;
export type Row = Record<string, unknown>;

/**
 * Minimal SQL surface the repositories depend on. Keeping it this small makes
 * it easy to swap the driver or back it with an in-memory DB in tests.
 */
export interface SqlExecutor {
  query(sql: string, params?: SqlValue[]): Promise<Row[]>;
  run(sql: string, params?: SqlValue[]): Promise<void>;
  transaction(fn: (tx: SqlExecutor) => Promise<void>): Promise<void>;
}

export class DatabaseError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'DatabaseError';
  }
}

function wrap(db: ReturnType<typeof open>): SqlExecutor {
  const exec: SqlExecutor = {
    async query(sql, params = []) {
      const res = await db.execute(sql, params);
      return (res.rows ?? []) as Row[];
    },
    async run(sql, params = []) {
      await db.execute(sql, params);
    },
    async transaction(fn) {
      await db.transaction(async tx => {
        await fn({
          async query(sql, params = []) {
            const res = await tx.execute(sql, params);
            return (res.rows ?? []) as Row[];
          },
          async run(sql, params = []) {
            await tx.execute(sql, params);
          },
          transaction: () => Promise.reject(new DatabaseError('Nested transactions are not supported')),
        });
      });
    },
  };
  return exec;
}

export async function migrate(db: SqlExecutor): Promise<void> {
  const rows = await db.query('PRAGMA user_version');
  const current = Number(rows[0]?.user_version ?? 0);
  for (const m of MIGRATIONS) {
    if (m.version <= current) continue;
    await db.transaction(async tx => {
      for (const s of m.statements) await tx.run(s);
      for (const s of m.seed ?? []) await tx.run(s.sql, s.params);
    });
    // PRAGMA cannot be parameterised; version is a trusted integer constant.
    await db.run(`PRAGMA user_version = ${Math.trunc(m.version)}`);
  }
}

let instance: SqlExecutor | null = null;
let opening: Promise<SqlExecutor> | null = null;

/** Opens (once) the on-device database and applies pending migrations. */
export function getDatabase(): Promise<SqlExecutor> {
  if (instance) return Promise.resolve(instance);
  if (!opening) {
    opening = (async () => {
      try {
        const db = wrap(open({ name: 'moneymade.sqlite' }));
        await db.run('PRAGMA journal_mode = WAL');
        await migrate(db);
        instance = db;
        return db;
      } catch (e) {
        opening = null;
        throw new DatabaseError('Could not open the local database', e);
      }
    })();
  }
  return opening;
}
