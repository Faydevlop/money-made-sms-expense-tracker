# Money Made — SMS expense tracker (React Native, Android & iOS)

Money Made reads bank and UPI transaction SMS **on the device**, turns them into categorized
transactions in a local SQLite database, and shows monthly/weekly/daily spending analytics.
No backend, no account, no network calls. Release builds do not even request the
`INTERNET` permission.

The UI implements the Claude Design project *Expense Tracker v2*.

## Requirements

- Node 22.11+ (tested with Node 24)
- JDK 17 (`JAVA_HOME` must point to it — Gradle does not run on newer JDKs)
- Android SDK with platform 36/37, build-tools 36+, NDK 27.1 (Gradle installs missing SDK parts)
- An Android device with USB debugging, or an emulator

## Run

```bash
npm install
npx react-native start            # Metro
npx react-native run-android      # in a second terminal, with a device/emulator connected
```

## Build and install a debug APK

```bash
cd android
gradlew assembleDebug             # ./gradlew on macOS/Linux
# → android/app/build/outputs/apk/debug/app-debug.apk

gradlew installDebug              # installs on the connected device
```

The debug APK embeds the JS bundle (`debuggableVariants = []` in `android/app/build.gradle`),
so it runs without Metro. When Metro is running, it loads from Metro instead.

To build faster for one device type: `gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a`.

## iOS (build on a Mac)

iOS apps cannot read SMS, so on iPhone an **iOS Shortcuts automation** forwards each
bank SMS to the app through the link `moneymade://sms?text=…`. The app parses it with the
same engine as Android (see *Settings → Transaction detection → Setup guide* in the app).

### One-time Mac setup

1. Install **Xcode** from the App Store, open it once and accept the licence.
2. Install Node 22+ and CocoaPods: `brew install node cocoapods`
3. In Xcode → Settings → Accounts, add your Apple ID (a free account works).

### Build and install on your iPhone

```bash
git clone -b dev https://github.com/Faydevlop/money-made-sms-expense-tracker.git
cd money-made-sms-expense-tracker
npm install
cd ios && pod install && cd ..
open ios/MoneyMade.xcworkspace        # the .xcworkspace, not the .xcodeproj
```

In Xcode:

1. Select the **MoneyMade** target → **Signing & Capabilities** → Team: your *Personal Team*.
   If Xcode says the bundle identifier is taken, change `com.faydevlop.moneymade` to
   something unique (e.g. `com.yourname.moneymade`).
2. **Product → Scheme → Edit Scheme… → Run → Build Configuration: Release**
   (the JS is bundled into the app, so it runs without Metro).
3. Plug in the iPhone, pick it as the run destination, press **Run** (⌘R).
4. First time only, on the iPhone: enable **Settings → Privacy & Security → Developer Mode**,
   and trust your developer profile under **Settings → General → VPN & Device Management**.

With a free Apple ID the app stays installed for **7 days**; run it from Xcode again to renew.
A paid Apple Developer account removes that limit and enables TestFlight.

For development with fast refresh instead: keep the scheme on **Debug**, run `npm start` on the
Mac, and have the iPhone on the same Wi-Fi.

### Automatic tracking on iPhone (Shortcuts)

Open the app → *Settings → Transaction detection → Setup guide*. In short:

1. Shortcuts → Automation → New Automation → **Message**, *Message Contains* `Rs`,
   **Run Immediately** (Notify When Run off) → New Blank Automation.
2. Action **URL Encode** → input *Shortcut Input* → *Content*.
3. Action **Open URLs** → `moneymade://sms?text=` followed by the *URL Encoded Text* variable.
4. Repeat with *Message Contains* `INR`.

### CI

`.github/workflows/ios-build.yml` compiles the iOS app on a GitHub macOS runner on every push
(unsigned simulator build), so iOS build errors show up without a Mac.

## Tests

```bash
npm test          # parser, categorization, duplicates, filters, analytics, SQLite pipeline
npx tsc --noEmit  # type check
```

