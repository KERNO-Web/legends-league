import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CustomEase } from 'gsap/CustomEase';
import { initCrystal } from './fx/crystal.js';
import { TEAMS, ZONES, TWITCH_URL, RULES_URL, SEASON_START, MATCH_MINUTES } from './data.js';
import { snapshotDays, loadDays, isDecided } from './schedule.js';

// «Сейчас»: можно подменить для показа/проверки — ?now=2026-11-20T10:30:00Z
const NOW_SHIFT = (() => { try { const v = new URLSearchParams(location.search).get('now'); const t = v && Date.parse(v); return t ? t - Date.now() : 0; } catch { return 0; } })();
const now = () => Date.now() + NOW_SHIFT;

gsap.registerPlugin(ScrollTrigger, CustomEase);
const root = document.documentElement;
const reduced = !root.classList.contains('m'); // класс .m ставит инлайн-скрипт в <head>, если движение разрешено
const fine = matchMedia('(pointer: fine)').matches;
const mobile = !fine || innerWidth < 768;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// Токены движения (согласованы с дизайнером и моушн-дизайнером):
// одна кривая, длительности 200/350/600/1200 мс, шаг 40–80 мс.
CustomEase.create('main', '.16,1,.3,1');
const T = { xs: 0.2, s: 0.35, m: 0.6, l: 1.2 };

/* ---------------- ссылки, меню ---------------- */
$$('[data-twitch]').forEach((a) => { a.href = TWITCH_URL; a.target = '_blank'; a.rel = 'noopener'; });
const rules = $('[data-rules]');
if (rules) rules.href = RULES_URL;


/* ---------------- навигация ---------------- */
const nav = $('[data-nav]');
const ink = $('.nav__ink');
const links = $$('[data-link]');
function moveInk(a) {
  if (!a || !ink) return;
  const pr = a.parentElement.getBoundingClientRect(), r = a.getBoundingClientRect();
  ink.style.transform = `translateX(${r.left - pr.left}px) scaleX(${r.width / 100})`;
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

/* ---------------- hero: момент A «пробуждение» ---------------- */
const crystal = (() => {
  try { return initCrystal($('[data-crystal]'), { src: 'img/hero-character.webp', maskSrc: 'img/hero-shards.png', reduced, mobile }); }
  catch (err) { console.warn(err); return null; }
})();
if (!crystal) root.classList.add('no-gl');

const titleWords = $$('.hero__title .word');
const heroGroup = ['.hero__lead', '.hero__dates', '.hero__cta'];

function wake(withFront) {
  const front = mobile ? 0.7 : 0.9;           // фронт идёт с постоянной скоростью
  const tl = gsap.timeline();
  if (crystal) {
    if (withFront) tl.fromTo(crystal, { wake: 0 }, { wake: 1, duration: front, ease: 'none' }, 0);
    else { crystal.wake = 1; tl.fromTo(crystal, { fade: 0 }, { fade: 1, duration: T.m, ease: 'main' }, 0); }
  }
  tl.to('.hero .eyebrow', { opacity: 1, duration: T.s, ease: 'main' }, 0)
    .to(titleWords[0], { yPercent: 0, duration: T.m, ease: 'main' }, 0.12)
    .to(titleWords[1], { yPercent: 0, duration: T.m, ease: 'main' }, 0.2)
    .to(heroGroup, { y: 0, opacity: 1, duration: T.m, ease: 'main', stagger: 0.04 }, 0.42)
    .to('.stats', { opacity: 1, duration: T.m, ease: 'main' }, 0.54)
    .fromTo('.hero__arrow', { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: T.m, ease: 'main' }, 0.56);
  // свет дошёл до хвоста (~0.78 с) — рамка stats загорается и гаснет; на телефоне stats ниже сгиба, пропускаем
  if (!mobile && withFront) {
    tl.to('.stats__glow', { opacity: 1, duration: T.s, ease: 'main' }, front * 0.86)
      .to('.stats__glow', { opacity: 0, duration: T.m, ease: 'main' });
  }
  // после пробуждения включается блик за курсором
  if (crystal && !mobile) tl.to(crystal, { glint: 1, duration: T.m, ease: 'main' }, front);
  return tl;
}

if (reduced) {
  if (crystal) crystal.kick();
} else {
  gsap.set(titleWords, { y: 0, yPercent: 105 });
  gsap.set(heroGroup, { y: 12 });
  // старт, когда готовы текстура и шрифты и вкладка видима; если текстура опаздывает (>700 мс) — без фронта
  const visibleNow = () => new Promise((r) => {
    if (!document.hidden) return r();
    document.addEventListener('visibilitychange', function f() { if (!document.hidden) { document.removeEventListener('visibilitychange', f); r(); } });
  });
  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
  const tex = crystal ? Promise.race([crystal.ready.then((ok) => ok !== false), new Promise((r) => setTimeout(() => r(false), 700))]) : Promise.resolve(false);
  Promise.all([tex, Promise.race([fonts, new Promise((r) => setTimeout(r, 700))]), visibleNow()]).then(([texOk]) => wake(texOk));
}

// уход hero: кристалл гаснет
ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom top', onUpdate: (s) => { if (crystal) { crystal.scroll = s.progress; crystal.kick(); } } });

/* ---------------- общее правило появления секций ---------------- */
// Заголовок с подписью, потом контент одним блоком. y 16 → 0, 600 мс, шаг 60, вся группа ≤ 750 мс.
// Быстрый скролл/якорь или секция уже выше экрана — сразу финал, без анимации.
function reveal(trigger, els, { start = 'top 85%', onShow } = {}) {
  els = els.filter(Boolean);
  if (reduced || !els.length) { onShow?.(true); return; }
  const el = typeof trigger === 'string' ? $(trigger) : trigger;
  if (el.getBoundingClientRect().bottom < 0) { onShow?.(true); return; }
  gsap.set(els, { y: 16, opacity: 0 });
  ScrollTrigger.create({
    trigger: el, start, once: true,
    onEnter: (self) => {
      const fast = Math.abs(self.getVelocity()) > 3000;
      if (fast) { gsap.set(els, { y: 0, opacity: 1, clearProps: 'transform' }); onShow?.(true); return; }
      gsap.to(els, { y: 0, opacity: 1, duration: T.m, ease: 'main', stagger: 0.06, clearProps: 'transform' });
      onShow?.(false);
    },
  });
}
$$('.head').forEach((head) => {
  const line = $('.head__line i', head);
  reveal(head, [$('.head__title', head), $('.head__aside', head)], {
    onShow: (instant) => { if (!instant) gsap.fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: T.m, ease: 'main', delay: 0.06 }); },
  });
});

