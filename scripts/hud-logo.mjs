// логотип из Figma выгрузился на сером фоне: делаем фон прозрачным (логотип одноцветный кремовый)
import sharp from 'sharp';
const { data, info } = await sharp('design/hud/common/lpl-logo@2x.png').removeAlpha().raw().toBuffer({ resolveWithObject: true });
const px = info.width * info.height; let bg = 255;
for (let i = 0; i < px; i++) bg = Math.min(bg, data[i * 3 + 1]);
const out = Buffer.alloc(px * 4);
for (let i = 0; i < px; i++) {
  const l = data[i * 3 + 1], a = Math.max(0, Math.min(1, (l - bg) / (237 - bg)));
  out[i * 4] = 242; out[i * 4 + 1] = 237; out[i * 4 + 2] = 224; out[i * 4 + 3] = Math.round(a * 255);
}
await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).webp({ quality: 95, alphaQuality: 100 }).toFile('public/hud/img/lpl.webp');
console.log('bg', bg, info.width, info.height);