`__tests__/ingestion.test.ts` runs the real migrations, repositories and ingestion pipeline
against Node's built-in `node:sqlite`.

## Trying it without bank SMS (debug builds only)

In debug builds, Settings → Data management → **Load sample data** loads 12 months of
realistic bank SMS through the same parser, categorizer and duplicate detection as real
messages. **Remove sample data** deletes them again. Release builds only show real data.

## Google Play release

Package: `com.faydevlop.moneymade`. Release builds are signed with the upload key from
`android/keystore.properties` + `android/app/moneymade-upload.keystore` (both git-ignored — back
them up). Without those files, release builds fall back to the debug key (local testing only).

```powershell
cd android
.\gradlew bundleRelease     # → android/app/build/outputs/bundle/release/app-release.aab (upload this)
.\gradlew assembleRelease   # → android/app/build/outputs/apk/release/app-release.apk (sideload)
```

Everything needed for Play Console — store listing, graphics, Data safety answers, the SMS
permission declaration and a step-by-step checklist — is in [`docs/play-store/`](docs/play-store/).
The privacy policy lives in `src/legal/privacyPolicy.ts` (shown in the app) and is published from
`docs/privacy-policy.html` via GitHub Pages (`node scripts/build-privacy-page.js` regenerates it).

## Motion

`src/components/motion.tsx` holds the shared motion primitives (`FadeIn`, `ScalePressable`,
`useGrow`, `useCountUp`, `EntranceOnFocus`). All of them animate transform/opacity on the
native driver and respect the system "Remove animations" setting. The tab bar
(`src/navigation/TabBar.tsx`) precomputes the layout for each active tab and interpolates
between them natively, so it stays smooth while the next screen mounts.

## Architecture

```
SMS (native BroadcastReceiver + inbox reader, Kotlin)
  → sms/smsParser        classify (OTP/promo/reminder/failed rejected) + extract fields
  → sms/smsPatterns      bank-specific layouts, then generic UPI / debit / credit fallbacks
  → sms/transactionExtractor   normalize merchant, type, timestamp; categorize
  → services/duplicateDetection   reference no. / same SMS / amount+account+time window
  → services/transactionService   store, pair self-transfers, user edits (with undo)
  → database/*           SQLite (op-sqlite) with versioned migrations
  → store/*              zustand: data, persisted settings, UI state
  → services/analyticsService    totals, categories, trends, estimate (pure functions)
  → screens/, components/
```

- **Native module** (`android/app/src/main/java/com/tally/expensetracker/sms`):
  `SmsReceiver` queues incoming SMS in private storage (so messages that arrive while the app
  is closed are processed on next open) and forwards them live when the app is running;
  `SmsModule.readInbox` imports history. A native pre-filter drops messages without an
  amount/debit/credit before they reach JS.
- **Extending sources**: anything that produces a `RawSms` (or a `TransactionDraft`) can use the
  same pipeline — bank APIs, Account Aggregator or manual entry plug in at `transactionService`.
- **Categorization** is isolated behind `CategorizationEngine`
  (`services/categorizationService.ts`); call `setCategorizationEngine()` to swap in an
  ML/AI engine later. User "Always use this" choices become merchant rules and take priority.

### Adding a bank SMS format

1. Add a fixture to `__tests__/fixtures/smsFixtures.ts` with the expected fields.
2. Add a `SmsPattern` to `src/sms/smsPatterns/bankPatterns.ts` and list it in `bankPatterns`.
3. `npm test`.

## Privacy

- SMS content, account numbers, UPI IDs and references are never logged.
- Only the last digits of accounts/cards are stored and shown masked (`XXXX1234`).
- CSV export (Settings → Data management) excludes SMS text.
- Personal messages are filtered natively and never reach the JS layer.

## Notes

- Reading SMS (`READ_SMS`/`RECEIVE_SMS`) is restricted on Google Play to default SMS apps
  and approved use cases; this build is intended for personal/sideloaded use.