/* ---------------- match center: данные из Google-таблицы организатора ---------------- */
let DAYS = snapshotDays();
const state = { tab: 'upcoming', day: DAYS[0]?.id, zone: ZONES[0] };
try { const z = localStorage.getItem('lpl-zone'); if (z) state.zone = ZONES.find((x) => x.id === z) || state.zone; } catch {}
const rowsEl = $('[data-rows]');
const daysEl = $('[data-days]');
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
const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function sideHTML(t, cls) {
  if (!t) return `<div class="side ${cls} side--tbd"><span class="tbd" aria-hidden="true"></span><span>TBD</span></div>`;
  const logo = t.logo ? `<img src="${t.logo}" alt="" width="60" height="60" loading="lazy">` : '<span class="tbd" aria-hidden="true"></span>';
  return `<div class="side ${cls}">${logo}<span title="${esc(t.name)}">${esc(t.name)}</span></div>`;
}
function matchState(m, t) {
  if (isDecided(m)) return 'done';
  const start = m.at.getTime();
  if (t < start) return 'upcoming';
  return t < start + MATCH_MINUTES * 60000 ? 'live' : 'done';
}
function rowHTML(m, dayLabel, t) {
  const st = matchState(m, t);
  const names = `${m.a ? m.a.name : 'TBD'} vs ${m.b ? m.b.name : 'TBD'}`;
  const sides = `${sideHTML(m.a, 'side--a')}<span class="vs">VS</span>${sideHTML(m.b, 'side--b')}`;
  // идёт сейчас: вся строка — ссылка на трансляцию
  // промежуточный счёт серии (1:0, 1:1) показываем рядом с LIVE
  if (st === 'live') return `<a class="match shape is-live" href="${TWITCH_URL}" target="_blank" rel="noopener" aria-label="${esc(names)}, live now${m.score ? ', ' + m.score.join(':') : ''}, watch on Twitch">
    ${sides}<span class="time"><span class="live-badge"><i aria-hidden="true"></i>LIVE</span>${m.score ? `<span class="score score--live">${m.score[0]}<i>:</i>${m.score[1]}</span>` : ''}</span></a>`;
  // сыгран: вместо времени счёт
  if (m.score) return `<article class="match shape is-done has-score" aria-label="${esc(names)}, ${m.score.join(':')}">
    ${sides}<span class="time"><span class="score">${m.score[0]}<i>:</i>${m.score[1]}</span></span></article>`;
  const shift = dayLabel && fmtDay(m.at) !== dayLabel ? `<small class="time__day">${fmtDay(m.at)}</small>` : '';
  return `<article class="match shape${st === 'done' ? ' is-done' : ''}" aria-label="${esc(names)}, ${fmtTime(m.at)} ${state.zone.label}">
    ${sides}<time class="time" datetime="${m.at.toISOString()}"><span>${fmtTime(m.at)}${shift}</span></time></article>`;
}
function rowsHTML() {
  const t = now();
  if (state.tab === 'results') {
    const done = DAYS.flatMap((d) => d.matches).filter(isDecided).sort((x, y) => y.at - x.at);
    if (!done.length) return `<div class="empty shape"><strong>No results yet</strong><p>Scores appear here as soon as the first series are played.</p></div>`;
    return done.map((m) => rowHTML(m, null, t)).join('');
  }
  const day = DAYS.find((d) => d.id === state.day);
  if (!day) return `<div class="empty shape"><strong>Schedule coming soon</strong><p>Match times will be published shortly.</p></div>`;
  return day.matches.map((m) => rowHTML(m, day.label, t)).join('');
}
function bindRows() {
  if (!fine) return;
  $$('.match', rowsEl).forEach((r) => r.addEventListener('pointermove', (e) => {
    const b = r.getBoundingClientRect(); r.style.setProperty('--hx', e.clientX - b.left + 'px');
  }));
}
// смена дня/вкладки: строки уходят за 200 мс, новые входят по 350 мс с шагом 40
let swap = null;
function renderRows(animate = true) {
  const apply = () => { rowsEl.innerHTML = rowsHTML(); bindRows(); };
  swap?.kill();
  if (!animate) { apply(); return; }
  if (reduced) {
    swap = gsap.timeline().to(rowsEl, { opacity: 0, duration: 0.15 }).add(apply).to(rowsEl, { opacity: 1, duration: 0.15 });
    return;
  }
  const old = [...rowsEl.children];
  swap = gsap.timeline()
    .to(old, { y: -12, opacity: 0, duration: T.xs, ease: 'main' })
    .add(apply)
    .add(() => gsap.fromTo([...rowsEl.children], { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: T.s, ease: 'main', stagger: 0.04, clearProps: 'transform' }));
}
// день по умолчанию: где идёт матч, иначе ближайший с предстоящими, иначе последний
function pickDay() {
  const t = now();
  const d = DAYS.find((x) => x.matches.some((m) => matchState(m, t) === 'live'))
    || DAYS.find((x) => x.matches.some((m) => matchState(m, t) === 'upcoming'))
    || DAYS[DAYS.length - 1];
  return d?.id;
}
function renderDays() {
  if (!DAYS.some((d) => d.id === state.day)) state.day = pickDay();
  daysEl.innerHTML = DAYS.map((d) => `<button class="chip${d.id === state.day ? ' is-on' : ''}" role="tab" aria-selected="${d.id === state.day}" data-day="${d.id}"><span>${d.label}</span></button>`).join('') + '<span class="seg__ink" aria-hidden="true"></span>';
  placeInk(daysEl, true);
  revealDay(true);
}
// много игровых дней: ряд прокручивается, выбранный день держим в зоне видимости
function daysCut() {
  const max = daysEl.scrollWidth - daysEl.clientWidth;
  daysEl.classList.toggle('is-cut-l', daysEl.scrollLeft > 2);
  daysEl.classList.toggle('is-cut-r', daysEl.scrollLeft < max - 2);
}
function revealDay(instant) {
  const on = $('.chip.is-on', daysEl);
  if (on && daysEl.scrollWidth > daysEl.clientWidth) {
    const left = on.offsetLeft - (daysEl.clientWidth - on.offsetWidth) / 2;
    daysEl.scrollTo({ left: Math.max(0, left), behavior: instant ? 'instant' : 'smooth' });
  }
  daysCut();
}
daysEl.addEventListener('scroll', daysCut, { passive: true });

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
  revealDay();
  state.day = b.dataset.day;
  state.dayPicked = true;
  if (state.tab !== 'upcoming') {
    const up = $('[data-tab="upcoming"]');
    select(up.parentElement, up); state.tab = 'upcoming'; daysEl.classList.remove('is-dim');
  }
  renderRows();
});

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
  renderRows();
});
addEventListener('click', (e) => { if (!e.target.closest('.tz')) tzToggle(false); });

