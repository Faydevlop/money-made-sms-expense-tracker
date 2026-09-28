import { SqlExecutor } from './database';

/** Typed key/value settings stored as JSON in the settings table. */
export interface PersistedSettings {
  onboardingDone: boolean;
  trackingEnabled: boolean;
  userName: string;
  /** Normalized sender ids (e.g. "HDFCBK") the user turned off. */
  disabledSenders: string[];
  /** Epoch ms of the newest SMS already scanned from the inbox. */
  lastScanAt: number;
}

export const DEFAULT_SETTINGS: PersistedSettings = {
  onboardingDone: false,
  trackingEnabled: false,
  userName: '',
  disabledSenders: [],
  lastScanAt: 0,
};

export function createSettingsRepository(db: SqlExecutor) {
  return {
    async load(): Promise<PersistedSettings> {
      const rows = await db.query('SELECT key, value FROM settings');
      const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
      for (const r of rows) {
        const key = String(r.key);
        if (!(key in DEFAULT_SETTINGS)) continue;
        try {
          out[key] = JSON.parse(String(r.value));
        } catch {
          // Corrupt value: keep the default.
        }
      }
      return out as unknown as PersistedSettings;
    },

    async set<K extends keyof PersistedSettings>(key: K, value: PersistedSettings[K]): Promise<void> {
      await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, JSON.stringify(value)]);
    },

    async clear(): Promise<void> {
      await db.run('DELETE FROM settings');
    },
  };
}

export type SettingsRepository = ReturnType<typeof createSettingsRepository>;
