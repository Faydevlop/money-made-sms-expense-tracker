import { useEffect } from 'react';
import { AppState } from 'react-native';
import { listenForSms, processPending, syncInbox, SyncResult } from '../services/smsSyncService';
import { checkSmsPermission, setNativeTracking } from '../sms/smsReceiver';
import { useSettingsStore } from '../store/settingsStore';
import { useTransactionStore } from '../store/transactionStore';
import { useUiStore } from '../store/uiStore';
import { RawSms } from '../types/transaction';

function ingest(messages: RawSms[]) {
  const { disabledSenders } = useSettingsStore.getState();
  return useTransactionStore.getState().ingest(messages, { disabledSenders });
}

/**
 * Scans the SMS inbox. `full` re-reads the last 12 months (duplicates are skipped);
 * otherwise only messages since the last scan are read.
 */
let activeScan: Promise<SyncResult> | null = null;

export async function runInboxScan(full: boolean): Promise<SyncResult> {
  // One scan at a time; a caller arriving mid-scan waits and then runs its own,
  // so a full scan requested during an incremental one is never skipped.
  while (activeScan) await activeScan.catch(() => undefined);
  const settings = useSettingsStore.getState();
  settings.setScanning(true);
  activeScan = (async () => {
    const lastScanAt = useSettingsStore.getState().lastScanAt;
    const result = await syncInbox(ingest, lastScanAt, full);
    await useSettingsStore.getState().update({ lastScanAt: Math.max(result.newestAt, lastScanAt) });
    return result;
  })();
  try {
    return await activeScan;
  } finally {
    activeScan = null;
    useSettingsStore.getState().setScanning(false);
  }
}

async function refresh() {
  const settings = useSettingsStore.getState();
  const permission = await checkSmsPermission();
  settings.setPermission(permission);
  setNativeTracking(settings.trackingEnabled && permission === 'granted');
  if (!settings.trackingEnabled || permission !== 'granted') return;
  try {
    await processPending(ingest);
    await runInboxScan(false);
  } catch {
    // Non-fatal: the next foreground retries. Nothing sensitive is logged.
  }
}

/** Keeps SMS tracking in sync with permission, settings and app foreground state. */
export function useSmsTracking(ready: boolean) {
  const trackingEnabled = useSettingsStore(s => s.trackingEnabled);
  const permission = useSettingsStore(s => s.permission);

  useEffect(() => {
    if (!ready) return;
    refresh();
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [ready, trackingEnabled]);

  useEffect(() => {
    if (!ready || !trackingEnabled || permission !== 'granted') return;
    return listenForSms(ingest, report => {
      const t = report.inserted[report.inserted.length - 1];
      if (t) useUiStore.getState().showToast(`New transaction · ${t.merchant}`);
    });
  }, [ready, trackingEnabled, permission]);
}
