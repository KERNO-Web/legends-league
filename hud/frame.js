// Рамки под камеры (кастеры, студия): фон с прозрачными окнами, золотой кант, кристаллы по углам.
import { gsap, stage, el, at, pic, brand, social, sponsors, motes, holo, replayOnShow } from './hud.js';

const css = `
.fr-bg { position: absolute; inset: 0; background: url(img/bg-frame.webp) 0 0 / 1920px 1080px; }
.fr-svg { position: absolute; inset: 0; overflow: visible; }
.cr { position: absolute; will-change: transform; }
.cr img { width: 100%; display: block; }
.cr .sw { position: absolute; inset: 0; mix-blend-mode: screen; opacity: 0; -webkit-mask: var(--m) 0 0 / 100% 100% no-repeat; mask: var(--m) 0 0 / 100% 100% no-repeat;
  background: linear-gradient(115deg, transparent 0 42%, rgba(255,240,255,.7) 48%, rgba(255,225,168,.95) 50%, rgba(180,124,255,.6) 52%, transparent 58% 100%); background-size: 300% 100%; }
`;
document.head.appendChild(Object.assign(document.createElement('style'), { textContent: css }));

// восьмиугольник со скосом k
const oct = (x, y, w, h, k) => `M${x + k} ${y}H${x + w - k}L${x + w} ${y + k}V${y + h - k}L${x + w - k} ${y + h}H${x + k}L${x} ${y + h - k}V${y + k}Z`;

// windows: [{x,y,w,h,k}] — прозрачные окна; plates: [{x,y,w,h,s,text}] — плашки-параллелограммы
export function frameScene({ windows, plates = [], crystals = [], brandAt, brandW = 339, foot = true, topSponsors = null, fadeBottom = 0 }) {
  const S = stage();
  const holes = windows.map((o) => oct(o.x, o.y, o.w, o.h, o.k ?? 30)).join(' ');
  const mask = `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='1920' height='1080'><path fill-rule='evenodd' d='M0 0H1920V1080H0Z ${holes}'/></svg>`)}")`;
  const bg = el('div', 'fr-bg', S);
  bg.style.webkitMask = bg.style.mask = `${mask} 0 0 / 1920px 1080px no-repeat`;
  if (fadeBottom) { const f = el('div', 'layer', S); f.style.background = `linear-gradient(180deg, transparent ${fadeBottom}px, rgba(10,4,24,.55) 100%)`; f.style.webkitMask = f.style.mask = bg.style.mask; }

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'fr-svg'); svg.setAttribute('viewBox', '0 0 1920 1080'); S.appendChild(svg);
  svg.innerHTML = `<defs><linearGradient id="pl" x1="0" x2="1"><stop offset="0" stop-color="#2b1d43"/><stop offset="1" stop-color="#1c1430"/></linearGradient></defs>`;
  const outlines = windows.map((o) => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', oct(o.x, o.y, o.w, o.h, o.k ?? 30)); p.setAttribute('fill', 'none'); p.setAttribute('stroke', '#f2cb75'); p.setAttribute('stroke-width', '2.4');
    svg.appendChild(p); return p;
  });
  const plateEls = plates.map((o) => {
    const g = document.createElementNS(NS, 'g');
    const s = o.s ?? 46;
    g.innerHTML = `<path d="M${o.x + s} ${o.y}H${o.x + o.w}L${o.x + o.w - s} ${o.y + o.h}H${o.x}Z" fill="url(#pl)" stroke="#f2cb75" stroke-width="2.4"/>`;
    svg.appendChild(g); return g;
  });
  const labels = plates.map((o) => {
    const t = at(el('div', '', S, o.text), o.x, o.y, o.w, o.h);
    Object.assign(t.style, { display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: (o.size || 62) + 'px', textTransform: 'uppercase', whiteSpace: 'nowrap', letterSpacing: '-0.01em' });
    if (o.text.length > 16) t.style.fontSize = ((o.size || 62) * 0.75) + 'px';
    return t;
  });

  const crs = crystals.map(([src, x, y, w, rot = 0, flip = false]) => {
    const c = at(el('div', 'cr', S), x, y, w);
    pic(src, '', c);
    const sw = el('i', 'sw', c); sw.style.setProperty('--m', `url(${src})`);
    gsap.set(c, { rotation: rot, scaleX: /x/.test(flip || '') ? -1 : 1, scaleY: /y/.test(flip || '') ? -1 : 1, transformOrigin: '50% 50%' });
    return { c, sw };
  });
  const B = brandAt ? brand(S, brandAt[0], brandAt[1], brandW) : null;
  let so = null, sp = null;
  if (foot) { so = social(S); sp = sponsors(S); }
  if (topSponsors) { sp = sponsors(S, topSponsors[0], topSponsors[1], false); sp.style.gap = topSponsors[2] + 'px'; }
  motes(S, 14, [0, 0, 1920, 1080]);

  // петли: кристаллы парят, по ним проходит свет, по спонсорам — holo-волна
  crs.forEach(({ c, sw }, i) => {
    gsap.to(c, { y: '+=12', rotation: `+=${i % 2 ? -1.5 : 1.5}`, duration: 5.5 + i * 0.7, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.timeline({ delay: 2.2 + i * 0.5, repeat: -1, repeatDelay: 7 })
      .set(sw, { opacity: 1, backgroundPosition: '100% 0' })
      .to(sw, { backgroundPosition: '0% 0', duration: 1.6, ease: 'sine.inOut' })
      .set(sw, { opacity: 0 });
  });
  if (sp) holo(sp, { delay: 3, every: 9 });
  // по канту окон иногда пробегает золотая искра
  outlines.forEach((p, i) => {
    const len = p.getTotalLength();
    const spark = p.cloneNode(); spark.setAttribute('stroke', '#fff1cc'); spark.setAttribute('stroke-width', '4'); spark.style.filter = 'drop-shadow(0 0 6px rgba(255,214,150,.9))';
    spark.setAttribute('stroke-dasharray', `120 ${len}`); svg.appendChild(spark);
    gsap.fromTo(spark, { strokeDashoffset: 0, opacity: 0 }, { strokeDashoffset: -len, duration: 6, ease: 'none', repeat: -1, delay: 2 + i * 0.6 });
    gsap.to(spark, { opacity: 0.9, duration: 0.6, delay: 2 + i * 0.6 });
  });

  // вход: кант прорисовывается, кристаллы влетают, плашки выезжают
  const tl = gsap.timeline();
  tl.fromTo(bg, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'main' }, 0);
  outlines.forEach((p, i) => {
    const len = p.getTotalLength();
    tl.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.3, ease: 'main' }, 0.15 + i * 0.1);
  });
  crs.forEach(({ c }, i) => {
    const fromX = parseFloat(c.style.left) < 960 ? -260 : 260;
    tl.fromTo(c, { x: fromX, opacity: 0, filter: 'brightness(2)' }, { x: 0, opacity: 1, filter: 'brightness(1)', duration: 1.2, ease: 'main' }, 0.2 + i * 0.08);
  });
  plateEls.forEach((g, i) => tl.fromTo(g, { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.8, ease: 'main' }, 0.7 + i * 0.12));
  labels.forEach((t, i) => tl.fromTo(t, { opacity: 0, y: 14, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8, ease: 'main' }, 0.95 + i * 0.12));
  if (B) tl.fromTo(B, { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: 0.7, ease: 'main' }, 0.4);
  if (so || sp) tl.fromTo([so, sp].filter(Boolean), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.7, ease: 'main', stagger: 0.1 }, 0.9);
  replayOnShow(tl);
  return { S, tl };
}
