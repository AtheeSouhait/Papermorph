// Papermorph science book: illustrated scene components (SVG, drawn in code).
// Load after engine.js. Every figure is drawn around its own origin with the ground at y = 0, facing right (+x),
// so it can be placed with put(e, {x, y, s}) and animated with the engine's tweens.
'use strict';
const PH = {
  out: '#0e1714', skin: '#e9c49f', hair: '#4b3427', pants: '#5b6d90', shoe: '#ece8dc',
  road: '#38433f', verge: '#25382f', line: '#ece8dc', trunk: '#8a6a4c', leaf: '#5f9e6c', leaf2: '#4f8a5d',
  lamp: '#9aaba3', glass: '#cfe8f3', trailer: '#d8dedb', tire: '#202825', hub: '#b9c5c1',
  you: COL.real, friend: COL.nat, truck: COL.whole, car: COL.irr, ref: COL.task, change: COL.rat,
};
const phLine = (w = 2.5) => ({ stroke: PH.out, 'stroke-width': w, 'stroke-linejoin': 'round' });

// Text with a dark backing stroke, so it stays legible when something passes behind it.
function phLabel(p, str, { x = 0, y = 0, size = 30, fill = COL.chalk, anchor = 'middle', weight = 700, o = 1 } = {}) {
  const t = T(p, str, { x, y, size, fill, anchor, weight, o });
  t.setAttribute('stroke', COL.board); t.setAttribute('stroke-width', 8); t.setAttribute('paint-order', 'stroke');
  t.setAttribute('stroke-linejoin', 'round');
  return t;
}
// Reference-point pin: the tip touches (0, 0).
function phPin(p, o = {}) {
  const g = G(p, o);
  path(g, 'M0 0C-5 -12 -19 -22 -19 -37A19 19 0 1 1 19 -37C19 -22 5 -12 0 0Z', { fill: PH.ref, ...phLine(2.5) });
  mk('circle', { cx: 0, cy: -37, r: 7, fill: COL.board }, g);
  return g;
}

/* ---------- people ---------- */
// A person about 180 px tall. Limbs are groups that rotate about the hip or shoulder: phPose(person, phase).
function phPerson(p, { shirt = PH.you, pants = PH.pants, hair = PH.hair, x = 0, y = 0, s = 1, o = 1 } = {}) {
  const g = G(p, { x, y, s, o });
  const limb = (px, py, parts, shade) => {
    const L = G(g, { x: px, y: py });
    parts.forEach(([d, col, w]) => path(L, d, { stroke: shade ? mix(col, '#000000', .25) : col, 'stroke-width': w }));
    return L;
  };
  const leg = shade => limb(0, -84, [['M0 0V76', pants, 15], ['M-3 80H13', PH.shoe, 9]], shade);
  const arm = shade => limb(0, -130, [['M0 0V24', shirt, 12], ['M0 24V46', PH.skin, 9]], shade);
  const legB = leg(true), armB = arm(true);
  path(g, 'M-17 -136Q0 -143 17 -136L19 -82Q0 -76 -19 -82Z', { fill: shirt, ...phLine() });
  path(g, 'M-5 -144V-136H7V-144', { fill: PH.skin });
  mk('circle', { cx: 2, cy: -160, r: 18, fill: PH.skin, ...phLine() }, g);
  path(g, 'M-17 -160Q-17 -181 2 -180Q19 -180 21 -165Q11 -171 0 -169Q-7 -162 -17 -154Z', { fill: hair, ...phLine(2) });
  mk('circle', { cx: 10, cy: -161, r: 2.4, fill: PH.out }, g);
  path(g, 'M6 -151Q11 -148 15 -152', { stroke: PH.out, 'stroke-width': 2 });
  const legF = leg(false), armF = arm(false);
  g._limbs = { legB, legF, armB, armF };
  return g;
}
// Walking pose; phase in radians (one stride per 2π). phase = null stands still.
function phPose(person, phase) {
  const L = person._limbs, a = phase == null ? 0 : Math.sin(phase);
  put(L.legF, { r: -24 * a }); put(L.legB, { r: 24 * a });
  put(L.armF, { r: 20 * a }); put(L.armB, { r: -20 * a });
}
// A window with someone sitting behind it, clipped to the glass.
let phClipN = 0;
function phWindow(p, d, bust) {
  const id = 'phclip' + (++phClipN), cp = mk('clipPath', { id }, mk('defs', {}, p));
  mk('path', { d }, cp);
  path(p, d, { fill: PH.glass });
  if (bust) { const w = G(p); w.setAttribute('clip-path', `url(#${id})`); phBust(w, bust); }
  path(p, d, { fill: 'none', ...phLine(2) });
}
// Head and shoulders, for windows.
function phBust(p, { shirt = PH.you, hair = PH.hair, x = 0, y = 0, s = 1 } = {}) {
  const g = G(p, { x, y, s });
  path(g, 'M-26 0Q-24 -30 0 -32Q24 -30 26 0Z', { fill: shirt, ...phLine() });
  mk('circle', { cx: 2, cy: -50, r: 17, fill: PH.skin, ...phLine() }, g);
  path(g, 'M-16 -50Q-16 -70 2 -69Q18 -69 20 -55Q10 -61 0 -59Q-7 -52 -16 -45Z', { fill: hair, ...phLine(2) });
  mk('circle', { cx: 10, cy: -51, r: 2.3, fill: PH.out }, g);
  return g;
}

