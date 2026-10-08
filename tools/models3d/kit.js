import * as THREE from 'three';

// ---- materials -----------------------------------------------------------
const gradient = (() => {
  const data = new Uint8Array([90, 170, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();

const cache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!cache.has(key)) {
    cache.set(key, opts.glow
      ? new THREE.MeshBasicMaterial({ color, transparent: !!opts.opacity, opacity: opts.opacity ?? 1 })
      : new THREE.MeshToonMaterial({ color, gradientMap: gradient, transparent: !!opts.opacity, opacity: opts.opacity ?? 1 }));
  }
  return cache.get(key);
}
const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x1a1420, side: THREE.BackSide });

/** Adds a mesh with an inverted-hull outline. */
export function part(parent, geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], opts = {}) {
  const m = new THREE.Mesh(geo, typeof color === 'string' || typeof color === 'number' ? mat(color, opts) : color);
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.scale.set(...scale);
  parent.add(m);
  if (opts.outline !== false) {
    const o = new THREE.Mesh(geo, OUTLINE);
    const k = opts.outlineScale ?? 1.06;
    o.scale.set(k, k, k);
    o.userData.outline = true;
    m.add(o);
  }
  return m;
}

// ---- geometry helpers ------------------------------------------------------
export const G = {
  sphere: (r = 1, s = 32) => new THREE.SphereGeometry(r, s, s / 2),
  capsule: (r, len) => new THREE.CapsuleGeometry(r, len, 8, 16),
  cyl: (rt, rb, h, s = 24) => new THREE.CylinderGeometry(rt, rb, h, s),
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  rbox: null,
  cone: (r, h, s = 16) => new THREE.ConeGeometry(r, h, s),
  torus: (r, t, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, 12, 32, arc),
};

export function group(parent, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const g = new THREE.Group();
  g.position.set(...pos);
  g.rotation.set(...rot);
  parent.add(g);
  return g;
}

/** Capsule limb from point a to point b. */
export function limb(parent, a, b, r, color, opts) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb);
  const m = part(parent, G.capsule(r, Math.max(0.001, len)), color, [0, 0, 0], [0, 0, 0], [1, 1, 1], opts);
  m.position.copy(va.clone().add(vb).multiplyScalar(0.5));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  return m;
}

// ---- rig -------------------------------------------------------------------
/** Named pivots used by the animations (head, armL/armR, legL/legR, flash, rotors…). */
export function rig(root) {
  root.userData.rig ??= {};
  return root.userData.rig;
}

/** Re-parents a prop (weapon, shield…) to an arm pivot, keeping its current placement. */
export function hold(root, obj, side = 'R') {
  root.updateMatrixWorld(true);
  rig(root)['arm' + side].attach(obj);
  return obj;
}

/** A glowing flash (muzzle fire, heal sparkle) hidden until an attack frame shows it. */
export function flash(parent, pos, color, size = 0.12, key = 'flash') {
  const g = group(parent, pos);
  part(g, G.sphere(size, 16), color, [0, 0, 0], [0, 0, 0], [1, 1, 1], { glow: true, outline: false, opacity: 0.85 });
  part(g, G.sphere(size * 0.55, 16), '#ffffff', [0, 0, 0], [0, 0, 0], [1, 1, 1], { glow: true, outline: false });
  g.visible = false;
  let root = parent;
  while (root.parent && !root.userData.isModelRoot) root = root.parent;
  const r = rig(root);
  (r[key] ??= []).push(g);
  return g;
}

// ---- chibi humanoid ----------------------------------------------------------
// Faces +z. Height ~2. Head centre at y=1.38.
export const HEAD_Y = 1.38;
export const HEAD_R = 0.52;

export function head(root, c) {
  const h = group(root, [0, HEAD_Y, 0]);
  rig(root).head = h;
  part(h, G.sphere(HEAD_R), c.skin, [0, 0, 0], [0, 0, 0], [1, 0.96, 0.95]);
  // ears
  part(h, G.sphere(0.09), c.skin, [-0.5, -0.04, 0.0], [0, 0, 0], [0.6, 1, 1]);
  part(h, G.sphere(0.09), c.skin, [0.5, -0.04, 0.0], [0, 0, 0], [0.6, 1, 1]);
  if (c.face !== false) face(h, c);
  return h;
}

