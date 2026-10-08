import * as THREE from 'three';
import { G, part, group, limb, head, hair, body, arms, HEAD_R, HEAD_Y } from './kit.js';

// ---------------------------------------------------------------------------
// Shared props

function scarf(root, color, tail = true) {
  part(root, G.torus(0.21, 0.085), color, [0, 0.93, 0.02], [Math.PI / 2 - 0.15, 0, 0], [1.05, 1, 0.75]);
  if (tail) limb(root, [0.12, 0.92, 0.2], [0.2, 0.62, 0.3], 0.06, color);
}
function belt(root, color, buckle = '#d9ad52') {
  part(root, G.cyl(0.31, 0.31, 0.06, 24), color, [0, 0.52, 0]);
  part(root, G.box(0.1, 0.08, 0.04), buckle, [0, 0.52, 0.3]);
}
function sword(parent, at, rot) {
  const g = group(parent, at, rot);
  part(g, G.cyl(0.035, 0.035, 0.22), '#5a3a28', [0, -0.05, 0]);
  part(g, G.box(0.26, 0.05, 0.07), '#d9ad52', [0, 0.07, 0]);
  part(g, G.box(0.09, 0.95, 0.025), '#e3e9f1', [0, 0.57, 0]);
  return g;
}
function dagger(parent, at, rot) {
  const g = group(parent, at, rot);
  part(g, G.cyl(0.03, 0.03, 0.14), '#3b3030', [0, 0, 0]);
  part(g, G.box(0.14, 0.04, 0.05), '#f07a2a', [0, 0.08, 0]);
  part(g, G.cone(0.05, 0.42, 4), '#e3e9f1', [0, 0.3, 0], [0, Math.PI / 4, 0], [1, 1, 0.35]);
  return g;
}
function rifle(parent, at, rot, color = '#3a3f4a', len = 1.1, wood = '#5a3e2a') {
  const g = group(parent, at, rot);
  part(g, G.box(0.09, 0.11, 0.5), wood, [0, -0.02, -0.25]);
  part(g, G.box(0.08, 0.1, 0.45), color, [0, 0.01, 0.2]);
  part(g, G.cyl(0.03, 0.03, len * 0.6), color, [0, 0.03, 0.4 + len * 0.3], [Math.PI / 2, 0, 0]);
  part(g, G.cyl(0.045, 0.045, 0.28), '#1f2228', [0, 0.11, 0.12], [Math.PI / 2, 0, 0]);
  part(g, G.box(0.05, 0.14, 0.07), color, [0, -0.08, 0.12]);
  return g;
}
function helmet(h, color, visor = '#14161c', glow = '#8fdcff', opts = {}) {
  part(h, G.sphere(HEAD_R * 1.1), color, [0, 0.05, -0.02], [0, 0, 0], [1.02, 1, 1.02]);
  if (opts.jaw !== false) part(h, G.sphere(HEAD_R * 0.9), color, [0, -0.25, 0.05], [0, 0, 0], [1.02, 0.55, 1.0]);
  // curved visor strip across the front of the helmet
  const band = (r, t0, t1, c, o) => {
    const geo = new THREE.SphereGeometry(r, 40, 6, Math.PI * 0.08, Math.PI * 0.84, Math.PI * t0, Math.PI * (t1 - t0));
    const m = part(h, geo, c, [0, 0.05, -0.02], [0, 0, 0], [1.02, 1, 1.02], { outline: false, ...o });
    m.material = m.material.clone();
    m.material.side = THREE.DoubleSide;
    return m;
  };
  band(HEAD_R * 1.14, 0.44, 0.6, visor, {});
  band(HEAD_R * 1.155, 0.49, 0.52, glow, { glow: true });
  if (opts.cross) {
    part(h, G.box(0.08, 0.26, 0.04), opts.cross, [0, 0.44, 0.44], [-0.75, 0, 0], [1, 1, 1], { glow: true, outline: false });
    part(h, G.box(0.26, 0.08, 0.04), opts.cross, [0, 0.44, 0.44], [-0.75, 0, 0], [1, 1, 1], { glow: true, outline: false });
  }
}
function towerShield(parent, at, color, emblem) {
  const g = group(parent, at, [0, 0.35, 0]);
  part(g, G.box(0.62, 0.95, 0.08), color, [0, 0, 0]);
  part(g, G.box(0.5, 0.83, 0.1), '#c4cbd6', [0, 0, 0.0]);
  part(g, G.box(0.12, 0.42, 0.04), emblem, [0, 0.05, 0.07]);
  part(g, G.box(0.36, 0.12, 0.04), emblem, [0, 0.12, 0.07]);
  return g;
}

