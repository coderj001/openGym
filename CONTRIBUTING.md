# Contributing to openGym

Thanks for improving openGym.

## Before opening a pull request

- Search existing issues before reporting a bug or proposing a feature.
- Keep each pull request focused on one user-visible fix or change.
- Do not add network calls, analytics, accounts, or backend dependencies to the mobile app.
- Do not commit secrets, signing keys, generated native projects, or device data.

## Development

```bash
cd mobile
npm ci
npm test -- --runInBand
npm start
```

Use `npm run android` or `npm run ios` for a native development build. See
[mobile/README.md](mobile/README.md) for platform prerequisites and release details.

## Pull requests

Describe the problem, solution, and validation performed. Include screenshots or a short
recording for visible UI changes. Add or update a focused test for non-trivial behavior.

By contributing, you agree that your contributions are licensed under the
[GNU AGPL v3.0](LICENSE).
