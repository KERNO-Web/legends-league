// Экраны с данными (расписание, результаты, MVP): общий фон, шапка, подвал, вход.
import {
  gsap, cssUrl, stage, el, at, pic, brand, social, sponsors, title, gline, motes, flares, sweep, holo, lineSpark,
  titleGlint, inTitle, inLine, inFade, inSub, replayOnShow,
} from './hud.js';

const css = `
.board-bg { position: absolute; inset: 0; width: 1920px; height: 1080px; object-fit: cover; }
.head { font-size: 110px; letter-spacing: -0.035em; font-weight: 800; }
.head .ln { height: 104px; line-height: 104px; }
.date { left: 78px; top: 196px; font-weight: 700; font-size: 38px; line-height: 1; letter-spacing: 0.1em; }
.rule { left: 55px; width: 1810px; height: 2px; background: var(--gold); opacity: .85; transform-origin: 0 50%; }
.crystal { position: absolute; will-change: transform; pointer-events: none; }
`;
document.head.appendChild(Object.assign(document.createElement('style'), { textContent: css }));

export function board({ head, date, ruleY = 943, bg = 'img/bg-stage.webp', mask = 'img/mask-stage.webp', brandAt = [1473, 86], dateLine = 400, dateLineAt = [75, 248], headAt = [75, 72] }) {
  const S = stage();
  const bgW = el('div', 'layer', S);
  pic(bg, 'board-bg', bgW);
  const litS = el('div', 'lit', bgW); litS.style.setProperty('--mask', cssUrl(mask));
  const sw = el('div', 'sweep', litS);
  const fx = el('div', 'layer', S);
  const back = el('div', 'layer', S); // персонажи и кристаллы — под шапкой и подвалом
  const H = title(S, [head], headAt[0], headAt[1], null, 'head');
  const D = at(el('div', 'date', S, date || ''), 78, 196);
  const DL = dateLine ? gline(S, dateLineAt[0], dateLineAt[1], dateLine) : null;
  const B = brand(S, brandAt[0], brandAt[1]);
  const R = ruleY ? at(el('i', 'rule', S), 55, ruleY) : null;
  const so = social(S), sp = sponsors(S);
  const content = el('div', 'layer', S);

  sweep(sw, { delay: 5, dur: 2.6, every: 10, from: 300, to: 2400 });
  holo(sp, { delay: 3, every: 9 });
  if (DL) lineSpark(DL, { delay: 3.6, every: 9 });
  titleGlint(H, { delay: 4.5, every: 12 });

  const tl = gsap.timeline();
  tl.fromTo(bgW, { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1, duration: 1.2, ease: 'main' }, 0);
  tl.add(sweep(sw, { dur: 1.8, from: 300, to: 2400 }), 0.2);
  inTitle(tl, H, 0.25);
  inSub(tl, D, 0.6);
  if (DL) inLine(tl, DL, 0.7);
  inFade(tl, [B], 0.3, { y: -12 });
  if (R) tl.fromTo(R, { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: 'main' }, 0.6);
  inFade(tl, [so, sp], 0.9, { y: 12, stagger: 0.1 });
  replayOnShow(tl);
  return { S, fx, back, content, tl, bgW };
}

// кристалл-слой, который парит
export function crystal(parent, src, x, y, w, { flip = false, rot = 0, amp = 10, dur = 7, delay = 0 } = {}) {
  const c = pic(src, 'crystal', parent);
  Object.assign(c.style, { left: x + 'px', top: y + 'px', width: w + 'px' });
  gsap.set(c, { rotation: rot, scaleX: flip ? -1 : 1 });
  gsap.to(c, { y: `+=${amp}`, rotation: `+=${amp / 8}`, duration: dur, ease: 'sine.inOut', yoyo: true, repeat: -1, delay });
  return c;
}
