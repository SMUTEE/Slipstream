/* Where the notes sit, which is a separate question from what they are. */

/**
 * @param inv 0 root position, 1 first inversion, 2 second
 * @param oct octave offset, -1 to +1
 */
export function voiced(chord, inv = 0, oct = 0) {
  const m = chord.iv.map(i => 48 + chord.root + i + 12 * oct);
  for (let k = 0; k < inv; k++) m.push(m.shift() + 12);
  return m.sort((a, b) => a - b);
}
