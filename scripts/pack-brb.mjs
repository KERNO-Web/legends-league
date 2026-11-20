// Собирает broadcast/brb/brb.html в один самодостаточный файл: картинка и маски внутри (data:).
// Так OBS не упрётся в запрет локальных масок и файл можно переслать одним куском.
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';

const dir = 'broadcast/brb/';
const uri = async (file, alpha) => {
  const buf = await sharp(dir + file).webp(alpha ? { quality: 82, alphaQuality: 90 } : { quality: 92 }).toBuffer();
  return `data:image/webp;base64,${buf.toString('base64')}`;
};
const map = {
  'bg.webp': `data:image/webp;base64,${readFileSync(dir + 'bg.webp').toString('base64')}`,
  'mask-light.png': await uri('mask-light.png', true),
  'mask-logo.png': await uri('mask-logo.png', true),
};
let html = readFileSync(dir + 'brb.html', 'utf8');
for (const [k, v] of Object.entries(map)) html = html.split(`url(${k})`).join(`url(${v})`).split(`src="${k}"`).join(`src="${v}"`);
html = html.replace('Картинка лежит рядом (bg.webp + две маски), папку держать целиком.', 'Картинка и маски вшиты в файл, больше ничего не нужно.');
writeFileSync(dir + 'LPL-S5-BRB.html', html);
console.log('packed', (html.length / 1024 / 1024).toFixed(2), 'MB');
