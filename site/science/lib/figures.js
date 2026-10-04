// Papermorph science book: illustrated scene set, drawn in code (SVG) in a blocky, voxel-like style. Load after engine.js.
// Style: everything is built from blocks (rects and straight-edged polygons) with one outline colour (PH.out, OL px at
// scale 1; 1.5 px for small details) and three tones per block: the face, a lighter top band and a darker side or
// bottom band (light from the upper left). Things whose physics depends on being round stay round: wheels, balls,
// Earth's rim, clock faces. A soft ground shadow sits under anything that stands or rolls.
// Every figure is drawn around its own origin with the ground at y = 0, facing right (+x); place it with
// put(e, {x, y, s}) and animate it with the engine's tweens.
'use strict';
const PH = {
  out: '#14201c', skin: '#efc6a0', hair: '#4b3427', pants: '#5b6d90', shoe: '#2f3a44',
  road: '#3a4541', walk: '#55625b', grass: '#2d4636', line: '#ece8dc', hill1: '#22352d', hill2: '#283f34',
  trunk: '#8a6a4c', leaf: '#5f9e6c', lamp: '#9aaba3', glass: '#bfe0ef', trailer: '#dfe4e1', tire: '#20282a', rim: '#c3cecb',
  light: '#f6d27a', tail: '#f08c7a', metal: '#7d8a86', sky: '#4f7f9c', ocean: '#3f7fb0',
  you: COL.real, friend: COL.nat, truck: COL.whole, car: COL.irr, ref: COL.task, change: COL.rat,
};
const OL = 2.5;
const dk = (c, k = .22) => mix(c, '#0e1714', k), lt = (c, k = .3) => mix(c, '#ffffff', k);
const phLine = (w = OL) => ({ stroke: PH.out, 'stroke-width': w, 'stroke-linejoin': 'round' });
const phHash = (i, j) => { const v = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return v - Math.floor(v); };
let phN = 0;

/* ---------- building blocks ---------- */
// A shaded block: face, lighter top band, optional darker right/bottom bands, outline.
function phBlock(p, x, y, w, h, c, { top = 4, right = 0, bottom = 0, ol = OL } = {}) {
  mk('rect', { x, y, width: w, height: h, fill: c }, p);
  if (top) mk('rect', { x, y, width: w, height: Math.min(top, h / 2), fill: lt(c) }, p);
  if (right) mk('rect', { x: x + w - right, y, width: right, height: h, fill: dk(c) }, p);
  if (bottom) mk('rect', { x, y: y + h - bottom, width: w, height: bottom, fill: dk(c) }, p);
  if (ol) mk('rect', { x, y, width: w, height: h, fill: 'none', ...phLine(ol) }, p);
}
const phPts = pts => 'M' + pts.map(q => q.join(' ')).join('L') + 'Z';
const phPoly = (p, pts, fill, ol = OL) => path(p, phPts(pts), { fill, ...(ol ? phLine(ol) : { stroke: 'none' }) });
const phShadow = (p, rx, cx = 0) => mk('ellipse', { cx, rx, ry: Math.min(10, Math.max(3, rx * .07)), fill: '#000', opacity: .22 }, p);
// Rects merged into one silhouette with a single outline; shade(g) draws extra tones clipped to the silhouette.
function phMerge(p, rects, fill, shade) {
  const g = G(p), id = 'phm' + (++phN), cp = mk('clipPath', { id }, mk('defs', {}, g));
  rects.forEach(([x, y, width, height]) => mk('rect', { x, y, width, height, fill: PH.out, stroke: PH.out, 'stroke-width': 2 * OL, 'stroke-linejoin': 'round' }, g));
  rects.forEach(([x, y, width, height]) => { mk('rect', { x, y, width, height, fill }, g); mk('rect', { x, y, width, height }, cp); });
  if (shade) { const c = G(g); c.setAttribute('clip-path', `url(#${id})`); shade(c); }
  return g;
}
// Pixel texture: a few lighter and darker squares on a grid over [x0, x1] × [y0, y1].
function phPixels(p, x0, y0, x1, y1, c, cell = 13, seed = 1) {
  for (let i = 0, x = x0; x < x1; i++, x += cell) for (let j = 0, y = y0; y < y1; j++, y += cell) {
    const h = phHash(i + seed * 17, j + seed * 31);
    if (h > .84) mk('rect', { x, y, width: cell, height: cell, fill: lt(c, .16) }, p);
    else if (h < .12) mk('rect', { x, y, width: cell, height: cell, fill: dk(c, .2) }, p);
  }
}

