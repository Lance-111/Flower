// ---------- Procedural ASCII lily bouquet (canvas, glyph-bitmap renderer) ----------
const COLS = 150, ROWS = 122, CW = 4, CH = 7;
const PW = COLS * CW, PH = ROWS * CH;
const RH = CH / CW;            // one text row = RH "square" units
const S = COLS / 76;           // layout was drawn on a 76-column grid
const K = S / 0.79;            // size factor for stems, leaves, ribbon
const KS = K / 1.87;           // stem/line thickness factor
const BX = 38 * S, BY = 106 * S;
const RAMP = ' .:-=+*#%@';

const N = COLS * ROWS;
const buf = { ch: new Array(N).fill(' '), r: new Uint8ClampedArray(N), g: new Uint8ClampedArray(N), b: new Uint8ClampedArray(N) };
const keep = new Uint8Array(N);   // 1 = stem cell, never darkened by shadows
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const fract = (x) => x - Math.floor(x);
const hash = (a, b, c = 0) => fract(Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453);
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function put(col, row, ch, r, g, b) {
  col = Math.floor(col); row = Math.floor(row);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
  const i = row * COLS + col;
  buf.ch[i] = ch; buf.r[i] = r; buf.g[i] = g; buf.b[i] = b; keep[i] = 0;
}

function dim(col, row, k) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
  const i = row * COLS + col;
  if (buf.ch[i] === ' ' || keep[i]) return;
  buf.r[i] *= k; buf.g[i] *= k; buf.b[i] *= k;
}

// soft disc of one glyph (stems, leaves, buds, ribbon)
function stamp(x, y, rad, ch, c, solid) {
  const r2 = rad * rad;
  for (let row = Math.floor((y - rad) / RH); row <= Math.ceil((y + rad) / RH); row++)
    for (let col = Math.floor(x - rad); col <= Math.ceil(x + rad); col++) {
      const dx = col + 0.5 - x, dy = (row + 0.5) * RH - y, d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      const k = 0.85 + 0.25 * hash(col, row) - 0.3 * d2 / r2;
      put(col, row, ch, c[0] * k, c[1] * k, c[2] * k);
      if (solid && col >= 0 && col < COLS && row >= 0 && row < ROWS) keep[row * COLS + col] = 1;
    }
}

const PAL = {
  red:     { base: [205, 25, 35],   tip: [255, 95, 85],   throat: [110, 8, 18],   spot: [70, 0, 10],   stam: [255, 200, 120] },
  cream:   { base: [225, 205, 175], tip: [255, 248, 235], throat: [190, 150, 70], spot: [130, 90, 50], stam: [255, 220, 140] },
  white:   { base: [215, 215, 205], tip: [255, 255, 250], throat: [170, 190, 100], spot: [120, 110, 80], stam: [255, 225, 130] },
  yellow:  { base: [235, 185, 30],  tip: [255, 230, 100], throat: [205, 110, 15], spot: [150, 70, 10], stam: [255, 240, 170] },
  orchid:  { base: [200, 60, 180],  tip: [240, 140, 230], throat: [100, 15, 90],  spot: [70, 5, 60],   stam: [255, 215, 150] },
  magenta: { base: [185, 45, 105],  tip: [235, 110, 170], throat: [95, 10, 50],   spot: [60, 0, 30],   stam: [255, 200, 140] },
  peach:   { base: [230, 165, 125], tip: [255, 220, 190], throat: [170, 80, 40],  spot: [120, 50, 25], stam: [255, 230, 160] },
  wine:    { base: [140, 18, 30],   tip: [200, 55, 55],   throat: [60, 5, 10],    spot: [40, 0, 5],    stam: [240, 170, 110] },
};

