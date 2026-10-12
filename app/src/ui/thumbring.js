/* The transform ring, drawn at the point of contact.

   It is a legend, not just a way around a hand covering the screen. Without it
   you have to already know that sliding does anything, and even then the eight
   options are invisible: the knob shows the result, never the menu. So it shows
   for a cursor as well as a thumb. */

import { DETENTS, COMPASS } from '../music/detents.js';

const RADIUS = 86;
const HALF = 115;      /* half the overlay box, for keeping labels on screen */
const MARGIN = 10;
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

/**
 * @param current the detent already selected, highlighted so you can see where
 *                you are before moving. -1 when it has no compass position.
 */
export function showRing(x, y, current) {
  if (!root) build();
  /* Clamp the box to the viewport. Pads near an edge would otherwise push
     labels off screen. Nudging the whole cluster keeps the angular arrangement
     intact, which is what actually communicates which way to slide. */
  const cx = Math.min(Math.max(x, HALF + MARGIN), innerWidth - HALF - MARGIN);
  const cy = Math.min(Math.max(y, HALF + MARGIN), innerHeight - HALF - MARGIN);
  root.style.left = cx + 'px';
  root.style.top = cy + 'px';
  highlight(COMPASS.indexOf(current));
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