// Text with a dark backing stroke, so it stays legible when something passes behind it.
function phLabel(p, str, { x = 0, y = 0, size = 30, fill = COL.chalk, anchor = 'middle', weight = 700, o = 1 } = {}) {
  const t = T(p, str, { x, y, size, fill, anchor, weight, o });
  t.setAttribute('stroke', COL.board); t.setAttribute('stroke-width', size / 4); t.setAttribute('paint-order', 'stroke');
  t.setAttribute('stroke-linejoin', 'round');
  return t;
}
// Reference-point pin (an on-screen marker, not part of the world's look): the tip touches (0, 0).
function phPin(p, o = {}) {
  const g = G(p, o);
  path(g, 'M0 0C-5 -12 -19 -22 -19 -37A19 19 0 1 1 19 -37C19 -22 5 -12 0 0Z', { fill: PH.ref, ...phLine() });
  path(g, 'M-11 -44A12 12 0 0 1 -2 -53', { stroke: lt(PH.ref, .5), 'stroke-width': 3.5 });
  mk('circle', { cx: 0, cy: -37, r: 7, fill: COL.board }, g);
  return g;
}

/* ---------- people ---------- */
// A blocky person, 172 px tall: legs swing from the hip, arms from the shoulder. Poses: stand, walk, run, sit
// (phPose(person, pose, phase); phase in radians, one stride per 2π).
const PH_LEG = 68;
function phPerson(p, { shirt = PH.you, pants = PH.pants, hair = PH.hair, skin = PH.skin, x = 0, y = 0, s = 1, o = 1, pose = 'stand', phase = 0, shadow = true } = {}) {
  const g = G(p, { x, y, s, o });
  if (shadow) phShadow(g, 24);
  const b = G(g), topB = G(b, { y: -PH_LEG });
  const arm = (parent, k) => {
    const L = G(parent, { y: -58 });
    phBlock(L, -6.5, -4, 13, 28, dk(shirt, k), { top: 0, right: 3, ol: 0 });
    phBlock(L, -6.5, 24, 13, 32, dk(skin, k), { top: 0, right: 3, ol: 0 });
    mk('rect', { x: -6.5, y: -4, width: 13, height: 60, fill: 'none', ...phLine() }, L);
    return L;
  };
  const leg = k => {
    const L = G(b, { y: -PH_LEG });
    phBlock(L, -7.5, 0, 15, 58, dk(pants, k), { top: 0, right: 3 });
    phBlock(L, -7.5, 56, 19, 12, dk(PH.shoe, k), { top: 2.5 });
    return L;
  };
  const armB = arm(topB, .28), legB = leg(.28), legF = leg(0);
  const topF = G(b, { y: -PH_LEG });
  phBlock(topF, -14, -64, 28, 64, shirt, { top: 5, right: 6 });
  mk('rect', { x: 2, y: -46, width: 7, height: 6, fill: dk(shirt, .12) }, topF);
  phBlock(topF, -14, -8, 28, 8, pants, { top: 0, right: 6 });
  const H = G(topF, { x: 3, y: -86 });
  phBlock(H, -20, -20, 40, 40, skin, { top: 0, bottom: 5, ol: 0 });
  mk('rect', { x: -20, y: -20, width: 40, height: 10, fill: hair }, H);
  mk('rect', { x: -20, y: -10, width: 13, height: 15, fill: hair }, H);
  mk('rect', { x: 13, y: -10, width: 7, height: 4, fill: hair }, H);
  mk('rect', { x: -16, y: -20, width: 24, height: 3, fill: lt(hair, .2) }, H);
  mk('rect', { x: -7, y: -3, width: 6, height: 8, fill: dk(skin, .14) }, H);
  mk('rect', { x: 7, y: -9, width: 9, height: 2.5, fill: dk(hair) }, H);
  mk('rect', { x: 8, y: -5, width: 6, height: 6, fill: PH.out }, H);
  mk('rect', { x: 11, y: -5, width: 2, height: 2, fill: '#fff' }, H);
  mk('rect', { x: 14, y: 3, width: 5, height: 3, fill: '#e98d79', opacity: .5 }, H);
  mk('rect', { x: 9, y: 9, width: 8, height: 2.5, fill: dk(skin, .5) }, H);
  mk('rect', { x: -20, y: -20, width: 40, height: 40, fill: 'none', ...phLine() }, H);
  const armF = arm(topF, 0);
  Object.assign(g, { _limbs: { legB, legF, armB, armF }, _body: b, _top: [topB, topF] });
  phPose(g, pose, phase);
  return g;
}
// [front leg, back leg, front arm, back arm, body drop, lean]; angles in degrees, + swings backward.
const PH_POSES = {
  stand: () => [0, 0, 4, -4, 0, 0],
  walk: f => { const a = 28 * Math.sin(f); return [-a, a, a, -a, PH_LEG * (1 - Math.cos(a * Math.PI / 180)), 2]; },
  run: f => { const a = 48 * Math.sin(f); return [-a, a, .9 * a, -.9 * a, PH_LEG * (1 - Math.cos(a * Math.PI / 180)) - 6 * Math.abs(Math.cos(f)), 9]; },
  sit: () => [-90, -84, -50, -42, 0, -3],
};
function phPose(person, pose = 'stand', phase = 0) {
  const [lf, lb, af, ab, drop, lean] = PH_POSES[pose](phase), L = person._limbs;
  put(L.legF, { r: lf }); put(L.legB, { r: lb }); put(L.armF, { r: af }); put(L.armB, { r: ab });
  put(person._body, { y: drop }); person._top.forEach(e => put(e, { r: lean }));
}
// A window (polygon points) with an optional seated person behind the glass (phPerson options), clipped to it.
function phWindow(p, pts, who) {
  const id = 'phw' + (++phN), cp = mk('clipPath', { id }, mk('defs', {}, p));
  mk('path', { d: phPts(pts) }, cp);
  phPoly(p, pts, PH.glass, 0);
  const w = G(p); w.setAttribute('clip-path', `url(#${id})`);
  if (who) phPerson(w, { pose: 'sit', shadow: false, ...who });
  const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]), x0 = Math.min(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), h = y1 - y0;
  phPoly(w, [[x0 + h * .9, y0], [x0 + h * 1.2, y0], [x0 + h * .5, y1], [x0 + h * .2, y1]], '#ffffff', 0).setAttribute('opacity', .28);
  phPoly(p, pts, 'none', 2);
}

