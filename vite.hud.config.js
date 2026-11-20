// Отдельная сборка эфирного HUD (без сайта) — пакет для разработчиков лиги.
// npx vite build -c vite.hud.config.js  → release/LPL-S5-HUD/web
import { defineConfig } from 'vite';
import { resolve } from 'node:path';
const hud = ['index', 'starting', 'brb', 'offline', 'ending', 'schedule', 'results', 'mvp', 'casters', 'camera'];
export default defineConfig({
  base: './',
  publicDir: false,
  build: {
    outDir: 'release/LPL-S5-HUD/web',
    emptyOutDir: true,
    rollupOptions: { input: Object.fromEntries(hud.map((n) => [n, resolve(import.meta.dirname, `hud/${n}.html`)])) },
  },
});
