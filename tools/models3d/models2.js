import * as THREE from 'three';
import { G, part, group, limb, along, tube, lock, head, hair, body, arms, belt, scarf, armband, rig, hold, flash, mat, HEAD_R, HEAD_Y } from './kit2.js';

// ---------------------------------------------------------------------------
// Weapons and gear

function sword(parent, at, rot, opts = {}) {
  const g = group(parent, at, rot);
  const blade = opts.blade ?? '#e8edf5';
  part(g, G.cyl(0.026, 0.03, 0.2, 12), '#2b2630', [0, -0.06, 0]);
  part(g, G.torus(0.03, 0.008), '#d9ad52', [0, -0.12, 0], [Math.PI / 2, 0, 0], [1, 1, 1], { gloss: 0.8 });
  part(g, G.box(0.2, 0.04, 0.06, 0.012), '#d9ad52', [0, 0.055, 0], [0, 0, 0], [1, 1, 1], { gloss: 0.8 });
  // blade: a long flat lathe-less wedge with a pointed tip
  const shape = new THREE.Shape();
  shape.moveTo(-0.036, 0); shape.lineTo(0.036, 0); shape.lineTo(0.036, 0.86); shape.lineTo(0, 1.0); shape.lineTo(-0.036, 0.86); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1 });
  geo.translate(0, 0.075, -0.006);
  part(g, geo, blade, [0, 0, 0], [0, 0, 0], [1, 1, 1], { gloss: 1, rimK: 0.5 });
  if (opts.edge) part(g, G.box(0.014, 0.84, 0.02, 0.004), opts.edge, [0.03, 0.5, 0], [0, 0, 0], [1, 1, 1], { glow: true });
  return g;
}

function dagger(parent, at, rot, color = '#f07a2a') {
  const g = group(parent, at, rot);
  part(g, G.cyl(0.024, 0.026, 0.14, 12), '#2b2630', [0, 0, 0]);
  part(g, G.box(0.11, 0.03, 0.045, 0.01), color, [0, 0.08, 0]);
  const shape = new THREE.Shape();
  shape.moveTo(-0.03, 0); shape.lineTo(0.03, 0); shape.lineTo(0.022, 0.3); shape.lineTo(0, 0.42); shape.lineTo(-0.022, 0.3); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 1 });
  geo.translate(0, 0.095, -0.005);
  part(g, geo, '#e8edf5', [0, 0, 0], [0, 0, 0], [1, 1, 1], { gloss: 1, rimK: 0.5 });
  return g;
}

/** Rifle pointing along +z, origin at the grip. */
function rifle(parent, at, rot, opts = {}) {
  const g = group(parent, at, rot);
  const body = opts.color ?? '#343842', wood = opts.wood ?? '#6a4630', len = opts.len ?? 1.0;
  part(g, G.box(0.055, 0.1, 0.3, 0.02), wood, [0, -0.005, -0.22], [0.12, 0, 0]);                     // stock
  part(g, G.box(0.06, 0.085, 0.36, 0.015), body, [0, 0.02, 0.08]);                                   // receiver
  part(g, G.box(0.05, 0.06, 0.26, 0.015), wood, [0, 0.0, 0.36]);                                     // handguard
  along(g, G.cyl(0.018, 0.018, len * 0.5, 10), [0, 0.03, 0.3], [0, 0.03, 0.3 + len * 0.5], body);    // barrel
  along(g, G.cyl(0.026, 0.026, 0.08, 10), [0, 0.03, 0.26 + len * 0.5], [0, 0.03, 0.34 + len * 0.5], '#1b1d22'); // muzzle
  part(g, G.box(0.04, 0.12, 0.05, 0.012), body, [0, -0.07, 0.0], [0.25, 0, 0]);                      // grip
  part(g, G.box(0.04, 0.13, 0.06, 0.012), '#1b1d22', [0, -0.07, 0.15], [-0.15, 0, 0]);               // magazine
  if (opts.scope !== false) {
    along(g, G.cyl(0.028, 0.028, 0.26, 12), [0, 0.105, 0.0], [0, 0.105, 0.26], '#1b1d22');
    part(g, G.cyl(0.024, 0.024, 0.01, 12), opts.lens ?? '#7fd8ff', [0, 0.105, 0.262], [Math.PI / 2, 0, 0], [1, 1, 1], { glow: true });
    for (const z of [0.05, 0.2]) part(g, G.box(0.02, 0.04, 0.02, 0.005), body, [0, 0.075, z]);
  }
  if (opts.bipod) for (const s of [-1, 1]) along(g, G.cyl(0.008, 0.008, 0.2, 6), [0, 0.0, 0.5], [s * 0.07, -0.16, 0.56], '#1b1d22', { outline: false });
  return g;
}

function goggles(h, strap, lens, y = 0.25) {
  part(h, G.torus(HEAD_R * 1.07, 0.024), strap, [0, y - 0.05, -0.03], [Math.PI / 2 - 0.28, 0, 0]);
  for (const s of [-1, 1]) {
    const e = group(h, [s * 0.15, y + 0.02, 0.385], [-0.42, s * 0.3, 0]);
    part(e, G.cyl(0.085, 0.085, 0.06, 20, 0.012), strap, [0, 0, 0], [Math.PI / 2, 0, 0]);
    part(e, G.cyl(0.062, 0.062, 0.065, 20, 0.008), lens, [0, 0, 0.004], [Math.PI / 2, 0, 0], [1, 1, 1], { gloss: 1, outline: false });
    part(e, G.sphere(0.018, 8), '#ffffff', [-0.022, 0.022, 0.04], [0, 0, 0], [1, 1, 0.4], { glow: true });
  }
  part(h, G.box(0.08, 0.03, 0.03, 0.01), strap, [0, y + 0.02, 0.41], [-0.42, 0, 0]);
}

/** Half-cape hanging from the shoulders at the back. */
function cape(root, color, len = 0.5, opts = {}) {
  const pts = [[0.2, 1.04], [0.25, 0.92], [0.27 + len * 0.1, 1.02 - len * 0.6], [0.3 + len * 0.2, 1.02 - len]];
  const geo = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 24, Math.PI * (opts.from ?? 0.62), Math.PI * (opts.arc ?? 0.76));
  geo.computeVertexNormals();
  return part(root, geo, color, [0, 0, 0.02], [0, 0, 0], [1.05, 1, 0.8], { double: true, ...opts.mat });
}

function furCollar(root, color, r = 0.17) {
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    part(root, G.sphere(0.07, 12), color, [Math.sin(a) * r * 1.08, 1.06 + Math.cos(a) * 0.015, Math.cos(a) * r * 0.82 - 0.01], [0, 0, 0], [1, 0.8, 1], { soft: 0.1 });
  }
}

/** Curved armour plate on the chest. */
function chestPlate(root, color, opts = {}) {
  const geo = new THREE.SphereGeometry(0.22, 24, 12, Math.PI * 0.2, Math.PI * 0.6, Math.PI * 0.28, Math.PI * 0.4);
  part(root, geo, color, [0, 0.86, -0.005], [0, 0, 0], [(opts.w ?? 1) * 1.02, 1.05, 0.78], { double: true, gloss: opts.gloss ?? 0.5, ...opts.mat });
}
function pauldron(root, color, s, opts = {}) {
  part(root, G.sphere(0.115 * (opts.size ?? 1), 20), color, [s * 0.255, 1.02, 0], [0, 0, s * -0.35], [1.05, 0.72, 1.1], { gloss: 0.5 });
  if (opts.trim) part(root, G.torus(0.105 * (opts.size ?? 1), 0.016), opts.trim, [s * 0.262, 0.985, 0], [Math.PI / 2, s * 0.35, 0], [1.05, 1.1, 1]);
}

// ---------------------------------------------------------------------------
// Resistance operators

