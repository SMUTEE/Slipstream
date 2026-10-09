/* The audio graph everything else plugs into.

   Exported bindings are live: importers see `ac` become real once a gesture has
   unlocked it. Nothing here starts on its own, because browsers require a
   gesture before a page may make sound. */

export let ac = null;
export let dry = null;
export let wet = null;
export let reverbGain = null;
export let delayGain = null;

export function mtof(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Decaying noise, so a convolution reverb needs no audio file shipped. */
function makeImpulse(seconds, decay) {
  const rate = ac.sampleRate;
  const len = Math.max(1, Math.floor(rate * seconds));
  const buf = ac.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

/**
 * Build the graph on first call, resume it on later ones.
 * @returns true once there is a running context
 */
export function ensureAudio({ reverb = .45, delay = .34 } = {}) {
  if (ac) {
    if (ac.state !== 'running') ac.resume();
    return true;
  }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return false;
  ac = new Ctx({ latencyHint: 'interactive' });

  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -15;
  comp.ratio.value = 3.2;
  comp.connect(ac.destination);

  const master = ac.createGain();
  master.gain.value = .9;
  master.connect(comp);

  dry = ac.createGain();
  dry.connect(master);
  wet = ac.createGain();

  const dl = ac.createDelay(1);           dl.delayTime.value = .3;
  const fb = ac.createGain();             fb.gain.value = .34;
  const lp = ac.createBiquadFilter();     lp.type = 'lowpass'; lp.frequency.value = 2200;
  delayGain = ac.createGain();            delayGain.gain.value = delay * .6;
  wet.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl);
  lp.connect(delayGain); delayGain.connect(master);

  const conv = ac.createConvolver();
  conv.buffer = makeImpulse(2.2, 2.6);
  reverbGain = ac.createGain();           reverbGain.gain.value = reverb * .9;
  wet.connect(conv); conv.connect(reverbGain); reverbGain.connect(master);

  return true;
}

export function setEffects(reverb, delay) {
  if (reverbGain) reverbGain.gain.value = reverb * .9;
  if (delayGain) delayGain.gain.value = delay * .6;
}

export function audioInfo() {
  return ac ? { voices: 5, latencyMs: Math.round((ac.baseLatency || .003) * 1000) } : null;
}
