/* Transport and recorder.

   Times are beats throughout: the loop is bars x 4 beats and tempo maps beats
   onto real time only at playback, so every layer stays locked to every other
   one at any tempo. This is also the clock the rhythm engine will run on. */

import { ac } from '../audio/context.js';
import { scheduleNote, scheduleClick, killScheduled } from '../audio/scheduler.js';
import { buildChord } from '../music/chords.js';
import { voiced } from '../music/voicing.js';
import { DETENTS } from '../music/detents.js';
import { S, LP, LAYER_HUES, MAX_LAYERS, beatLen, loopBeats, loopLen } from '../state/store.js';

const LOOKAHEAD = .25;
let hooks = {};

export function initRecorder(h) { hooks = h; }
const fire = name => { if (hooks[name]) hooks[name](); };

export function loopPos() {
  if (!LP.running || !ac) return 0;
  const L = loopLen(), d = ac.currentTime - LP.origin;
  if (d < 0) return 0;      /* armed slightly ahead; do not wrap to the end */
  return ((d % L) + L) % L;
}
export const loopPosBeats = () => loopPos() / beatLen();
export const takeLeft = () => (LP.rec && ac) ? Math.max(0, loopLen() - (ac.currentTime - LP.recStart)) : 0;
export const takeProgress = () => (LP.rec && ac) ? Math.min(1, (ac.currentTime - LP.recStart) / loopLen()) : 0;

export function startTransport() {
  if (!ac || LP.running) return;
  LP.running = true;
  LP.origin = ac.currentTime + .05;
  LP.pass = 0;
  LP.timer = setInterval(tick, 25);
  tick();
  fire('onTransport');
}

export function stopTransport() {
  if (LP.rec) toggleRecord();
  LP.running = false;
  clearInterval(LP.timer); LP.timer = null;
  killScheduled();
  fire('onTransport');
}

/**
 * Tempo and bar changes restart the current bar rather than drifting. The pass
 * already handed to the audio clock has to go with it, or the old tempo keeps
 * playing underneath the new one.
 */
export function resync() {
  if (!LP.running || !ac) return;
  /* Event times are beats measured from origin, and this moves origin. A take
     spanning the change would have its earlier chords on one grid and its later
     ones on another, so the take ends here instead. What was played is kept. */
  if (LP.rec) toggleRecord();
  killScheduled();
  LP.origin = ac.currentTime + .05;
  LP.pass = 0;
}

function tick() {
  if (!LP.running || !ac) return;
  /* one pass per take; this interval still runs when the tab is not painting */
  if (LP.rec && ac.currentTime - LP.recStart >= loopLen() - .004) toggleRecord();
  const L = loopLen();
  while (LP.origin + LP.pass * L < ac.currentTime + LOOKAHEAD) {
    schedulePass(LP.origin + LP.pass * L);
    LP.pass++;
  }
}

function schedulePass(t0) {
  const bl = beatLen();
  if (S.click) {
    for (let b = 0; b < loopBeats(); b++) {
      const w = t0 + b * bl;
      if (w >= ac.currentTime - .02) scheduleClick(w, b % 4 === 0);
    }
  }
  for (const ly of LP.layers) {
    if (ly.muted || (ly === LP.current && LP.rec)) continue;
    const evs = ly.events.filter(e => e.t < loopBeats());   /* trimmed by a shorter bar count */
    evs.forEach((ev, i) => {
      const w = t0 + ev.t * bl;
      if (w < ac.currentTime - .02) return;
      const chord = buildChord(S.key, S.scale, ev.deg, DETENTS[ev.det].id);
      const notes = voiced(chord, S.inv, S.oct);

      /* Slide in from the chord before it. The first chord of a pass slides
         from the last one, so a loop joins to itself rather than jumping. */
      let from = null, glide = 0;
      if (ev.glide && evs.length > 1) {
        const prev = evs[i > 0 ? i - 1 : evs.length - 1];
        from = voiced(buildChord(S.key, S.scale, prev.deg, DETENTS[prev.det].id), S.inv, S.oct);
        glide = Math.min(S.glide / 1000, ev.dur * bl * .9);
      }
      notes.forEach((m, k) => scheduleNote(m, ly.sound, w, ev.dur * bl, slideFrom(from, m, k), glide));

      const delay = Math.max(0, (w - ac.currentTime) * 1000);
      setTimeout(() => { if (hooks.onFire) hooks.onFire(ly); }, delay);
    });
  }
}

/** Pair by position where the chords are the same size, by pitch where they are not. */
function slideFrom(from, target, index) {
  if (!from || !from.length) return null;
  if (from[index] !== undefined) return from[index];
  let best = from[0], gap = Math.abs(best - target);
  for (const n of from) {
    const d = Math.abs(n - target);
    if (d < gap) { gap = d; best = n; }
  }
  return best;
}