// ---------------------------------------------------------------------------
// Resistance operators

function brasa() {
  const root = new THREE.Group();
  const c = { skin: '#f6d2b8', hair: '#b8442b', iris: '#e23b3b', coat: '#3d3947', pants: '#2c2933', boots: '#1f1d24' };
  body(root, c, { longCoat: true, flare: 0.42 });
  belt(root, '#26232b');
  scarf(root, '#cc3138');
  arms(root, c, { r: [[0.46, 0.75, 0.15], [0.42, 0.66, 0.38]] });
  sword(root, [0.42, 0.66, 0.38], [0.9, 0, -0.35]);
  const h = head(root, c);
  hair(h, c.hair, { bangs: 5, side: 0.3 });
  for (const [x, y, z, rx, rz] of [[0.05, 0.56, -0.05, -0.4, -0.2], [-0.25, 0.48, 0.05, 0.1, 0.6], [0.28, 0.46, 0.05, 0.1, -0.6]]) part(h, G.cone(0.13, 0.32), c.hair, [x, y, z], [rx, 0, rz]);
  limb(h, [0, 0.05, -0.52], [-0.02, -0.5, -0.75], 0.13, c.hair);
  part(h, G.torus(0.1, 0.035), '#cc3138', [0, 0.0, -0.55], [0.3, 0, 0]);
  return root;
}

function faisca() {
  const root = new THREE.Group();
  const c = { skin: '#f6d2b8', hair: '#f2c64a', iris: '#ff8a2a', coat: '#54473f', pants: '#2c2933', boots: '#2a2420' };
  body(root, c);
  part(root, G.box(0.18, 0.4, 0.05), '#f2f0ea', [0, 0.74, 0.3]);
  for (const s of [-1, 1]) part(root, G.box(0.05, 0.42, 0.05), '#f2802c', [s * 0.12, 0.74, 0.3]);
  belt(root, '#3b3030', '#f2802c');
  arms(root, c, { r: [[0.47, 0.72, 0.12], [0.45, 0.58, 0.3]] });
  dagger(root, [0.45, 0.58, 0.3], [2.4, 0, 0.3]);
  const h = head(root, c);
  hair(h, c.hair, { bangs: 4, side: 0.15, bangLen: 0.3 });
  for (let i = 0; i < 7; i++) {
    const a = (i / 6 - 0.5) * 2.4;
    part(h, G.cone(0.14, 0.46), c.hair, [Math.sin(a) * 0.4, 0.58 - Math.abs(a) * 0.08, Math.cos(a) * 0.06 - 0.12], [-0.35, 0, -a * 0.8]);
  }
  // goggles on the forehead
  part(h, G.torus(0.47, 0.03), '#3b3030', [0, 0.22, -0.02], [Math.PI / 2 - 0.25, 0, 0]);
  for (const s of [-1, 1]) {
    part(h, G.cyl(0.1, 0.1, 0.08), '#3b3030', [s * 0.17, 0.3, 0.42], [Math.PI / 2 - 0.5, 0, 0]);
    part(h, G.cyl(0.075, 0.075, 0.09), '#6fd0ff', [s * 0.17, 0.3, 0.43], [Math.PI / 2 - 0.5, 0, 0], [1, 1, 1], { glow: true, outline: false });
  }
  return root;
}

function muralha() {
  const root = new THREE.Group();
  const c = { skin: '#f6d2b8', hair: '#3e3946', iris: '#6a8fd0', coat: '#8f98a6', pants: '#5a6370', boots: '#4a515c', sleeve: '#7b8492' };
  body(root, c);
  for (const s of [-1, 1]) part(root, G.sphere(0.2), '#b3bcc8', [s * 0.36, 0.92, 0], [0, 0, s * 0.3], [1, 0.7, 1]);
  part(root, G.box(0.42, 0.3, 0.08), '#b3bcc8', [0, 0.78, 0.28]);
  part(root, G.box(0.08, 0.2, 0.04), '#cc3138', [0, 0.8, 0.33]);
  belt(root, '#3e3a48');
  arms(root, c, { r: [[0.44, 0.74, 0.18], [0.36, 0.66, 0.42]] });
  towerShield(root, [0.32, 0.6, 0.55], '#6e7784', '#cc3138');
  const h = head(root, c);
  hair(h, c.hair, { bangs: 5, side: 0.12, bangLen: 0.28 });
  return root;
}

