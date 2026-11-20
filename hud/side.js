// Полноэкранные заставки (Starting / BRB / Offline / Ending): арт справа, крупный заголовок слева.
import {
  gsap, stage, el, at, artScene, logoBig, season, social, sponsors, title, gline, motes, flares,
  shimmer, sweep, drift, holo, lineSpark, titleGlint, inTitle, inLine, inFade, inSub, inArt, replayOnShow, q,
} from './hud.js';

export function sideScene(cfg) {
  const S = stage();
  const A = artScene(S, cfg.art, { video: cfg.video });
  const pat = el('img', 'pattern', S); pat.src = 'img/pattern.webp'; pat.alt = '';
  const fx = el('div', 'layer', S);
  cfg.extra?.(S, fx, A);
  const lines = (q('title') ? q('title').split('|') : cfg.lines);
  const T = title(S, lines, 75, cfg.titleY, cfg.size, 'title', cfg.pitch);
  const sub = at(el('div', 'sub', S, q('sub', cfg.sub)), 76, cfg.subY);
  const G = gline(S, cfg.line[2] ?? 75, cfg.line[1], cfg.line[0]);
  const logo = logoBig(S), sea = season(S), so = social(S), sp = sponsors(S);
  cfg.after?.(S, { T, sub, G });

  // петли, которые живут всегда
  drift(A.art, cfg.drift);
  shimmer(A.shimmer, cfg.hue ?? 26);
  if (cfg.motes) motes(fx, cfg.motes[0], cfg.motes[1]);
  if (cfg.flares) flares(fx, cfg.flares, cfg.flareEvery ?? 7);
  holo(sp, { delay: 3, every: 9 });
  lineSpark(G, { delay: 3.4, every: 8 });
  titleGlint(T, { delay: 4.2, every: 11 });
  sweep(A.sweep, { delay: 6, dur: 2.6, every: 9 });

  // вход
  const tl = gsap.timeline();
  inArt(tl, A.wrap, 0);
  tl.add(sweep(A.sweep, { dur: 2.2 }), 0.25);
  tl.fromTo(pat, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'main' }, 0);
  inTitle(tl, T, 0.45);
  inSub(tl, sub, 0.9);
  inLine(tl, G, 1.0);
  inFade(tl, [logo, sea], 0.2, { y: -12 });
  inFade(tl, [so, sp], 1.2, { y: 12, stagger: 0.1 });
  cfg.intro?.(tl);
  replayOnShow(tl);
  return { S, A, tl };
}
