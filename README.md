# Money Made — SMS expense tracker (React Native, Android)

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

## Production APK

```powershell
cd android
.\gradlew assembleRelease "-PreactNativeArchitectures=arm64-v8a"
# → android/app/build/outputs/apk/release/app-release.apk
```

Release builds are currently signed with the debug keystore (fine for sideloading).

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
