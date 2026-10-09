/* Eight voices. Three oscillators with independent harmonic multipliers plus one
   FM operator, a filter envelope and a per-voice reverb send.

   p: [multiplier, gain] per oscillator. A multiplier is never 0, so a voice is
   silenced with its gain and its frequency can still be ramped for glide. */

export const SOUNDS = {
  glass:  { name:'Glass',  t:['sine','sine','sine'],             p:[[1,1],[1,0],[1,0]],       det:[0,0,0],  fm:{ratio:2,idx:2.4,dec:.30},   cut:5200, ce:.55, q:.4,  a:.004, d:.9,  s:.22, r:.70, lvl:.26, wet:.30, oct:0   },
  air:    { name:'Air',    t:['sawtooth','sawtooth','sine'],     p:[[1,.42],[1,.42],[2,.12]], det:[-9,9,0], fm:null,                        cut:1250, ce:1.5, q:.8,  a:.45,  d:1.8, s:.90, r:1.9, lvl:.20, wet:.60, oct:0   },
  bell:   { name:'Bell',   t:['sine','sine','sine'],             p:[[1,1],[1,0],[1,0]],       det:[0,0,0],  fm:{ratio:3.51,idx:5.2,dec:.55},cut:7000, ce:.70, q:.3,  a:.002, d:1.7, s:.07, r:1.7, lvl:.24, wet:.50, oct:0   },
  nylon:  { name:'Nylon',  t:['triangle','sawtooth','sine'],     p:[[1,.7],[1,.3],[1,0]],     det:[0,7,0],  fm:null,                        cut:2700, ce:.32, q:1.6, a:.003, d:.45, s:.07, r:.50, lvl:.28, wet:.25, oct:0   },
  organ:  { name:'Organ',  t:['sine','sine','sine'],             p:[[1,.5],[2,.26],[3,.16]],  det:[0,0,0],  fm:null,                        cut:4200, ce:.12, q:.5,  a:.020, d:.2,  s:.95, r:.18, lvl:.26, wet:.20, oct:0   },
  choir:  { name:'Choir',  t:['sawtooth','sawtooth','triangle'], p:[[1,.4],[1,.34],[2,.10]],  det:[-6,6,0], fm:null,                        cut:1050, ce:1.0, q:3.4, a:.30,  d:1.2, s:.85, r:1.2, lvl:.22, wet:.55, oct:0   },
  mallet: { name:'Mallet', t:['sine','sine','sine'],             p:[[1,1],[1,0],[1,0]],       det:[0,0,0],  fm:{ratio:4,idx:3.4,dec:.10},   cut:6000, ce:.22, q:.4,  a:.002, d:.5,  s:.02, r:.50, lvl:.28, wet:.35, oct:0   },
  sub:    { name:'Sub',    t:['sine','sawtooth','sine'],         p:[[1,.8],[1,.22],[1,0]],    det:[0,4,0],  fm:null,                        cut:620,  ce:.38, q:.9,  a:.012, d:.6,  s:.50, r:.42, lvl:.34, wet:.08, oct:-12 }
};
export const SOUND_IDS = Object.keys(SOUNDS);
