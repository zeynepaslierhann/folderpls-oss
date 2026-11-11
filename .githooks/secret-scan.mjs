#!/usr/bin/env node
// secret-scan.mjs v1 (2026-10-06) — bağımlılıksız sır tarayıcı.
//
// NE ZAMAN: gitleaks kurulu değilse `.githooks/pre-commit` bunu çağırır. gitleaks kuruluysa
// (brew install gitleaks) o kullanılır; bu dosya yedek ve geçmiş taraması içindir.
//
// KULLANIM
//   node .githooks/secret-scan.mjs              # --staged (varsayılan): stage'li eklemeleri tara
//   node .githooks/secret-scan.mjs --history    # TÜM ref'lerin geçmişini tara (tek seferlik denetim)
//   node .githooks/secret-scan.mjs --self-test  # kuralları sahte (çalışma anında üretilen) değerlerle doğrula
//
// KURAL: çıktıda ASLA sır değeri yoktur — yalnız kural kimliği + dosya:satır (+ commit kısa hash).
// Satır içi muafiyet: satırda `secret-scan:allow` (ya da `gitleaks:allow`) yazıyorsa atlanır.
// Çıkış kodu: 1 = engelleyici (block) bulgu var · 0 = temiz ya da yalnız "review" bulgusu.

import { spawn, execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------- yardımcılar
const SKIP_PATH = /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?)$/;
const ALLOW_MARK = /secret-scan:allow|gitleaks:allow/;
const MAX_LINE = 300000;

const entropy = (s) => {
  const f = new Map();
  for (const c of s) f.set(c, (f.get(c) || 0) + 1);
  let h = 0;
  for (const n of f.values()) h -= (n / s.length) * Math.log2(n / s.length);
  return h;
};
const hasDigit = (s) => /[0-9]/.test(s);
const hasAlpha = (s) => /[A-Za-z]/.test(s);

