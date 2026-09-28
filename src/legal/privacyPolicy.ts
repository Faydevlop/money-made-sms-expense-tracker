/**
 * Single source of truth for the privacy policy. Rendered in the app
 * (PrivacyPolicyScreen) and published as docs/privacy-policy.html for the
 * Google Play listing (`node scripts/build-privacy-page.js`).
 * Update EFFECTIVE_DATE whenever the text changes.
 */

export const APP_NAME = 'Money Made';
export const DEVELOPER = 'Fayis';
export const CONTACT_EMAIL = 'fayis.connect@gmail.com';
export const EFFECTIVE_DATE = '28 September 2026';
export const PRIVACY_POLICY_URL = 'https://faydevlop.github.io/money-made-sms-expense-tracker/privacy-policy.html';

export interface PolicySection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export const PRIVACY_SUMMARY =
  'Money Made reads bank and UPI transaction SMS on your phone to build your expense dashboard. Everything is processed and stored only on your device. We have no servers, we do not collect or share any of your data, and there are no ads, analytics or trackers.';

export const PRIVACY_SECTIONS: PolicySection[] = [
  {
    title: 'Who we are',
    paragraphs: [
      `${APP_NAME} (“the app”) is a personal expense tracker developed by ${DEVELOPER} (“we”, “us”). This policy explains what information the app accesses, how it is used and the choices you have. It applies to the ${APP_NAME} apps for Android and iOS.`,
    ],
  },
  {
    title: 'Information the app accesses',
    paragraphs: [
      'SMS messages (Android). With your permission, the app reads SMS messages on your device and receives new ones as they arrive, in order to find bank and UPI transaction alerts. Messages that do not contain an amount together with a debit or credit are discarded on the device immediately and are never stored. One-time passwords (OTPs), promotional messages, reminders and personal conversations are ignored.',
      'From each transaction alert, the app extracts and stores:',
    ],
    bullets: [
      'the amount, the type (spent, received or transfer) and the date and time',
      'the merchant or payee name, and the UPI ID if present',
      'the bank name and only the last digits of the account or card number, exactly as they appear in the SMS',
      'the transaction reference number, if present',
      'the text of the transaction SMS itself, so you can check how it was read',
    ],
  },
  {
    title: 'Information you add',
    paragraphs: [
      'Categories you assign, merchant names you edit, notes, custom categories, merchant rules, your name for the greeting and your app settings are stored on your device.',
      'On iPhone, iOS does not allow apps to read SMS. If you set up the optional iOS Shortcuts automation, iOS passes the text of matching messages to the app, where it is processed in the same way.',
    ],
  },
  {
    title: 'How the information is used',
    paragraphs: [
      'The information is used only to provide the app’s features on your device: recording transactions, categorising them, and showing your balances, spending analytics and estimates. It is never used for advertising, profiling, credit decisions or any other purpose.',
    ],
  },
  {
    title: 'Where your data is stored',
    paragraphs: [
      'All data is stored in a private database inside the app on your device. We do not operate servers and you do not need an account. The Android release version of the app does not request internet access, so it cannot send your data anywhere. App data is excluded from Android cloud backups.',
      'SMS content, account numbers, UPI IDs and reference numbers are never written to logs.',
    ],
  },
  {
    title: 'Sharing and disclosure',
    paragraphs: [
      'We do not collect, sell, rent, trade or share your personal or financial data with anyone. The app contains no advertising, analytics, crash-reporting or tracking software.',
      'Data leaves your device only if you choose to export it: “Export CSV” opens your phone’s share sheet and you decide where the file goes. The export does not include SMS text and shows account numbers masked.',
    ],
  },
  {
    title: 'Permissions',
    paragraphs: ['The app asks for the following permissions only after explaining why, and they are optional:'],
    bullets: [
      'Read SMS (READ_SMS): to find transaction alerts already in your inbox.',
      'Receive SMS (RECEIVE_SMS): to record new transaction alerts as they arrive.',
    ],
  },
  {
    title: 'Your choices and deleting your data',
    paragraphs: [
      'You can use the app without SMS access, pause automatic detection, turn off individual bank senders or revoke the SMS permission at any time in Android Settings.',
      'You can delete all transactions, or erase all app data including settings, from Settings → Data management in the app. Uninstalling the app permanently deletes all of its data from your device. Because we hold no copy of your data, deletion is immediate and cannot be undone.',
    ],
  },
  {
    title: 'Security',
    paragraphs: [
      'Your data stays within the app’s private storage, protected by your device’s security (screen lock and encryption). Keep your device locked to protect it.',
    ],
  },
  {
    title: 'Children',
    paragraphs: ['The app is intended for adults managing their own finances and is not directed at children under 18.'],
  },
  {
    title: 'Changes to this policy',
    paragraphs: [
      'If this policy changes, the updated version will be published at the address below and in the app, with a new effective date.',
    ],
  },
  {
    title: 'Contact',
    paragraphs: [`Questions or requests about privacy: ${CONTACT_EMAIL}`],
  },
];
