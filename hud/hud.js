// Движок эфирного HUD: сцена 1920×1080, шапка/подвал, свет по арту, появление текста, петли.
// Движение в системе сайта: одна кривая .16,1,.3,1; вход ~2 с, дальше спокойные петли.
// В OBS: Browser Source по ссылке, 1920×1080. Вход проигрывается при каждом показе сцены.
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import './hud.css';
import { TEAMS } from '../src/data.js';
import { loadDays, snapshotDays, isDecided } from '../src/schedule.js';

gsap.registerPlugin(CustomEase);
CustomEase.create('main', '.16,1,.3,1');
export { gsap };

export const P = new URLSearchParams(location.search);
export const q = (k, d) => (P.get(k) ?? d);
export const $ = (s, r = document) => r.querySelector(s);
const NOW_SHIFT = (() => { const v = P.get('now'); const t = v && Date.parse(v); return t ? t - Date.now() : 0; })();
export const now = () => Date.now() + NOW_SHIFT;

// ---------- DOM ----------
export function el(tag, cls, parent, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}
export function at(e, x, y, w, h) {
  Object.assign(e.style, { left: x + 'px', top: y + 'px' });
  if (w != null) e.style.width = w + 'px';
  if (h != null) e.style.height = h + 'px';
  return e;
}
export function pic(src, cls, parent) { const i = el('img', cls, parent); i.src = src; i.alt = ''; i.decoding = 'async'; return i; }

// сцена, вписанная в окно (в OBS при 1920×1080 масштаб 1)
export function stage() {
  const s = el('div', 'stage', document.body);
  const fit = () => {
    const k = Math.min(innerWidth / 1920, innerHeight / 1080);
    s.style.transform = `translate(${(innerWidth - 1920 * k) / 2}px, ${(innerHeight - 1080 * k) / 2}px) scale(${k})`;
  };
  addEventListener('resize', fit); fit();
  if (P.has('bg')) document.body.classList.add('solid'); // для просмотра в браузере
  return s;
}

// ---------- арт со светом ----------
// art: имя арта (img/art-NAME.webp + img/mask-NAME.webp)
export function artScene(S, name, { video } = {}) {
  const wrap = el('div', 'layer', S);
  const art = pic(`img/art-${name}.webp`, 'art', wrap);
  const mask = `url(img/mask-${name}.webp)`;
  const lit = el('div', 'lit', wrap); lit.style.setProperty('--mask', mask);
  const sh = el('div', 'shimmer', lit); sh.style.backgroundImage = `url(img/art-${name}.webp)`;
  const litS = el('div', 'lit', wrap); litS.style.setProperty('--mask', mask);
  const sw = el('div', 'sweep', litS);
  if (video) tryVideo(wrap, art, video);
  return { wrap, art, shimmer: sh, sweep: sw, lit };
}
// живое видео-фон (например, из Kling), если файл лежит рядом; иначе остаётся картинка
function tryVideo(wrap, art, src) {
  const mk = () => { const v = el('video', 'art'); Object.assign(v, { src, muted: true, playsInline: true, preload: 'auto' }); v.muted = true; return v; };
  const a = mk(), b = mk();
  a.addEventListener('canplay', () => {
    wrap.insertBefore(a, art.nextSibling); wrap.insertBefore(b, a.nextSibling); art.style.opacity = 0;
    b.style.opacity = 0; a.play();
    // бесшовно: за 0.8 с до конца поверх запускается копия и плавно проявляется
    let cur = a, nxt = b;
    const tick = () => {
      if (cur.duration && cur.currentTime > cur.duration - 0.8 && nxt.paused) {
        nxt.currentTime = 0; nxt.play();
        gsap.fromTo(nxt, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'none', onComplete: () => { cur.pause(); cur.style.opacity = 0; [cur, nxt] = [nxt, cur]; } });
      }
      requestAnimationFrame(tick);
    };
    tick();
  }, { once: true });
  a.addEventListener('error', () => {}, { once: true });
}

