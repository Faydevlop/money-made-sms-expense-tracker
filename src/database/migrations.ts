import { DEFAULT_CATEGORIES } from '../constants/categories';

export interface Migration {
  version: number;
  statements: string[];
  /** Parameterised statements (e.g. seed rows) run after `statements`. */
  seed?: { sql: string; params: (string | number | null)[] }[];
}

/**
 * Append-only list. Never edit a shipped migration — add a new version instead.
 * The applied version is tracked with SQLite's PRAGMA user_version.
 */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        merchant TEXT NOT NULL,
        original_merchant TEXT NOT NULL,
        category TEXT,
        subcategory TEXT,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        payment_method TEXT NOT NULL,
        account TEXT,
        bank TEXT,
        reference_number TEXT,
        description TEXT,
        notes TEXT NOT NULL DEFAULT '',
        original_sms TEXT,
        sms_sender TEXT,
        sms_hash TEXT,
        source TEXT NOT NULL DEFAULT 'sms',
        is_categorized INTEGER NOT NULL DEFAULT 0,
        is_excluded INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      'CREATE INDEX IF NOT EXISTS idx_tx_timestamp ON transactions(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_tx_sms_hash ON transactions(sms_hash)',
      'CREATE INDEX IF NOT EXISTS idx_tx_reference ON transactions(reference_number)',
      'CREATE INDEX IF NOT EXISTS idx_tx_amount_ts ON transactions(amount, timestamp)',
      `CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL UNIQUE,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        is_system INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS merchant_rules (
        id TEXT PRIMARY KEY NOT NULL,
        pattern TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      )`,
    ],
    seed: DEFAULT_CATEGORIES.map((c, i) => ({
      sql: 'INSERT OR IGNORE INTO categories (id, name, icon, color, is_system, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      params: [c.id, c.name, c.icon, c.color, c.isSystem ? 1 : 0, i],
    })),
  },
];

export const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;
