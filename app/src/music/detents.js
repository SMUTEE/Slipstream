/* The knob's twelve positions, clockwise from the top.

   Four have no dedicated key: they sit between the compass points and are
   reached by stepping or dragging. Each one is placed next to its nearest
   harmonic relative, so a single step from a position you know always lands
   somewhere musical. */

export const DETENTS = [
  { id: 'base',   name: 'triad',   key: 'W'  },
  { id: 'add9',   name: 'add9',    key: 'E'  },
  { id: 'six',    name: '6th',     key: null },
  { id: 'add7',   name: '7th',     key: 'D'  },
  { id: 'dom7',   name: 'dom7',    key: 'C'  },
  { id: 'nine',   name: '9th',     key: null },
  { id: 'sus4',   name: 'sus4',    key: 'X'  },
  { id: 'sus2',   name: 'sus2',    key: 'Z'  },
  { id: 's7sus4', name: '7sus4',   key: null },
  { id: 'flip3',  name: 'maj/min', key: 'A'  },
  { id: 'aug',    name: 'aug',     key: 'Q'  },
  { id: 'dim',    name: 'dim',     key: null }
];

/** North, north-east, east ... north-west, mapped to detent indexes. */
export const COMPASS = [0, 1, 3, 4, 6, 7, 9, 10];

/** Which compass sector a drag points at, or -1 inside the dead zone. */
export function zoneFor(dx, dy) {
  if (Math.hypot(dx, dy) < 24) return -1;
  let a = Math.atan2(dx, -dy) * 180 / Math.PI;
  if (a < 0) a += 360;
  return Math.round(a / 45) % 8;
}
