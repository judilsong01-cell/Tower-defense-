import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Third take on the stage maps, after Arknights: square tiles seen through a perspective camera, worn concrete
// and asphalt instead of flat colours, raised deployment platforms, a red cube where enemies enter and a blue
// one on the point to defend. Study build: only the surfaces needed for the sample stages.

export const H_HIGH = 0.5;      // platform height in tiles
const SLAB = 0.07;              // walkable slabs sit a little above the surrounding ground

let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
export function hash(x, y, k = 0) {
  let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function shade(hex, f) {
  const c = new THREE.Color(hex);
  if (f >= 0) c.lerp(new THREE.Color('#ffffff'), f); else c.lerp(new THREE.Color('#000000'), -f);
  return '#' + c.getHexString();
}

// ---- textures ----------------------------------------------------------------
function canvas(S) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  return [cv, cv.getContext('2d')];
}
/** Draws `draw(g)` on a layer and stamps it blurred, tiled 3x3 so it wraps. */
function blurred(g, S, px, draw, alpha = 1) {
  const [c, cg] = canvas(S);
  for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { cg.save(); cg.translate(ox, oy); draw(cg); cg.restore(); }
  g.save();
  g.globalAlpha = alpha;
  g.filter = `blur(${px}px)`;
  for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) g.drawImage(c, ox, oy);
  g.restore();
}
/** Fine per-pixel grain, the "tooth" of concrete. */
function grit(g, S, amount) {
  const img = g.getImageData(0, 0, S, S);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
}
/** Stains, scuffs and hairline cracks. */
function wear(g, S, strength = 1) {
  const blots = Array.from({ length: 10 }, () => [rnd() * S, rnd() * S, S * (0.08 + rnd() * 0.22), rnd() < 0.6]);
  blurred(g, S, S * 0.05, (c) => {
    for (const [x, y, r, dark] of blots) {
      c.fillStyle = dark ? `rgba(0,0,0,${0.16 * strength})` : `rgba(255,255,255,${0.09 * strength})`;
      c.beginPath();
      c.ellipse(x, y, r, r * (0.4 + rnd() * 0.5), rnd() * 3, 0, 7);
      c.fill();
    }
  });
  const cracks = Array.from({ length: 3 }, () => {
    let x = rnd() * S, y = rnd() * S, a = rnd() * 6.28;
    const pts = [[x, y]];
    for (let k = 0; k < 6; k++) { a += rnd() * 1.2 - 0.6; x += Math.cos(a) * S * 0.07; y += Math.sin(a) * S * 0.07; pts.push([x, y]); }
    return pts;
  });
  blurred(g, S, 0.7, (c) => {
    c.strokeStyle = `rgba(0,0,0,${0.3 * strength})`;
    c.lineWidth = 1.6;
    for (const pts of cracks) { c.beginPath(); c.moveTo(...pts[0]); for (const p of pts.slice(1)) c.lineTo(...p); c.stroke(); }
  });
}
const texCache = new Map();
function tex(kind, base, variant = 0, accent = '#e2b23c') {
  const key = kind + base + variant + accent;
  if (texCache.has(key)) return texCache.get(key);
  seed = 101 + variant * 7919 + kind.length * 31;
  const S = kind === 'asphalt' ? 1024 : 512;
  const [cv, g] = canvas(S);
  g.fillStyle = base;
  g.fillRect(0, 0, S, S);
  const frame = (inset, w, style) => { g.strokeStyle = style; g.lineWidth = w; g.strokeRect(inset, inset, S - inset * 2, S - inset * 2); };
  if (kind === 'asphalt') {
    wear(g, S, 1.0);
    wear(g, S, 0.6);
    // expansion joints of large slabs, and worn paint
    g.strokeStyle = 'rgba(0,0,0,0.45)';
    g.lineWidth = 4;
    for (const k of [0, S / 2]) { g.beginPath(); g.moveTo(k + 2, 0); g.lineTo(k + 2, S); g.moveTo(0, k + 2); g.lineTo(S, k + 2); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,0.05)';
    g.lineWidth = 2;
    for (const k of [0, S / 2]) { g.beginPath(); g.moveTo(k + 6, 0); g.lineTo(k + 6, S); g.moveTo(0, k + 6); g.lineTo(S, k + 6); g.stroke(); }
    g.fillStyle = 'rgba(226,178,60,0.16)';
    for (let i = 0; i < 6; i++) g.fillRect(S * 0.56 + i * 34, S * 0.2, 18, 70);
    g.fillStyle = 'rgba(255,255,255,0.1)';
    g.fillRect(S * 0.08, S * 0.72, S * 0.3, 8);
    g.fillRect(S * 0.08, S * 0.72, 8, S * 0.16);
    grit(g, S, 24);
  } else if (kind === 'ground') {
    // concrete paving slab: dark joint, worn lighter edge
    wear(g, S, 0.5);
    grit(g, S, 18);
    frame(5, 10, 'rgba(0,0,0,0.5)');
    frame(14, 3, 'rgba(255,255,255,0.1)');
  } else if (kind === 'high') {
    // deployment platform: lighter deck with an inset border and corner marks
    wear(g, S, 0.35);
    grit(g, S, 14);
    frame(6, 12, 'rgba(0,0,0,0.42)');
    frame(40, 5, 'rgba(0,0,0,0.2)');
    frame(46, 2, 'rgba(255,255,255,0.14)');
    g.strokeStyle = accent;
    g.globalAlpha = 0.85;
    g.lineWidth = 9;
    const m = 40, c = 60;
    for (const [x, y, dx, dy] of [[m, m, 1, 1], [S - m, m, -1, 1], [m, S - m, 1, -1], [S - m, S - m, -1, -1]]) {
      g.beginPath(); g.moveTo(x, y + dy * c); g.lineTo(x, y); g.lineTo(x + dx * c, y); g.stroke();
    }
    g.globalAlpha = 1;
  } else if (kind === 'locked') {
    // no-deploy lane: hazard chevrons, scuffed
    g.save();
    g.beginPath(); g.rect(34, 34, S - 68, S - 68); g.clip();
    g.fillStyle = '#26282c';
    g.fillRect(0, 0, S, S);
    g.fillStyle = accent;
    for (let i = -S; i < S * 2; i += 96) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 46, 0); g.lineTo(i + 46 - S, S); g.lineTo(i - S, S); g.fill(); }
    g.restore();
    wear(g, S, 1.6);
    grit(g, S, 22);
    frame(5, 10, 'rgba(0,0,0,0.5)');
  } else if (kind === 'side') {
    // platform wall: lip at the top, a groove, darker towards the ground
    const gr = g.createLinearGradient(0, 0, 0, S);
    gr.addColorStop(0, shade(base, 0.16));
    gr.addColorStop(0.1, shade(base, 0.04));
    gr.addColorStop(1, shade(base, -0.42));
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);
    wear(g, S, 1);
    grit(g, S, 16);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(0, S * 0.2, S, 8);
    g.fillStyle = 'rgba(255,255,255,0.1)';
    g.fillRect(0, S * 0.2 + 8, S, 3);
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.fillRect(0, 0, 4, S);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  texCache.set(key, t);
  return t;
}

