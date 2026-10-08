import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { part, G, group, mat } from './kit.js';

// ---- projection --------------------------------------------------------------
// Orthographic camera pitched PITCH below the horizon. World x = tile column, world
// z = row * D, so every tile's top face projects to an exact screen square and the
// rendered image lines up with the game's 32 px grid. Height y lifts a point up the
// screen by cos(PITCH) tiles per unit.
export const PITCH = (46 * Math.PI) / 180;
export const D = 1 / Math.sin(PITCH);
export const LIFT = Math.cos(PITCH);
export const H_HIGH = 0.45;              // high ground height (world units)
export const MARGIN = { l: 3, r: 3, t: 1.5, b: 3.5 }; // extra tiles rendered around the map

// ---- helpers ---------------------------------------------------------------
export function hash(x, y, k = 0) {
  let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const pick = (arr, r) => arr[Math.floor(r * arr.length) % arr.length];

function shade(hex, f) {
  const c = new THREE.Color(hex);
  if (f >= 0) c.lerp(new THREE.Color('#ffffff'), f); else c.lerp(new THREE.Color('#000000'), -f);
  return '#' + c.getHexString();
}

const texCache = new Map();
/** Procedural canvas texture for a tile top (seams, noise, stripes, planks…). */
function tex(kind, base, accent = '#000000') {
  const key = kind + base + accent;
  if (texCache.has(key)) return texCache.get(key);
  const S = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, S, S);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const speckle = (n, a, light) => {
    for (let i = 0; i < n; i++) {
      g.fillStyle = light ? `rgba(255,255,255,${a * rnd()})` : `rgba(0,0,0,${a * rnd()})`;
      const s = 2 + rnd() * 5;
      g.fillRect(rnd() * S, rnd() * S, s, s);
    }
  };
  if (kind === 'tile' || kind === 'pad') {
    speckle(60, 0.12, false);
    speckle(30, 0.12, true);
    g.strokeStyle = 'rgba(0,0,0,0.28)';
    g.lineWidth = 5;
    g.strokeRect(2.5, 2.5, S - 5, S - 5);
    g.strokeStyle = 'rgba(255,255,255,0.18)';
    g.lineWidth = 2;
    g.strokeRect(7, 7, S - 14, S - 14);
    if (kind === 'pad') {
      g.strokeStyle = accent;
      g.lineWidth = 6;
      const c = 30, m = 18;
      for (const [x, y, dx, dy] of [[m, m, 1, 1], [S - m, m, -1, 1], [m, S - m, 1, -1], [S - m, S - m, -1, -1]]) {
        g.beginPath();
        g.moveTo(x, y + dy * c);
        g.lineTo(x, y);
        g.lineTo(x + dx * c, y);
        g.stroke();
      }
    }
  } else if (kind === 'stripes') {
    speckle(40, 0.12, false);
    g.save();
    g.beginPath();
    g.rect(14, 14, S - 28, S - 28);
    g.clip();
    for (let i = -S; i < S * 2; i += 32) {
      g.fillStyle = accent;
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i + 16, 0);
      g.lineTo(i + 16 - S, S);
      g.lineTo(i - S, S);
      g.fill();
    }
    g.restore();
    g.strokeStyle = 'rgba(0,0,0,0.3)';
    g.lineWidth = 5;
    g.strokeRect(2.5, 2.5, S - 5, S - 5);
  } else if (kind === 'planks') {
    for (let i = 0; i < 4; i++) {
      g.fillStyle = shade(base, (i % 2 ? -0.08 : 0.04));
      g.fillRect(0, i * 32 + 2, S, 28);
      g.fillStyle = 'rgba(0,0,0,0.45)';
      g.fillRect(0, i * 32, S, 3);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(((i * 53) % 90) + 10, i * 32 + 6, 3, 22);
    }
    speckle(30, 0.1, false);
  } else if (kind === 'grate') {
    g.fillStyle = shade(base, -0.35);
    for (let i = 8; i < S; i += 16) g.fillRect(i, 0, 5, S);
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = 5;
    g.strokeRect(2.5, 2.5, S - 5, S - 5);
  } else if (kind === 'metal') {
    g.strokeStyle = 'rgba(0,0,0,0.3)';
    g.lineWidth = 4;
    g.strokeRect(2, 2, S - 4, S - 4);
    g.beginPath();
    g.moveTo(S / 2, 4);
    g.lineTo(S / 2, S - 4);
    g.stroke();
    g.fillStyle = 'rgba(0,0,0,0.35)';
    for (const [x, y] of [[12, 12], [S - 12, 12], [12, S - 12], [S - 12, S - 12]]) g.fillRect(x - 3, y - 3, 6, 6);
    g.fillStyle = accent;
    g.fillRect(S / 2 - 30, S / 2 - 2, 60, 4);
    speckle(20, 0.08, true);
  } else if (kind === 'noise') {
    speckle(120, 0.16, false);
    speckle(60, 0.12, true);
  } else if (kind === 'water') {
    speckle(30, 0.08, false);
    g.strokeStyle = 'rgba(255,255,255,0.25)';
    g.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const x = rnd() * S, y = rnd() * S;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + 10, y - 5, x + 22, y);
      g.stroke();
    }
  } else if (kind === 'stars') {
    g.fillStyle = base;
    g.fillRect(0, 0, S, S);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(220,235,255,${0.3 + rnd() * 0.7})`;
      const s = rnd() < 0.15 ? 3 : 1.5;
      g.fillRect(rnd() * S, rnd() * S, s, s);
    }
  } else if (kind === 'clouds') {
    for (let i = 0; i < 22; i++) {
      g.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.35})`;
      g.beginPath();
      g.arc(rnd() * S, rnd() * S, 10 + rnd() * 22, 0, Math.PI * 2);
      g.fill();
    }
  } else if (kind === 'lava') {
    g.fillStyle = 'rgba(40,10,6,0.55)';
    for (let i = 0; i < 9; i++) {
      g.beginPath();
      g.ellipse(rnd() * S, rnd() * S, 8 + rnd() * 18, 5 + rnd() * 10, rnd() * 3, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = '#ffb040';
    g.lineWidth = 2.5;
    for (let i = 0; i < 8; i++) {
      g.beginPath();
      const x = rnd() * S, y = rnd() * S;
      g.moveTo(x, y);
      g.lineTo(x + rnd() * 30 - 15, y + rnd() * 30 - 15);
      g.lineTo(x + rnd() * 50 - 25, y + rnd() * 50 - 25);
      g.stroke();
    }
  } else if (kind === 'cracks') {
    speckle(70, 0.14, false);
    g.strokeStyle = accent;
    g.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      let x = rnd() * S, y = rnd() * S;
      g.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        x += rnd() * 30 - 15;
        y += rnd() * 30 - 15;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    g.strokeStyle = 'rgba(0,0,0,0.28)';
    g.lineWidth = 5;
    g.strokeRect(2.5, 2.5, S - 5, S - 5);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  texCache.set(key, t);
  return t;
}

const gradient = (() => {
  const data = new Uint8Array([110, 185, 255]);
  const t = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();
const matCache = new Map();
function tmat(color, map = null, emissive = null) {
  const key = color + (map ? map.uuid : '') + (emissive ?? '');
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshToonMaterial({
      color, map, gradientMap: gradient,
      emissive: emissive ?? '#000000',
    }));
  }
  return matCache.get(key);
}
const glow = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });

// ---- biomes ------------------------------------------------------------------
// ground/high: top colour, side colour, top texture. wall: how blocked tiles look.
export const BIOMES = {
  city: {
    bg: '#16181e', ground: ['#a3a7ae', '#5d616b', 'tile'], high: ['#7f8592', '#4c515c'], accent: '#c8323a',
    locked: 'stripes', stripe: '#e0b43a', wall: 'solid', wallTop: '#3a3e47', props: 'city', sky: [0xdfe8ff, 0x3a3440],
  },
  forest: {
    bg: '#1d2a17', ground: ['#b88f5e', '#6f5233', 'tile'], high: ['#6fa047', '#5a4330'], accent: '#e8d36a',
    locked: 'planks', plank: '#9c7148', wall: 'solid', wallTop: '#4c7e33', props: 'forest', sky: [0xf2ffe0, 0x3a4030],
  },
  desert: {
    bg: '#3a2a1a', ground: ['#e6c792', '#b08a55', 'tile'], high: ['#cf9b5e', '#8f6236'], accent: '#7a3b1e',
    locked: 'stripes', stripe: '#b0532e', wall: 'solid', wallTop: '#c79458', props: 'desert', sky: [0xfff2d8, 0x5a4030],
  },
  ice: {
    bg: '#1a2a3a', ground: ['#eef3f9', '#9fb3c8', 'tile'], high: ['#b9def5', '#6f9fc2'], accent: '#3c7bb8',
    locked: 'planks', plank: '#8a7a6a', wall: 'liquid', liquid: '#4f87b5', liquidTex: 'water', floes: '#e6f2fb', props: 'ice', sky: [0xe8f4ff, 0x4a5a70],
  },
  lava: {
    bg: '#1c0f0c', ground: ['#5c5450', '#332d2b', 'cracks', '#ff6a1f'], high: ['#6e625c', '#3b3330'], accent: '#ff8a3a',
    locked: 'grate', plank: '#4a4442', wall: 'liquid', liquid: '#b8320c', liquidTex: 'lava', liquidGlow: true, props: 'lava', sky: [0xffd0b0, 0x40201a],
  },
  swamp: {
    bg: '#18201a', ground: ['#8b6c46', '#5a4430', 'planks'], high: ['#60803d', '#4a3a2a'], accent: '#c8e070',
    locked: 'planks', plank: '#6e5638', wall: 'liquid', liquid: '#3f5c43', liquidTex: 'water', props: 'swamp', sky: [0xe0f0d0, 0x2a3428],
  },
  sky: {
    bg: '#9fd0f5', ground: ['#d6cdb6', '#8d7d63', 'tile'], high: ['#84c25c', '#7a6248'], accent: '#ffffff',
    locked: 'planks', plank: '#a07a50', wall: 'void', void: 'clouds', voidColor: '#8ec6ef', props: 'sky', sky: [0xffffff, 0x8aa0b8],
  },
  sea: {
    bg: '#123a52', ground: ['#ecd7a0', '#b39360', 'tile'], high: ['#7fbf55', '#a88a5a'], accent: '#ffffff',
    locked: 'planks', plank: '#9a7650', wall: 'liquid', liquid: '#2b93c4', liquidTex: 'water', foam: true, props: 'sea', sky: [0xf0faff, 0x305070],
  },
  ruins: {
    bg: '#1a2420', ground: ['#aaa491', '#6e6858', 'cracks', 'rgba(60,80,40,0.6)'], high: ['#8e9c76', '#5f6450'], accent: '#d8c27a',
    locked: 'planks', plank: '#7e6a50', wall: 'liquid', liquid: '#3a7f86', liquidTex: 'water', props: 'ruins', sky: [0xeaf5e8, 0x30403a],
  },
  tech: {
    bg: '#070a16', ground: ['#8d97a6', '#4a5160', 'metal', '#5fe0ff'], high: ['#5f6a7c', '#363c48'], accent: '#5fe0ff',
    locked: 'grate', plank: '#6a7280', wall: 'void', void: 'stars', voidColor: '#0b1024', props: 'tech', sky: [0xd8ecff, 0x202838],
  },
  canyon: {
    bg: '#2a120c', ground: ['#d0814f', '#8d4a2a', 'tile'], high: ['#ad5d3a', '#6e3420'], accent: '#ffe0a0',
    locked: 'planks', plank: '#8a6040', wall: 'chasm', voidColor: '#2a110b', props: 'canyon', sky: [0xffe8d0, 0x5a2a1a],
  },
  cave: {
    bg: '#0d0c12', ground: ['#5f5c6b', '#36343e', 'tile'], high: ['#726d80', '#433f4c'], accent: '#7ef0ff',
    locked: 'grate', plank: '#4a4652', wall: 'solid', wallTop: '#2c2a33', props: 'cave', sky: [0xb8c0ff, 0x201c28],
  },
};

