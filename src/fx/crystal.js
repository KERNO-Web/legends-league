// Кристалл в hero: WebGL-шейдер поверх картинки дизайнера.
// Пробуждение: фронт света идёт по осколку от широкого края к хвосту (uWake 0→1, линейно).
// После: медленный перелив по граням, лёгкий параллакс и узкий блик за курсором (только десктоп).
// Рендер только пока hero виден и вкладка активна; в покое — каждый второй кадр.

const VERT = `
attribute vec2 a;
void main(){ gl_Position = vec4(a, 0., 1.); }`;

const FRAG = `
precision highp float;
uniform sampler2D uTex;
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

vec4 tex(vec2 p){
  if (p.x < 0. || p.x > 1. || p.y < 0. || p.y > 1.) return vec4(0.);
  vec4 c = texture2D(uTex, p);
  // мягкие края картинки; низ гасим слабо, чтобы хвост доходил до кнопок, как в макете
  float fade = smoothstep(1., .9, p.y) * smoothstep(0., .06, p.y) * smoothstep(0., .18, p.x);
  return vec4(c.rgb * c.a * fade, c.a * fade);
}

void main(){
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 p = (px - uRect.xy) / uRect.zw;
  // ранний выход за пределами картинки (с запасом на параллакс)
  if (any(lessThan(p, vec2(-.02))) || any(greaterThan(p, vec2(1.02)))) { gl_FragColor = vec4(0., 0., 0., 1.); return; }

  float depth = .4 + .6 * smoothstep(.3, 1., p.x);
  p -= uMouse * vec2(.008, -.014) * depth;

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
  col += col * hi * (n - .45) * 1.1;
  col = mix(col, col * prism(n * .8 + axis * .6 + uTime * .015) * 1.6, .35 * hi);
  col += vec3(1., .9, .8) * pow(n2, 14.) * hi * 3.;

  // фронт пробуждения: ось от широкого края (A) к хвосту (B), в изотропных координатах
  vec2 q = p * vec2(1., uRect.w / uRect.z);
  vec2 A = vec2(1.02, .02), B = vec2(.30, .31);
  vec2 ab = B - A;
  float s = dot(q - A, ab) / dot(ab, ab) + (n - .5) * .025;
  float d = mix(-.08, 1.35, uWake) - s;               // > 0: уже освещено
  float lit = smoothstep(-.015, .015, d);
  float after = lit * exp(-max(d, 0.) * 7.) * .45 * (1. - .6 * hi); // пересвет за кромкой: на тёмных гранях, не на ярких
  float rim = exp(-d * d / .002) * smoothstep(.04, .3, lum) * (.4 + hi);  // кромка мягкая и только по светлым граням
  vec3 pre = vec3(.42, .30, .62) * lum * .1;          // до фронта — тёмный фиолетовый силуэт
  col = mix(pre, col * (1. + after), lit) + vec3(1., .86, .62) * rim * 1.1;

  // узкий блик за курсором под углом граней (115°)
  vec2 gd = vec2(.906, .423);
  float k = dot(px - uPointer, gd) / uRect.z;
  col += vec3(1., .9, .72) * exp(-k * k / .00012) * hi * a * .9 * uGlint;

  gl_FragColor = vec4(col * uFade * (1. - uScroll * .7), 1.);
}`;

export function initCrystal(canvas, { src, reduced, mobile }) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
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
  ['uTex', 'uRes', 'uRect', 'uMouse', 'uPointer', 'uGlint', 'uTime', 'uScroll', 'uWake', 'uFade'].forEach((k) => (U[k] = gl.getUniformLocation(prog, k)));

  // состояние, которое двигает main.js (через gsap)
  const state = { wake: reduced ? 1 : 0, fade: 1, scroll: 0, glint: 0, imgW: 2172, imgH: 724 };
  let mx = 0, my = 0, tx = 0, ty = 0, pxX = -1e4, pxY = -1e4, ptX = -1e4, ptY = -1e4;
  let ready = false, visible = true, raf = 0, frame = 0, t0 = performance.now(), paused = 0;
  let lastKey = '';

  let resolveReady;
  state.ready = new Promise((r) => (resolveReady = r));

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

  // Позиция из SVG макета (1440): x −280, y 122, ширина 1913. Считаем в rem от левого края контейнера
  // (контейнер 81.25rem, его левый край в макете на x 70), чтобы на любой ширине кристалл стоял как в макете.
  function rect() {
    const ar = state.imgW / state.imgH;
    if (W <= 860) {
      const w = W * 2.3;
      return [(W - w + W * 0.72) * dpr, -70 * dpr, w * dpr, (w / ar) * dpr];
    }
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const wrapLeft = Math.max((W - 81.25 * rem) / 2, 0);
    const w = 119.56 * rem;
    return [(wrapLeft - 21.875 * rem) * dpr, 7.625 * rem * dpr, w * dpr, (w / ar) * dpr];
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