// ---------- шапка и подвал ----------
export function logoBig(S) { const l = el('div', 'logo', S); pic('img/lpl.webp', '', l); return l; }
export function season(S) { const s = el('div', 'season', S, 'SEASON 5'); pic('img/accent.svg', '', s); return s; }
// малый логотип с «5 //» (экраны данных и рамки)
export function brand(S, x, y, w = 339) {
  const b = at(el('div', 'brand', S), x, y); b.style.height = (w * 0.3) + 'px';
  pic('img/lpl.webp', '', b).style.width = w + 'px';
  el('sup', '', b, '5'); pic('img/accent.svg', '', b.lastChild);
  return b;
}
export function social(S, x = 75, y = 986) {
  const s = at(el('div', 'social', S), x, y);
  const i = el('i', '', s); pic('img/x-mark.svg', '', i); pic('img/x-cross.svg', '', i);
  el('span', '', s, '@LegendsPLeague');
  return s;
}
export function sponsors(S, x = 1172, y = 976, sep = true) {
  const s = at(el('div', 'sponsors', S), x, y);
  const one = (src, w) => { const d = el('div', 'sp', s); const i = pic(src, '', d); i.style.width = w + 'px'; const h = el('i', 'holo', d); h.style.setProperty('--m', `url(${src})`); return d; };
  one('img/mionix.svg', 205);
  if (sep) el('i', 'sep', s);
  one('img/blacklyte.svg', 371);
  return s;
}

// ---------- текст ----------
// заголовок из строк; каждая буква отдельно — для входа
export function title(S, lines, x, y, size, cls = 'title', pitch) {
  const t = at(el('div', cls, S), x, y);
  if (size) t.style.fontSize = size + 'px';
  if (pitch) t.style.setProperty('--pitch', pitch + 'px');
  lines.forEach((ln) => {
    const l = el('span', 'ln', t); const inner = el('span', '', l);
    [...ln].forEach((c) => { el('span', 'ch', inner, c === ' ' ? '&nbsp;' : c); });
  });
  return t;
}
export function gline(S, x, y, w) {
  const g = at(el('div', 'gline', S), x, y, w);
  el('i', 'bar', g);
  g.insertAdjacentHTML('beforeend', '<svg class="tip" viewBox="0 0 23 17.93"><path d="M0 0L23 0L.04 17.93L6.9 4.01H0Z"/></svg><i class="spark"></i>');
  return g;
}

// ---------- эффекты ----------
const rnd = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