/* ---------- vehicles ---------- */
// A wheel whose spokes show rotation: put(w, {r: degrees}).
function phWheel(p, x, y, r) {
  const g = G(p, { x, y });
  mk('circle', { r, fill: PH.tire, ...phLine() }, g);
  mk('circle', { r: r * .5, fill: PH.hub }, g);
  path(g, [0, 72, 144, 216, 288].map(a => `M0 0L${(r * .5 * Math.cos(a * Math.PI / 180)).toFixed(1)} ${(r * .5 * Math.sin(a * Math.PI / 180)).toFixed(1)}`).join(''), { stroke: PH.tire, 'stroke-width': 3 });
  mk('circle', { r: 3.5, fill: PH.tire }, g);
  return g;
}
const phRoll = (v, dist) => v._wheels.forEach(w => put(w, { r: dist / w._r * 180 / Math.PI }));
// Semi truck, about 400 px long and 190 px tall; cab at the front (right).
function phTruck(p, { x = 0, y = 0, s = 1, o = 1, color = PH.truck } = {}) {
  const g = G(p, { x, y, s, o });
  path(g, 'M52 -150V-188', { stroke: PH.hub, 'stroke-width': 8 });
  mk('rect', { x: -235, y: -182, width: 270, height: 136, rx: 6, fill: PH.trailer, ...phLine() }, g);
  mk('rect', { x: -235, y: -86, width: 270, height: 12, fill: color }, g);
  mk('rect', { x: -235, y: -50, width: 405, height: 14, rx: 4, fill: '#3b4744', ...phLine(2) }, g);
  path(g, 'M44 -40V-138Q44 -152 58 -152H118L150 -108H160Q170 -108 170 -96V-40Z', { fill: color, ...phLine() });
  phWindow(g, 'M90 -142H116L140 -110H90Z', { shirt: '#e8a0c8', x: 108, y: -106, s: .6 });
  path(g, 'M60 -100H82', { stroke: PH.out, 'stroke-width': 3 });
  mk('circle', { cx: 163, cy: -82, r: 6, fill: '#f6d27a', ...phLine(2) }, g);
  g._wheels = [-200, -150, 80, 136].map(wx => Object.assign(phWheel(g, wx, -24, 24), { _r: 24 }));
  return g;
}
// Family car, about 225 px long and 105 px tall; the driver sits at the front window.
function phCar(p, { x = 0, y = 0, s = 1, o = 1, color = PH.car, driver = PH.you } = {}) {
  const g = G(p, { x, y, s, o });
  const body = 'M-112 -24V-56Q-110 -66 -96 -68L-62 -72L-36 -102Q-31 -107 -20 -107H34Q44 -107 51 -100L78 -72L100 -68Q113 -64 113 -50V-24Z';
  path(g, body, { fill: color, ...phLine() });
  phWindow(g, 'M-28 -98H-3V-74H-50Z');
  phWindow(g, 'M3 -98H30L52 -74H3Z', { shirt: driver, x: 20, y: -62, s: .6 });
  path(g, 'M-6 -66V-30M14 -58H26', { stroke: PH.out, 'stroke-width': 2.5 });
  mk('circle', { cx: 104, cy: -54, r: 6, fill: '#f6d27a', ...phLine(2) }, g);
  mk('rect', { x: -114, y: -60, width: 8, height: 12, rx: 2, fill: COL.bad }, g);
  g._wheels = [-68, 70].map(wx => Object.assign(phWheel(g, wx, -22, 22), { _r: 22 }));
  return g;
}
// Passenger railway carriage, `w` long, 250 px tall; returns window centres in g._wins (x, top of the window).
function phCarriage(p, { x = 0, y = 0, w = 960, color = COL.real } = {}) {
  const g = G(p, { x, y });
  const x0 = -w / 2;
  mk('rect', { x: x0, y: -262, width: w, height: 222, rx: 26, fill: color, ...phLine(3) }, g);
  mk('rect', { x: x0, y: -112, width: w, height: 14, fill: mix(color, '#000000', .3) }, g);
  g._wins = [];
  for (let wx = x0 + 110; wx < w / 2 - 60; wx += 170) {
    mk('rect', { x: wx - 62, y: -232, width: 124, height: 96, rx: 10, fill: PH.glass, ...phLine(2.5) }, g);
    g._wins.push(wx);
  }
  [x0 + 110, w / 2 - 110].forEach(bx => {
    mk('rect', { x: bx - 80, y: -42, width: 160, height: 12, rx: 4, fill: '#3b4744' }, g);
    [-46, 46].forEach(o => phWheel(g, bx + o, -22, 20));
  });
  return g;
}

