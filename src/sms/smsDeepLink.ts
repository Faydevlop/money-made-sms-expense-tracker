import { RawSms } from '../types/transaction';

/**
 * iOS cannot read SMS. Instead an iOS Shortcuts automation ("When I get a
 * message containing…") opens:
 *
 *   moneymade://sms?text=<URL-encoded message>&sender=<optional sender>
 *
 * and the app runs the text through the same parser as Android SMS.
 */

export const SMS_LINK_PREFIX = 'moneymade://sms';
/** Real bank SMS are short; anything longer is not a transaction alert. */
const MAX_TEXT = 2000;

function decode(v: string): string {
  try {
    return decodeURIComponent(v.replace(/\+/g, ' '));
  } catch {
    return v;
  }
}

function query(url: string): Record<string, string> {
  const q = url.indexOf('?');
  if (q < 0) return {};
  const out: Record<string, string> = {};
  for (const part of url.slice(q + 1).split('&')) {
    if (!part) continue;
    const eq = part.indexOf('=');
    const k = decode(eq < 0 ? part : part.slice(0, eq)).toLowerCase();
    out[k] = eq < 0 ? '' : decode(part.slice(eq + 1));
  }
  return out;
}

/** Returns the SMS carried by a moneymade://sms link, or null for any other URL. */
export function parseSmsDeepLink(url: string | null | undefined, now: number = Date.now()): RawSms | null {
  if (!url) return null;
  const lower = url.toLowerCase();
  if (!lower.startsWith(SMS_LINK_PREFIX) || /^moneymade:\/\/sms[^?/]/.test(lower)) return null;
  const p = query(url);
  const text = (p.text ?? p.body ?? p.message ?? '').trim();
  if (!text || text.length > MAX_TEXT) return null;
  const sender = (p.sender ?? p.from ?? '').trim().slice(0, 40);
  return { sender, body: text, receivedAt: now };
}
