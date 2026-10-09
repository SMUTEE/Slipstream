/* Wiring.

   Every cross-module call is explicit here. The modules below know their own
   job and nothing else: music/ has no DOM, ui/ has no music theory, and nothing
   reaches back to patch a function someone else defined. */

import { SCALES } from './music/notes.js';
import { buildChord, chordName, degreeRoman } from './music/chords.js';
import { voiced } from './music/voicing.js';
import { DETENTS } from './music/detents.js';

import { ensureAudio, setEffects, audioInfo } from './audio/context.js';
import { initPool, applyChord, releaseAll, markAllOff } from './audio/pool.js';

import {
  initRecorder, startTransport, stopTransport, resync, toggleRecord,
  noteOn, noteOff, noteTouch, clearLoop, removeLayer, loadPreset,
  loopPos, takeLeft, takeProgress
} from './loop/recorder.js';

import { S, LP, DEGREE_HUES, BASE_HUE, beatLen, loopLen } from './state/store.js';
import { unpackLoop } from './state/codec.js';
import {
  applyState, saveLocal, loadSaved, shareLink, loadClickPref, saveClickPref
} from './state/persist.js';

import { el } from './ui/dom.js';
import { createKnob, drawTicks, renderKnob, renderFace, drawPlayhead } from './ui/knob.js';
import { createPads, renderPads } from './ui/pads.js';
import { createControls, renderControls, renderTempo, setAudioStatus } from './ui/controls.js';
import {
  createLoopUI, renderTransport, renderClock, renderLayers, flashLayer, refreshShare
} from './ui/loopui.js';
import { bindKeyboard } from './ui/keyboard.js';

/* ---------------------------------------------------------------- helpers */
const hue = () => S.degree === null ? BASE_HUE : DEGREE_HUES[S.degree];
const romans = () => Array.from({ length: 7 }, (_, d) => degreeRoman(S.key, S.scale, d));
const detentId = () => DETENTS[S.detent].id;

function paintKnob() {
  renderKnob({ detent: S.detent, hue: hue(), live: S.degree !== null, detentName: DETENTS[S.detent].name });
  el('stage').dataset.live = S.degree !== null ? '1' : '0';
}

/* ------------------------------------------------------------ instrument */
function reflow() {
  if (S.degree === null) { paintKnob(); return; }
  const chord = buildChord(S.key, S.scale, S.degree, detentId());
  renderFace({
    chord: chordName(chord),
    sub: degreeRoman(S.key, S.scale, S.degree) + ' · ' + DETENTS[S.detent].name,
    idle: false
  });
  applyChord(voiced(chord, S.inv, S.oct), S.sound, S.slide ? S.glide / 1000 : 0);
  paintKnob();
  noteTouch();
}

function play(degree) {
  unlock();
  S.degree = degree;
  renderPads(romans(), degree);
  reflow();
  noteOn(degree);
}

function silence() {
  releaseAll(S.sound);
  S.degree = null;
  renderPads(romans(), null);
  renderFace({ chord: null, sub: null, idle: true });
  paintKnob();
}

/** Releasing the pad ends the recorded event even when Hold keeps it sounding. */
function release() {
  noteOff();
  if (S.hold) return;
  silence();
}

function setDetent(d) {
  if (d === S.detent) return;
  S.detent = d;
  reflow();
}

/* ----------------------------------------------------------------- audio */
let unlocked = false;
function unlock() {
  if (unlocked) return;
  if (!ensureAudio({ reverb: S.reverb, delay: S.delay })) return;
  initPool();
  setEffects(S.reverb, S.delay);
  setAudioStatus(audioInfo());
  unlocked = true;
}

/* ------------------------------------------------------------ transport  */
let savedFlash = null;
function save() {
  if (!saveLocal()) return;
  refreshShare();
  const dot = el('savedot');
  dot.classList.add('on');
  clearTimeout(savedFlash);
  savedFlash = setTimeout(() => dot.classList.remove('on'), 1100);
}

