import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initCrystal } from './fx/crystal.js';
import { TEAMS, DAYS, ZONES, TWITCH_URL, RULES_URL, SEASON_START } from './data.js';

gsap.registerPlugin(ScrollTrigger);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;

// Единый язык движения: одно появление снизу, одна кривая, одна длительность.
const EASE = 'power3.out';
const DUR = 0.9;
const STEP = 0.08;

/* ---------------- ссылки ---------------- */
$$('[data-twitch]').forEach((a) => { a.href = TWITCH_URL; a.target = '_blank'; a.rel = 'noopener'; });
const rules = $('[data-rules]');
if (rules) rules.href = RULES_URL;
$$('a[href^="#"]').forEach((a) => a.addEventListener('click', () => closeMenu()));

/* ---------------- hero ---------------- */
const crystal = (() => {
  try { return initCrystal($('[data-crystal]'), { src: 'img/crystal-hero.webp', reduced }); }
  catch (err) { console.warn(err); return null; }
})();
if (!crystal) root.classList.add('no-gl');

const heroItems = ['.hero .eyebrow', '.hero__title .line', '.hero__lead', '.hero__dates', '.hero__cta', '.stats'];
if (!reduced) {
  const tl = gsap.timeline({ delay: 0.15 });
  tl.from(heroItems, { y: 28, opacity: 0, duration: DUR, ease: EASE, stagger: STEP });
  if (crystal) { crystal.intro = 0; tl.to(crystal, { intro: 1, duration: 1.6, ease: 'power2.out' }, 0); }
  // при уходе hero кристалл просто гаснет
  ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom top', onUpdate: (s) => { if (crystal) crystal.scroll = s.progress; } });
}

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
const onScroll = () => nav.classList.toggle('is-stuck', scrollY > 40);
addEventListener('scroll', onScroll, { passive: true });
onScroll();
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
const inkNow = () => moveInk($('.nav__links a.is-active'));
document.fonts?.ready.then(inkNow);
addEventListener('resize', inkNow);

// меню
const menuBtn = $('[data-menu-btn]');
const menuEl = $('[data-menu]');
function openMenu() {
  root.classList.add('menu-open'); menuBtn.setAttribute('aria-expanded', 'true'); menuEl.setAttribute('aria-hidden', 'false');
  if (!reduced) gsap.fromTo('.menu__list a', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: EASE, stagger: 0.05, delay: 0.1 });
}
function closeMenu() {
  if (!root.classList.contains('menu-open')) return;
  root.classList.remove('menu-open'); menuBtn.setAttribute('aria-expanded', 'false'); menuEl.setAttribute('aria-hidden', 'true');
}
menuBtn.addEventListener('click', () => (root.classList.contains('menu-open') ? closeMenu() : openMenu()));
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

/* ---------------- появление секций ---------------- */
// Заголовок, линия и подпись — одним движением; потом контент секции.
function reveal(trigger, targets, extra) {
  if (reduced) return;
  const els = targets.filter(Boolean);
  gsap.set(els, { y: 28, opacity: 0 });
  ScrollTrigger.create({
    trigger, start: 'top 88%', once: true,
    onEnter: () => {
      gsap.to(els, { y: 0, opacity: 1, duration: DUR, ease: EASE, stagger: STEP, clearProps: 'transform' });
      extra?.();
    },
  });
}
$$('.head').forEach((head) => {
  const line = $('.head__line i', head);
  if (reduced) { gsap.set(line, { scaleX: 1 }); return; }
  gsap.set(line, { scaleX: 0 });
  reveal(head, [$('.head__title', head), $('.head__aside', head)], () => gsap.to(line, { scaleX: 1, duration: DUR * 1.2, ease: EASE }));
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
  const on = $('.chip.is-on', seg), sink = $('.seg__ink', seg);
  if (!on || !sink) return;
  if (instant) sink.style.transition = 'none';
  sink.style.width = on.offsetWidth + 'px';
  sink.style.transform = `translateX(${on.offsetLeft}px)`;
  if (instant) { sink.offsetWidth; sink.style.transition = ''; }
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
    const shift = fmtDay(m.at) !== day.label ? `<small class="time__day">${fmtDay(m.at)}</small>` : '';
    return `<article class="match shape" aria-label="${label}">
      ${sideHTML(m.a, 'side--a')}<span class="vs">VS</span>${sideHTML(m.b, 'side--b')}
      <time class="time" datetime="${m.at.toISOString()}"><span>${fmtTime(m.at)}${shift}</span></time>
    </article>`;
  }).join('');
}
function bindRows() {
  if (!fine) return;
  $$('.match', rowsEl).forEach((r) => r.addEventListener('pointermove', (e) => {
    const b = r.getBoundingClientRect(); r.style.setProperty('--hx', e.clientX - b.left + 'px');
  }));
}
// смена вкладки/дня: короткое затухание и появление, без наложений
let swap = null;
function renderRows(animate = true) {
  const day = DAYS.find((d) => d.id === state.day);
  const apply = () => { roundEl.textContent = state.tab === 'results' ? 'Results' : day.round; rowsEl.innerHTML = rowsHTML(); bindRows(); };
  if (!animate || reduced) { apply(); return; }
  swap?.kill();
  swap = gsap.timeline()
    .to([roundEl, rowsEl], { opacity: 0, duration: 0.18, ease: 'power1.in' })
    .add(apply)
    .fromTo([...rowsEl.children], { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: EASE, stagger: 0.04, clearProps: 'transform' })
    .to([roundEl, rowsEl], { opacity: 1, duration: 0.01 }, '<');
}

