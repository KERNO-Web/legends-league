// Снимок расписания из Google-таблицы в src/schedule-snapshot.js (запасной вариант, если Google недоступен).
import fs from 'node:fs';
import { SHEET_URL as url } from '../src/schedule.js';
const res = await fetch(url);
if (!res.ok) throw new Error('sheet ' + res.status);
const csv = await res.text();
fs.writeFileSync('src/schedule-snapshot.js', `// Снимок вкладки «Match list» (${new Date().toISOString().slice(0, 16)}Z). Обновляется: npm run snapshot\nexport const SNAPSHOT_CSV = ${JSON.stringify(csv)};\n`);
console.log('snapshot ok', csv.split('\n').length, 'rows');
