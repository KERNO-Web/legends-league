import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { initCrystal } from './fx/crystal.js';
import { splitChars, scramble, buildRoll } from './fx/text.js';
import { TEAMS, DAYS, ZONES, TWITCH_URL, RULES_URL, SEASON_START } from './data.js';

gsap.registerPlugin(ScrollTrigger);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
document.documentElement.classList.add('js');

/* ---------------- smooth scroll ---------------- */
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ duration: 1.15, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
const scrollTo = (target) => {
  const el = typeof target === 'string' ? $(target) : target;
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: el.id === 'overview' ? 0 : -70, duration: 1.6 });
  else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
};
$$('a[href^="#"]').forEach((a) => {
  const id = a.getAttribute('href');
  if (id.length < 2) return;
  a.addEventListener('click', (e) => { e.preventDefault(); closeMenu(); scrollTo(id); });
});

/* ---------------- ссылки ---------------- */
$$('[data-twitch]').forEach((a) => { a.href = TWITCH_URL; a.target = '_blank'; a.rel = 'noopener'; });
const rules = $('[data-rules]');
if (rules) rules.href = RULES_URL;

/* ---------------- фон: свечение за курсором ---------------- */
const root = document.documentElement;
if (fine) {
  addEventListener('pointermove', (e) => {
    root.style.setProperty('--gx', e.clientX + 'px');
    root.style.setProperty('--gy', e.clientY + 'px');
  }, { passive: true });
}

/* ---------------- hero: кристалл ---------------- */
const crystal = (() => {
  try { return initCrystal($('[data-crystal]'), { src: 'img/crystal-hero.webp', reduced }); }
  catch (err) { console.warn(err); return null; }
})();
if (!crystal) root.classList.add('no-gl');

// «05» подсвечивается призмой там, где курсор
const num = $('[data-num]');
if (fine && num) {
  addEventListener('pointermove', (e) => {
    const r = num.getBoundingClientRect();
    num.style.setProperty('--mx', e.clientX - r.left + 'px');
    num.style.setProperty('--my', e.clientY - r.top + 'px');
  }, { passive: true });
}

/* ---------------- интро ---------------- */
const heroChars = $$('[data-split]').flatMap((w) => {
  const chars = [];
  const text = w.textContent; w.textContent = '';
  for (const ch of text) { const c = document.createElement('span'); c.className = 'char'; c.textContent = ch; w.append(c); chars.push(c); }
  return chars;
});
// блик: у каждой буквы свой кусок общего градиента, двигаем переменной --g
function layoutGlint() {
  const w = document.querySelector('.word--glint'); if (!w) return;
  const W = w.offsetWidth;
  w.querySelectorAll('.char').forEach((c) => {
    c.style.backgroundSize = (W * 3) + 'px 100%';
    c.style.backgroundPosition = 'calc((var(--g) - 1) * ' + (W * 2) + 'px - ' + c.offsetLeft + 'px) 0';
  });
}
layoutGlint();
document.fonts?.ready.then(layoutGlint);
addEventListener('resize', layoutGlint);

function heroIn(delay = 0) {
  const tl = gsap.timeline({ delay });
  tl.to('.eyebrow', { opacity: 1, duration: 0.6 }, 0)
    .fromTo('.eyebrow', { x: -20 }, { x: 0, duration: 0.9, ease: 'expo.out' }, 0)
    .to(heroChars, { y: '0%', duration: 1.1, ease: 'expo.out', stagger: { each: 0.035 } }, 0.05)
    .fromTo(heroChars, { rotate: 8, transformOrigin: '0% 100%' }, { rotate: 0, duration: 1.1, ease: 'expo.out', stagger: 0.035 }, 0.05)
    .to('.word--glint', { '--g': 1, duration: 1.6, ease: 'power2.inOut' }, 0.6)
    .to('.hero__lead, .hero__dates, .hero__cta', { opacity: 1, duration: 0.8, stagger: 0.1 }, 0.5)
    .fromTo('.hero__lead, .hero__dates, .hero__cta', { y: 24 }, { y: 0, duration: 1, ease: 'expo.out', stagger: 0.1 }, 0.5)
    .to('.hero__arrow-line', { strokeDashoffset: 0, duration: 0.9, ease: 'power3.inOut' }, 0.9)
    .fromTo('.hero__arrow-head', { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.5, ease: 'back.out(3)' }, 1.6)
    .to('.stats', { opacity: 1, duration: 0.6 }, 0.85)
    .fromTo('.stats', { y: 40 }, { y: 0, duration: 1.2, ease: 'expo.out' }, 0.85)
    .add(statsIn, 1.0);
  if (crystal) tl.to(crystal, { intro: 1, duration: 2.2, ease: 'power2.inOut' }, 0);
  return tl;
}