function select(seg, btn) {
  $$('.chip', seg).forEach((c) => { c.classList.toggle('is-on', c === btn); c.setAttribute('aria-selected', c === btn); });
  placeInk(seg);
}
$('[data-seg="tab"]').addEventListener('click', (e) => {
  const b = e.target.closest('.chip'); if (!b || b.classList.contains('is-on')) return;
  select(b.parentElement, b);
  state.tab = b.dataset.tab;
  daysEl.classList.toggle('is-dim', state.tab === 'results');
  renderRows();
});
daysEl.addEventListener('click', (e) => {
  const b = e.target.closest('.chip'); if (!b || b.classList.contains('is-on')) return;
  select(daysEl, b);
  state.day = b.dataset.day;
  if (state.tab !== 'upcoming') {
    const up = $('[data-tab="upcoming"]');
    select(up.parentElement, up); state.tab = 'upcoming'; daysEl.classList.remove('is-dim');
  }
  renderRows();
});

// часовой пояс
const tzBtn = $('[data-tz-btn]'), tzList = $('[data-tz-list]'), tzLabel = $('[data-tz-label]');
const localName = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop().replace(/_/g, ' '); } catch { return 'Local'; } })();
tzList.innerHTML = ZONES.map((z) => `<li role="option" data-zone="${z.id}" aria-selected="${z.id === state.zone.id}">${z.label}<span>${z.id === 'local' ? localName : z.tz.split('/')[1]}</span></li>`).join('');
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
  if (state.tab === 'upcoming') renderRows();
});
addEventListener('click', (e) => { if (!e.target.closest('.tz')) tzToggle(false); });

renderRows(false);
const inks = () => { placeInk($('[data-seg="tab"]'), true); placeInk(daysEl, true); };
requestAnimationFrame(inks);
document.fonts?.ready.then(inks);
addEventListener('resize', inks);

reveal('.mc', [...$$('.mc__bar'), roundEl, ...$$('.match', rowsEl)]);

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
  teamsEl.addEventListener('pointerleave', () => teamCards.forEach((c) => c.style.setProperty('--sx', '-999px')));
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
// карточки появляются построчно, без анимации transform (его использует наклон)
if (!reduced) {
  gsap.set(teamCards, { opacity: 0 });
  ScrollTrigger.create({ trigger: teamsEl, start: 'top 88%', once: true, onEnter: () => {
    const cols = getComputedStyle(teamsEl).gridTemplateColumns.split(' ').length;
    teamCards.forEach((c, i) => gsap.to(c, { opacity: 1, duration: DUR, ease: EASE, delay: Math.floor(i / cols) * STEP }));
  } });
}

/* ---------------- формат, трансляция, спонсоры, футер ---------------- */
reveal('.road', $$('.road > li:not(.road__beam)'));
reveal('.watch', [$('.screen'), $('.watch__copy h3'), $('.watch__copy p'), $('.watch__copy .btn')]);
reveal('.sponsors', [...$$('.sponsor'), $('.sponsors__sep')]);
reveal('.foot', $$('.foot__row > *'));

const screen = $('.screen');
if (fine && screen) {
  screen.addEventListener('pointermove', (e) => {
    const r = screen.getBoundingClientRect();
    screen.style.setProperty('--cx', ((e.clientX - r.left) / r.width - 0.5) * -40 + 'px');
    screen.style.setProperty('--cy', ((e.clientY - r.top) / r.height - 0.5) * -30 + 'px');
  });
}
$$('.sponsor').forEach((s) => {
  s.style.setProperty('--logo', `url('${new URL($('img', s).getAttribute('src'), document.baseURI).href}')`);
  s.addEventListener('pointermove', (e) => {
    const r = s.getBoundingClientRect(); s.style.setProperty('--px', ((e.clientX - r.left) / r.width) * 100 + '%');
  });
});

// обратный отсчёт: просто цифры, без анимации
const cd = Object.fromEntries($$('[data-cd]').map((b) => [b.dataset.cd, b]));
const target = new Date(SEASON_START).getTime();
function tick() {
  const s = Math.max(0, Math.floor((target - Date.now()) / 1000));
  if (s === 0) {
    $('[data-countdown]').innerHTML = '<span><b class="live">● LIVE</b></span>';
    $('.screen__label').textContent = 'Broadcast is';
    $('.screen__date').textContent = 'Live now';
    return false;
  }
  const v = { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
  for (const k in v) cd[k].textContent = String(v[k]).padStart(2, '0');
  return true;
}
if (tick()) { const iv = setInterval(() => { if (!tick()) clearInterval(iv); }, 1000); }
