/* A whole arrangement as one URL-safe token.

   Chord positions are beats, so an arrangement shared at 96 bpm is the same
   music played at 130. Each chord is a fixed seven characters, so layers need
   no separators inside them. */

import { SCALE_IDS } from '../music/notes.js';
import { SOUND_IDS } from '../audio/sounds.js';

const B36 = '0123456789abcdefghijklmnopqrstuvwxyz';

function enc(n, width) {
  n = Math.max(0, Math.round(n));
  let s = '';
  while (s.length < width) { s = B36[n % 36] + s; n = Math.floor(n / 36); }
  return s.slice(-width);
}
function dec(s) {
  let n = 0;
  for (const ch of s) {
    const v = B36.indexOf(ch);
    if (v < 0) return NaN;
    n = n * 36 + v;
  }
  return n;
}

/* Header, 11 chars: version, key, scale, tempo(2), bars, quantize, voicing,
   octave, reverb, delay. Then one chunk per layer. */
export function packLoop(st) {
  let t = '3' + enc(st.key, 1) + enc(st.scale, 1) + enc(st.bpm, 2) + enc(st.bars, 1)
        + (st.q ? '1' : '0') + enc(st.inv, 1) + enc(st.oct + 1, 1)
        + enc(Math.round(st.rev * 35), 1) + enc(Math.round(st.dly * 35), 1);
  for (const ly of st.layers) {
    t += '-' + enc(ly.sound, 1) + (ly.muted ? '1' : '0');
    for (const ev of ly.events) {
      t += enc(ev.deg, 1) + enc(ev.det, 1)
         + enc(Math.min(46655, ev.t * 1000), 3)
         + enc(Math.min(1295, ev.dur * 100), 2);
    }
  }
  return t;
}

/** Returns null for anything malformed rather than loading it half way. */
export function unpackLoop(token) {
  if (typeof token !== 'string') return null;
  token = token.trim().replace(/^#/, '');
  const parts = token.split('-');
  const h = parts[0];
  const ver = h ? h[0] : '';
  if (!h || !['1', '2', '3'].includes(ver)) return null;
  if (ver === '1' ? h.length !== 7 : h.length !== 11) return null;

  const key = dec(h[1]), scale = dec(h[2]), bpm = dec(h.slice(3, 5)), bars = dec(h[5]);
  if ([key, scale, bpm, bars].some(Number.isNaN)) return null;
  if (key > 11 || scale >= SCALE_IDS.length || bpm < 40 || bpm > 200 || ![2, 4, 8].includes(bars)) return null;

  let inv = 0, oct = 0, rev = .45, dly = .34;   /* v1 predates all four */
  if (ver !== '1') {
    inv = dec(h[7]); oct = dec(h[8]) - 1; rev = dec(h[9]) / 35; dly = dec(h[10]) / 35;
    if ([inv, oct, rev, dly].some(Number.isNaN) || inv > 2 || oct < -1 || oct > 1 || rev > 1 || dly > 1) return null;
  }

  const layers = [];
  for (let i = 1; i < parts.length; i++) {
    const c = parts[i];
    if (c.length < 2 || (c.length - 2) % 7) return null;
    const sound = dec(c[0]);
    if (Number.isNaN(sound) || sound >= SOUND_IDS.length) return null;
    const events = [];
    for (let j = 2; j < c.length; j += 7) {
      const deg = dec(c[j]), det = dec(c[j + 1]);
      const t = dec(c.slice(j + 2, j + 5)) / 1000;
      const dur = dec(c.slice(j + 5, j + 7)) / 100;
      if ([deg, det, t, dur].some(Number.isNaN) || deg > 6 || det > 11) return null;
      events.push({ deg, det, t, dur });
    }
    /* v1 and v2 stored seconds; convert with the tempo they carry */
    if (ver !== '3') {
      const perBeat = bpm / 60;
      events.forEach(e => { e.t *= perBeat; e.dur *= perBeat; });
    }
    layers.push({ sound, muted: c[1] === '1', events });
  }
  if (layers.length > 4) return null;
  return { key, scale, bpm, bars, q: h[6] === '1', inv, oct, rev, dly, layers };
}
