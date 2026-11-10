import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Second-generation stage maps: smooth lit materials, bevelled tiles, soft shadows and contact shading
// instead of flat cartoon tiles with black outlines. Same projection as map3d.js, so the game grid still lines up.

// ---- projection --------------------------------------------------------------
export const PITCH = (46 * Math.PI) / 180;
export const D = 1 / Math.sin(PITCH);
export const LIFT = Math.cos(PITCH);
export const H_HIGH = 0.45;              // high ground height (world units)
const FLOOR = -0.3;                      // solid surroundings sit below the walkable tiles
// A thin border of scenery: the surroundings are plain and fade out, so the playable tiles can fill the screen.
export const MARGIN = { l: 2, r: 2, t: 1.5, b: 2.5 };

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

// ---- meshes (smooth shaded, no outlines) ---------------------------------------
const stdCache = new Map();
function std(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!stdCache.has(key)) {
    let m;
    if (opts.glow) {
      m = new THREE.MeshBasicMaterial({ color, transparent: opts.opacity !== undefined && opts.opacity < 1, opacity: opts.opacity ?? 1, depthWrite: !(opts.opacity < 1) });
      m.userData.glow = true;
    } else {
      m = new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.82, metalness: opts.metal ?? 0, transparent: opts.opacity !== undefined && opts.opacity < 1, opacity: opts.opacity ?? 1 });
    }
    stdCache.set(key, m);
  }
  return stdCache.get(key);
}
function part(parent, geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], opts = {}) {
  const m = new THREE.Mesh(geo, color && color.isMaterial ? color : std(color, { glow: opts.glow, opacity: opts.opacity, rough: opts.rough, metal: opts.metal }));
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.scale.set(...scale);
  parent.add(m);
  return m;
}
function lathe(points, s = 24) {
  const g = new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)), s);
  g.computeVertexNormals();
  return g;
}
const G = {
  sphere: (r = 1, s = 24) => new THREE.SphereGeometry(r, s, Math.max(8, s / 2)),
  capsule: (r, len) => new THREE.CapsuleGeometry(r, len, 6, 14),
  cyl: (rt, rb, h, s = 20) => {
    const b = Math.min(rt, rb, h) * 0.12;
    return lathe([[0, -h / 2], [rb - b, -h / 2], [rb, -h / 2 + b], [rt, h / 2 - b], [rt - b, h / 2], [0, h / 2]], s);
  },
  box: (w, h, d) => new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.12),
  cone: (r, h, s = 12) => new THREE.ConeGeometry(r, h, s),
  torus: (r, t, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, 10, 32, arc),
};
function group(parent, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const g = new THREE.Group();
  g.position.set(...pos);
  g.rotation.set(...rot);
  parent.add(g);
  return g;
}

