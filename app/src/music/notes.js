/* Note names, scales and the degree arithmetic everything else is built on.
   Nothing in music/ knows that a DOM exists. */

export const NOTES = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
export const ROMAN = ['I','II','III','IV','V','VI','VII'];

export const SCALES = {
  major:      { label: 'Major',          steps: [0,2,4,5,7,9,11] },
  minor:      { label: 'Natural Minor',  steps: [0,2,3,5,7,8,10] },
  dorian:     { label: 'Dorian',         steps: [0,2,3,5,7,9,10] },
  mixolydian: { label: 'Mixolydian',     steps: [0,2,4,5,7,9,10] }
};
export const SCALE_IDS = Object.keys(SCALES);

/** Semitones above the key root for a scale index, which may run past one octave. */
export function scaleTone(steps, i) {
  const octave = Math.floor(i / 7);
  return steps[((i % 7) + 7) % 7] + 12 * octave;
}