// [palette, x, y, petal length, rotation, tilt, squash] — drawn back to front
const FLOWERS = [
  ['yellow', 13, 52, 14, .0, -.5, .8],
  ['wine', 65, 76, 12, .3, .6, .75],
  ['peach', 38, 15, 14, .2, .4, .85],
  ['white', 19, 32, 15, .5, -.3, .88],
  ['yellow', 58, 30, 15, .1, .3, .85],
  ['red', 39, 45, 18, .35, .15, .95],
  ['magenta', 60, 58, 15, .6, .4, .88],
  ['orchid', 22, 64, 17, .15, -.25, .92],
  ['cream', 50, 77, 16, .45, .3, .9],
  ['peach', 30, 84, 16, .05, .1, .92],
].map(([p, x, y, L, rot, tilt, sq], i) => ({
  ...PAL[p], x: x * S, y: y * S, L0: L * S * 0.95, rot, tilt, sq, i,
  W: 0.5 + hash(i, 3) * 0.06,
  ws: 0.6 + hash(i, 4) * 0.5, sw: 0.5 + hash(i, 5) * 0.7, ph: hash(i, 6) * 6.28,
}));

// unopened buds: [base x, base y, angle from vertical, length, width]
const BUDS = [[27, 18, -.7, 12, 2.6], [50, 19, .65, 11, 2.4], [66, 40, .9, 9, 2.1]]
  .map(([x, y, th, len, w], i) => ({ x: x * S, y: y * S, th, len: len * S, w: w * K * 0.8, ph: i * 2 }));

// baby's-breath sprigs: target points
const SPRIGS = [[6, 28], [70, 34], [5, 74], [72, 54], [30, 4], [47, 3], [10, 12], [66, 14]]
  .map(([x, y], i) => ({ x: x * S, y: y * S, i }));

const LEAVES = Array.from({ length: 10 }, (_, i) => {
  const side = i % 2 ? 1 : -1, m = Math.floor(i / 2) / 4;
  return {
    ang: side * (0.15 + m * 0.95 + hash(i, 1) * 0.12),
    len: (17 + (1 - m * 0.4) * 9) * S * (0.75 + hash(i, 2) * 0.5),
    w: 0.7 + hash(i, 3) * 0.7, ph: hash(i, 4) * 6.28, ws: 0.5 + hash(i, 5) * 0.5,
    off: side * hash(i, 6) * 2, curve: side * (0.3 + hash(i, 7) * 0.5),
  };
});

function paintLeaf(l, t) {
  let x = BX + l.off, y = BY;
  const n = Math.ceil(l.len * 1.6), step = l.len / n;
  for (let j = 0; j <= n; j++) {
    const u = j / n;
    const th = l.ang + l.curve * u * u + 0.07 * Math.sin(t * l.ws + l.ph) * u;
    x += Math.sin(th) * step; y -= Math.cos(th) * step;
    const rad = (0.9 + l.w * Math.sin(Math.PI * Math.pow(u, 0.75))) * K * 0.75;
    const ch = Math.abs(th) < 0.4 ? '|' : th > 0 ? '/' : '\\';
    stamp(x, y, rad, ch, mix([45, 140, 55], [150, 240, 110], clamp(u * 0.9 + hash(j, l.ph) * 0.1, 0, 1)));
    if (j % 2 === 0 && u > 0.05 && u < 0.95) put(x, y / RH, ch, 190, 250, 150);   // pale midrib
  }
}

function stemPt(x, y, u, t, ph, anim = true) {
  const p2x = BX + (x - BX) * 0.1, p2y = BY - 1;
  const p1x = (x + BX) / 2 + (x - BX) * 0.15 + (anim ? Math.sin(t * 0.7 + ph) * 2.5 * K : 0);
  const p1y = y + (BY - y) * 0.5;
  const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
  // slow wave travelling up the stem; base pinned, top follows the flower
  const wave = anim ? Math.sin(u * 5 - t * 1.2 + ph) * 1.1 * K * Math.sin(Math.PI * u) * (1 - u * 0.4) : 0;
  return [a * x + b * p1x + c * p2x + wave, a * y + b * p1y + c * p2y];
}

function stemLean(x, y, t, ph, anim) {
  const a = stemPt(x, y, 0, t, ph, anim), b = stemPt(x, y, 0.1, t, ph, anim);
  return Math.atan2(a[0] - b[0], b[1] - a[1]);          // angle of the stem's top from vertical
}

