/* Phone layout.

   The markup is the same at every width. What changes is where the transport
   row lives: in the loop card on a desktop, pinned to the bottom of the screen
   on a phone, where a thumb can reach it without scrolling away from the pads. */

import { el } from './dom.js';

const PHONE = '(max-width: 640px)';
let mq = null, onPhone = null;

function moveTransport(toBar) {
  const row = document.querySelector('.tprimary');
  if (!row) return;
  const bar = el('mbar'), card = document.querySelector('.loopcard');
  if (toBar && row.parentElement !== bar) bar.appendChild(row);
  if (!toBar && row.parentElement !== card) card.insertBefore(row, card.firstChild);
}

export function openSheet(open) {
  el('sheet').classList.toggle('open', open);
  el('sheetbg').classList.toggle('open', open);
  el('gearbtn').setAttribute('aria-expanded', String(open));
}

export function initMobile() {
  mq = matchMedia(PHONE);
  const apply = () => {
    if (mq.matches === onPhone) return;
    onPhone = mq.matches;
    moveTransport(onPhone);
    if (!onPhone) openSheet(false);
  };
  mq.addEventListener('change', apply);
  apply();

  el('gearbtn').onclick = () => openSheet(!el('sheet').classList.contains('open'));
  el('sheetbg').onclick = () => openSheet(false);
  el('sheetgrab').onclick = () => openSheet(false);
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && el('sheet').classList.contains('open')) openSheet(false);
  });
}

/** Four dots in the bar: the at-a-glance version of the layer list. */
export function renderLayerDots(layers) {
  const box = el('laydots');
  if (!box) return;
  box.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const b = document.createElement('b');
    const ly = layers[i];
    if (ly) b.style.background = ly.muted ? '#2A3346' : ly.hue;
    box.appendChild(b);
  }
}
