/* Keys 1 to 7 play. The nine-key cluster mirrors the knob spatially, and the
   bracket keys step through the four detents between the compass points. */

import { COMPASS } from '../music/detents.js';

const CLUSTER = { q: 10, w: 0, e: 1, a: 9, s: 0, d: 3, z: 7, x: 6, c: 4 };
const ARROWS = { ArrowUp: 0, ArrowRight: 90, ArrowDown: 180, ArrowLeft: 270 };

export function bindKeyboard(h) {
  const numsDown = new Set();
  const arrowsDown = new Set();

  const arrowDetent = () => {
    if (!arrowsDown.size) return null;
    let x = 0, y = 0;
    arrowsDown.forEach(k => {
      const a = ARROWS[k] * Math.PI / 180;
      x += Math.sin(a); y += Math.cos(a);
    });
    if (!x && !y) return null;
    let a = Math.atan2(x, y) * 180 / Math.PI;
    if (a < 0) a += 360;
    return COMPASS[Math.round(a / 45) % 8];
  };

  addEventListener('keydown', ev => {
    const tag = ev.target.tagName;
    if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA') return;
    const key = ev.key, lower = key.toLowerCase();
    const n = parseInt(key, 10);

    if (n >= 1 && n <= 7) {
      if (numsDown.has(key)) return;
      numsDown.add(key);
      ev.preventDefault();
      h.play(n - 1);
      return;
    }
    if (lower in CLUSTER) { ev.preventDefault(); h.detent(CLUSTER[lower]); return; }
    if (key === '[') { ev.preventDefault(); h.step(-1); return; }
    if (key === ']') { ev.preventDefault(); h.step(1); return; }
    if (key in ARROWS) {
      ev.preventDefault();
      arrowsDown.add(key);
      const d = arrowDetent();
      if (d !== null) h.detent(d);
      return;
    }
    if (key === 'Escape') { h.detent(0); return; }
    if (key === ' ') { ev.preventDefault(); h.toggleHold(); return; }
    if (lower === 'g') { ev.preventDefault(); h.toggleSlide(); return; }
    if (lower === 'v') { ev.preventDefault(); h.cycleVoicing(); return; }
    if (lower === 'o') { ev.preventDefault(); h.cycleOctave(); return; }
    if (lower === 'r') { ev.preventDefault(); h.record(); return; }
    if (key === 'Enter') { ev.preventDefault(); h.run(); return; }
    if (key === 'Backspace') { ev.preventDefault(); h.undoLayer(); }
  });

  addEventListener('keyup', ev => {
    const n = parseInt(ev.key, 10);
    if (n >= 1 && n <= 7 && numsDown.delete(ev.key)) {
      if (!numsDown.size) h.release();
      return;
    }
    if (ev.key in ARROWS) arrowsDown.delete(ev.key);
  });
}
