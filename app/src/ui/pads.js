/* Seven scale-degree pads. The transform gesture starts here rather than on the
   knob, so one thumb can play and reshape a chord without moving. */

import { el } from './dom.js';
import { zoneFor, COMPASS } from '../music/detents.js';
import { DEGREE_HUES } from '../state/store.js';

let root, gesture = null;

export function createPads({ onPlay, onDetent, onRelease }) {
  root = el('pads');
  for (let d = 0; d < 7; d++) {
    const b = document.createElement('button');
    b.className = 'pad';
    b.type = 'button';
    b.dataset.d = d;
    b.style.setProperty('--c', DEGREE_HUES[d]);
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', 'Degree ' + (d + 1));
    b.innerHTML = '<span class="n">' + (d + 1) + '</span><span class="r"></span>';
    root.appendChild(b);
  }
  root.addEventListener('pointerdown', e => {
    const pad = e.target.closest('.pad');
    if (!pad) return;
    gesture = { x: e.clientX, y: e.clientY };
    try { pad.setPointerCapture(e.pointerId); } catch (err) {}
    onPlay(+pad.dataset.d);
    e.preventDefault();
  });
  root.addEventListener('pointermove', e => {
    if (!gesture) return;
    const zone = zoneFor(e.clientX - gesture.x, e.clientY - gesture.y);
    onDetent(zone < 0 ? 0 : COMPASS[zone]);
  });
  const up = () => { if (!gesture) return; gesture = null; onRelease(); };
  root.addEventListener('pointerup', up);
  root.addEventListener('pointercancel', up);
}

export function renderPads(romans, activeDegree) {
  for (let d = 0; d < 7; d++) {
    const pad = root.children[d];
    pad.querySelector('.r').textContent = romans[d];
    const on = d === activeDegree;
    pad.dataset.on = on ? '1' : '0';
    pad.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
}