export function face(h, c) {
  const z = 0.455;
  for (const side of [-1, 1]) {
    const e = group(h, [side * 0.19, -0.05, z], [0, side * 0.32, 0]);
    part(e, G.sphere(0.1), '#2a1d2f', [0, 0, 0], [0, 0, 0], [0.82, 1.15, 0.28], { outline: false });
    part(e, G.sphere(0.075), c.iris ?? '#c8323a', [0, -0.025, 0.02], [0, 0, 0], [0.8, 1.05, 0.28], { outline: false });
    part(e, G.sphere(0.03), '#ffffff', [0.03, 0.04, 0.045], [0, 0, 0], [1, 1, 0.4], { outline: false, glow: true });
    if (c.brows !== false) part(e, G.box(0.17, 0.025, 0.02), c.browColor ?? c.hair ?? '#3a2a2a', [0, 0.17, 0.0], [0, 0, side * -0.12], [1, 1, 1], { outline: false });
  }
  if (c.mouth !== false) part(h, G.sphere(0.035), '#9a4a44', [0.0, -0.24, 0.47], [0, 0, 0], [1.4, 0.6, 0.4], { outline: false });
  if (c.blush !== false) {
    part(h, G.sphere(0.06), '#f29a92', [-0.3, -0.17, 0.4], [0, -0.5, 0], [1.3, 0.6, 0.3], { outline: false, glow: true, opacity: 0.55 });
    part(h, G.sphere(0.06), '#f29a92', [0.3, -0.17, 0.4], [0, 0.5, 0], [1.3, 0.6, 0.3], { outline: false, glow: true, opacity: 0.55 });
  }
}

/**
 * Anime-style hair: a cap set back on the skull, pointed bangs over the forehead and side locks.
 * opts: { bangs: number of fringe locks, side: side lock length, back: extra volume at the back }
 */
export function hair(h, color, opts = {}) {
  const R = HEAD_R;
  part(h, G.sphere(R * 1.08), color, [0, 0.13, -0.15], [0, 0, 0], [1.04, 0.98, 1.05 * (opts.back ?? 1)]);
  const n = opts.bangs ?? 5;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5;          // -0.5 .. 0.5
    const x = t * 0.72;
    const len = (opts.bangLen ?? 0.36) * (1 - Math.abs(t) * 0.35);
    part(h, G.cone(0.15, len, 12), color, [x * 0.82, 0.2 - len * 0.32, 0.43 - Math.abs(t) * 0.3], [Math.PI - 0.12, t * 0.6, -t * 0.12], [1, 1, 0.5], { outlineScale: 1.04 });
  }
  const side = opts.side ?? 0.35;
  if (side > 0) {
    for (const s of [-1, 1]) limb(h, [s * 0.44, 0.12, 0.12], [s * 0.46, 0.12 - side, 0.2], 0.09, color, { outlineScale: 1.05 });
  }
}

export function body(root, c, opts = {}) {
  const coat = c.coat;
  // torso (slightly tapered)
  part(root, G.cyl(0.27, 0.33, 0.5, 24), coat, [0, 0.72, 0]);
  part(root, G.sphere(0.27), coat, [0, 0.95, 0], [0, 0, 0], [1, 0.45, 0.9]);
  if (opts.longCoat) part(root, G.cyl(0.33, opts.flare ?? 0.48, 0.42, 24), opts.longCoatColor ?? coat, [0, 0.36, 0]);
  // hips / trousers
  part(root, G.cyl(0.3, 0.3, 0.12, 24), c.pants, [0, 0.47, 0]);
  // legs
  for (const side of [-1, 1]) {
    const hip = group(root, [side * 0.13, 0.45, 0]);
    rig(root)[side < 0 ? 'legL' : 'legR'] = hip;
    limb(hip, [0, 0, 0], [side * 0.01, -0.31, 0.02], 0.1, c.pants);
    part(hip, G.sphere(0.13), c.boots, [side * 0.01, -0.37, 0.06], [0, 0, 0], [0.95, 0.65, 1.35]);
  }
  // neck
  part(root, G.cyl(0.09, 0.1, 0.16, 16), c.skin, [0, 1.0, 0], [0, 0, 0], [1, 1, 1], { outline: false });
}

/** Arms. pose: {l: [elbow, hand], r: [elbow, hand]} in local coords. Returns hand positions. */
export function arms(root, c, pose = {}) {
  const sh = { l: [-0.34, 0.92, 0], r: [0.34, 0.92, 0] };
  const def = { l: [[-0.42, 0.72, 0.02], [-0.43, 0.55, 0.06]], r: [[0.42, 0.72, 0.02], [0.43, 0.55, 0.06]] };
  const out = {};
  for (const s of ['l', 'r']) {
    const [elbow, hand] = pose[s] ?? def[s];
    const p = group(root, sh[s]);
    rig(root)[s === 'l' ? 'armL' : 'armR'] = p;
    const rel = (v) => [v[0] - sh[s][0], v[1] - sh[s][1], v[2] - sh[s][2]];
    limb(p, [0, 0, 0], rel(elbow), 0.085, c.sleeve ?? c.coat);
    limb(p, rel(elbow), rel(hand), 0.078, c.sleeve ?? c.coat);
    part(p, G.sphere(0.09), c.gloves ?? c.skin, rel(hand));
    out[s] = hand;
  }
  return out;
}