function bastiao() {
  const root = new THREE.Group();
  const c = { skin: '#f0c9a8', hair: '#6e4a2e', iris: '#3f9a5e', coat: '#a87a3e', pants: '#4a3420', boots: '#5e3c24', sleeve: '#8a5a3a' };
  body(root, c);
  part(root, G.box(0.46, 0.34, 0.1), '#d9a75c', [0, 0.78, 0.26]);
  for (const s of [-1, 1]) part(root, G.sphere(0.21), '#d9a75c', [s * 0.36, 0.92, 0], [0, 0, s * 0.3], [1, 0.7, 1]);
  belt(root, '#3a2616');
  arms(root, c, { l: [[-0.5, 0.75, 0.1], [-0.46, 0.62, 0.3]], r: [[0.5, 0.95, 0.05], [0.42, 1.2, 0.15]] });
  // round shield on the left arm
  const sh = group(root, [-0.55, 0.65, 0.32], [0, -0.6, 0]);
  part(sh, G.cyl(0.3, 0.3, 0.07, 32), '#9b6a3e', [0, 0, 0], [Math.PI / 2, 0, 0]);
  part(sh, G.cyl(0.24, 0.24, 0.08, 32), '#c8955a', [0, 0, 0.005], [Math.PI / 2, 0, 0]);
  part(sh, G.box(0.06, 0.24, 0.04), '#cc3138', [0, 0, 0.05]);
  part(sh, G.box(0.24, 0.06, 0.04), '#cc3138', [0, 0, 0.05]);
  // mace raised
  const m = group(root, [0.42, 1.2, 0.15], [0.2, 0, -0.3]);
  part(m, G.cyl(0.035, 0.035, 0.6), '#6b4a33', [0, 0.2, 0]);
  part(m, G.sphere(0.13, 16), '#9aa3b0', [0, 0.52, 0]);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    part(m, G.cone(0.04, 0.12, 6), '#c4cbd6', [Math.cos(a) * 0.14, 0.52, Math.sin(a) * 0.14], [0, -a, Math.PI / 2]);
  }
  const h = head(root, c);
  hair(h, c.hair, { bangs: 3, side: 0.1, bangLen: 0.22 });
  // short beard
  part(h, G.sphere(0.3), c.hair, [0, -0.32, 0.22], [0, 0, 0], [1.1, 0.5, 0.7]);
  return root;
}

function lirio() {
  const root = new THREE.Group();
  const c = { skin: '#f8dbc6', hair: '#e3dcef', iris: '#3fc286', coat: '#f4f5f8', pants: '#3a3644', boots: '#3a3644' };
  body(root, c, { longCoat: true, flare: 0.5 });
  part(root, G.box(0.06, 0.2, 0.04), '#d6333b', [0.1, 0.8, 0.31]);
  part(root, G.box(0.18, 0.06, 0.04), '#d6333b', [0.1, 0.8, 0.31]);
  part(root, G.cyl(0.1, 0.1, 0.1), '#d6333b', [-0.42, 0.78, 0]);
  arms(root, c, { r: [[0.45, 0.72, 0.12], [0.44, 0.56, 0.22]] });
  const kit = group(root, [0.5, 0.42, 0.25], [0, -0.3, 0]);
  part(kit, G.box(0.34, 0.26, 0.18), '#f4f4f6');
  part(kit, G.box(0.07, 0.17, 0.02), '#d6333b', [0, 0, 0.1]);
  part(kit, G.box(0.17, 0.07, 0.02), '#d6333b', [0, 0, 0.1]);
  part(kit, G.torus(0.07, 0.02, Math.PI), '#9aa2ae', [0, 0.14, 0]);
  const h = head(root, c);
  hair(h, c.hair, { bangs: 6, side: 0.75, back: 1.1 });
  limb(h, [0, -0.05, -0.45], [0, -0.85, -0.5], 0.3, c.hair);
  part(h, G.sphere(0.07), '#d6333b', [0.3, 0.32, 0.25]);
  return root;
}

function corvo() {
  const root = new THREE.Group();
  const c = { skin: '#f3cfb4', hair: '#24212b', iris: '#9aa3b5', coat: '#24212b', pants: '#1c1a20', boots: '#141217' };
  body(root, c, { longCoat: true, flare: 0.46 });
  part(root, G.torus(0.22, 0.1), '#cc3138', [0, 0.97, 0.03], [Math.PI / 2 - 0.1, 0, 0], [1, 1, 0.9]);
  limb(root, [-0.12, 0.95, -0.2], [-0.2, 0.55, -0.32], 0.07, '#cc3138');
  arms(root, c, { r: [[0.4, 0.78, 0.25], [0.28, 0.78, 0.5]], l: [[-0.25, 0.78, 0.25], [0.0, 0.8, 0.55]] });
  rifle(root, [0.12, 0.84, 0.45], [0, 0, 0], '#2f343d', 1.25);
  const h = head(root, c);
  hair(h, c.hair, { bangs: 6, side: 0.35, bangLen: 0.42 });
  for (const [x, z, r] of [[-0.3, -0.2, 0.8], [0.0, -0.32, 0], [0.3, -0.2, -0.8]]) part(h, G.cone(0.14, 0.34), c.hair, [x, 0.3, z], [-1.2, 0, r]);
  part(h, G.sphere(0.27), '#cc3138', [0, -0.33, 0.24], [0, 0, 0], [1.25, 0.55, 0.8]);
  return root;
}

