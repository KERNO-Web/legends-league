// Собирает ассеты из макета: картинки PDF (+маски) и белые логотипы из рендера.
// Запуск: npm run assets (нужны .work/extract/img-*.png и .work/full-1.png)
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const EX = '.work/extract/img-';
const OUT = 'public/img';
mkdirSync(`${OUT}/teams`, { recursive: true });
const n = (i) => `${EX}${String(i).padStart(3, '0')}.png`;

async function withMask(img, mask, out, { width, trim = false, q = 82 } = {}) {
  const c = await sharp(img).toColourspace('srgb').removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = c.info;
  const m = await sharp(mask).resize(w, h, { fit: 'fill' }).extractChannel(0).raw().toBuffer();
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0, j = 0; i < w * h; i++) {
    rgba[j++] = c.data[i * 3]; rgba[j++] = c.data[i * 3 + 1]; rgba[j++] = c.data[i * 3 + 2]; rgba[j++] = m[i];
  }
  let buf = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  if (trim) buf = await sharp(buf).trim({ threshold: 1 }).png().toBuffer();
  let s = sharp(buf);
  if (width) s = s.resize({ width, height: width, fit: 'inside', withoutEnlargement: true });
  await s.webp({ quality: q, alphaQuality: 90 }).toFile(out);
}

const teams = [
  'docisk', 'stuttgart', 'colossal', 'valerion',
  'dominion-goblins', 'francesinhas', 'bubliki', 'sawadika',
  'arctic-pandas', 'power-rangers', 'forsaken', 'zena',
  'wlg', 'bomba', 'regnum4games', 'cult-of-costom',
];
for (let k = 0; k < teams.length; k++) {
  const i = 18 + k * 2;
  await withMask(n(i), n(i + 1), `${OUT}/teams/${teams[k]}.webp`, { width: 320, trim: true });
}
await withMask(n(0), n(1), `${OUT}/crystal-hero.webp`, { width: 2172, q: 86 });
await withMask(n(50), n(51), `${OUT}/crystal-foot.webp`, { width: 1254, q: 86 });

// Белые логотипы: яркость пикселя -> альфа, цвет белый.
const RENDER = '.work/full-1.png';
const K = 4000 / 680; // px рендера на pt макета
async function whiteLogo(name, x, y, w, h, lo = 70, hi = 235) {
  const box = { left: Math.round(x * K), top: Math.round(y * K), width: Math.round(w * K), height: Math.round(h * K) };
  const g = await sharp(RENDER).extract(box).greyscale().raw().toBuffer({ resolveWithObject: true });
  const a = Buffer.alloc(g.data.length);
  for (let i = 0; i < a.length; i++) {
    const v = (g.data[i] - lo) / (hi - lo);
    a[i] = Math.max(0, Math.min(255, Math.round(v * 255)));
  }
  const white = Buffer.alloc(g.data.length * 3, 255);
  await sharp(white, { raw: { width: g.info.width, height: g.info.height, channels: 3 } })
    .joinChannel(a, { raw: { width: g.info.width, height: g.info.height, channels: 1 } })
    .png().toBuffer()
    .then((b) => sharp(b).trim({ threshold: 1 }).png().toFile(`${OUT}/${name}.png`));
}
await whiteLogo('lpl', 28, 12, 92, 36);
await whiteLogo('mionix', 112, 1768, 140, 44);
await whiteLogo('blacklyte', 326, 1768, 240, 44);
console.log('ok');