function paintStemTo(x, y, w, t, ph) {
  for (let j = 0; j <= 240; j++) {
    const p = stemPt(x, y, j / 240, t, ph);
    stamp(p[0], p[1], w, '|', [100, 245, 120], true);
  }
}

function paintSprig(sp, t) {
  const sway = Math.sin(t * 0.8 + sp.i) * 0.8;
  const x0 = BX, y0 = BY - 14 * S, x1 = sp.x + sway, y1 = sp.y;
  const cx = (x0 + x1) / 2 + (x1 - x0) * 0.1, cy = (y0 + y1) / 2 + 6;
  for (let j = 0; j <= 140; j++) {
    const u = j / 140, a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
    const x = a * x0 + b * cx + c * x1, y = a * y0 + b * cy + c * y1;
    if (j % 2) put(x, y / RH, '.', 100, 150, 100);
    if (u > 0.7 && j % 7 === 0) {
      for (let m = 0; m < 2; m++) {
        const h = hash(j, sp.i, m), dx = (h - 0.5) * 5 * K, dy = (hash(m, j, sp.i) - 0.5) * 4 * K;
        const twinkle = hash(j, m, Math.floor(t * 1.5 + sp.i)) > 0.8;
        put(x + dx, (y + dy) / RH, twinkle ? '*' : 'o', 235, 225, 255);
      }
    }
  }
}

function paintBud(b, t) {
  const n = 80, sway = 0.05 * Math.sin(t * 0.8 + b.ph);
  paintStemTo(b.x, b.y, 1.1 * KS, t, b.ph);
  for (let j = 0; j <= n; j++) {
    const u = j / n, th = b.th + sway * u;
    const x = b.x + Math.sin(th) * b.len * u, y = b.y - Math.cos(th) * b.len * u;
    const rad = 0.8 + b.w * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.75)), 0.9);
    const col = u < 0.2 ? [90, 170, 80] : mix([190, 60, 130], [255, 175, 215], u);
    stamp(x, y, rad, u < 0.2 ? ':' : (u > 0.6 ? '%' : '#'), col);
    if (u > 0.25 && Math.abs(Math.sin(u * 40)) < 0.15) put(x, y / RH, '|', 255, 200, 230);   // bud seams
  }
}

function paintRibbon() {
  const pink = [235, 90, 150], y0 = 99 * S, y1 = 103 * S;
  for (let row = Math.floor(y0 / RH); row <= Math.floor(y1 / RH); row++)
    for (let col = Math.floor(BX - 5 * K); col <= Math.floor(BX + 5 * K); col++) put(col, row, row % 2 ? '=' : '#', ...pink);
  stamp(BX - 2 * K, y1 + 3 * K, 1.2 * KS, '/', pink); stamp(BX - 4 * K, y1 + 7 * K, 1.2 * KS, '/', pink);
  stamp(BX + 2 * K, y1 + 3 * K, 1.2 * KS, '\\', pink); stamp(BX + 4 * K, y1 + 7 * K, 1.2 * KS, '\\', pink);
  for (const side of [-1, 1]) {
    const cx = BX + side * 6 * K, cy = (y0 + y1) / 2, R = 3.2 * K;
    for (let row = Math.floor((cy - R - 2) / RH); row <= Math.ceil((cy + R + 2) / RH); row++)
      for (let col = Math.floor(cx - R - 2); col <= Math.ceil(cx + R + 2); col++) {
        const d = Math.hypot(col + 0.5 - cx, (row + 0.5) * RH - cy);
        if (Math.abs(d - R) < 1.3) put(col, row, 'o', 255, 130, 180);
      }
  }
}