export function motes(S, n, box) {
  const L = el('div', 'layer', S);
  for (let i = 0; i < n; i++) {
    const r = 1.2 + rnd() * 2.4, warm = rnd() < 0.45, c = warm ? '255,214,160' : '255,214,250';
    const m = el('i', 'mote', L);
    Object.assign(m.style, { width: r * 2 + 'px', height: r * 2 + 'px', background: `radial-gradient(closest-side, rgba(${c},1), rgba(${c},0))`, boxShadow: `0 0 ${r * 4}px rgba(${c},.6)` });
    const x = box[0] + rnd() * box[2], y = box[1] + box[3] * (0.6 + rnd() * 0.4), rise = 250 + rnd() * 400, d = 7 + rnd() * 8;
    gsap.set(m, { x, y, opacity: 0 });
    const tl = gsap.timeline({ repeat: -1, delay: -rnd() * d });
    tl.to(m, { y: y - rise, x: x + (rnd() - 0.5) * 60, duration: d, ease: 'none' }, 0)
      .to(m, { opacity: 0.35 + rnd() * 0.5, duration: d * 0.3, ease: 'sine.out' }, 0)
      .to(m, { opacity: 0, duration: d * 0.4, ease: 'sine.in' }, d * 0.6);
  }
  return L;
}
// звёзды-вспышки: [x, y, масштаб]
export function flares(S, pts, every = 7) {
  return pts.map(([x, y, k = 1], i) => {
    const f = at(el('div', 'flare', S, '<b></b><s></s><u></u>'), x, y);
    gsap.set(f, { scale: k * 0.45, opacity: 0.3, rotation: rnd() * 20 - 10 });
    gsap.timeline({ repeat: -1, repeatDelay: every - 1.4, delay: 1.5 + i * (every / pts.length) })
      .to(f, { scale: k * 1.05, opacity: 1, rotation: '+=14', duration: 0.5, ease: 'sine.out' })
      .to(f, { scale: k * 0.45, opacity: 0.3, rotation: '+=10', duration: 0.9, ease: 'sine.in' });
    return f;
  });
}
// перелив: копия арта по светлым граням плавно сдвигает оттенок
export function shimmer(sh, amp = 26, dur = 9) {
  const o = { h: -amp };
  gsap.to(o, { h: amp, duration: dur, ease: 'sine.inOut', yoyo: true, repeat: -1, onUpdate: () => { sh.style.filter = `hue-rotate(${o.h.toFixed(1)}deg) saturate(1.15) brightness(1.08)`; } });
  gsap.fromTo(sh, { opacity: 0.35 }, { opacity: 0.7, duration: dur * 0.7, ease: 'sine.inOut', yoyo: true, repeat: -1 });
}
// фронт света по светлым граням; from/to — x центра полосы
export function sweep(sw, { delay = 0, dur = 2.4, every = 0, from = 500, to = 2300 } = {}) {
  const tl = gsap.timeline({ delay, repeat: every ? -1 : 0, repeatDelay: every });
  tl.set(sw, { opacity: 1, backgroundPosition: `${from - 2880}px 0` })
    .to(sw, { backgroundPosition: `${to - 2880}px 0`, duration: dur, ease: 'none' })
    .set(sw, { opacity: 0 });
  return tl;
}
// медленный «вдох» камеры по арту
export function drift(e, { s = 1.035, x = -14, y = -8, dur = 16 } = {}) {
  gsap.fromTo(e, { scale: 1, x: 0, y: 0 }, { scale: s, x, y, duration: dur, ease: 'sine.inOut', yoyo: true, repeat: -1 });
}
// парение слоя (кристаллы, персонажи)
export function float(e, { y = 12, r = 1.2, x = 0, dur = 6, delay = 0 } = {}) {
  gsap.to(e, { y: `+=${y}`, x: `+=${x}`, rotation: `+=${r}`, duration: dur, ease: 'sine.inOut', yoyo: true, repeat: -1, delay });
}
// holo-волна по спонсорам — как по логотипам команд на сайте
export function holo(sp, { delay = 2.4, every = 9 } = {}) {
  const hs = [...sp.querySelectorAll('.holo')];
  const tl = gsap.timeline({ delay, repeat: -1, repeatDelay: every });
  hs.forEach((h, i) => {
    tl.fromTo(h, { backgroundPosition: '-1600px 0', opacity: 0 }, { backgroundPosition: '0px 0', duration: 1.5, ease: 'sine.inOut' }, i * 0.25)
      .to(h, { opacity: 1, duration: 0.5, ease: 'sine.out' }, i * 0.25)
      .to(h, { opacity: 0, duration: 0.6, ease: 'sine.in' }, i * 0.25 + 0.9);
  });
  return tl;
}
// блик бежит по золотой линии
export function lineSpark(g, { delay = 3, every = 8 } = {}) {
  const sp = g.querySelector('.spark'), w = g.offsetWidth || parseFloat(g.style.width);
  gsap.timeline({ delay, repeat: -1, repeatDelay: every })
    .fromTo(sp, { x: 0, opacity: 0 }, { x: w, duration: 1.3, ease: 'power1.inOut' })
    .to(sp, { opacity: 1, duration: 0.35, ease: 'sine.out' }, 0)
    .to(sp, { opacity: 0, duration: 0.4, ease: 'sine.in' }, 0.9);
}
// блик по буквам заголовка: светлая полоса проходит по тексту
export function titleGlint(t, { delay = 2, every = 10 } = {}) {
  const chars = [...t.querySelectorAll('.ch')];
  const tl = gsap.timeline({ delay, repeat: -1, repeatDelay: every });
  chars.forEach((c, i) => {
    tl.to(c, { color: '#fff8e6', textShadow: '0 0 14px rgba(255,214,150,.45)', duration: 0.16, ease: 'sine.out' }, i * 0.06)
      .to(c, { color: '#f2ede0', textShadow: '0 0 0px rgba(255,214,150,0)', duration: 0.45, ease: 'sine.in' }, i * 0.06 + 0.16);
  });
  return tl;
}

