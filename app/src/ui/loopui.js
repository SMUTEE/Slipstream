/* Loop card: transport, the take clock, layers, presets and sharing. */

import { el } from './dom.js';
import { SOUNDS } from '../audio/sounds.js';
import { LP, MAX_LAYERS } from '../state/store.js';
import { PRESETS } from '../loop/recorder.js';

let cb = {};

export function createLoopUI(handlers) {
  cb = handlers;
  PRESETS.forEach((p, i) => el('presetsel').add(new Option(p.name, String(i))));

  el('recbtn').onclick   = () => cb.onRecord();
  el('runbtn').onclick   = () => cb.onRun();
  el('clearbtn').onclick = () => cb.onClear();
  el('qbtn').onclick     = e => {
    LP.quantize = !LP.quantize;
    e.currentTarget.setAttribute('aria-pressed', String(LP.quantize));
    cb.onSaved();
  };
  el('barsel').onchange   = e => cb.onBars(+e.target.value);
  el('presetsel').onchange = e => {
    const i = +e.target.value;
    e.target.value = '';
    if (!Number.isNaN(i) && e.target !== null) cb.onPreset(i);
  };

  el('sharebtn').onclick = e => {
    const panel = el('sharepanel'), opening = panel.hidden;
    panel.hidden = !opening;
    e.currentTarget.setAttribute('aria-pressed', String(opening));
    if (opening) refreshShare();
  };
  el('copybtn').onclick = () => {
    const input = el('shareurl'), btn = el('copybtn');
    const done = ok => {
      btn.textContent = ok ? 'Copied' : 'Select it';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1600);
    };
    try {
      navigator.clipboard.writeText(input.value).then(() => done(true), () => { input.select(); done(false); });
    } catch (e) { input.select(); done(false); }
  };
  el('loadbtn').onclick = () => {
    const btn = el('loadbtn');
    const ok = cb.onLoadToken(el('loadin').value);
    btn.textContent = ok ? 'Loaded' : 'Not a code';
    if (ok) el('loadin').value = '';
    setTimeout(() => { btn.textContent = 'Load'; }, 1600);
  };
}

export function refreshShare() {
  if (!el('sharepanel').hidden) el('shareurl').value = cb.shareLink();
}

export function renderTransport() {
  const b = el('runbtn');
  b.setAttribute('aria-pressed', String(LP.running));
  b.textContent = LP.running ? 'Stop' : 'Play';
  el('recbtn').setAttribute('aria-pressed', String(LP.rec));
  el('module').dataset.rec = LP.rec ? '1' : '0';
  el('qbtn').setAttribute('aria-pressed', String(LP.quantize));
  el('barsel').value = LP.bars;
}

export function renderClock({ running, recording, left, bar, bars, beat }) {
  const main = el('clockmain'), sub = el('clocksub'), box = el('clock');
  box.dataset.rec = recording ? '1' : '0';
  if (!running) { main.textContent = '—'; sub.textContent = 'stopped'; return; }
  main.textContent = left.toFixed(1) + 's';
  sub.textContent = recording
    ? 'recording · stops itself · bar ' + bar + '/' + bars
    : 'bar ' + bar + '/' + bars + ' · beat ' + beat;
}

export function flashLayer(layer) {
  if (!layer.el) return;
  layer.el.dataset.fire = '1';
  setTimeout(() => { if (layer.el) layer.el.dataset.fire = '0'; }, 140);
}

export function renderLayers() {
  const box = el('layers');
  box.innerHTML = '';
  LP.layers.forEach((ly, i) => {
    const row = document.createElement('div');
    row.className = 'layer';
    row.style.setProperty('--c', ly.hue);
    row.dataset.muted = ly.muted ? '1' : '0';
    const recording = ly === LP.current && LP.rec;
    row.dataset.rec = recording ? '1' : '0';
    row.innerHTML =
      '<span class="ldot"></span><span class="lname">Layer ' + (i + 1) + '</span>' +
      '<span class="lvoice">' + SOUNDS[ly.sound].name + '</span>' +
      '<span class="lcount">' + (recording ? 'recording…'
        : ly.events.length + (ly.events.length === 1 ? ' chord' : ' chords')) + '</span>';

    const mute = document.createElement('button');
    mute.className = 'lbtn';
    mute.textContent = 'Mute';
    mute.setAttribute('aria-pressed', String(ly.muted));
    mute.onclick = () => { ly.muted = !ly.muted; renderLayers(); cb.onSaved(); };

    const del = document.createElement('button');
    del.className = 'lbtn';
    del.textContent = '✕';
    del.setAttribute('aria-label', 'Delete layer ' + (i + 1));
    del.onclick = () => cb.onDeleteLayer(ly);

    row.appendChild(mute);
    row.appendChild(del);
    ly.el = row;
    box.appendChild(row);
  });

  const full = LP.layers.length >= MAX_LAYERS;
  el('recbtn').disabled = !LP.rec && full;
  el('recbtn').title = full
    ? 'Four layers is the limit — delete one to record another'
    : 'Record';
  const note = el('loopnote');
  note.hidden = !(full && !LP.rec);
  note.textContent = 'Four layers is the limit. Delete one to record another.';

  el('loopempty').innerHTML =
    'Hit <b>record</b> and play along to the click. A take runs ' + LP.bars +
    ' bars and <b>ends itself</b> — the red ring fills as it goes and the counter shows what is ' +
    'left. Record again to stack another layer on top — each keeps whichever voice was selected ' +
    'when you played it, so you can put <b>Sub</b> under <b>Glass</b>. Layers hold scale degrees and ' +
    'beats rather than notes and seconds, so changing the key transposes everything and changing the ' +
    'tempo moves it all together.';
  el('loopempty').hidden = LP.layers.length > 0;
  refreshShare();
}
