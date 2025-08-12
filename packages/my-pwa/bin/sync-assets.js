#!/usr/bin/env node
// my-pwa asset sync CLI
// Copies service worker, offline pages, icons, and splash screens into a target Next.js app's public folder

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkgRoot = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = {
    target: undefined,
    publicDir: 'public',
    cacheName: undefined,
    quiet: false,
    dryRun: false,
    force: true,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--target' && argv[i + 1]) {
      args.target = argv[++i];
      continue;
    }
    if (arg === '--public-dir' && argv[i + 1]) {
      args.publicDir = argv[++i];
      continue;
    }
    if (arg === '--cache-name' && argv[i + 1]) {
      args.cacheName = argv[++i];
      continue;
    }
    if (arg === '--quiet' || arg === '-q') {
      args.quiet = true;
      i -= 0;
      continue;
    }
    if (arg === '--dry-run') {
      args.dryRun = true;
      i -= 0;
      continue;
    }
    if (arg === '--no-force') {
      args.force = false;
      i -= 0;
      continue;
    }
  }
  return args;
}

function log(msg, { quiet } = { quiet: false }) {
  if (!quiet) console.log(msg);
}
function warn(msg) {
  console.warn(msg);
}
function error(msg) {
  console.error(msg);
}

function ensureDir(dir, { dryRun, quiet }) {
  if (dryRun) {
    log(`[dry-run] mkdir -p ${dir}`, { quiet });
    return;
  }
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dst, { dryRun, quiet, force }) {
  if (!fs.existsSync(src)) {
    warn(`Skipping missing asset: ${src}`);
    return;
  }
  if (!force && fs.existsSync(dst)) {
    log(`Skipping existing file (use --no-force to keep): ${dst}`, { quiet });
    return;
  }
  const dstDir = path.dirname(dst);
  ensureDir(dstDir, { dryRun, quiet });
  if (dryRun) {
    log(`[dry-run] copy ${src} -> ${dst}`, { quiet });
    return;
  }
  fs.copyFileSync(src, dst);
  log(`Copied ${path.relative(process.cwd(), dst)}`, { quiet });
}

function setCacheName(swPath, cacheName, { dryRun, quiet }) {
  if (!cacheName || !fs.existsSync(swPath)) return;
  const src = fs.readFileSync(swPath, 'utf8');
  const replaced = src.replace(
    /const\s+CACHE_NAME\s*=\s*['"][^'"]+['"];?/,
    `const CACHE_NAME = '${cacheName}';`
  );
  if (src === replaced) {
    log(`Note: could not find CACHE_NAME definition to replace in ${swPath}`, {
      quiet,
    });
  }
  if (dryRun) {
    log(`[dry-run] set CACHE_NAME='${cacheName}' in ${swPath}`, { quiet });
    return;
  }
  fs.writeFileSync(swPath, replaced, 'utf8');
  log(
    `Set CACHE_NAME='${cacheName}' in ${path.relative(process.cwd(), swPath)}`,
    { quiet }
  );
}

function main() {
  const args = parseArgs(process.argv);
  const targetRoot = path.resolve(
    args.target ||
      process.env.MY_PWA_TARGET ||
      process.env.INIT_CWD ||
      process.cwd()
  );
  const publicDir = path.resolve(targetRoot, args.publicDir || 'public');

  log(`my-pwa-sync-assets -> target: ${targetRoot}, public: ${publicDir}`, {
    quiet: args.quiet,
  });

  // Sources inside the package
  const publicSrc = path.resolve(pkgRoot, 'public');
  const splashSrc = path.resolve(pkgRoot, 'src', 'assets', 'splash');
  const iconsSrc = path.resolve(pkgRoot, 'src', 'assets', 'icons');

  const copies = [
    // Core SW + offline pages
    [path.join(publicSrc, 'sw.js'), path.join(publicDir, 'sw.js')],
    [
      path.join(publicSrc, 'offline.html'),
      path.join(publicDir, 'offline.html'),
    ],
    [
      path.join(publicSrc, 'offline-debug.html'),
      path.join(publicDir, 'offline-debug.html'),
    ],
    // Icons (prefer packaged public ones, fall back to src/assets/icons)
    [
      path.join(publicSrc, 'icon-180x180.png'),
      path.join(publicDir, 'icon-180x180.png'),
    ],
    [
      path.join(publicSrc, 'icon-192x192.png'),
      path.join(publicDir, 'icon-192x192.png'),
    ],
    [
      path.join(publicSrc, 'icon-512x512.png'),
      path.join(publicDir, 'icon-512x512.png'),
    ],
    [
      path.join(publicSrc, 'apple-touch-icon.png'),
      path.join(publicDir, 'apple-touch-icon.png'),
    ],
    [
      path.join(publicSrc, 'apple-touch-icon-precomposed.png'),
      path.join(publicDir, 'apple-touch-icon-precomposed.png'),
    ],
  ];

  // Optional: icon.svg from src assets if available
  const iconSvg = path.join(iconsSrc, 'icon.svg');
  if (fs.existsSync(iconSvg)) {
    copies.push([iconSvg, path.join(publicDir, 'icon.svg')]);
  }

  // Splash screens from src/assets/splash -> public root
  if (fs.existsSync(splashSrc)) {
    for (const file of fs.readdirSync(splashSrc)) {
      if (file.toLowerCase().endsWith('.png')) {
        copies.push([path.join(splashSrc, file), path.join(publicDir, file)]);
      }
    }
  }

  // Execute copies
  for (const [src, dst] of copies) {
    copyFile(src, dst, {
      dryRun: args.dryRun,
      quiet: args.quiet,
      force: args.force,
    });
  }

  // Update cache name in destination SW
  const destSw = path.join(publicDir, 'sw.js');
  setCacheName(destSw, args.cacheName, {
    dryRun: args.dryRun,
    quiet: args.quiet,
  });
}

try {
  main();
} catch (e) {
  error(`my-pwa-sync-assets failed: ${e?.message || e}`);
  process.exit(1);
}