// ---- textures --------------------------------------------------------------------
/** Soft cloudy noise drawn over the current canvas (several blurred octaves of random greys). */
function grain(g, S, strength = 0.1, seed = 3) {
  let s = seed * 9973 + 17;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (const [n, a] of [[6, 1], [14, 0.7], [40, 0.45]]) {
    const c = document.createElement('canvas');
    c.width = c.height = n;
    const cg = c.getContext('2d');
    const img = cg.createImageData(n, n);
    for (let i = 0; i < n * n; i++) {
      const v = rnd() * 255;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    cg.putImageData(img, 0, 0);
    g.save();
    g.globalAlpha = strength * a;
    g.globalCompositeOperation = 'soft-light';
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(c, 0, 0, S, S);
    g.restore();
  }
}

const texCache = new Map();
/** Procedural canvas texture for a tile top. */
function tex(kind, base, accent = '#000000') {
  const key = kind + base + accent;
  if (texCache.has(key)) return texCache.get(key);
  const liquid = kind === 'water' || kind === 'lava' || kind === 'floor';
  const S = liquid ? 1024 : 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  let g = cv.getContext('2d');
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const wrap = (draw) => {
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { g.save(); g.translate(ox, oy); draw(); g.restore(); }
  };
  const fillBase = (c = base) => {
    const gr = g.createLinearGradient(0, 0, S, S);
    gr.addColorStop(0, shade(c, 0.05));
    gr.addColorStop(1, shade(c, -0.05));
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);
  };
  /** A slab: thin dark seam at the rim with a light bevel inside it. */
  const slab = (m = 5) => {
    g.strokeStyle = 'rgba(0,0,0,0.3)';
    g.lineWidth = m;
    g.strokeRect(m / 2, m / 2, S - m, S - m);
    g.strokeStyle = 'rgba(255,255,255,0.16)';
    g.lineWidth = 2;
    g.strokeRect(m + 2, m + 2, S - 2 * m - 4, S - 2 * m - 4);
  };
  const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  /** Draws a layer on its own canvas, then stamps it blurred and tiled (one blur instead of one per stroke). */
  const blurred = (px, draw) => {
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const main = g;
    g = c.getContext('2d');
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { g.save(); g.translate(ox, oy); draw(); g.restore(); }
    g = main;
    g.save();
    g.filter = `blur(${px}px)`;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) g.drawImage(c, ox, oy);
    g.restore();
  };
  if (kind === 'tile') {
    fillBase();
    grain(g, S, 0.2);
    slab();
    // faint inner panel
    g.strokeStyle = 'rgba(0,0,0,0.07)';
    g.lineWidth = 2;
    rr(26, 26, S - 52, S - 52, 8);
    g.stroke();
  } else if (kind === 'pad') {
    fillBase();
    grain(g, S, 0.18);
    slab(6);
    // recessed deck with thin accent brackets: where operators can stand
    rr(22, 22, S - 44, S - 44, 10);
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.1)';
    g.lineWidth = 2;
    g.stroke();
    g.strokeStyle = accent;
    g.lineWidth = 7;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.shadowColor = accent;
    g.shadowBlur = 10;
    const c = 44, m = 38;
    for (const [x, y, dx, dy] of [[m, m, 1, 1], [S - m, m, -1, 1], [m, S - m, 1, -1], [S - m, S - m, -1, -1]]) {
      g.beginPath();
      g.moveTo(x, y + dy * c);
      g.lineTo(x, y);
      g.lineTo(x + dx * c, y);
      g.stroke();
    }
    g.shadowBlur = 0;
  } else if (kind === 'stripes') {
    fillBase();
    g.save();
    rr(20, 20, S - 40, S - 40, 8);
    g.clip();
    g.fillStyle = shade(base, -0.45);
    g.fillRect(0, 0, S, S);
    g.fillStyle = accent;
    for (let i = -S; i < S * 2; i += 56) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i + 28, 0);
      g.lineTo(i + 28 - S, S);
      g.lineTo(i - S, S);
      g.fill();
    }
    g.restore();
    grain(g, S, 0.3);
    slab();
  } else if (kind === 'planks') {
    for (let i = 0; i < 4; i++) {
      const y = i * (S / 4);
      const gr = g.createLinearGradient(0, y, 0, y + S / 4);
      const col = shade(base, (i % 2 ? -0.07 : 0.04));
      gr.addColorStop(0, shade(col, 0.08));
      gr.addColorStop(1, shade(col, -0.1));
      g.fillStyle = gr;
      g.fillRect(0, y, S, S / 4);
      // grain lines
      g.strokeStyle = 'rgba(0,0,0,0.1)';
      g.lineWidth = 1.5;
      for (let k = 0; k < 5; k++) {
        const yy = y + 8 + rnd() * (S / 4 - 16);
        g.beginPath();
        g.moveTo(0, yy);
        g.bezierCurveTo(S * 0.3, yy + rnd() * 8 - 4, S * 0.7, yy + rnd() * 8 - 4, S, yy);
        g.stroke();
      }
      g.fillStyle = 'rgba(0,0,0,0.4)';
      g.fillRect(0, y, S, 4);
      g.fillRect(((i * 107) % 180) + 20, y + 4, 4, S / 4 - 4);
    }
    grain(g, S, 0.4);
  } else if (kind === 'grate') {
    fillBase(shade(base, -0.5));
    for (let i = 14; i < S; i += 28) {
      const gr = g.createLinearGradient(i, 0, i + 16, 0);
      gr.addColorStop(0, shade(base, 0.2));
      gr.addColorStop(1, shade(base, -0.15));
      g.fillStyle = gr;
      g.fillRect(i, 10, 16, S - 20);
    }
    slab(8);
  } else if (kind === 'metal') {
    fillBase();
    grain(g, S, 0.35);
    slab();
    g.strokeStyle = 'rgba(0,0,0,0.22)';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(S / 2, 8);
    g.lineTo(S / 2, S - 8);
    g.stroke();
    g.fillStyle = 'rgba(0,0,0,0.3)';
    for (const [x, y] of [[24, 24], [S - 24, 24], [24, S - 24], [S - 24, S - 24]]) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); }
    g.fillStyle = accent;
    g.shadowColor = accent;
    g.shadowBlur = 12;
    rr(S / 2 - 50, S / 2 - 4, 100, 8, 4);
    g.fill();
    g.shadowBlur = 0;
  } else if (kind === 'noise') {
    fillBase();
    grain(g, S, 0.3);
  } else if (kind === 'floor') {
    // seamless ground for the surroundings: soft light and dark patches, no tile seams
    g.fillStyle = base;
    g.fillRect(0, 0, S, S);
    const patches = Array.from({ length: 40 }, () => [rnd() * S, rnd() * S, 40 + rnd() * 120, rnd() < 0.5]);
    blurred(28, () => {
      for (const [x, y, r, light] of patches) {
        g.fillStyle = light ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.12)';
        g.beginPath();
        g.ellipse(x, y, r, r * 0.7, 0, 0, 7);
        g.fill();
      }
    });
    const dots = Array.from({ length: 260 }, () => [rnd() * S, rnd() * S, 1.5 + rnd() * 3.5, rnd() < 0.5]);
    blurred(1.5, () => {
      for (const [x, y, r, light] of dots) {
        g.fillStyle = light ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.14)';
        g.beginPath();
        g.arc(x, y, r, 0, 7);
        g.fill();
      }
    });
  } else if (kind === 'side') {
    // wall of a block: lighter at the top edge, darker towards the ground
    const gr = g.createLinearGradient(0, 0, 0, S);
    gr.addColorStop(0, shade(base, 0.1));
    gr.addColorStop(0.12, base);
    gr.addColorStop(1, shade(base, -0.4));
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);
    grain(g, S, 0.1);
  } else if (kind === 'water') {
    g.fillStyle = base;
    g.fillRect(0, 0, S, S);
    // large soft patches of lighter and deeper water (tiled, so no seams)
    const patches = Array.from({ length: 14 }, () => [rnd() * S, rnd() * S, 90 + rnd() * 140, rnd() < 0.5]);
    blurred(40, () => {
      for (const [x, y, r, light] of patches) {
        g.fillStyle = light ? 'rgba(255,255,255,0.1)' : 'rgba(0,10,40,0.12)';
        g.beginPath();
        g.ellipse(x, y, r, r * 0.6, 0, 0, 7);
        g.fill();
      }
    });
    // soft ripples: blurred light arcs plus a few crisp glints
    const waves = Array.from({ length: 150 }, () => [rnd() * S, rnd() * S, 30 + rnd() * 60, rnd() * 0.5 - 0.25]);
    blurred(5, () => {
      g.strokeStyle = 'rgba(255,255,255,0.16)';
      g.lineWidth = 7;
      g.lineCap = 'round';
      for (const [x, y, len, k] of waves) {
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + len / 2, y - 12 + k * 20, x + len, y + k * 10);
        g.stroke();
      }
    });
    blurred(1, () => {
      g.strokeStyle = 'rgba(255,255,255,0.3)';
      g.lineWidth = 2.5;
      g.lineCap = 'round';
      for (const [x, y, len] of waves.slice(0, 60)) {
        g.beginPath();
        g.moveTo(x + 10, y + 26);
        g.quadraticCurveTo(x + len * 0.3, y + 20, x + len * 0.5, y + 26);
        g.stroke();
      }
    });
  } else if (kind === 'stars') {
    g.fillStyle = base;
    g.fillRect(0, 0, S, S);
    for (let i = 0; i < 4; i++) {
      const x = rnd() * S, y = rnd() * S;
      const gr = g.createRadialGradient(x, y, 0, x, y, 90);
      gr.addColorStop(0, i % 2 ? 'rgba(90,70,160,0.25)' : 'rgba(40,110,170,0.22)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      wrap(() => g.fillRect(x - 90, y - 90, 180, 180));
    }
    for (let i = 0; i < 70; i++) {
      g.fillStyle = `rgba(225,238,255,${0.3 + rnd() * 0.7})`;
      g.beginPath();
      g.arc(rnd() * S, rnd() * S, rnd() < 0.12 ? 2.2 : 1, 0, 7);
      g.fill();
    }
  } else if (kind === 'clouds') {
    g.fillStyle = base;
    g.fillRect(0, 0, S, S);
    const puffs = Array.from({ length: 30 }, () => [rnd() * S, rnd() * S, 18 + rnd() * 40, 0.25 + rnd() * 0.4]);
    blurred(9, () => {
      for (const [x, y, r, a] of puffs) {
        g.fillStyle = `rgba(255,255,255,${a})`;
        g.beginPath();
        g.ellipse(x, y, r * 1.6, r, 0, 0, 7);
        g.fill();
      }
    });
  } else if (kind === 'lava') {
    // Dark crust with a web of glowing cracks: calm enough to read the tiles against it.
    g.fillStyle = '#4a160c';
    g.fillRect(0, 0, S, S);
    const dark = Array.from({ length: 16 }, () => [rnd() * S, rnd() * S, 80 + rnd() * 150]);
    blurred(30, () => {
      for (const [x, y, r] of dark) {
        g.fillStyle = 'rgba(20,4,4,0.35)';
        g.beginPath();
        g.ellipse(x, y, r, r * 0.7, 0, 0, 7);
        g.fill();
      }
    });
    const cracks = Array.from({ length: 26 }, () => {
      let x = rnd() * S, y = rnd() * S;
      const pts = [[x, y]];
      let a = rnd() * 6.28;
      for (let k = 0; k < 7; k++) {
        a += rnd() * 1.6 - 0.8;
        x += Math.cos(a) * (26 + rnd() * 40);
        y += Math.sin(a) * (26 + rnd() * 40);
        pts.push([x, y]);
      }
      return pts;
    });
    const stroke = () => {
      for (const pts of cracks) {
        g.beginPath();
        g.moveTo(...pts[0]);
        for (const p of pts.slice(1)) g.lineTo(...p);
        g.stroke();
      }
    };
    blurred(9, () => { g.strokeStyle = 'rgba(255,110,20,0.75)'; g.lineWidth = 14; g.lineJoin = 'round'; stroke(); });
    blurred(1, () => { g.strokeStyle = '#ffd070'; g.lineWidth = 4; g.lineJoin = 'round'; stroke(); });
  } else if (kind === 'cracks') {
    fillBase();
    grain(g, S, 0.6);
    g.strokeStyle = accent;
    g.lineWidth = 3;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.shadowColor = accent;
    g.shadowBlur = 8;
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      let x = rnd() * S, y = rnd() * S;
      g.moveTo(x, y);
      for (let k = 0; k < 5; k++) {
        x += rnd() * 56 - 28;
        y += rnd() * 56 - 28;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    g.shadowBlur = 0;
    slab();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  texCache.set(key, t);
  return t;
}

const matCache = new Map();
function tmat(color, map = null, emissive = null) {
  const key = color + (map ? map.uuid : '') + (emissive ?? '');
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, map, roughness: 0.86, metalness: 0, emissive: emissive ?? '#000000' }));
  }
  return matCache.get(key);
}
const glow = (color, opacity = 1) => {
  const m = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
  m.userData.glow = true;
  return m;
};

