// Полноэкранные заставки (Starting / BRB / Offline / Ending): арт справа, крупный заголовок слева.
import {
  gsap, pattern, stage, el, at, artScene, logoBig, season, social, sponsors, title, gline, motes, flares,
  shimmer, sweep, drift, holo, lineSpark, titleGlint, inTitle, inLine, inFade, inSub, inArt, replayOnShow, q,
} from './hud.js';

export function sideScene(cfg) {
  const S = stage();
  const A = artScene(S, cfg.art, { video: cfg.video });
  const pat = pattern(S);
  const fx = el('div', 'layer', S);
  cfg.extra?.(S, fx, A);
  const lines = (q('title') ? q('title').split('|') : cfg.lines);
  const T = title(S, lines, 75, cfg.titleY, cfg.size, 'title', cfg.pitch);
  const sub = at(el('div', 'sub', S, q('sub', cfg.sub)), 76, cfg.subY);
  const G = gline(S, cfg.line[2] ?? 75, cfg.line[1], cfg.line[0]);
  const logo = logoBig(S), sea = season(S), so = social(S), sp = sponsors(S);
  cfg.after?.(S, { T, sub, G });

  // петли, которые живут всегда
  drift(A.cam, cfg.drift);
  shimmer(A.shimmer, cfg.hue ?? 26);
  if (cfg.motes) motes(fx, cfg.motes[0], cfg.motes[1]);
  // дымка у пола (её просили оставить), если у сцены нет своей
  if (cfg.fog !== false) {
    const f1 = at(el('div', 'fog', fx), 0, 760); f1.style.height = '300px';
    gsap.fromTo(f1, { xPercent: -5, opacity: 0.3 }, { xPercent: 5, opacity: 0.5, duration: 16, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  }
  // блики — по одному из очереди акцентов: арт → заголовок → спонсоры → линия
  sweep(A.sweep, { dur: 2.8, every: 1 });
  titleGlint(T);
  holo(sp);
  lineSpark(G);

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
