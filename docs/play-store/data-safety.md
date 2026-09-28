# Data safety form — suggested answers

**Play Console → Policy and programs → App content → Data safety.**

Google defines *collected* as data **transmitted off the device**. Money Made
processes and stores everything on the device only, has no servers and (in the
release build) does not even hold the INTERNET permission, so it neither
collects nor shares user data in Google's sense.

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **No** |
| Is all of the user data collected by your app encrypted in transit? | Not applicable (no data leaves the device) |
| Do you provide a way for users to request that their data is deleted? | **Yes** — in-app: *Settings → Data management → Delete all transactions / Erase all app data*; uninstalling also deletes everything |

> Declaring "No data collected" is still consistent with using the SMS
> permission: the permission itself is reviewed separately through the
> **Permissions Declaration Form** (see `sms-permission-declaration.md`).

## Evidence you can point to if Google asks

- `android/app/src/main/AndroidManifest.xml` — only `READ_SMS` and `RECEIVE_SMS`; `INTERNET` exists only in the debug manifest.
- `android:allowBackup="false"` — app data is excluded from cloud backups.
- No third-party SDKs for ads, analytics or crash reporting (`package.json`).
- Privacy policy: https://faydevlop.github.io/money-made-sms-expense-tracker/privacy-policy.html

If you later add anything that sends data off the device (cloud backup,
crash reporting, analytics), this form and the privacy policy must be updated
**before** that release.
