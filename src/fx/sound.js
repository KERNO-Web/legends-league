// Звук сайта: всегда включён, едва слышно, без кнопки.
// Всё синтезируется WebAudio (без файлов): тёмный эмбиент-пад + тихие щелчки на наведение и клик.
// Браузеры запрещают звук до первого действия человека, поэтому старт — с первого клика/тапа/клавиши.

const LEVEL = 0.14; // общая громкость: «едва слышно»
let ctx = null, master = null, noiseBuf = null, started = false, lastTick = 0;

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

function startAmbient() {
  // пад: два расстроенных треугольника + квинта, через низкочастотный фильтр, который медленно «дышит»
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 6;
  lp.connect(master);
  const lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
  lfo.frequency.value = 0.07; lfoGain.gain.value = 180;
  lfo.connect(lfoGain).connect(lp.frequency);
  const voices = [[55, 0.32], [55.4, 0.28], [82.4, 0.16], [110.2, 0.08]].map(([f, g]) => {
    const o = ctx.createOscillator(), v = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = f; v.gain.value = g;
    o.connect(v).connect(lp);
    return o;
  });
  // «воздух»: шум через полосовой фильтр, очень тихо
  const air = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), ag = ctx.createGain();
  air.buffer = noiseBuf; air.loop = true;
  bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.7;
  ag.gain.value = 0.035;
  air.connect(bp).connect(ag).connect(master);
  [lfo, ...voices, air].forEach((n) => n.start());
}

// короткий щелчок: синус с падающей высотой + капля шума
function tick(kind = 'hover') {
  if (!started || ctx.state !== 'running') return;
  const now = performance.now();
  if (now - lastTick < 45) return;
  lastTick = now;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  const [f0, f1, vol, dur] = kind === 'click' ? [520, 260, 0.22, 0.09] : [1350, 820, 0.1, 0.06];
  o.type = 'sine';
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.02);
  const n = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), ng = ctx.createGain();
  n.buffer = noiseBuf; hp.type = 'highpass'; hp.frequency.value = 4000;
  ng.gain.setValueAtTime(vol * 0.35, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
  n.connect(hp).connect(ng).connect(master);
  n.start(t, Math.random()); n.stop(t + 0.03);
}

function start() {
  if (started || !ensureCtx()) return;
  started = true;
  ctx.resume().then(() => {
    startAmbient();
    const t = ctx.currentTime;
    master.gain.setValueAtTime(0, t);
    master.gain.linearRampToValueAtTime(LEVEL, t + 3);
  });
}

export function initSound() {
  ['pointerdown', 'keydown', 'touchend'].forEach((ev) => addEventListener(ev, start, { once: true, passive: true }));
  const sel = '.team, .match, .btn, .chip, .nav__links a, .sponsor, .screen, .tz__btn';
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest(sel);
    if (el && !el.contains(e.relatedTarget)) tick('hover');
  });
  document.addEventListener('click', (e) => { if (e.target.closest(sel)) tick('click'); });
  // вкладка в фоне — звук на паузе
  document.addEventListener('visibilitychange', () => {
    if (!ctx || !started) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });
}
