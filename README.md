# Slipstream

A browser chord instrument. Pick a key and a scale, play one of seven scale-degree pads, and
turn a twelve-detent knob to reshape the chord. No install, no dependencies, no build step —
plain HTML and the Web Audio API.

The idea is that the system knows the theory so you don't have to. You are choosing
relationships, not chord names, so the same seven pads keep working when you change key.

**[Play the current build](app/)**

---

## The knob

Twelve detents of harmonic colour, clockwise from the top. The ordering puts each
keyboard-addressable detent next to its nearest harmonic relative, so stepping one click from
somewhere familiar always lands somewhere musical.

| # | Angle | Chord | Key |
|---|-------|-------|-----|
| 0 | 0° | triad | `W` / `S` |
| 1 | 30° | add9 | `E` |
| 2 | 60° | 6th | step only |
| 3 | 90° | 7th (diatonic) | `D` |
| 4 | 120° | dom7 | `C` |
| 5 | 150° | 9th | step only |
| 6 | 180° | sus4 | `X` |
| 7 | 210° | sus2 | `Z` |
| 8 | 240° | 7sus4 | step only |
| 9 | 270° | maj ↔ min | `A` |
| 10 | 300° | aug | `Q` |
| 11 | 330° | dim | step only |

The 7th is diatonic rather than fixed, so one detent gives `Cmaj7` on the tonic, `Dm7` on the
supertonic and `Bm7♭5` on the leading tone without any special cases.

## Controls

Controls sit in two groups under the pads. The first row is harmony — key, scale, voicing and
octave. The second is voice and feel — the synth, slide, hold, and a **Tune** panel holding the
three continuous parameters (glide time, reverb, delay) that you set once and leave. The loop
transport is its own card, with record and play as the only full-size controls in it.


| Key | Does |
|-----|------|
| `1`–`7` | Play a scale degree |
| `Q W E / A S D / Z X C` | The eight compass detents; `S` resets to the triad |
| `[` `]` | Step the knob one detent — this reaches all twelve |
| `↑ → ↓ ←` | The four cardinals; hold two at once for a diagonal |
| `Space` | Latch the chord so you can change key and hear it slide |
| `G` | Toggle slide |
| `Esc` | Recentre the knob |
| `V` | Cycle the voicing — root, first inversion, second inversion |
| `O` | Shift the octave |
| `R` | Record — starts the loop if it isn't running, commits the layer on the second press |
| `Enter` | Start or stop the loop |
| `Backspace` | Delete the last layer |

Dragging the knob and pressing-then-sliding from a pad both work on touch.

## Voicing

Chord identity and voicing are separate concepts, in the code as well as the documentation.
The engine decides *which notes*; the voicing stage decides *where they sit*. Root position,
first and second inversion, and an octave shift either way.

```
Cmaj7   root    C  E  G  B
        1st     E  G  B  C
        2nd     G  B  C  E
```

Inversion applies to recorded layers too, so you can re-voice a whole arrangement after the
fact without re-recording it.

## Slide

Slide is real portamento, not a retrigger. The synth is a fixed five-voice pool whose
oscillators run continuously, so a chord change ramps each voice's frequency instead of
starting new notes. Glide time is adjustable from 20 to 600 ms.

Turn on **Hold**, play a chord, then change the **Key** — the whole chord slides.

When a chord grows (triad to a 9th) the joining voice enters from its nearest neighbour's
pitch rather than appearing out of nowhere.

## Loops

Press record and play along to the click. **A take is exactly one pass long and ends itself** —
there is no second button to find mid-performance. The ring on the chassis fills red as the take
runs and completes a full circle at the moment recording stops, and the counter shows the
seconds left. Press record again before then to end a take early.

Each take becomes a layer, and you can stack four.

Each layer keeps whichever voice was selected when you played it, so you can put **Sub**
underneath **Glass**. Layers store scale degrees and knob positions rather than notes, so
changing the key or the scale transposes every layer at once — the same idea that lets seven
pads keep their meaning across twelve keys.

Layers hold **beats, not seconds**. The loop is always `bars x 4` beats and tempo maps beats
onto real time at playback, so the tempo control speeds the whole arrangement up or down with
every layer staying locked to every other one. Shortening the bar count trims the chords that
now fall outside the loop rather than letting them bleed into the next pass.

Tempo and the metronome sit with key and scale rather than inside the loop card. They describe
the instrument, not the recorder, and a tempo you cannot see while setting up a take is no use.
A checkbox beside the tempo turns it on and off. It is accented on the downbeat and on by
default, because the first layer is otherwise recorded against silence and every later layer
inherits that guess. It is pitched and levelled to sit under the music as a cue rather than
compete with it. The setting is remembered in your browser and deliberately kept out of shared
arrangements — whether someone else wants a click is their business, not yours.

Timing is free by default. Quantize snaps to eighth notes, and is off because quantising a
chord instrument tends to flatten the feel.

### Knowing where you are

While the transport runs, the loop card shows the time left in the pass and the current bar and
beat, turning red while recording, so you can see when to stop.

The ring around the outside of the chassis is that same clock drawn round the edge, with a tick
per bar and a faint track behind it so it is visible at rest. It is deliberately **not** the
accent colour: the accent means the knob, and drawing the clock in the same blue made two
unrelated things look like one.

### Under it