function falcao() {
  const root = new THREE.Group();
  const c = { skin: '#f3cfb4', hair: '#a9a9b2', iris: '#e0b23a', coat: '#6a5c48', pants: '#3b342a', boots: '#2a241d' };
  body(root, c);
  part(root, G.box(0.5, 0.06, 0.4), '#cc3138', [0, 0.95, 0.05]);
  for (const s of [-1, 1]) part(root, G.box(0.12, 0.14, 0.06), '#5a4f40', [s * 0.15, 0.68, 0.3]);
  belt(root, '#2a241d');
  arms(root, c, { r: [[0.45, 0.78, 0.2], [0.35, 0.95, 0.42]], l: [[-0.3, 0.7, 0.3], [0.1, 0.72, 0.45]] });
  rifle(root, [0.22, 0.85, 0.45], [-0.95, 0.2, 0], '#40454f', 1.3);
  const h = head(root, c);
  hair(h, c.hair, { bangs: 4, side: 0.18, bangLen: 0.25 });
  part(h, G.torus(0.48, 0.035), '#3b3030', [0, 0.2, -0.03], [Math.PI / 2 - 0.3, 0, 0]);
  for (const s of [-1, 1]) {
    part(h, G.cyl(0.11, 0.11, 0.09), '#3b3030', [s * 0.18, 0.3, 0.42], [Math.PI / 2 - 0.55, 0, 0]);
    part(h, G.cyl(0.085, 0.085, 0.1), '#ffb347', [s * 0.18, 0.3, 0.43], [Math.PI / 2 - 0.55, 0, 0], [1, 1, 1], { glow: true, outline: false });
  }
  return root;
}

function trovao() {
  const root = new THREE.Group();
  const c = { skin: '#efc6a6', hair: '#7a5a3a', iris: '#d0763a', coat: '#626b41', pants: '#41482b', boots: '#2f3320' };
  body(root, c);
  part(root, G.box(0.5, 0.08, 0.06), '#f2c94c', [0, 0.64, 0.3]);
  for (let i = 0; i < 4; i++) part(root, G.cyl(0.035, 0.035, 0.1), '#c87a2a', [-0.15 + i * 0.1, 0.72, 0.31]);
  belt(root, '#2f3320');
  arms(root, c, { r: [[0.55, 0.85, 0.1], [0.55, 0.98, 0.35]], l: [[-0.3, 0.75, 0.25], [0.3, 0.9, 0.35]] });
  const l = group(root, [0.62, 1.05, 0.0], [0, 0, 0]);
  part(l, G.cyl(0.14, 0.14, 1.4, 24), '#4a4f59', [0, 0, 0.2], [Math.PI / 2, 0, 0]);
  part(l, G.cyl(0.16, 0.16, 0.12, 24), '#2a2c32', [0, 0, 0.88], [Math.PI / 2, 0, 0]);
  part(l, G.cyl(0.1, 0.1, 0.13, 16), '#cc3138', [0, 0, 0.95], [Math.PI / 2, 0, 0], [1, 1, 1], { glow: true, outline: false });
  part(l, G.box(0.08, 0.2, 0.12), '#2a2c32', [0, -0.18, 0.1]);
  const h = head(root, c);
  hair(h, c.hair, { bangs: 3, side: 0.12, bangLen: 0.2 });
  // beanie
  part(h, G.sphere(HEAD_R * 1.12, 32), '#6f7a45', [0, 0.18, -0.05], [-0.15, 0, 0], [1.02, 0.85, 1.02]);
  part(h, G.torus(0.5, 0.07), '#4c5530', [0, 0.06, 0], [Math.PI / 2 - 0.15, 0, 0]);
  part(h, G.sphere(0.12), '#6f7a45', [0, 0.65, -0.12]);
  return root;
}

// ---------------------------------------------------------------------------
// Regime enemies

const WHITE = { skin: '#d9dbe0', coat: '#eef0f4', pants: '#c3c8d1', boots: '#2a2d35', gloves: '#3a3d46', sleeve: '#e2e5eb', face: false };