const matCache = new Map();
function lit(map, rough = 0.9) {
  if (!matCache.has(map.uuid)) matCache.set(map.uuid, new THREE.MeshStandardMaterial({ map, roughness: rough, metalness: 0.02 }));
  return matCache.get(map.uuid);
}
const glow = (color, opacity = 1) => {
  const m = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1, side: THREE.DoubleSide });
  m.userData.glow = true;
  return m;
};

// ---- contact shading ------------------------------------------------------------
function stripTex() {
  const cv = document.createElement('canvas');
  cv.width = 4; cv.height = 64;
  const g = cv.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, 'rgba(4,5,10,0.6)');
  gr.addColorStop(0.35, 'rgba(4,5,10,0.22)');
  gr.addColorStop(1, 'rgba(4,5,10,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 4, 64);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const aoMat = new THREE.MeshBasicMaterial({ map: stripTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });

// ---- palettes -------------------------------------------------------------------------
export const STYLES = {
  city: { bg: '#0c0e13', asphalt: '#30333a', ground: '#74787f', high: '#b1b2ae', side: '#85878a', accent: '#e2b23c', sky: [0xcfd8ff, 0x2a2622], sun: 0xffe6c8 },
  sea: { bg: '#0a1820', asphalt: '#1f5f7c', ground: '#c9b98e', high: '#a9b0a0', side: '#857e68', accent: '#f2f2ea', sky: [0xe6f4ff, 0x2a4a5a], sun: 0xfff0d8 },
};

// ---- scene ----------------------------------------------------------------------------------
/** Builds the stage. zScale stretches rows (used by the straight-on orthographic variant). */
export function buildArk(level, zScale = 1) {
  const P = STYLES[level.biome] ?? STYLES.city;
  const map = level.map;
  const W = map[0].length, H = map.length;
  const root = new THREE.Group();
  const ch = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? map[y][x] : '#');
  const isHigh = (c) => c === 'H' || c === 'h';
  const walk = (c) => c !== '#' && c !== 'A';
  const topOf = (x, y) => { const c = ch(x, y); return !walk(c) ? 0 : isHigh(c) ? H_HIGH : SLAB; };

  // surrounding ground
  const at = tex('asphalt', P.asphalt);
  at.wrapS = at.wrapT = THREE.RepeatWrapping;
  at.repeat.set((W + 60) / 6, (H + 60) / 6);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W + 60, H + 60), lit(at, 0.95));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(W / 2, 0, H / 2);
  floor.receiveShadow = true;
  root.add(floor);

  const ao = { pos: [], uv: [], idx: [] };
  const strip = (a, b, d) => {
    const i = ao.pos.length / 3;
    ao.pos.push(...a, ...b, b[0] + d[0], b[1], b[2] + d[2], a[0] + d[0], a[1], a[2] + d[2]);
    ao.uv.push(0, 1, 1, 1, 1, 0, 0, 0);
    ao.idx.push(i, i + 2, i + 1, i, i + 3, i + 2, i, i + 1, i + 2, i, i + 2, i + 3);
  };

  for (let y = -1; y <= H; y++) {
    for (let x = -1; x <= W; x++) {
      const c = ch(x, y);
      const top = topOf(x, y);
      // contact shadow on this cell along every taller neighbour
      const t = top + 0.004, w = 0.45;
      const hi = (v) => v > top + 0.2;
      if (hi(topOf(x, y - 1))) strip([x, t, y], [x + 1, t, y], [0, 0, w]);
      if (hi(topOf(x, y + 1))) strip([x + 1, t, y + 1], [x, t, y + 1], [0, 0, -w]);
      if (hi(topOf(x - 1, y))) strip([x, t, y + 1], [x, t, y], [w, 0, 0]);
      if (hi(topOf(x + 1, y))) strip([x + 1, t, y], [x + 1, t, y + 1], [-w, 0, 0]);
      if (!walk(c)) continue;
      const v = Math.floor(hash(x, y) * 4);
      let topMat;
      if (isHigh(c)) topMat = lit(tex('high', P.high, v, P.accent));
      else if (c === ',') topMat = lit(tex('locked', P.ground, v % 2, P.accent));
      else topMat = lit(tex('ground', shade(P.ground, (hash(x, y, 2) - 0.5) * 0.08), v));
      const sideMat = lit(tex('side', isHigh(c) ? P.side : shade(P.side, -0.25)));
      const h = top + 0.5;
      const geo = new RoundedBoxGeometry(1, h, 1, 2, isHigh(c) ? 0.03 : 0.014);
      const m = new THREE.Mesh(geo, [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]);
      m.position.set(x + 0.5, top - h / 2, y + 0.5);
      m.castShadow = true;
      m.receiveShadow = true;
      root.add(m);
      if (c === 'S') marker(root, x + 0.5, top, y + 0.5, '#ff3b3b', 'in');
      if (c === 'B') marker(root, x + 0.5, top, y + 0.5, '#3ba0ff', 'base');
      if (c === 'h') crate(root, x + 0.5, top, y + 0.5, hash(x, y, 5));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(ao.pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(ao.uv, 2));
  g.setIndex(ao.idx);
  const aoMesh = new THREE.Mesh(g, aoMat);
  aoMesh.renderOrder = 1;
  root.add(aoMesh);
  root.scale.z = zScale;
  // bounding box of the playable tiles: the camera frames this, not the empty border rows
  const b = { x0: W, x1: 0, y0: H, y1: 0 };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (walk(ch(x, y))) { b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x + 1); b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y + 1); }
  return { root, W, H, P, topOf, bounds: b };
}

