// Кристалл в hero: WebGL-шейдер поверх картинки дизайнера.
// Параллакс от курсора, RGB-расслоение от скорости мыши, перелив по граням,
// искры, а при скролле кристалл рассыпается на диагональные полосы.

const VERT = `
attribute vec2 a;
void main(){ gl_Position = vec4(a, 0., 1.); }`;

const FRAG = `
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;        // px канваса
uniform vec4 uRect;       // x, y, w, h картинки в px канваса (верх-лево)
uniform vec2 uMouse;      // -1..1, сглаженный
uniform float uVel;       // 0..1
uniform float uTime;
uniform float uScroll;    // 0..1 (уход hero)
uniform float uIntro;     // 0..1 (появление)
uniform float uDpr;

float hash(float n){ return fract(sin(n)*43758.5453123); }
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
  float fade = smoothstep(1., .72, p.y) * smoothstep(0., .08, p.y) * smoothstep(0., .25, p.x);
  return vec4(c.rgb * c.a * fade, c.a * fade);
}

void main(){
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 p = (px - uRect.xy) / uRect.zw;

  // параллакс: дальние части двигаются меньше
  float depth = .4 + .6 * smoothstep(.3, 1., p.x);
  p -= uMouse * vec2(.018, -.03) * depth;

  // полосы вдоль граней кристалла (диагональ ~ -19°)
  float axis = p.x * .94 + p.y * .34 * (uRect.w / uRect.z) * 3.;
  float band = floor(axis * 22.);
  float r = hash(band + 3.);
  vec2 dir = normalize(vec2(1., -.36));
  p -= dir * uScroll * (.04 + r * r * .5);
  p.y += uScroll * (r - .5) * .06;

  // появление: диагональная волна света
  float sweep = (p.x - p.y * .35) - (uIntro * 1.8 - .4);
  float shown = smoothstep(.12, -.02, sweep);
  float edge = smoothstep(.12, .0, abs(sweep - .05)) * (1. - uIntro);

  // хроматическое расслоение
  float ca = (.0018 + uVel * .012) * (1. + uScroll * 3.);
  vec2 cd = dir * ca;
  vec4 cr = tex(p + cd), cg = tex(p), cb = tex(p - cd);
  vec3 col = vec3(cr.r, cg.g, cb.b);
  float a = max(max(cr.a, cg.a), cb.a);

  // перелив по граням: шум, бегущий вдоль кристалла
  float lum = dot(col, vec3(.3, .59, .11));
  float n = noise(vec2(axis * 9. - uTime * .35, p.y * 6. + uTime * .12));
  float n2 = noise(p * vec2(18., 30.) + uTime * .2);
  float hi = smoothstep(.25, .85, lum);
  col += col * hi * (n - .45) * 1.1;
  col = mix(col, col * prism(n * .8 + axis * .6 + uTime * .04) * 1.6, .35 * hi);
  // блики-звёзды на ярких местах
  col += vec3(1., .9, .8) * pow(n2, 14.) * hi * 3.;

  // искры
  vec3 sp = vec3(0.);
  for (int L = 0; L < 2; L++){
    float fl = float(L);
    float sc = 46. + fl * 30.;
    vec2 q = px / uDpr / sc;
    q += vec2(-uTime * (.25 + fl * .2), uTime * (.12 + fl * .08));
    q += uMouse * (1.5 + fl * 2.);
    vec2 id = floor(q), f = fract(q) - .5;
    float h = hash2(id + fl * 17.);
    if (h > .86){
      vec2 o = vec2(hash2(id + 1.3), hash2(id + 7.1)) - .5;
      float d = length(f - o * .7);
      float tw = .5 + .5 * sin(uTime * (2. + h * 4.) + h * 40.);
      vec3 sc2 = mix(vec3(1., .78, .45), vec3(.75, .5, 1.), step(.93, h));
      sp += sc2 * smoothstep(.06, .0, d) * tw * (.6 + fl * .4);
    }
  }
  // искры гуще у кристалла, реже слева
  float sx = gl_FragCoord.x / uRes.x;
  sp *= smoothstep(.15, .75, sx) * (1. - uScroll);

  vec3 outc = col * shown + vec3(.85, .65, 1.) * edge * a * 2.5 + sp * uIntro;
  outc *= 1. - uScroll * .55;
  gl_FragColor = vec4(outc, 1.);
}`;

export function initCrystal(canvas, { src, reduced }) {
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
  ['uTex', 'uRes', 'uRect', 'uMouse', 'uVel', 'uTime', 'uScroll', 'uIntro', 'uDpr'].forEach((k) => (U[k] = gl.getUniformLocation(prog, k)));

  const state = { mx: 0, my: 0, tx: 0, ty: 0, vel: 0, scroll: 0, intro: reduced ? 1 : 0, ready: false, visible: true, imgW: 2172, imgH: 724 };

  const tex = gl.createTexture();
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  img.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    state.imgW = img.naturalWidth; state.imgH = img.naturalHeight;
    state.ready = true;
    resize();
  };

  let dpr = 1, W = 0, H = 0;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener('resize', resize);
  resize();

  // как в макете: кристалл во всю ширину сверху справа; на телефоне — крупнее, вылет вправо
  function rect() {
    const ar = state.imgW / state.imgH;
    let w = Math.max(W * 1.04, 1100);
    if (W < 860) w = W * 2.3;
    const h = w / ar;
    const x = W - w + (W < 860 ? W * 0.62 : W * 0.06);
    const y = W < 860 ? 40 : -h * 0.02;
    return [x * dpr, y * dpr, w * dpr, h * dpr];
  }

  window.addEventListener('pointermove', (e) => {
    const nx = (e.clientX / innerWidth) * 2 - 1, ny = (e.clientY / innerHeight) * 2 - 1;
    state.vel = Math.min(1, state.vel + Math.hypot(nx - state.tx, ny - state.ty) * 2.2);
    state.tx = nx; state.ty = ny;
  }, { passive: true });

  const t0 = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    if (!state.ready || !state.visible) return;
    state.mx += (state.tx - state.mx) * 0.06;
    state.my += (state.ty - state.my) * 0.06;
    state.vel *= 0.92;
    gl.uniform1i(U.uTex, 0);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform4f(U.uRect, ...rect());
    gl.uniform2f(U.uMouse, state.mx, state.my);
    gl.uniform1f(U.uVel, state.vel);
    gl.uniform1f(U.uTime, reduced ? 0 : (now - t0) / 1000);
    gl.uniform1f(U.uScroll, state.scroll);
    gl.uniform1f(U.uIntro, state.intro);
    gl.uniform1f(U.uDpr, dpr);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  requestAnimationFrame(frame);

  new IntersectionObserver(([en]) => { state.visible = en.isIntersecting; }).observe(canvas);
  return state;
}
