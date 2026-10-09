/* Test suite for Slipstream.

   These import the real modules. That works because music/ and state/codec.js
   are pure: no DOM, no audio context, no globals. Keeping that true is the
   point of the architecture, so this suite guards it as much as the maths.

   Run: node tests/run.mjs                                                    */

import { NOTES, SCALES } from '../app/src/music/notes.js';
import { DETENTS } from '../app/src/music/detents.js';
import { buildChord, chordName, qualityOf, degreeRoman } from '../app/src/music/chords.js';
import { voiced } from '../app/src/music/voicing.js';
import { packLoop, unpackLoop } from '../app/src/state/codec.js';

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; return; }
  fail++;
  console.log('  FAIL  ' + name + (detail ? '  — ' + detail : ''));
};
const group = n => console.log('\n' + n);
const names = c => c.iv.map(i => NOTES[(c.root + i) % 12]);

/* ---------------------------------------------------------------- engine */
group('chord engine');

ok("the spec's own example: C major, degree 5 is G B D",
  names(buildChord(0, 'major', 4, 'base')).join(' ') === 'G B D',
  names(buildChord(0, 'major', 4, 'base')).join(' '));

const TRANSFORMS = DETENTS.map(d => d.id);
let unnamed = 0, total = 0;
for (let k = 0; k < 12; k++)
  for (const sc of Object.keys(SCALES))
    for (let d = 0; d < 7; d++)
      for (const t of TRANSFORMS) {
        total++;
        if (chordName(buildChord(k, sc, d, t)).includes('?')) unnamed++;
      }
ok(`every key x scale x degree x detent names a real chord (${total} of them)`,
  unnamed === 0, unnamed + ' unnamed');

const dia = d => chordName(buildChord(0, 'major', d, 'add7'));
ok('the 7th is diatonic, not fixed: I is maj7', dia(0) === 'Cmaj7', dia(0));
ok('the 7th is diatonic: ii is m7', dia(1) === 'Dm7', dia(1));
ok('the 7th is diatonic: V is dominant', dia(4) === 'G7', dia(4));
ok('the 7th is diatonic: vii is half-diminished', dia(6) === 'Bm7♭5', dia(6));

ok('flipping the third of a diminished triad resolves the fifth too',
  chordName(buildChord(0, 'major', 6, 'flip3')) === 'Bm',
  chordName(buildChord(0, 'major', 6, 'flip3')));

let stable = true;
for (let k = 0; k < 12; k++)
  for (let d = 0; d < 7; d++)
    if (qualityOf(k, 'major', d) !== qualityOf(0, 'major', d)) stable = false;
ok('a scale degree keeps its quality in all twelve keys', stable);
ok('roman numerals carry the quality', degreeRoman(0, 'major', 6) === 'vii°', degreeRoman(0, 'major', 6));

/* --------------------------------------------------------------- voicing */
group('voicing');

const c = buildChord(0, 'major', 0, 'base');
const root = voiced(c, 0, 0), first = voiced(c, 1, 0), second = voiced(c, 2, 0);
const pcs = a => [...new Set(a.map(n => n % 12))].sort((x, y) => x - y).join(',');

ok('root position is C E G', root.join(',') === '48,52,55', root.join(','));
ok('inversion does not change which notes are in the chord',
  pcs(root) === pcs(first) && pcs(root) === pcs(second));
ok('first inversion lifts the root above the third', first[0] === 52 && first[2] === 60, first.join(','));
ok('second inversion lifts the third as well', second[0] === 55, second.join(','));
ok('every voicing comes back in ascending order',
  [root, first, second].every(v => v.every((n, i) => i === 0 || n >= v[i - 1])));
ok('octave up shifts the whole chord by twelve',
  voiced(c, 0, 1).join(',') === root.map(n => n + 12).join(','));
ok('octave down shifts the whole chord by twelve',
  voiced(c, 0, -1).join(',') === root.map(n => n - 12).join(','));
ok('voicing never alters chord identity',
  [0, 1, 2].every(i => [-1, 0, 1].every(o => pcs(voiced(c, i, o)) === pcs(root))));
ok('voicing defaults to root position at the base octave', voiced(c).join(',') === root.join(','));

/* ----------------------------------------------------------------- codec */
group('share codec');
/* Times are beats, not seconds: a loop keeps its musical shape at any tempo. */

