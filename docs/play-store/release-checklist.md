# Google Play release checklist — Money Made

## 0. Keep your upload key safe (do this first)

These two files are **not in git** and exist only on the machine that created them:

- `android/app/moneymade-upload.keystore`
- `android/keystore.properties` (contains the password)

Copy both to a safe place (password manager / encrypted drive / second backup).
With **Play App Signing** (default for new apps) Google holds the real app
signing key; if the upload key is ever lost you can request an upload-key
reset in Play Console, but it takes time — so don't lose it.

## 1. Publish the privacy policy (one time)

GitHub → repository → **Settings → Pages** → *Build and deployment*:
Source **Deploy from a branch**, Branch **dev**, folder **/docs** → Save.
After a minute it is live at:
https://faydevlop.github.io/money-made-sms-expense-tracker/privacy-policy.html

If you edit `src/legal/privacyPolicy.ts`, run `node scripts/build-privacy-page.js`
and commit `docs/`.

## 2. Build the upload bundle

```powershell
cd android
.\gradlew bundleRelease
# → android\app\build\outputs\bundle\release\app-release.aab
```

For every new release, increase `versionCode` (and usually `versionName`) in
`android/app/build.gradle` first — Play rejects a repeated versionCode.

## 3. Play Console setup

1. Create a developer account (one-time US$25) and verify your identity.
2. **Create app** → name *Money Made*, default language, **App**, **Free**.
3. **App content** (Policy and programs):
   - Privacy policy → the GitHub Pages URL above
   - Ads → **No**
   - App access → **All functionality available without special access**
   - Content rating → complete the questionnaire (no violence, gambling, user content, etc.)
   - Target audience → **18 and over**
   - Data safety → see `data-safety.md`
   - Financial features → declare it is a **budgeting / expense tracking** tool
     (no loans, no payments, no banking services)
   - Government app → No · News app → No · Health → none
   - **Sensitive permissions → SMS** → see `sms-permission-declaration.md` (needs the demo video)
4. **Store listing** → text and graphics from `store-listing.md` and `graphics/`.
5. **Testing → Internal testing** → create release → upload `app-release.aab`
   → add yourself as tester → install from the opt-in link and check everything.
6. New personal developer accounts must run a **closed test with at least 12
   testers for 14 days** before production access is granted.
7. **Production** → create release → promote the tested bundle → submit for review.

## 4. Before each release

- [ ] `npm test` and `npx tsc --noEmit` pass
- [ ] `versionCode` bumped
- [ ] Privacy policy still accurate (new data flows? update policy + Data safety first)
- [ ] Tested the release build on a real phone (fresh install: onboarding → permission → dashboard)
