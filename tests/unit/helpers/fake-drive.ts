/**
 * Drive REST yüzeyinin bellek karşılığı (yalnız yedeğin kullandığı istekler).
 * Gerçek Drive hesabıyla doğrulama değildir: kanıtladığı, doğru isteklerin
 * atıldığı ve birleştirmenin bu isteklerle kurulduğudur.
 *
 * `files.list` sorgusundaki `appProperties has {...}`, `name =`, `mimeType =` ve
 * `'x' in parents` koşullarını uygular; Drive kökü `root` diye tutulur.
 */
import { DRIVE_BACKUP_FILE_NAME } from "@/lib/storage/drive-backup";

export interface RemoteFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  content: string;
  size?: string;
  parents?: string[];
  ownedByMe?: boolean;
  appProperties?: Record<string, string>;
}

export interface DriveCall {
  method: string;
  url: string;
  body?: string;
}

export const remoteFile = (id: string, content: string, overrides: Partial<RemoteFile> = {}): RemoteFile => ({
  id,
  name: DRIVE_BACKUP_FILE_NAME,
  mimeType: "application/json",
  modifiedTime: "2026-01-01T00:00:00Z",
  content,
  parents: ["root"],
  ownedByMe: true,
  ...overrides,
});

function matches(file: RemoteFile, q: string): boolean {
  if (q.includes("trashed = false") === false) return false;
  for (const [, key, value] of q.matchAll(/appProperties has \{ key='([^']+)' and value='([^']+)' \}/g)) {
    if (file.appProperties?.[key] !== value) return false;
  }
  const name = q.match(/name = '([^']+)'/);
  if (name && file.name !== name[1]) return false;
  const mime = q.match(/mimeType = '([^']+)'/);
  if (mime && file.mimeType !== mime[1]) return false;
  const parents = [...q.matchAll(/'([^']+)' in parents/g)].map((match) => match[1]);
  if (parents.length > 0 && !parents.some((parent) => (file.parents ?? []).includes(parent))) return false;
  return true;
}

export function createFakeDrive() {
  const state = { remote: [] as RemoteFile[], calls: [] as DriveCall[] };

  async function fetch(input: string, init: RequestInit = {}): Promise<Response> {
    const method = init.method ?? "GET";
    state.calls.push({ method, url: input, body: typeof init.body === "string" ? init.body : undefined });
    const url = new URL(input);
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

    if (url.pathname === "/drive/v3/files" && method === "GET") {
      const q = url.searchParams.get("q") ?? "";
      // Drive yanıtı yalnız bu istemcinin appProperties'ini döner; dosyanın içeriği dönmez.
      const files = state.remote
        .filter((file) => matches(file, q))
        .map((file) => {
          const meta: Partial<RemoteFile> = { ...file };
          delete meta.content;
          return meta;
        });
      return json({ files });
    }
    if (url.pathname === "/upload/drive/v3/files" && method === "POST") {
      const form = init.body as FormData;
      const metadata = JSON.parse(await (form.get("metadata") as Blob).text()) as {
        name: string;
        parents?: string[];
        appProperties?: Record<string, string>;
      };
      const content = await (form.get("file") as Blob).text();
      const created = remoteFile(`new${state.remote.length}`, content, {
        name: metadata.name,
        modifiedTime: new Date().toISOString(),
        parents: metadata.parents ?? ["root"],
        appProperties: metadata.appProperties,
      });
      state.remote.push(created);
      return json(created);
    }
    const meta = url.pathname.match(/^\/drive\/v3\/files\/([^/]+)$/);
    if (meta && url.searchParams.get("alt") === "media") {
      return new Response(state.remote.find((file) => file.id === meta[1])?.content ?? "", { status: 200 });
    }
    if (meta && method === "PATCH") {
      const file = state.remote.find((candidate) => candidate.id === meta[1]);
      if (!file) return json({ error: "not found" }, 404);
      const body = JSON.parse(String(init.body)) as { appProperties?: Record<string, string> };
      file.appProperties = { ...file.appProperties, ...body.appProperties };
      return json({ id: file.id });
    }
    const upload = url.pathname.match(/^\/upload\/drive\/v3\/files\/([^/]+)$/);
    if (upload && method === "PATCH") {
      const file = state.remote.find((candidate) => candidate.id === upload[1])!;
      file.content = String(init.body);
      file.modifiedTime = new Date().toISOString();
      return json({ id: file.id });
    }
    return json({ error: "unhandled" }, 500);
  }

  return {
    state,
    fetch,
    writes: () => state.calls.filter((call) => call.method !== "GET"),
    reset: () => {
      state.remote = [];
      state.calls = [];
    },
  };
}
