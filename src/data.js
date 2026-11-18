// Данные лендинга. Всё, что поменяет организатор, — здесь.

export const TWITCH_URL = 'https://www.twitch.tv/';
export const RULES_URL = '#';
// Сколько считаем матч идущим после начала (примерно BO3), минут
export const MATCH_MINUTES = 150;
export const SEASON_START = '2026-11-20T09:00:00Z'; // 20 NOV 10:00 CET

export const TEAMS = [
  ['docisk', 'DOCISK'],
  ['stuttgart', 'VfB eSports'],
  ['colossal', 'Colossal Gaming'],
  ['valerion', 'Valerion'],
  ['dominion-goblins', 'Dominion Goblins'],
  ['francesinhas', 'Francesinhas'],
  ['bubliki', 'Bubliki'],
  ['sawadika', 'Sawadika'],
  ['arctic-pandas', 'Arctic Pandas'],
  ['power-rangers', 'Power Rangers'],
  ['forsaken', 'Forsaken'],
  ['zena', 'Zena Esports'],
  ['wlg', 'WLG'],
  ['bomba', 'Bomba Team'],
  ['regnum4games', 'regnum4games'],
  ['cult-of-costom', 'Cult of C0st0m'],
].map(([slug, name]) => ({ slug, name, logo: `img/teams/${slug}.webp` }));

const T = Object.fromEntries(TEAMS.map((t) => [t.slug, t]));

// Время матчей в UTC. 09:00Z = 10:00 CET.
// Пары первого тура — заглушка до жеребьёвки, второй тур — после итогов первого.
export const DAYS = [
  {
    id: '2026-11-20', label: '20 NOV', round: 'Swiss · Round 1',
    matches: [
      ['docisk', 'colossal', '09:00'],
      ['stuttgart', 'valerion', '12:00'],
      ['dominion-goblins', 'francesinhas', '15:00'],
      ['bubliki', 'sawadika', '18:00'],
    ],
  },
  {
    id: '2026-11-21', label: '21 NOV', round: 'Swiss · Round 1',
    matches: [
      ['arctic-pandas', 'power-rangers', '09:00'],
      ['forsaken', 'zena', '12:00'],
      ['wlg', 'bomba', '15:00'],
      ['regnum4games', 'cult-of-costom', '18:00'],
    ],
  },
  {
    id: '2026-11-22', label: '22 NOV', round: 'Swiss · Round 2', pool: '1–0',
    matches: [[null, null, '09:00'], [null, null, '12:00'], [null, null, '15:00'], [null, null, '18:00']],
  },
  {
    id: '2026-11-23', label: '23 NOV', round: 'Swiss · Round 2', pool: '0–1',
    matches: [[null, null, '09:00'], [null, null, '12:00'], [null, null, '15:00'], [null, null, '18:00']],
  },
].map((d) => ({
  ...d,
  matches: d.matches.map(([a, b, utc]) => ({
    a: a ? T[a] : null,
    b: b ? T[b] : null,
    at: new Date(`${d.id}T${utc}:00Z`),
  })),
}));

export const ZONES = [
  { id: 'cet', label: 'CET', tz: 'Europe/Berlin' },
  { id: 'msk', label: 'MSK', tz: 'Europe/Moscow' },
  { id: 'local', label: 'Local', tz: undefined },
];