/* ---------- vehicles ---------- */
// A wheel: a 16-sided tyre with a plus-shaped hub, so rotation reads clearly. put(w, {r: degrees}); see phRoll.
function phWheel(p, x, y, r) {
  const g = G(p, { x, y });
  const ngon = (k, n) => Array.from({ length: n }, (_, i) => { const a = (i + .5) / n * 2 * Math.PI; return [+(k * Math.cos(a)).toFixed(1), +(k * Math.sin(a)).toFixed(1)]; });
  phPoly(g, ngon(r, 16), PH.tire);
  phPoly(g, ngon(r * .6, 8), PH.rim, 1.5);
  mk('rect', { x: -r * .5, y: -r * .1, width: r, height: r * .2, fill: dk(PH.rim, .4) }, g);
  mk('rect', { x: -r * .1, y: -r * .5, width: r * .2, height: r, fill: dk(PH.rim, .4) }, g);
  mk('rect', { x: -r * .16, y: -r * .16, width: r * .32, height: r * .32, fill: lt(PH.rim), ...phLine(1.2) }, g);
  g._r = r;
  return g;
}
const phRoll = (v, dist) => v._wheels.forEach(w => put(w, { r: dist / w._r * 180 / Math.PI }));
const phWell = (p, wx, r) => phPoly(p, [[wx - r - 7, -28], [wx - r - 7, -r - 22], [wx - r + 1, -r - 30], [wx + r - 1, -r - 30], [wx + r + 7, -r - 22], [wx + r + 7, -28]], '#141c1a', 2);
// Family car, 240 px long and 104 px tall; the driver sits at the front window.
function phCar(p, { x = 0, y = 0, s = 1, o = 1, color = PH.car, driver = PH.you } = {}) {
  const g = G(p, { x, y, s, o });
  phShadow(g, 122);
  const body = [[-120, -28], [-120, -58], [-112, -68], [-68, -70], [-44, -104], [36, -104], [62, -70], [108, -66], [120, -56], [120, -28]];
  phPoly(g, body, color, 0);
  phPoly(g, [[-120, -44], [120, -44], [120, -28], [-120, -28]], dk(color), 0);
  path(g, 'M-112 -66L-68 -68M62 -68L108 -64', { stroke: lt(color, .4), 'stroke-width': 4 });
  mk('rect', { x: -42, y: -104, width: 76, height: 5, fill: lt(color, .4) }, g);
  phWindow(g, [[-60, -72], [-40, -98], [-6, -98], [-6, -72]]);
  phWindow(g, [[2, -98], [32, -98], [56, -72], [2, -72]], { shirt: driver, x: 21, y: -17, s: .45 });
  path(g, 'M-2 -72V-30M64 -70V-32M-64 -69V-32', { stroke: dk(color, .4), 'stroke-width': 2 });
  [-28, 40].forEach(hx => mk('rect', { x: hx, y: -64, width: 13, height: 4, fill: dk(color, .45) }, g));
  phBlock(g, 60, -80, 9, 8, color, { top: 0, ol: 1.5 });
  phPoly(g, body, 'none');
  [-72, 72].forEach(wx => phWell(g, wx, 22));
  phBlock(g, 110, -62, 10, 9, PH.light, { top: 0, ol: 1.5 });
  phBlock(g, -120, -62, 7, 11, PH.tail, { top: 0, ol: 1.5 });
  phBlock(g, 104, -40, 20, 12, PH.metal, { top: 3, ol: 1.5 });
  phBlock(g, -124, -40, 20, 12, PH.metal, { top: 3, ol: 1.5 });
  g._wheels = [-72, 72].map(wx => phWheel(g, wx, -22, 22));
  return g;
}
// Semi truck, about 435 px long and 205 px tall; cab at the front (right).
function phTruck(p, { x = 0, y = 0, s = 1, o = 1, color = PH.truck } = {}) {
  const g = G(p, { x, y, s, o });
  phShadow(g, 222, -35);
  phBlock(g, 48, -206, 9, 64, PH.rim, { top: 0, right: 3 });
  phBlock(g, -250, -190, 284, 138, PH.trailer, { top: 6, bottom: 10 });
  path(g, Array.from({ length: 9 }, (_, i) => `M${-222 + i * 28} -184V-62`).join(''), { stroke: dk(PH.trailer, .1), 'stroke-width': 2 });
  phBlock(g, -250, -98, 284, 12, color, { top: 0, ol: 2 });
  [-174, -78].forEach(hy => mk('rect', { x: -247, y: hy, width: 7, height: 9, fill: PH.metal }, g));
  phBlock(g, -250, -52, 432, 14, '#3b4744', { top: 3 });
  const cab = [[40, -40], [40, -166], [124, -166], [144, -120], [176, -116], [182, -106], [182, -40]];
  phPoly(g, cab, color, 0);
  phPoly(g, [[40, -70], [182, -70], [182, -40], [40, -40]], dk(color), 0);
  mk('rect', { x: 40, y: -166, width: 84, height: 5, fill: lt(color, .4) }, g);
  phWindow(g, [[84, -158], [120, -158], [136, -124], [84, -124]], { shirt: '#e8a0c8', x: 103, y: -54, s: .5 });
  path(g, 'M78 -162V-46M148 -118V-46', { stroke: dk(color, .4), 'stroke-width': 2 });
  mk('rect', { x: 88, y: -110, width: 13, height: 4, fill: dk(color, .45) }, g);
  phPoly(g, cab, 'none');
  phBlock(g, 172, -104, 10, 38, '#3b4744', { top: 0, ol: 1.5 });
  path(g, 'M175 -98H180M175 -90H180M175 -82H180M175 -74H180', { stroke: PH.metal, 'stroke-width': 2 });
  phBlock(g, 172, -62, 11, 10, PH.light, { top: 0, ol: 1.5 });
  phBlock(g, 170, -48, 18, 12, PH.metal, { top: 3, ol: 1.5 });
  phBlock(g, 56, -60, 48, 18, PH.rim, { top: 4, ol: 1.5 });
  [-205, -150, 76, 140].forEach(wx => phWell(g, wx, 24));
  g._wheels = [-205, -150, 76, 140].map(wx => phWheel(g, wx, -24, 24));
  return g;
}
// Passenger railway carriage, `w` long, 262 px tall; g._wins holds window centres (x). Window tops at y = -232.
function phCarriage(p, { x = 0, y = 0, w = 960, color = COL.real } = {}) {
  const g = G(p, { x, y });
  const x0 = -w / 2;
  phShadow(g, w / 2);
  phBlock(g, x0, -262, w, 222, color, { top: 0, bottom: 34 });
  phBlock(g, x0 + 10, -276, w - 20, 16, dk(color, .35), { top: 4 });
  mk('rect', { x: x0, y: -118, width: w, height: 12, fill: lt(color, .45) }, g);
  g._wins = [];
  for (let wx = x0 + 110; wx < w / 2 - 60; wx += 170) {
    mk('rect', { x: wx - 68, y: -238, width: 136, height: 108, fill: dk(color, .3) }, g);
    phWindow(g, [[wx - 62, -232], [wx + 62, -232], [wx + 62, -136], [wx - 62, -136]]);
    g._wins.push(wx);
  }
  path(g, `M${w / 2 - 34} -250V-46M${w / 2 - 6} -250V-46`, { stroke: dk(color, .4), 'stroke-width': 2 });
  [x0 + 110, w / 2 - 110].forEach(bx => {
    phBlock(g, bx - 80, -46, 160, 14, '#3b4744', { top: 3, ol: 2 });
    [-46, 46].forEach(o => phWheel(g, bx + o, -22, 20));
  });
  return g;
}
// Glass (and anyone behind it) for one of a carriage's windows.
const phCarWin = (train, k, who) => { const wx = train._wins[k]; phWindow(train, [[wx - 62, -232], [wx + 62, -232], [wx + 62, -136], [wx - 62, -136]], who); };

