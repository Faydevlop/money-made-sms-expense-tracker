import { create } from 'zustand';
import { DEFAULT_SETTINGS, PersistedSettings } from '../database/settingsRepository';
import { SmsPermission } from '../sms/smsReceiver';
import { getDeps } from './transactionStore';

interface SettingsState extends PersistedSettings {
  loaded: boolean;
  /** Runtime only — re-checked on every launch/foreground. */
  permission: SmsPermission | 'unknown';
  scanning: boolean;
  load(): Promise<void>;
  update(patch: Partial<PersistedSettings>): Promise<void>;
  setPermission(p: SmsPermission): void;
  setScanning(v: boolean): void;
  /** Back to first-launch defaults (after the database was erased). */
  resetToDefaults(): void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  loaded: false,
  permission: 'unknown',
  scanning: false,

  async load() {
    const { settingsRepo } = await getDeps();
    const s = await settingsRepo.load();
    set({ ...s, loaded: true });
  },

  async update(patch) {
    set(patch as Partial<SettingsState>);
    const { settingsRepo } = await getDeps();
    for (const key of Object.keys(patch) as (keyof PersistedSettings)[]) {
      await settingsRepo.set(key, get()[key]);
    }
  },

  setPermission: permission => set({ permission }),
  setScanning: scanning => set({ scanning }),
  resetToDefaults: () => set({ ...DEFAULT_SETTINGS }),
}));
