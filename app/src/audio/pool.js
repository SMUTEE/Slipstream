/* The live instrument's voices.

   A fixed pool whose oscillators run continuously, so a chord change can ramp
   frequency instead of starting new notes. That is what makes slide real
   portamento rather than a retrigger. */

import { ac, dry, wet, mtof } from './context.js';
import { SOUNDS } from './sounds.js';

const SIZE = 5;
let voices = [];

function build() {
  const o1 = ac.createOscillator(), o2 = ac.createOscillator(),
        o3 = ac.createOscillator(), mo = ac.createOscillator();
  const g1 = ac.createGain(), g2 = ac.createGain(), g3 = ac.createGain(), mg = ac.createGain();
  const flt = ac.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 2000;
  const amp = ac.createGain(), send = ac.createGain();
  g1.gain.value = g2.gain.value = g3.gain.value = mg.gain.value = 0;
  amp.gain.value = .0001; send.gain.value = 0;
  o1.connect(g1); o2.connect(g2); o3.connect(g3);
  g1.connect(flt); g2.connect(flt); g3.connect(flt);
  flt.connect(amp); amp.connect(dry); amp.connect(send); send.connect(wet);
  mo.connect(mg); mg.connect(o1.frequency);
  [o1, o2, o3, mo].forEach(o => { o.frequency.value = 220; o.start(); });
  return { o1, o2, o3, mo, g1, g2, g3, mg, flt, amp, send, on: false, f: 220 };
}

export function initPool() {
  if (voices.length) return;
  for (let i = 0; i < SIZE; i++) voices.push(build());
}

function setTimbre(v, T) {
  v.o1.type = T.t[0]; v.o2.type = T.t[1]; v.o3.type = T.t[2];
  v.o1.detune.value = T.det[0]; v.o2.detune.value = T.det[1]; v.o3.detune.value = T.det[2];
  v.g1.gain.value = T.p[0][1]; v.g2.gain.value = T.p[1][1]; v.g3.gain.value = T.p[2][1];
  v.send.gain.value = T.wet; v.flt.Q.value = T.q;
}

function ramp(param, target, t, glide) {
  param.cancelScheduledValues(t);
  param.setValueAtTime(Math.max(param.value, 1), t);
  if (glide > 0) param.exponentialRampToValueAtTime(Math.max(target, 1), t + glide);
  else param.setValueAtTime(Math.max(target, 1), t);
}

function setPitch(v, f, T, glide) {
  const t = ac.currentTime;
  v.f = f;
  ramp(v.o1.frequency, f * T.p[0][0], t, glide);
  ramp(v.o2.frequency, f * T.p[1][0], t, glide);
  ramp(v.o3.frequency, f * T.p[2][0], t, glide);
  if (T.fm) {
    ramp(v.mo.frequency, f * T.fm.ratio, t, glide);
    if (glide > 0) {
      v.mg.gain.cancelScheduledValues(t);
      v.mg.gain.setValueAtTime(v.mg.gain.value, t);
      v.mg.gain.linearRampToValueAtTime(f * T.fm.idx * .14, t + glide);
    }
  }
}

function trigger(v, T) {
  const t = ac.currentTime;
  v.amp.gain.cancelScheduledValues(t);
  v.amp.gain.setValueAtTime(Math.max(v.amp.gain.value, .0001), t);
  v.amp.gain.linearRampToValueAtTime(T.lvl, t + T.a);
  v.amp.gain.setTargetAtTime(T.lvl * T.s, t + T.a, Math.max(T.d / 3, .02));
  v.flt.frequency.cancelScheduledValues(t);
  v.flt.frequency.setValueAtTime(Math.min(16000, T.cut * 2.6), t);
  v.flt.frequency.exponentialRampToValueAtTime(T.cut, t + T.ce);
  if (T.fm) {
    const idx = v.f * T.fm.idx;
    v.mg.gain.cancelScheduledValues(t);
    v.mg.gain.setValueAtTime(idx, t);
    v.mg.gain.linearRampToValueAtTime(idx * .12, t + T.fm.dec);
  }
}

function release(v, T) {
  const t = ac.currentTime;
  v.amp.gain.cancelScheduledValues(t);
  v.amp.gain.setValueAtTime(Math.max(v.amp.gain.value, .0001), t);
  v.amp.gain.exponentialRampToValueAtTime(.0001, t + T.r);
}

/**
 * Sound a chord on the pool.
 * @param glide seconds of portamento, or 0 to retrigger
 */
export function applyChord(midis, soundId, glide = 0) {
  if (!ac || !voices.length) return;
  const T = SOUNDS[soundId];
  const n = Math.min(midis.length, SIZE);
  const anyOn = voices.some(v => v.on);

  for (let i = 0; i < SIZE; i++) {
    const v = voices[i];
    if (i < n) {
      const f = mtof(midis[i] + T.oct);
      if (v.on && glide > 0) {
        setPitch(v, f, T, glide);
      } else {
        setTimbre(v, T);
        if (glide > 0 && anyOn) {
          /* a voice joining a sliding chord enters from its nearest neighbour
             rather than appearing out of nowhere */
          let near = f, best = Infinity;
          voices.forEach(o => {
            if (!o.on) return;
            const d = Math.abs(o.f - f);
            if (d < best) { best = d; near = o.f; }
          });
          setPitch(v, near, T, 0); trigger(v, T); setPitch(v, f, T, glide);
        } else {
          setPitch(v, f, T, 0); trigger(v, T);
        }
        v.on = true;
      }
    } else if (v.on) {
      release(v, T); v.on = false;
    }
  }
}

export function releaseAll(soundId) {
  if (!ac) return;
  const T = SOUNDS[soundId];
  voices.forEach(v => { if (v.on) { release(v, T); v.on = false; } });
}

/** Force the next chord to retrigger rather than glide, after a voice change. */
export function markAllOff() {
  voices.forEach(v => { v.on = false; });
}
