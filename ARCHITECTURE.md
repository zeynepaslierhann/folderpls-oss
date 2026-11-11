# Architecture

FolderPls is a Next.js app that runs almost entirely in the browser. It has no accounts and no database.

## Data flow

- The browser talks to Google directly. Google Identity Services issues a short-lived access token for the `drive.file` scope (`lib/google-drive/drive-oauth-client.ts`). There is no refresh token and no client secret.
- Files are selected with the Google Picker (`lib/google-drive/drive-picker.ts`) and read through the Drive REST API (`lib/google-drive/api/`).
- Labels, properties, notes, links and collections go through the `LabelStore` interface and are saved in IndexedDB (`lib/storage/`).
- Backups are JSON snapshots. Export and import work on a local file. Sync with Drive merges with a visible `folderpls-tags.json` file in the user's Drive (`lib/storage/drive-backup.ts`, `lib/storage/merge.ts`).

## Main areas

| Path | Role |
|---|---|
| `app/(dashboard)/dashboard/google-drive/page.tsx` | The dashboard |
| `app/(marketing)/` | Public pages, blog and legal pages |
| `app/api/csp-report/route.ts` | The only API route. It writes a short summary of CSP violations to the server log |
| `components/dashboard/` | Dashboard UI |
| `lib/storage/` | Label store, snapshots, merge and Drive backup |
| `lib/google-drive/` | Drive API, Picker and token flow |
| `lib/search/`, `lib/graph/` | Client-side search engine and graph model |
| `lib/i18n/` | Turkish and English strings |
| `lib/legal/` | Privacy policy and terms template |
| `lib/monitoring/` | Optional Sentry error reporting, off unless a DSN is set |
| `next.config.ts` | Security headers other than the CSP |
| `proxy.ts`, `lib/security/csp.ts` | Per-request nonce and the Content-Security-Policy. It is enforced unless `CSP_REPORT_ONLY=1` |

## Design limits

- Only the `drive.file` scope is used, so FolderPls sees only files the user picked or the app created.
- User data stays in the browser or in the user's own Drive.
- Text users see must match what the code does. `tests/unit/claim-scan.test.ts` enforces known cases.
