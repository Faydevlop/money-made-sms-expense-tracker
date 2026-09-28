import { parseSmsDeepLink } from '../src/sms/smsDeepLink';
import { extractTransaction } from '../src/sms/transactionExtractor';
import { NOW } from './fixtures/smsFixtures';

const SMS = 'Rs.450.00 debited from A/c XX1234 on 28-09-26 to VPA swiggy@icici (UPI Ref No 426123456789). -HDFC Bank';

describe('iOS Shortcuts deep link', () => {
  it('decodes the message and optional sender', () => {
    const url = `moneymade://sms?text=${encodeURIComponent(SMS)}&sender=VM-HDFCBK`;
    expect(parseSmsDeepLink(url, NOW)).toEqual({ sender: 'VM-HDFCBK', body: SMS, receivedAt: NOW });
  });

  it('accepts body/message aliases, "+" spaces and missing sender', () => {
    expect(parseSmsDeepLink('moneymade://sms?body=Rs+450+debited', NOW)?.body).toBe('Rs 450 debited');
    expect(parseSmsDeepLink('moneymade://sms/?message=hello', NOW)?.sender).toBe('');
  });

  it('feeds the normal SMS pipeline', () => {
    const raw = parseSmsDeepLink(`moneymade://sms?text=${encodeURIComponent(SMS)}`, NOW)!;
    const r = extractTransaction(raw);
    expect(r.ok && r.draft.merchant).toBe('Swiggy');
    expect(r.ok && r.draft.bank).toBe('HDFC Bank');
  });

  it('rejects other links, empty or oversized text, and malformed encoding safely', () => {
    expect(parseSmsDeepLink('https://example.com/?text=x')).toBeNull();
    expect(parseSmsDeepLink('moneymade://settings?text=x')).toBeNull();
    expect(parseSmsDeepLink('moneymade://smsx?text=x')).toBeNull();
    expect(parseSmsDeepLink('moneymade://sms?text=')).toBeNull();
    expect(parseSmsDeepLink(`moneymade://sms?text=${'a'.repeat(2001)}`)).toBeNull();
    expect(parseSmsDeepLink('moneymade://sms?text=%E0%A4%A')?.body).toBe('%E0%A4%A');
    expect(parseSmsDeepLink(null)).toBeNull();
  });
});