// ---- outlines (screen-space thick lines) ------------------------------------
let lineMat;
const segs = [];
function seg(a, b) { segs.push(...a, ...b); }

// ---- scene building -----------------------------------------------------------
export function buildMap(level) {
  const B = BIOMES[level.biome];
  const map = level.map;
  const W = map[0].length, H = map.length;
  const root = new THREE.Group();
  segs.length = 0;

  const ch = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? map[y][x] : 'O'); // O = outside
  const isWall = (c) => c === '#' || c === 'O';
  const isHigh = (c) => c === 'H' || c === 'h';
  const deep = B.wall === 'chasm' ? -6 : B.wall === 'void' ? (B.void === 'stars' ? -0.3 : -0.7) : -1.6;
  const topOf = (x, y) => {
    const c = ch(x, y);
    if (isWall(c) || c === 'A') return B.wall === 'solid' ? 0.04 : B.wall === 'liquid' ? -0.32 : -99;
    return isHigh(c) ? H_HIGH : 0;
  };
  /** How tall a prop on (x, y) may be without hiding playable tiles behind it. */
  const room = (x, y) => {
    let k = 0;
    while (k < 4 && isWall(ch(x, y - 1 - k)) ) k++;
    return Math.min(2.6, (k + 0.35) / LIFT);
  };

  const x0 = -MARGIN.l - 1, x1 = W + MARGIN.r + 1;
  const y0 = -Math.ceil(MARGIN.t) - 3, y1 = H + Math.ceil(MARGIN.b) + 1;

  // Liquid / void backdrops.
  if (B.wall === 'liquid') {
    const t = tex(B.liquidTex, B.liquid);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set((x1 - x0) / 1.5, ((y1 - y0) * D) / 1.5);
    const m = B.liquidGlow ? new THREE.MeshBasicMaterial({ color: '#ffffff', map: t }) : tmat('#ffffff', t);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, (y1 - y0) * D), m);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set((x0 + x1) / 2, -0.32, ((y0 + y1) / 2) * D);
    plane.receiveShadow = true;
    root.add(plane);
  } else if (B.wall === 'void' || B.wall === 'chasm') {
    const kind = B.wall === 'chasm' ? 'noise' : B.void;
    const t = tex(kind, B.voidColor);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set((x1 - x0) / 3, ((y1 - y0 + 12) * D) / 3);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 + 10, (y1 - y0 + 12) * D), new THREE.MeshBasicMaterial({ color: '#ffffff', map: t }));
    plane.rotation.x = -Math.PI / 2;
    plane.position.set((x0 + x1) / 2, deep - 1, ((y0 + y1) / 2 + 4) * D);
    root.add(plane);
  }

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const c = ch(x, y);
      const out = c === 'O';
      const r = hash(x, y);
      const z = y * D;
      if (isWall(c)) {
        wallTile(root, B, x, y, out, room(x, y), r, topOf);
        continue;
      }
      // Walkable or high tile: a column whose top face is the tile.
      const top = topOf(x, y);
      let topMat;
      if (c === '.' || c === 'S' || c === 'B') topMat = tmat('#ffffff', tex(B.ground[2], shade(B.ground[0], (r - 0.5) * 0.06), B.ground[3]));
      else if (c === ',') topMat = lockedMat(B, x, y, ch, r);
      else if (c === 'H') topMat = tmat('#ffffff', tex('pad', B.high[0], B.accent));
      else if (c === 'h') topMat = tmat('#ffffff', tex('tile', shade(B.high[0], -0.08)));
      else topMat = tmat('#ffffff', tex('tile', B.ground[0])); // A on a path
      const sideCol = isHigh(c) ? B.high[1] : B.ground[1];
      column(root, x, y, top, deep, topMat, tmat(sideCol, tex('noise', '#ffffff')));
      if (B.wall === 'void') underside(root, B, x, y, deep, isHigh(c));
      edges(x, y, top, topOf);
      if (c === 'S') spawn(root, x, z, top);
      if (c === 'B') base(root, x, z, top);
      if (c === 'A') airSpawn(root, x, z, top + 0.05);
      if (c === 'h') prop(root, B.props, 'h', x, z, top, Math.min(room(x, y) - H_HIGH, 0.9), r);
      if (c === ',' && B.locked === 'planks' && bridgeLike(ch, x, y)) rails(root, B, x, z, ch, y);
    }
  }

  // A thin dark line where any tile's top meets a lower neighbour.
  const geo = new LineSegmentsGeometry().setPositions(segs);
  lineMat = new LineMaterial({ color: 0x1a1420, linewidth: 2.2 });
  const lines = new LineSegments2(geo, lineMat);
  root.add(lines);
  return { root, W, H, lineMat, bg: B.bg, sky: B.sky, x0, x1, y0, y1 };
}

