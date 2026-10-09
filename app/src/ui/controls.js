/* The rack: harmony on one row, voice and feel on the next, and the three
   continuous parameters behind a disclosure because you set them once. */

import { el } from './dom.js';
import { NOTES, SCALES } from '../music/notes.js';
import { SOUNDS } from '../audio/sounds.js';
import { S } from '../state/store.js';

const INVERSIONS = ['Root', '1st', '2nd'];
let cb = {};

export function createControls(handlers) {
  cb = handlers;
  NOTES.forEach((n, i) => el('keysel').add(new Option(n, i)));
  Object.keys(SCALES).forEach(k => el('scalesel').add(new Option(SCALES[k].label, k)));
  Object.keys(SOUNDS).forEach(k => el('sndsel').add(new Option(SOUNDS[k].name, k)));

  el('keysel').onchange   = e => { S.key = +e.target.value; cb.onHarmony(); };
  el('scalesel').onchange = e => { S.scale = e.target.value; cb.onHarmony(); };
  el('sndsel').onchange   = e => { S.sound = e.target.value; cb.onVoice(); };

  el('invbtn').onclick = () => { S.inv = (S.inv + 1) % 3; cb.onVoicing(); };
  el('octbtn').onclick = () => { S.oct = S.oct >= 1 ? -1 : S.oct + 1; cb.onVoicing(); };

  el('slidebtn').onclick = e => {
    S.slide = !S.slide;
    e.currentTarget.setAttribute('aria-pressed', String(S.slide));
  };
  el('holdbtn').onclick = e => {
    S.hold = !S.hold;
    e.currentTarget.setAttribute('aria-pressed', String(S.hold));
    if (!S.hold) cb.onHoldOff();
  };
  el('tunebtn').onclick = e => {
    const panel = el('tunepanel'), opening = panel.hidden;
    panel.hidden = !opening;
    e.currentTarget.setAttribute('aria-pressed', String(opening));
  };

  el('bpm').oninput   = e => { cb.onTempo(+e.target.value); };
  el('glide').oninput = e => { S.glide = +e.target.value; renderControls(); };
  el('rvb').oninput   = e => { S.reverb = +e.target.value / 100; cb.onEffects(); renderControls(); };
  el('dly').oninput   = e => { S.delay  = +e.target.value / 100; cb.onEffects(); renderControls(); };

  el('clickbox').onchange = e => { S.click = e.target.checked; cb.onClick(); renderControls(); };
}

export function renderControls() {
  el('keysel').value = S.key;
  el('scalesel').value = S.scale;
  el('sndsel').value = S.sound;
  el('invbtn').querySelector('.fv').textContent = INVERSIONS[S.inv];
  el('octbtn').querySelector('.fv').textContent = S.oct > 0 ? '+1' : S.oct < 0 ? '−1' : '0';
  el('clickbox').checked = S.click;
  el('clicktxt').textContent = S.click ? 'On' : 'Off';
  el('glide').value = S.glide;
  el('glideval').textContent = S.glide + ' ms';
  el('rvb').value = Math.round(S.reverb * 100);
  el('rvbval').textContent = String(Math.round(S.reverb * 100));
  el('dly').value = Math.round(S.delay * 100);
  el('dlyval').textContent = String(Math.round(S.delay * 100));
}

export function renderTempo(bpm) {
  el('bpm').value = bpm;
  el('bpmv').textContent = String(bpm);
}

export function setAudioStatus(info) {
  const pill = el('apill');
  if (!info) { el('atext').textContent = 'silent'; return; }
  pill.classList.add('live');
  el('atext').textContent = info.voices + ' voices · ' + info.latencyMs + ' ms';
}
