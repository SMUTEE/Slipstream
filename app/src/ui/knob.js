/* The chassis: dot ring, transform arc, playhead ring, indicator and readout.
   Knows nothing about chords beyond the strings it is handed. */

import { el, svgEl, arcPath } from './dom.js';

const DOTS = 48, R_DOTS = 158, R_ARC = 136, R_PLAY = 181;
let knob, rot, arc, dotsG, ticksG, ph, phTrack, face, chordEl, subEl;
let onDetent = () => {};
let drag = null;

export function createKnob(handlers) {
  onDetent = handlers.onDetent;
  knob = el('knob'); rot = el('knobrot'); arc = el('arc');
  dotsG = el('dots'); ticksG = el('ticks'); ph = el('ph'); phTrack = el('phtrack');
  face = el('face'); chordEl = el('chord'); subEl = el('sub');

  for (let i = 0; i < DOTS; i++) {
    const a = (i / DOTS * 360 - 90) * Math.PI / 180;
    dotsG.appendChild(svgEl('circle', {
      cx: (200 + R_DOTS * Math.cos(a)).toFixed(2),
      cy: (200 + R_DOTS * Math.sin(a)).toFixed(2),
      r: 2.1, fill: '#0C1019'
    }));
  }

  const angleAt = e => {
    const b = knob.getBoundingClientRect();
    let a = Math.atan2(e.clientX - (b.left + b.width / 2), -(e.clientY - (b.top + b.height / 2))) * 180 / Math.PI;
    return a < 0 ? a + 360 : a;
  };
  knob.addEventListener('pointerdown', e => {
    drag = { prev: angleAt(e), acc: 0, from: null };
    drag.from = handlers.currentDetent() * 30;
    drag.acc = drag.from;
    try { knob.setPointerCapture(e.pointerId); } catch (err) {}
    handlers.onGesture();
    e.preventDefault();
  });
  knob.addEventListener('pointermove', e => {
    if (!drag) return;
    const a = angleAt(e);
    let d = a - drag.prev;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    drag.acc += d; drag.prev = a;
    onDetent((((Math.round(drag.acc / 30) % 12) + 12) % 12));
  });
  const up = () => { drag = null; };
  knob.addEventListener('pointerup', up);
  knob.addEventListener('pointercancel', up);
}

export function drawTicks(bars) {
  ticksG.innerHTML = '';
  for (let i = 0; i < bars; i++) {
    const a = (i / bars * 360 - 90) * Math.PI / 180;
    ticksG.appendChild(svgEl('circle', {
      cx: (200 + R_PLAY * Math.cos(a)).toFixed(2),
      cy: (200 + R_PLAY * Math.sin(a)).toFixed(2),
      r: i === 0 ? 2.8 : 1.8, class: 'tick'
    }));
  }
}

export function renderKnob({ detent, hue, live, detentName }) {
  const angle = detent * 30;
  document.documentElement.style.setProperty('--hue', hue);
  rot.style.transform = 'rotate(' + angle + 'deg)';
  knob.style.setProperty('--rimop', live ? .55 : 0);
  knob.setAttribute('aria-valuenow', String(detent));
  knob.setAttribute('aria-valuetext', detentName);

  const litCount = Math.round(detent / 12 * DOTS);
  for (let i = 0; i < DOTS; i++) {
    const c = dotsG.children[i];
    if (i < litCount) {
      const t = litCount > 1 ? i / (litCount - 1) : 1;
      c.setAttribute('fill', hue);
      c.setAttribute('opacity', (.16 + .84 * t).toFixed(3));
      c.setAttribute('r', (2.1 + 1.4 * t).toFixed(2));
    } else {
      c.setAttribute('fill', '#0C1019');
      c.setAttribute('opacity', '1');
      c.setAttribute('r', '2.1');
    }
  }

  if (angle > 0) {
    arc.setAttribute('d', arcPath(200, 200, R_ARC, 0, angle));
    arc.setAttribute('stroke', hue);
    arc.setAttribute('stroke-width', '7');
    arc.style.filter = 'drop-shadow(0 0 9px ' + hue + ') drop-shadow(0 0 24px ' + hue + ')';
  } else {
    arc.setAttribute('d', '');
  }
}

export function renderFace({ chord, sub, idle }) {
  face.classList.toggle('idle', idle);
  if (chord !== null) chordEl.textContent = chord;
  if (sub !== null) subEl.textContent = sub;
}

/**
 * The clock drawn round the edge. Never the accent colour: that means the knob,
 * and two meanings in one blue read as one broken thing.
 */
export function drawPlayhead({ running, recording, fraction, recFrom, progress }) {
  phTrack.setAttribute('opacity', running ? '1' : '0');
  let d = '';
  if (recording) {
    if (progress > .002) d = arcPath(200, 200, R_PLAY, recFrom * 360, recFrom * 360 + Math.min(359.8, progress * 360));
  } else if (fraction > .002) {
    d = arcPath(200, 200, R_PLAY, 0, Math.min(359.8, fraction * 360));
  }
  ph.setAttribute('d', d);
  ph.setAttribute('stroke', recording ? '#FF4D5E' : '#C6CEDE');
  ph.setAttribute('stroke-width', '3');
  ph.setAttribute('opacity', recording ? '.95' : '.55');
  ph.style.filter = recording ? 'drop-shadow(0 0 7px #FF4D5E)' : 'none';
}