function brasa() {
  const root = new THREE.Group();
  const c = { skin: '#fbe0cc', hair: '#c9432c', iris: '#e23b3b', coat: '#3a3548', sleeve: '#3a3548', pants: '#24212c', boots: '#4a3234', bootTrim: '#d23a40', gloves: '#1f1c26', cuff: '#d23a40',
    browColor: '#7a2a20', mouth: 'smile', faceStyle: { tilt: 0.1, brow: 0.18 } };
  body(root, c, { coat: 0.4, open: true, lining: '#b02a32', collar: '#3a3548' });
  part(root, G.box(0.13, 0.3, 0.03, 0.012), '#f1ece8', [0, 0.84, 0.128]);
  for (const s of [-1, 1]) part(root, G.box(0.06, 0.34, 0.035, 0.012), '#4a4459', [s * 0.095, 0.85, 0.135], [0, s * 0.3, s * 0.12]);
  for (const y of [0.9, 0.8]) part(root, G.sphere(0.014, 8), '#d9ad52', [0.07, y, 0.156], [0, 0, 0], [1, 1, 0.5], { gloss: 1, outline: false });
  belt(root, '#17151b', '#d9ad52', { pouches: [[-0.14, '#4a3234']] });
  along(root, G.cyl(0.03, 0.022, 0.62, 10), [-0.2, 0.66, -0.06], [-0.34, 0.3, -0.4], '#17151b');
  scarf(root, '#d83a42', { tails: [[[0.1, 1.08, -0.08], [0.24, 1.02, -0.3], [0.2, 0.8, -0.46], [0.32, 0.62, -0.58]], [[0.02, 1.07, -0.12], [0.06, 0.94, -0.32], [-0.02, 0.76, -0.42]]] });
  arms(root, c, { r: [[0.34, 0.82, 0.1], [0.36, 0.72, 0.3]], l: [[-0.31, 0.8, -0.02], [-0.3, 0.62, 0.08]] });
  armband(root, 'L', '#d23a40');
  hold(root, sword(root, [0.36, 0.72, 0.3], [0.95, 0.1, -0.4], { edge: '#ff7a3a' }));
  const h = head(root, c);
  hair(h, c.hair, { bangs: 6, bangLen: 0.22, side: 0.34, part: 0.4 });
  lock(h, [0.02, 0.44, 0.02], [0.14, 0.62, 0.12], 0.035, c.hair, { bend: [-0.06, 0.1, 0], flat: 0.7 });
  part(h, G.torus(0.07, 0.03), '#d83a42', [0, 0.16, -0.43], [0.5, 0, 0]);
  tube(h, [[0, 0.18, -0.42], [0, 0.2, -0.62], [0.03, -0.1, -0.78], [0.0, -0.5, -0.72], [0.05, -0.74, -0.6]], [0.07, 0.13, 0.15, 0.11, 0.02], c.hair, { flat: 0.7, side: [1, 0, 0], n: 24, rimK: 0.3 });
  return root;
}

function faisca() {
  const root = new THREE.Group();
  const c = { skin: '#fbdcc4', hair: '#f6c744', iris: '#ff8a2a', coat: '#f3efe8', sleeve: '#5a4a40', pants: '#3a3644', boots: '#ececf0', sole: '#f07a2a', bootTrim: '#f07a2a', socks: '#24212c', gloves: '#2b2630', cuff: '#f07a2a',
    browColor: '#a8791c', mouth: 'grin', faceStyle: { tilt: 0.12, brow: 0.22, eyeH: 0.95 } };
  body(root, c, { shorts: true });
  // open bomber jacket over a white tee
  for (const s of [-1, 1]) {
    const geo = new THREE.LatheGeometry([[0.185, 0.66], [0.2, 0.74], [0.215, 0.92], [0.215, 1.0], [0.16, 1.06]].map(([r, y]) => new THREE.Vector2(r, y)), 20, s > 0 ? Math.PI * 0.12 : Math.PI * 1.0, Math.PI * 0.88);
    geo.computeVertexNormals();
    part(root, geo, '#5a4a40', [0, 0, 0], [0, 0, 0], [1.14, 1, 0.8], { double: true });
  }
  part(root, G.torus(0.19, 0.03), '#f07a2a', [0, 0.675, 0], [Math.PI / 2, 0, 0], [1.14, 0.8, 1]);
  part(root, G.box(0.1, 0.035, 0.02, 0.008), '#f07a2a', [0, 0.9, 0.152], [0, 0, 0.5], [1, 1, 1], { glow: true });
  belt(root, '#2b2630', null, { pouches: [[0.15, '#f07a2a'], [-0.15, '#4a4038']] });
  arms(root, c, { r: [[0.36, 0.84, 0.12], [0.33, 0.78, 0.34]], l: [[-0.34, 0.84, -0.04], [-0.38, 0.68, 0.1]] });
  hold(root, dagger(root, [0.33, 0.78, 0.34], [2.2, 0, 0.5]));
  const lk = dagger(root, [-0.38, 0.68, 0.1], [-0.5, 0, 0.5]);
  hold(root, lk, 'L');
  const h = head(root, c);
  hair(h, c.hair, { bangs: 5, bangLen: 0.16, side: 0.14, part: -0.3, bangR: 0.11 });
  // wild spikes
  for (const [x, y, z, dx, dy, dz, r] of [[0, 0.4, 0.05, 0.05, 0.3, 0.14, 0.1], [-0.2, 0.36, 0, -0.2, 0.28, 0.05, 0.1], [0.22, 0.36, 0, 0.24, 0.26, 0.02, 0.1], [-0.36, 0.2, -0.05, -0.26, 0.16, -0.05, 0.09],
    [0.37, 0.2, -0.05, 0.26, 0.14, -0.08, 0.09], [0, 0.32, -0.28, 0, 0.26, -0.24, 0.11], [-0.26, 0.16, -0.3, -0.2, 0.08, -0.26, 0.1], [0.26, 0.16, -0.3, 0.2, 0.06, -0.26, 0.1], [0, 0.0, -0.4, 0, -0.08, -0.3, 0.1]])
    lock(h, [x, y, z], [x + dx, y + dy, z + dz], r, c.hair, { radii: [r, r * 0.8, r * 0.45, r * 0.05], flat: 0.75, bend: [0, 0.03, 0] });
  goggles(h, '#2b2630', '#6fd6ff', 0.27);
  return root;
}

function muralha() {
  const root = new THREE.Group();
  const steel = '#aab6c6', dark = '#59657a';
  const c = { skin: '#f6d6bc', hair: '#3b3a4c', iris: '#5a8fe0', coat: '#39404e', sleeve: '#39404e', pants: '#2c313c', boots: dark, bootTrim: steel, gloves: dark, cuff: steel,
    browColor: '#2a2936', mouth: 'flat', faceStyle: { tilt: 0.04, brow: 0.12, lid: 0.22 } };
  body(root, c, { build: 1.12, knee: steel, legs: 1.1 });
  chestPlate(root, steel, { w: 1.12 });
  part(root, G.box(0.05, 0.16, 0.02, 0.008), '#d23a40', [0, 0.87, 0.172]);
  part(root, G.cyl(0.2, 0.21, 0.09, 24, 0.015), dark, [0, 0.7, 0], [0, 0, 0], [1.14, 1, 0.8]);
  belt(root, '#22252d', steel, { build: 1.1 });
  for (const s of [-1, 1]) {
    pauldron(root, steel, s * 1.1, { size: 1.15, trim: '#d23a40' });
    part(root, G.box(0.1, 0.2, 0.04, 0.015), steel, [s * 0.14, 0.52, 0.11], [0.15, 0, 0]);          // tassets
  }
  cape(root, '#b02a32', 0.5);
  arms(root, c, { r: [[0.37, 0.84, 0.12], [0.3, 0.76, 0.34]], l: [[-0.36, 0.82, -0.02], [-0.36, 0.62, 0.08]] }, { build: 1.1, thick: 1.12 });
  // tower shield
  const sh = group(root, [0.28, 0.66, 0.46], [0.06, 0.3, 0]);
  part(sh, G.box(0.58, 1.02, 0.06, 0.05), dark, [0, 0, 0]);
  part(sh, G.box(0.48, 0.92, 0.07, 0.04), steel, [0, 0, 0.006], [0, 0, 0], [1, 1, 1], { gloss: 0.5 });
  part(sh, G.box(0.1, 0.5, 0.03, 0.01), '#d23a40', [0, 0.02, 0.04]);
  part(sh, G.box(0.32, 0.1, 0.03, 0.01), '#d23a40', [0, 0.14, 0.04]);
  for (const [x, y] of [[-0.2, 0.42], [0.2, 0.42], [-0.2, -0.42], [0.2, -0.42]]) part(sh, G.sphere(0.022, 8), '#e6ebf2', [x, y, 0.045], [0, 0, 0], [1, 1, 0.5], { gloss: 1, outline: false });
  part(sh, G.box(0.4, 0.035, 0.03, 0.01), '#7fd8ff', [0, -0.3, 0.04], [0, 0, 0], [1, 1, 1], { glow: true });
  hold(root, sh);
  const h = head(root, c);
  hair(h, c.hair, { bangs: 5, bangLen: 0.17, side: 0.12, part: 0.2 });
  for (const [x, z] of [[-0.18, -0.36], [0.02, -0.42], [0.2, -0.35]]) lock(h, [x, -0.02, z], [x * 1.2, -0.3, z * 0.95], 0.1, c.hair, { flat: 0.6 });
  return root;
}