function paintFlower(f, t) {
  const { cx, cy, L, rot } = f;
  const ca = Math.cos(f.tilt), sa = Math.sin(f.tilt), P = Math.PI / 3;
  const R2 = L * 1.1;
  const c0 = Math.max(0, Math.floor(cx - R2)), c1 = Math.min(COLS - 1, Math.ceil(cx + R2));
  const r0 = Math.max(0, Math.floor((cy - R2) / RH)), r1 = Math.min(ROWS - 1, Math.ceil((cy + R2) / RH));

  // line glyph that follows each petal's direction on screen
  const axisCh = [];
  for (let kk = -3; kk <= 3; kk++) {
    const a = rot + kk * P;
    const wx = Math.cos(a) * ca - Math.sin(a) * f.sq * sa, wy = Math.cos(a) * sa + Math.sin(a) * f.sq * ca;
    let m = Math.atan2(wy, wx); m = ((m % Math.PI) + Math.PI) % Math.PI;
    axisCh.push(m < 0.39 || m > 2.75 ? '-' : m < 1.18 ? '\\' : m < 1.96 ? '|' : '/');
  }

  for (let row = r0; row <= r1; row++) {
    const y = (row + 0.5) * RH;
    for (let col = c0; col <= c1; col++) {
      const dx = col + 0.5 - cx, dy = y - cy;
      const u = dx * ca + dy * sa, v = (-dx * sa + dy * ca) / f.sq;
      const r = Math.hypot(u, v);
      if (r > R2) continue;
      const ang = Math.atan2(v, u) - rot, k = Math.round(ang / P);
      const d = ang - k * P + 0.07 * Math.sin(t * 1.4 + k * 1.9 + f.ph) * clamp(r / L, 0, 1);   // petal tips ripple
      const tt = r * Math.cos(d) / L, perp = Math.abs(r * Math.sin(d));
      const inner = k & 1;                                  // lilies: 3 outer tepals + 3 wider, wavier inner ones
      let q = 0; const throat = r < L * 0.11;
      if (r > L) { dim(col, row, 0.62); continue; }                                                  // soft shadow
      if (!throat) {
        if (tt <= 0 || tt >= 1) { dim(col, row, 0.7); continue; }
        const ruffle = 1 + (inner ? 0.14 : 0.07) * Math.sin(tt * (inner ? 22 : 14) + k * 2.3 + f.ph) * smooth(0.3, 0.9, tt);
        const hw = f.W * L * (inner ? 1.15 : 0.88) * Math.pow(tt, 0.55) * Math.pow(1 - tt, inner ? 0.7 : 0.9) * ruffle;
        if (perp >= hw) { dim(col, row, 0.7); continue; }
        q = perp / hw;
      }
      let c = tt < 0.4 ? mix(f.throat, f.base, smooth(0.03, 0.4, tt)) : mix(f.base, f.tip, smooth(0.5, 1, tt) * 0.85);
      if (tt < 0.3 && q < 0.6) c = mix(c, [150, 185, 70], (1 - tt / 0.3) * 0.7 * (1 - q / 0.6));   // green throat star
      if (tt < 0.5 && q < 0.1) c = mix(c, [170, 200, 80], 0.5 * (1 - tt / 0.5));                      // nectar groove
      if (tt > 0.78 && q < 0.7) c = mix(c, [255, 255, 255], 0.18);                                   // recurved, paler tips
      let sh = 0.78 + (inner ? 0.1 : -0.08) - 0.1 * tt + 0.12 * (d > 0 ? 1 : -1) * q;               // petal twist
      sh -= 0.2 * (1 - smooth(0, 0.28, tt));                                                         // darker toward the throat
      let ch = null;
      const line = axisCh[clamp(k + 3, 0, 6)];
      if (q < 0.1) { sh += 0.14; ch = line; }                                                        // midrib
      else if (Math.abs(q - 0.26) < 0.022 || Math.abs(q - 0.5) < 0.022 || Math.abs(q - 0.73) < 0.022) sh -= 0.15;   // veins
      if (q > 0.74) sh -= 0.5 * (q - 0.74) / 0.26;                                                   // petal edge
      else if (q > 0.62 && q < 0.7 && tt > 0.5) sh += 0.08;                                          // soft rim light
      if (tt > 0.1 && tt < 0.62 && q < 0.85 && hash(Math.floor(col / 1.6), Math.floor(row * 0.7), f.i) < 0.12 * (1 - tt)) {
        sh -= 0.3; c = mix(c, f.spot, 0.75); ch = ':';                                               // freckles
      } else if (tt < 0.38 && hash(col * 5, row * 3, f.i + 3) < 0.14 * (1 - tt / 0.38)) { sh += 0.18; ch = '.'; }   // papillae
      if (tt > 0.88) sh += 0.1;                                                                      // pale tip
      if (hash(col, row, Math.floor(t * 3 + f.ph)) > 0.992) sh += 0.3;                              // sparkle
      if (tt < 0.55 && hash(col * 3, row * 2, f.i + 7) < 0.03) { c = [255, 210, 70]; ch = '.'; sh = 0.95; }   // pollen
      if (throat) { c = [150, 185, 70]; sh = 0.7; }
      sh = clamp(sh, 0.12, 1);
      const kk = 0.7 + 0.7 * sh;
      put(col, row, ch || RAMP[clamp(Math.floor(sh * 5) + 4, 4, 9)], c[0] * kk, c[1] * kk, c[2] * kk);
    }
  }

  // stamens: arching filaments with rusty anthers + a longer pistil
  const n = Math.max(12, Math.round(L * 0.6));
  for (let i = 0; i < 6; i++) {
    const a = rot + i * P + 0.35 * Math.sin(i * 2.1) + 0.1 * Math.sin(t * 1.3 + i);
    const len = 0.62 * L * (0.8 + 0.2 * Math.sin(i));
    let x = 0, y = 0;
    for (let j = 0; j <= n; j++) {
      const w = j / n, s = 0.1 * L + (len - 0.1 * L) * w, uu = s * Math.cos(a), vv = s * Math.sin(a) * f.sq;
      x = cx + uu * ca - vv * sa; y = cy + uu * sa + vv * ca - 0.18 * L * w * w;
      if (j < n) put(x, y / RH, j % 2 ? '|' : '.', ...f.stam);
    }
    const ac = Math.floor(x), ar = Math.floor(y / RH);
    put(ac - 2, ar, '#', 140, 55, 22); put(ac - 1, ar, '@', 175, 70, 25); put(ac, ar, '@', 190, 80, 28);
    put(ac + 1, ar, '@', 175, 70, 25); put(ac + 2, ar, '#', 140, 55, 22);
    put(ac - 1, ar - 1, '#', 150, 60, 25); put(ac, ar - 1, '%', 170, 70, 25); put(ac + 1, ar - 1, '#', 150, 60, 25);
    for (let m = 0; m < 4; m++)   // drifting pollen
      if (hash(i, m, Math.floor(t * 2 + f.ph)) > 0.45)
        put(ac + Math.round((hash(m, i) - 0.5) * 8), ar - 2 + Math.round((hash(i, m + 5) - 0.5) * 3), '.', 255, 215, 70);
  }
  const pa = rot + 0.5 * P;
  for (let j = 0; j <= n; j++) {
    const s = 0.75 * L * j / n, uu = s * Math.cos(pa), vv = s * Math.sin(pa) * f.sq;
    put(cx + uu * ca - vv * sa, (cy + uu * sa + vv * ca - 0.1 * L * (j / n) ** 2) / RH, j < n ? '|' : 'Y', 235, 235, 150);
  }
}

