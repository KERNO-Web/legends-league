// Текстовые эффекты: разбивка на буквы, «расшифровка», рулетка цифр.

export function splitChars(el) {
  if (el.dataset.splitDone) return [...el.querySelectorAll('.char')];
  const text = el.textContent;
  el.setAttribute('aria-label', text.trim());
  el.textContent = '';
  const out = [];
  text.split(/(\s+)/).forEach((part) => {
    if (/^\s+$/.test(part)) { el.append(' '); return; }
    const w = document.createElement('span');
    w.className = 'split-line';
    w.setAttribute('aria-hidden', 'true');
    for (const ch of part) {
      const c = document.createElement('span');
      c.className = 'char';
      c.textContent = ch;
      w.append(c);
      out.push(c);
    }
    el.append(w);
  });
  el.dataset.splitDone = '1';
  return out;
}

const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789/+<>#';
export function scramble(el, { duration = 900, delay = 0 } = {}) {
  const final = el.dataset.final || (el.dataset.final = el.textContent);
  const start = performance.now() + delay;
  const len = final.length;
  return new Promise((resolve) => {
    function tick(now) {
      const t = Math.max(0, (now - start) / duration);
      let s = '';
      for (let i = 0; i < len; i++) {
        const ch = final[i];
        const reveal = t * (len + 6) - i;
        if (ch === ' ' || reveal >= 6) s += ch;
        else if (reveal > 0) s += GLYPHS[(Math.random() * GLYPHS.length) | 0];
        else s += ' ';
      }
      el.textContent = s;
      if (t < 1) requestAnimationFrame(tick); else { el.textContent = final; resolve(); }
    }
    requestAnimationFrame(tick);
  });
}

// Рулетка: каждая цифра крутится колонкой 0-9 и встаёт на место.
export function buildRoll(el) {
  const val = el.dataset.roll;
  el.textContent = '';
  el.setAttribute('aria-label', val);
  const cols = [];
  [...val].forEach((ch, i) => {
    if (!/\d/.test(ch)) { const s = document.createElement('span'); s.textContent = ch; s.setAttribute('aria-hidden', 'true'); el.append(s); return; }
    const col = document.createElement('span');
    col.className = 'roll__col';
    col.setAttribute('aria-hidden', 'true');
    const target = +ch;
    const loops = 1 + (i % 3);
    const seq = [];
    for (let l = 0; l < loops; l++) for (let d = 0; d < 10; d++) seq.push(d);
    for (let d = 0; d <= target; d++) seq.push(d);
    col.innerHTML = seq.map((d) => `<span>${d}</span>`).join('');
    col.dataset.steps = seq.length - 1;
    el.append(col);
    cols.push(col);
  });
  return cols;
}
