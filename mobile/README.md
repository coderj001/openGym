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

Production binaries are built with Expo Application Services (EAS). The Android output is an App Bundle (`.aab`) for Google Play; the iOS output is an archive for App Store Connect. The first two commands require an Expo account and create/link the account-specific EAS project ID; do not commit an ID owned by another account.

```bash
cd mobile
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --platform all --profile production
```

The resulting build links are printed by EAS. Builds bundle the app and its exercise media, so no backend is required after installation. `eas.json` enables EAS-managed build-number increments for both platforms.

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
