export const el = id => document.getElementById(id);
export const NS = 'http://www.w3.org/2000/svg';
export function svgEl(name, attrs) {
  const n = document.createElementNS(NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}
/** Arc path, degrees clockwise from twelve o'clock. */
export function arcPath(cx, cy, r, a0, a1) {
  const p = a => {
    const t = (a - 90) * Math.PI / 180;
    return [(cx + r * Math.cos(t)).toFixed(2), (cy + r * Math.sin(t)).toFixed(2)];
  };
  const large = (a1 - a0) > 180 ? 1 : 0;
  return 'M' + p(a0) + ' A' + r + ',' + r + ' 0 ' + large + ' 1 ' + p(a1);
}