// Gradient strips laid on a surface along a tile edge: contact shading next to taller blocks,
// and foam (or glow, on lava) where land meets liquid.
function stripTex(stops) {
  const cv = document.createElement('canvas');
  cv.width = 4;
  cv.height = 64;
  const g = cv.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 64);
  for (const [t, c] of stops) gr.addColorStop(t, c);
  g.fillStyle = gr;
  g.fillRect(0, 0, 4, 64);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const stripMat = (stops, glowing = false) => {
  const m = new THREE.MeshBasicMaterial({ map: stripTex(stops), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  m.userData.glow = glowing;
  return m;
};
const aoMat = stripMat([[0, 'rgba(8,8,20,0.42)'], [0.4, 'rgba(8,8,20,0.14)'], [1, 'rgba(8,8,20,0)']]);
const foamMat = stripMat([[0, 'rgba(255,255,255,0.75)'], [0.25, 'rgba(255,255,255,0.3)'], [1, 'rgba(255,255,255,0)']]);
const emberMat = stripMat([[0, 'rgba(255,236,160,0.9)'], [0.3, 'rgba(255,150,40,0.45)'], [1, 'rgba(255,120,20,0)']], true);
const aoQuads = [];
const shoreQuads = [];
let curB = null;
/** Quad from edge a-b extending by vector d. */
function aoStrip(a, b, d) {
  aoQuads.push({ a, b, d });
}
function buildStrips(root, quads, material) {
  if (!quads.length) return;
  const pos = [], uv = [], idx = [];
  for (const { a, b, d } of quads) {
    const i = pos.length / 3;
    pos.push(...a, ...b, b[0] + d[0], b[1], b[2] + d[2], a[0] + d[0], a[1], a[2] + d[2]);
    uv.push(0, 1, 1, 1, 1, 0, 0, 0);
    idx.push(i, i + 2, i + 1, i, i + 3, i + 2, i, i + 1, i + 2, i, i + 2, i + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  const m = new THREE.Mesh(g, material);
  m.renderOrder = 1;
  root.add(m);
}
function buildAo(root) {
  buildStrips(root, aoQuads, aoMat);
  buildStrips(root, shoreQuads, curB.liquidGlow ? emberMat : foamMat);
}

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

// ---- scene building -----------------------------------------------------------
export function buildMap(level) {
  const B = BIOMES[level.biome];
  const map = level.map;
  const W = map[0].length, H = map.length;
  const root = new THREE.Group();
  aoQuads.length = 0;
  shoreQuads.length = 0;
  curB = B;

  const ch = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? map[y][x] : 'O'); // O = outside
  const isWall = (c) => c === '#' || c === 'O';
  const isHigh = (c) => c === 'H' || c === 'h';
  const deep = B.wall === 'chasm' ? -6 : B.wall === 'void' ? (B.void === 'stars' ? -0.3 : -0.7) : -1.6;
  const topOf = (x, y) => {
    const c = ch(x, y);
    if (isWall(c) || c === 'A') return B.wall === 'solid' ? FLOOR : B.wall === 'liquid' ? -0.32 : -99;
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
    t.repeat.set((x1 - x0) / 6, ((y1 - y0) * D) / 6);
    const m = B.liquidGlow ? new THREE.MeshBasicMaterial({ color: '#ffffff', map: t }) : tmat('#ffffff', t);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, (y1 - y0) * D), m);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set((x0 + x1) / 2, -0.32, ((y0 + y1) / 2) * D);
    plane.receiveShadow = true;
    root.add(plane);
  } else if (B.wall === 'solid') {
    const t = tex('floor', shade(B.wallTop, -0.1));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set((x1 - x0) / 5, ((y1 - y0) * D) / 5);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, (y1 - y0) * D), tmat('#ffffff', t));
    plane.rotation.x = -Math.PI / 2;
    plane.position.set((x0 + x1) / 2, FLOOR, ((y0 + y1) / 2) * D);
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
      column(root, x, y, top, deep, topMat, tmat('#ffffff', tex('side', sideCol)));
      if (B.wall === 'void') underside(root, B, x, y, deep, isHigh(c));
      edges(x, y, top, topOf);
      if (c === 'S') spawn(root, x, z, top);
      if (c === 'B') base(root, x, z, top);
      if (c === 'A') airSpawn(root, x, z, top + 0.05);
      if (c === 'h') prop(root, B.props, 'h', x, z, top, Math.min(room(x, y) - H_HIGH, 0.9), r);
      if (c === ',' && B.locked === 'planks' && bridgeLike(ch, x, y)) rails(root, B, x, z, ch, y);
    }
  }

  buildAo(root);
  return { root, W, H, bg: B.bg, sky: B.sky, x0, x1, y0, y1 };
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
  const geo = new RoundedBoxGeometry(1, h, D, 2, 0.03);
  // Box face order: +x, -x, +y, -y, +z, -z.
  const m = new THREE.Mesh(geo, [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]);
  m.position.set(x + 0.5, bottom + h / 2, y * D + D / 2);
  m.castShadow = true;
  m.receiveShadow = true;
  root.add(m);
  return m;
}

