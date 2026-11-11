# FolderPls

Tag and find your Google Drive files with your own labels, notes and properties. Tagging leaves your files and folders where they are.

FolderPls is free, non-profit and MIT licensed. There is no account to create, and your labels stay in your browser. There are no paid plans or teams, and every label is one you add yourself.

> **Not verified yet:** the Drive connection, the file picker and the Drive backup pass automated tests and browser checks against a simulated Drive API, but they have not been run end to end with a real Google account. Expect rough edges there.

## What it does

- Colored labels on the files you pick, with an optional expiry date.
- Custom properties, free-text notes and links between files.
- Saved smart collections.
- Search across file names, labels, properties and notes, with typo tolerance and Turkish character folding.
- A graph view of how labels and files connect.
- Turkish and English interface.
- Drive file actions: upload, create folder, rename, copy, move, delete and download. Folders and multi-selections download as a ZIP. These actions do change your Drive, because you ask them to. Tagging does not.

## Where your data lives

| Data | Where it lives |
|---|---|
| Your files | Your Google Drive. Your browser talks to Google directly |
| Labels, properties, notes, links, collections | IndexedDB in your browser, on that device, in a separate store for each Google account |
| Drive ID, name, type and parent folder of each tagged item | IndexedDB, so FolderPls can list the item and link back to it |
| Google access token | `sessionStorage` of the current tab, for about an hour. No refresh token is requested, and the token is never sent to a FolderPls server |
| Connected account's name and email | Your browser, to show which account is connected. The account's Drive user ID is only used to compute a one-way code that names its store and marks its backup; the ID itself is not kept |
| Backup | While Drive is connected, a visible `folderpls-tags.json` file in that account's Drive is updated a few seconds after a change. **Sync with Drive** runs it on demand, and **Export** downloads a JSON file |
| Error reports | Off unless the person running the instance sets a Sentry DSN |

FolderPls has no database. Its only API route receives Content-Security-Policy violation reports and writes a short summary to the server log.

Keep these limits in mind:

- Clearing your browser's site data deletes your labels. A backup is the only way to get them back.
- Labels are kept per Google account. If you connect a different account in the same browser, its own labels open and the first account's labels stay in the browser, untouched; they are never written to the other account's store or backup. While Drive is disconnected, the last connected account's labels stay open. **Delete data in this browser** removes only the open account's labels.
- Labels from before per-account stores move once, without loss, to the first account that connects (if this browser remembered a connected account, only to that account). If they wait for another account, **Data and Drive** offers to move them to the open one.
- Another browser or device starts empty until you import a backup or sync with Drive.
- The Drive backup runs on its own while Drive is connected: it reads and merges the file when you open the app or connect Drive, and writes it a few seconds after a change. It merges item by item and the newest change wins. If two devices write at the same moment, one can overwrite the Drive file, and the overwritten device's copy merges back on its next backup.
- The Google session lasts about an hour. After it expires, changes wait in the browser until you reconnect.

## What `drive.file` can and cannot do

FolderPls asks Google for one Drive permission, `https://www.googleapis.com/auth/drive.file`. It is narrow on purpose, and it shapes the product:

- FolderPls can reach only the files you select in Google's file picker and the files FolderPls itself creates, such as the backup.
- **Folder contents do not come along.** Picking a folder does not give access to the files inside it. The listing comes back empty. To add a folder's files, open the folder in the picker and select the files themselves. Multi-select is supported.
- Files you add to Drive later stay invisible to FolderPls until you pick them.
- Trash and shared items show only what the permission covers.
- Access belongs to one OAuth app. A new instance with its own Google Cloud project starts with nothing, even for files you picked in another instance. To move labels between instances, export a JSON file from one and import it into the other.
- FolderPls finds its backup by a private mark in the file's `appProperties` (`folderplsBackup` plus the account's one-way code), not by the file name. `appProperties` are visible only to the same OAuth client, so another instance cannot see the mark, and a same-named file you pick, or one someone shares with you, never counts as your backup. Backups written before the mark existed are marked once, and only when they are owned by you, sit in My Drive or the FolderPls folder, were not picked in the file picker, and contain a valid FolderPls backup. Moving between instances still goes through Export and Import.