function bridgeLike(ch, x, y) {
  const w = (c) => c === '#' || c === 'O';
  return (w(ch(x, y - 1)) && w(ch(x, y + 1))) || (w(ch(x - 1, y)) && w(ch(x + 1, y)));
}

function lockedMat(B, x, y, ch, r) {
  if (B.locked === 'planks') return tmat('#ffffff', tex('planks', B.plank));
  if (B.locked === 'grate') return tmat('#ffffff', tex('grate', B.plank));
  return tmat('#ffffff', tex('stripes', B.ground[0], B.stripe));
}

function column(root, x, y, top, bottom, topMat, sideMat) {
  const h = top - bottom;
  const geo = new THREE.BoxGeometry(1, h, D);
  // Box face order: +x, -x, +y, -y, +z, -z.
  const m = new THREE.Mesh(geo, [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]);
  m.position.set(x + 0.5, bottom + h / 2, y * D + D / 2);
  m.castShadow = true;
  m.receiveShadow = true;
  root.add(m);
  return m;
}

/** Outline the top face's edges that drop to a lower neighbour, plus the visible front corners. */
function edges(x, y, top, topOf) {
  const z0 = y * D, z1 = (y + 1) * D;
  const nb = { n: topOf(x, y - 1), s: topOf(x, y + 1), w: topOf(x - 1, y), e: topOf(x + 1, y) };
  const lo = (v) => v < top - 0.01;
  if (lo(nb.n)) seg([x, top, z0], [x + 1, top, z0]);
  if (lo(nb.s)) seg([x, top, z1], [x + 1, top, z1]);
  if (lo(nb.w)) seg([x, top, z0], [x, top, z1]);
  if (lo(nb.e)) seg([x + 1, top, z0], [x + 1, top, z1]);
  if (lo(nb.s)) {
    const bottom = Math.max(nb.s, -3);
    if (lo(nb.w)) seg([x, top, z1], [x, Math.max(bottom, nb.w), z1]);
    if (lo(nb.e)) seg([x + 1, top, z1], [x + 1, Math.max(bottom, nb.e), z1]);
  }
}

// ---- wall tiles -----------------------------------------------------------------
function wallTile(root, B, x, y, out, room, r, topOf) {
  const z = y * D;
  if (B.wall === 'solid') {
    const top = 0.04;
    column(root, x, y, top, -1.6, tmat('#ffffff', tex('noise', shade(B.wallTop, (r - 0.5) * 0.1))), tmat(shade(B.wallTop, -0.35)));
    edges(x, y, top, topOf);
    prop(root, B.props, 'wall', x, z, top, room, r);
  } else if (B.wall === 'liquid') {
    prop(root, B.props, 'liquid', x, z, -0.32, room, r);
  } else {
    prop(root, B.props, 'void', x, z, -99, room, r);
  }
}

