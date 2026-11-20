// Скриншот сцены HUD и наложение на макет для сверки.
// node scripts/hud-shot.mjs brb [ждать_мс] [query]  → .work/hud/brb.png + brb-vs.jpg (50/50 с макетом)
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { readdirSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const [name, wait = '3500', query = ''] = process.argv.slice(2);
const cache = path.join(homedir(), 'Library/Caches/ms-playwright');
const shell = readdirSync(cache).filter((d) => d.startsWith('chromium_headless_shell')).sort().pop();
const browser = await chromium.launch({ executablePath: path.join(cache, shell, 'chrome-headless-shell-mac-arm64/chrome-headless-shell') });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const base = process.env.HUD_URL || 'http://localhost:5195/hud/';
await page.goto(`${base}${name}.html${query ? '?' + query : ''}`);
await page.waitForTimeout(+wait);
mkdirSync('.work/hud', { recursive: true });
const out = `.work/hud/${name}${query ? '-' + query.replace(/[^a-z0-9]+/gi, '_').slice(0, 30) : ''}.png`;
await page.screenshot({ path: out });
await browser.close();
const ref = `design/hud/ref/${name}.webp`;
if (existsSync(ref)) {
  const top = await sharp(out).removeAlpha().ensureAlpha(0.5).png().toBuffer();
  const mix = await sharp(ref).resize(1920, 1080).composite([{ input: top, blend: 'over' }]).png().toBuffer();
  await sharp(mix).resize(1280).jpeg({ quality: 82 }).toFile(out.replace('.png', '-vs.jpg'));
}
console.log(out, errs.length ? 'ERRORS: ' + errs.join(' | ') : 'no errors');