function intro() {
  if (reduced || sessionStorage.getItem('lpl-intro')) {
    root.classList.add('no-intro');
    if (reduced) { gsap.set([...heroChars], { y: '0%' }); gsap.set('[data-hero-in], .stats, .eyebrow', { opacity: 1 }); gsap.set('.hero__arrow-line', { strokeDashoffset: 0 }); gsap.set('.hero__arrow-head', { opacity: 1 }); gsap.set('.word--glint', { '--g': 1 }); if (crystal) crystal.intro = 1; statsIn(true); }
    else heroIn(0.1);
    return;
  }
  sessionStorage.setItem('lpl-intro', '1');
  lenis?.stop();
  const tl = gsap.timeline({ onComplete: () => { root.classList.add('no-intro'); lenis?.start(); } });
  tl.to('.intro__logo', { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0.1)
    .fromTo('.intro__logo', { scale: 0.92, filter: 'blur(6px)' }, { scale: 1, filter: 'blur(0px)', duration: 0.9, ease: 'expo.out' }, 0.1)
    .to('.intro__blade', { scaleX: 1, duration: 0.55, ease: 'expo.in' }, 0.75)
    .to('.intro__logo', { opacity: 0, scale: 1.08, duration: 0.3 }, 1.2)
    .to('.intro__half--a', { xPercent: -6, yPercent: -100, duration: 1.2, ease: 'expo.inOut' }, 1.3)
    .to('.intro__half--b', { xPercent: 6, yPercent: 100, duration: 1.2, ease: 'expo.inOut' }, 1.3)
    .to('.intro__blade', { opacity: 0, duration: 0.6 }, 1.45)
    .add(heroIn(), 1.6);
}

/* ---------------- stats ---------------- */
const rollCols = $$('[data-roll]').flatMap(buildRoll);
let statsDone = false;
function statsIn(instant) {
  if (statsDone) return; statsDone = true;
  rollCols.forEach((col, i) => {
    const steps = +col.dataset.steps;
    gsap.fromTo(col, { yPercent: 0 }, { yPercent: (-100 * steps) / (steps + 1), duration: instant === true ? 0 : 1.6 + i * 0.12, ease: 'expo.out' });
  });
  $$('.stats [data-scramble]').forEach((el, i) => instant === true || scramble(el, { duration: 900, delay: 200 + i * 160 }));
  gsap.fromTo('.stats__item', { '--d': 0 }, { '--d': 1, duration: 1, ease: 'expo.out', stagger: 0.1 });
  traceShape($('[data-stats]'), 0.2);
}

// световой бегунок по контуру формы с фаской
function traceShape(el, delay = 0) {
  const svg = el && $('.shape__trace', el);
  if (!svg || reduced) return;
  const { width: w, height: h } = el.getBoundingClientRect();
  const c = parseFloat(getComputedStyle(el).getPropertyValue('--c')) || 12;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.innerHTML = `<path d="M0.5 0.5H${w - c}L${w - 0.5} ${c}V${h - c}L${w - c} ${h - 0.5}H0.5Z" pathLength="1000"/>`;
  const p = svg.firstChild;
  gsap.fromTo(p, { strokeDasharray: '120 880', strokeDashoffset: 0, opacity: 1 },
    { strokeDashoffset: -1000, duration: 2.4, delay, ease: 'power2.inOut', onComplete: () => gsap.to(p, { opacity: 0, duration: 0.4 }) });
}

/* ---------------- hero уход при скролле ---------------- */
ScrollTrigger.create({
  trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true,
  onUpdate: (s) => {
    if (crystal) crystal.scroll = s.progress;
    gsap.set('.hero__content', { y: s.progress * -80, opacity: 1 - s.progress * 1.3 });
    gsap.set('.hero__num', { y: s.progress * 160, x: s.progress * -60 });
  },
});

/* ---------------- навигация ---------------- */
const nav = $('[data-nav]');
const ink = $('.nav__ink');
const links = $$('[data-link]');
function moveInk(a) {
  if (!a || !ink) return;
  const pr = a.parentElement.getBoundingClientRect(), r = a.getBoundingClientRect();
  ink.style.width = r.width + 'px';
  ink.style.transform = `translateX(${r.left - pr.left}px)`;
}
let lastY = 0;
ScrollTrigger.create({
  start: 0, end: 'max',
  onUpdate: (s) => {
    const y = s.scroll();
    nav.classList.toggle('is-stuck', y > 40);
    nav.classList.toggle('is-hidden', y > 400 && y > lastY && !root.classList.contains('menu-open'));
    lastY = y;
    nav.style.setProperty('--p', s.progress.toFixed(4));
    root.style.setProperty('--sp', s.progress.toFixed(4));
  },
});
$$('[data-section]').forEach((sec) => {
  ScrollTrigger.create({
    trigger: sec, start: 'top 45%', end: 'bottom 45%',
    onToggle: (s) => {
      if (!s.isActive) return;
      links.forEach((l) => l.classList.toggle('is-active', l.dataset.link === sec.dataset.section));
      moveInk(links.find((l) => l.dataset.link === sec.dataset.section));
    },
  });
});
addEventListener('load', () => moveInk($('.nav__links a.is-active')));
document.fonts?.ready.then(() => moveInk($('.nav__links a.is-active')));
addEventListener('resize', () => moveInk($('.nav__links a.is-active')));

// меню: две диагональные шторки
const menuBtn = $('[data-menu-btn]');
const menuTl = gsap.timeline({ paused: true })
  .fromTo('.menu__panel--a', { clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }, { clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', duration: 0.7, ease: 'expo.inOut' }, 0)
  .fromTo('.menu__panel--b', { clipPath: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)' }, { clipPath: 'polygon(62% 0, 100% 0, 100% 100%, 38% 100%)', duration: 0.8, ease: 'expo.inOut' }, 0.08)
  .fromTo('.menu__list a', { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.05 }, 0.35)
  .fromTo('.menu__foot', { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.6);
function openMenu() {
  root.classList.add('menu-open'); menuBtn.setAttribute('aria-expanded', 'true'); $('[data-menu]').setAttribute('aria-hidden', 'false');
  lenis?.stop(); menuTl.timeScale(1).play();
}
function closeMenu() {
  if (!root.classList.contains('menu-open')) return;
  menuBtn.setAttribute('aria-expanded', 'false'); $('[data-menu]').setAttribute('aria-hidden', 'true');
  lenis?.start();
  menuTl.timeScale(1.6).reverse().then(() => root.classList.remove('menu-open'));
}
menuBtn.addEventListener('click', () => (root.classList.contains('menu-open') ? closeMenu() : openMenu()));
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

/* ---------------- заголовки секций ---------------- */
$$('.section').forEach((sec) => {
  const head = $('.head', sec);
  if (!head) return;
  const title = $('.head__title', head);
  const chars = splitChars(title);
  const line = $('.head__line i', head);
  const aside = $('[data-scramble]', head);
  const streak = document.createElement('span');
  streak.className = 'streak';
  head.append(streak);
  if (reduced) return;
  gsap.set(chars, { yPercent: 110, rotate: 6 });
  ScrollTrigger.create({
    trigger: head, start: 'top 82%', once: true,
    onEnter: () => {
      const tl = gsap.timeline();
      tl.to(chars, { yPercent: 0, rotate: 0, duration: 1, ease: 'expo.out', stagger: 0.022 }, 0)
        .fromTo(line, { scaleX: 0, '--spark': 1 }, { scaleX: 1, duration: 1.4, ease: 'expo.inOut' }, 0.15)
        .to(line, { '--spark': 0, duration: 0.5 }, 1.4)
        .fromTo(streak, { x: '-60vw', opacity: 1, top: head.offsetHeight / 2 }, { x: '110vw', duration: 1.1, ease: 'power3.in' }, 0)
        .set(streak, { opacity: 0 });
      if (aside) tl.add(() => scramble(aside, { duration: 800 }), 0.4);
    },
  });
});
$$('.watch__copy h3').forEach((h) => {
  const chars = splitChars(h);
  if (reduced) return;
  gsap.set(chars, { yPercent: 110 });
  ScrollTrigger.create({ trigger: h, start: 'top 85%', once: true, onEnter: () => gsap.to(chars, { yPercent: 0, duration: 1, ease: 'expo.out', stagger: 0.02 }) });
});

/* ---------------- match center ---------------- */
const state = { tab: 'upcoming', day: DAYS[0].id, zone: ZONES[0] };
try { const z = localStorage.getItem('lpl-zone'); if (z) state.zone = ZONES.find((x) => x.id === z) || state.zone; } catch {}
const rowsEl = $('[data-rows]');
const daysEl = $('[data-days]');
const roundEl = $('[data-round]');

daysEl.innerHTML = DAYS.map((d, i) => `<button class="chip${i ? '' : ' is-on'}" role="tab" aria-selected="${!i}" data-day="${d.id}"><span>${d.label}</span></button>`).join('') + '<span class="seg__ink" aria-hidden="true"></span>';
$$('[data-seg="tab"] .chip').forEach((b) => { b.innerHTML = `<span>${b.textContent}</span>`; });

function placeInk(seg, instant) {
  const on = $('.chip.is-on', seg), ink = $('.seg__ink', seg);
  if (!on || !ink) return;
  if (instant) ink.style.transition = 'none';
  ink.style.width = on.offsetWidth + 'px';
  ink.style.transform = `translateX(${on.offsetLeft}px)`;
  if (instant) { ink.offsetWidth; ink.style.transition = ''; }
}

const fmtTime = (d) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: state.zone.tz }).format(d);
const fmtDay = (d) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: state.zone.tz }).format(d).toUpperCase();

function sideHTML(t, cls) {
  if (!t) return `<div class="side ${cls} side--tbd"><span class="tbd">?</span><span>TBD</span></div>`;
  return `<div class="side ${cls}"><img src="${t.logo}" alt="" width="40" height="40" loading="lazy"><span>${t.name}</span></div>`;
}
function rowsHTML() {
  if (state.tab === 'results') {
    return `<div class="empty shape"><strong>No results yet</strong><p>The first scores land here on 20 November, right after the opening series.</p></div>`;
  }
  const day = DAYS.find((d) => d.id === state.day);
  return day.matches.map((m) => {
    const label = `${m.a ? m.a.name : 'TBD'} vs ${m.b ? m.b.name : 'TBD'}, ${fmtTime(m.at)} ${state.zone.label}`;
    const dayShift = fmtDay(m.at) !== day.label ? `<small style="display:block;font-size:10px;color:var(--muted);font-weight:600;letter-spacing:.06em">${fmtDay(m.at)}</small>` : '';
    return `<article class="match shape" aria-label="${label}">
      ${sideHTML(m.a, 'side--a')}<span class="vs">VS</span>${sideHTML(m.b, 'side--b')}
      <time class="time" datetime="${m.at.toISOString()}"><span>${fmtTime(m.at)}${dayShift}</span></time>
    </article>`;
  }).join('');
}

let busy = null;
function renderRows(animate = true) {
  const day = DAYS.find((d) => d.id === state.day);
  roundEl.textContent = state.tab === 'results' ? 'Results' : day.round;
  if (!animate || reduced) { rowsEl.innerHTML = rowsHTML(); bindRows(); return; }
  busy?.kill();
  const old = [...rowsEl.children];
  busy = gsap.timeline();
  busy.to(old, { '--rv': 0, x: 30, duration: 0.35, ease: 'power3.in', stagger: 0.04 })
    .add(() => {
      rowsEl.innerHTML = rowsHTML(); bindRows();
      const rows = [...rowsEl.children];
      gsap.fromTo(rows, { '--rv': 0, x: -30 },
        { '--rv': 1, x: 0, duration: 0.8, ease: 'expo.out', stagger: 0.07, clearProps: 'transform' });
    });
}
function bindRows() {
  if (!fine) return;
  $$('.match', rowsEl).forEach((r) => r.addEventListener('pointermove', (e) => {
    const b = r.getBoundingClientRect(); r.style.setProperty('--hx', e.clientX - b.left + 'px');
  }));
}
function flipTimes() {
  const spans = $$('.time span', rowsEl);
  if (reduced || !spans.length) { renderRows(false); return; }
  gsap.to(spans, { rotateX: 90, opacity: 0, duration: 0.22, ease: 'power2.in', stagger: 0.04, onComplete: () => {
    renderRows(false);
    gsap.fromTo($$('.time span', rowsEl), { rotateX: -90, opacity: 0 }, { rotateX: 0, opacity: 1, duration: 0.5, ease: 'back.out(2)', stagger: 0.05 });
  } });
}

$('[data-seg="tab"]').addEventListener('click', (e) => {
  const b = e.target.closest('.chip'); if (!b || b.classList.contains('is-on')) return;
  $$('.chip', b.parentElement).forEach((c) => { c.classList.toggle('is-on', c === b); c.setAttribute('aria-selected', c === b); });
  state.tab = b.dataset.tab; placeInk(b.parentElement);
  daysEl.style.opacity = state.tab === 'results' ? 0.35 : 1;
  renderRows();
});
daysEl.addEventListener('click', (e) => {
  const b = e.target.closest('.chip'); if (!b || b.classList.contains('is-on')) return;
  $$('.chip', daysEl).forEach((c) => { c.classList.toggle('is-on', c === b); c.setAttribute('aria-selected', c === b); });
  state.day = b.dataset.day; placeInk(daysEl);
  if (state.tab !== 'upcoming') {
    const up = $('[data-tab="upcoming"]'); up.click(); return;
  }
  renderRows();
});

// часовой пояс
const tzBtn = $('[data-tz-btn]'), tzList = $('[data-tz-list]'), tzLabel = $('[data-tz-label]');
const localName = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop().replace(/_/g, ' '); } catch { return 'Local'; } })();
tzList.innerHTML = ZONES.map((z) => `<li role="option" data-zone="${z.id}" aria-selected="${z.id === state.zone.id}">${z.label}<span style="color:var(--muted);font-weight:500">${z.id === 'local' ? localName : z.tz.split('/')[1]}</span></li>`).join('');
tzLabel.textContent = state.zone.label;
const tzToggle = (open) => { tzList.hidden = !open; tzBtn.setAttribute('aria-expanded', open); };
tzBtn.addEventListener('click', () => tzToggle(tzList.hidden));
tzList.addEventListener('click', (e) => {
  const li = e.target.closest('li'); if (!li) return;
  state.zone = ZONES.find((z) => z.id === li.dataset.zone);
  try { localStorage.setItem('lpl-zone', state.zone.id); } catch {}
  $$('li', tzList).forEach((x) => x.setAttribute('aria-selected', x === li));
  tzLabel.textContent = state.zone.label;
  tzToggle(false);
  if (state.tab === 'upcoming') flipTimes();
});
addEventListener('click', (e) => { if (!e.target.closest('.tz')) tzToggle(false); });