// ---------- вход ----------
// буквы поднимаются из-под маски с лёгким размытием и фиолетовым отливом
export function inTitle(tl, t, pos = 0) {
  t.querySelectorAll('.ln > span').forEach((ln, li) => {
    tl.fromTo(ln.querySelectorAll('.ch'), { yPercent: 105, filter: 'blur(6px)', color: '#c79bff' },
      { yPercent: 0, filter: 'blur(0px)', color: '#f2ede0', duration: 0.9, ease: 'main', stagger: 0.03 }, pos + li * 0.14);
  });
}
export function inLine(tl, g, pos) {
  tl.fromTo(g.querySelector('.bar'), { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: 'main' }, pos)
    .fromTo(g.querySelector('.tip'), { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.35, ease: 'main' }, pos + 0.45);
}
export function inFade(tl, els, pos, { y = 14, stagger = 0.06, dur = 0.6 } = {}) {
  tl.fromTo(els, { opacity: 0, y }, { opacity: 1, y: 0, duration: dur, ease: 'main', stagger }, pos);
}
export function inSub(tl, e, pos) {
  tl.fromTo(e, { opacity: 0, letterSpacing: '0.2em', filter: 'blur(4px)' }, { opacity: 1, letterSpacing: '0.005em', filter: 'blur(0px)', duration: 1, ease: 'main' }, pos);
}
// арт «пробуждается»: из темноты и чуть ближе
export function inArt(tl, wrap, pos = 0) {
  tl.fromTo(wrap, { opacity: 0, scale: 1.06, filter: 'brightness(.35) saturate(.6)' }, { opacity: 1, scale: 1, filter: 'brightness(1) saturate(1)', duration: 1.6, ease: 'main' }, pos);
}

// повторить вход, когда OBS снова показывает сцену (без перезагрузки источника)
export function replayOnShow(tl) {
  // ?t=0.8 — заморозить вход на этой секунде (для проверки кадров)
  if (P.has('t')) { const t = +P.get('t'); gsap.globalTimeline.getChildren(true, false, true).forEach((x) => x.pause()); tl.seek(t).pause(); return; }
  addEventListener('obsSourceActiveChanged', (e) => { if (e.detail?.active) tl.restart(); });
  addEventListener('obsSourceVisibleChanged', (e) => { if (e.detail?.visible) tl.restart(); });
}

// ---------- данные из таблицы ----------
export const teamLogo = (t) => (t?.logo ? '../' + t.logo : null);
export const BY_SLUG = Object.fromEntries(TEAMS.map((t) => [t.slug, t]));
// живые данные из таблицы; если Google не ответил за 5 с — сохранённый снимок, чтобы экран не стоял пустым
export async function days() {
  const slow = new Promise((r) => setTimeout(() => r(null), 5000));
  try { return (await Promise.race([loadDays(), slow])) || snapshotDays(); } catch { return snapshotDays(); }
}
export { isDecided };
const CET = 'Europe/Berlin';
export const fmtTime = (d) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: CET }).format(d);
export const fmtLongDay = (d) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: CET }).format(d).toUpperCase();
export const dayId = (d) => new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: CET }).format(d);
// ?day=20.11 → id дня; иначе «сегодня» по CET
export function wantedDay() {
  const v = P.get('day'); const m = v && v.match(/(\d{1,2})[./](\d{1,2})/);
  return m ? `2026-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : dayId(new Date(now()));
}
