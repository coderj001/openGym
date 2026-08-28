# openGym mobile

Standalone offline-first Expo app for Android and iOS. Workout data is stored only on the device with AsyncStorage; the app has no authentication, backend, synchronization, telemetry, or runtime network dependency.

All 1,324 exercise animations and translated instruction packs are bundled with the app, so the exercise library and workout flow remain available offline after installation.

## Prerequisites

- Node.js 20 or newer
- npm
- Android Studio for an Android emulator
- macOS with Xcode for an iOS simulator

## Install

From the repository root:

```bash
cd mobile
npm ci
```

No root `.env`, Docker service, API, or frontend build is required.

## Test

```bash
npm test
```

The test suite covers app startup and the shared workout, progression, history, effort, import, and estimated-1RM logic.

## Run during development

Start Expo from `mobile/`:

```bash
npm start
```

Then use the Expo terminal controls, or launch a target directly:

```bash
npm run android
npm run ios       # macOS only
npm run web       # optional browser preview
```

A physical device must be reachable by the development machine while using Expo's development server. This connection is needed only for development; an installed native build works offline.

## Release builds

Production Android APKs are built locally with Gradle on GitHub Actions; no Expo account, EAS project, or Expo access token is used. Pushing a `vMAJOR.MINOR.PATCH` tag runs the mobile tests, creates a signed APK, and attaches it to a GitHub Release. The tag supplies the Android version name and monotonically increasing version code.

Add these repository GitHub Actions secrets before the first release:

- `ANDROID_KEYSTORE_BASE64` — the base64-encoded release keystore
- `ANDROID_KEYSTORE_PASSWORD` — the keystore password
- `ANDROID_KEY_ALIAS` — the signing-key alias
- `ANDROID_KEY_PASSWORD` — the signing-key password

### Create the signing secrets

Install and authenticate the [GitHub CLI](https://cli.github.com/), then create a signing keystore once. Keep the passwords and keystore somewhere safe: losing this key prevents future APKs from updating an installed copy.

```bash
keytool -genkeypair -v -keystore opengym-release.jks -alias opengym -keyalg RSA -keysize 2048 -validity 10000
```

`keytool` prompts for the keystore and key passwords; record both. Upload the keystore and values to the current repository with the GitHub CLI:

```bash
gh auth login
gh secret set ANDROID_KEYSTORE_BASE64 < <(base64 < opengym-release.jks | tr -d '\n')
gh secret set ANDROID_KEYSTORE_PASSWORD
gh secret set ANDROID_KEY_ALIAS --body opengym
gh secret set ANDROID_KEY_PASSWORD
```

The two password commands prompt for their values without placing them in shell history. Do not commit the `.jks` file; it is already ignored. Back it up securely before releasing.

The build generates the native Android project from the tracked Expo configuration, then uses Java, the Android SDK, and Gradle on the runner. Builds bundle the app and its exercise media, so no backend is required after installation.

## Native development builds

Generate and run the native project for the selected platform:

```bash
npx expo run:android
npx expo run:ios   # macOS only
```

These commands generate `android/` or `ios/` inside this directory. Both generated directories are ignored by Git; mobile source, configuration, and assets remain in `mobile/`.

## Local data and backups

The app persists the following data locally across restarts and app updates:

- Routines, plans, weekly schedules, and day overrides
- Active and completed workouts, sets, effort ratings, and progression
- Body weight, goals, history, statistics, and exercise records
- Custom exercises, units, timers, appearance, and reminders

Open **Settings → Data** to:

- Export a complete JSON backup through the native share sheet
- Restore a previously exported openGym JSON backup
- Import workouts from FitNotes, Strong, or Hevy files
- Import body weight from an Apple Health export

Backups are never uploaded by openGym. Store exported files somewhere safe before uninstalling or clearing the app, because either action may remove the device-local database.

## Workout reminders

Enable reminders under **Settings → Notifications**. The app requests notification permission only when reminders are enabled and schedules notifications locally for planned workout days. No push-notification server is used.

## Offline behavior

A production or native development build does not need the repository's backend, web app, Docker services, or internet access. Expo's development server is only part of the development workflow.
