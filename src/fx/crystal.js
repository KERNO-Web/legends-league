// Персонаж в hero: WebGL-шейдер поверх арта дизайнера (макет v2), с честной прозрачностью.
// Пробуждение: фронт света проводит фигуру из тёмного силуэта в цвет (uWake 0→1, линейно).
// После: дым из глаз, дыхание их свечения, волна энергии по огненной броне, редкие искры,
// медленный перелив, лёгкий параллакс и узкий блик за курсором (только десктоп).
// Рендер только пока hero виден и вкладка активна; в покое — каждый второй кадр.

const VERT = `
attribute vec2 a;
void main(){ gl_Position = vec4(a, 0., 1.); }`;

const FRAG = `
precision highp float;
uniform sampler2D uTex;
uniform sampler2D uMask;   // маска летящих осколков (отдельный слой глубины)
uniform vec2 uShardOff;    // сдвиг слоя осколков (сильнее параллакса фигуры + покачивание)
uniform vec2 uRes;        // px канваса
uniform vec4 uRect;       // x, y, w, h картинки в px канваса (верх-лево)
uniform vec2 uMouse;      // -1..1, сглаженный (параллакс)
uniform vec2 uPointer;    // курсор в px канваса
uniform float uGlint;     // 0..1 сила блика за курсором
uniform float uTime;
uniform float uScroll;    // 0..1 уход hero
uniform float uWake;      // 0..1 позиция фронта пробуждения
uniform float uFade;      // 0..1 общая видимость (запасной путь без фронта)

float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.-2.*f);
  return mix(mix(hash2(i), hash2(i+vec2(1,0)), u.x), mix(hash2(i+vec2(0,1)), hash2(i+vec2(1,1)), u.x), u.y);
}
vec3 prism(float t){ return .55 + .45*cos(6.2831*(t + vec3(0., .33, .67))); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++){ v += a * noise(p); p = p * 2.03 + 17.1; a *= .5; } return v; }

// Дым из глаза: струйка вдоль D, ширина растёт, рвётся шумом и тает. e — точка относительно глаза (изотропно).
float smoke(vec2 e, vec2 D, float seed){
  float u = dot(e, D), v = dot(e, vec2(-D.y, D.x));
  const float L = .13;
  if (u < -.012 || u > L || abs(v) > .06) return 0.;
  float t = uTime;
  v += (fbm(vec2(u * 22. - t * .55, t * .18 + seed)) - .5) * .045 * smoothstep(0., L, u); // извивается
  float w = .003 + u * .16;
  float body = exp(-v * v / (w * w));
  float tear = fbm(vec2(u * 34. - t * 1.25, v * 70. + seed));                          // рвётся на клочья
  return body * smoothstep(-.012, .006, u) * (1. - smoothstep(L * .35, L, u)) * smoothstep(.32, .75, tear) * 1.5;
}

vec4 raw(vec2 p){
  if (p.x < 0. || p.x > 1. || p.y < 0. || p.y > 1.) return vec4(0.);
  vec4 c = texture2D(uTex, p);
  // персонаж: снизу мягкий уход перед плашкой stats (в макете обрезан на y 760 из 125…890)
  float fade = 1. - smoothstep(.76, .84, p.y);
  return vec4(c.rgb * c.a * fade, c.a * fade);
}
float shardM(vec2 p){ return (p.x < 0. || p.x > 1. || p.y < 0. || p.y > 1.) ? 0. : texture2D(uMask, p).r; }
// два слоя: фигура без осколков + осколки со своим сдвигом поверх
vec4 tex(vec2 p){
  vec4 b = raw(p) * (1. - shardM(p));
  vec2 ps = p - uShardOff;
  vec4 s = raw(ps) * shardM(ps);
  return s + b * (1. - s.a);
}

void main(){
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 p = (px - uRect.xy) / uRect.zw;
  // ранний выход за пределами картинки (с запасом на параллакс)
  if (any(lessThan(p, vec2(-.02))) || any(greaterThan(p, vec2(1.02)))) { gl_FragColor = vec4(0.); return; }

  float depth = .4 + .6 * smoothstep(.3, 1., p.x);
  p -= uMouse * vec2(.006, -.006) * depth;

  float axis = p.x * .94 + p.y * 1.02 * (uRect.w / uRect.z);
  vec2 dir = normalize(vec2(1., -.36));
  vec2 cd = dir * .0012;
  vec4 cr = tex(p + cd), cg = tex(p), cb = tex(p - cd);
  vec3 col = vec3(cr.r, cg.g, cb.b);
  float a = max(max(cr.a, cg.a), cb.a);

  float lum = dot(col, vec3(.3, .59, .11));
  float n = noise(vec2(axis * 9. - uTime * .12, p.y * 6. + uTime * .04));
  float n2 = noise(p * vec2(18., 30.) + uTime * .06);
  float hi = smoothstep(.25, .85, lum);
  col += col * hi * (n - .45) * .35;
  col = mix(col, col * prism(n * .8 + axis * .6 + uTime * .015) * 1.5, .14 * hi); // лёгкий перелив только по светящейся броне
  col += vec3(1., .9, .8) * pow(n2, 14.) * hi * a * 1.5;

  vec2 q = p * vec2(1., uRect.w / uRect.z);
  float fire = smoothstep(.08, .3, col.r - col.b) * smoothstep(.3, .75, lum);
  float energy = .5 + .5 * sin(uTime * 1.3 + q.y * 16. - q.x * 4.);
  col += col * fire * (.1 + .32 * smoothstep(.55, 1., energy) * (.6 + .5 * n));

  // фронт пробуждения: ось от широкого края (A) к хвосту (B), в изотропных координатах
  vec2 A = vec2(1.0, .05), B = vec2(.25, .5);
  vec2 ab = B - A;
  float s = dot(q - A, ab) / dot(ab, ab) + (n - .5) * .025;
  float d = mix(-.08, 1.35, uWake) - s;               // > 0: уже освещено
  float lit = smoothstep(-.015, .015, d);
  float after = lit * exp(-max(d, 0.) * 7.) * .45 * (1. - .6 * hi); // пересвет за кромкой: на тёмных гранях, не на ярких
  float rim = exp(-d * d / .002) * smoothstep(.04, .3, lum) * (.4 + hi);  // кромка мягкая и только по светлым граням
  vec3 pre = vec3(.10, .07, .16) * a + vec3(.42, .30, .62) * lum * .12; // до фронта — тёмный фиолетовый силуэт
  col = mix(pre, col * (1. + after), lit) + vec3(1., .86, .62) * rim * 1.1;

  // живые слои — только когда персонаж «проснулся»
  float live = smoothstep(.6, 1., uWake);
  float extraA = 0.;
  // глаза (из арта: левый 0.355/0.302, правый 0.405/0.281) — дышат свечением с лёгким мерцанием
  vec2 EL = vec2(.355, .302 * uRect.w / uRect.z), ER = vec2(.405, .281 * uRect.w / uRect.z);
  vec2 eL = q - EL, eR = q - ER;
  if (abs(eL.x) < .16 && abs(eL.y) < .12 || abs(eR.x) < .16 && abs(eR.y) < .12) {
    float flick = noise(vec2(uTime * 3.1, 3.7)) - .5;
    float pL = .72 + .22 * sin(uTime * 2.1) + .12 * flick, pR = .72 + .22 * sin(uTime * 2.1 + 1.3) + .12 * flick;
    float halo = exp(-dot(eL, eL) / .00028) * pL + exp(-dot(eR, eR) / .00028) * pR;
    float core = exp(-dot(eL, eL) / .00002) * pL + exp(-dot(eR, eR) / .00002) * pR;
    vec3 eyeC = vec3(.45, .58, 1.) * halo * .6 + vec3(.85, .9, 1.) * core * .5;
    // дым: правый глаз вверх-вправо, левый влево-вверх (как на арте)
    float sm = smoke(eR, normalize(vec2(1., -.5)), 1.7) + smoke(eL, normalize(vec2(-1., -.3)), 5.3) * .8;
    vec3 smC = vec3(.66, .68, 1.) * sm * .5;
    col += (eyeC + smC) * live;
    extraA += (halo * .25 + sm * .4) * live;
  }
  // искры: редкие, поднимаются вокруг фигуры
  for (int Ly = 0; Ly < 2; Ly++) {
    float fl = float(Ly);
    vec2 g = q * (16. + fl * 9.);
    g.y += uTime * (.45 + fl * .2);
    g.x += sin(uTime * .6 + g.y * .8 + fl) * .35;
    vec2 id = floor(g), fr = fract(g) - .5;
    float h = hash2(id + fl * 31.);
    if (h > .93) {
      vec2 o = vec2(hash2(id + 2.1), hash2(id + 8.3)) - .5;
      float dd = length(fr - o * .6);
      float tw = .5 + .5 * sin(uTime * (2. + h * 5.) + h * 50.);
      vec3 sc = mix(vec3(1., .62, .28), vec3(.78, .55, 1.), step(.965, h));
      float sp = smoothstep(.09, 0., dd) * tw * smoothstep(.12, .3, p.x) * (1. - smoothstep(.62, .8, p.y)) * smoothstep(.04, .14, p.y);
      col += sc * sp * live;
      extraA += sp * live;
    }
  }

  // узкий блик за курсором под углом граней (115°)
  vec2 gd = vec2(.906, .423);
  float k = dot(px - uPointer, gd) / uRect.z;
  col += vec3(1., .9, .72) * exp(-k * k / .00012) * hi * a * .9 * uGlint;

  float k2 = uFade * (1. - uScroll * .7);
  gl_FragColor = vec4(col * k2, clamp(a + extraA, 0., 1.) * k2); // премультиплированная альфа: персонаж не просвечивает
}`;

