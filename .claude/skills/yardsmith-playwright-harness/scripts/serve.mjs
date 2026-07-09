/* serve.mjs — Yardsmith harness helpers: static server + Playwright/Chromium resolvers.
 *
 * The server serves the REPO ROOT, i.e. the COMMITTED BUILD OUTPUT
 * (index.html / app.js / styles.css / sw.js). It never builds anything —
 * rebuild first (node scripts/build.mjs) if you changed src/.
 *
 * Use as a library:
 *   import { startServer, resolvePlaywright, resolveChromiumExe, launchApp } from './serve.mjs';
 *   const srv = await startServer();            // { url, port, close() }
 *   const { chromium } = resolvePlaywright();
 *   const browser = await chromium.launch({ executablePath: resolveChromiumExe(), args: ['--no-sandbox'] });
 *
 * Or standalone:  node serve.mjs [port]   (default 8471; Ctrl-C to stop)
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// scripts/ -> yardsmith-playwright-harness/ -> skills/ -> .claude/ -> repo root
export const REPO_ROOT = process.env.YARDSMITH_ROOT || path.resolve(HERE, '..', '..', '..', '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

/** Start a static file server over `root` (default: the Yardsmith repo root).
 *  Listens on 127.0.0.1. port 0 (default) = pick a free port.
 *  Returns { server, port, url, close() }. */
export function startServer(root = REPO_ROOT, port = 0) {
  const server = http.createServer((req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p === '/') p = '/index.html';
      const f = path.normalize(path.join(root, p));
      if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
        res.writeHead(404); res.end('not found'); return;
      }
      res.writeHead(200, {
        'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream',
        'cache-control': 'no-store',
      });
      res.end(fs.readFileSync(f));
    } catch (e) {
      res.writeHead(500); res.end(String(e));
    }
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const p = server.address().port;
      resolve({
        server,
        port: p,
        url: `http://127.0.0.1:${p}/`,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

/** Find a usable Playwright module. The repo's node_modules is usually NOT
 *  installed (devDependency playwright-core exists but npm ci is rarely run);
 *  the box carries a global install. Checked in order:
 *    1. $PLAYWRIGHT_MODULE (explicit override)
 *    2. <repo>/node_modules/playwright-core   (if someone ran npm ci)
 *    3. /opt/node22/lib/node_modules/playwright  (global — 1.56.1 as of 2026-07-08)
 *    4. bare require('playwright') / require('playwright-core')            */
export function resolvePlaywright() {
  const require = createRequire(import.meta.url);
  const candidates = [
    process.env.PLAYWRIGHT_MODULE,
    path.join(REPO_ROOT, 'node_modules', 'playwright-core'),
    '/opt/node22/lib/node_modules/playwright',
    'playwright',
    'playwright-core',
  ].filter(Boolean);
  for (const c of candidates) {
    try { return require(c); } catch { /* next */ }
  }
  throw new Error(
    'No Playwright module found. Tried: ' + candidates.join(', ') +
    '\nSet PLAYWRIGHT_MODULE=/path/to/playwright or run: npm ls -g --depth=0 --parseable | grep playwright'
  );
}

/** Find the preinstalled Chromium executable under /opt/pw-browsers/.
 *  The versioned dir (chromium-1194 today) DRIFTS with Playwright updates,
 *  so prefer the stable `chromium` symlink, then glob for the newest
 *  chromium-<rev> dir. Override with $CHROMIUM_EXE. */
export function resolveChromiumExe() {
  if (process.env.CHROMIUM_EXE) return process.env.CHROMIUM_EXE;
  const base = '/opt/pw-browsers';
  const link = path.join(base, 'chromium');       // symlink -> chromium-<rev>/chrome-linux/chrome
  if (fs.existsSync(link)) return link;
  if (fs.existsSync(base)) {
    const revs = fs.readdirSync(base)
      .filter((d) => /^chromium-\d+$/.test(d))
      .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
    for (const r of revs) {
      const exe = path.join(base, r, 'chrome-linux', 'chrome');
      if (fs.existsSync(exe)) return exe;
    }
  }
  throw new Error('No Chromium found under /opt/pw-browsers. Run: ls /opt/pw-browsers/');
}

/** One-call convenience: server + browser + 390x844 reduced-motion context.
 *  `seed` is an optional self-contained function for addInitScript (see seeds.mjs).
 *  Returns { url, page, ctx, browser, errors, consoleErrors, close() }.
 *  `errors` fills with pageerror strings as they happen — assert it stays empty. */
export async function launchApp({ seed, seedArg, theme } = {}) {
  const srv = await startServer();
  const { chromium } = resolvePlaywright();
  const browser = await chromium.launch({
    executablePath: resolveChromiumExe(),
    args: ['--no-sandbox'],
  });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },     // the house standard phone frame
    reducedMotion: 'reduce',                   // no count-up races (DESIGN-CHANGES §12)
  });
  const page = await ctx.newPage();
  const errors = [];
  const consoleErrors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  if (seed) await page.addInitScript(seed, seedArg);
  if (theme) await page.addInitScript((t) => {
    try { localStorage.setItem('ff_theme', JSON.stringify(t)); } catch (e) {}
  }, theme);
  await page.goto(srv.url, { waitUntil: 'networkidle' });
  return {
    url: srv.url, page, ctx, browser, errors, consoleErrors,
    close: async () => { await browser.close(); await srv.close(); },
  };
}

// ---- standalone mode ----
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const port = Number(process.argv[2]) || 8471;
  const srv = await startServer(REPO_ROOT, port);
  console.log(`serving ${REPO_ROOT}`);
  console.log(`  ${srv.url}   (Ctrl-C to stop)`);
}