Broader scopes such as `drive.readonly` are restricted by Google. A public app using them needs Google's verification and a recurring third-party security assessment, so FolderPls stays on `drive.file`.

The Drive session lasts about an hour. When it expires, a banner asks you to reconnect. Your labels are not affected.

## Run your own instance

You need Node.js 24 (see `.nvmrc`), npm and a Google account.

### 1. Get the code

```bash
git clone https://github.com/zeynepaslierhann/folderpls-oss.git
cd folderpls-oss
npm install
cp .env.example .env.local
```

### 2. Create a Google Cloud project

1. Create a project in the [Google Cloud console](https://console.cloud.google.com/).
2. Copy its numeric **project number** into `NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER`.
3. Under **APIs & Services > Library**, enable the **Google Drive API** and the **Google Picker API**.

### 3. Configure the OAuth consent screen

1. Choose **External**, or **Internal** if the project belongs to a Google Workspace organization and only its members will use it.
2. Add the scope `https://www.googleapis.com/auth/drive.file`.
3. While the app is in **Testing**, add your own Google address as a test user.

In Testing mode only listed test users can connect, and Google shows an "unverified app" warning. If you open your instance to other people, you are its operator and Google's verification process applies to you.

### 4. Create the OAuth client

1. Under **Credentials**, create an **OAuth client ID** of type **Web application**.
2. Add `http://localhost:3000` to **Authorized JavaScript origins**. No redirect URI or client secret is needed, because the token flow runs in the browser.
3. Put the client ID in `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID`.

### 5. Create the Picker API key

1. Under **Credentials**, create an **API key**.
2. Restrict it to the **Google Picker API** and to the HTTP referrer `http://localhost:3000/*`.
3. Put it in `NEXT_PUBLIC_GOOGLE_API_KEY`.

### 6. Start the app

```bash
npm run dev
```

Open [http://localhost:3000/dashboard/google-drive](http://localhost:3000/dashboard/google-drive), connect Drive and pick some files.

### Deploying

Use any host that runs Next.js. Add your production origin to the OAuth client and to the API key's referrers, and set `NEXT_PUBLIC_APP_URL` to it.

The privacy policy and terms in `lib/legal/` are a starting template. If you host an instance for other people, review them and set `NEXT_PUBLIC_CONTACT_EMAIL`. The hosting provider in the privacy policy comes from `HOSTING_PROVIDER` and the optional `HOSTING_REGION` (see `.env.example`). Until you set them, the policy shows a visible placeholder.

## Project layout

| Path | What is in it |
|---|---|
| `app/` | Next.js App Router pages |
| `components/` | React components |
| `lib/storage/` | IndexedDB label store, JSON backup and merge |
| `lib/google-drive/` | Drive API, Picker and browser token flow |
| `lib/search/`, `lib/graph/` | Search engine and graph model, both client-side |
| `lib/i18n/` | Turkish and English strings |
| `tests/` | Vitest suites |

The stack is Next.js 16, React 19, TypeScript and Tailwind CSS 4. Some code comments are in Turkish. See [ARCHITECTURE.md](ARCHITECTURE.md) for how the parts fit together.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

Please report vulnerabilities through GitHub's private vulnerability reporting on this repository instead of a public issue.

### Content-Security-Policy

Every page is sent with an enforced Content-Security-Policy. `proxy.ts` creates a new nonce for each request, and `lib/security/csp.ts` builds the policy:

- Scripts run only if they carry that nonce or were loaded by a script that does (`'strict-dynamic'`). There is no `'unsafe-inline'` or `'unsafe-eval'` for scripts in production. `next dev` adds `'unsafe-eval'`.
- Network, frame and image access is limited to the Google endpoints FolderPls uses: Identity Services, the Picker, the Drive API and Drive thumbnails. Sentry's ingest host is added only when a DSN is set.
- Styles still allow `'unsafe-inline'`, because React style attributes and the Google Picker add inline styles without a nonce.
- Violations are reported to `/api/csp-report`.

Because the nonce changes on every request, all pages are rendered on demand and none are served as static HTML.

To report violations without blocking them, set `CSP_REPORT_ONLY=1` in the server's environment. Use it only as a temporary escape hatch.

## License

The code is licensed under the [MIT License](LICENSE). The FolderPls name, logo and mascot artwork are not covered by that license.
