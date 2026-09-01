# openGym Mobile

Standalone offline-first Expo app for Android and iOS. Workout data stays on the device;
the app has no login, backend, synchronization, telemetry, or runtime network dependency.

All exercise animations and translated instruction packs are bundled with the app for offline
use.

## Quick start

```bash
cd mobile
npm ci
npm test
npm start
```

Use `npm run android` or `npm run ios` to launch a native development build. See
[mobile/README.md](mobile/README.md) for development, release, local data, backups, imports,
and notifications.

## Project layout

- `mobile/` — Expo and React Native application, source, tests, and bundled assets
- `.github/workflows/mobile-release.yml` — Android release workflow

## License

openGym is licensed under the GNU AGPL v3.0. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).