renderRows(false);
requestAnimationFrame(() => { placeInk($('[data-seg="tab"]'), true); placeInk(daysEl, true); });
document.fonts?.ready.then(() => { placeInk($('[data-seg="tab"]'), true); placeInk(daysEl, true); });
addEventListener('resize', () => { placeInk($('[data-seg="tab"]'), true); placeInk(daysEl, true); });

if (!reduced) {
  ScrollTrigger.create({ trigger: '.mc', start: 'top 80%', once: true, onEnter: () => {
    gsap.from('.mc__bar', { y: 20, opacity: 0, duration: 0.8, ease: 'expo.out', stagger: 0.08 });
    gsap.fromTo($$('.match', rowsEl), { '--rv': 0 },
      { '--rv': 1, duration: 1.1, ease: 'expo.inOut', stagger: 0.09, delay: 0.15 });
  } });
}

/* ---------------- команды: голографические карточки ---------------- */
const teamsEl = $('[data-teams]');
teamsEl.innerHTML = TEAMS.map((t) => `
  <li class="team shape">
    <div class="team__in">
      <div class="team__logo" style="--logo:url('${new URL(t.logo, document.baseURI).href}')">
        <img src="${t.logo}" alt="" width="84" height="84" loading="lazy">
        <span class="holo" aria-hidden="true"></span>
      </div>
      <span class="team__name">${t.name}</span>
    </div>
    <span class="team__glare" aria-hidden="true"></span>
  </li>`).join('');