function soldier(c = WHITE, helmetColor = '#f4f6f9') {
  const root = new THREE.Group();
  body(root, c);
  part(root, G.box(0.44, 0.3, 0.08), '#d3d8e0', [0, 0.78, 0.27]);
  part(root, G.box(0.1, 0.05, 0.03), '#6fbfff', [0.12, 0.85, 0.32], [0, 0, 0], [1, 1, 1], { glow: true, outline: false });
  belt(root, '#2a2d35', '#6fbfff');
  for (const s of [-1, 1]) part(root, G.sphere(0.19), '#d3d8e0', [s * 0.36, 0.92, 0], [0, 0, s * 0.3], [1, 0.7, 1]);
  const h = head(root, { ...c, face: false });
  helmet(h, helmetColor);
  return root;
}

function peacekeeper() {
  const root = soldier();
  arms(root, WHITE, { r: [[0.46, 0.72, 0.12], [0.45, 0.56, 0.28]] });
  const b = group(root, [0.45, 0.56, 0.28], [1.1, 0, -0.2]);
  part(b, G.cyl(0.04, 0.04, 0.62), '#1d1f25', [0, 0.25, 0]);
  part(b, G.cyl(0.05, 0.05, 0.1), '#6fbfff', [0, 0.58, 0], [0, 0, 0], [1, 1, 1], { glow: true });
  return root;
}

function rifleman() {
  const c = { ...WHITE, coat: '#c4c9d2', pants: '#9ba2ae', sleeve: '#b4bac5' };
  const root = soldier(c, '#dfe3ea');
  arms(root, c, { r: [[0.4, 0.78, 0.25], [0.28, 0.78, 0.5]], l: [[-0.25, 0.78, 0.25], [0.0, 0.8, 0.55]] });
  rifle(root, [0.12, 0.84, 0.45], [0, 0, 0], '#2c2f36', 1.0, '#3a3d46');
  return root;
}

function riot() {
  const c = { skin: '#30333b', coat: '#30333b', pants: '#22242b', boots: '#14151a', gloves: '#14151a', sleeve: '#2a2c33', face: false };
  const root = new THREE.Group();
  body(root, c);
  for (const s of [-1, 1]) part(root, G.sphere(0.21), '#3e424c', [s * 0.36, 0.92, 0], [0, 0, s * 0.3], [1, 0.7, 1]);
  belt(root, '#14151a', '#6fbfff');
  arms(root, c, { r: [[0.44, 0.74, 0.18], [0.36, 0.66, 0.42]] });
  const h = head(root, c);
  helmet(h, '#2a2c33', '#0b0c0f', '#8fdcff');
  const sh = group(root, [0.25, 0.68, 0.58], [0, 0.35, 0]);
  part(sh, G.box(0.66, 1.15, 0.06), '#a9c6e8', [0, 0, 0], [0, 0, 0], [1, 1, 1], { opacity: 0.75 });
  part(sh, G.box(0.42, 0.06, 0.07), '#14161c', [0, 0.32, 0]);
  part(sh, G.box(0.72, 0.06, 0.08), '#4a6a94', [0, -0.56, 0]);
  return root;
}

function medic() {
  const root = soldier(WHITE, '#ffffff');
  const h = root.children.find((o) => o.isGroup && Math.abs(o.position.y - HEAD_Y) < 0.01);
  helmet(h, '#ffffff', '#14161c', '#8fdcff', { cross: '#4fb0ff' });
  part(root, G.box(0.06, 0.2, 0.04), '#4fb0ff', [-0.1, 0.78, 0.32], [0, 0, 0], [1, 1, 1], { glow: true, outline: false });
  part(root, G.box(0.18, 0.06, 0.04), '#4fb0ff', [-0.1, 0.78, 0.32], [0, 0, 0], [1, 1, 1], { glow: true, outline: false });
  arms(root, WHITE, { r: [[0.45, 0.72, 0.12], [0.44, 0.56, 0.22]] });
  const kit = group(root, [0.5, 0.42, 0.25], [0, -0.3, 0]);
  part(kit, G.box(0.34, 0.26, 0.18), '#f4f6f9');
  part(kit, G.box(0.07, 0.17, 0.02), '#4fb0ff', [0, 0, 0.1], [0, 0, 0], [1, 1, 1], { glow: true });
  part(kit, G.box(0.17, 0.07, 0.02), '#4fb0ff', [0, 0, 0.1], [0, 0, 0], [1, 1, 1], { glow: true });
  return root;
}

