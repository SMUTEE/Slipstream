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

export const audioRunning = () => !!ac && ac.state === 'running';

/**
 * Build the graph if needed, then resume. Both halves matter: a context created
 * inside a gesture starts running on desktop Chrome but starts suspended on
 * iOS Safari, so creating one is not the same as unlocking one.
 * @returns a promise that settles once resume has been attempted
 */
export function ensureAudio({ reverb = .45, delay = .34 } = {}) {
  if (ac) return resumeIfNeeded();
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return Promise.resolve(false);
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

  /* iOS wants a buffer actually played inside the gesture before it treats the
     context as unlocked. A single silent sample is enough and costs nothing
     anywhere else. */
  try {
    const buf = ac.createBuffer(1, 1, 22050);
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.connect(ac.destination);
    src.start(0);
  } catch (e) {}

  return resumeIfNeeded();
}

function resumeIfNeeded() {
  if (!ac) return Promise.resolve(false);
  if (ac.state === 'running') return Promise.resolve(true);
  return ac.resume().then(() => ac.state === 'running', () => false);
}

export function setEffects(reverb, delay) {
  if (reverbGain) reverbGain.gain.value = reverb * .9;
  if (delayGain) delayGain.gain.value = delay * .6;
}

export function audioInfo() {
  if (!ac) return null;
  return {
    voices: 5,
    latencyMs: Math.round((ac.baseLatency || .003) * 1000),
    state: ac.state            /* suspended, running, or interrupted after a call on iOS */
  };
}
