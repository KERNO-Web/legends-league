// Звук сайта: выключен по умолчанию, включается кнопкой в шапке.
// Всё синтезируется WebAudio (без файлов): тёмный эмбиент-пад + тихие щелчки на наведение и клик.
// Выбор запоминается; если звук был включён, он стартует с первым жестом (политика автоплея браузеров).

const KEY = 'lpl-sound';
let ctx = null, master = null, ambient = null, noiseBuf = null, on = false, lastTick = 0;

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
  if (ambient) return;
  const out = ctx.createGain();
  out.gain.value = 1;
  out.connect(master);
  // пад: два расстроенных треугольника + квинта, через низкочастотный фильтр, который медленно «дышит»
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 6;
  lp.connect(out);
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
  air.connect(bp).connect(ag).connect(out);
  [lfo, ...voices, air].forEach((n) => n.start());
  ambient = { nodes: [lfo, ...voices, air], out };
}

function fade(to, sec) {
  const t = ctx.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(master.gain.value, t);
  master.gain.linearRampToValueAtTime(to, t + sec);
}

// короткий щелчок: синус с падающей высотой + капля шума
function tick(kind = 'hover') {
  if (!on || !ctx || ctx.state !== 'running') return;
  const now = performance.now();
  if (now - lastTick < 45) return;
  lastTick = now;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  const [f0, f1, vol, dur] = kind === 'click' ? [520, 260, 0.11, 0.09] : [1350, 820, 0.05, 0.06];
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

async function setOn(v, btn) {
  on = v;
  try { localStorage.setItem(KEY, v ? '1' : '0'); } catch {}
  btn.setAttribute('aria-pressed', String(v));
  btn.classList.toggle('is-on', v);
  if (v) {
    if (!ensureCtx()) return;
    await ctx.resume();
    startAmbient();
    fade(0.55, 1.6);
  } else if (ctx) {
    fade(0, 0.5);
  }
}

export function initSound(btn) {
  if (!btn) return;
  btn.addEventListener('click', () => setOn(!on, btn).then(() => on && tick('click')));
  // наведение и клики по интерактивным элементам
  const sel = '.team, .match, .btn, .chip, .nav__links a, .sponsor, .screen, .tz__btn';
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest(sel);
    if (el && !el.contains(e.relatedTarget)) tick('hover');
  });
  document.addEventListener('click', (e) => { if (e.target.closest(sel)) tick('click'); });
  // если звук был включён в прошлый раз — включить с первым жестом
  let saved = false;
  try { saved = localStorage.getItem(KEY) === '1'; } catch {}
  if (saved) {
    on = true; // логически включён; звук пойдёт с первым жестом
    btn.classList.add('is-on'); btn.setAttribute('aria-pressed', 'true');
    const first = (e) => {
      removeEventListener('pointerdown', first); removeEventListener('keydown', first);
      if (e && btn.contains(e.target)) return; // первый жест — сама кнопка: её клик и решит (выключит)
      setOn(true, btn);
    };
    addEventListener('pointerdown', first, { once: true });
    addEventListener('keydown', first, { once: true });
  }
  document.addEventListener('visibilitychange', () => {
    if (!ctx || !on) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });
}