function bastiao() {
  const root = new THREE.Group();
  const bronze = '#d9a352', dk = '#8a5a34';
  const c = { skin: '#eec5a2', skinShade: '#d99c80', hair: '#70482c', iris: '#3fa866', coat: '#6a4a34', sleeve: '#6a4a34', pants: '#3e2c20', boots: dk, bootTrim: bronze, gloves: '#4a3020', cuff: bronze,
    browColor: '#4a2e1a', mouth: 'grin', faceStyle: { tilt: 0.02, brow: 0.2, eyeH: 0.86, browW: 12, mouthY: 26, eyeY: 0.57 } };
  body(root, c, { build: 1.18, knee: bronze, legs: 1.12 });
  chestPlate(root, bronze, { w: 1.2 });
  part(root, G.cyl(0.05, 0.05, 0.02, 16, 0.006), '#d23a40', [0, 0.88, 0.178], [Math.PI / 2, 0, 0], [1, 1, 1], { gloss: 0.6 });
  belt(root, '#2e1e12', bronze, { build: 1.16, pouches: [[0.16, dk]] });
  for (const s of [-1, 1]) pauldron(root, bronze, s * 1.14, { size: 1.2, trim: dk });
  furCollar(root, '#e9dcc0', 0.19);
  // fur-trimmed kilt
  const kg = new THREE.LatheGeometry([[0.2, 0.64], [0.25, 0.44], [0.26, 0.4]].map(([r, y]) => new THREE.Vector2(r, y)), 24);
  kg.computeVertexNormals();
  part(root, kg, dk, [0, 0, 0], [0, 0, 0], [1.14, 1, 0.84], { double: true });
  arms(root, c, { l: [[-0.4, 0.84, 0.08], [-0.38, 0.72, 0.28]], r: [[0.42, 1.02, 0.02], [0.4, 1.24, 0.1]] }, { build: 1.14, thick: 1.2 });
  const sh = group(root, [-0.46, 0.72, 0.36], [0, -0.55, 0]);
  part(sh, G.cyl(0.3, 0.3, 0.06, 32, 0.02), dk, [0, 0, 0], [Math.PI / 2, 0, 0]);
  part(sh, G.cyl(0.24, 0.25, 0.07, 32, 0.02), bronze, [0, 0, 0.006], [Math.PI / 2, 0, 0], [1, 1, 1], { gloss: 0.5 });
  part(sh, G.sphere(0.08, 16), '#f0d9a0', [0, 0, 0.04], [0, 0, 0], [1, 1, 0.6], { gloss: 1 });
  for (let i = 0; i < 4; i++) part(sh, G.box(0.05, 0.14, 0.02, 0.008), '#d23a40', [Math.sin(i * Math.PI / 2) * 0.16, Math.cos(i * Math.PI / 2) * 0.16, 0.045], [0, 0, -i * Math.PI / 2]);
  hold(root, sh, 'L');
  const m = group(root, [0.4, 1.24, 0.1], [0.25, 0, -0.3]);
  part(m, G.cyl(0.028, 0.032, 0.62, 10), '#5a3c28', [0, 0.18, 0]);
  part(m, G.torus(0.032, 0.012), bronze, [0, -0.08, 0], [Math.PI / 2, 0, 0]);
  part(m, G.sphere(0.12, 16), '#8f98a8', [0, 0.52, 0], [0, 0, 0], [1, 1, 1], { gloss: 0.7 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    part(m, G.cone(0.035, 0.11, 8), '#cfd6e0', [Math.cos(a) * 0.14, 0.52, Math.sin(a) * 0.14], [0, -a, -Math.PI / 2]);
  }
  part(m, G.cone(0.035, 0.11, 8), '#cfd6e0', [0, 0.66, 0]);
  hold(root, m);
  const h = head(root, c);
  hair(h, c.hair, { bangs: 4, bangLen: 0.12, side: 0.2, part: -0.2, bangR: 0.12 });
  for (const [x, z] of [[-0.2, -0.36], [0.02, -0.42], [0.22, -0.35]]) lock(h, [x, 0, z], [x * 1.25, -0.26, z], 0.11, c.hair, { flat: 0.6 });
  // beard around the jaw
  const bg = new THREE.SphereGeometry(HEAD_R * 1.05, 32, 12, Math.PI * 0.08, Math.PI * 0.84, Math.PI * 0.7, Math.PI * 0.26);
  part(h, bg, c.hair, [0, 0.0, 0.0], [0, 0, 0], [1, 0.97, 0.96], { double: true });
  return root;
}

function lirio() {
  const root = new THREE.Group();
  const c = { skin: '#fde6d6', skinShade: '#f0bcae', hair: '#e6dff4', iris: '#34c58a', coat: '#eef0f7', sleeve: '#eef0f7', pants: '#3b3748', boots: '#e6e8f0', bootTrim: '#d83a42', socks: '#3b3748', cuff: '#d83a42',
    browColor: '#9a92ac', mouth: 'smile', faceStyle: { tilt: -0.02, brow: 0.02, lid: 0.1, eyeW: 1.05, lash: '#3a3246' } };
  body(root, c, { coat: 0.42, lining: '#c9cbe0', collar: '#eef0f7', build: 0.94 });
  part(root, G.box(0.04, 0.5, 0.02, 0.008), '#d83a42', [0, 0.8, 0.148]);
  for (const y of [0.92, 0.82, 0.72]) part(root, G.sphere(0.015, 8), '#d9ad52', [0.045, y, 0.15], [0, 0, 0], [1, 1, 0.5], { gloss: 1, outline: false });
  belt(root, '#d83a42', '#d9ad52', { build: 0.94, pouches: [[-0.15, '#eef0f7']] });
  // short shoulder cape
  const cg = new THREE.LatheGeometry([[0.13, 1.08], [0.24, 1.02], [0.3, 0.86]].map(([r, y]) => new THREE.Vector2(r, y)), 28);
  cg.computeVertexNormals();
  part(root, cg, '#eef0f7', [0, 0, 0], [0, 0, 0], [1.08, 1, 0.82], { double: true });
  part(root, G.torus(0.285, 0.014), '#d83a42', [0, 0.875, 0], [Math.PI / 2, 0, 0], [1.08, 0.82, 1]);
  arms(root, c, { r: [[0.35, 0.82, 0.1], [0.37, 0.76, 0.3]], l: [[-0.32, 0.8, 0.02], [-0.3, 0.64, 0.14]] });
  armband(root, 'L', '#d83a42');
  // staff with a glowing cross
  const st = group(root, [0.37, 0.76, 0.3], [0.1, 0, -0.12]);
  part(st, G.cyl(0.02, 0.02, 1.5, 10), '#e9e4f2', [0, 0.1, 0]);
  part(st, G.torus(0.13, 0.022), '#d9ad52', [0, 0.98, 0], [0, 0, 0], [1, 1, 1], { gloss: 0.8 });
  part(st, G.box(0.05, 0.17, 0.035, 0.01), '#58f0a8', [0, 0.98, 0], [0, 0, 0], [1, 1, 1], { glow: true });
  part(st, G.box(0.17, 0.05, 0.035, 0.01), '#58f0a8', [0, 0.98, 0], [0, 0, 0], [1, 1, 1], { glow: true });
  part(st, G.cone(0.03, 0.1, 8), '#d9ad52', [0, -0.68, 0], [Math.PI, 0, 0]);
  hold(root, st);
  flash(st, [0, 0.98, 0], '#7dffa1', 0.2);
  const h = head(root, c);
  hair(h, c.hair, { bangs: 7, bangLen: 0.2, side: 0.62, part: 0 });
  // long hair down the back
  tube(h, [[0, 0.1, -0.36], [0, -0.3, -0.5], [0, -0.8, -0.46], [0.02, -1.06, -0.36]], [0.3, 0.34, 0.3, 0.05], c.hair, { flat: 0.5, side: [1, 0, 0], n: 24, s: 14, rimK: 0.3 });
  for (const s of [-1, 1]) tube(h, [[s * 0.3, 0.05, -0.2], [s * 0.4, -0.4, -0.3], [s * 0.34, -0.86, -0.3]], [0.12, 0.14, 0.02], c.hair, { flat: 0.6, side: [0, 0, 1], n: 18, rimK: 0.3 });
  // nurse cap
  part(h, G.cyl(0.15, 0.17, 0.11, 20, 0.02), '#eef0f7', [0.0, 0.42, 0.12], [-0.3, 0, 0]);
  part(h, G.box(0.03, 0.075, 0.02, 0.006), '#d83a42', [0, 0.4, 0.29], [-0.3, 0, 0]);
  part(h, G.box(0.075, 0.03, 0.02, 0.006), '#d83a42', [0, 0.4, 0.29], [-0.3, 0, 0]);
  return root;
}

function corvo() {
  const root = new THREE.Group();
  const c = { skin: '#f4d3ba', hair: '#2a2733', iris: '#a9b4cc', coat: '#2b2835', sleeve: '#2b2835', pants: '#201e27', boots: '#1b1920', bootTrim: '#b02a32', gloves: '#17151b', cuff: '#45404f',
    browColor: '#1c1a22', mouth: 'none', blush: false, faceStyle: { tilt: 0.12, brow: 0.2, lid: 0.3, eyeH: 0.9 } };
  body(root, c, { coat: 0.44, lining: '#8a2228', open: true });
  belt(root, '#17151b', '#8f98a8', { pouches: [[0.14, '#3a3644'], [-0.14, '#3a3644']] });
  for (const y of [0.78, 0.9]) part(root, G.box(0.3, 0.03, 0.02, 0.008), '#17151b', [0, y, 0.148], [0, 0, 0.5]);
  cape(root, '#232029', 0.62, { from: 0.56, arc: 0.88 });
  arms(root, c, { r: [[0.33, 0.84, 0.08], [0.13, 0.86, 0.24]], l: [[-0.27, 0.82, 0.2], [-0.04, 0.89, 0.44]] });
  const rf = hold(root, rifle(root, [0.12, 0.9, 0.2], [0, -0.06, 0], { len: 1.15, color: '#2c2f38', wood: '#3a3644', bipod: true, lens: '#ff5a5a' }));
  flash(rf, [0, 0.03, 0.96], '#ffd27a', 0.12);
  const h = head(root, c);
  hair(h, c.hair, { bangs: 6, bangLen: 0.25, side: 0.3, part: 0.5, noCap: true });
  // hood with a red trim, pushed back enough to show the fringe
  part(h, new THREE.SphereGeometry(HEAD_R * 1.16, 36, 20, 0, Math.PI * 2, 0, Math.PI * 0.6), '#3d394b', [0, 0.04, -0.08], [-0.62, 0, 0], [1.05, 1.02, 1.08], { double: true });
  
  part(h, G.cone(0.13, 0.3, 12), '#3d394b', [0, 0.3, -0.5], [-2.0, 0, 0]);
  // scarf pulled over the mouth
  part(h, new THREE.SphereGeometry(HEAD_R * 1.04, 32, 10, Math.PI * 0.05, Math.PI * 0.9, Math.PI * 0.63, Math.PI * 0.3), '#d23a40', [0, 0, 0], [0, 0, 0], [1, 0.96, 0.97], { double: true });
  part(root, G.torus(0.14, 0.07), '#d23a40', [0, 1.09, 0.0], [Math.PI / 2 - 0.1, 0, 0], [1.08, 1, 1]);
  tube(root, [[-0.1, 1.08, -0.1], [-0.22, 0.96, -0.3], [-0.2, 0.7, -0.44]], [0.06, 0.08, 0.03], '#d23a40', { flat: 0.35, n: 16 });
  return root;
}

function falcao() {
  const root = new THREE.Group();
  const c = { skin: '#f0cdb0', skinShade: '#dba58a', hair: '#b9bcc8', iris: '#e8b13a', coat: '#7a5a3c', sleeve: '#7a5a3c', pants: '#4a4a3a', boots: '#3a2c22', bootTrim: '#8a6a4a', gloves: '#3a2c22', cuff: '#e9dcc0',
    browColor: '#7c7f8a', mouth: 'flat', blush: false, faceStyle: { tilt: 0.1, brow: 0.2, lid: 0.26, eyeH: 0.86, scar: true } };
  body(root, c, { build: 1.04 });
  part(root, G.torus(0.19, 0.035), '#5a4028', [0, 0.675, 0], [Math.PI / 2, 0, 0], [1.14, 0.8, 1]);
  part(root, G.box(0.02, 0.36, 0.02, 0.006), '#d9ad52', [0, 0.84, 0.15], [0, 0, 0], [1, 1, 1], { gloss: 0.8 });
  for (const s of [-1, 1]) part(root, G.box(0.09, 0.08, 0.03, 0.012), '#5a4028', [s * 0.1, 0.76, 0.15]);
  part(root, G.cyl(0.03, 0.03, 0.012, 12, 0.004), '#d23a40', [-0.1, 0.92, 0.158], [Math.PI / 2, 0, 0]);
  furCollar(root, '#efe4cc', 0.17);
  belt(root, '#2a1e16', '#d9ad52', { build: 1.04, pouches: [[0.15, '#5a4028']] });
  arms(root, c, { r: [[0.36, 0.84, 0.08], [0.27, 0.94, 0.22]], l: [[-0.2, 0.86, 0.24], [0.2, 1.12, 0.4]] });
  const rf = hold(root, rifle(root, [0.26, 0.98, 0.2], [-0.7, 0.28, 0], { len: 1.2, color: '#3d424d', wood: '#6a4630', lens: '#ffb347' }));
  flash(rf, [0, 0.03, 0.98], '#ffd27a', 0.13);
  const h = head(root, c);
  hair(h, c.hair, { bangs: 4, bangLen: 0.12, side: 0.16, part: -0.6, bangR: 0.12 });
  for (const [x, z, dy] of [[-0.24, -0.34, -0.26], [0, -0.42, -0.3], [0.24, -0.34, -0.26], [-0.1, -0.38, -0.34], [0.12, -0.38, -0.34]]) lock(h, [x, 0.02, z], [x * 1.3, dy, z * 1.12], 0.1, c.hair, { flat: 0.6 });
  goggles(h, '#3a2c22', '#ffb347', 0.26);
  return root;
}

function trovao() {
  const root = new THREE.Group();
  const c = { skin: '#eec3a0', skinShade: '#d89a7c', hair: '#7a5636', iris: '#e0803a', coat: '#6c7a48', sleeve: '#6c7a48', pants: '#49523a', boots: '#3a3226', bootTrim: '#c8a04a', gloves: '#3a3226', cuff: '#4c5632',
    browColor: '#4a321e', mouth: 'grin', faceStyle: { tilt: 0.06, brow: 0.24, browW: 11, eyeH: 0.92 } };
  body(root, c, { build: 1.12, legs: 1.08, knee: '#3a3226' });
  part(root, G.cyl(0.2, 0.21, 0.1, 24, 0.02), '#4c5632', [0, 0.7, 0], [0, 0, 0], [1.14, 1, 0.8]);
  // bandolier with grenades
  along(root, G.box(0.05, 0.52, 0.03, 0.01), [0.2, 1.0, 0.1], [-0.2, 0.68, 0.14], '#3a3226');
  for (let i = 0; i < 4; i++) {
    const t = 0.18 + i * 0.2;
    part(root, G.capsule(0.03, 0.05), '#d9a23a', [0.2 - 0.4 * t, 1.0 - 0.32 * t, 0.165 + Math.sin(t * Math.PI) * 0.01], [0, 0, 0.9], [1, 1, 1], { gloss: 0.6 });
  }
  belt(root, '#2a2418', '#c8a04a', { build: 1.1, pouches: [[0.16, '#4c5632'], [-0.16, '#4c5632']] });
  arms(root, c, { r: [[0.38, 0.92, 0.1], [0.36, 1.08, 0.3]], l: [[-0.3, 0.84, 0.2], [0.12, 0.98, 0.42]] }, { build: 1.1, thick: 1.15 });
  const l = group(root, [0.37, 1.18, 0.0], [-0.08, 0, 0]);
  along(l, G.cyl(0.095, 0.095, 1.25, 24, 0.015), [0, 0, -0.5], [0, 0, 0.75], '#4d5462');
  along(l, G.cyl(0.125, 0.105, 0.2, 24, 0.02), [0, 0, 0.72], [0, 0, 0.92], '#2e323b');
  along(l, G.cyl(0.115, 0.13, 0.16, 24, 0.02), [0, 0, -0.62], [0, 0, -0.46], '#2e323b');
  part(l, G.cyl(0.085, 0.085, 0.02, 20, 0.004), '#ff5a3a', [0, 0, 0.925], [Math.PI / 2, 0, 0], [1, 1, 1], { glow: true });
  part(l, G.box(0.05, 0.15, 0.06, 0.015), '#2e323b', [0, -0.14, 0.3]);
  part(l, G.box(0.05, 0.13, 0.06, 0.015), '#2e323b', [0, -0.13, 0.05]);
  part(l, G.box(0.04, 0.07, 0.14, 0.012), '#2e323b', [-0.07, 0.1, 0.3]);
  for (const z of [-0.2, 0.5]) part(l, G.torus(0.098, 0.012), '#c8a04a', [0, 0, z]);
  hold(root, l);
  flash(l, [0, 0, 1.05], '#ffb347', 0.22);
  const h = head(root, c);
  hair(h, c.hair, { bangs: 4, bangLen: 0.2, side: 0.2, part: 0.3, noCap: true, bangTop: 0.12 });
  for (const [x, z] of [[-0.24, -0.34], [0, -0.42], [0.24, -0.34]]) lock(h, [x, -0.02, z], [x * 1.3, -0.26, z * 1.05], 0.1, c.hair, { flat: 0.6 });
  // beanie with a folded brim and a pom-pom
  part(h, new THREE.SphereGeometry(HEAD_R * 1.13, 36, 20, 0, Math.PI * 2, 0, Math.PI * 0.5), '#75844c', [0, 0.06, -0.04], [-0.3, 0, 0], [1.03, 1.08, 1.04], { double: true });
  part(h, G.torus(HEAD_R * 1.1, 0.06), '#56633a', [0, 0.09, -0.04], [Math.PI / 2 - 0.3, 0, 0], [1.03, 1.04, 1.1]);
  part(h, G.sphere(0.1, 14), '#e9dcc0', [0, 0.55, -0.2], [0, 0, 0], [1, 1, 1], { soft: 0.1 });
  part(h, G.box(0.09, 0.06, 0.02, 0.01), '#d23a40', [0.12, 0.2, 0.44], [-0.3, 0.25, 0]);
  return root;
}

// ---------------------------------------------------------------------------
// Regime enemies: dark undersuits under white armour, cyan light.

const SUIT = '#2e3442', ARMOR = '#eef1f6', ARMOR_D = '#b9c2d2', CYAN = '#6fd8ff';
const ARM = { gloss: 0.5, shade: '#a9b4cf' };
const TROOP = { skin: SUIT, coat: SUIT, sleeve: SUIT, pants: '#252a35', boots: ARMOR, sole: '#9aa5b8', bootTrim: CYAN, gloves: '#1c2029', cuff: ARMOR, face: false };

/** Closed helmet. visor: 'band' | 'T' | 'mono'. */
function helmet(h, color, opts = {}) {
  const R = HEAD_R, S = [1.0, 0.98, 1.03];
  const mo = { gloss: 0.6, shade: opts.shade ?? '#a9b4cf', ...opts.mat };
  part(h, G.sphere(R, 40), color, [0, 0.02, 0], [0, 0, 0], S, mo);
  part(h, G.sphere(R * 0.78, 28), opts.jaw ?? color, [0, -0.16, 0.07], [0, 0, 0], [0.98, 0.72, 0.96], mo);
  const glowC = opts.glow ?? CYAN;
  const patch = (r, a, t0, t1, col, o = {}) => {
    const m = part(h, G.patch(r, a, Math.PI * t0, Math.PI * t1), col, [0, 0.02, 0], [0, 0, 0], S, { outline: false, double: true, ...o });
    return m;
  };
  const visor = opts.visor ?? 'band';
  if (visor === 'band') {
    patch(R * 1.012, 1.2, 0.44, 0.585, '#12141b', { gloss: 0.8 });
    patch(R * 1.02, 1.12, 0.5, 0.53, glowC, { glow: true });
  } else if (visor === 'T') {
    patch(R * 1.012, 0.95, 0.45, 0.535, '#0c0d12', { gloss: 0.8 });
    patch(R * 1.013, 0.2, 0.5, 0.7, '#0c0d12', { gloss: 0.8 });
    patch(R * 1.02, 0.85, 0.48, 0.505, glowC, { glow: true });
  } else if (visor === 'mono') {
    patch(R * 1.012, 0.9, 0.42, 0.6, '#0c0d12', { gloss: 0.8 });
    part(h, G.sphere(0.07, 16), glowC, [0, 0.0, R * 1.0], [0, 0, 0], [1, 1, 0.4], { glow: true });
  }
  // respirator
  part(h, G.box(0.17, 0.1, 0.06, 0.025), opts.vent ?? '#2e3442', [0, -0.27, R * 0.74], [0.35, 0, 0]);
  for (const s of [-1, 1]) part(h, G.sphere(0.018, 8), glowC, [s * 0.045, -0.265, R * 0.83], [0, 0, 0], [1, 1, 0.5], { glow: true });
  // ear pieces and a crest
  for (const s of [-1, 1]) {
    part(h, G.cyl(0.085, 0.085, 0.05, 18, 0.012), opts.trim ?? ARMOR_D, [s * R * 0.99, -0.02, 0], [0, 0, Math.PI / 2]);
    part(h, G.cyl(0.035, 0.035, 0.06, 12, 0.008), glowC, [s * R * 1.0, -0.02, 0], [0, 0, Math.PI / 2], [1, 1, 1], { glow: true });
  }
  if (opts.crest !== false) part(h, G.box(0.05, 0.05, 0.56, 0.02), opts.trim ?? ARMOR_D, [0, R * 0.985, -0.03], [-0.08, 0, 0]);
  if (opts.cross) {
    part(h, G.box(0.06, 0.2, 0.03, 0.01), opts.cross, [0, 0.3, 0.3], [-0.78, 0, 0], [1, 1, 1], { glow: true });
    part(h, G.box(0.2, 0.06, 0.03, 0.01), opts.cross, [0, 0.3, 0.3], [-0.78, 0, 0], [1, 1, 1], { glow: true });
  }
}

/** Regime trooper: undersuit, armour plates and helmet. Returns the pieces so each unit can add its own gear. */
function trooper(opts = {}) {
  const root = new THREE.Group();
  const armor = opts.armor ?? ARMOR;
  const c = { ...TROOP, boots: armor, cuff: armor, ...opts.c };
  const w = opts.build ?? 1.04;
  body(root, c, { build: w, knee: armor, legs: opts.legs ?? 1.04 });
  chestPlate(root, armor, { w, mat: { shade: opts.shade ?? ARM.shade } });
  part(root, G.box(0.11, 0.03, 0.02, 0.008), opts.glow ?? CYAN, [0.05, 0.9, 0.172 * w], [0, 0, 0], [1, 1, 1], { glow: true });
  part(root, G.cyl(0.19 * w, 0.2 * w, 0.08, 24, 0.015), '#1c2029', [0, 0.7, 0], [0, 0, 0], [1.14, 1, 0.8]);
  belt(root, '#1c2029', opts.glow ?? CYAN, { build: w });
  for (const s of [-1, 1]) {
    pauldron(root, armor, s * w, { size: opts.pauldron ?? 1, trim: opts.trim });
  }
  const h = head(root, c);
  helmet(h, opts.helmet ?? armor, { visor: opts.visor, glow: opts.glow, cross: opts.cross, shade: opts.shade, trim: opts.trimColor });
  return { root, c, h, w };
}

function peacekeeper() {
  const { root, c } = trooper();
  arms(root, c, { r: [[0.35, 0.84, 0.1], [0.36, 0.72, 0.28]], l: [[-0.31, 0.8, 0.0], [-0.31, 0.62, 0.08]] });
  const b = group(root, [0.36, 0.72, 0.28], [1.05, 0, -0.25]);
  part(b, G.cyl(0.028, 0.03, 0.2, 12), '#1c2029', [0, 0.0, 0]);
  part(b, G.cyl(0.024, 0.024, 0.5, 12), '#3a4050', [0, 0.34, 0]);
  part(b, G.cyl(0.032, 0.032, 0.34, 12), CYAN, [0, 0.42, 0], [0, 0, 0], [1, 1, 1], { glow: true, opacity: 0.85 });
  hold(root, b);
  flash(b, [0, 0.6, 0], '#8fdcff', 0.1);
  return root;
}

function rifleman() {
  const { root, c } = trooper({ armor: '#d5dbe6', shade: '#8f9bb8', c: { coat: '#39404f', sleeve: '#39404f' } });
  // backpack with antenna
  part(root, G.box(0.26, 0.3, 0.12, 0.03), '#39404f', [0, 0.86, -0.19]);
  along(root, G.cyl(0.008, 0.008, 0.5, 6), [0.1, 1.0, -0.2], [0.14, 1.5, -0.24], '#1c2029', { outline: false });
  part(root, G.sphere(0.02, 8), CYAN, [0.14, 1.5, -0.24], [0, 0, 0], [1, 1, 1], { glow: true });
  arms(root, c, { r: [[0.33, 0.84, 0.08], [0.13, 0.86, 0.24]], l: [[-0.27, 0.82, 0.2], [-0.04, 0.89, 0.44]] });
  const rf = hold(root, rifle(root, [0.12, 0.9, 0.2], [0, -0.06, 0], { len: 0.9, color: '#e3e8f0', wood: '#2c313d', lens: CYAN }));
  flash(rf, [0, 0.03, 0.84], '#8fdcff', 0.11);
  return root;
}

function riot() {
  const dark = '#3a4150';
  const { root, c } = trooper({ armor: dark, shade: '#1f2430', helmet: dark, visor: 'T', build: 1.14, legs: 1.1, pauldron: 1.2, c: { boots: dark, cuff: dark, sole: '#14161c' } });
  arms(root, c, { r: [[0.38, 0.84, 0.12], [0.32, 0.76, 0.34]], l: [[-0.36, 0.82, -0.02], [-0.36, 0.62, 0.08]] }, { build: 1.12, thick: 1.15 });
  const sh = group(root, [0.26, 0.7, 0.5], [0.05, 0.3, 0]);
  part(sh, G.box(0.64, 1.12, 0.035, 0.03), '#9fd0ff', [0, 0, 0], [0, 0, 0], [1, 1, 1], { opacity: 0.42 });
  part(sh, G.box(0.68, 0.07, 0.06, 0.02), dark, [0, 0.56, 0]);
  part(sh, G.box(0.68, 0.07, 0.06, 0.02), dark, [0, -0.56, 0]);
  for (const s of [-1, 1]) part(sh, G.box(0.05, 1.12, 0.06, 0.02), dark, [s * 0.32, 0, 0]);
  part(sh, G.box(0.36, 0.09, 0.02, 0.01), '#e8edf5', [0, 0.3, 0.025]);
  part(sh, G.box(0.5, 0.025, 0.02, 0.008), CYAN, [0, -0.44, 0.03], [0, 0, 0], [1, 1, 1], { glow: true });
  hold(root, sh);
  return root;
}

function medic() {
  const { root, c } = trooper({ cross: '#58f0a8', glow: '#58f0a8', c: { bootTrim: '#58f0a8' } });
  part(root, G.box(0.05, 0.15, 0.02, 0.008), '#58f0a8', [-0.08, 0.86, 0.176], [0, 0, 0], [1, 1, 1], { glow: true });
  part(root, G.box(0.15, 0.05, 0.02, 0.008), '#58f0a8', [-0.08, 0.86, 0.176], [0, 0, 0], [1, 1, 1], { glow: true });
  part(root, G.box(0.26, 0.3, 0.13, 0.03), ARMOR, [0, 0.86, -0.19], [0, 0, 0], [1, 1, 1], ARM);
  arms(root, c, { r: [[0.35, 0.82, 0.1], [0.36, 0.74, 0.3]], l: [[-0.31, 0.8, 0.0], [-0.31, 0.62, 0.08]] });
  // injector gun
  const k = group(root, [0.36, 0.74, 0.3], [0.1, 0, 0]);
  part(k, G.box(0.07, 0.1, 0.24, 0.02), ARMOR, [0, 0.03, 0.08], [0, 0, 0], [1, 1, 1], ARM);
  along(k, G.cyl(0.03, 0.03, 0.16, 12), [0, 0.04, 0.2], [0, 0.04, 0.36], '#58f0a8', { glow: true, opacity: 0.85 });
  part(k, G.box(0.045, 0.1, 0.05, 0.012), '#1c2029', [0, -0.05, 0.02]);
  hold(root, k);
  flash(k, [0, 0.04, 0.42], '#7dffa1', 0.17);
  return root;
}

function executor() {
  const dark = '#343a48';
  const root = new THREE.Group();
  const inner = group(root, [0, 0, 0]);
  inner.scale.set(1.3, 1.2, 1.3);
  const t = trooper({ armor: dark, shade: '#1b1f2a', helmet: dark, visor: 'T', glow: '#ff5a4a', build: 1.2, legs: 1.15, pauldron: 1.35, trim: '#ff5a4a', c: { boots: dark, cuff: dark, sole: '#14161c', bootTrim: '#ff5a4a' } });
  inner.add(...t.root.children);
  Object.assign(rig(inner), rig(t.root));
  const c = t.c;
  // horns on the helmet and a tattered waist cloth
  for (const s of [-1, 1]) lock(rig(inner).head, [s * 0.3, 0.26, 0.05], [s * 0.5, 0.56, 0.0], 0.07, '#d9dee8', { radii: [0.07, 0.055, 0.03, 0.004], flat: 1, bend: [s * 0.08, -0.04, 0] });
  const kg = new THREE.LatheGeometry([[0.22, 0.64], [0.27, 0.42], [0.28, 0.34]].map(([r, y]) => new THREE.Vector2(r, y)), 24, Math.PI * 0.6, Math.PI * 0.8);
  kg.computeVertexNormals();
  part(inner, kg, '#8a2228', [0, 0, 0], [0, 0, 0], [1.14, 1, 0.84], { double: true });
  arms(inner, c, { r: [[0.44, 1.02, 0.02], [0.42, 1.24, 0.1]], l: [[-0.4, 0.82, 0.0], [-0.4, 0.62, 0.1]] }, { build: 1.2, thick: 1.3 });
  const m = group(inner, [0.42, 1.24, 0.1], [0.25, 0, -0.35]);
  part(m, G.cyl(0.03, 0.034, 1.0, 10), '#22252e', [0, 0.28, 0]);
  part(m, G.box(0.46, 0.26, 0.26, 0.04), '#8f98a8', [0, 0.8, 0], [0, 0, 0], [1, 1, 1], { gloss: 0.6 });
  for (const s of [-1, 1]) part(m, G.box(0.05, 0.3, 0.3, 0.02), dark, [s * 0.22, 0.8, 0]);
  part(m, G.box(0.3, 0.05, 0.27, 0.01), '#ff5a4a', [0, 0.8, 0], [0, 0, 0], [1, 1, 1], { glow: true });
  hold(inner, m);
  return root;
}

function incinerator() {
  const suit = '#8a6f4e';
  const root = new THREE.Group();
  const c = { skin: suit, coat: suit, sleeve: suit, pants: '#6a5238', boots: '#2e2620', sole: '#14110e', bootTrim: '#ff9a3a', gloves: '#2e2620', cuff: '#4a3c2c', face: false };
  body(root, c, { build: 1.1, legs: 1.08, knee: '#4a3c2c', coat: 0.2 });
  part(root, G.box(0.24, 0.2, 0.03, 0.02), '#4a3c2c', [0, 0.86, 0.15]);
  part(root, G.box(0.08, 0.04, 0.02, 0.008), '#ff9a3a', [0.05, 0.9, 0.172], [0, 0, 0], [1, 1, 1], { glow: true });
  belt(root, '#2e2620', '#ff9a3a', { build: 1.08, pouches: [[0.16, '#4a3c2c'], [-0.16, '#4a3c2c']] });
  // twin fuel tanks and a hose
  for (const s of [-1, 1]) {
    part(root, G.capsule(0.095, 0.3), '#c8423a', [s * 0.11, 0.9, -0.24], [0, 0, 0], [1, 1, 1], { gloss: 0.6 });
    part(root, G.cyl(0.04, 0.04, 0.06, 10), '#2e2620', [s * 0.11, 1.13, -0.24]);
  }
  part(root, G.box(0.3, 0.06, 0.06, 0.02), '#2e2620', [0, 0.84, -0.3]);
  tube(root, [[0.12, 0.72, -0.28], [0.34, 0.56, -0.14], [0.36, 0.6, 0.16], [0.22, 0.72, 0.3]], 0.022, '#22252e', { n: 20 });
  arms(root, c, { r: [[0.34, 0.8, 0.08], [0.24, 0.74, 0.28]], l: [[-0.28, 0.8, 0.18], [-0.02, 0.76, 0.42]] }, { build: 1.08, thick: 1.1 });
  const f = group(root, [0.14, 0.76, 0.3]);
  along(f, G.cyl(0.04, 0.045, 0.6, 12), [0, 0, -0.06], [0, 0, 0.54], '#3a3f4a');
  along(f, G.cyl(0.06, 0.05, 0.1, 12), [0, 0, 0.5], [0, 0, 0.6], '#8f98a8', { gloss: 0.6 });
  part(f, G.box(0.04, 0.1, 0.05, 0.012), '#22252e', [0, -0.07, 0.0]);
  const outer = part(f, G.cone(0.15, 0.5, 16), '#ff8a1a', [0, 0, 0.86], [Math.PI / 2, 0, 0], [1, 1, 1], { glow: true, opacity: 0.85 });
  const innerF = part(f, G.cone(0.075, 0.32, 16), '#ffe07a', [0, 0, 0.78], [Math.PI / 2, 0, 0], [1, 1, 1], { glow: true });
  rig(root).flame = [outer, innerF];
  hold(root, f);
  const h = head(root, c);
  // hood, round lenses and a filter
  part(h, G.sphere(HEAD_R, 36), suit, [0, 0.02, 0], [0, 0, 0], [1, 1, 1.02]);
  part(h, G.torus(HEAD_R * 0.9, 0.03), '#4a3c2c', [0, -0.26, 0], [Math.PI / 2, 0, 0]);
  for (const s of [-1, 1]) {
    const e = group(h, [s * 0.16, 0.02, 0.37], [0, s * 0.4, 0]);
    part(e, G.cyl(0.105, 0.105, 0.06, 20, 0.014), '#2e2620', [0, 0, 0], [Math.PI / 2, 0, 0]);
    part(e, G.cyl(0.078, 0.078, 0.066, 20, 0.008), '#ffb347', [0, 0, 0.004], [Math.PI / 2, 0, 0], [1, 1, 1], { glow: true });
    part(e, G.sphere(0.02, 8), '#fff6d8', [-0.025, 0.028, 0.04], [0, 0, 0], [1, 1, 0.4], { glow: true });
  }
  along(h, G.cyl(0.09, 0.105, 0.16, 16, 0.02), [0, -0.2, 0.34], [0, -0.26, 0.5], '#3a3f4a');
  for (const s of [-1, 1]) along(h, G.cyl(0.06, 0.06, 0.08, 12, 0.012), [s * 0.1, -0.24, 0.36], [s * 0.2, -0.26, 0.4], '#22252e');
  return root;
}

function infiltrator() {
  const suit = '#27303d';
  const root = new THREE.Group();
  const c = { skin: suit, coat: suit, sleeve: suit, pants: '#1c222c', boots: '#12151b', sole: '#0c0e12', bootTrim: '#2fd0e8', gloves: '#12151b', cuff: '#3a4658', face: false };
  body(root, c, { build: 0.96 });
  for (const y of [0.9, 0.8]) part(root, G.box(0.24, 0.025, 0.02, 0.008), '#3a4658', [0, y, 0.15], [0, 0, y > 0.85 ? 0.35 : -0.35]);
  part(root, G.box(0.03, 0.26, 0.02, 0.008), '#2fd0e8', [0.11, 0.82, 0.158], [0, 0, 0], [1, 1, 1], { glow: true });
  belt(root, '#12151b', '#2fd0e8', { build: 0.96, pouches: [[-0.14, '#1c222c']] });
  cape(root, '#1a2029', 0.55, { from: 0.58, arc: 0.84 });
  arms(root, c, { r: [[0.35, 0.84, 0.12], [0.33, 0.76, 0.34]], l: [[-0.33, 0.84, 0.0], [-0.36, 0.68, 0.14]] });
  const k = hold(root, dagger(root, [0.33, 0.76, 0.34], [1.4, 0, -0.3], '#2fd0e8'));
  const k2 = dagger(root, [-0.36, 0.68, 0.14], [2.2, 0, 0.4], '#2fd0e8');
  hold(root, k2, 'L');
  const h = head(root, c);
  part(h, G.sphere(HEAD_R * 0.98, 36), '#0d0f14', [0, 0, 0], [0, 0, 0], [1, 0.96, 0.96]);
  // hood with a pointed tip
  part(h, new THREE.SphereGeometry(HEAD_R * 1.14, 36, 20, 0, Math.PI * 2, 0, Math.PI * 0.62), suit, [0, 0.04, -0.06], [-0.5, 0, 0], [1.05, 1.02, 1.08], { double: true });
  part(h, G.cone(0.15, 0.36, 12), suit, [0, 0.3, -0.5], [-2.0, 0, 0]);
  for (const s of [-1, 1]) part(h, G.box(0.13, 0.04, 0.03, 0.012), '#7ff6ff', [s * 0.15, -0.02, 0.385], [0, s * 0.4, s * -0.22], [1, 1, 1], { glow: true });
  // half-mask over the jaw
  part(h, new THREE.SphereGeometry(HEAD_R * 1.02, 32, 10, Math.PI * 0.1, Math.PI * 0.8, Math.PI * 0.6, Math.PI * 0.32), '#3a4658', [0, 0, 0], [0, 0, 0], [1, 0.96, 0.97], { double: true });
  return root;
}

function cleric() {
  const root = new THREE.Group();
  const inner = group(root, [0, 0, 0]);
  inner.scale.set(1.1, 1.12, 1.1);
  const c = { skin: '#f4e4da', skinShade: '#d6bcc0', hair: '#191920', iris: '#8fdcff', coat: '#1c1c24', sleeve: '#1c1c24', pants: '#131318', boots: '#0e0e12', sole: '#060608', bootTrim: '#8fdcff', gloves: '#eef1f6', cuff: '#eef1f6',
    browColor: '#101014', mouth: 'frown', blush: false, faceStyle: { tilt: 0.16, brow: 0.3, lid: 0.34, eyeH: 0.8, lash: '#0c0c10' } };
  body(inner, c, { coat: 0.48, open: true, lining: '#2a4a6a', collar: '#1c1c24' });
  part(inner, G.box(0.07, 0.09, 0.02, 0.008), '#eef1f6', [0, 1.045, 0.118]);
  part(inner, G.box(0.03, 0.46, 0.02, 0.008), '#3a3a48', [0, 0.82, 0.15]);
  for (const y of [0.94, 0.84, 0.74]) for (const s of [-1, 1]) part(inner, G.sphere(0.014, 8), '#c9d1db', [s * 0.06, y, 0.152], [0, 0, 0], [1, 1, 0.5], { gloss: 1, outline: false });
  belt(inner, '#0e0e12', '#c9d1db');
  for (const s of [-1, 1]) pauldron(inner, '#2a2a36', s, { size: 0.95, trim: '#8fdcff' });
  cape(inner, '#15151b', 0.78, { from: 0.55, arc: 0.9 });
  arms(inner, c, { r: [[0.33, 0.86, 0.14], [0.14, 0.86, 0.36]], l: [[-0.33, 0.86, 0.14], [-0.14, 0.9, 0.36]] });
  for (const [x, y, ry, side] of [[0.14, 0.88, -0.35, 'R'], [-0.14, 0.92, 0.35, 'L']]) {
    const g = group(inner, [x, y, 0.38], [0, ry, 0]);
    part(g, G.box(0.05, 0.075, 0.3, 0.015), '#d5dbe6', [0, 0.02, 0.1], [0, 0, 0], [1, 1, 1], { gloss: 0.8 });
    part(g, G.box(0.045, 0.13, 0.055, 0.012), '#22252e', [0, -0.06, -0.02], [0.2, 0, 0]);
    part(g, G.box(0.052, 0.02, 0.2, 0.006), '#8fdcff', [0, 0.06, 0.12], [0, 0, 0], [1, 1, 1], { glow: true });
    hold(inner, g, side);
    flash(g, [0, 0.02, 0.32], '#8fdcff', 0.1, side === 'R' ? 'flash' : 'flash2');
  }
  const h = head(inner, c);
  hair(h, c.hair, { bangs: 5, bangLen: 0.13, side: 0.14, part: 0.9, bangR: 0.085 });
  for (const [x, z] of [[-0.22, -0.36], [0, -0.42], [0.22, -0.36]]) lock(h, [x, 0, z], [x * 1.1, -0.24, z * 0.95], 0.1, c.hair, { flat: 0.6 });
  return root;
}

function hound() {
  const root = new THREE.Group();
  const dark = SUIT;
  part(root, G.capsule(0.2, 0.5), dark, [0, 0.62, 0], [Math.PI / 2, 0, 0], [1, 1, 0.95]);
  part(root, G.box(0.34, 0.12, 0.44, 0.05), ARMOR, [0, 0.8, 0.0], [0, 0, 0], [1, 1, 1], ARM);
  part(root, G.box(0.08, 0.03, 0.3, 0.01), CYAN, [0, 0.865, 0.0], [0, 0, 0], [1, 1, 1], { glow: true });
  part(root, G.box(0.3, 0.2, 0.2, 0.06), ARMOR, [0, 0.66, 0.3], [0, 0, 0], [1, 1, 1], ARM);
  const legs = [];
  for (const [x, z] of [[-0.15, 0.32], [0.15, 0.32], [-0.15, -0.28], [0.15, -0.28]]) {
    const hip = group(root, [x, 0.56, z]);
    part(hip, G.sphere(0.085, 14), ARMOR, [0, 0, 0], [0, 0, 0], [0.8, 1, 1], ARM);
    limb(hip, [0, 0, 0], [0, -0.24, -0.06], 0.058, dark);
    limb(hip, [0, -0.24, -0.06], [0, -0.47, 0.03], 0.045, dark);
    part(hip, G.sphere(0.07, 12), ARMOR, [0, -0.5, 0.06], [0, 0, 0], [1, 0.6, 1.4], ARM);
    legs.push(hip);
  }
  rig(root).legs = legs;
  tube(root, [[0, 0.72, -0.5], [0, 0.9, -0.66], [0, 1.06, -0.62]], [0.035, 0.028, 0.012], dark, { n: 12 });
  part(root, G.sphere(0.03, 8), CYAN, [0, 1.07, -0.62], [0, 0, 0], [1, 1, 1], { glow: true });
  const h = group(root, [0, 0.92, 0.56]);
  rig(root).head = h;
  part(h, G.sphere(0.22, 24), ARMOR, [0, 0, 0], [0, 0, 0], [0.92, 0.9, 1.1], ARM);
  part(h, G.box(0.2, 0.15, 0.3, 0.06), dark, [0, -0.07, 0.24]);
  part(h, G.box(0.16, 0.06, 0.1, 0.02), '#12141b', [0, -0.05, 0.4]);
  for (const s of [-1, 1]) {
    lock(h, [s * 0.12, 0.14, -0.04], [s * 0.2, 0.42, -0.1], 0.06, ARMOR, { radii: [0.06, 0.05, 0.03, 0.004], flat: 0.6, shade: ARM.shade });
    part(h, G.box(0.09, 0.035, 0.03, 0.01), CYAN, [s * 0.1, 0.04, 0.205], [0, s * 0.35, s * -0.3], [1, 1, 1], { glow: true });
  }
  part(h, G.box(0.17, 0.03, 0.04, 0.01), '#e8eef6', [0, -0.15, 0.36]);
  return root;
}

function droneBody(hull, lens, opts = {}) {
  const root = new THREE.Group();
  const y = 1.1;
  const mo = { gloss: 0.6, shade: opts.shade ?? ARM.shade };
  part(root, G.sphere(0.5, 36), hull, [0, y, 0], [0, 0, 0], [1.2, 0.4, 1.0], mo);
  part(root, G.sphere(0.3, 24), opts.dome ?? hull, [0, y + 0.1, -0.02], [0, 0, 0], [1, 0.62, 1], mo);
  part(root, G.torus(0.5, 0.025), opts.trim ?? '#2e3442', [0, y, 0], [Math.PI / 2, 0, 0], [1.2, 1, 1]);
  part(root, G.sphere(0.15, 24), '#12141b', [0, y - 0.05, 0.44], [0, 0, 0], [1, 1, 0.55]);
  part(root, G.sphere(0.095, 24), lens, [0, y - 0.05, 0.5], [0, 0, 0], [1, 1, 0.5], { glow: true });
  part(root, G.sphere(0.03, 10), '#ffffff', [-0.035, y - 0.015, 0.545], [0, 0, 0], [1, 1, 0.4], { glow: true });
  for (const [x, z] of [[-0.78, 0.44], [0.78, 0.44], [-0.78, -0.44], [0.78, -0.44]]) {
    limb(root, [x * 0.55, y + 0.03, z * 0.55], [x, y + 0.12, z], 0.035, opts.arm ?? '#2e3442');
    part(root, G.cyl(0.06, 0.07, 0.14, 14), opts.arm ?? '#2e3442', [x, y + 0.17, z]);
    part(root, G.torus(0.3, 0.02), hull, [x, y + 0.22, z], [Math.PI / 2, 0, 0], [1, 1, 1], mo);
    part(root, G.cyl(0.29, 0.29, 0.01, 32, 0.002), '#cfe6ff', [x, y + 0.27, z], [0, 0, 0], [1, 1, 1], { glow: true, opacity: 0.18 });
    const rotor = group(root, [x, y + 0.27, z]);
    part(rotor, G.box(0.56, 0.014, 0.06, 0.006), '#5a6272', [0, 0, 0], [0, 0, 0], [1, 1, 1], { outline: false });
    (rig(root).rotors ??= []).push(rotor);
  }
  rig(root).body = root.children[0];
  return root;
}

function drone() {
  const root = droneBody(ARMOR, CYAN);
  part(root, G.box(0.44, 0.035, 0.04, 0.012), CYAN, [0, 1.02, 0.4], [0, 0, 0], [1, 1, 1], { glow: true });
  along(root, G.cyl(0.008, 0.008, 0.3, 6), [0, 1.26, -0.2], [0, 1.54, -0.26], '#2e3442', { outline: false });
  return root;
}

function gunship() {
  const root = droneBody('#4a5262', '#ff4a4a', { dome: '#5c6576', arm: '#22252e', shade: '#252a38', trim: '#c8423a' });
  for (const s of [-1, 1]) {
    part(root, G.box(0.12, 0.12, 0.46, 0.03), '#22252e', [s * 0.3, 0.86, 0.12]);
    along(root, G.cyl(0.03, 0.03, 0.34, 10), [s * 0.3, 0.86, 0.34], [s * 0.3, 0.86, 0.68], '#8f98a8', { gloss: 0.6 });
    part(root, G.box(0.14, 0.03, 0.03, 0.01), '#ff4a4a', [s * 0.3, 0.93, 0.2], [0, 0, 0], [1, 1, 1], { glow: true });
  }
  part(root, G.box(0.07, 0.07, 0.07, 0.02), '#f2c94c', [-0.42, 1.14, 0.3], [0, 0, 0], [1, 1, 1], { glow: true });
  for (const s of [-1, 1]) flash(root, [s * 0.3, 0.86, 0.76], '#ff7a7a', 0.1);
  return root;
}

function armored() {
  const root = new THREE.Group();
  const hull = ARMOR;
  for (const s of [-1, 1]) {
    part(root, G.box(0.36, 0.4, 1.9, 0.12), '#2e3442', [s * 0.62, 0.27, 0]);
    part(root, G.box(0.4, 0.07, 1.96, 0.03), ARMOR_D, [s * 0.62, 0.5, 0], [0, 0, 0], [1, 1, 1], ARM);
    for (let i = 0; i < 5; i++) {
      const wheel = group(root, [s * 0.62, 0.21, -0.72 + i * 0.36]);
      part(wheel, G.cyl(0.15, 0.15, 0.4, 20, 0.03), '#596273', [0, 0, 0], [0, 0, Math.PI / 2]);
      part(wheel, G.box(0.42, 0.045, 0.2, 0.015), '#22252e', [0, 0, 0], [0, 0, 0], [1, 1, 1], { outline: false });
      (rig(root).wheels ??= []).push(wheel);
    }
  }
  part(root, G.box(1.08, 0.4, 1.66, 0.08), hull, [0, 0.62, 0], [0, 0, 0], [1, 1, 1], ARM);
  part(root, G.box(1.0, 0.14, 0.34, 0.04), hull, [0, 0.6, 0.9], [-0.6, 0, 0], [1, 1, 1], ARM);
  part(root, G.box(0.7, 0.05, 0.04, 0.012), CYAN, [0, 0.72, 0.86], [0, 0, 0], [1, 1, 1], { glow: true });
  for (const s of [-1, 1]) {
    part(root, G.box(0.16, 0.08, 0.1, 0.02), '#fff6d8', [s * 0.38, 0.6, 1.0], [-0.3, 0, 0], [1, 1, 1], { glow: true });
    part(root, G.box(0.26, 0.12, 0.36, 0.03), '#39404f', [s * 0.3, 0.86, -0.62]);
  }
  part(root, G.box(0.5, 0.03, 0.03, 0.008), '#c8423a', [0, 0.6, -0.835], [0, 0, 0], [1, 1, 1], { glow: true });
  const t = group(root, [0, 0.98, -0.08]);
  part(t, G.cyl(0.42, 0.48, 0.28, 32, 0.05), ARMOR_D, [0, 0, 0], [0, 0, 0], [1, 1, 1], ARM);
  part(t, G.sphere(0.42, 32), hull, [0, 0.1, 0], [0, 0, 0], [1, 0.45, 1], ARM);
  along(t, G.cyl(0.065, 0.075, 1.15, 16), [0, 0.05, 0.3], [0, 0.05, 1.45], '#7d8798', { gloss: 0.6 });
  along(t, G.cyl(0.1, 0.1, 0.16, 16, 0.02), [0, 0.05, 1.36], [0, 0.05, 1.52], '#39404f');
  part(t, G.box(0.3, 0.05, 0.04, 0.012), CYAN, [0, 0.08, 0.42], [0, 0, 0], [1, 1, 1], { glow: true });
  part(t, G.cyl(0.11, 0.11, 0.06, 16, 0.015), '#39404f', [0.16, 0.28, -0.12]);
  along(t, G.cyl(0.008, 0.008, 0.5, 6), [-0.24, 0.2, -0.26], [-0.28, 0.7, -0.32], '#22252e', { outline: false });
  rig(root).turret = t;
  flash(t, [0, 0.05, 1.62], '#ffd27a', 0.2);
  return root;
}

const BUILDERS = { brasa, faisca, muralha, bastiao, lirio, corvo, falcao, trovao,
  peacekeeper, hound, riot, rifleman, drone, gunship, executor, incinerator, infiltrator, medic, armored, cleric };
export function build(id) {
  const fn = BUILDERS[id];
  if (!fn) throw new Error('unknown model ' + id);
  const root = fn();
  const merged = {};
  root.traverse((o) => {
    const r = o.userData.rig;
    if (!r) return;
    for (const [k, v] of Object.entries(r)) {
      if (Array.isArray(v) && Array.isArray(merged[k])) merged[k].push(...v);
      else if (!(k in merged)) merged[k] = v;
    }
  });
  root.userData.rig = merged;
  root.userData.isModelRoot = true;
  root.userData.id = id;
  return root;
}
export const IDS = Object.keys(BUILDERS);