function jwtParts(tok) {
  try {
    const dec = (s) => JSON.parse(Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    const [h, p] = tok.split('.');
    return { h: dec(h), p: dec(p) };
  } catch {
    return null;
  }
}

const PLACEHOLDER_PW = /^(?:password|passwd|pass|postgres|root|admin|secret|changeme|change-me|xxx+|\*+|<.*>|\[.*\]|\$\{?.*|\{\{.*\}\}|your.*|example.*|user|test)$/i;
const LOCAL_HOST = /^(?:localhost|127\.0\.0\.1|0\.0\.0\.0|host\.docker\.internal|\[::1\]|db|postgres)$/i;

// Her kural: { id, sev: 'block'|'review', re, check?(match, line) => bool | { id?, sev? } }
const RULES = [
  { id: 'private-key-block', sev: 'block', re: /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----/g },
  { id: 'aws-access-key-id', sev: 'block', re: /\b(?:AKIA|ASIA|AGPA|AIDA|AROA|ANPA|ANVA)[0-9A-Z]{16}\b/g },
  { id: 'github-token', sev: 'block', re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})/g },
  { id: 'slack-token', sev: 'block', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g },
  { id: 'stripe-live-key', sev: 'block', re: /\b[rs]k_live_[A-Za-z0-9]{16,}/g },
  { id: 'stripe-webhook-secret', sev: 'block', re: /\bwhsec_[A-Za-z0-9]{24,}/g },
  { id: 'google-oauth-client-secret', sev: 'block', re: /\bGOCSPX-[A-Za-z0-9_-]{20,}/g },
  { id: 'supabase-secret-key', sev: 'block', re: /\bsb_secret_[A-Za-z0-9_-]{20,}/g },
  { id: 'anthropic-api-key', sev: 'block', re: /\bsk-ant-[A-Za-z0-9_-]{32,}/g },
  { id: 'openai-api-key', sev: 'block', re: /\bsk-(?!ant-)(?:proj-|svcacct-)?[A-Za-z0-9_-]{40,}/g },
  { id: 'sendgrid-api-key', sev: 'block', re: /\bSG\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{40,}/g },
  {
    id: 'resend-api-key', sev: 'block',
    re: /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}\b|\bre_[A-Za-z0-9]{32,}\b/g,
    check: (m) => hasDigit(m[0]) && hasAlpha(m[0]),
  },
  {
    // AIza... hem herkese açık Firebase web anahtarı hem de GİZLİ Gemini/Maps anahtarı olabilir.
    // Satırda firebase/NEXT_PUBLIC bağlamı varsa "review", yoksa "block".
    id: 'google-api-key', sev: 'block', re: /\bAIza[0-9A-Za-z_-]{35}\b/g,
    check: (m, line) => (/firebase|NEXT_PUBLIC_|authDomain|measurementId/i.test(line) ? { sev: 'review' } : true),
  },
  {
    id: 'database-url-with-password', sev: 'block',
    re: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|rediss?|amqps?):\/\/([^\s:@/'"`]+):([^\s@/'"`]{4,})@([^\s/'"`:?]+)/g,
    check: (m) => !LOCAL_HOST.test(m[3]) && !PLACEHOLDER_PW.test(m[2]),
  },
  {
    id: 'jwt', sev: 'review', re: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{16,}/g,
    check: (m) => {
      const j = jwtParts(m[0]);
      if (!j) return false;
      const role = j.p && j.p.role;
      if (role === 'service_role') return { id: 'supabase-service-role-jwt', sev: 'block' };
      if (role === 'anon' || role === 'authenticated') return false; // anon anahtarı herkese açıktır
      if (j.h && j.h.alg === 'RS256' && m[0].length > 500) return { id: 'long-rs256-api-jwt', sev: 'block' }; // Lemon Squeezy API anahtarı biçimi
      return { id: 'jwt-review', sev: 'review' };
    },
  },
  {
    id: 'generic-secret-assignment', sev: 'review',
    re: /\b([A-Za-z0-9_.-]*(?:secret|token|passw(?:or)?d|api[_-]?key|private[_-]?key|service[_-]?role|signing[_-]?key)[A-Za-z0-9_.-]*)\s*[:=]\s*["'`]?([A-Za-z0-9/+_=-]{24,})["'`]?/gi,
    check: (m) => {
      const v = m[2];
      if (!hasDigit(v) || !hasAlpha(v)) return false;
      if (/^[A-Z0-9_]+$/.test(v)) return false; // SABIT_ADI
      if (/(?:example|your|xxxx|changeme|placeholder|dummy|fake|sample|test|redacted)/i.test(v)) return false;
      return entropy(v) >= 3.8;
    },
  },
];

const FILE_RULES = [
  { id: 'env-file-staged', sev: 'block', re: /(^|\/)\.env(?:\.[^/]+)?$/i, allow: /\.(?:example|sample|template|dist)$/i },
  {
    id: 'credential-file-staged', sev: 'block',
    re: /(^|\/)(?:serviceAccount[^/]*\.json|[^/]*-firebase-adminsdk-[^/]*\.json|client_secret[^/]*\.json|[^/]*\.(?:pem|p12|pfx|jks|keystore)|id_(?:rsa|ed25519|ecdsa)|\.netrc)$/i,
  },
  { id: 'npmrc-review', sev: 'review', re: /(^|\/)\.npmrc$/i },
];

// ---------------------------------------------------------------- çekirdek tarama
/** Bir metin satırını tara → [{id, sev}] (değer ASLA döndürülmez) */
export function scanLine(line) {
  if (!line || ALLOW_MARK.test(line)) return [];
  const text = line.length > MAX_LINE ? line.slice(0, MAX_LINE) : line;
  const out = [];
  const seen = new Set();
  for (const r of RULES) {
    if (r.id === 'generic-secret-assignment' && out.some((h) => h.sev === 'block')) continue;
    r.re.lastIndex = 0;
    for (const m of text.matchAll(r.re)) {
      let id = r.id;
      let sev = r.sev;
      if (r.check) {
        const res = r.check(m, text);
        if (!res) continue;
        if (typeof res === 'object') { id = res.id || id; sev = res.sev || sev; }
      }
      const k = `${id}|${sev}`;
      if (!seen.has(k)) { seen.add(k); out.push({ id, sev }); }
    }
  }
  return out;
}