export function toggleRecord() {
  if (LP.rec) {
    noteOff();                     /* a chord still held belongs to this take */
    LP.rec = false;
    if (LP.current && !LP.current.events.length) {
      LP.layers = LP.layers.filter(l => l !== LP.current);
    }
    LP.current = null;
  } else {
    if (LP.layers.length >= MAX_LAYERS) return;
    if (!LP.running) startTransport();
    const L = loopLen();
    LP.recStart = Math.max(ac ? ac.currentTime : 0, LP.origin || 0);
    LP.recFrom = L > 0 ? ((((LP.recStart - LP.origin) % L) + L) % L) / L : 0;
    LP.current = {
      sound: S.sound, events: [], muted: false,
      hue: LAYER_HUES[LP.layers.length % LAYER_HUES.length], el: null
    };
    LP.layers.push(LP.current);
    LP.rec = true;
  }
  fire('onRecording');
  fire('onLayers');
  fire('onSaved');
}

export function noteOn(degree) {
  if (!LP.rec || !LP.current || !ac) return;
  if (LP.held) noteOff();
  let t = loopPosBeats();
  if (LP.quantize) {
    t = Math.round(t * 2) / 2;
    if (t >= loopBeats()) t -= loopBeats();
  }
  LP.held = { t, deg: degree, det: S.detent, start: ac.currentTime, live: true, glide: S.slide };
  LP.current.sound = S.sound;
}

/** The pointer has left the pad. Under hold the chord carries on sounding. */
export function noteLift() { if (LP.held) LP.held.live = false; }

/**
 * The knob moved. While the pad is still under a finger that is one gesture
 * settling, so the open event just takes the new detent. Once the finger has
 * gone and hold is keeping the chord alive, the same move audibly changes the
 * chord, so it closes the event and opens another at the same degree: what you
 * hear is what gets recorded.
 */
export function noteTouch() {
  if (!LP.held || !ac) return;
  if (LP.held.live) { LP.held.det = S.detent; return; }
  if (LP.held.det === S.detent) return;
  const degree = LP.held.deg;
  noteOff();
  noteOn(degree);
}

export function noteOff() {
  if (!LP.held || !LP.current || !ac) return;
  const h = LP.held;
  LP.held = null;
  const dur = Math.max(.12, Math.min((ac.currentTime - h.start) / beatLen(), loopBeats() * .98));
  LP.current.events.push({ t: h.t, deg: h.deg, det: h.det, dur, glide: h.glide });
  LP.current.events.sort((a, b) => a.t - b.t);
  fire('onLayers');
  fire('onSaved');
}

export function clearLoop() {
  stopTransport();
  LP.layers = [];
  LP.current = null;
  LP.held = null;
  fire('onLayers');
  fire('onSaved');
}

export function removeLayer(layer) {
  LP.layers = LP.layers.filter(l => l !== layer);
  if (LP.current === layer) { LP.current = null; LP.rec = false; fire('onRecording'); }
  fire('onLayers');
  fire('onSaved');
}

export const PRESETS = [
  { name: 'I – V – vi – IV',      scale: 'major', chords: [[0,'base'],[4,'base'],[5,'base'],[3,'add7']] },
  { name: 'ii – V – I',                scale: 'major', chords: [[1,'add7'],[4,'dom7'],[0,'add7'],[0,'add9']] },
  { name: 'vi – IV – I – V',      scale: 'major', chords: [[5,'base'],[3,'add7'],[0,'base'],[4,'dom7']] },
  { name: 'i – VII – VI – v',     scale: 'minor', chords: [[0,'base'],[6,'base'],[5,'add7'],[4,'sus4']] }
];

/** A preset becomes an ordinary layer, so it can be muted, deleted or built on. */
export function loadPreset(index) {
  const p = PRESETS[index];
  if (!p) return;
  S.scale = p.scale;
  const step = loopBeats() / p.chords.length;
  const layer = {
    sound: S.sound, muted: false,
    hue: LAYER_HUES[LP.layers.length % LAYER_HUES.length], el: null,
    events: p.chords.map((c, i) => ({
      deg: c[0],
      det: DETENTS.findIndex(d => d.id === c[1]),
      t: i * step,
      dur: step * .96,
      glide: S.slide
    }))
  };
  if (LP.layers.length >= MAX_LAYERS) LP.layers.pop();
  LP.layers.push(layer);
  fire('onLayers');
  fire('onSaved');
  if (!LP.running) startTransport();
}