const rnd = n => Math.floor(Math.random() * n);
let bad = 0, unsafe = 0, longest = 0;
for (let i = 0; i < 3000; i++) {
  const st = {
    key: rnd(12), scale: rnd(4), bpm: 60 + rnd(101), bars: [2, 4, 8][rnd(3)],
    q: rnd(2) === 1, inv: rnd(3), oct: rnd(3) - 1, rev: rnd(36) / 35, dly: rnd(36) / 35,
    layers: []
  };
  for (let l = 0; l < 1 + rnd(4); l++) {
    const ev = [];
    for (let e = 0; e < rnd(33); e++) ev.push({
      deg: rnd(7), det: rnd(12),
      t: Math.round(Math.random() * 31000) / 1000,
      dur: Math.round(Math.random() * 1200) / 100
    });
    st.layers.push({ sound: rnd(8), muted: rnd(2) === 1, events: ev });
  }
  const tok = packLoop(st);
  longest = Math.max(longest, tok.length);
  if (!/^[A-Za-z0-9_.~-]+$/.test(tok)) { unsafe++; continue; }
  const back = unpackLoop(tok);
  const same = back
    && back.key === st.key && back.scale === st.scale && back.bpm === st.bpm
    && back.bars === st.bars && back.q === st.q && back.inv === st.inv && back.oct === st.oct
    && Math.abs(back.rev - st.rev) < 0.03 && Math.abs(back.dly - st.dly) < 0.03
    && back.layers.length === st.layers.length
    && back.layers.every((L, li) => {
      const o = st.layers[li];
      return L.sound === o.sound && L.muted === o.muted && L.events.length === o.events.length
        && L.events.every((e, ei) => e.deg === o.events[ei].deg && e.det === o.events[ei].det
          && Math.abs(e.t - o.events[ei].t) < 0.002
          && Math.abs(e.dur - o.events[ei].dur) < 0.011);
    });
  if (!same) bad++;
}
ok('3000 random arrangements survive a round trip', bad === 0, bad + ' mismatched');
ok('every token is safe to put in a URL', unsafe === 0, unsafe + ' unsafe');
ok('the longest arrangement still fits a URL (' + longest + ' chars)', longest < 1800);

const junk = [null, undefined, '', 'x', '1zzzzzz', '4002o40', '2002o40-00000006o4z',
  '1002o40-0abc', 'not a token at all', '2002o4000'];
ok('malformed input is refused rather than half-loaded',
  junk.every(j => unpackLoop(j) === null),
  junk.filter(j => unpackLoop(j) !== null).map(j => JSON.stringify(j)).join(' '));

ok('a fresh token declares version 3', packLoop({
  key: 0, scale: 0, bpm: 96, bars: 4, q: false, inv: 0, oct: 0, rev: 0, dly: 0, layers: []
})[0] === '3');

/* An old token: I V vi IV at 0, 2.5, 5 and 7.5 SECONDS in a 10-second loop at
   96 bpm. In beats that is one chord per bar: 0, 4, 8, 12. */
const v1 = unpackLoop('1002o40-00000006o401xg6o503uw6o335sc6o');
ok('tokens shared before voicing existed still load', !!v1 && v1.layers[0].events.length === 4);
ok('and they default to root position at the original octave',
  !!v1 && v1.inv === 0 && v1.oct === 0);
ok('and their seconds are converted to beats on the way in',
  !!v1 && v1.layers[0].events.map(e => e.t).join(',') === '0,4,8,12',
  v1 && v1.layers[0].events.map(e => e.t).join(','));

/* ------------------------------------------------------------ boundaries */
group('module boundaries');

const srcOf = async p => (await import('node:fs/promises')).readFile(new URL(p, import.meta.url), 'utf8');
const musicFiles = ['../app/src/music/notes.js','../app/src/music/chords.js','../app/src/music/voicing.js','../app/src/music/detents.js'];
let domLeak = [];
for (const f of musicFiles) {
  const src = await srcOf(f);
  if (/\bdocument\b|\bwindow\b|getElementById/.test(src)) domLeak.push(f);
}
ok('music modules contain no DOM access', domLeak.length === 0, domLeak.join(' '));

const ui = await srcOf('../app/src/ui/pads.js') + await srcOf('../app/src/ui/knob.js');
ok('UI modules contain no music theory', !/buildChord|scaleTone|QUALITY/.test(ui));

const main = await srcOf('../app/src/main.js');
ok('nothing is patched onto an already-defined function',
  !/^\s*(play|stopAll|reflow|recOff|recToggle|renderKnob|ensureAudio)\s*=\s*function/m.test(main));

/* ---------------------------------------------------------------------- */
console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
