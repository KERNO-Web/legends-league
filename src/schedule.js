// Расписание и счёт берутся из Google-таблицы организатора (вкладка «Match list»).
// Админ правит таблицу — сайт подхватывает при загрузке и раз в 2 минуты.
// Если Google недоступен, используется снимок SNAPSHOT_CSV (обновить: npm run snapshot).
import { TEAMS } from './data.js';
import { SNAPSHOT_CSV } from './schedule-snapshot.js';

export const SHEET_ID = '1vTxypUCtYqdDUHwvC9B90nLVG50ZRAl07A4haHOLUcI';
export const MATCH_GID = '322290857';
// export отдаёт ячейки как они видны в таблице. gviz угадывает тип колонки и молча выкидывает
// ячейки «не того» типа (счёт 2-0 среди 2:1, дату-текст среди дат), поэтому не он.
export const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${MATCH_GID}`;
const YEAR = 2026;
const CET_OFFSET = 1; // ноябрь–декабрь: CET = UTC+1

function parseCSV(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const BY_NAME = new Map();
TEAMS.forEach((t) => { BY_NAME.set(norm(t.name), t); BY_NAME.set(norm(t.slug), t); });
// написание в таблице, которое отличается от названий на сайте
[['zena', 'zena'], ['stuttgart', 'stuttgart'], ['vfb', 'stuttgart'], ['vfbstuttgart', 'stuttgart'], ['colossal', 'colossal'], ['bomba', 'bomba'], ['dominion', 'dominion-goblins'], ['cultofcostom', 'cult-of-costom']]
  .forEach(([k, slug]) => BY_NAME.set(k, TEAMS.find((t) => t.slug === slug)));

function team(name) {
  const n = norm(name);
  if (!n) return null;
  const hit = BY_NAME.get(n) || TEAMS.find((t) => norm(t.name).startsWith(n) || n.startsWith(norm(t.name)));
  return hit || { name: String(name).trim(), logo: null };
}

// «11 CET», «20:30 CET» → часы/минуты
function parseTime(s) {
  const m = String(s).match(/(\d{1,2})(?:[:.](\d{2}))?/);
  return m ? [+m[1], +(m[2] || 0)] : null;
}
// «2:1», «2-0», «1 : 2» → [2, 1]
function parseScore(s) {
  const m = String(s || '').match(/(\d+)\s*[:\-–]\s*(\d+)/);
  return m ? [+m[1], +m[2]] : null;
}

// Формат серии по колонке «Match type»: плей-офф и финалы — BO5, остальное (Swiss) — BO3.
// Явное «BO3»/«BO5» в ячейке важнее.
export function seriesBo(type) {
  const t = String(type || '').toLowerCase();
  const m = t.match(/bo\s*([1-9])/);
  if (m) return +m[1];
  return /play\s*-?\s*off|final/.test(t) ? 5 : 3;
}
// серия доиграна: у кого-то нужное число побед (BO3 — 2, BO5 — 3)
export const isDecided = (m) => !!m.score && Math.max(...m.score) >= Math.ceil(m.bo / 2);

const MONTHS =['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function buildDays(csv) {
  const rows = parseCSV(csv);
  const head = rows.shift() || [];
  const col = (name) => head.findIndex((h) => norm(h) === norm(name));
  const iType = col('Match type'), iDate = col('Date'), iTime = col('Time'), iA = col('Team 1'), iS = col('Score'), iB = col('Team2');
  const byDay = new Map();
  for (const r of rows) {
    const date = (r[iDate] || '').trim(), time = parseTime(r[iTime]);
    const dm = date.match(/^(\d{1,2})[./](\d{1,2})/);
    if (!dm || !time) continue; // строки без даты — будущие туры, пары ещё неизвестны
    const [d, mo] = [+dm[1], +dm[2]];
    const at = new Date(Date.UTC(YEAR, mo - 1, d, time[0] - CET_OFFSET, time[1]));
    const id = `${YEAR}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (!byDay.has(id)) byDay.set(id, { id, label: `${d} ${MONTHS[mo - 1]}`, matches: [] });
    byDay.get(id).matches.push({
      a: team(r[iA]), b: team(r[iB]), at,
      score: parseScore(r[iS]),
      type: (r[iType] || '').trim(),
      bo: seriesBo(r[iType]),
    });
  }
  return [...byDay.values()].sort((x, y) => x.id.localeCompare(y.id)).map((d) => ({ ...d, matches: d.matches.sort((x, y) => x.at - y.at) }));
}

export const snapshotDays = () => buildDays(SNAPSHOT_CSV);

export async function loadDays() {
  const res = await fetch(SHEET_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error('sheet ' + res.status);
  const days = buildDays(await res.text());
  if (!days.length) throw new Error('sheet empty');
  return days;
}