state.day = pickDay();
renderDays();
renderRows(false);
const inks = () => { placeInk($('[data-seg="tab"]'), true); placeInk(daysEl, true); revealDay(true); };
requestAnimationFrame(inks);
document.fonts?.ready.then(inks);
addEventListener('resize', inks);

// живые данные: сразу и потом раз в 2 минуты; перерисовка только если что-то поменялось
let lastSig = '';
const sig = () => JSON.stringify(DAYS.map((d) => [d.id, d.matches.map((m) => [m.a?.name, m.b?.name, +m.at, m.score, matchState(m, now())])]));
async function refresh() {
  try {
    const fresh = await loadDays();
    DAYS = fresh;
  } catch { /* таблица недоступна — остаёмся на снимке */ }
  const s = sig();
  if (s === lastSig) return;
  const first = !lastSig;
  lastSig = s;
  // пока посетитель сам не выбрал день — показываем актуальный по свежим данным (в снимке новых дней может не быть)
  if (!state.dayPicked) state.day = pickDay();
  renderDays();
  renderRows(!first && !reduced);
}
lastSig = sig();
refresh();
setInterval(() => { if (!document.hidden) refresh(); }, 120000);

reveal('.mc', [$('.mc')]);

/* ---------------- команды: момент B «голограмма» ---------------- */
const teamsEl = $('[data-teams]');
teamsEl.innerHTML = TEAMS.map((t) => `
  <li class="team shape">
    <div class="team__in">
      <div class="team__logo" style="--logo:url('${new URL(t.logo, document.baseURI).href}')">
        <img src="${t.logo}" alt="" width="96" height="96" loading="lazy">
        <span class="holo" aria-hidden="true"></span>
        <span class="wave" aria-hidden="true"><i></i></span>
      </div>
      <span class="team__name">${t.name}</span>
    </div>
    <span class="team__glare" aria-hidden="true"></span>
  </li>`).join('');