/** Arknights-style point marker: a glowing wire cube with translucent faces and a symbol inside. */
function marker(root, x, y, z, color, kind) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  root.add(g);
  const s = 0.74, hgt = 0.86, t = 0.022;
  const bar = (w, h, d, px, py, pz) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glow(color));
    m.position.set(px, py, pz);
    g.add(m);
  };
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bar(t, hgt, t, (sx * s) / 2, hgt / 2 + 0.02, (sz * s) / 2);
  for (const py of [0.02, hgt + 0.02]) {
    for (const sz of [-1, 1]) bar(s, t, t, 0, py, (sz * s) / 2);
    for (const sx of [-1, 1]) bar(t, t, s, (sx * s) / 2, py, 0);
  }
  const faces = new THREE.Mesh(new THREE.BoxGeometry(s, hgt, s), glow(color, 0.13));
  faces.position.y = hgt / 2 + 0.02;
  g.add(faces);
  // floor glow
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), glow(color, 0.3));
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.012;
  g.add(pad);
  // symbol on a plane facing the camera side (+z), tilted back a little
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  c.strokeStyle = c.fillStyle = '#ffffff';
  c.lineWidth = 12;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  if (kind === 'in') {
    // downward chevrons: enemies come out here
    for (const oy of [26, 62]) { c.beginPath(); c.moveTo(32, oy); c.lineTo(64, oy + 30); c.lineTo(96, oy); c.stroke(); }
  } else {
    // shield: the point to defend
    c.beginPath();
    c.moveTo(64, 16); c.lineTo(104, 30); c.lineTo(100, 74); c.quadraticCurveTo(88, 104, 64, 114); c.quadraticCurveTo(40, 104, 28, 74); c.lineTo(24, 30); c.closePath();
    c.stroke();
  }
  const tx = new THREE.CanvasTexture(cv);
  tx.colorSpace = THREE.SRGBColorSpace;
  const sym = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, color }));
  sym.material.userData.glow = true;
  sym.position.set(0, hgt / 2 + 0.03, 0.0);
  sym.rotation.x = -0.5;
  sym.renderOrder = 3;
  g.add(sym);
}

/** Blocked platform: supply crates, so it reads as "nothing stands here". */
function crate(root, x, y, z, r) {
  const add = (w, h, d, px, pz, col, ry) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.02), new THREE.MeshStandardMaterial({ color: col, roughness: 0.85 }));
    m.position.set(x + px, y + h / 2, z + pz);
    m.rotation.y = ry;
    m.castShadow = m.receiveShadow = true;
    root.add(m);
  };
  add(0.5, 0.36, 0.42, -0.12, 0.05, '#5e6a58', r * 0.6 - 0.3);
  add(0.3, 0.26, 0.3, 0.26, -0.16, '#8a7350', r * 1.2);
}
