import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Third take on the stage maps, after Arknights: square tiles seen through a perspective camera, worn concrete
// and asphalt instead of flat colours, raised deployment platforms, a red cube where enemies enter and a blue
// one on the point to defend. Every biome keeps that structure and changes the materials and the surroundings.

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
  const S = ['asphalt', 'terrain', 'water', 'lava', 'clouds', 'stars'].includes(kind) ? 1024 : 512;
  const [cv, g] = canvas(S);
  g.fillStyle = base;
  g.fillRect(0, 0, S, S);
  const frame = (inset, w, style) => { g.strokeStyle = style; g.lineWidth = w; g.strokeRect(inset, inset, S - inset * 2, S - inset * 2); };
  if (kind === 'terrain') {
    // natural ground (grass, sand, rock, snow): mottled, no joints
    wear(g, S, 1.2);
    wear(g, S, 0.9);
    const tufts = Array.from({ length: 220 }, () => [rnd() * S, rnd() * S, 2 + rnd() * 5, rnd() < 0.5]);
    blurred(g, S, 1.2, (c) => {
      for (const [x, y, r, light] of tufts) {
        c.fillStyle = light ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.13)';
        c.beginPath();
        c.ellipse(x, y, r * 1.6, r, 0.5, 0, 7);
        c.fill();
      }
    });
    grit(g, S, 22);
  } else if (kind === 'water') {
    const patches = Array.from({ length: 14 }, () => [rnd() * S, rnd() * S, 90 + rnd() * 140, rnd() < 0.5]);
    blurred(g, S, 40, (c) => {
      for (const [x, y, r, light] of patches) {
        c.fillStyle = light ? 'rgba(255,255,255,0.1)' : 'rgba(0,10,40,0.16)';
        c.beginPath();
        c.ellipse(x, y, r, r * 0.6, 0, 0, 7);
        c.fill();
      }
    });
    const waves = Array.from({ length: 150 }, () => [rnd() * S, rnd() * S, 30 + rnd() * 60, rnd() * 0.5 - 0.25]);
    blurred(g, S, 5, (c) => {
      c.strokeStyle = 'rgba(255,255,255,0.15)';
      c.lineWidth = 7;
      c.lineCap = 'round';
      for (const [x, y, len, k] of waves) { c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + len / 2, y - 12 + k * 20, x + len, y + k * 10); c.stroke(); }
    });
    blurred(g, S, 1, (c) => {
      c.strokeStyle = 'rgba(255,255,255,0.26)';
      c.lineWidth = 2.5;
      c.lineCap = 'round';
      for (const [x, y, len] of waves.slice(0, 60)) { c.beginPath(); c.moveTo(x + 10, y + 26); c.quadraticCurveTo(x + len * 0.3, y + 20, x + len * 0.5, y + 26); c.stroke(); }
    });
  } else if (kind === 'lava') {
    const dark = Array.from({ length: 16 }, () => [rnd() * S, rnd() * S, 80 + rnd() * 150]);
    blurred(g, S, 30, (c) => {
      for (const [x, y, r] of dark) { c.fillStyle = 'rgba(20,4,4,0.35)'; c.beginPath(); c.ellipse(x, y, r, r * 0.7, 0, 0, 7); c.fill(); }
    });
    const cracks = Array.from({ length: 26 }, () => {
      let x = rnd() * S, y = rnd() * S, a = rnd() * 6.28;
      const pts = [[x, y]];
      for (let k = 0; k < 7; k++) { a += rnd() * 1.6 - 0.8; x += Math.cos(a) * (26 + rnd() * 40); y += Math.sin(a) * (26 + rnd() * 40); pts.push([x, y]); }
      return pts;
    });
    const stroke = (c) => { for (const pts of cracks) { c.beginPath(); c.moveTo(...pts[0]); for (const q of pts.slice(1)) c.lineTo(...q); c.stroke(); } };
    blurred(g, S, 9, (c) => { c.strokeStyle = 'rgba(255,110,20,0.75)'; c.lineWidth = 14; c.lineJoin = 'round'; stroke(c); });
    blurred(g, S, 1, (c) => { c.strokeStyle = '#ffd070'; c.lineWidth = 4; c.lineJoin = 'round'; stroke(c); });
  } else if (kind === 'clouds') {
    const puffs = Array.from({ length: 34 }, () => [rnd() * S, rnd() * S, 30 + rnd() * 90, 0.2 + rnd() * 0.4]);
    blurred(g, S, 22, (c) => {
      for (const [x, y, r, a] of puffs) { c.fillStyle = `rgba(255,255,255,${a})`; c.beginPath(); c.ellipse(x, y, r * 1.7, r, 0, 0, 7); c.fill(); }
    });
  } else if (kind === 'stars') {
    const neb = Array.from({ length: 6 }, () => [rnd() * S, rnd() * S, 120 + rnd() * 160, rnd() < 0.5]);
    blurred(g, S, 50, (c) => {
      for (const [x, y, r, k] of neb) { c.fillStyle = k ? 'rgba(90,70,170,0.3)' : 'rgba(40,120,180,0.26)'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
    });
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(225,238,255,${0.3 + rnd() * 0.7})`;
      g.beginPath();
      g.arc(rnd() * S, rnd() * S, rnd() < 0.1 ? 2.4 : 1.1, 0, 7);
      g.fill();
    }
  } else if (kind === 'planks') {
    for (let i = 0; i < 4; i++) {
      const y = i * (S / 4);
      const col = shade(base, i % 2 ? -0.08 : 0.04);
      const gr = g.createLinearGradient(0, y, 0, y + S / 4);
      gr.addColorStop(0, shade(col, 0.08));
      gr.addColorStop(1, shade(col, -0.12));
      g.fillStyle = gr;
      g.fillRect(0, y, S, S / 4);
      g.strokeStyle = 'rgba(0,0,0,0.12)';
      g.lineWidth = 2;
      for (let k = 0; k < 6; k++) {
        const yy = y + 12 + rnd() * (S / 4 - 24);
        g.beginPath(); g.moveTo(0, yy); g.bezierCurveTo(S * 0.3, yy + rnd() * 12 - 6, S * 0.7, yy + rnd() * 12 - 6, S, yy); g.stroke();
      }
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(0, y, S, 7);
      g.fillRect(((i * 211) % 360) + 40, y + 7, 6, S / 4 - 7);
    }
    wear(g, S, 0.6);
    grit(g, S, 14);
  } else if (kind === 'metal') {
    wear(g, S, 0.4);
    grit(g, S, 10);
    frame(5, 10, 'rgba(0,0,0,0.5)');
    frame(14, 3, 'rgba(255,255,255,0.12)');
    g.strokeStyle = 'rgba(0,0,0,0.25)';
    g.lineWidth = 5;
    g.beginPath(); g.moveTo(S / 2, 16); g.lineTo(S / 2, S - 16); g.stroke();
    g.fillStyle = 'rgba(0,0,0,0.35)';
    for (const [x, y] of [[44, 44], [S - 44, 44], [44, S - 44], [S - 44, S - 44]]) { g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); }
    g.fillStyle = accent;
    g.shadowColor = accent;
    g.shadowBlur = 22;
    g.fillRect(S / 2 - 90, S / 2 - 7, 180, 14);
    g.shadowBlur = 0;
  } else if (kind === 'grate') {
    g.fillStyle = shade(base, -0.55);
    g.fillRect(0, 0, S, S);
    for (let i = 26; i < S - 20; i += 52) {
      const gr = g.createLinearGradient(i, 0, i + 30, 0);
      gr.addColorStop(0, shade(base, 0.2));
      gr.addColorStop(1, shade(base, -0.15));
      g.fillStyle = gr;
      g.fillRect(i, 18, 30, S - 36);
    }
    grit(g, S, 12);
    frame(6, 14, 'rgba(0,0,0,0.55)');
  } else if (kind === 'asphalt') {
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
function foamMat(color, glowing) {
  const c = new THREE.Color(color);
  const rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`;
  const cv = document.createElement('canvas');
  cv.width = 4; cv.height = 64;
  const g = cv.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, `rgba(${rgb},0.85)`);
  gr.addColorStop(0.3, `rgba(${rgb},0.32)`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr;
  g.fillRect(0, 0, 4, 64);
  const t = new THREE.CanvasTexture(cv);
  const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  m.userData.glow = glowing;
  return m;
}
const aoMat = new THREE.MeshBasicMaterial({ map: stripTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });

// ---- palettes -------------------------------------------------------------------------
// around: what surrounds the tiles. kind 'ground' (solid floor at tile level), 'liquid' or 'void' (far below).
// ground / high: tile top colours; tile: top texture of walkable tiles; locked: texture of no-deploy lanes.
export const STYLES = {
  city: { bg: '#0c0e13', around: ['ground', 'asphalt', '#30333a'], ground: '#74787f', high: '#b1b2ae', side: '#85878a', tile: 'ground', locked: 'locked', accent: '#e2b23c',
    prop: 'crate', sky: [0xcfd8ff, 0x2a2622], sun: 0xffe6c8 },
  forest: { bg: '#0b120c', around: ['ground', 'terrain', '#3d5a30'], ground: '#a08a66', high: '#8f9a80', side: '#6c6a58', tile: 'ground', locked: 'planks', plank: '#7c5c3c', accent: '#e8dc8a',
    prop: 'tree', leaf: '#4f8a3c', sky: [0xe8ffd8, 0x2a3020], sun: 0xfff2d0 },
  desert: { bg: '#1c140c', around: ['ground', 'terrain', '#b89562'], ground: '#d9c08e', high: '#c9a66e', side: '#9a7a4c', tile: 'ground', locked: 'locked', accent: '#a04a24',
    prop: 'rock', rock: '#a8845a', sky: [0xfff2d8, 0x5a4030], sun: 0xffe8c0 },
  ice: { bg: '#0a121c', around: ['liquid', 'water', '#3a6f96'], ground: '#dfe8f0', high: '#b4d4ea', side: '#7fa3c0', tile: 'ground', locked: 'planks', plank: '#7a6a5a', accent: '#3c7bb8',
    prop: 'crystal', crystal: '#a8e4ff', foam: '#ffffff', sky: [0xe8f4ff, 0x40506a], sun: 0xf4f8ff },
  lava: { bg: '#120806', around: ['liquid', 'lava', '#4a160c'], ground: '#5e5552', high: '#7c716c', side: '#463e3c', tile: 'ground', locked: 'grate', plank: '#4a4442', accent: '#ff8a3a',
    prop: 'rock', rock: '#2e2826', glowLiquid: true, foam: '#ffb040', sky: [0xffd0b0, 0x3a1c16], sun: 0xffd8b0 },
  swamp: { bg: '#0a100c', around: ['liquid', 'water', '#34503a'], ground: '#7c6242', high: '#7d8a62', side: '#5a5340', tile: 'planks', locked: 'planks', plank: '#5f4a30', accent: '#c8e070',
    prop: 'tree', leaf: '#4a6a38', foam: '#b8c8a0', sky: [0xe0f0d0, 0x283226], sun: 0xf0f0d0 },
  sky: { bg: '#8fc6ee', around: ['void', 'clouds', '#8ec6ef', -5], ground: '#d2c8b0', high: '#9cb884', side: '#8a7a60', tile: 'ground', locked: 'planks', plank: '#a07a50', accent: '#ffffff',
    prop: 'tree', leaf: '#6fbf4f', sky: [0xffffff, 0x8aa0b8], sun: 0xfff6e0 },
  sea: { bg: '#082030', around: ['liquid', 'water', '#2487b6'], ground: '#e2cf9c', high: '#a9b89a', side: '#9a8a62', tile: 'ground', locked: 'planks', plank: '#9a7650', accent: '#ffffff',
    prop: 'tree', leaf: '#4f9a3a', foam: '#ffffff', sky: [0xf0faff, 0x305070], sun: 0xfff2dc },
  ruins: { bg: '#0a1210', around: ['liquid', 'water', '#2f6f76'], ground: '#a39d8a', high: '#8e9a78', side: '#6a6656', tile: 'ground', locked: 'planks', plank: '#7e6a50', accent: '#d8c27a',
    prop: 'pillar', foam: '#d0e8e0', sky: [0xeaf5e8, 0x2c3a36], sun: 0xf6f0dc },
  tech: { bg: '#05070f', around: ['void', 'stars', '#0a0f22', -6], ground: '#8a94a4', high: '#5f6a7c', side: '#3c4350', tile: 'metal', locked: 'grate', plank: '#6a7280', accent: '#5fe0ff',
    prop: 'crate', sky: [0xd8ecff, 0x1c2434], sun: 0xe8f0ff },
  canyon: { bg: '#140806', around: ['void', 'terrain', '#3a1810', -4.5], ground: '#c98052', high: '#b0694a', side: '#7c4028', tile: 'ground', locked: 'planks', plank: '#8a6040', accent: '#ffe0a0',
    prop: 'rock', rock: '#8e4a30', sky: [0xffe8d0, 0x4a2418], sun: 0xffe0b8 },
  cave: { bg: '#08070c', around: ['ground', 'terrain', '#2c2a36'], ground: '#666272', high: '#7d778c', side: '#4a4656', tile: 'ground', locked: 'grate', plank: '#4a4652', accent: '#7ef0ff',
    prop: 'crystal', crystal: '#7ef0ff', sky: [0xb8c0ff, 0x1c1826], sun: 0xd8d8ff },
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
  const shore = { pos: [], uv: [], idx: [] };

  // surroundings
  const [aroundKind, aroundTex, aroundCol, depth] = P.around;
  const liquid = aroundKind === 'liquid', empty = aroundKind === 'void';
  const AROUND_Y = liquid ? -0.22 : empty ? depth : 0;
  const at = tex(aroundTex, aroundCol);
  at.wrapS = at.wrapT = THREE.RepeatWrapping;
  const span = empty ? 120 : 60;
  at.repeat.set((W + span) / (empty ? 14 : 6), (H + span) / (empty ? 14 : 6));
  const flat = empty || P.glowLiquid;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W + span, H + span), flat ? new THREE.MeshBasicMaterial({ map: at }) : lit(at, liquid ? 0.35 : 0.95));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(W / 2, AROUND_Y, H / 2);
  floor.receiveShadow = true;
  root.add(floor);
  const baseOf = (x, y) => (walk(ch(x, y)) ? topOf(x, y) : AROUND_Y);

  const ao = { pos: [], uv: [], idx: [] };
  const quad = (buf, a, b, d) => {
    const i = buf.pos.length / 3;
    buf.pos.push(...a, ...b, b[0] + d[0], b[1], b[2] + d[2], a[0] + d[0], a[1], a[2] + d[2]);
    buf.uv.push(0, 1, 1, 1, 1, 0, 0, 0);
    buf.idx.push(i, i + 2, i + 1, i, i + 3, i + 2, i, i + 1, i + 2, i, i + 2, i + 3);
  };
  const strip = (a, b, d) => quad(ao, a, b, d);

  for (let y = -1; y <= H; y++) {
    for (let x = -1; x <= W; x++) {
      const c = ch(x, y);
      const top = baseOf(x, y);
      // contact shadow on this cell along every taller neighbour (not on a void far below)
      const t = top + 0.004, w = 0.45;
      const hi = (v) => v > top + 0.2 && !(empty && !walk(c));
      if (hi(baseOf(x, y - 1))) strip([x, t, y], [x + 1, t, y], [0, 0, w]);
      if (hi(baseOf(x, y + 1))) strip([x + 1, t, y + 1], [x, t, y + 1], [0, 0, -w]);
      if (hi(baseOf(x - 1, y))) strip([x, t, y + 1], [x, t, y], [w, 0, 0]);
      if (hi(baseOf(x + 1, y))) strip([x + 1, t, y], [x + 1, t, y + 1], [-w, 0, 0]);
      if (c === 'A') marker(root, x + 0.5, Math.max(AROUND_Y, -0.3) + 0.55, y + 0.5, '#ff3b3b', 'air');
      if (!walk(c)) continue;
      if (liquid) {
        // foam (or embers) where the block meets the liquid
        const ly = AROUND_Y + 0.006, f = P.glowLiquid ? 0.5 : 0.3;
        const wet = (xx, yy) => !walk(ch(xx, yy));
        if (wet(x, y - 1)) quad(shore, [x + 1, ly, y], [x, ly, y], [0, 0, -f]);
        if (wet(x, y + 1)) quad(shore, [x, ly, y + 1], [x + 1, ly, y + 1], [0, 0, f]);
        if (wet(x - 1, y)) quad(shore, [x, ly, y], [x, ly, y + 1], [-f, 0, 0]);
        if (wet(x + 1, y)) quad(shore, [x + 1, ly, y + 1], [x + 1, ly, y], [f, 0, 0]);
      }
      const v = Math.floor(hash(x, y) * 4);
      let topMat;
      if (isHigh(c)) topMat = lit(tex('high', P.high, v, P.accent));
      else if (c === ',') topMat = lit(tex(P.locked, P.locked === 'locked' ? P.ground : P.plank, v % 2, P.accent));
      else topMat = lit(tex(P.tile, P.tile === 'planks' ? P.plank : shade(P.ground, (hash(x, y, 2) - 0.5) * 0.08), v, P.accent));
      const sideMat = lit(tex('side', isHigh(c) ? P.side : shade(P.side, -0.25)));
      const h = top + (empty ? 0.7 : 0.5);
      const geo = new RoundedBoxGeometry(1, h, 1, 2, isHigh(c) ? 0.03 : 0.014);
      const m = new THREE.Mesh(geo, [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]);
      m.position.set(x + 0.5, top - h / 2, y + 0.5);
      m.castShadow = true;
      m.receiveShadow = true;
      root.add(m);
      if (c === 'S') marker(root, x + 0.5, top, y + 0.5, '#ff3b3b', 'in');
      if (c === 'B') marker(root, x + 0.5, top, y + 0.5, '#3ba0ff', 'base');
      if (c === 'h') prop(root, P, x + 0.5, top, y + 0.5, hash(x, y, 5));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(ao.pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(ao.uv, 2));
  g.setIndex(ao.idx);
  const aoMesh = new THREE.Mesh(g, aoMat);
  aoMesh.renderOrder = 1;
  root.add(aoMesh);
  if (shore.pos.length) {
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(shore.pos, 3));
    sg.setAttribute('uv', new THREE.Float32BufferAttribute(shore.uv, 2));
    sg.setIndex(shore.idx);
    const sm = new THREE.Mesh(sg, foamMat(P.foam ?? '#ffffff', !!P.glowLiquid));
    sm.renderOrder = 1;
    root.add(sm);
  }
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
  // floor glow (ground points only: the air entry floats)
  if (kind !== 'air') {
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), glow(color, 0.3));
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.012;
    g.add(pad);
  } else g.scale.setScalar(0.8);
  // symbol on a plane facing the camera side (+z), tilted back a little
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  c.strokeStyle = c.fillStyle = '#ffffff';
  c.lineWidth = 12;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  if (kind === 'in' || kind === 'air') {
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

/** Blocked platform: something stands on it, so it reads as "no operator here". */
function prop(root, P, x, y, z, r) {
  const add = (geo, col, px, py, pz, opts = {}) => {
    const m = new THREE.Mesh(geo, opts.glow ? glow(col) : new THREE.MeshStandardMaterial({ color: col, roughness: opts.rough ?? 0.85, flatShading: !!opts.flat }));
    m.position.set(x + px, y + py, z + pz);
    m.rotation.set(opts.rx ?? 0, opts.ry ?? 0, opts.rz ?? 0);
    if (!opts.glow) m.castShadow = m.receiveShadow = true;
    root.add(m);
    return m;
  };
  switch (P.prop) {
    case 'tree':
      add(new THREE.CylinderGeometry(0.05, 0.08, 0.5, 8), '#6a4a30', 0, 0.25, 0);
      add(new THREE.IcosahedronGeometry(0.3, 1), P.leaf, 0, 0.62, 0, { flat: true });
      add(new THREE.IcosahedronGeometry(0.2, 1), shade(P.leaf, 0.12), 0.14, 0.8, 0.06, { flat: true });
      add(new THREE.IcosahedronGeometry(0.18, 1), shade(P.leaf, -0.12), -0.16, 0.72, -0.04, { flat: true });
      break;
    case 'rock':
      add(new THREE.DodecahedronGeometry(0.28, 0), P.rock, -0.05, 0.16, 0, { flat: true, ry: r * 3 });
      add(new THREE.DodecahedronGeometry(0.16, 0), shade(P.rock, 0.1), 0.24, 0.09, 0.12, { flat: true, ry: r * 5 });
      break;
    case 'crystal':
      add(new THREE.ConeGeometry(0.13, 0.62, 6), P.crystal, -0.08, 0.31, 0, { glow: true, rz: 0.12 });
      add(new THREE.ConeGeometry(0.09, 0.42, 6), shade(P.crystal, 0.3), 0.16, 0.21, 0.08, { glow: true, rz: -0.25 });
      add(new THREE.ConeGeometry(0.07, 0.3, 6), P.crystal, -0.22, 0.15, 0.14, { glow: true, rz: 0.4 });
      break;
    case 'pillar':
      add(new THREE.CylinderGeometry(0.15, 0.17, 0.5, 12), '#b5ae98', 0, 0.25, 0);
      add(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 12), '#a8a28c', 0, 0.03, 0);
      add(new THREE.DodecahedronGeometry(0.13, 0), '#a8a28c', 0.05, 0.55, 0, { flat: true, ry: r * 3 });
      break;
    default:
      add(new RoundedBoxGeometry(0.5, 0.36, 0.42, 2, 0.02), P.accent === '#5fe0ff' ? '#3a4350' : '#5e6a58', -0.12, 0.18, 0.05, { ry: r * 0.6 - 0.3 });
      add(new RoundedBoxGeometry(0.3, 0.26, 0.3, 2, 0.02), P.accent === '#5fe0ff' ? '#2c323e' : '#8a7350', 0.26, 0.13, -0.16, { ry: r * 1.2 });
      if (P.accent === '#5fe0ff') add(new THREE.BoxGeometry(0.3, 0.03, 0.02), P.accent, -0.12, 0.26, 0.27, { glow: true });
  }
}