const teamCards = $$('.team', teamsEl);

if (fine && !reduced) {
  teamsEl.classList.add('has-spot');
  teamsEl.addEventListener('pointermove', (e) => {
    teamCards.forEach((c) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty('--sx', e.clientX - r.left + 'px');
      c.style.setProperty('--sy', e.clientY - r.top + 'px');
    });
  });
  teamsEl.addEventListener('pointerleave', () => teamCards.forEach((c) => { c.style.setProperty('--sx', '-999px'); }));
  teamCards.forEach((c) => {
    c.addEventListener('pointerenter', () => { c.classList.add('is-tilt'); c.style.setProperty('--o', 1); });
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c.style.setProperty('--rx', ((0.5 - y) * 14).toFixed(2) + 'deg');
      c.style.setProperty('--ry', ((x - 0.5) * 16).toFixed(2) + 'deg');
      c.style.setProperty('--px', (x * 100).toFixed(1) + '%');
      c.style.setProperty('--py', (y * 100).toFixed(1) + '%');
      c.style.setProperty('--ang', ((x - 0.5) * 90).toFixed(1) + 'deg');
    });
    c.addEventListener('pointerleave', () => {
      c.classList.remove('is-tilt');
      c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); c.style.setProperty('--o', 0);
    });
  });
}
if (!reduced) {
  // волна по диагонали сетки
  ScrollTrigger.create({ trigger: teamsEl, start: 'top 80%', once: true, onEnter: () => {
    const cols = getComputedStyle(teamsEl).gridTemplateColumns.split(' ').length;
    teamCards.forEach((c, i) => {
      const d = (i % cols) + Math.floor(i / cols);
      gsap.fromTo(c, { opacity: 0, y: 40, rotateX: -35, '--rv': 0 },
        { opacity: 1, y: 0, rotateX: 0, '--rv': 1, duration: 1.1, ease: 'expo.out', delay: d * 0.08,
          onComplete: () => { gsap.set(c, { clearProps: 'transform,opacity' }); } });
      const holo = $('.holo', c);
      gsap.fromTo(c, { '--o': 0, '--px': '-20%' }, { '--o': 0.9, '--px': '120%', duration: 0.9, ease: 'power2.inOut', delay: d * 0.08 + 0.4, onComplete: () => c.style.setProperty('--o', 0) });
      void holo;
    });
  } });
}