function incinerator() {
  const c = { skin: '#7d6650', coat: '#8a7258', pants: '#5a4838', boots: '#2a2420', gloves: '#3b2f24', sleeve: '#7d6650', face: false };
  const root = new THREE.Group();
  body(root, c);
  belt(root, '#2a2420', '#ffb347');
  // fuel tank on the back
  for (const s of [-1, 1]) part(root, G.capsule(0.12, 0.42), '#4a4e58', [s * 0.13, 0.82, -0.36]);
  limb(root, [0.13, 0.62, -0.36], [0.4, 0.5, 0.2], 0.03, '#2a2c32');
  arms(root, c, { r: [[0.42, 0.7, 0.2], [0.35, 0.62, 0.42]], l: [[-0.3, 0.68, 0.25], [0.05, 0.62, 0.45]] });
  const f = group(root, [0.2, 0.62, 0.45]);
  part(f, G.cyl(0.05, 0.06, 0.7), '#3a3e48', [0, 0, 0.25], [Math.PI / 2, 0, 0]);
  part(f, G.cyl(0.07, 0.07, 0.1), '#8a92a0', [0, 0, 0.62], [Math.PI / 2, 0, 0]);
  part(f, G.cone(0.16, 0.5, 16), '#ff8a1a', [0, 0, 0.92], [-Math.PI / 2, 0, 0], [1, 1, 1], { glow: true, outline: false, opacity: 0.9 });
  part(f, G.cone(0.08, 0.32, 16), '#ffe07a', [0, 0, 0.82], [-Math.PI / 2, 0, 0], [1, 1, 1], { glow: true, outline: false });
  const h = head(root, c);
  part(h, G.sphere(HEAD_R * 1.08), '#8a7258', [0, 0.02, -0.02]);
  for (const s of [-1, 1]) {
    part(h, G.cyl(0.13, 0.13, 0.1), '#2a2420', [s * 0.19, 0.0, 0.48], [Math.PI / 2, 0, 0]);
    part(h, G.cyl(0.1, 0.1, 0.11), '#ffb347', [s * 0.19, 0.0, 0.49], [Math.PI / 2, 0, 0], [1, 1, 1], { glow: true, outline: false });
  }
  part(h, G.cyl(0.11, 0.13, 0.22), '#3b3f48', [0, -0.28, 0.48], [Math.PI / 2 - 0.3, 0, 0]);
  return root;
}

function infiltrator() {
  const c = { skin: '#2a313d', coat: '#2a313d', pants: '#1d222b', boots: '#101216', gloves: '#101216', sleeve: '#252b35', face: false };
  const root = new THREE.Group();
  body(root, c);
  for (let i = 0; i < 6; i++) part(root, G.box(0.06, 0.06, 0.02), '#3e4a5c', [-0.18 + (i % 3) * 0.16, 0.65 + Math.floor(i / 3) * 0.18, 0.33], [0, 0, 0.785], [1, 1, 1], { outline: false });
  part(root, G.box(0.04, 0.4, 0.03), '#2fc8e0', [0.2, 0.75, 0.31], [0, 0, 0], [1, 1, 1], { glow: true, outline: false });
  belt(root, '#101216', '#2fc8e0');
  arms(root, c, { r: [[0.47, 0.72, 0.12], [0.45, 0.58, 0.3]] });
  const k = dagger(root, [0.45, 0.58, 0.3], [1.3, 0, -0.3]);
  k.children[1].material = k.children[1].material.clone();
  k.children[1].material.color.set('#2fc8e0');
  const h = head(root, c);
  part(h, G.sphere(HEAD_R * 1.14), '#232a35', [0, 0.06, -0.06]);
  part(h, G.sphere(HEAD_R * 0.82, 32), '#0a0b0e', [0, -0.05, 0.2], [0, 0, 0], [1, 0.82, 0.75], { outline: false });
  for (const s of [-1, 1]) part(h, G.box(0.14, 0.05, 0.03), '#7ff6ff', [s * 0.17, -0.02, 0.56], [0, 0, s * -0.15], [1, 1, 1], { glow: true, outline: false });
  part(h, G.cone(0.3, 0.4), '#232a35', [0, 0.1, -0.5], [-1.9, 0, 0]);
  return root;
}