function drawScene(t) {
  buf.ch.fill(' '); keep.fill(0);
  LEAVES.forEach((l) => paintLeaf(l, t));
  SPRIGS.forEach((sp) => paintSprig(sp, t));
  BUDS.forEach((b) => paintBud(b, t));
  FLOWERS.forEach((f) => {
    f.cx = f.x + Math.sin(t * 0.7 + f.ph) * f.sw * 1.5;           // same rhythm as the stem
    f.cy = f.y + Math.sin(t * 0.7 + f.ph + 1.2) * 0.5;
    f.lean = stemLean(f.cx, f.cy, t, f.ph, true) - stemLean(f.x, f.y, 0, f.ph, false);
    paintStemTo(f.cx, f.cy, 1.4 * KS, t, f.ph);
  });
  paintRibbon();
  FLOWERS.forEach((f) => {
    f.L = f.L0 * (1 + 0.025 * Math.sin(t * 0.9 + f.ph));
    paintFlower({ ...f, tilt: f.tilt + f.lean * 0.9, rot: f.rot + f.lean * 0.5 + 0.05 * Math.sin(t * 0.7 + f.ph) }, t);
  });
}

// ---- glyph bitmaps: each character is rasterised once, then blitted per cell ----
const masks = new Map();
let mctx = null;
function getMask(ch) {
  let m = masks.get(ch);
  if (m) return m;
  if (!mctx) {
    const c = document.createElement('canvas'); c.width = CW; c.height = CH;
    mctx = c.getContext('2d', { willReadFrequently: true });
    mctx.font = `${CH - 0.5}px "DejaVu Sans Mono", Menlo, Consolas, monospace`;
    mctx.textBaseline = 'top'; mctx.fillStyle = '#fff';
  }
  mctx.clearRect(0, 0, CW, CH);
  mctx.fillText(ch, 0, 0);
  const d = mctx.getImageData(0, 0, CW, CH).data;
  m = new Uint8Array(CW * CH);
  for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3];
  masks.set(ch, m);
  return m;
}

