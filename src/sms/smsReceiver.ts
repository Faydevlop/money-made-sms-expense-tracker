import { DeviceEventEmitter, NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { RawSms } from '../types/transaction';

/**
 * Thin wrapper around the native TallySms module
 * (android/app/src/main/java/com/tally/expensetracker/sms).
 * Every call degrades gracefully when the module or permission is unavailable.
 */

export type SmsPermission = 'granted' | 'denied' | 'blocked' | 'unavailable';

interface NativeSms {
  isAvailable(): Promise<boolean>;
  readInbox(sinceMs: number, limit: number): Promise<{ scanned: number; messages: RawSms[] }>;
  getPending(): Promise<RawSms[]>;
  ackPending(ids: string[]): void;
  setTrackingEnabled(enabled: boolean): void;
}

const Native: NativeSms | undefined = Platform.OS === 'android' ? NativeModules.TallySms : undefined;
const EVENT = 'TallySmsReceived';

const PERMS = [PermissionsAndroid.PERMISSIONS.READ_SMS, PermissionsAndroid.PERMISSIONS.RECEIVE_SMS];

export async function isSmsSupported(): Promise<boolean> {
  if (!Native) return false;
  try {
    return await Native.isAvailable();
  } catch {
    return false;
  }
}

export async function checkSmsPermission(): Promise<SmsPermission> {
  if (!(await isSmsSupported())) return 'unavailable';
  try {
    const read = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
    return read ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}

/** Shows the system permission dialog. Callers must explain why first. */
export async function requestSmsPermission(): Promise<SmsPermission> {
  if (!(await isSmsSupported())) return 'unavailable';
  try {
    const res = await PermissionsAndroid.requestMultiple(PERMS);
    const read = res[PermissionsAndroid.PERMISSIONS.READ_SMS];
    if (read === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
    if (read === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) return 'blocked';
    return 'denied';
  } catch {
    return 'unavailable';
  }
}

export async function readInbox(sinceMs: number, limit = 20000): Promise<{ scanned: number; messages: RawSms[] }> {
  if (!Native) return { scanned: 0, messages: [] };
  const res = await Native.readInbox(sinceMs, limit);
  return { scanned: res.scanned, messages: res.messages.map(normalize) };
}

export async function getPendingSms(): Promise<RawSms[]> {
  if (!Native) return [];
  try {
    return (await Native.getPending()).map(normalize);
  } catch {
    return [];
  }
}

export function ackPendingSms(ids: string[]): void {
  if (Native && ids.length) Native.ackPending(ids);
}

export function setNativeTracking(enabled: boolean): void {
  Native?.setTrackingEnabled(enabled);
}

export function onSmsReceived(cb: (sms: RawSms) => void): () => void {
  if (!Native) return () => {};
  const sub = DeviceEventEmitter.addListener(EVENT, (m: RawSms) => cb(normalize(m)));
  return () => sub.remove();
}

function normalize(m: RawSms): RawSms {
  return { id: m.id, sender: m.sender ?? '', body: m.body ?? '', receivedAt: Number(m.receivedAt) || Date.now() };
}