// ---- props ------------------------------------------------------------------------
const OUT = { outlineScale: 1.07 };
function obox(parent, w, h, d, color, pos, t = 0.035, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), opts.material ?? tmat(color, opts.map ?? null, opts.emissive ?? null));
  m.position.set(...pos);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  if (t > 0) {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w + 2 * t, h + 2 * t, d + 2 * t), new THREE.MeshBasicMaterial({ color: 0x1a1420, side: THREE.BackSide }));
    m.add(o);
  }
  return m;
}
function shadowed(g) {
  g.traverse((o) => { if (o.isMesh && o.material.side !== THREE.BackSide && !o.material.isMeshBasicMaterial) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

function tree(g, h, leaf, trunk = '#6a4a30') {
  part(g, G.cyl(0.07, 0.1, h * 0.45, 10), trunk, [0, h * 0.22, 0]);
  part(g, G.sphere(0.34, 20), leaf, [0, h * 0.55, 0], [0, 0, 0], [1, 0.9, 1], OUT);
  part(g, G.sphere(0.26, 20), shade(leaf, 0.12), [0.12, h * 0.75, 0.08], [0, 0, 0], [1, 0.9, 1], OUT);
  part(g, G.sphere(0.22, 20), shade(leaf, -0.1), [-0.16, h * 0.68, -0.05], [0, 0, 0], [1, 0.9, 1], OUT);
}
function pine(g, h, leaf, snow = false) {
  part(g, G.cyl(0.06, 0.08, h * 0.3, 8), '#5a3e2a', [0, h * 0.15, 0]);
  for (let i = 0; i < 3; i++) {
    const s = 1 - i * 0.25;
    part(g, G.cone(0.34 * s, h * 0.38, 12), i === 2 && snow ? '#f4f8fc' : leaf, [0, h * (0.32 + i * 0.2), 0], [0, 0, 0], [1, 1, 1], OUT);
  }
}
function rock(g, s, color, y = 0) {
  const geo = new THREE.DodecahedronGeometry(s, 0);
  part(g, geo, color, [0, y + s * 0.5, 0], [hash(s * 100, 1) * 3, hash(s * 100, 2) * 3, 0], [1, 0.7, 1], { outlineScale: 1.08, flat: true });
}
function building(g, h, r, B) {
  const w = 0.82, d = 0.82 * D;
  const col = pick(['#454a55', '#3c414b', '#50555f', '#363a43'], r);
  obox(g, w, h, d, col, [0, h / 2, 0]);
  // windows on the front (+z) face
  const rows = Math.max(1, Math.floor((h - 0.15) / 0.28));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < 3; j++) {
      const lit = hash(r * 999 + i, j) < 0.28;
      const red = hash(r * 777 + i, j) < 0.03;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.13), glow(red ? '#ff5a5a' : lit ? '#cfe2ff' : '#252a33'));
      m.position.set(-0.25 + j * 0.25, 0.2 + i * 0.28, d / 2 + 0.003);
      g.add(m);
    }
  }
  // roof details
  if (hash(r, 5) < 0.6) obox(g, 0.25, 0.14, 0.25, '#6a707b', [0.18, h + 0.07, -0.1], 0.025);
  if (hash(r, 6) < 0.35) part(g, G.cyl(0.015, 0.015, 0.4, 6), '#2a2d33', [-0.25, h + 0.2, -0.2], [0, 0, 0], [1, 1, 1], { outline: false });
  if (hash(r, 7) < 0.25) obox(g, 0.5, 0.08, 0.02, '#c8323a', [0, h - 0.18, d / 2 + 0.02], 0.02, { material: glow('#c8323a') });
}