const teamCards = $$('.team', teamsEl);
const waves = new Map();

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
    c.addEventListener('pointerenter', () => {
      const w = waves.get(c); if (w) { w.kill(); gsap.to($('.wave i', c), { opacity: 0, duration: T.xs }); }
      c.classList.add('is-tilt'); c.style.setProperty('--o', 1);
    });
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
} else if (reduced && fine) {
  // reduced-motion: перелив при наведении остаётся (это отклик), наклона нет
  teamCards.forEach((c) => {
    c.addEventListener('pointerenter', () => c.style.setProperty('--o', 1));
    c.addEventListener('pointerleave', () => c.style.setProperty('--o', 0));
  });
}

// одна карточка: блик проходит по силуэту логотипа за 700 мс
function waveCard(c, delay) {
  const i = $('.wave i', c);
  const tl = gsap.timeline({ delay })
    .fromTo(i, { xPercent: -100 }, { xPercent: 100, duration: 0.7, ease: 'none' }, 0)
    .fromTo(i, { opacity: 0 }, { opacity: 0.85, duration: T.xs, ease: 'none' }, 0)
    .to(i, { opacity: 0, duration: T.xs, ease: 'none' }, 0.5);
  waves.set(c, tl);
}
if (!reduced) {
  const cols = () => getComputedStyle(teamsEl).gridTemplateColumns.split(' ').length;
  // карточки появляются по общему правилу (только opacity — transform занят наклоном)
  if (teamsEl.getBoundingClientRect().bottom > 0) {
    gsap.set(teamCards, { opacity: 0 });
    ScrollTrigger.create({ trigger: teamsEl, start: 'top 85%', once: true, onEnter: (self) => {
      const fast = Math.abs(self.getVelocity()) > 3000;
      const n = cols();
      teamCards.forEach((c, i) => gsap.to(c, { opacity: 1, duration: fast ? 0 : T.m, ease: 'main', delay: fast ? 0 : Math.floor(i / n) * 0.06 }));
    } });
  }
  if (mobile) {
    // телефон: волна по рядам, внутри ряда слева направо
    const n = cols();
    for (let r = 0; r < teamCards.length; r += n) {
      const row = teamCards.slice(r, r + n);
      ScrollTrigger.create({ trigger: row[0], start: 'top 75%', once: true, onEnter: () => row.forEach((c, k) => waveCard(c, 0.3 + k * 0.06)) });
    }
  } else {
    // десктоп: одна диагональная волна, когда сетка почти вся на экране
    ScrollTrigger.create({ trigger: teamsEl, start: 'top 55%', once: true, onEnter: (self) => {
      if (Math.abs(self.getVelocity()) > 3000) return;
      const n = cols();
      teamCards.forEach((c, i) => waveCard(c, ((i % n) + Math.floor(i / n)) * 0.06));
    } });
  }
}

