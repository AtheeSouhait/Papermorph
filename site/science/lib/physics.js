// Papermorph science book: shared lesson helpers for physics chapters (load after engine.js and figures.js).
// Copied from ch09's chapter-local helpers (ch09 keeps its own copies, unchanged).
'use strict';
const txt = (p, s, x, y, t0, { size = 32, fill = COL.chalk, anchor = 'middle', weight = 600 } = {}) => { const e = T(p, s, { x, y, size, fill, anchor, weight, o: 0 }); show(e, t0); return e; };
// One line with coloured runs: [[text, colour?], …].
function runs(p, parts, { x, y, size = 40, anchor = 'middle', weight = 600, o = 0 }) {
  const t = T(p, '', { x, y, size, anchor, weight, o });
  parts.forEach(([s, c]) => { const sp = mk('tspan', { fill: c || COL.chalk }, t); sp.textContent = s; });
  return t;
}
function arrowPath(x1, y, x2) { const d = Math.sign(x2 - x1); return `M${x1} ${y}H${x2}M${x2 - 16 * d} ${y - 11}L${x2} ${y}L${x2 - 16 * d} ${y + 11}`; }
const DIST = COL.rat, TIME = COL.whole;          // distance pink (as "change of position" in part 1), time blue
const walkTo = (r, x, step = 22) => phPose(r, 'walk', x / step * Math.PI);   // two frames per stride, from x
// A measured track: a bar with ticks every `every` meters from 0 to `to`, U px per meter.
function meterTrack(p, { x0, U, y, to, every, size = 26 }) {
  const g = G(p);
  phBlock(g, x0 - 20, y, U * to + 40, 14, '#8a6f55', { top: 4, ol: 0 });
  for (let v = 0; v <= to; v += every) {
    mk('rect', { x: x0 + U * v - 2, y: y + 14, width: 4, height: 14, fill: COL.dim }, g);
    T(g, String(v), { x: x0 + U * v, y: y + 56, size, fill: COL.chalk, anchor: 'middle' });
  }
  T(g, 'meters', { x: x0 + U * to + 36, y: y + 56, size: size - 2, fill: COL.dim });
  return g;
}
// A fraction in words or numbers (upright text, no math italics), centred on x with its bar at y.
function wfrac(p, top, bot, x, y, { size = 44, ct = COL.chalk, cb = COL.chalk, o = 0 } = {}) {
  const g = G(p, { x, y, o }), w = Math.max(uiW(top, size), uiW(bot, size)) + 24;
  T(g, top, { y: -size * .32, size, fill: ct, anchor: 'middle', weight: 600 });
  mk('rect', { x: -w / 2, y: -2, width: w, height: 4, rx: 2, fill: COL.chalk }, g);
  T(g, bot, { y: size * 1.02, size, fill: cb, anchor: 'middle', weight: 600 });
  g._w = w;
  return g;
}
// A sim clock: stopwatch plus "N s" under it; set(sec) turns the hand (one turn per minute) and writes whole seconds.
function simClock(p, x, y, r = 46) {
  const sw = phStopwatch(p, { x, y, r }), lab = T(p, '0 s', { x, y: y + r + 48, size: 32, weight: 700, fill: TIME, anchor: 'middle' });
  return { sw, lab, set(sec) { put(sw._hand, { r: sec * 6 }); phText(lab, `${Math.floor(sec + 1e-6)} s`); } };
}
const ramp = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const VEL = COL.int;                             // velocity arrows and readouts: yellow
// Set path el to an arrow from (x, y), len long, at angle a (degrees; 0 = right, −90 = up).
function arrowAt(el, x, y, len, a, head = 18) {
  const r = a * Math.PI / 180, c = Math.cos(r), s = Math.sin(r), x2 = x + len * c, y2 = y + len * s;
  el.setAttribute('d', len < 2 ? '' : `M${x} ${y}L${x2} ${y2}M${x2 - head * c - head * .6 * s} ${y2 - head * s + head * .6 * c}L${x2} ${y2}L${x2 - head * c + head * .6 * s} ${y2 - head * s - head * .6 * c}`);
  return el;
}
const ACC = '#ee6fd0';                           // acceleration: magenta (velocity stays yellow)
const FORCE = '#ff7a45', NETF = COL.chalk;      // forces: orange arrows; the net force: a thick white arrow
// A labelled force arrow: f.set(x, y, len, angle, text, dx, dy) draws it from (x, y); the label sits above its middle
// (shifted by dx, dy). len 0 hides it.
function forceArrow(p, { color = FORCE, w = 9, size = 28 } = {}) {
  const g = G(p), a = path(g, '', { stroke: color, 'stroke-width': w }), lab = phLabel(g, '', { size, fill: color });
  return Object.assign(g, {
    set(x, y, len, ang = 0, text = '', dx = 0, dy = 0) {
      const r = ang * Math.PI / 180;
      arrowAt(a, x, y, len, ang, 12 + w); phText(lab, len > 1 ? text : '');
      put(lab, { x: x + len / 2 * Math.cos(r) + dx, y: y + len / 2 * Math.sin(r) - 20 + dy });
    },
  });
}
// A crate (centred on x, sitting on y); returns the group.
function crate(p, { x = 0, y = 0, w = 150, h = 130, label = '' } = {}) {
  const g = G(p, { x, y });
  phBlock(g, -w / 2, -h, w, h, '#a87a4f', { top: 8, right: 14, ol: 0 });
  path(g, `M${-w / 2 + 10} ${-h + 18}L${w / 2 - 24} -10M${-w / 2 + 10} -10L${w / 2 - 24} ${-h + 18}`, { stroke: '#7d5737', 'stroke-width': 8 });
  if (label) phLabel(g, label, { y: -h / 2 + 10, size: 30 });
  return g;
}
