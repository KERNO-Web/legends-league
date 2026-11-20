import { defineConfig } from 'vite';
import { resolve } from 'node:path';
// сайт + эфирный HUD (hud/*.html — источники для OBS)
const hud = ['index', 'starting', 'brb', 'offline', 'ending', 'schedule', 'results', 'mvp', 'casters', 'camera'];
export default defineConfig({
  base: './',
  server: { port: 5195, strictPort: true },
  build: {
    rollupOptions: {
      input: { main: resolve(import.meta.dirname, 'index.html'), ...Object.fromEntries(hud.map((n) => [`hud-${n}`, resolve(import.meta.dirname, `hud/${n}.html`)])) },
    },
  },
});