Playback and the live instrument use separate audio paths. Live playing runs through the
five-voice glide pool so slide keeps working; recorded layers use one-shot voices scheduled
against `AudioContext.currentTime`. That scheduler is also what the 12-pulse rhythm engine will
eventually run on.

Stop is immediate. A whole pass is handed to the audio clock in advance, so stopping cuts the
queued notes short rather than letting them ring out.

Voices are capped by how many actually **overlap**, not by how many are queued ahead — counting
the queue meant a few layers could exceed the ceiling the moment a pass was scheduled and fall
silent. At the ceiling the longest-ringing note is stolen rather than the newest one refused,
since silencing the chord you just played is the worst of the options.

## Saving and sharing

Loops save to your browser automatically and come back when you return.

**Share** turns the whole arrangement — key, scale, tempo, bar count and every layer — into one
URL-safe token. A typical four-chord loop is 38 characters; four full layers of 32 chords each
is 824, which fits a URL comfortably.

```
1002o40-00000006o401xg6o503uw6o335sc6o     C – G – Am – Fmaj7, 96 bpm, 4 bars
```

The header is version, key, scale, tempo, bars, quantize, voicing, octave and the two effect
levels. Each chord after it is a fixed
seven characters: degree, detent, start in milliseconds, length in centiseconds. Decoding
validates every field and refuses anything malformed rather than half-loading it.

Where the host passes a URL fragment through, the link restores the arrangement on open. The
paste-a-code box works everywhere regardless. Older tokens still load: ones that predate
voicing default to root position, and ones that stored seconds are converted to beats using
their own tempo.

Because layers hold scale degrees rather than notes, a shared arrangement is transposable by
whoever opens it — they can move it to their own key without losing what you wrote.

## Presets

Four progressions that load straight into a layer and start playing: `I–V–vi–IV`, `ii–V–I`,
`vi–IV–I–V`, and a minor `i–VII–VI–v`. They set the scale they need, and they are ordinary
layers once loaded, so you can mute them, delete them or stack your own on top.

## Voices

Eight, built on three oscillators with independent harmonic multipliers plus one FM operator,
a filter envelope and a per-voice reverb send.

Glass and Bell are true FM. Organ is additive drawbars. Air and Choir are detuned saw stacks.
Plus Nylon, Mallet and Sub.

## Effects

Reverb and delay, both global. The reverb is a convolver running on an impulse response
generated at runtime — decaying noise, so there is no audio file to ship. **Space** and
**Echo** set the two send levels, and both travel in a shared arrangement.

## Tests

```
node tests/run.mjs
```

No dependencies and no build. The suite imports the real modules rather than scraping them out of a page, which works
because `music/` and the share codec are pure. Three assertions check that this stays true:
no DOM access in `music/`, no music theory in `ui/`, and no function in `main.js` patched onto
one another module already defined.

29 assertions covering chord generation across all 4,032 key × scale × degree × detent
combinations, diatonic sevenths, the diminished-triad edge case, degree stability across keys,
inversion and octave maths, 3,000 randomised round trips through the share codec plus its
rejection of malformed input, and the module boundaries above.

## Layout

```
index.html              landing page
app/index.html          the instrument: markup and styles
app/src/
  music/                notes, chords, voicing, detents. No DOM anywhere in here.
  audio/                context and graph, sounds, the glide pool, the scheduler
  loop/recorder.js      transport and recording, in beats
  state/                store, share codec, persistence
  ui/                   knob, pads, controls, loop card, keyboard
  main.js               the only file that wires modules to each other
tests/run.mjs           the suite
```

Native ES modules, so there is still nothing to build. The one consequence is that
`app/index.html` needs to be served rather than opened from disk, because browsers refuse
module imports over `file://`.

```
python3 -m http.server 8777     # then open http://localhost:8777/app/
```

The dependency direction only ever points one way. `music/` knows nothing about audio or the
DOM, `ui/` contains no music theory, and `main.js` is the only place where modules are joined
to each other. Three of the tests check exactly that, because it is the property the suite
depends on to import the real code rather than scraping it out of a page.

## State of play

**The MVP is complete**, with one item dropped on purpose.

Working: 12 keys, 4 scales, 7 scale-degree pads, 12 harmonic detents, inversions and octave
shift, 8 synth voices with ADSR and a filter, reverb and delay, portamento, pooled voices,
mouse, touch and full keyboard control, four-layer loop recording on a lookahead scheduler,
presets, autosave and shareable arrangements.

Dropped on purpose: **per-pad sound, volume and octave**, and the Link Sounds toggle that went
with them. Layers already give per-voice separation — a bass line is a layer, not a pad
setting — and a sound picker on every pad would cost screen space permanently to solve a
problem that is already solved.

Verified: 22 assertions in `tests/run.mjs`, and layout and touch targets at 375×812, where the
pads come out 77×96 px. Not yet verified on physical hardware — iOS Safari's audio behaviour in
particular deserves a real device before this is called finished.

Next, in order: editing a recorded layer, which is the one real gap left in the interface;
porting to the modular architecture before the surface grows further; then the 12-pulse rhythm
engine, which the loop scheduler has already unblocked. MIDI out stays a progressive
enhancement.

## Running it

Serve the folder and open `app/`:

```
python3 -m http.server 8777
```

There is nothing to install and nothing to build.

Audio starts on the first tap or keypress, because browsers require a gesture before they let
a page make sound.
