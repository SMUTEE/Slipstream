/* The two state objects. Everything that renders reads from here; nothing here
   reaches back into the DOM. */

/** Cyan through violet: the live accent follows the degree being played. */
export const DEGREE_HUES = ['#22D3EE','#38BDF8','#4C9BFF','#5B82FF','#6D6CFA','#8560F0','#9C5BE8'];
export const LAYER_HUES  = ['#22D3EE','#4C9BFF','#8560F0','#F07BC8'];
export const BASE_HUE    = '#2E9BFF';
export const MAX_LAYERS  = 4;

/** The instrument. */
export const S = {
  key: 0, scale: 'major', sound: 'glass',
  detent: 0, degree: null,
  slide: true, glide: 160, hold: false,
  inv: 0, oct: 0,
  reverb: .45, delay: .34,
  click: true
};

/** The recorder. Event times are beats, so a loop keeps its shape at any tempo. */
export const LP = {
  running: false, rec: false,
  bpm: 96, bars: 4, quantize: false,
  layers: [], current: null,
  origin: 0, pass: 0, timer: null, raf: null,
  held: null, recStart: 0, recFrom: 0
};

export const beatLen   = () => 60 / LP.bpm;
export const loopBeats = () => LP.bars * 4;
export const loopLen   = () => loopBeats() * beatLen();