/* ---------- scenery ---------- */
function phTree(p, { x = 0, y = 0, s = 1 } = {}) {
  const g = G(p, { x, y, s });
  path(g, 'M-9 0L-6 -74H6L9 0Z', { fill: PH.trunk, ...phLine(2) });
  [[-30, -96, 36, PH.leaf2], [30, -100, 34, PH.leaf2], [0, -134, 44, PH.leaf], [-18, -108, 30, PH.leaf], [18, -112, 30, PH.leaf]]
    .forEach(([cx, cy, r, fill]) => mk('circle', { cx, cy, r, fill, ...phLine(2) }, g));
  return g;
}
function phLamp(p, { x = 0, y = 0, s = 1 } = {}) {
  const g = G(p, { x, y, s });
  path(g, 'M0 0V-200Q0 -222 24 -222H42', { stroke: PH.lamp, 'stroke-width': 8 });
  path(g, 'M30 -224H58L52 -212H36Z', { fill: '#f3c95c', ...phLine(2) });
  mk('rect', { x: -12, y: -6, width: 24, height: 8, rx: 3, fill: PH.lamp }, g);
  return g;
}
function phHouse(p, { x = 0, y = 0, s = 1, wall = '#d9b48a', roof = '#a65d4b' } = {}) {
  const g = G(p, { x, y, s });
  mk('rect', { x: -70, y: -110, width: 140, height: 110, fill: wall, ...phLine() }, g);
  path(g, 'M-86 -106L0 -172L86 -106Z', { fill: roof, ...phLine() });
  mk('rect', { x: -14, y: -58, width: 28, height: 58, fill: '#7a5a43', ...phLine(2) }, g);
  [-46, 46].forEach(wx => mk('rect', { x: wx - 15, y: -88, width: 30, height: 28, fill: '#f6e3a1', ...phLine(2) }, g));
  return g;
}
// Side-view road with far/near lanes and wrapping scenery. update(cam) slides every fixed object by the camera position.
const ROAD = { top: 478, far: 566, mid: 640, near: 726, bot: 748, side: 474, wrap: 2100 };
function phRoad(p, { trees = [60, 520, 980, 1440, 1880], lamps = [300, 1260] } = {}) {
  const back = G(p), g = G(p);
  mk('rect', { x: 0, y: ROAD.side - 6, width: 1600, height: 12, fill: PH.verge }, back);
  const items = [...trees.map(x => [phTree(back, { y: ROAD.side }), x]), ...lamps.map(x => [phLamp(back, { y: ROAD.side }), x])];
  mk('rect', { x: 0, y: ROAD.top, width: 1600, height: ROAD.bot - ROAD.top, fill: PH.road }, g);
  mk('rect', { x: 0, y: ROAD.bot, width: 1600, height: 900 - ROAD.bot, fill: PH.verge }, g);
  path(g, `M0 ${ROAD.top + 4}H1600M0 ${ROAD.bot - 4}H1600`, { stroke: PH.line, 'stroke-width': 3, opacity: .7 });
  const dash = path(g, `M0 ${ROAD.mid}H1600`, { stroke: PH.line, 'stroke-width': 5, 'stroke-dasharray': '70 90', 'stroke-linecap': 'butt' });
  const tufts = path(g, Array.from({ length: 9 }, (_, i) => { const x = i * 250 + 60 + (i % 2) * 70, y = ROAD.bot + 58 + (i % 3) * 30; return `M${x - 26} ${y}Q${x - 28} ${y - 18} ${x - 12} ${y - 20}Q${x - 4} ${y - 36} ${x + 8} ${y - 26}Q${x + 26} ${y - 26} ${x + 26} ${y}Z`; }).join(''),
    { fill: PH.leaf2, ...phLine(2) });
  const vehicles = G(p), front = G(p);
  const road = { back, g, vehicles, front, cam: 0,
    update(cam) {
      road.cam = cam;
      const W = ROAD.wrap, wrap = x => ((x - cam + 250) % W + W) % W - 250;
      items.forEach(([e, x]) => put(e, { x: wrap(x) }));
      dash.setAttribute('stroke-dashoffset', cam % 160);
      put(tufts, { x: -(((cam % 250) + 250) % 250) });
    },
    // Screen x of a world position.
    sx: x => x - road.cam,
  };
  road.update(0);
  return road;
}

