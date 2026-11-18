# Legends Premier League — лендинг Season 5

Vite + GSAP/ScrollTrigger + Lenis + свой WebGL-шейдер кристалла. Макет дизайнера: `design/Home.pdf`.

- `npm run dev` — :5195; `npm run build` — `dist/` с относительными путями (можно на GitHub Pages).
- Данные (команды, расписание, ссылки Twitch/правил, старт сезона): `src/data.js`.
- Ассеты из PDF: `npm run assets` (нужны `.work/extract` и `.work/full-1.png`, см. `scripts/assets.mjs`).
- Персонаж hero: `div.hero__character-slot` в `index.html` — вставить `<img>` туда.
- Пары матчей в `data.js` — заглушка до жеребьёвки.
