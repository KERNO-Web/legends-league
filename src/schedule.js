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
  // по началу названия — только от 4 букв, иначе «W» станет WLG, а «B» — Bubliki
  const hit = BY_NAME.get(n) || (n.length >= 4 && TEAMS.find((t) => norm(t.name).startsWith(n) || n.startsWith(norm(t.name))));
  return hit || { name: String(name).trim(), logo: null };
}

// «11 CET», «20:30 CET», «18 MSK», «8 PM CET» → часы/минуты по CET
function parseTime(s) {
  const str = String(s || '');
  const m = str.match(/(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?/i);
  if (!m) return null;
  let h = +m[1]; const mi = +(m[2] || 0), ap = (m[3] || '').toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (/msk/i.test(str)) h -= 2; // MSK = CET + 2 (зимой)
  if (h > 23 || mi > 59) return null;
  return [h, mi];
}
// «2:1», «2-0», «1 : 2», «2:01:00» (Sheets сделал из 2:1 время) → [2, 1]. Только вся ячейка целиком:
// дату вроде «2026-02-01» или «1/2/2026» (Sheets сделал из 1-2 дату) за счёт не принимаем.
function parseScore(s) {
  const m = String(s || '').trim().match(/^(\d)\s*[:\-–]\s*(\d{1,2})(?::00)?$/);
  if (!m) return null;
  const sc = [+m[1], +m[2]];
  return sc[0] <= 5 && sc[1] <= 5 ? sc : null;
}
// «20.11», «20/11», «20.11.2026», «Fri 21.11» → [день, месяц]
function parseDate(s) {
  const m = String(s || '').match(/(\d{1,2})[./](\d{1,2})(?:[./]\d{2,4})?/);
  if (!m) return null;
  const d = +m[1], mo = +m[2];
  return d >= 1 && d <= 31 && mo >= 1 && mo <= 12 ? [d, mo] : null;
}

// Формат серии по колонке «Match type»: плей-офф (любые bracket, полуфиналы, финалы) — BO5, Swiss — BO3.
// Явное «BO3»/«BO5» в ячейке важнее — надёжнее всего писать его прямо в таблицу.
export function seriesBo(type) {
  const t = String(type || '').toLowerCase();
  const m = t.match(/bo\s*([1-9])/);
  if (m) return +m[1];
  return /play\s*-?\s*off|final|bracket|upper|lower|semi|quarter|grand|decider/.test(t) ? 5 : 3;
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
    const dm = parseDate(date);
    if (!dm || !time) {
      // без даты — будущие туры, пары неизвестны; а дата есть, но не разобралась — сообщаем
      if (date && typeof console !== 'undefined') console.warn('LPL: строка таблицы не разобрана', r.slice(0, 8).join(' | '));
      continue;
    }
    const [d, mo] = dm;
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

// таблица отдала именно таблицу (а не страницу входа Google, если доступ закроют)
export const looksLikeSheet = (csv) => /match\s*type/i.test(String(csv).split('\n')[0] || '');

export async function loadDays() {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  let text;
  try {
    const res = await fetch(SHEET_URL, { cache: 'no-store', signal: ctl.signal });
    if (!res.ok) throw new Error('sheet ' + res.status);
    text = await res.text();
  } finally { clearTimeout(timer); }
  if (!looksLikeSheet(text)) throw new Error('sheet not csv');
  const days = buildDays(text);
  if (!days.length) throw new Error('sheet empty');
  return days;
}
