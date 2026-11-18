// Ассеты второй версии макета (design/v2/Home.pdf): персонаж, фон за ним, заставка трансляции, кристаллы футера.
// Нужен .work/v2/extract (pdfimages -png design/v2/Home.pdf .work/v2/extract/img).
import sharp from 'sharp';
const n = (i) => `.work/v2/extract/img-${String(i).padStart(3, '0')}.png`;
async function withMask(img, mask, out, { width, q = 84, aq = 90, flop = false } = {}) {
  const c = await sharp(img).toColourspace('srgb').removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = c.info;
  const m = await sharp(mask).resize(w, h, { fit: 'fill' }).extractChannel(0).raw().toBuffer();
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0, j = 0; i < w * h; i++) { rgba[j++] = c.data[i * 3]; rgba[j++] = c.data[i * 3 + 1]; rgba[j++] = c.data[i * 3 + 2]; rgba[j++] = m[i]; }
  let s = sharp(rgba, { raw: { width: w, height: h, channels: 4 } });
  if (flop) s = s.flop();
  if (width) s = s.resize({ width });
  await s.webp({ quality: q, alphaQuality: aq }).toFile(out);
}
// img-000 — фиолетовое свечение (заменено CSS-градиентом); персонаж — img-002, в макете отражён по горизонтали
await withMask(n(2), n(3), 'public/img/hero-character.webp', { width: 1800, q: 78, aq: 60, flop: true });
await withMask(n(52), n(53), 'public/img/watch-offline.webp', { width: 1600, q: 80 });
await withMask(n(54), n(55), 'public/img/foot-left.webp', { width: 2499 });
await withMask(n(56), n(57), 'public/img/foot-right.webp', { width: 2837 });
console.log('ok');

// логотипы команд из нового макета (в v2 индексы сдвинуты на +2)
const teams = ['docisk', 'stuttgart', 'colossal', 'valerion', 'dominion-goblins', 'francesinhas', 'bubliki', 'sawadika',
  'arctic-pandas', 'power-rangers', 'forsaken', 'zena', 'wlg', 'bomba', 'regnum4games', 'cult-of-costom'];
for (let k = 0; k < teams.length; k++) {
  const i = 20 + k * 2;
  const tmp = `.work/v2/logo-${k}.png`;
  const c = await sharp(n(i)).toColourspace('srgb').removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = c.info;
  const m = await sharp(n(i + 1)).resize(w, h, { fit: 'fill' }).extractChannel(0).raw().toBuffer();
  const rgba = Buffer.alloc(w * h * 4);
  for (let p = 0, j = 0; p < w * h; p++) { rgba[j++] = c.data[p * 3]; rgba[j++] = c.data[p * 3 + 1]; rgba[j++] = c.data[p * 3 + 2]; rgba[j++] = m[p]; }
  await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).png().toFile(tmp);
  await sharp(tmp).trim({ threshold: 1 }).resize({ width: 320, height: 320, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82, alphaQuality: 90 }).toFile(`public/img/teams/${teams[k]}.webp`);
}
console.log('logos ok');
