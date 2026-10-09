/* One-shot voices for recorded layers, scheduled against AudioContext.currentTime.

   Separate from the live pool so slide keeps working underneath a running loop.
   This is also the scheduler the 12-pulse rhythm engine will run on. */

import { ac, dry, wet, mtof } from './context.js';
import { SOUNDS } from './sounds.js';

const MAX_VOICES = 24;
let scheduled = [];   /* handed to the audio clock, not yet finished */

function cutShort(entry, at) {
  const t = Math.max(at, ac.currentTime);
  try {
    entry.amp.gain.cancelScheduledValues(t);
    entry.amp.gain.setValueAtTime(Math.max(entry.amp.gain.value, .0001), t);
    entry.amp.gain.exponentialRampToValueAtTime(.0001, t + .05);
    entry.oscs.forEach(o => { try { o.stop(t + .08); } catch (e) {} });
  } catch (e) {}
  entry.end = t + .08;
}

/** Stop means stop: anything already queued is cut short. */
export function killScheduled() {
  if (!ac) return;
  const t = ac.currentTime;
  scheduled.forEach(x => {
    try {
      x.amp.gain.cancelScheduledValues(t);
      x.amp.gain.setValueAtTime(Math.max(x.amp.gain.value, .0001), t);
      x.amp.gain.exponentialRampToValueAtTime(.0001, t + .07);
      x.oscs.forEach(o => { try { o.stop(t + .1); } catch (e) {} });
    } catch (e) {}
  });
  scheduled = [];
}

export function scheduledCount() { return scheduled.length; }

export function scheduleNote(midi, soundId, when, duration) {
  if (!ac) return;
  const T = SOUNDS[soundId];
  const f = mtof(midi + T.oct);
  const off = when + Math.max(duration, .1);
  const end = off + T.r + .15;
  const now = ac.currentTime;

  scheduled = scheduled.filter(x => x.end > now);

  /* Count what overlaps this note, not everything queued ahead of it. Counting
     the queue meant a few layers silenced themselves the moment a pass was
     scheduled. At the ceiling, take the longest-ringing voice rather than
     refusing the new one: silencing the chord just played is the worst option. */
  let overlap = 0, oldest = null;
  for (const x of scheduled) {
    if (x.start < end && x.end > when) {
      overlap++;
      if (!oldest || x.start < oldest.start) oldest = x;
    }
  }
  if (overlap >= MAX_VOICES) {
    if (!oldest) return;
    cutShort(oldest, when);
  }

  const o1 = ac.createOscillator(), o2 = ac.createOscillator(), o3 = ac.createOscillator();
  const g1 = ac.createGain(), g2 = ac.createGain(), g3 = ac.createGain();
  const flt = ac.createBiquadFilter(); flt.type = 'lowpass'; flt.Q.value = T.q;
  const amp = ac.createGain(), send = ac.createGain();

  o1.type = T.t[0]; o2.type = T.t[1]; o3.type = T.t[2];
  o1.frequency.value = f * T.p[0][0];
  o2.frequency.value = f * T.p[1][0];
  o3.frequency.value = f * T.p[2][0];
  o1.detune.value = T.det[0]; o2.detune.value = T.det[1]; o3.detune.value = T.det[2];
  g1.gain.value = T.p[0][1]; g2.gain.value = T.p[1][1]; g3.gain.value = T.p[2][1];
  send.gain.value = T.wet;

  o1.connect(g1); o2.connect(g2); o3.connect(g3);
  g1.connect(flt); g2.connect(flt); g3.connect(flt);
  flt.connect(amp); amp.connect(dry); amp.connect(send); send.connect(wet);

  let mo = null;
  if (T.fm) {
    mo = ac.createOscillator();
    const mg = ac.createGain();
    mo.frequency.value = f * T.fm.ratio;
    mg.gain.setValueAtTime(f * T.fm.idx, when);
    mg.gain.linearRampToValueAtTime(f * T.fm.idx * .12, when + T.fm.dec);
    mo.connect(mg); mg.connect(o1.frequency); mo.start(when);
  }

  const lvl = T.lvl * .8;
  amp.gain.setValueAtTime(.0001, when);
  amp.gain.linearRampToValueAtTime(lvl, when + T.a);
  amp.gain.setTargetAtTime(lvl * T.s, when + T.a, Math.max(T.d / 3, .02));
  amp.gain.setTargetAtTime(.0001, off, Math.max(T.r / 3, .03));
  flt.frequency.setValueAtTime(Math.min(16000, T.cut * 2.6), when);
  flt.frequency.exponentialRampToValueAtTime(T.cut, when + T.ce);

  [o1, o2, o3].forEach(o => { o.start(when); o.stop(end); });
  if (mo) mo.stop(end);

  scheduled.push({ amp, oscs: mo ? [o1, o2, o3, mo] : [o1, o2, o3], start: when, end });
  o1.onended = () => { try { amp.disconnect(); send.disconnect(); } catch (e) {} };
}

/** A cue under the music, not an instrument in it. */
export function scheduleClick(when, accent) {
  if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sine';
  o.frequency.value = accent ? 1320 : 880;
  g.gain.setValueAtTime(.0001, when);
  g.gain.linearRampToValueAtTime(accent ? .05 : .026, when + .002);
  g.gain.exponentialRampToValueAtTime(.0001, when + .045);
  o.connect(g); g.connect(dry);
  o.start(when); o.stop(when + .07);
}