// ASCII hearts that float up from the bouquet
const A = (s) => s.raw[0].replace(/^\n/, '').replace(/\n$/, '');
const HEARTS = [
  '<3',
  A`
 _  _
( \/ )
 \  /
  \/`,
  A`
.-. .-.
(  V  )
 '. .'
   v`,
  '*',
];

function buildBouquet() {
  const cv = document.getElementById('flowers'), ctx = cv.getContext('2d');
  cv.width = PW; cv.height = PH;
  const img = ctx.createImageData(PW, PH), px = img.data;

  const render = (t) => {
    drawScene(t);
    px.fill(0);
    for (let i = 0; i < N; i++) {
      const ch = buf.ch[i];
      if (ch === ' ') continue;
      const m = getMask(ch), r = buf.r[i], g = buf.g[i], b = buf.b[i];
      const x0 = (i % COLS) * CW, y0 = ((i / COLS) | 0) * CH;
      for (let y = 0; y < CH; y++) {
        let o = ((y0 + y) * PW + x0) * 4;
        for (let x = 0; x < CW; x++, o += 4) {
          const a = m[y * CW + x];
          if (a) { px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = Math.min(255, a * 1.8); }
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  };

  const hearts = document.getElementById('hearts');
  for (let i = 0; i < 12; i++) {
    const art = HEARTS[i % HEARTS.length], s = document.createElement('span');
    s.className = 'heart';
    s.textContent = art;
    const big = art.includes('\n');
    s.style.cssText =
      `--x:${(Math.random() * 20 - 10).toFixed(1)}em;--s:${(big ? 0.5 + Math.random() * 0.3 : 0.8 + Math.random() * 0.5).toFixed(2)}em;` +
      `--t:${(9 + Math.random() * 6).toFixed(1)}s;--dl:${(-Math.random() * 14).toFixed(1)}s`;
    hearts.appendChild(s);
  }

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return render(0);
  let last = 0;
  const loop = (ms) => { requestAnimationFrame(loop); if (ms - last < 40) return; last = ms; render(ms / 1000); };
  requestAnimationFrame(loop);
}

function buildStars() {
  const sky = document.getElementById('stars');
  const glyphs = ['.', '.', '.', '·', '*', '+'];
  for (let i = 0; i < 150; i++) {
    const s = document.createElement('span');
    s.className = 'star';
    s.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 80 + '%';
    s.style.fontSize = (8 + Math.random() * 10).toFixed(0) + 'px';
    s.style.setProperty('--d', (2 + Math.random() * 4).toFixed(1) + 's');
    s.style.setProperty('--o', (-Math.random() * 6).toFixed(1) + 's');
    sky.appendChild(s);
  }
}

function shootingStars() {
  const el = document.getElementById('shoot');
  const fire = () => {
    el.style.setProperty('--x', (35 + Math.random() * 60) + 'vw');
    el.style.setProperty('--y', (5 + Math.random() * 30) + 'vh');
    el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
    setTimeout(fire, 7000 + Math.random() * 8000);
  };
  setTimeout(fire, 3000);
}

buildStars();
buildBouquet();
shootingStars();