/* ---------- scenery ---------- */
// A blocky tree. kind 0: broad; kind 1: tall, in tiers.
function phTree(p, { x = 0, y = 0, s = 1, o = 1, leaf = PH.leaf, kind = 0 } = {}) {
  const g = G(p, { x, y, s, o });
  phShadow(g, 46);
  phBlock(g, -9, -88, 18, 88, PH.trunk, { top: 0, right: 5 });
  [[-5, -62], [-1, -30]].forEach(([bx, by]) => mk('rect', { x: bx, y: by, width: 4, height: 8, fill: dk(PH.trunk, .3) }, g));
  const rects = kind ? [[-46, -122, 92, 36], [-36, -154, 72, 34], [-24, -182, 48, 30], [-12, -200, 24, 20]]
    : [[-52, -150, 104, 72], [-32, -176, 64, 28], [-64, -134, 14, 40], [50, -140, 14, 36]];
  phMerge(g, rects, leaf, c => {
    rects.forEach(([rx, ry, rw]) => mk('rect', { x: rx, y: ry, width: rw, height: 6, fill: lt(leaf, .22) }, c));
    phPixels(c, -66, -202, 66, -78, leaf, 13, kind + 1);
    mk('rect', { x: 22, y: -210, width: 50, height: 140, fill: dk(leaf), opacity: .7 }, c);
    mk('rect', { x: -70, y: -96, width: 140, height: 20, fill: dk(leaf), opacity: .7 }, c);
  });
  return g;
}
function phLamp(p, { x = 0, y = 0, s = 1 } = {}) {
  const g = G(p, { x, y, s });
  phPoly(g, [[34, -213], [56, -213], [92, 0], [0, 0]], PH.light, 0).setAttribute('opacity', .06);
  phBlock(g, -5, -224, 10, 224, PH.lamp, { top: 0, right: 3 });
  phBlock(g, -5, -230, 50, 8, PH.lamp, { top: 2.5 });
  phBlock(g, 28, -232, 32, 14, '#5d6b66', { top: 3 });
  mk('rect', { x: 32, y: -218, width: 24, height: 6, fill: PH.light, ...phLine(1.5) }, g);
  phBlock(g, -11, -10, 22, 10, PH.lamp, { top: 3 });
  return g;
}
// A blocky house with a stepped roof and lit windows.
function phHouse(p, { x = 0, y = 0, s = 1, wall = '#d9b48a', roof = '#a65d4b' } = {}) {
  const g = G(p, { x, y, s });
  phShadow(g, 84);
  phBlock(g, 30, -196, 18, 50, '#8d6e5c', { top: 4, right: 5 });
  phBlock(g, -70, -112, 140, 112, wall, { top: 0, right: 16 });
  phPixels(g, -70, -112, 54, 0, wall, 14, 9);
  [86, 74, 62, 50, 38, 26].forEach((hw, i) => phBlock(g, -hw, -124 - 12 * i, 2 * hw, 12, roof, { top: 3.5, right: 8, ol: 2 }));
  mk('rect', { x: -70, y: -112, width: 140, height: 6, fill: '#000', opacity: .2 }, g);
  phBlock(g, -14, -60, 28, 60, '#7a5a43', { top: 0, right: 5 });
  mk('rect', { x: 6, y: -34, width: 4, height: 4, fill: PH.light }, g);
  [-46, 46].forEach(wx => {
    phBlock(g, wx - 15, -90, 30, 28, '#f6e3a1', { top: 0, ol: 2 });
    path(g, `M${wx} -90V-62M${wx - 15} -76H${wx + 15}`, { stroke: '#8d6e5c', 'stroke-width': 3 });
    mk('rect', { x: wx - 18, y: -62, width: 36, height: 4, fill: lt(wall, .4), ...phLine(1.5) }, g);
  });
  return g;
}
// Stepped (voxel) hills repeating every W px, ridge around y, filled down to y + depth.
function phHills(p, { y, amp = 40, W = ROAD.W, x0, x1, fill, seed = 1, step = 40, q = 16, depth = 700 }) {
  const f = x => y - amp * (.55 * Math.sin(2 * Math.PI * 2 * x / W + seed) + .3 * Math.sin(2 * Math.PI * 5 * x / W + 2 * seed) + .15 * Math.sin(2 * Math.PI * 11 * x / W + 3 * seed));
  let d = `M${x0} ${y + depth}`;
  for (let x = x0; x < x1; x += step) d += `V${Math.round(f(x) / q) * q}H${x + step}`;
  return path(p, d + `V${y + depth}Z`, { fill, stroke: lt(fill, .07), 'stroke-width': 2, 'stroke-linejoin': 'miter' });
}
// Side-view street on a camera (see camera() in the engine). Fixed scenery wraps every ROAD.W world px, so follow shots
// can run for any distance; far hills are parallax layers. Returns the layers to add things to, back to front:
// scenery (wraps; for fixed things that should repeat), side (people on the pavement), vehicles, front (labels).
const ROAD = { top: 478, far: 566, mid: 640, near: 726, bot: 748, side: 474, W: 2400 };
function phRoad(cam, { trees = [300, 1100, 1900], lamps = [1500], hills = true, x0 = -1600, x1 = 5600 } = {}) {
  const W = ROAD.W, rep = xs => xs.flatMap(v => { const out = []; for (let x = v + Math.floor((x0 - v) / W) * W; x < x1; x += W) out.push(x); return out; });
  if (hills) phHills(cam.layer(.3, W), { y: 380, amp: 44, x0, x1, fill: PH.hill1, seed: 1 });
  const scenery = cam.layer(1, W);
  phBlock(scenery, x0, 452, x1 - x0, 26, PH.walk, { top: 4, ol: 0 });
  path(scenery, rep(Array.from({ length: 40 }, (_, i) => i * 60)).map(x => `M${x} 457V478`).join(''), { stroke: dk(PH.walk, .2), 'stroke-width': 2 });
  trees.forEach((v, i) => rep([v]).forEach(x => phTree(scenery, { x, y: ROAD.side, kind: i % 2 })));
  rep(lamps).forEach(x => phLamp(scenery, { x, y: ROAD.side }));
  const side = G(cam.world), surface = cam.layer(1, W);
  mk('rect', { x: x0, y: ROAD.top, width: x1 - x0, height: ROAD.bot - ROAD.top, fill: PH.road }, surface);
  mk('rect', { x: x0, y: ROAD.top, width: x1 - x0, height: 6, fill: dk(PH.road, .3) }, surface);
  path(surface, `M${x0} ${ROAD.top + 12}H${x1}M${x0} ${ROAD.bot - 8}H${x1}`, { stroke: PH.line, 'stroke-width': 4, opacity: .65 });
  path(surface, rep(Array.from({ length: 15 }, (_, i) => i * 160)).map(x => `M${x} ${ROAD.mid - 3}h70v6h-70Z`).join(''), { fill: PH.line });
  phBlock(surface, x0, ROAD.bot, x1 - x0, 700, PH.grass, { top: 6, ol: 0 });
  rep(Array.from({ length: 10 }, (_, i) => i * 240)).forEach(x => {
    const k = Math.round((((x % W) + W) % W) / 240), gy = ROAD.bot + 52 + (k % 3) * 34, gx = x + 60 + (k % 2) * 70;
    path(surface, `M${gx} ${gy}h6v-14h6v8h6v-18h6v24h6v-10h6v10Z`, { fill: lt(PH.grass, .14) });
    if (k % 3 === 1) [[gx + 50, gy - 6, COL.rat], [gx + 64, gy - 2, COL.int]].forEach(([fx, fy, c]) => mk('rect', { x: fx, y: fy, width: 6, height: 6, fill: c }, surface));
  });
  return { scenery, side, vehicles: G(cam.world), front: G(cam.world) };
}

