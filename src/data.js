// Данные лендинга. Всё, что поменяет организатор, — здесь.

export const TWITCH_URL = 'https://www.twitch.tv/';
export const RULES_URL = '#';
// Сколько считаем матч идущим после начала (примерно BO3), минут
export const MATCH_MINUTES = 150;
export const SEASON_START = '2026-11-20T10:00:00Z'; // первый матч: 20 NOV 11:00 CET

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

// Расписание и счёт — из Google-таблицы организатора, см. src/schedule.js

export const ZONES = [
  { id: 'cet', label: 'CET', tz: 'Europe/Berlin' },
  { id: 'msk', label: 'MSK', tz: 'Europe/Moscow' },
  { id: 'local', label: 'Local', tz: undefined },
];