/** Contact shading on this tile's top along every edge that touches a taller neighbour. */
function edges(x, y, top, topOf) {
  const z0 = y * D, z1 = (y + 1) * D;
  const t = top + 0.004;
  const hi = (v) => v > top + 0.05;
  const w = 0.42;
  if (hi(topOf(x, y - 1))) aoStrip([x, t, z0], [x + 1, t, z0], [0, 0, w * D]);
  if (hi(topOf(x, y + 1))) aoStrip([x + 1, t, z1], [x, t, z1], [0, 0, -w * D]);
  if (hi(topOf(x - 1, y))) aoStrip([x, t, z1], [x, t, z0], [w, 0, 0]);
  if (hi(topOf(x + 1, y))) aoStrip([x + 1, t, z0], [x + 1, t, z1], [-w, 0, 0]);
  if (curB.wall !== 'liquid' || top < 0) return;
  // shoreline around land
  const L = -0.32, ly = L + 0.006, f = curB.liquidGlow ? 0.5 : 0.34;
  const wet = (v) => Math.abs(v - L) < 0.001;
  if (wet(topOf(x, y - 1))) shoreQuads.push({ a: [x + 1, ly, z0], b: [x, ly, z0], d: [0, 0, -f * D] });
  if (wet(topOf(x, y + 1))) shoreQuads.push({ a: [x, ly, z1], b: [x + 1, ly, z1], d: [0, 0, f * D] });
  if (wet(topOf(x - 1, y))) shoreQuads.push({ a: [x, ly, z0], b: [x, ly, z1], d: [-f, 0, 0] });
  if (wet(topOf(x + 1, y))) shoreQuads.push({ a: [x + 1, ly, z1], b: [x + 1, ly, z0], d: [f, 0, 0] });
}

// ---- wall tiles -----------------------------------------------------------------
function wallTile(root, B, x, y, out, room, r, topOf) {
  // No buildings or scenery on blocked tiles: a plain recessed floor (or the liquid / void backdrop) keeps the
  // playable tiles readable and leaves the screen to them.
  if (B.wall !== 'solid') return;
  edges(x, y, FLOOR, topOf);
}

// ---- props ------------------------------------------------------------------------
const OUT = { outlineScale: 1.07 };
function obox(parent, w, h, d, color, pos, t = 0.035, opts = {}) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.08), opts.material ?? tmat(color, opts.map ?? null, opts.emissive ?? null));
  m.position.set(...pos);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function shadowed(g) {
  g.traverse((o) => { if (o.isMesh && !o.material.isMeshBasicMaterial) { o.castShadow = true; o.receiveShadow = true; } });
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
  const geo = new THREE.DodecahedronGeometry(s, 1);
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
