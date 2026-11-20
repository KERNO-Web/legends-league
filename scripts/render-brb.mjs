// Рендер заставки broadcast/brb/brb.html в бесшовное видео: кадры через headless Chromium → ffmpeg.
// node scripts/render-brb.mjs [fps] [--preview]   (preview: только кадры-проверки в .work/brb)
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const FPS = +process.argv[2] || 30;
const PREVIEW = process.argv.includes('--preview');
const L = 12;
const root = path.resolve('broadcast/brb');
const out = path.resolve('.work/brb/frames');

const cache = path.join(homedir(), 'Library/Caches/ms-playwright');
const shell = readdirSync(cache).filter((d) => d.startsWith('chromium_headless_shell')).sort().pop();
const exe = path.join(cache, shell, 'chrome-headless-shell-mac-arm64/chrome-headless-shell');

const browser = await chromium.launch({ executablePath: exe, args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto('file://' + path.join(root, 'brb.html') + '?render');
await page.waitForLoadState('networkidle');
await page.evaluate(() => document.fonts.ready);

if (PREVIEW) {
  for (const t of [0, 2.3, 5.5, 8.0, 11.9]) {
    await page.evaluate((x) => window.seek(x), t);
    await page.screenshot({ path: `.work/brb/prev-${t}.jpg`, quality: 88, type: 'jpeg' });
  }
  await browser.close();
  console.log('preview ok');
  process.exit(0);
}

rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
const N = L * FPS;
for (let i = 0; i < N; i++) {
  await page.evaluate((x) => window.seek(x), i / FPS);
  await page.screenshot({ path: path.join(out, String(i).padStart(4, '0') + '.png') });
  if (i % 60 === 0) console.log('frame', i, '/', N);
}
await browser.close();

const mp4 = path.join(root, `LPL-S5-BRB-loop-${FPS}fps.mp4`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(out, '%04d.png'),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-tune', 'film', '-movflags', '+faststart', mp4]);
console.log('done', mp4, existsSync(mp4));
