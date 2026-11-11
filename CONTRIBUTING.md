# Contributing to FolderPls

Thanks for helping. FolderPls is a free, local-first app with no accounts and no database (see [README.md](README.md)). Before you start anything big, open an issue so we can talk it through first.

## Setup

Follow "Run your own instance" in the README. Then turn on the commit hook, which scans staged changes for secrets:

```bash
git config core.hooksPath .githooks
```

The hook uses [gitleaks](https://github.com/gitleaks/gitleaks) if it is installed and falls back to a Node script if it is not.

## Checks

Run these before you open a pull request:

```bash
npm run lint
```

```bash
npm test
```

```bash
npm run build
```

The tests simulate the Drive API. If you change the Drive connection, the picker or the backup, also try it with a real Google account and say so in the pull request.

## Project rules

**Say only what the code does.** Text users see must match real behavior. `tests/unit/claim-scan.test.ts` fails the test suite on known false or unproven claims in the interface. If you add a claim, make sure the code backs it up. If the behavior changes, change the words in the same pull request.

**Stay on `drive.file`.** New features have to work with files the user picked or the app created. Pull requests that request a broader Drive scope will not be accepted, because a public app using one needs Google's restricted-scope verification.

**Keep user data out of servers.** New features should keep data in the browser or in the user's own Drive. Do not add server-side storage of user data.

**Translate both ways.** User-facing strings go in `lib/i18n/i18n.ts`, in both Turkish and English.

**Match the code around you.** Follow the naming, comment density and idiom of the file you are in. Existing comments may be in Turkish. Please write new ones in English.

**Never commit secrets.** Real values belong in `.env.local`, which git ignores. When you add an environment variable, add its name to `.env.example` with an empty value and a short comment.

## Pull requests

- Keep each pull request to one change.
- Add or update tests for behavior changes. Tests live in `tests/unit/` and run on Vitest.
- Commit subjects follow `type(scope): summary`, for example `fix(search): keep folded matches in suggestions`.
- Describe what you tested, including anything you could not test.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