/* ---------------- формат: путь к титулу ---------------- */
const road = $('[data-road]');
const steps = $$('.step', road);
$$('.step__icon path', road).forEach((p) => { const l = p.getTotalLength(); p.style.strokeDasharray = l; p.style.strokeDashoffset = 0; });
if (reduced) steps.forEach((s) => s.classList.add('is-lit'));
else {
  ScrollTrigger.create({
    trigger: road, start: 'top 85%', end: 'top 35%', scrub: 0.6,
    onUpdate: (s) => {
      const p = s.progress;
      const w = road.offsetWidth;
      road.style.setProperty('--bx', (p * (w + 180) - 180) + 'px');
      road.style.setProperty('--bo', p > 0.02 && p < 0.98 ? 1 : 0);
      steps.forEach((st, i) => {
        const at = (i + 0.3) / steps.length;
        const lit = p >= at;
        if (lit !== st.classList.contains('is-lit')) {
          st.classList.toggle('is-lit', lit);
          if (lit) gsap.fromTo($$('.step__icon path', st), { strokeDashoffset: (i, el) => el.getTotalLength() }, { strokeDashoffset: 0, duration: 0.9, ease: 'power3.inOut', stagger: 0.06, overwrite: true });
          if (lit) traceShape(st);
        }
      });
    },
  });
  steps.forEach((st) => { const t = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); t.setAttribute('class', 'shape__trace'); t.setAttribute('aria-hidden', 'true'); st.append(t); });
}

