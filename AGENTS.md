# AGENTS.md

## Scope

This repository includes an offline-first mobile app in `/mobile`.

Mobile app requirements:

- Use Expo with React Native.
- Keep all mobile-specific files, configuration, assets, and code inside `/mobile`.
- Match web app UI, behavior, terminology, workout flow, and feature set wherever the platform allows.
- Track workouts, routines, sets, progress, body weight, settings, and history locally on the device.
- Work fully offline after installation.
- Do not depend on the backend, API, Docker services, network, or external services at runtime.
- Do not add login, signup, passkeys, profiles, sessions, or account management.
- Do not send workout or user data to a server.

## Data and storage

- Persist mobile data locally using an Expo-compatible storage solution.
- Preserve user data across app restarts and updates.
- Keep mobile data schema separate from server synchronization concerns.
- Import and export user data locally where equivalent web functionality exists.

## Architecture

- Prefer reusable pure workout and progression logic from the existing frontend when it has no browser or server dependencies.
- Do not import browser-only modules, API clients, WebAuthn code, cookies, or server code into `/mobile`.
- Keep platform-specific implementations inside `/mobile`.
- Avoid changes outside `/mobile` unless required to share dependency-free logic or documentation.

## UI

- Reproduce web functionality and visual language in native components.
- Use Expo and React Native primitives instead of DOM elements.
- Preserve accessible labels, readable touch targets, dark mode, accent colors, localization, exercise media, timers, and workout state.
- Replace browser-only features with native equivalents or omit them only when the platform cannot support them offline.

## Validation

From `/mobile`, run the applicable checks before considering mobile work complete:

```bash
npm test
npx expo start
```

For native builds, use the project’s documented Expo or EAS commands. Verify offline behavior, app restart persistence, workout logging, timers, progression, import/export, and navigation on the target platform.

## Change boundaries

- Do not add backend endpoints or API calls for mobile features.
- Do not add authentication flows for the mobile app.
- Do not move mobile files into `frontend/`, `api/`, or `web/`.
- Match existing repository style and keep changes focused on the requested mobile functionality.
