/* Chord identity: which notes a degree and a detent produce.
   Where those notes sit is voicing.js, and the two stay separate. */

import { NOTES, ROMAN, SCALES, scaleTone } from './notes.js';

/**
 * A degree plus a transform, as a root pitch class and intervals above it.
 * Transforms are relative and diatonic, so `add7` yields maj7, m7 or m7b5
 * according to the degree rather than needing a case for each.
 */
export function buildChord(keyPc, scaleId, degree, transform) {
  const steps = SCALES[scaleId].steps;
  const triad = [0, 2, 4].map(i => keyPc + scaleTone(steps, degree + i));
  let root = triad[0];
  let iv = triad.map(n => n - root);
  const third = iv[1], fifth = iv[2];

  let seventh = (keyPc + scaleTone(steps, degree + 6)) - root;
  seventh = ((seventh % 12) + 12) % 12;
  if (seventh < 9) seventh += 12;

  switch (transform) {
    /* a diminished or augmented triad resolves its fifth too, or the result is unnameable */
    case 'flip3':  iv = fifth === 6 ? [0,3,7] : fifth === 8 ? [0,4,7] : [0, third === 3 ? 4 : 3, 7]; break;
    case 'add7':   iv = [0, third, fifth, seventh]; break;
    case 'nine':   iv = [0, third, fifth, seventh, 14]; break;
    case 'add9':   iv = [0, third, fifth, 14]; break;
    case 'six':    iv = [0, third, fifth, 9]; break;
    case 'dom7':   iv = [0, 4, 7, 10]; break;
    case 's7sus4': iv = [0, 5, 7, 10]; break;
    case 'sus4':   iv = [0, 5, 7]; break;
    case 'sus2':   iv = [0, 2, 7]; break;
    case 'aug':    iv = [0, 4, 8]; break;
    case 'dim':    iv = [0, 3, 6]; break;
  }

  /* every root inside one octave, which is the closest voicing and keeps
     movement between degrees small */
  root = ((root % 12) + 12) % 12;
  return { root, iv };
}

const QUALITY = {
  '0,4,7':'', '0,3,7':'m', '0,3,6':'dim', '0,4,8':'aug', '0,5,7':'sus4', '0,2,7':'sus2',
  '0,5,7,10':'7sus4', '0,4,7,11':'maj7', '0,3,7,11':'m(maj7)', '0,3,7,10':'m7',
  '0,3,6,10':'m7♭5', '0,4,7,10':'7', '0,3,6,9':'dim7', '0,4,7,14':'add9',
  '0,3,7,14':'m add9', '0,3,6,14':'dim add9', '0,4,8,14':'aug add9', '0,4,7,9':'6',
  '0,3,7,9':'m6', '0,4,8,9':'aug6', '0,4,7,11,14':'maj9', '0,3,7,11,14':'m(maj9)',
  '0,3,7,10,14':'m9', '0,3,6,10,14':'m9♭5', '0,4,7,10,14':'9', '0,3,6,9,14':'dim9',
  '0,4,8,10,14':'9♯5', '0,4,8,11,14':'maj9♯5'
};

export function chordName(chord) {
  const q = QUALITY[chord.iv.join(',')];
  return NOTES[chord.root] + (q === undefined ? '?' : q);
}

/** Root position at the base octave. Inversion and octave live in voicing.js. */
export function chordMidi(chord) {
  return chord.iv.map(i => 48 + chord.root + i);
}

export function qualityOf(keyPc, scaleId, degree) {
  const { iv } = buildChord(keyPc, scaleId, degree, 'base');
  if (iv[1] === 3 && iv[2] === 6) return 'dim';
  if (iv[1] === 4 && iv[2] === 8) return 'aug';
  return iv[1] === 3 ? 'min' : 'maj';
}

export function degreeRoman(keyPc, scaleId, degree) {
  const q = qualityOf(keyPc, scaleId, degree);
  let r = ROMAN[degree];
  if (q === 'min' || q === 'dim') r = r.toLowerCase();
  if (q === 'dim') r += '°';
  else if (q === 'aug') r += '+';
  return r;
}