export function initCrystal(canvas, { src, maskSrc, reduced, mobile }) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  if (!gl) return null;

  const sh = (type, s) => { const o = gl.createShader(type); gl.shaderSource(o, s); gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  ['uTex', 'uMask', 'uShardOff', 'uRes', 'uRect', 'uMouse', 'uPointer', 'uGlint', 'uTime', 'uScroll', 'uWake', 'uFade'].forEach((k) => (U[k] = gl.getUniformLocation(prog, k)));

  // состояние, которое двигает main.js (через gsap)
  const state = { wake: reduced ? 1 : 0, fade: 1, scroll: 0, glint: 0, imgW: 2172, imgH: 724 };
  let mx = 0, my = 0, tx = 0, ty = 0, pxX = -1e4, pxY = -1e4, ptX = -1e4, ptY = -1e4;
  let ready = false, visible = true, raf = 0, frame = 0, t0 = performance.now(), paused = 0;
  let lastKey = '';

  let resolveReady;
  state.ready = new Promise((r) => (resolveReady = r));

  // маска осколков — второй текстурный слот; пока не загрузилась, маска пустая (осколки двигаются вместе с фигурой)
  const maskTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, maskTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 1, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, new Uint8Array([0]));
  [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach((k) => gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR));
  [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((k) => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE));
  if (maskSrc) {
    const mi = new Image();
    mi.src = maskSrc;
    mi.onload = () => { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, maskTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, mi); gl.activeTexture(gl.TEXTURE0); kick(); };
  }
  gl.activeTexture(gl.TEXTURE0);

  const tex = gl.createTexture();
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  img.onload = () => {
    let source = img;
    // на телефоне текстура вдвое меньше: без мипмапов большая текстура на низком DPR рябит
    if (mobile) {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth >> 1; c.height = img.naturalHeight >> 1;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      source = c;
    }
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    state.imgW = img.naturalWidth; state.imgH = img.naturalHeight;
    ready = true;
    resize();
    resolveReady();
    kick();
  };
  img.onerror = () => resolveReady(false);

  let dpr = 1, W = 0, H = 0, cachedRect = null;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    cachedRect = null;
    lastKey = '';
    kick();
  }
  window.addEventListener('resize', resize);
  resize();

  // Позиция из SVG макета v2 (1440): персонаж x 471, y 125, ширина 1370 (отражён). Считаем в rem от левого края контейнера
  // (контейнер 81.25rem, его левый край в макете на x 70), чтобы на любой ширине персонаж стоял как в макете.
  function rect() {
    const ar = state.imgW / state.imgH;
    if (W <= 860) {
      const w = W * 1.7;
      return [(W - w * 0.62) * dpr, 40 * dpr, w * dpr, (w / ar) * dpr];
    }
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const wrapLeft = Math.max((W - 81.25 * rem) / 2, 0);
    const w = 85.65 * rem;
    return [(wrapLeft + 25.06 * rem) * dpr, 7.824 * rem * dpr, w * dpr, (w / ar) * dpr];
  }

  if (!mobile && !reduced) {
    window.addEventListener('pointermove', (e) => {
      tx = (e.clientX / innerWidth) * 2 - 1; ty = (e.clientY / innerHeight) * 2 - 1;
      const r = canvas.getBoundingClientRect();
      ptX = (e.clientX - r.left) * dpr; ptY = (e.clientY - r.top) * dpr;
      if (pxX < -1e3) { pxX = ptX; pxY = ptY; }
      kick();
    }, { passive: true });
  }

  function draw(now) {
    gl.uniform1i(U.uTex, 0);
    gl.uniform1i(U.uMask, 1);
    // осколки ближе к зрителю: сдвиг за мышью в ~3 раза сильнее фигуры + медленное покачивание
    const tt = reduced ? 0 : (now - t0) / 1000;
    gl.uniform2f(U.uShardOff, mx * 0.006 + Math.sin(tt * 0.7) * 0.0015, -my * 0.007 + Math.cos(tt * 0.9) * 0.002);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform4f(U.uRect, ...(cachedRect ||= rect()));
    gl.uniform2f(U.uMouse, mx, my);
    gl.uniform2f(U.uPointer, pxX, pxY);
    gl.uniform1f(U.uGlint, state.glint);
    gl.uniform1f(U.uTime, reduced ? 0 : (now - t0) / 1000);
    gl.uniform1f(U.uScroll, state.scroll);
    gl.uniform1f(U.uWake, state.wake);
    gl.uniform1f(U.uFade, state.fade);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function loop(now) {
    raf = 0;
    if (!ready || !visible || document.hidden) return;
    mx += (tx - mx) * 0.035; my += (ty - my) * 0.035;
    pxX += (ptX - pxX) * 0.12; pxY += (ptY - pxY) * 0.12;
    if (reduced) {
      const key = canvas.width + 'x' + canvas.height + ':' + state.scroll.toFixed(3);
      if (key !== lastKey) { lastKey = key; draw(now); }
      return; // один кадр и стоп; следующий — по kick()
    }
    // в покое (фронт прошёл, мышь почти стоит) рисуем каждый второй кадр
    const calm = state.wake >= 1 && Math.abs(tx - mx) < 0.002 && Math.abs(ptX - pxX) < 0.5;
    frame++;
    if (!calm || frame % 2 === 0) draw(now);
    raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf && ready && visible && !document.hidden) raf = requestAnimationFrame(loop); }
  state.kick = kick;

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) paused = performance.now();
    else { if (paused) t0 += performance.now() - paused; paused = 0; kick(); }
  });
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; kick(); }).observe(canvas);
  return state;
}