function executor() {
  const c = { skin: '#33363e', coat: '#3a3e48', pants: '#272a31', boots: '#121317', gloves: '#121317', sleeve: '#33363e', face: false };
  const root = new THREE.Group();
  const inner = group(root, [0, 0, 0]);
  inner.scale.set(1.35, 1.2, 1.35);
  body(inner, c);
  for (const s of [-1, 1]) part(inner, G.sphere(0.24), '#4d525e', [s * 0.38, 0.92, 0], [0, 0, s * 0.3], [1.1, 0.8, 1.1]);
  part(inner, G.box(0.48, 0.34, 0.1), '#4d525e', [0, 0.76, 0.27]);
  part(inner, G.box(0.12, 0.05, 0.03), '#6fbfff', [0, 0.8, 0.33], [0, 0, 0], [1, 1, 1], { glow: true, outline: false });
  belt(inner, '#121317', '#6fbfff');
  arms(inner, c, { r: [[0.5, 0.95, 0.05], [0.42, 1.2, 0.15]] });
  const m = group(inner, [0.42, 1.2, 0.15], [0.25, 0, -0.35]);
  part(m, G.cyl(0.04, 0.04, 0.95), '#4a3a2c', [0, 0.3, 0]);
  part(m, G.box(0.5, 0.28, 0.28), '#9aa2ae', [0, 0.78, 0]);
  part(m, G.box(0.54, 0.06, 0.3), '#6fbfff', [0, 0.78, 0], [0, 0, 0], [1, 1, 1], { glow: true, outline: false });
  const h = head(inner, c);
  helmet(h, '#2e3139', '#0b0c0f', '#8fdcff');
  return root;
}

function cleric() {
  const root = new THREE.Group();
  const c = { skin: '#f2dccd', hair: '#15151a', iris: '#8fdcff', coat: '#18181e', pants: '#0f0f13', boots: '#0a0a0d', mouth: false, blush: false };
  body(root, c, { longCoat: true, flare: 0.44 });
  for (const s of [-1, 1]) part(root, G.box(0.18, 0.5, 0.06), '#18181e', [s * 0.16, 0.22, -0.3], [0.25, 0, s * 0.12]);
  part(root, G.torus(0.16, 0.06), '#f4f4f6', [0, 0.96, 0.03], [Math.PI / 2 - 0.15, 0, 0]);
  part(root, G.box(0.06, 0.5, 0.04), '#2c2c36', [0, 0.72, 0.32]);
  arms(root, c, { r: [[0.4, 0.75, 0.25], [0.12, 0.72, 0.5]], l: [[-0.4, 0.75, 0.25], [-0.12, 0.76, 0.5]] });
  for (const [x, ry] of [[0.12, -0.5], [-0.12, 0.5]]) {
    const g = group(root, [x, 0.74, 0.52], [0, ry, 0]);
    part(g, G.box(0.06, 0.08, 0.32), '#c9d1db', [0, 0.02, 0.12]);
    part(g, G.box(0.05, 0.14, 0.06), '#3a3e48', [0, -0.06, -0.02]);
  }
  const h = head(root, c);
  hair(h, c.hair, { bangs: 0, side: 0.0 });
  part(h, G.sphere(0.2), c.hair, [0.15, 0.38, 0.28], [0.4, 0, -0.5], [1.4, 0.5, 0.8]);
  for (const s of [-1, 1]) part(h, G.box(0.18, 0.03, 0.02), c.hair, [s * 0.19, 0.12, 0.47], [0, s * 0.3, s * 0.25], [1, 1, 1], { outline: false });
  return root;
}

function hound() {
  const root = new THREE.Group();
  const dark = '#3a3e48', plate = '#9aa4b4';
  part(root, G.capsule(0.22, 0.55), dark, [0, 0.62, 0], [Math.PI / 2, 0, 0], [1, 1, 0.95]);
  part(root, G.box(0.36, 0.1, 0.5), plate, [0, 0.82, 0.02]);
  part(root, G.box(0.1, 0.04, 0.3), '#6fbfff', [0, 0.88, 0.02], [0, 0, 0], [1, 1, 1], { glow: true, outline: false });
  for (const [x, z] of [[-0.14, 0.35], [0.14, 0.35], [-0.14, -0.3], [0.14, -0.3]]) {
    limb(root, [x, 0.55, z], [x, 0.08, z + 0.05], 0.07, dark);
    part(root, G.sphere(0.08), '#1b1d22', [x, 0.06, z + 0.09], [0, 0, 0], [1, 0.6, 1.4]);
  }
  limb(root, [0, 0.75, -0.55], [0, 0.95, -0.8], 0.05, dark);
  const h = group(root, [0, 0.95, 0.6]);
  part(h, G.sphere(0.24), dark, [0, 0, 0], [0, 0, 0], [0.9, 0.9, 1.1]);
  part(h, G.capsule(0.12, 0.2), dark, [0, -0.07, 0.25], [Math.PI / 2, 0, 0]);
  part(h, G.sphere(0.05), '#111215', [0, -0.03, 0.43]);
  for (const s of [-1, 1]) {
    part(h, G.cone(0.08, 0.25, 4), dark, [s * 0.13, 0.25, -0.05], [-0.2, 0, s * -0.3]);
    part(h, G.sphere(0.045), '#8fdcff', [s * 0.12, 0.05, 0.19], [0, 0, 0], [1, 1, 1], { glow: true, outline: false });
  }
  part(h, G.box(0.16, 0.03, 0.04), '#e8eef6', [0, -0.15, 0.36], [0, 0, 0], [1, 1, 1], { outline: false });
  return root;
}

