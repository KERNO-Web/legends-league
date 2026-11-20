// Сверка куска сцены: сверху макет, снизу моя вёрстка.
// node scripts/hud-cmp.mjs brb x y w h [ширина_выхода]
import sharp from 'sharp';
const [name, x, y, w, h, outW = '700'] = process.argv.slice(2);
const r = { left: +x, top: +y, width: +w, height: +h };
const a = await sharp(`design/hud/ref/${name}.webp`).resize(1920, 1080).extract(r).png().toBuffer();
const b = await sharp(`.work/hud/${name}.png`).extract(r).png().toBuffer();
const stack = await sharp({ create: { width: +w, height: +h * 2 + 6, channels: 3, background: '#ff0' } })
  .composite([{ input: a, top: 0, left: 0 }, { input: b, top: +h + 6, left: 0 }]).png().toBuffer();
await sharp(stack).resize(+outW).jpeg({ quality: 82 }).toFile(`.work/hud/${name}-cmp.jpg`);
console.log(`.work/hud/${name}-cmp.jpg`);