export function scanPath(path) {
  const out = [];
  for (const r of FILE_RULES) {
    if (r.re.test(path) && !(r.allow && r.allow.test(path))) out.push({ id: r.id, sev: r.sev });
  }
  return out;
}

export function scanText(text, path) {
  if (SKIP_PATH.test(path)) return [];
  const hits = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const h of scanLine(lines[i])) hits.push({ ...h, file: path, line: i + 1 });
  }
  return hits;
}

// ---------------------------------------------------------------- diff ayrıştırıcı
const unquote = (p) => {
  let s = p.replace(/\t.*$/, '');
  if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  return s.replace(/^b\//, '');
};

class DiffParser {
  constructor(onAdd) {
    this.onAdd = onAdd;
    this.commit = null;
    this.file = null;
    this.line = 0;
    this.hdr = false;
  }
  hunk(l) {
    const m = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(l);
    if (m) this.line = Number(m[1]);
  }
  feed(l) {
    if (l.startsWith('@@C ')) { this.commit = l.slice(4).trim(); this.hdr = false; this.file = null; return; }
    if (l.startsWith('diff --git ')) { this.hdr = true; this.file = null; return; }
    if (this.hdr) {
      if (l.startsWith('+++ ')) { const p = l.slice(4); this.file = p.startsWith('/dev/null') ? null : unquote(p); }
      else if (l.startsWith('@@')) { this.hdr = false; this.hunk(l); }
      return;
    }
    if (l.startsWith('@@')) { this.hunk(l); return; }
    if (l.startsWith('+') && this.file) { this.onAdd(this.file, this.line, l.slice(1), this.commit); this.line++; }
  }
}

const git = (args) => execFileSync('git', ['-c', 'core.quotepath=false', ...args], { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });

// ---------------------------------------------------------------- muafiyet listesi
// .githooks/secret-scan.allow — her satır: <yol-regex> [kural-kimliği]; # yorum (gerekçe yaz).
function loadAllow() {
  try {
    const root = git(['rev-parse', '--show-toplevel']).trim();
    const out = [];
    for (const raw of readFileSync(join(root, '.githooks', 'secret-scan.allow'), 'utf8').split('\n')) {
      const l = raw.trim();
      if (!l || l.startsWith('#')) continue;
      const [re, rule] = l.split(/\s+/);
      try { out.push({ re: new RegExp(re), rule }); } catch { console.error(`secret-scan UYARI: secret-scan.allow geçersiz regex atlandı: ${re}`); }
    }
    return out;
  } catch {
    return [];
  }
}
const ALLOW = loadAllow();
const allowed = (file, id) => ALLOW.some((a) => a.re.test(file) && (!a.rule || a.rule === id));

// ---------------------------------------------------------------- --staged
function runStaged() {
  const hits = [];
  const names = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']).split('\0').filter(Boolean);
  for (const n of names) for (const h of scanPath(n)) if (!allowed(n, h.id)) hits.push({ ...h, file: n, line: 0 });
  const p = new DiffParser((file, line, text) => {
    if (SKIP_PATH.test(file)) return;
    for (const h of scanLine(text)) if (!allowed(file, h.id)) hits.push({ ...h, file, line });
  });
  for (const l of git(['diff', '--cached', '--no-color', '--no-ext-diff', '--diff-filter=ACMR', '-U0']).split('\n')) p.feed(l);
  return report(hits, 'staged');
}

// ---------------------------------------------------------------- --history
async function runHistory() {
  const agg = new Map(); // "sev|id|file" -> { sev,id,file, commits:Set, first, firstLine }
  const note = (sev, id, file, line, commit) => {
    if (allowed(file, id)) return;
    const k = `${sev}|${id}|${file}`;
    let e = agg.get(k);
    if (!e) { e = { sev, id, file, commits: new Set(), first: commit, firstLine: line }; agg.set(k, e); }
    e.commits.add(commit);
    e.first = commit; // log yeni→eski gider; son görülen = en eski (tanıtan) commit
    e.firstLine = line;
  };
  const args = ['-c', 'core.quotepath=false', 'log', '--all', '--no-color', '--no-ext-diff', '-p', '-U0',
    '--diff-filter=ACMR', '--format=@@C %h'];
  const child = spawn('git', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  child.stderr.on('data', () => {});
  const p = new DiffParser((file, line, text, commit) => {
    if (SKIP_PATH.test(file)) return;
    for (const h of scanLine(text)) note(h.sev, h.id, file, line, commit);
  });
  let commits = 0;
  const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
  for await (const l of rl) { if (l.startsWith('@@C ')) commits++; p.feed(l); }
  await new Promise((r) => child.on('close', r));

  // dosya adı kuralları (env/credential dosyası geçmişte hiç eklenmiş mi?)
  const nameOut = git(['log', '--all', '--no-color', '--diff-filter=ACMR', '--name-only', '--format=@@C %h']);
  let cur = null;
  for (const l of nameOut.split('\n')) {
    if (l.startsWith('@@C ')) { cur = l.slice(4).trim(); continue; }
    if (!l) continue;
    for (const h of scanPath(l)) note(h.sev, h.id, l, 0, cur);
  }

  // HEAD'de hâlâ var mı? (yalnız etkilenen dosyaları HEAD içeriğiyle yeniden tara)
  const headHits = new Map(); // "id|file" -> [lines]
  const files = [...new Set([...agg.values()].map((e) => e.file))];
  for (const f of files) {
    let txt = null;
    try { txt = git(['show', `HEAD:${f}`]); } catch { /* HEAD'de yok */ }
    if (txt == null) continue;
    for (const h of scanText(txt, f)) {
      const k = `${h.id}|${f}`;
      if (!headHits.has(k)) headHits.set(k, []);
      headHits.get(k).push(h.line);
    }
    for (const h of scanPath(f)) headHits.set(`${h.id}|${f}`, [0]);
  }

  const rows = [...agg.values()].map((e) => {
    const hl = headHits.get(`${e.id}|${e.file}`);
    const where = hl
      ? `${e.file}${hl[0] ? ':' + hl.slice(0, 5).join(',') : ''}`
      : `${e.file}${e.firstLine ? ':' + e.firstLine : ''}`;
    return { sev: e.sev, id: e.id, where, status: hl ? 'HEAD-de-VAR' : `yalniz-gecmis (commit ${e.first})`, n: e.commits.size };
  });
  rows.sort((a, b) => (a.sev === b.sev ? a.id.localeCompare(b.id) : a.sev === 'block' ? -1 : 1));
  console.log(`secret-scan --history: ${commits} commit tarandi, ${rows.length} bulgu (kural,dosya) grubu`);
  for (const r of rows) console.log(`${r.sev.toUpperCase().padEnd(6)} ${r.id.padEnd(28)} ${r.where}  [${r.status}; ${r.n} commit]`);
  const blocks = rows.filter((r) => r.sev === 'block').length;
  console.log(`OZET: block=${blocks} review=${rows.length - blocks}`);
  return blocks ? 1 : 0;
}

// ---------------------------------------------------------------- rapor (staged)
function report(hits, label) {
  const blocks = hits.filter((h) => h.sev === 'block');
  const reviews = hits.filter((h) => h.sev !== 'block');
  const fmt = (h) => `  ${h.sev === 'block' ? 'ENGEL ' : 'inceleme'} ${h.id}  ${h.file}${h.line ? ':' + h.line : ''}`;
  if (hits.length) {
    console.error(`secret-scan (${label}): ${blocks.length} engelleyici, ${reviews.length} inceleme bulgusu — değerler gösterilmez`);
    for (const h of [...blocks, ...reviews]) console.error(fmt(h));
  }
  if (blocks.length) {
    console.error('\nCommit ENGELLENDI. Gerçek bir sırsa: dosyadan çıkar, sırrı DÖNDÜR (rotate) ve ortam değişkenine taşı.');
    console.error('Yanlış pozitifse: satıra `secret-scan:allow` yorumu ekle. (--no-verify yalnız gerekçeli.)');
    return 1;
  }
  return 0;
}

// ---------------------------------------------------------------- --self-test
function selfTest() {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwt = (p, alg = 'HS256', pad = 20) => `${b64({ alg, typ: 'JWT' })}.${b64(p)}.${'s'.repeat(pad)}`;
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const cases = [
    ['aws-access-key-id', 'k = "' + 'AK' + 'IA' + A.slice(0, 16) + '"', true],
    ['private-key-block', '-----BEGIN ' + 'RSA PRIV' + 'ATE KEY-----', true],
    ['github-token', 'x=gh' + 'p_' + 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8', true],
    ['stripe-live-key', 'sk' + '_live_' + 'a1B2c3D4e5F6g7H8i9J0', true],
    ['stripe-webhook-secret', 'wh' + 'sec_' + 'a1B2c3D4e5F6g7H8i9J0k1L2m3', true],
    ['anthropic-api-key', 'sk' + '-ant-' + 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8', true],
    ['openai-api-key', 'sk' + '-' + 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8S9T0u1V2', true],
    ['google-api-key', 'key: "AI' + 'za' + 'SyA1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q"', true],
    ['supabase-service-role-jwt', 'KEY=' + jwt({ iss: 'supabase', role: 'service_role' }), true],
    ['database-url-with-password', 'u = "postgres' + '://app:' + 'Zq81xKd92Lm@db.example.net:5432/app"', true],
    ['env-file-staged', null, true, '.env.production'],
    // yanlış pozitif kontrolleri (HİÇBİR bulgu üretmemeli ya da block olmamalı)
    ['supabase-anon-jwt', 'KEY=' + jwt({ iss: 'supabase', role: 'anon' }), false],
    ['local-db-url', 'u = "postgres' + '://postgres:postgres@127.0.0.1:54322/postgres"', false],
    ['placeholder-env', 'API_KEY=your-api-key-here', false],
    ['const-name', 'const TOKEN_REFRESH_INTERVAL_MS_VALUE_CONST = TOKEN_REFRESH_INTERVAL_MS_VALUE_1', false],
    ['allow-marker', 'k = "' + 'AK' + 'IA' + A.slice(0, 16) + '" // secret-scan:allow', false],
    ['env-example', null, false, '.env.example'],
  ];
  let bad = 0;
  for (const [id, line, shouldBlock, path] of cases) {
    const hits = path ? scanPath(path) : scanLine(line);
    const blocked = hits.some((h) => h.sev === 'block');
    const ok = shouldBlock ? hits.some((h) => h.id === id && h.sev === 'block') : !blocked;
    if (!ok) { bad++; console.error(`FAIL ${id}: beklenen ${shouldBlock ? 'block' : 'temiz'}, gelen [${hits.map((h) => h.sev + ':' + h.id).join(',')}]`); }
  }
  console.log(`self-test: ${cases.length - bad}/${cases.length} gecti`);
  return bad ? 1 : 0;
}

// ---------------------------------------------------------------- giriş
const mode = process.argv[2] || '--staged';
try {
  let code;
  if (mode === '--staged') code = runStaged();
  else if (mode === '--history') code = await runHistory();
  else if (mode === '--self-test') code = selfTest();
  else { console.error('kullanım: secret-scan.mjs [--staged|--history|--self-test]'); code = 2; }
  process.exit(code);
} catch (e) {
  console.error(`secret-scan HATA: ${e && e.message ? e.message.split('\n')[0] : e}`);
  process.exit(3);
}