function droneBody(body, lens, opts = {}) {
  const root = new THREE.Group();
  const y = 1.1;
  part(root, G.sphere(0.5, 32), body, [0, y, 0], [0, 0, 0], [1.3, 0.42, 1.0]);
  part(root, G.sphere(0.3, 24), opts.dome ?? body, [0, y + 0.12, 0], [0, 0, 0], [1, 0.6, 1]);
  part(root, G.sphere(0.14, 24), '#14161c', [0, y - 0.05, 0.47], [0, 0, 0], [1, 1, 0.5]);
  part(root, G.sphere(0.09, 24), lens, [0, y - 0.05, 0.53], [0, 0, 0], [1, 1, 0.5], { glow: true, outline: false });
  for (const [x, z] of [[-0.8, 0.45], [0.8, 0.45], [-0.8, -0.45], [0.8, -0.45]]) {
    limb(root, [x * 0.55, y + 0.05, z * 0.55], [x, y + 0.15, z], 0.04, opts.arm ?? '#3a3d46');
    part(root, G.cyl(0.05, 0.05, 0.12), '#3a3d46', [x, y + 0.22, z]);
    part(root, G.cyl(0.32, 0.32, 0.015, 32), '#c9d0da', [x, y + 0.3, z], [0, 0, 0], [1, 1, 1], { opacity: 0.45, outline: false });
  }
  return root;
}

function drone() {
  const root = droneBody('#e8ebf0', '#8fdcff');
  part(root, G.box(0.5, 0.04, 0.05), '#6fbfff', [0, 1.02, 0.4], [0, 0, 0], [1, 1, 1], { glow: true, outline: false });
  return root;
}

function gunship() {
  const root = droneBody('#4a505c', '#ff4a4a', { dome: '#5a606d', arm: '#2a2c32' });
  for (const s of [-1, 1]) {
    part(root, G.box(0.1, 0.1, 0.5), '#2a2c32', [s * 0.3, 0.85, 0.15]);
    part(root, G.cyl(0.035, 0.035, 0.35), '#8a92a0', [s * 0.3, 0.85, 0.55], [Math.PI / 2, 0, 0]);
  }
  part(root, G.box(0.08, 0.08, 0.08), '#f2c94c', [-0.45, 1.12, 0.32], [0, 0, 0], [1, 1, 1], { glow: true, outline: false });
  return root;
}

function armored() {
  const root = new THREE.Group();
  const hull = '#dfe3ea';
  for (const s of [-1, 1]) {
    part(root, G.box(0.36, 0.42, 1.9), '#3a3d46', [s * 0.62, 0.28, 0]);
    for (let i = 0; i < 5; i++) part(root, G.cyl(0.15, 0.15, 0.38, 20), '#5c6270', [s * 0.62, 0.22, -0.72 + i * 0.36], [0, 0, Math.PI / 2]);
  }
  part(root, G.box(1.1, 0.42, 1.7), hull, [0, 0.62, 0]);
  part(root, G.box(1.2, 0.12, 1.85), '#b9bfc9', [0, 0.45, 0]);
  part(root, G.box(1.0, 0.12, 0.3), hull, [0, 0.62, 0.92], [-0.6, 0, 0]);
  part(root, G.box(0.7, 0.06, 0.05), '#6fbfff', [0, 0.72, 0.86], [0, 0, 0], [1, 1, 1], { glow: true, outline: false });
  const t = group(root, [0, 0.98, -0.1]);
  part(t, G.cyl(0.42, 0.48, 0.3, 32), '#c9ced8', [0, 0, 0]);
  part(t, G.sphere(0.42, 32), '#d7dbe3', [0, 0.1, 0], [0, 0, 0], [1, 0.45, 1]);
  part(t, G.cyl(0.07, 0.08, 1.2, 16), '#8a92a0', [0, 0.05, 0.85], [Math.PI / 2, 0, 0]);
  part(t, G.box(0.3, 0.06, 0.04), '#6fbfff', [0, 0.08, 0.42], [0, 0, 0], [1, 1, 1], { glow: true, outline: false });
  return root;
}

const BUILDERS = { brasa, faisca, muralha, bastiao, lirio, corvo, falcao, trovao,
  peacekeeper, hound, riot, rifleman, drone, gunship, executor, incinerator, infiltrator, medic, armored, cleric };
export function build(id) {
  const fn = BUILDERS[id];
  if (!fn) throw new Error('unknown model ' + id);
  return fn();
}
export const IDS = Object.keys(BUILDERS);