/* ---------------- формат, трансляция, спонсоры, футер ---------------- */
reveal('.road', [$('.road')]);
reveal('.watch', [$('.watch')]);
reveal('.sponsors', [$('.sponsors')]);
reveal('.foot__row', [$('.foot__row')], { start: 'top 95%' });
// момент C: кристалл футера один раз проявляется
if (!reduced) {
  const fc = $('[data-foot-crystal]');
  if (fc.getBoundingClientRect().bottom > 0) {
    gsap.set(fc, { opacity: 0 });
    ScrollTrigger.create({ trigger: '.foot', start: 'top 90%', once: true, onEnter: () => gsap.to(fc, { opacity: 1, duration: T.l, ease: 'main' }) });
  }
}

$$('.sponsor').forEach((s) => {
  s.style.setProperty('--logo', `url('${new URL($('img', s).getAttribute('src'), document.baseURI).href}')`);
  s.addEventListener('pointermove', (e) => {
    const r = s.getBoundingClientRect(); s.style.setProperty('--px', ((e.clientX - r.left) / r.width) * 100 + '%');
  });
});

// обратный отсчёт одной строкой: «Starts in 2 d 8 h», меньше суток — «8 h 10 m», после старта — Live now
const cdEl = $('[data-countdown]');
const target = new Date(SEASON_START).getTime();
function tick() {
  const s = Math.max(0, Math.floor((target - Date.now()) / 1000));
  if (s === 0) {
    cdEl.innerHTML = '<span class="live">Live now</span>';
    $('.screen__label').textContent = 'Broadcast is';
    $('.screen__date').textContent = 'Live';
    return false;
  }
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  const txt = d >= 1 ? `Starts in ${d} d ${h} h` : h >= 1 ? `Starts in ${h} h ${m} m` : `Starts in ${m} m`;
  if (cdEl.textContent !== txt) cdEl.textContent = txt;
  return true;
}
if (tick()) { const iv = setInterval(() => { if (!tick()) clearInterval(iv); }, 15000); }


/* ---------------- футер: кристаллы чуть доворачиваются при прокрутке к низу ---------------- */
if (!reduced) {
  const fl = $('.foot__crystal-l'), fr = $('.foot__crystal-r');
  const st = { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: 0.8 };
  gsap.fromTo(fl, { rotate: -5, y: 50, transformOrigin: '0% 100%' }, { rotate: 0, y: 0, ease: 'none', scrollTrigger: st });
  gsap.fromTo(fr, { rotate: 5, y: 50, transformOrigin: '100% 100%' }, { rotate: 0, y: 0, ease: 'none', scrollTrigger: { ...st } });
}