function prop(root, set, where, x, z, top, room, r) {
  const g = group(root, [x + 0.5, top, z + D / 2]);
  g.rotation.y = 0;
  const rr = (k) => hash(Math.floor(r * 1e6), k);
  const jitter = () => g.position.add(new THREE.Vector3((rr(11) - 0.5) * 0.25, 0, (rr(12) - 0.5) * 0.25));
  switch (set + ':' + where) {
    case 'city:wall':
      if (room > 1.2) building(g, 0.6 + rr(1) * Math.min(1.9, room - 0.6), r);
      else if (rr(1) < 0.45) { obox(g, 0.8, 0.28, 0.25, '#7a7f88', [0, 0.14, 0]); obox(g, 0.8, 0.05, 0.27, '#e0b43a', [0, 0.24, 0], 0.015); }
      else if (rr(1) < 0.75) { part(g, G.cyl(0.25, 0.28, 0.3, 16), '#6a707a', [0, 0.15, 0]); tree(g, 0.6, '#5c8a45'); }
      else { obox(g, 0.32, 0.3, 0.32, '#8a6e4a', [-0.15, 0.15, 0.1]); obox(g, 0.26, 0.24, 0.26, '#9a7e58', [0.2, 0.12, -0.1]); }
      break;
    case 'city:h':
      if (rr(1) < 0.5) { obox(g, 0.5, 0.36, 0.5, '#6a707b', [0, 0.18, 0]); part(g, G.cyl(0.15, 0.15, 0.04, 16), '#2a2d33', [0, 0.38, 0]); }
      else { obox(g, 0.55, 0.3, 0.4, '#3c414b', [0, 0.15, 0]); obox(g, 0.4, 0.14, 0.02, '#bfd7ff', [0, 0.18, 0.21], 0.015, { material: glow('#bfd7ff') }); }
      break;
    case 'forest:wall':
      jitter();
      if (room > 1.3 && rr(1) < 0.8) (rr(2) < 0.5 ? tree : pine)(g, 0.9 + rr(3) * Math.min(1.2, room - 0.9), pick(['#3f7f35', '#4f9440', '#356e2e'], rr(4)));
      else if (rr(1) < 0.6) { part(g, G.sphere(0.26, 16), '#3f8a35', [0, 0.16, 0], [0, 0, 0], [1.2, 0.8, 1], OUT); part(g, G.sphere(0.04, 8), '#e05050', [0.1, 0.28, 0.15], [0, 0, 0], [1, 1, 1], { outline: false }); }
      else rock(g, 0.22, '#8a8a80');
      break;
    case 'forest:h':
      if (rr(1) < 0.6) tree(g, 0.9, '#4f9440'); else { part(g, G.cyl(0.24, 0.28, 0.22, 14), '#7a5434', [0, 0.11, 0]); part(g, G.cyl(0.2, 0.2, 0.01, 14), '#c49a68', [0, 0.225, 0], [0, 0, 0], [1, 1, 1], { outline: false }); }
      break;
    case 'desert:wall':
      jitter();
      if (room > 1.4 && rr(1) < 0.18) { obox(g, 0.8, Math.min(room, 1.4) * 0.8, 0.8 * D, '#c88e52', [0, Math.min(room, 1.4) * 0.4, 0]); obox(g, 0.86, 0.1, 0.86 * D, '#b07a44', [0, Math.min(room, 1.4) * 0.8, 0], 0.03); }
      else if (rr(1) < 0.55) part(g, G.sphere(0.42, 20), '#dcb478', [0, 0, 0], [0, 0, 0], [1.1, 0.45, 1.1], OUT);
      else if (rr(1) < 0.75) { part(g, G.capsule(0.08, 0.4), '#5f9a4a', [0, 0.3, 0]); part(g, G.capsule(0.05, 0.15), '#5f9a4a', [0.12, 0.35, 0], [0, 0, -0.9]); }
      else rock(g, 0.24, '#a8754a');
      break;
    case 'desert:h':
      obox(g, 0.22, 0.75, 0.22, '#b88a52', [0, 0.37, 0]); part(g, G.cone(0.16, 0.18, 4), '#e0b060', [0, 0.84, 0], [0, Math.PI / 4, 0]);
      break;
    case 'ice:liquid':
      if (rr(1) < 0.35) part(g, G.cyl(0.3, 0.34, 0.1, 7), '#e6f2fb', [(rr(2) - 0.5) * 0.3, 0.03, 0], [0, rr(3) * 3, 0], [1, 1, 1], OUT);
      else if (room > 1.3 && rr(1) < 0.6) { rock(g, 0.3, '#dfe9f2'); pine(g.children.length ? group(g, [0, 0.25, 0]) : g, 1 + rr(4) * 0.6, '#3d6e5a', true); }
      break;
    case 'ice:h':
      part(g, G.cone(0.14, 0.6, 6), '#a8e4ff', [-0.1, 0.3, 0], [0, 0, 0.15], [1, 1, 1], OUT);
      part(g, G.cone(0.1, 0.4, 6), '#d2f2ff', [0.14, 0.2, 0.05], [0, 0, -0.25], [1, 1, 1], OUT);
      break;
    case 'lava:liquid':
      if (rr(1) < 0.14) rock(g, 0.22 + rr(2) * 0.1, '#3a3330');
      else if (room > 1.4 && rr(1) < 0.24) { part(g, G.cone(0.3, Math.min(room, 1.8), 7), '#2e2826', [0, Math.min(room, 1.8) / 2, 0], [0, 0, 0], [1, 1, 1], OUT); }
      break;
    case 'lava:h':
      part(g, G.cone(0.16, 0.6, 5), '#24202a', [0, 0.3, 0], [0, 0, 0.1], [1, 1, 1], OUT);
      part(g, G.cone(0.1, 0.36, 5), '#ff6a1f', [0.18, 0.18, 0.05], [0, 0, -0.2], [1, 1, 1], { glow: true, outlineScale: 1.12 });
      break;
    case 'swamp:liquid':
      if (rr(1) < 0.3) { for (let i = 0; i < 4; i++) part(g, G.cyl(0.012, 0.018, 0.4 + rr(i + 3) * 0.2, 5), '#7a8a40', [(rr(i) - 0.5) * 0.5, 0.2, (rr(i + 8) - 0.5) * 0.5], [0, 0, (rr(i + 5) - 0.5) * 0.3], [1, 1, 1], { outline: false }); }
      else if (rr(1) < 0.5) part(g, G.cyl(0.14, 0.14, 0.01, 12, 1), '#6c9a3c', [(rr(2) - 0.5) * 0.4, 0.01, 0], [0, 0, 0], [1, 1, 1], OUT);
      else if (room > 1.4 && rr(1) < 0.7) { part(g, G.cyl(0.06, 0.12, 1.1, 8), '#4a3c2c', [0, 0.55, 0], [0, 0, 0.1]); part(g, G.cyl(0.03, 0.05, 0.5, 6), '#4a3c2c', [0.2, 0.85, 0], [0, 0, -0.9]); part(g, G.sphere(0.25, 12), '#4a6a38', [0.0, 1.15, 0], [0, 0, 0], [1.2, 0.6, 1], OUT); }
      break;
    case 'swamp:h':
      part(g, G.cyl(0.07, 0.12, 0.7, 8), '#4a3c2c', [0, 0.35, 0]); part(g, G.sphere(0.24, 12), '#5a7a3e', [0, 0.75, 0], [0, 0, 0], [1.2, 0.7, 1], OUT);
      break;
    case 'sky:void':
      if (room > 1.2 && rr(1) < 0.12) { const isl = group(g, [0, 99 - 3.4, 0]); part(isl, G.cone(0.4, 0.8, 7), '#7a6248', [0, -0.4, 0], [Math.PI, 0, 0], [1, 1, 1], OUT); part(isl, G.cyl(0.4, 0.4, 0.12, 7), '#84c25c', [0, 0.06, 0]); }
      break;
    case 'sky:h':
      tree(g, 0.8, '#6fbf4f');
      break;
    case 'sea:liquid':
      if (rr(1) < 0.08) rock(g, 0.2, '#8a8478');
      break;
    case 'sea:h':
      part(g, G.cyl(0.05, 0.07, 0.8, 8), '#9a7a50', [0, 0.4, 0], [0, 0, 0.15]);
      for (let i = 0; i < 5; i++) part(g, G.cone(0.07, 0.45, 4), '#4f9a3a', [0.1 + Math.cos(i * 1.26) * 0.18, 0.78, Math.sin(i * 1.26) * 0.18], [Math.sin(i * 1.26) * 1.2, 0, -Math.cos(i * 1.26) * 1.2], [1, 1, 1], OUT);
      break;
    case 'ruins:liquid':
      if (rr(1) < 0.18) { const h = 0.4 + rr(2) * 0.5; part(g, G.cyl(0.16, 0.18, h, 10), '#b5ae98', [0, h / 2, 0]); }
      else if (room > 1.5 && rr(1) < 0.35) { obox(g, 0.8, 0.9, 0.8 * D, '#8f8a78', [0, 0.45, 0]); part(g, G.sphere(0.3, 12), '#4f7a3a', [0.2, 0.9, 0], [0, 0, 0], [1.3, 0.5, 1], OUT); }
      break;
    case 'ruins:h':
      part(g, G.cyl(0.14, 0.16, 0.5, 10), '#b5ae98', [0, 0.25, 0]); part(g, G.sphere(0.13, 12), '#a8a28c', [0, 0.62, 0]);
      break;
    case 'tech:void':
      if (rr(1) < 0.05) { const p = group(g, [0, 99 - 2.2, 0]); obox(p, 0.6, 0.06, 0.6, '#4a5260', [0, 0, 0], 0.025); obox(p, 0.5, 0.02, 0.02, '#5fe0ff', [0, 0.04, 0.3], 0.01, { material: glow('#5fe0ff') }); }
      break;
    case 'tech:h':
      obox(g, 0.4, 0.55, 0.3, '#2c323e', [0, 0.27, -0.05]); for (let i = 0; i < 3; i++) obox(g, 0.28, 0.03, 0.01, i === 1 ? '#c8323a' : '#5fe0ff', [0, 0.15 + i * 0.13, 0.105], 0, { material: glow(i === 1 ? '#c8323a' : '#5fe0ff') });
      break;
    case 'canyon:void':
      if (room > 1.5 && rr(1) < 0.1) { const s = group(g, [0, 99 - 6, 0]); part(s, G.cyl(0.25, 0.4, 6 + Math.min(room, 1.6) * 0.6, 7), '#a0553a', [0, 3 + Math.min(room, 1.6) * 0.3, 0], [0, 0, 0], [1, 1, 1], OUT); }
      break;
    case 'canyon:h':
      rock(g, 0.28, '#8e4a30');
      break;
    case 'cave:wall':
      jitter();
      if (room > 1.2 && rr(1) < 0.5) { const h = 0.6 + rr(2) * Math.min(1.2, room - 0.6); part(g, G.cone(0.4, h, 6), pick(['#3a3744', '#454152', '#332f3c'], rr(3)), [0, h / 2, 0], [0, rr(4) * 2, 0], [1, 1, 1], OUT); }
      else if (rr(1) < 0.75) rock(g, 0.26, '#4a4656');
      if (rr(5) < 0.3) { part(g, G.cone(0.07, 0.35, 5), '#7ef0ff', [0.25, 0.15, 0.2], [0, 0, -0.4], [1, 1, 1], { glow: true, outlineScale: 1.15 }); part(g, G.cone(0.05, 0.25, 5), '#c08aff', [0.32, 0.1, 0.05], [0, 0, 0.5], [1, 1, 1], { glow: true, outlineScale: 1.15 }); }
      break;
    case 'cave:h':
      for (let i = 0; i < 3; i++) part(g, G.cone(0.08, 0.35 + i * 0.1, 5), i === 1 ? '#c08aff' : '#7ef0ff', [(i - 1) * 0.14, 0.17 + i * 0.05, 0], [0, 0, (i - 1) * 0.35], [1, 1, 1], { glow: true, outlineScale: 1.15 });
      break;
    default:
      break;
  }
  shadowed(g);
}