/* ---------------- трансляция ---------------- */
const screen = $('.screen');
if (fine && screen) {
  screen.addEventListener('pointermove', (e) => {
    const r = screen.getBoundingClientRect();
    screen.style.setProperty('--cx', ((e.clientX - r.left) / r.width - 0.5) * -40 + 'px');
    screen.style.setProperty('--cy', ((e.clientY - r.top) / r.height - 0.5) * -30 + 'px');
  });
}
const cd = Object.fromEntries($$('[data-cd]').map((b) => [b.dataset.cd, b]));
const target = new Date(SEASON_START).getTime();
function tickCountdown() {
  let s = Math.max(0, Math.floor((target - Date.now()) / 1000));
  if (s === 0) { $('[data-countdown]').innerHTML = '<span><b style="color:var(--violet-hi)">● LIVE</b></span>'; $('.screen__label').textContent = 'Broadcast is'; $('.screen__date').textContent = 'Live now'; return false; }
  const v = { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
  for (const k in v) {
    const t = String(v[k]).padStart(2, '0');
    if (cd[k].textContent !== t) {
      cd[k].textContent = t;
      if (!reduced && k !== 'd') gsap.fromTo(cd[k], { yPercent: -40, opacity: 0.2 }, { yPercent: 0, opacity: 1, duration: 0.45, ease: 'expo.out' });
    }
  }
  return true;
}
if (tickCountdown()) { const iv = setInterval(() => { if (!tickCountdown()) clearInterval(iv); }, 1000); }

if (!reduced) {
  ScrollTrigger.create({ trigger: '.watch', start: 'top 80%', once: true, onEnter: () => {
    gsap.fromTo('.screen', { '--rv': 0 }, { '--rv': 1, duration: 1.3, ease: 'expo.inOut' });
    gsap.from('.screen > *', { y: 20, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07, delay: 0.6 });
    gsap.from('.watch__copy p, .watch__copy .btn', { y: 24, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1, delay: 0.3 });
  } });
  ScrollTrigger.create({ trigger: '.sponsors', start: 'top 85%', once: true, onEnter: () => {
    gsap.from('.sponsor', { y: 30, opacity: 0, filter: 'blur(8px)', duration: 1.1, ease: 'expo.out', stagger: 0.15 });
    gsap.from('.sponsors__sep', { scaleY: 0, duration: 1, ease: 'expo.inOut' });
  } });
}
$$('.sponsor').forEach((s) => s.style.setProperty('--logo', 'url(\'' + new URL($('img', s).getAttribute('src'), document.baseURI).href + '\')'));
$$('.sponsor').forEach((s) => s.addEventListener('pointermove', (e) => {
  const r = s.getBoundingClientRect(); s.style.setProperty('--px', ((e.clientX - r.left) / r.width) * 100 + '%');
}));

/* ---------------- футер: кристаллы ---------------- */
if (!reduced) {
  gsap.fromTo('[data-foot-crystal]', { '--fy': '80px', '--fs': 1.2 }, { '--fy': '0px', '--fs': 1.04, ease: 'none',
    scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  gsap.from('.foot__row > *', { y: 20, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.foot', start: 'top 90%' } });
}

/* ---------------- магнитные кнопки ---------------- */
if (fine && !reduced) {
  $$('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'expo.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'expo.out' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * 0.25);
      yTo((e.clientY - r.top - r.height / 2) * 0.35);
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}

intro();
// блик по слову AWAKEN раз в несколько секунд
if (!reduced) {
  gsap.timeline({ repeat: -1, repeatDelay: 5.5, delay: 5 })
    .fromTo('.word--glint', { '--g': 0 }, { '--g': 1, duration: 1.4, ease: 'power2.inOut' });
}
