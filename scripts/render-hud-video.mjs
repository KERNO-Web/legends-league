// MP4-петли полноэкранных заставок HUD для OBS (Media Source, Loop).
// Время сцены останавливается и выставляется покадрово, поэтому видео ровное, без пропусков.
// Петля: берём L+X секунд после входа и последние X секунд плавно перетекают в первые — стык не виден.
// node scripts/render-hud-video.mjs [base_url] [сцены через запятую]
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const base = process.argv[2] || 'http://localhost:5197/hud/';
const only = (process.argv[3] || 'starting,brb,offline,ending').split(',');
const FPS = 30, L = 20, X = 1.5; // длина петли и длина стыка, с
const outDir = path.resolve('release/LPL-S5-HUD/video');
mkdirSync(outDir, { recursive: true });

const cache = path.join(homedir(), 'Library/Caches/ms-playwright');
const shell = readdirSync(cache).filter((d) => d.startsWith('chromium_headless_shell')).sort().pop();
const browser = await chromium.launch({ executablePath: path.join(cache, shell, 'chrome-headless-shell-mac-arm64/chrome-headless-shell') });

const names = { starting: 'LPL-S5-Starting-Soon', brb: 'LPL-S5-Be-Right-Back', offline: 'LPL-S5-Offline', ending: 'LPL-S5-Thanks-For-Watching' };
for (const scene of only) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(`${base}${scene}.html?panel=0`);
  await page.waitForTimeout(5000);
  const start = await page.evaluate(() => window.__hud.now());
  const fr = path.resolve(`.work/hud-frames/${scene}`);
  rmSync(fr, { recursive: true, force: true }); mkdirSync(fr, { recursive: true });
  const N = Math.round((L + X) * FPS);
  for (let i = 0; i < N; i++) {
    await page.evaluate((t) => window.__hud.seek(t), start + i / FPS); // start ≈ 5 с: вход уже закончился
    await page.screenshot({ path: path.join(fr, String(i).padStart(4, '0') + '.png') });
  }
  await page.close();
  const raw = path.join(fr, 'raw.mp4');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(fr, '%04d.png'), '-c:v', 'libx264', '-crf', '12', '-pix_fmt', 'yuv420p', raw]);
  // стык: хвост [L, L+X] растворяется в начало [0, X], дальше [X, L]
  const out = path.join(outDir, `${names[scene]}-loop-1080p.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-filter_complex',
    `[0:v]split=3[a][b][c];[a]trim=start=${L}:end=${L + X},setpts=PTS-STARTPTS[tail];[b]trim=start=0:end=${X},setpts=PTS-STARTPTS[head];` +
    `[c]trim=start=${X}:end=${L},setpts=PTS-STARTPTS[mid];[tail][head]xfade=transition=fade:duration=${X}:offset=0[x];[x][mid]concat=n=2:v=1[v]`,
    '-map', '[v]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
  console.log('ok', out);
}
await browser.close();