/* ---------- objects ---------- */
// Soccer ball of radius r, centred on the origin: move the group, rotate ball._spin; shading and shadow stay put.
function phBall(p, r = 40, o = {}) {
  const g = G(p, o);
  mk('ellipse', { cy: r, rx: r * .9, ry: r * .12, fill: '#000', opacity: .25 }, g);
  const sp = G(g);
  mk('circle', { r, fill: '#f4f1e8' }, sp);
  const pent = (cx, cy, k, rot) => Array.from({ length: 5 }, (_, i) => { const a = rot + i * 72 * Math.PI / 180; return `${i ? 'L' : 'M'}${(cx + k * Math.cos(a)).toFixed(1)} ${(cy + k * Math.sin(a)).toFixed(1)}`; }).join('') + 'Z';
  path(sp, pent(0, 0, r * .3, -Math.PI / 2), { fill: '#2a3532' });
  [0, 72, 144, 216, 288].forEach(a => {
    const t = (a - 90) * Math.PI / 180, cx = Math.cos(t) * r * .9, cy = Math.sin(t) * r * .9;
    path(sp, pent(cx, cy, r * .24, t + Math.PI), { fill: '#2a3532' });
    path(sp, `M${(Math.cos(t) * r * .3).toFixed(1)} ${(Math.sin(t) * r * .3).toFixed(1)}L${(Math.cos(t) * r * .68).toFixed(1)} ${(Math.sin(t) * r * .68).toFixed(1)}`, { stroke: '#2a3532', 'stroke-width': 2 });
  });
  const id = 'phb' + (++phN);
  mk('circle', { r }, mk('clipPath', { id }, mk('defs', {}, g)));
  const sh = G(g); sh.setAttribute('clip-path', `url(#${id})`);
  mk('circle', { cx: r * .35, cy: r * .4, r: r * 1.05, fill: 'none', stroke: '#000', 'stroke-width': r * .5, opacity: .14 }, sh);
  mk('circle', { cx: -r * .38, cy: -r * .42, r: r * .2, fill: '#fff', opacity: .55 }, sh);
  mk('circle', { r, fill: 'none', ...phLine(3) }, g);
  g._spin = sp;
  return g;
}
// Stopwatch; returns the group with ._hand to rotate.
function phStopwatch(p, { x = 0, y = 0, r = 60, o = 1 } = {}) {
  const g = G(p, { x, y, o });
  phBlock(g, -12, -r - 24, 24, 18, PH.lamp, { top: 4, ol: 2 });
  mk('circle', { r: r + 9, fill: PH.lamp, ...phLine() }, g);
  mk('circle', { r, fill: '#f4f1e8' }, g);
  mk('circle', { r: r * .96, fill: 'none', stroke: '#000', 'stroke-width': r * .12, opacity: .08 }, g);
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
    mk('rect', { x: dx, y: -70, width: 130, height: 170, fill: '#f4f1e8', ...phLine() }, e);
    for (let ly = -40; ly < 95; ly += 20) path(e, `M${dx + 14} ${ly}H${dx + 116}`, { stroke: '#86c9e8', 'stroke-width': 2 });
    return e;
  };
  phBlock(g, -142, -78, 284, 186, '#a65d4b', { top: 0, bottom: 8 });
  page(-132, g); page(2, g);
  g._page = page(0, g);
  return g;
}
function phFlip(book, deg) {
  const k = Math.cos(deg * Math.PI / 180), e = book._page;
  e.setAttribute('transform', `scale(${Math.abs(k) < .02 ? .02 * Math.sign(k || 1) : k},1) skewY(${-8 * Math.sin(deg * Math.PI / 180)})`);
  e.firstChild.setAttribute('fill', k < 0 ? '#e2ddcf' : '#f4f1e8');
}
// The Sun with block rays (g._rays turns).
function phSun(p, { x = 0, y = 0, r = 54 } = {}) {
  const g = G(p, { x, y });
  const rays = G(g);
  for (let i = 0; i < 12; i++) mk('rect', { x: r + 8, y: -4, width: 18, height: 8, fill: '#f6c445', transform: `rotate(${i * 30})` }, rays);
  mk('circle', { r, fill: '#f6c445', ...phLine() }, g);
  mk('circle', { cx: -r * .2, cy: -r * .2, r: r * .62, fill: '#f9d978', opacity: .7 }, g);
  g._rays = rays;
  return g;
}
// Earth's land as voxel cells: continents are unions of discs (centre and radius as fractions of R) with ragged edges.
const PH_LAND = [[0, -.86, .44], [.6, .22, .3], [-.62, .3, .28], [.12, .64, .22], [-.3, -.22, .16], [.52, -.46, .18]];
function phEarthCells(p, R, cell) {
  for (let i = 0, x = -R; x < R; i++, x += cell) for (let j = 0, y = -R; y < R; j++, y += cell) {
    const cx = x + cell / 2, cy = y + cell / 2, h = phHash(i, j);
    if (Math.hypot(cx, cy) > R + cell) continue;
    let fill = null;
    if (Math.hypot(cx, cy) < R * (.15 + .07 * h)) fill = h > .5 ? '#f4f6f7' : '#dfeaf0';
    else if (PH_LAND.some(([bx, by, br]) => Math.hypot(cx - bx * R, cy - by * R) < br * R * (.8 + .4 * h))) fill = h > .8 ? lt(PH.leaf, .15) : h < .2 ? '#a9a061' : PH.leaf;
    else if (h > .9) fill = lt(PH.ocean, .1);
    if (fill) mk('rect', { x, y, width: cell + .4, height: cell + .4, fill }, p);
  }
}
const phThin = (e, w) => { e.setAttribute('vector-effect', 'non-scaling-stroke'); e.setAttribute('stroke-width', w); return e; };
// Small Earth seen from the side (for orbits).
function phEarthSmall(p, { x = 0, y = 0, r = 26 } = {}) {
  const g = G(p, { x, y }), id = 'phe' + (++phN);
  mk('circle', { r }, mk('clipPath', { id }, mk('defs', {}, g)));
  mk('circle', { r, fill: PH.ocean }, g);
  const c = G(g); c.setAttribute('clip-path', `url(#${id})`);
  [[-.6, -.5, .5, .4], [.1, .15, .55, .45], [-.4, .3, .3, .25]].forEach(([lx, ly, w, h]) => mk('rect', { x: lx * r, y: ly * r, width: w * r, height: h * r, fill: PH.leaf }, c));
  mk('circle', { cx: r * .3, cy: r * .3, r: r * 1.1, fill: 'none', stroke: '#000', 'stroke-width': r * .5, opacity: .18 }, c);
  mk('circle', { r, fill: 'none', ...phLine(2) }, g);
  return g;
}
// Earth seen from far above the North Pole: the rim is the equator. Rotate g._spin (degrees; negative = counterclockwise
// on screen). Outlines keep their screen width at any camera zoom.
function phEarthPolar(p, { x = 0, y = 0, R = 220, cell = R / 14 } = {}) {
  const g = G(p, { x, y }), id = 'phE' + (++phN);
  mk('circle', { r: R }, mk('clipPath', { id }, mk('defs', {}, g)));
  mk('circle', { r: R * 1.04, fill: 'none', stroke: '#86c9e8', 'stroke-width': R * .08, opacity: .25 }, g);
  const spin = G(g);
  mk('circle', { r: R, fill: PH.ocean }, spin);
  const c = G(spin); c.setAttribute('clip-path', `url(#${id})`);
  phEarthCells(c, R, cell);
  path(spin, Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `M0 0L${(Math.cos(a) * R).toFixed(1)} ${(Math.sin(a) * R).toFixed(1)}`; }).join(''), { stroke: '#dfeef5', opacity: .3 })
    .setAttribute('vector-effect', 'non-scaling-stroke');
  [.33, .66].forEach(k => phThin(mk('circle', { r: R * k, fill: 'none', stroke: '#dfeef5', opacity: .3 }, spin), 1.5));
  const shade = G(g); shade.setAttribute('clip-path', `url(#${id})`);
  mk('circle', { r: R, fill: 'none', stroke: '#0e1714', 'stroke-width': R * .14, opacity: .28 }, shade);
  phThin(mk('circle', { r: R, fill: 'none', stroke: PH.out }, g), 3);
  g._spin = spin;
  return g;
}