// Void props sit in a group at y = -99 (no surface), so their sub-groups use 99 - depth.

/** Floating tiles: a rocky cone under sky islands, a lit strut under space platforms. */
function underside(root, B, x, y, bottom, high) {
  const g = group(root, [x + 0.5, bottom, y * D + D / 2]);
  if (B.void === 'stars') {
    obox(g, 0.12, 0.6, 0.12, '#2c323e', [0, -0.3, 0], 0.02);
    obox(g, 0.9, 0.03, 0.02, '#5fe0ff', [0, 0.12, D / 2 + 0.01], 0, { material: glow('#5fe0ff') });
  } else {
    const h = 0.7 + hash(x, y, 3) * 0.6;
    part(g, G.cone(0.62, h, 5), high ? B.high[1] : B.ground[1], [0, -h / 2, 0], [Math.PI, hash(x, y, 4), 0], [1, 1, D * 0.9], OUT);
  }
  shadowed(g);
}

// ---- special tiles ---------------------------------------------------------------
function spawn(root, x, z, top) {
  const g = group(root, [x + 0.5, top, z + D / 2]);
  part(g, G.cyl(0.42, 0.44, 0.06, 6), '#2a2e38', [0, 0.03, 0], [0, Math.PI / 6, 0], [1, 1, 1.15]);
  part(g, G.torus(0.3, 0.03), '#bfd7ff', [0, 0.07, 0], [Math.PI / 2, 0, 0], [1, 1.15, 1], { glow: true, outline: false });
  // gate frame at the back of the tile
  const gz = -D * 0.3;
  obox(g, 0.1, 0.8, 0.12, '#e8ecf2', [-0.36, 0.4, gz]);
  obox(g, 0.1, 0.8, 0.12, '#e8ecf2', [0.36, 0.4, gz]);
  obox(g, 0.86, 0.12, 0.14, '#e8ecf2', [0, 0.82, gz]);
  obox(g, 0.18, 0.06, 0.02, '#2a2e38', [0, 0.82, gz + 0.08], 0);
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.74), glow('#9fc4ff', 0.55));
  portal.position.set(0, 0.39, gz);
  g.add(portal);
  const core = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.55), glow('#e8f2ff', 0.55));
  core.position.set(0, 0.36, gz + 0.01);
  g.add(core);
  shadowed(g);
}

