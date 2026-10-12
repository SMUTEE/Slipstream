/* The transform ring, drawn under the finger.

   On a phone the hand that chooses the chord colour is the hand covering the
   readout. The knob mirrors the choice for anyone watching, but the person
   playing needs it where they already are. Touch only: a mouse has no such
   problem and the knob is in plain sight. */

import { DETENTS, COMPASS } from '../music/detents.js';

const RADIUS = 86;
let root = null;

function build() {
  root = document.createElement('div');
  root.className = 'thumbring';
  root.setAttribute('aria-hidden', 'true');
  const centre = document.createElement('div');
  centre.className = 'tr-centre';
  root.appendChild(centre);
  COMPASS.forEach((detent, i) => {
    const label = document.createElement('div');
    label.className = 'tr-z';
    label.dataset.i = i;
    label.textContent = DETENTS[detent].name;
    const a = i * 45 * Math.PI / 180;
    label.style.marginLeft = (RADIUS * Math.sin(a)).toFixed(1) + 'px';
    label.style.marginTop = (-RADIUS * Math.cos(a)).toFixed(1) + 'px';
    root.appendChild(label);
  });
  document.body.appendChild(root);
}

export function showRing(x, y) {
  if (!root) build();
  root.style.left = x + 'px';
  root.style.top = y + 'px';
  highlight(-1);
  root.classList.add('on');
}

export function highlight(zone) {
  if (!root) return;
  root.querySelectorAll('.tr-z').forEach(l => {
    l.classList.toggle('hot', +l.dataset.i === zone);
  });
}

export function hideRing() {
  if (root) root.classList.remove('on');
}
