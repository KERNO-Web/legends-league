// MP4-превью всех сцен HUD «как в эфире»: появление + 9 секунд жизни. Для просмотра и согласования.
// node scripts/render-hud-preview.mjs [base_url]
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const base = process.argv[2] || 'http://localhost:5195/hud/';
const FPS = 30, SEC = 20;
const out = path.resolve('release/LPL-S5-HUD/preview');
mkdirSync(out, { recursive: true });
const list = [
  ['01-Starting-Soon', 'starting.html?x=1'], ['02-Be-Right-Back', 'brb.html?x=1'], ['03-Offline', 'offline.html?x=1'], ['04-Thanks-For-Watching', 'ending.html?x=1'],
  ['05-Schedule-1-match', 'schedule.html?day=21.11&layout=1'], ['06-Schedule-2-matches', 'schedule.html?day=21.11&layout=2'],
  ['07-Schedule-3-matches', 'schedule.html?day=21.11&layout=3'], ['08-Schedule-4-matches', 'schedule.html?day=21.11&layout=4'],
  ['09-Results', 'results.html?day=20.11'], ['10-MVP', 'mvp.html?x=1'], ['11-Casters', 'casters.html?bg=1'],
  ['12-Studio-Camera', 'camera.html?bg=1'], ['13-Studio-Camera-Draft', 'camera.html?v=draft&bg=1'],
].filter(([n]) => !process.argv[3] || process.argv[3].split(',').some((k) => n.startsWith(k)));

const cache = path.join(homedir(), 'Library/Caches/ms-playwright');
const shell = readdirSync(cache).filter((d) => d.startsWith('chromium_headless_shell')).sort().pop();
const browser = await chromium.launch({ executablePath: path.join(cache, shell, 'chrome-headless-shell-mac-arm64/chrome-headless-shell') });
for (const [name, url] of list) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(base + url + '&hold=1&bg=1'); // bg — тёмная подложка вместо прозрачности
  await page.waitForFunction(() => window.__hud && window.__hud.start != null, null, { timeout: 20000 });
  await page.waitForTimeout(1200); // картинки догружаются
  const start = await page.evaluate(() => window.__hud.start);
  const fr = path.resolve(`.work/hud-frames/p-${name}`);
  rmSync(fr, { recursive: true, force: true }); mkdirSync(fr, { recursive: true });
  for (let i = 0; i < FPS * SEC; i++) {
    await page.evaluate((t) => window.__hud.seek(t), start + i / FPS);
    await page.screenshot({ path: path.join(fr, String(i).padStart(4, '0') + '.png') });
  }
  await page.close();
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(fr, '%04d.png'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(out, `LPL-S5-${name}.mp4`)]);
  rmSync(fr, { recursive: true, force: true });
  console.log('ok', name);
}
await browser.close();