function loadToken(text) {
  const d = unpackLoop(text);
  if (!d) return false;
  stopTransport();
  applyState(d);
  renderEverything();
  save();
  return true;
}

function renderEverything() {
  renderControls();
  renderTempo(LP.bpm);
  renderPads(romans(), S.degree);
  drawTicks(LP.bars);
  renderLayers();
  renderTransport();
  paintKnob();
}

let raf = null;
function frame() {
  if (LP.running) {
    const L = loopLen(), pos = loopPos(), bl = beatLen();
    const beat = Math.floor(pos / bl);
    drawPlayhead({
      running: true, recording: LP.rec,
      fraction: pos / L, recFrom: LP.recFrom, progress: takeProgress()
    });
    renderClock({
      running: true, recording: LP.rec,
      left: LP.rec ? takeLeft() : L - pos,
      bar: Math.floor(beat / 4) + 1, bars: LP.bars, beat: (beat % 4) + 1
    });
    raf = requestAnimationFrame(frame);
  } else {
    drawPlayhead({ running: false, recording: false, fraction: 0, recFrom: 0, progress: 0 });
    renderClock({ running: false });
    raf = null;
  }
}
function startFrames() { if (!raf) raf = requestAnimationFrame(frame); }

/* ------------------------------------------------------------------ boot */
createKnob({
  currentDetent: () => S.detent,
  onDetent: setDetent,
  onGesture: unlock
});
createPads({
  onPlay: play,
  onDetent: setDetent,
  onRelease: release
});
createControls({
  onHarmony:  () => { renderPads(romans(), S.degree); reflow(); renderLayers(); save(); },
  onVoice:    () => { markAllOff(); reflow(); },
  onVoicing:  () => { renderControls(); reflow(); save(); },
  onHoldOff:  () => { if (S.degree === null) silence(); },
  onEffects:  () => { setEffects(S.reverb, S.delay); save(); },
  onTempo:    bpm => { LP.bpm = bpm; renderTempo(bpm); resync(); save(); },
  onClick:    () => saveClickPref(S.click)
});
createLoopUI({
  onRecord:      () => { unlock(); toggleRecord(); startFrames(); },
  onRun:         () => { unlock(); LP.running ? stopTransport() : startTransport(); startFrames(); },
  onClear:       () => clearLoop(),
  onBars:        bars => { LP.bars = bars; drawTicks(bars); resync(); renderLayers(); save(); },
  onPreset:      i => { unlock(); loadPreset(i); renderControls(); renderPads(romans(), S.degree); startFrames(); },
  onDeleteLayer: layer => removeLayer(layer),
  onLoadToken:   loadToken,
  onSaved:       save,
  shareLink
});
bindKeyboard({
  play, release,
  detent: setDetent,
  step: dir => setDetent((((S.detent + dir) % 12) + 12) % 12),
  toggleHold:   () => el('holdbtn').click(),
  toggleSlide:  () => el('slidebtn').click(),
  cycleVoicing: () => el('invbtn').click(),
  cycleOctave:  () => el('octbtn').click(),
  record:       () => { unlock(); toggleRecord(); startFrames(); },
  run:          () => { unlock(); LP.running ? stopTransport() : startTransport(); startFrames(); },
  undoLayer:    () => { const last = LP.layers[LP.layers.length - 1]; if (last) removeLayer(last); }
});

initRecorder({
  onLayers:    renderLayers,
  onTransport: () => { renderTransport(); startFrames(); },
  onRecording: renderTransport,
  onFire:      flashLayer,
  onSaved:     save
});

document.addEventListener('pointerdown', unlock, { once: true, capture: true });

S.click = loadClickPref(S.click);
const saved = loadSaved();
if (saved) applyState(saved);
renderEverything();
renderFace({ chord: '—', sub: 'press 1–7', idle: true });
frame();
