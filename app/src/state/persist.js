/* Turning the live state into a token and back, plus the browser copy.

   Every storage call is wrapped: a private window or a blocked origin should
   leave a working page, not a broken one. */

import { S, LP, LAYER_HUES } from './store.js';
import { packLoop, unpackLoop } from './codec.js';
import { SCALE_IDS } from '../music/notes.js';
import { SOUND_IDS } from '../audio/sounds.js';

const KEY = 'slipstream.v1';
const CLICK_KEY = 'slipstream.click';

export function currentToken() {
  return packLoop({
    key: S.key, scale: SCALE_IDS.indexOf(S.scale),
    bpm: LP.bpm, bars: LP.bars, q: LP.quantize,
    inv: S.inv, oct: S.oct, rev: S.reverb, dly: S.delay,
    layers: LP.layers.map(ly => ({
      sound: SOUND_IDS.indexOf(ly.sound), muted: ly.muted, events: ly.events
    }))
  });
}

/** Mutates S and LP. The caller re-renders; nothing here touches the DOM. */
export function applyState(d) {
  if (!d) return false;
  S.key = d.key;
  S.scale = SCALE_IDS[d.scale];
  S.inv = d.inv; S.oct = d.oct;
  S.reverb = d.rev; S.delay = d.dly;
  LP.bpm = d.bpm; LP.bars = d.bars; LP.quantize = d.q;
  LP.layers = d.layers.map((ly, i) => ({
    sound: SOUND_IDS[ly.sound],
    muted: ly.muted,
    events: ly.events.slice(),
    hue: LAYER_HUES[i % LAYER_HUES.length],
    el: null
  }));
  LP.current = null;
  LP.held = null;
  return true;
}

export function saveLocal() {
  try { localStorage.setItem(KEY, currentToken()); return true; } catch (e) { return false; }
}

/** A URL fragment wins over the browser copy, so a shared link opens as sent. */
export function loadSaved() {
  let token = null;
  try {
    const h = (location.hash || '').replace(/^#/, '');
    if (h.length > 5) token = h;
  } catch (e) {}
  if (!token) { try { token = localStorage.getItem(KEY); } catch (e) {} }
  const d = unpackLoop(token);
  return d && d.layers.length ? d : null;
}

/* Whether someone wants a click is their own business, so it stays out of
   shared arrangements and lives per browser instead. */
export function loadClickPref(fallback) {
  try {
    const v = localStorage.getItem(CLICK_KEY);
    return v === null ? fallback : v === '1';
  } catch (e) { return fallback; }
}
export function saveClickPref(on) {
  try { localStorage.setItem(CLICK_KEY, on ? '1' : '0'); } catch (e) {}
}

export function shareLink() {
  const token = currentToken();
  try {
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      return location.origin + location.pathname + '#' + token;
    }
  } catch (e) {}
  return token;
}
