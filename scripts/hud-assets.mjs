// Ассеты эфирного HUD из выгрузки Figma (design/hud/*) → public/hud/img.
// Арт сцен в 1920, маски светлых граней (куда ложится свет), кристаллы и персонажи с прозрачностью.
// node scripts/hud-assets.mjs
import sharp from 'sharp';
import { mkdirSync, copyFileSync } from 'node:fs';

const D = 'design/hud/', O = 'public/hud/img/';
mkdirSync(O, { recursive: true });

const art = { starting: 'starting/raw1.jpg', offline: 'offline/raw1.png', ending: 'ending/raw1.jpg', mvp: 'mvp/raw1.jpg', brb: 'raw/r13.jpg' };
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

async function mask(src, out, lo, hi) {
  const { data, info } = await sharp(src).resize(1920, 1080, { fit: 'cover' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = info.width * info.height, buf = Buffer.alloc(px * 4);
  for (let i = 0; i < px; i++) {
    const l = (0.2126 * data[i * 3] + 0.7152 * data[i * 3 + 1] + 0.0722 * data[i * 3 + 2]) / 255;
    buf[i * 4] = buf[i * 4 + 1] = buf[i * 4 + 2] = 255; buf[i * 4 + 3] = Math.round(sm(lo, hi, l) * 255);
  }
  await sharp(buf, { raw: { width: info.width, height: info.height, channels: 4 } }).blur(1.2).webp({ quality: 80, alphaQuality: 85 }).toFile(out);
}

for (const [k, f] of Object.entries(art)) {
  await sharp(D + f).resize(1920, 1080, { fit: 'cover' }).webp({ quality: 90 }).toFile(`${O}art-${k}.webp`);
  await mask(D + f, `${O}mask-${k}.webp`, 0.3, 0.78);
}
// фон расписаний/результатов: фиолетовая сцена с кристаллами по углам (прозрачные места заливаем базовым цветом)
await sharp(D + 'schedule4/raw02.png').flatten({ background: '#1c0f33' }).webp({ quality: 90 }).toFile(O + 'bg-stage.webp');
await mask(D + 'schedule4/raw02.png', O + 'mask-stage.webp', 0.3, 0.78);
// логотип: node scripts/hud-logo.mjs (снимает серый фон выгрузки Figma)
// кристаллы и персонажи — отдельные слои, их можно двигать
await sharp(D + 'raw/r01.png').trim().webp({ quality: 88, alphaQuality: 90 }).toFile(O + 'crystal-a.webp');
await sharp(D + 'raw/r02.png').trim().webp({ quality: 88, alphaQuality: 90 }).toFile(O + 'crystal-b.webp');
await sharp(D + 'schedule3/raw07.png').trim().resize({ height: 1200, withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 92 }).toFile(O + 'char-1.webp');
await sharp(D + 'schedule4/raw06.png').trim().resize({ height: 1200, withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 92 }).toFile(O + 'char-2.webp');

const svg = { 's02': 'accent', 's03': 'panel', 's05': 'line', 's06': 'mark', 's07': 'x-cross', 's08': 'mionix', 's09': 'x-mark', 's10': 'blacklyte' };
for (const [k, v] of Object.entries(svg)) copyFileSync(`${D}common/${k}.svg`, `${O}${v}.svg`);

for (const f of ['crystal-a', 'crystal-b', 'char-1', 'char-2']) {
  const m = await sharp(`${O}${f}.webp`).metadata(); console.log(f, m.width + 'x' + m.height);
}
console.log('hud assets ok');

// узор треугольников в левом верхнем углу (в Figma слой Pattern: плитка Mark + маска-градиент Fade)
{
  const tile = (x, y) => `<g transform="translate(${x} ${y}) scale(1.25)"><path d="M0 0H240L227 8H13L0 0Z M240 0L120 208V192L227 8L240 0Z M120 208L0 0L13 8L120 192V208Z M38 22.04H202L189 30.04H51L38 22.04Z M202 22.04L120 163.92V147.92L189 30.04L202 22.04Z M120 163.92L38 22.04L51 30.04L120 147.92V163.92Z" fill="#b9a6dc"/></g>`;
  let tiles = '';
  for (let y = -40; y < 1080; y += 260) for (let x = -60; x < 1920; x += 300) tiles += tile(x, y);
  const svgP = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
    <defs><linearGradient id="f" x1="266" y1="-91" x2="658" y2="685" gradientUnits="userSpaceOnUse">
      <stop stop-color="#fff" stop-opacity="0.6"/><stop offset="0.38" stop-color="#fff" stop-opacity="0.3"/><stop offset="0.72" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <mask id="m"><rect width="1920" height="1080" fill="url(#f)"/></mask></defs>
    <g mask="url(#m)" opacity="0.16">${tiles}</g></svg>`;
  await sharp(Buffer.from(svgP)).webp({ quality: 90, alphaQuality: 90 }).toFile(O + 'pattern.webp');
  console.log('pattern ok');
}
// кристальная рамка для расписания с одним матчем
await sharp(D + 'schedule1/raw3.png').trim().webp({ quality: 88, alphaQuality: 90 }).toFile(O + 'frame-crystal.webp');