/* ---------- objects ---------- */
// Soccer ball of radius r, centred on the origin; rotate with put(ball, {r}).
function phBall(p, r = 40, o = {}) {
  const g = G(p, o);
  mk('circle', { r, fill: '#f4f1e8', ...phLine(3) }, g);
  const pent = (cx, cy, k, rot) => Array.from({ length: 5 }, (_, i) => { const a = rot + i * 72 * Math.PI / 180; return `${i ? 'L' : 'M'}${(cx + k * Math.cos(a)).toFixed(1)} ${(cy + k * Math.sin(a)).toFixed(1)}`; }).join('') + 'Z';
  path(g, pent(0, 0, r * .3, -Math.PI / 2), { fill: '#2a3532' });
  [0, 72, 144, 216, 288].forEach(a => {
    const t = (a - 90) * Math.PI / 180, cx = Math.cos(t) * r * .9, cy = Math.sin(t) * r * .9;
    path(g, pent(cx, cy, r * .24, t + Math.PI), { fill: '#2a3532' });
    path(g, `M${(Math.cos(t) * r * .3).toFixed(1)} ${(Math.sin(t) * r * .3).toFixed(1)}L${(Math.cos(t) * r * .68).toFixed(1)} ${(Math.sin(t) * r * .68).toFixed(1)}`, { stroke: '#2a3532', 'stroke-width': 2 });
  });
  mk('circle', { r, fill: 'none', ...phLine(3) }, g);
  return g;
}
// Stopwatch; returns the group with ._hand to rotate.
function phStopwatch(p, { x = 0, y = 0, r = 60, o = 1 } = {}) {
  const g = G(p, { x, y, o });
  mk('rect', { x: -12, y: -r - 22, width: 24, height: 16, rx: 4, fill: PH.lamp }, g);
  mk('circle', { r: r + 8, fill: PH.lamp, ...phLine() }, g);
  mk('circle', { r, fill: '#f4f1e8' }, g);
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; path(g, `M${Math.sin(a) * r * .8} ${-Math.cos(a) * r * .8}L${Math.sin(a) * r * .92} ${-Math.cos(a) * r * .92}`, { stroke: PH.out, 'stroke-width': 3 }); }
  g._hand = path(g, `M0 8V${-r * .78}`, { stroke: COL.bad, 'stroke-width': 4 });
  mk('circle', { r: 5, fill: PH.out }, g);
  return g;
}
// Open notebook; g._page flips about the spine with phFlip(book, angle in degrees, 0 = lying right, 180 = lying left).
function phNotebook(p, { x = 0, y = 0, s = 1 } = {}) {
  const g = G(p, { x, y, s });
  const page = (dx, parent) => {
    const e = mk('g', {}, parent);
    mk('rect', { x: dx, y: -70, width: 130, height: 170, rx: 6, fill: '#f4f1e8', ...phLine(2.5) }, e);
    for (let ly = -40; ly < 95; ly += 20) path(e, `M${dx + 14} ${ly}H${dx + 116}`, { stroke: '#86c9e8', 'stroke-width': 2 });
    return e;
  };
  mk('rect', { x: -142, y: -78, width: 284, height: 186, rx: 10, fill: '#a65d4b', ...phLine() }, g);
  page(-132, g); page(2, g);
  g._page = page(0, g);
  return g;
}
function phFlip(book, deg) {
  const k = Math.cos(deg * Math.PI / 180), e = book._page;
  e.setAttribute('transform', `scale(${Math.abs(k) < .02 ? .02 * Math.sign(k || 1) : k},1) skewY(${-8 * Math.sin(deg * Math.PI / 180)})`);
  e.firstChild.setAttribute('fill', k < 0 ? '#e2ddcf' : '#f4f1e8');
}
// A cheerful Sun with rays.
function phSun(p, { x = 0, y = 0, r = 54 } = {}) {
  const g = G(p, { x, y });
  const rays = G(g);
  path(rays, Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `M${Math.cos(a) * (r + 10)} ${Math.sin(a) * (r + 10)}L${Math.cos(a) * (r + 28)} ${Math.sin(a) * (r + 28)}`; }).join(''), { stroke: '#f6c445', 'stroke-width': 6 });
  mk('circle', { r, fill: '#f6c445', ...phLine() }, g);
  mk('circle', { r: r * .7, fill: '#f9d978', opacity: .6 }, g);
  g._rays = rays;
  return g;
}
// A deterministic wobbly blob, for land masses.
function phBlob(cx, cy, r, seed) {
  const n = 12, pts = Array.from({ length: n }, (_, i) => {
    const a = i / n * 2 * Math.PI, k = r * (.72 + .28 * Math.sin(seed * (i + 1) * 1.7) * Math.cos(seed + i));
    return [cx + k * Math.cos(a), cy + k * Math.sin(a)];
  });
  return pts.map((q, i) => { const nx = pts[(i + 1) % n]; return `${i ? '' : `M${((q[0] + pts[n - 1][0]) / 2).toFixed(1)} ${((q[1] + pts[n - 1][1]) / 2).toFixed(1)}`}Q${q[0].toFixed(1)} ${q[1].toFixed(1)} ${((q[0] + nx[0]) / 2).toFixed(1)} ${((q[1] + nx[1]) / 2).toFixed(1)}`; }).join('') + 'Z';
}
// Small Earth as seen from the side (for orbits).
function phEarthSmall(p, { x = 0, y = 0, r = 26 } = {}) {
  const g = G(p, { x, y });
  mk('circle', { r, fill: '#3f7fb0', ...phLine(2) }, g);
  path(g, phBlob(-r * .25, -r * .2, r * .45, 3) + phBlob(r * .45, r * .35, r * .3, 7), { fill: '#6fae74' });
  return g;
}
// Earth seen from far above the North Pole: the rim is the equator. Rotate g._spin (degrees; negative = counterclockwise on screen).
function phEarthPolar(p, { x = 0, y = 0, R = 220 } = {}) {
  const g = G(p, { x, y });
  const spin = G(g);
  mk('circle', { r: R, fill: '#3f7fb0', ...phLine(3) }, spin);
  path(spin, [[40, .62, R * .26, 2.1], [130, .58, R * .3, 4.3], [215, .64, R * .24, 5.9], [300, .6, R * .28, 8.2], [175, .3, R * .16, 1.3]]
    .map(([a, k, r, seed]) => phBlob(Math.cos(a * Math.PI / 180) * R * k, Math.sin(a * Math.PI / 180) * R * k, r, seed)).join(''), { fill: '#6fae74', ...phLine(2) });
  path(spin, Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `M0 0L${(Math.cos(a) * R).toFixed(1)} ${(Math.sin(a) * R).toFixed(1)}`; }).join(''), { stroke: '#dfeef5', 'stroke-width': 1.5, opacity: .35 });
  [.33, .66].forEach(k => mk('circle', { r: R * k, fill: 'none', stroke: '#dfeef5', 'stroke-width': 1.5, opacity: .35 }, spin));
  path(spin, phBlob(0, 0, R * .2, 6.6), { fill: '#f4f6f7', ...phLine(2) });
  g._spin = spin;
  return g;
}
