// Снимок расписания из Google-таблицы в src/schedule-snapshot.js (запасной вариант, если Google недоступен).
import fs from 'node:fs';
import { SHEET_URL as url, looksLikeSheet } from '../src/schedule.js';
const res = await fetch(url);
if (!res.ok) throw new Error('sheet ' + res.status);
const csv = await res.text();
// страница входа вместо таблицы — снимок не трогаем, сборка идёт со старым
if (!looksLikeSheet(csv)) { console.error('snapshot SKIPPED: Google вернул не таблицу, оставлен прежний снимок'); process.exit(0); }
fs.writeFileSync('src/schedule-snapshot.js', `// Снимок вкладки «Match list» (${new Date().toISOString().slice(0, 16)}Z). Обновляется: npm run snapshot\nexport const SNAPSHOT_CSV = ${JSON.stringify(csv)};\n`);
console.log('snapshot ok', csv.split('\n').length, 'rows');