function airSpawn(root, x, z, top) {
  const g = group(root, [x + 0.5, Math.max(top, 0), z + D / 2]);
  if (top < -1) part(g, G.cyl(0.3, 0.12, 0.25, 8), '#4a5060', [0, -0.12, 0]);
  part(g, G.cyl(0.32, 0.32, 0.06, 8), '#2a2e38', [0, 0.03, 0]);
  part(g, G.torus(0.3, 0.035), '#7ff0ff', [0, 0.5, 0], [Math.PI / 2, 0, 0], [1, 1.15, 1], { glow: true, outline: false });
  part(g, G.torus(0.2, 0.025), '#bfd7ff', [0, 0.62, 0], [Math.PI / 2, 0, 0], [1, 1.15, 1], { glow: true, outline: false });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.5, 16, 1, true), glow('#7ff0ff', 0.25));
  beam.position.y = 0.3;
  g.add(beam);
  shadowed(g);
}

function base(root, x, z, top) {
  const g = group(root, [x + 0.5, top, z + D / 2]);
  part(g, G.cyl(0.4, 0.4, 0.04, 4), '#3a1c1f', [0, 0.02, 0], [0, Math.PI / 4, 0], [1, 1, 1.15]);
  for (let i = 0; i < 3; i++) obox(g, 0.36, 0.015, 0.06, '#ff4a50', [0, 0.05, 0.25 - i * 0.16], 0, { material: glow('#ff4a50') });
  const bz = -D * 0.3;
  obox(g, 0.86, 0.6, 0.22, '#3c3a40', [0, 0.3, bz]);
  obox(g, 0.94, 0.1, 0.28, '#2a282e', [0, 0.63, bz]);
  obox(g, 0.4, 0.42, 0.02, '#1a1418', [0, 0.21, bz + 0.12], 0);
  obox(g, 0.36, 0.05, 0.02, '#c8323a', [0, 0.47, bz + 0.13], 0, { material: glow('#ff3a40') });
  obox(g, 0.06, 0.06, 0.02, '#ff3a40', [-0.3, 0.45, bz + 0.12], 0, { material: glow('#ff3a40') });
  obox(g, 0.06, 0.06, 0.02, '#ff3a40', [0.3, 0.45, bz + 0.12], 0, { material: glow('#ff3a40') });
  shadowed(g);
}

function rails(root, B, x, z, ch, y) {
  const w = (c) => c === '#' || c === 'O';
  const g = group(root, [x + 0.5, 0, z + D / 2]);
  const col = shade(B.plank, -0.25);
  if (w(ch(x, y - 1)) && w(ch(x, y + 1))) {
    obox(g, 1, 0.05, 0.05, col, [0, 0.16, -D / 2 + 0.05], 0.02);
    obox(g, 1, 0.05, 0.05, col, [0, 0.16, D / 2 - 0.05], 0.02);
    for (const sx of [-0.45, 0.45]) for (const sz of [-D / 2 + 0.05, D / 2 - 0.05]) obox(g, 0.06, 0.18, 0.06, col, [sx, 0.09, sz], 0.02);
  } else {
    obox(g, 0.05, 0.05, D, col, [-0.45, 0.16, 0], 0.02);
    obox(g, 0.05, 0.05, D, col, [0.45, 0.16, 0], 0.02);
  }
  shadowed(g);
}
