# SMS permission declaration

Google Play restricts `READ_SMS` and `RECEIVE_SMS`. Apps that are not the
default SMS app must fit an approved exception and submit the **Permissions
Declaration Form**: *Play Console → App content → Sensitive permissions and
APIs*. Check the current policy before submitting:
https://support.google.com/googleplay/android-developer/answer/10208820
(“Use of SMS or Call Log permission groups”).

## What to select

| Field | Value |
|---|---|
| Core functionality | **SMS-based money management** (apps that track and manage budget-related SMS) |
| Permissions | `READ_SMS`, `RECEIVE_SMS` |
| Is this the app’s core functionality? | Yes — the app has no purpose without reading transaction SMS |

## Description (paste and adjust)

```
Money Made is a personal expense tracker. Its core feature is automatically
recording the user's income and expenses from the transaction alert SMS that
banks and UPI apps send (e.g. "Rs.450 debited from A/c XX1234 to VPA
swiggy@icici").

READ_SMS is used once, after the user opts in, to import existing transaction
alerts from the inbox (last 12 months) so the dashboard is complete.
RECEIVE_SMS is used to record new transaction alerts as they arrive.

Messages without an amount and a debit/credit keyword are discarded on the
device immediately; OTPs, promotions, reminders and personal messages are
ignored. All processing and storage happen on the device only: the app has
no servers, no account, no analytics or ads, and the release build does not
request the INTERNET permission, so SMS data cannot leave the device.

Before the system permission dialog, the app shows a prominent in-app
disclosure explaining what SMS data is used and why, with a link to the
privacy policy. Users can decline and still use the app, pause detection,
disable individual senders, and delete all data in the app.
```

## Demo video (required — upload to YouTube as *Unlisted*, paste the link)

Record the screen of a real phone (≈ 60–90 s):

1. Fresh install → onboarding screen: pause on the disclosure text and the
   consent line with the **Privacy Policy** link; tap the link to show it.
2. Go back, tap **Allow SMS access** → the Android permission dialog → **Allow**.
3. “Reading transaction SMS…” → **You’re all set** summary → dashboard filled
   with transactions from the inbox.
4. Receive a new bank SMS (or show one arriving) → it appears instantly.
5. Open a transaction → show the **Original SMS** card (what was read and why).
6. *Settings → Transaction detection* (pause / per-sender switches) and
   *Settings → Data management → Erase all app data*.

Tip: use a phone that has real bank SMS, or send yourself test messages in the
same format (from another phone) before recording.
