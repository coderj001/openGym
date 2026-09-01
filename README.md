<p align="center">
  <img src="mobile/assets/icon.png" width="120" alt="openGym app icon">
</p>

<h1 align="center">openGym</h1>

<p align="center">
  Offline-first workout tracking for Android and iOS.
</p>

<p align="center">
  <a href="https://github.com/coderj001/openGym/actions/workflows/mobile-ci.yml"><img src="https://github.com/coderj001/openGym/actions/workflows/mobile-ci.yml/badge.svg" alt="Mobile CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" alt="AGPL v3.0 license"></a>
  <img src="https://img.shields.io/badge/platform-iOS%20%7C%20Android-4630EB.svg" alt="iOS and Android">
  <img src="https://img.shields.io/badge/data-local%20only-2E7D32.svg" alt="Local data only">
</p>

## Train. Track. Own your data. 🏋️

openGym is standalone Expo app for planning routines, logging workouts, tracking progress, and
managing body weight. It works fully offline after installation.

- 📴 **Offline first** — no backend, account, sync, telemetry, or runtime network dependency.
- 🔒 **Private by default** — workout data remains on device.
- 📈 **Built for progression** — routines, sets, effort, records, history, and statistics.
- ⏱️ **Workout-ready** — rest timers, warm-up flow, supersets, exercise media, and reminders.
- 💾 **Portable data** — import supported workout exports; back up and restore locally.
- 🌍 **Accessible anywhere** — dark mode, localization, readable touch targets, and native UI.

## Quick start 🚀

```bash
cd mobile
npm ci
npm test -- --runInBand
npm start
```

Use `npm run android` or `npm run ios` to launch a native development build. See
[mobile/README.md](mobile/README.md) for prerequisites, native builds, local backups, imports,
notifications, and release signing.

## Project layout 🗂️

- [`mobile/`](mobile/) — Expo app, source, tests, and bundled offline assets
- [`.github/workflows/mobile-ci.yml`](.github/workflows/mobile-ci.yml) — pull-request and main
  branch tests
- [`.github/workflows/mobile-release.yml`](.github/workflows/mobile-release.yml) — signed Android
  APK release workflow

## Release a version 📦

After configuring Android signing secrets described in [mobile/README.md](mobile/README.md), push
an annotated semantic-version tag. Release workflow runs tests, builds a signed APK, and
creates a GitHub Release.

```bash
git tag -a v1.0.0 -m "v1.0.0"
git push origin v1.0.0
```

## Contributing and security 🤝

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Report suspected
vulnerabilities privately under [SECURITY.md](SECURITY.md); never open a public security issue.

## License 📜

openGym is licensed under GNU AGPL v3.0. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md) for
license and third-party attribution details.
