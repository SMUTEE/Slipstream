# Slipstream

A browser chord instrument. Pick a key and a scale, play one of seven scale-degree pads, and
turn a twelve-detent knob to reshape the chord. No install, no dependencies, no build step —
plain HTML and the Web Audio API.

The idea is that the system knows the theory so you don't have to. You are choosing
relationships, not chord names, so the same seven pads keep working when you change key.

**[Play the current build →](prototypes/slipstream.html)**

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

| Key | Does |
|-----|------|
| `1`–`7` | Play a scale degree |
| `Q W E / A S D / Z X C` | The eight compass detents; `S` resets to the triad |
| `[` `]` | Step the knob one detent — this reaches all twelve |
| `↑ → ↓ ←` | The four cardinals; hold two at once for a diagonal |
| `Space` | Latch the chord so you can change key and hear it slide |
| `G` | Toggle slide |
| `Esc` | Recentre the knob |
| `R` | Record — starts the loop if it isn't running, commits the layer on the second press |
| `Enter` | Start or stop the loop |
| `Backspace` | Delete the last layer |

Dragging the knob and pressing-then-sliding from a pad both work on touch.

## Slide

Slide is real portamento, not a retrigger. The synth is a fixed five-voice pool whose
oscillators run continuously, so a chord change ramps each voice's frequency instead of
starting new notes. Glide time is adjustable from 20 to 600 ms.

Turn on **Hold**, play a chord, then change the **Key** — the whole chord slides.

When a chord grows (triad to a 9th) the joining voice enters from its nearest neighbour's
pitch rather than appearing out of nowhere.

## Loops

Press record and play. The loop runs for a fixed number of bars and wraps; record again to
stack another layer on top, up to four.

Each layer keeps whichever voice was selected when you played it, so you can put **Sub**
underneath **Glass**. Layers store scale degrees and knob positions rather than notes, so
changing the key or the scale transposes every layer at once — the same idea that lets seven
pads keep their meaning across twelve keys.

Timing is free by default. Quantize snaps to eighth notes, and is off because quantising a
chord instrument tends to flatten the feel.

A thin ring around the outside of the chassis is the playhead, with a tick per bar. It turns
red while recording.

Playback and the live instrument use separate audio paths. Live playing runs through the
five-voice glide pool so slide keeps working; recorded layers use scheduled one-shot voices
against `AudioContext.currentTime`, capped at 26 concurrent. That scheduler is also what the
12-pulse rhythm engine will eventually run on.

## Saving and sharing

Loops save to your browser automatically and come back when you return.

**Share** turns the whole arrangement — key, scale, tempo, bar count and every layer — into one
URL-safe token. A typical four-chord loop is 38 characters; four full layers of 32 chords each
is 824, which fits a URL comfortably.

```
1002o40-00000006o401xg6o503uw6o335sc6o     C – G – Am – Fmaj7, 96 bpm, 4 bars
```

The header is version, key, scale, tempo, bars and quantize. Each chord after it is a fixed
seven characters: degree, detent, start in milliseconds, length in centiseconds. Decoding
validates every field and refuses anything malformed rather than half-loading it.

Where the host passes a URL fragment through, the link restores the arrangement on open. The
paste-a-code box works everywhere regardless.

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

## Layout

```
index.html                        landing page
prototypes/slipstream.html        the current build
prototypes/waon-three-ways.html   three Japanese visual directions
prototypes/chord-ui-options.html  three interaction models + a UX review of the spec
```

The two studies are kept because the decisions in them are still live. `chord-ui-options.html`
also carries a fourteen-point review of the original product spec.

## State of play

Working: 12 keys, 4 scales, 7 degrees, 12 detents, 8 voices, portamento, knob and touch
gestures, full keyboard control, four-layer loop recording on a lookahead scheduler, presets,
autosave and shareable arrangements.

Verified: the chord engine across all 4,032 combinations of key × scale × degree × detent, and
the share encoder across 4,000 randomised arrangements with zero round-trip failures.

Not built yet: editing a recorded layer (right now a layer is opaque and your only fix is to
replay it), per-pad sound assignment, and MIDI out. Per-pad sound is deliberately parked —
layers already give you per-voice separation, and a sound picker on every pad costs screen
space permanently.

## Running it

Open `prototypes/slipstream.html` in a browser. There is nothing to install.

Audio starts on the first tap or keypress, because browsers require a gesture before they let
a page make sound.
