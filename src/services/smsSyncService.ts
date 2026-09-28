import {
  ackPendingSms,
  getPendingSms,
  onSmsReceived,
  readInbox,
} from '../sms/smsReceiver';
import { RawSms } from '../types/transaction';
import { IngestReport } from './transactionService';

/** How far back the first import (and a full rescan) looks. */
export const HISTORY_MS = 365 * 86_400_000;
/** Overlap on incremental scans so late-delivered SMS are not missed (duplicates are skipped). */
const OVERLAP_MS = 2 * 86_400_000;

export interface SyncResult extends IngestReport {
  /** Newest SMS timestamp seen, for the next incremental scan. */
  newestAt: number;
}

type Ingest = (messages: RawSms[]) => Promise<IngestReport>;

/** Imports inbox SMS since the last scan (or the last 12 months on a full scan). */
export async function syncInbox(ingest: Ingest, lastScanAt: number, full: boolean, now = Date.now()): Promise<SyncResult> {
  const since = full || !lastScanAt ? now - HISTORY_MS : Math.max(now - HISTORY_MS, lastScanAt - OVERLAP_MS);
  const { scanned, messages } = await readInbox(since);
  const report = await ingest(messages);
  const newestAt = messages.reduce((m, s) => Math.max(m, s.receivedAt), lastScanAt || 0);
  // `scanned` counts every inbox message read, not just those passing the native pre-filter.
  return { ...report, scanned, newestAt };
}

/** Processes SMS queued by the native receiver while the app was closed. */
export async function processPending(ingest: Ingest): Promise<IngestReport | null> {
  const pending = await getPendingSms();
  if (!pending.length) return null;
  const report = await ingest(pending);
  ackPendingSms(pending.map(p => p.id).filter((x): x is string => !!x));
  return report;
}

/** Live listener while the app is running. The message is acknowledged once stored. */
export function listenForSms(ingest: Ingest, onReport: (r: IngestReport) => void): () => void {
  return onSmsReceived(async sms => {
    try {
      const r = await ingest([sms]);
      if (sms.id) ackPendingSms([sms.id]);
      onReport(r);
    } catch {
      // Left in the native queue; retried on next foreground.
    }
  });
}
