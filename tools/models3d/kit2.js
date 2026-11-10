import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Second-generation character kit: anime "SD" proportions (about 2.4 heads tall), two-tone cel shading
// with tinted shadows and a rim light, drawn faces and even-width tinted outlines.

// ---- materials -----------------------------------------------------------
// Light direction in view space: the sprite camera never moves, so the shading stays put like 2D art.
const LIGHT = new THREE.Vector3(-0.42, 0.62, 0.66).normalize();

const TOON_VERT = /* glsl */ `
  varying vec3 vN;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
const TOON_FRAG = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uShade;
  uniform vec3 uLight;
  uniform vec3 uRim;
  uniform float uOpacity;
  uniform float uSoft;
  uniform float uGloss;
  uniform float uRing;
  uniform float uThresh;
  varying vec3 vN;
  varying vec2 vUv;
  void main() {
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    float ndl = dot(n, uLight);
    float lit = smoothstep(-uSoft, uSoft, ndl - uThresh);
    vec3 col = mix(uShade, uBase, lit);
    // a second, lighter tone on the surfaces facing the light
    float hi = smoothstep(0.80, 0.86, ndl);
    col = mix(col, col * 1.10 + 0.035, hi * 0.6);
    // glossy materials get a small hard highlight
    vec3 h = normalize(uLight + vec3(0.0, 0.0, 1.0));
    float spec = smoothstep(0.984, 0.992, dot(n, h)) * uGloss;
    col = mix(col, vec3(1.0), spec * 0.8);
    // hair: a zig-zag ring of light around the crown
    float ring = smoothstep(0.05, 0.025, abs(n.y - 0.60 + 0.035 * sin(atan(n.x, n.z) * 16.0))) * step(0.1, n.z) * uRing;
    col = mix(col, col * 1.3 + 0.14, ring);
    // cool rim light on the side away from the key light
    float rim = smoothstep(0.62, 0.9, 1.0 - n.z) * smoothstep(0.1, -0.4, ndl);
    col += uRim * rim;
    gl_FragColor = vec4(col, uOpacity);
    #include <colorspace_fragment>
  }`;

const OUTLINE_VERT = /* glsl */ `
  uniform float uWidth;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    mv.xyz += n * uWidth;
    gl_Position = projectionMatrix * mv;
  }`;
const OUTLINE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  void main() {
    gl_FragColor = vec4(uColor, 1.0);
    #include <colorspace_fragment>
  }`;

/** Shadow tone: darker, more saturated and pulled towards violet (warm tones go towards red). */
export function shadeOf(hex, amount = 1) {
  const c = new THREE.Color(hex);
  const hsl = {};
  c.getHSL(hsl);
  const warm = hsl.h < 0.14 || hsl.h > 0.92;
  const target = warm ? 0.98 : 0.72;
  let dh = target - hsl.h;
  if (dh > 0.5) dh -= 1;
  if (dh < -0.5) dh += 1;
  const h = (hsl.h + dh * 0.12 * amount + 1) % 1;
  const s = Math.min(1, hsl.s * 1.12 + 0.04);
  const l = hsl.l * (1 - 0.34 * amount);
  return new THREE.Color().setHSL(h, s, l);
}
function inkOf(hex) {
  const c = new THREE.Color(hex);
  const hsl = {};
  c.getHSL(hsl);
  return new THREE.Color().setHSL(hsl.h, Math.min(0.8, hsl.s * 0.7 + 0.05), Math.min(0.1, hsl.l * 0.2));
}

const cache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (cache.has(key)) return cache.get(key);
  let m;
  if (opts.glow) {
    m = new THREE.MeshBasicMaterial({ color, transparent: opts.opacity !== undefined, opacity: opts.opacity ?? 1, depthWrite: opts.opacity === undefined || opts.opacity >= 1 });
  } else {
    m = new THREE.ShaderMaterial({
      vertexShader: TOON_VERT,
      fragmentShader: TOON_FRAG,
      uniforms: {
        uBase: { value: new THREE.Color(color) },
        uShade: { value: opts.shade ? new THREE.Color(opts.shade) : shadeOf(color, opts.shadeAmount ?? 1) },
        uLight: { value: LIGHT },
        uRim: { value: new THREE.Color(opts.rim ?? '#9fc4ff').multiplyScalar(opts.rimK ?? 0.22) },
        uOpacity: { value: opts.opacity ?? 1 },
        uSoft: { value: opts.soft ?? 0.035 },
        uGloss: { value: opts.gloss ?? 0 },
        uRing: { value: opts.ring ?? 0 },
        uThresh: { value: opts.thresh ?? 0.02 },
      },
      transparent: opts.opacity !== undefined && opts.opacity < 1,
      side: opts.double ? THREE.DoubleSide : THREE.FrontSide,
    });
  }
  m.userData.ink = opts.inkColor ? new THREE.Color(opts.inkColor) : inkOf(color);
  cache.set(key, m);
  return m;
}

const inkCache = new Map();
function inkMat(color, width) {
  const key = color.getHexString() + width;
  if (!inkCache.has(key)) {
    inkCache.set(key, new THREE.ShaderMaterial({
      vertexShader: OUTLINE_VERT,
      fragmentShader: OUTLINE_FRAG,
      uniforms: { uColor: { value: color }, uWidth: { value: width } },
      side: THREE.BackSide,
    }));
  }
  return inkCache.get(key);
}

export const INK = 0.017;

/** Adds a mesh with an even-width, tinted outline. */
export function part(parent, geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], opts = {}) {
  const material = color && color.isMaterial ? color : mat(color, opts);
  const m = new THREE.Mesh(geo, material);
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.scale.set(...(typeof scale === 'number' ? [scale, scale, scale] : scale));
  parent.add(m);
  if (opts.outline !== false && !opts.glow && !(opts.opacity < 1)) {
    const o = new THREE.Mesh(geo, inkMat(material.userData.ink ?? new THREE.Color('#150f1c'), opts.ink ?? INK));
    o.userData.outline = true;
    m.add(o);
  }
  return m;
}

// ---- geometry helpers ------------------------------------------------------
function lathe(points, s = 28) {
  const g = new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)), s);
  g.computeVertexNormals();
  return g;
}

export const G = {
  sphere: (r = 1, s = 32) => new THREE.SphereGeometry(r, s, Math.max(8, s / 2)),
  capsule: (r, len) => new THREE.CapsuleGeometry(r, len, 8, 18),
  /** Cylinder / truncated cone with softened rims, so the outline wraps around the caps. */
  cyl: (rt, rb, h, s = 24, bevel) => {
    const b = bevel ?? Math.min(rt, rb, h) * 0.18;
    return lathe([[0, -h / 2], [rb - b, -h / 2], [rb, -h / 2 + b], [rt, h / 2 - b], [rt - b, h / 2], [0, h / 2]], s);
  },
  box: (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 3, r ?? Math.min(w, h, d) * 0.16),
  cone: (r, h, s = 16) => lathe([[0, -h / 2], [r * 0.85, -h / 2], [r, -h / 2 + r * 0.12], [r * 0.08, h / 2 - r * 0.05], [0, h / 2]], s),
  torus: (r, t, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, 12, 36, arc),
  lathe,
  /** A patch of a sphere facing +z: half-width `a` (radians) and polar range t0..t1. */
  patch: (r, a, t0, t1, s = 36) => new THREE.SphereGeometry(r, s, 20, Math.PI / 2 - a, a * 2, t0, t1 - t0),
};

/**
 * Tapered tube along a smooth curve: hair locks, scarves, tails, straps.
 * r: radius, [r0, r1, ...] or t => radius. opts.flat squashes it into a ribbon (0..1).
 */
export function tubeGeo(pts, r, opts = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  const N = opts.n ?? Math.max(8, pts.length * 5);
  const S = opts.s ?? 10;
  const flat = opts.flat ?? 1;
  const rad = (t) => {
    if (typeof r === 'function') return r(t);
    if (Array.isArray(r)) {
      const k = t * (r.length - 1);
      const i = Math.min(r.length - 2, Math.floor(k));
      return r[i] + (r[i + 1] - r[i]) * (k - i);
    }
    return r;
  };
  // Parallel-transport frames starting from a stable "side" vector: ribbons do not twist.
  const side = new THREE.Vector3(...(opts.side ?? [1, 0, 0]));
  const pos = [];
  const idx = [];
  let prevN = null;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const P = curve.getPoint(t);
    const T = curve.getTangent(t).normalize();
    let Nv = (prevN ?? side).clone();
    Nv.addScaledVector(T, -Nv.dot(T));
    if (Nv.lengthSq() < 1e-6) Nv = new THREE.Vector3(0, 0, 1).addScaledVector(T, -T.z);
    Nv.normalize();
    prevN = Nv;
    const Bv = new THREE.Vector3().crossVectors(T, Nv).normalize();
    const rr = Math.max(0.0005, rad(t));
    for (let j = 0; j < S; j++) {
      const a = (j / S) * Math.PI * 2;
      const v = P.clone().addScaledVector(Nv, Math.cos(a) * rr).addScaledVector(Bv, Math.sin(a) * rr * flat);
      pos.push(v.x, v.y, v.z);
    }
  }
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < S; j++) {
      const a = i * S + j, b = i * S + ((j + 1) % S), c = (i + 1) * S + j, d = (i + 1) * S + ((j + 1) % S);
      idx.push(a, b, c, b, d, c);
    }
  }
  // caps
  const p0 = curve.getPoint(0), p1 = curve.getPoint(1);
  const i0 = pos.length / 3;
  pos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
  for (let j = 0; j < S; j++) {
    idx.push(i0, (j + 1) % S, j);
    idx.push(i0 + 1, N * S + j, N * S + ((j + 1) % S));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
export function tube(parent, pts, r, color, opts = {}) {
  return part(parent, tubeGeo(pts, r, opts), color, [0, 0, 0], [0, 0, 0], [1, 1, 1], opts);
}

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
/** Any geometry whose +y axis is stretched from a to b (plates, barrels, sleeves). */
export function along(parent, geo, a, b, color, opts = {}) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const m = part(parent, geo, color, [0, 0, 0], [0, 0, 0], [1, 1, 1], opts);
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
  part(g, G.sphere(size * 1.5, 16), color, [0, 0, 0], [0, 0, 0], [1, 1, 1], { glow: true, opacity: 0.35 });
  part(g, G.sphere(size, 16), color, [0, 0, 0], [0, 0, 0], [1, 1, 1], { glow: true, opacity: 0.85 });
  part(g, G.sphere(size * 0.55, 16), '#ffffff', [0, 0, 0], [0, 0, 0], [1, 1, 1], { glow: true });
  g.visible = false;
  let root = parent;
  while (root.parent && !root.userData.isModelRoot) root = root.parent;
  const r = rig(root);
  (r[key] ??= []).push(g);
  return g;
}

// ---- figure ------------------------------------------------------------------
// Faces +z. About 2 units tall: feet at 0, hips 0.62, shoulders 1.0, head centre 1.5.
export const HIP_Y = 0.62;
export const SHOULDER_Y = 1.0;
export const SHOULDER_X = 0.235;
export const HEAD_Y = 1.5;
export const HEAD_R = 0.42;
const HEAD_S = [1, 0.95, 0.94];

// ---- face ----------------------------------------------------------------------
const FACE_A = (64 * Math.PI) / 180;      // half-width of the face patch
const FACE_T0 = (50 * Math.PI) / 180;
const FACE_T1 = (130 * Math.PI) / 180;
const FW = 768, FH = 480;

function faceTexture(c) {
  const cv = document.createElement('canvas');
  cv.width = FW;
  cv.height = FH;
  const g = cv.getContext('2d');
  const f = c.faceStyle ?? {};
  const iris = new THREE.Color(c.iris ?? '#c8323a');
  const css = (col, a = 1) => `rgba(${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)},${a})`;
  const srgb = (col) => new THREE.Color().copy(col).convertLinearToSRGB();
  const irisS = srgb(iris);
  const dark = new THREE.Color().copy(irisS).multiplyScalar(0.28);
  const light = new THREE.Color().copy(irisS).lerp(new THREE.Color(1, 1, 1), 0.45);
  const lash = f.lash ?? '#241a26';
  const eyeW = (f.eyeW ?? 1) * 112, eyeH = (f.eyeH ?? 1) * 146;
  const ex = 0.5 * FW, dx = (f.spread ?? 1) * 0.176 * FW;
  const ey = (f.eyeY ?? 0.6) * FH;
  const tilt = f.tilt ?? 0.06;           // outer corners raised (sharp) or lowered (gentle)
  const lid = f.lid ?? 0.16;             // how much the upper lid cuts into the eye

  if (c.blush !== false) {
    for (const s of [-1, 1]) {
      const bx = ex + s * dx * 1.32, by = ey + eyeH * 0.6;
      const gr = g.createRadialGradient(bx, by, 2, bx, by, 60);
      gr.addColorStop(0, 'rgba(238,120,120,0.42)');
      gr.addColorStop(1, 'rgba(238,120,120,0)');
      g.fillStyle = gr;
      g.fillRect(bx - 70, by - 50, 140, 100);
    }
  }

  for (const s of [-1, 1]) {
    g.save();
    g.translate(ex + s * dx, ey);
    g.scale(s, 1);                        // drawn for the right-hand eye, mirrored for the other
    g.rotate(-tilt);
    const w = eyeW / 2, h = eyeH / 2;
    const shape = () => {
      g.beginPath();
      g.moveTo(-w, -h * (1 - lid * 2.2));
      g.bezierCurveTo(-w * 0.6, -h * 1.02, w * 0.55, -h * 1.08, w, -h * (0.72 - lid));
      g.bezierCurveTo(w * 1.04, h * 0.2, w * 0.7, h * 0.98, 0, h);
      g.bezierCurveTo(-w * 0.75, h * 0.98, -w * 1.02, h * 0.3, -w, -h * (1 - lid * 2.2));
      g.closePath();
    };
    if (f.closed) {
      g.strokeStyle = lash;
      g.lineWidth = 9;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(-w, 0);
      g.quadraticCurveTo(0, h * 0.5, w, -h * 0.1);
      g.stroke();
      g.restore();
      continue;
    }
    // white
    shape();
    g.fillStyle = '#fbf8f6';
    g.fill();
    g.save();
    shape();
    g.clip();
    // iris
    const iw = w * 0.86, ih = h * 0.98, iy = h * 0.06;
    const gr = g.createLinearGradient(0, iy - ih, 0, iy + ih);
    gr.addColorStop(0, css(dark));
    gr.addColorStop(0.45, css(irisS));
    gr.addColorStop(1, css(light));
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(0, iy, iw, ih, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = css(dark, 0.9);
    g.lineWidth = 5;
    g.stroke();
    // pupil
    g.fillStyle = css(new THREE.Color().copy(dark).multiplyScalar(0.55));
    g.beginPath();
    g.ellipse(0, iy - ih * 0.08, iw * 0.42, ih * 0.5, 0, 0, Math.PI * 2);
    g.fill();
    // lower glow
    g.fillStyle = css(light, 0.75);
    g.beginPath();
    g.ellipse(0, iy + ih * 0.62, iw * 0.55, ih * 0.2, 0, 0, Math.PI * 2);
    g.fill();
    // shadow under the lid
    const sh = g.createLinearGradient(0, -h, 0, -h * 0.25);
    sh.addColorStop(0, 'rgba(30,16,40,0.55)');
    sh.addColorStop(1, 'rgba(30,16,40,0)');
    g.fillStyle = sh;
    g.fillRect(-w, -h, w * 2, h);
    // highlights
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(-iw * 0.38, iy - ih * 0.42, iw * 0.3, ih * 0.2, -0.5, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(iw * 0.4, iy + ih * 0.3, iw * 0.13, ih * 0.09, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
    // upper lash line with a small wing at the outer corner
    g.strokeStyle = lash;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.lineWidth = 13;
    g.beginPath();
    g.moveTo(-w * 1.02, -h * (1 - lid * 2.2) + 2);
    g.bezierCurveTo(-w * 0.6, -h * 1.04, w * 0.55, -h * 1.1, w * 1.04, -h * (0.72 - lid));
    g.stroke();
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(w * 1.02, -h * (0.72 - lid));
    g.lineTo(w * 1.26, -h * (0.9 - lid));
    g.stroke();
    // lower lid
    g.lineWidth = 3.5;
    g.strokeStyle = 'rgba(60,36,50,0.75)';
    g.beginPath();
    g.moveTo(-w * 0.55, h * 0.99);
    g.quadraticCurveTo(0, h * 1.07, w * 0.6, h * 0.9);
    g.stroke();
    g.restore();

    // eyebrow
    if (c.brows !== false) {
      g.save();
      g.translate(ex + s * dx, ey - eyeH * 0.5 - (f.browGap ?? 26));
      g.scale(s, 1);
      g.rotate(-(f.brow ?? 0.1));
      g.strokeStyle = c.browColor ?? '#3a2a2e';
      g.lineWidth = f.browW ?? 8;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(-eyeW * 0.48, 4);
      g.quadraticCurveTo(0, -8, eyeW * 0.56, -2);
      g.stroke();
      g.restore();
    }
  }

  // nose: a tiny shadow
  g.fillStyle = 'rgba(190,110,96,0.55)';
  g.beginPath();
  g.ellipse(ex + 5, ey + eyeH * 0.42, 4.5, 3, 0, 0, Math.PI * 2);
  g.fill();

  // mouth
  const my = ey + eyeH * 0.5 + (f.mouthY ?? 42);
  g.strokeStyle = '#8a3c3c';
  g.lineWidth = 5.5;
  g.lineCap = 'round';
  const mouth = c.mouth ?? 'smile';
  if (mouth === 'smile') {
    g.beginPath();
    g.moveTo(ex - 22, my - 3);
    g.quadraticCurveTo(ex, my + 12, ex + 22, my - 3);
    g.stroke();
  } else if (mouth === 'flat') {
    g.beginPath();
    g.moveTo(ex - 17, my + 1);
    g.lineTo(ex + 17, my);
    g.stroke();
  } else if (mouth === 'frown') {
    g.beginPath();
    g.moveTo(ex - 19, my + 5);
    g.quadraticCurveTo(ex, my - 7, ex + 19, my + 5);
    g.stroke();
  } else if (mouth === 'open') {
    g.fillStyle = '#7a2c32';
    g.beginPath();
    g.moveTo(ex - 21, my - 5);
    g.quadraticCurveTo(ex, my + 26, ex + 21, my - 5);
    g.closePath();
    g.fill();
    g.fillStyle = '#f2a0a0';
    g.beginPath();
    g.ellipse(ex, my + 7, 9, 5, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  } else if (mouth === 'grin') {
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(ex - 25, my - 5);
    g.quadraticCurveTo(ex, my + 20, ex + 25, my - 5);
    g.closePath();
    g.fill();
    g.stroke();
  }
  if (f.scar) {
    g.strokeStyle = 'rgba(170,70,70,0.8)';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(ex + dx * 0.7, ey - eyeH * 0.75);
    g.lineTo(ex + dx * 1.25, ey + eyeH * 0.8);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function head(root, c) {
  const h = group(root, [0, HEAD_Y, 0]);
  rig(root).head = h;
  const skinOpts = { shade: c.skinShade ?? '#eeb4a0', soft: 0.05, rimK: 0.1, thresh: -0.42, inkColor: '#5c3230' };
  // neck (child of the body so the head can tilt on it)
  part(root, G.cyl(0.062, 0.07, 0.16, 16), c.skin, [0, 1.1, 0], [0, 0, 0], [1, 1, 1], { ...skinOpts, outline: false });
  if (c.face === false) return h;
  part(h, G.sphere(HEAD_R, 40), c.skin, [0, 0, 0], [0, 0, 0], HEAD_S, skinOpts);
  for (const s of [-1, 1]) part(h, G.sphere(0.075), c.skin, [s * 0.405, -0.06, -0.02], [0, 0, 0], [0.5, 1, 0.8], skinOpts);
  const fm = new THREE.MeshBasicMaterial({ map: faceTexture(c), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const fp = new THREE.Mesh(G.patch(HEAD_R * 1.004, FACE_A, FACE_T0, FACE_T1), fm);
  fp.scale.set(...HEAD_S);
  fp.renderOrder = 2;
  h.add(fp);
  return h;
}

// ---- hair --------------------------------------------------------------------
/** A pointed, slightly flat lock of hair from a to b, bulging towards `bend`. */
export function lock(h, a, b, r, color, opts = {}) {
  const bend = opts.bend ?? [0, 0, 0];
  const mid = [(a[0] + b[0]) / 2 + bend[0], (a[1] + b[1]) / 2 + bend[1], (a[2] + b[2]) / 2 + bend[2]];
  return tube(h, [a, mid, b], opts.radii ?? [r * 0.75, r, r * 0.7, r * 0.06], color, { flat: opts.flat ?? 0.55, side: opts.side ?? [1, 0, 0], s: 10, n: 14, gloss: 0, ...opts });
}

/**
 * Anime hair: a cap tilted back off the forehead, a fringe of pointed locks, side locks and a shine band.
 * opts: { bangs, bangLen, part (-1..1 side parting), side (side lock length), volume, shine }
 */
export function hair(h, color, opts = {}) {
  const R = HEAD_R;
  const vol = opts.volume ?? 1;
  const ho = { rimK: 0.3, ...opts.mat };
  // cap: a sphere a little larger than the skull, open at the bottom, tilted so the hairline rises at the front
  const cap = opts.noCap ? null : part(h, new THREE.SphereGeometry(R * 1.075 * vol, 40, 24, 0, Math.PI * 2, 0, Math.PI * (opts.capCut ?? 0.56)), color,
    [0, 0.035, -0.035], [-(opts.capTilt ?? 0.62), 0, 0], [1.02, 1, 1.02], { ...ho, double: true, ring: opts.shine === false ? 0 : 1 });
  // fringe
  const n = opts.bangs ?? 5;
  const len = opts.bangLen ?? 0.2;     // how far below the hairline the fringe reaches
  const sideBias = opts.part ?? 0;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5;                     // -0.5 .. 0.5
    const ang = t * 1.9;
    const x0 = Math.sin(ang) * R * 0.78, z0 = Math.cos(ang) * R * 0.86;
    const sweep = (t - sideBias * 0.5) * 0.16;
    const l = len * (1 - Math.abs(t) * 0.25) * (1 + ((i * 7) % 3) * 0.06);
    lock(h, [x0 * 0.9, opts.bangTop ?? R * 0.66, z0 * 0.84], [x0 * 1.08 + sweep, R * 0.62 - l, z0 * 1.13 + 0.035], opts.bangR ?? 0.1, color,
      { bend: [sweep * 0.3, 0.02, 0.07], side: [Math.cos(ang), 0, -Math.sin(ang)], ...ho });
  }
  // side locks in front of the ears
  const side = opts.side ?? 0.3;
  if (side > 0) {
    for (const s of [-1, 1]) {
      lock(h, [s * R * 0.86, R * 0.42, R * 0.3], [s * R * 0.98, R * 0.1 - side, R * 0.42], 0.085, color,
        { bend: [s * 0.04, 0, 0.03], side: [0, 0, 1], ...ho });
    }
  }
  return cap;
}

// ---- body ----------------------------------------------------------------------
/**
 * Torso, hips and legs.
 * opts: { build (width factor), coat: length of a coat skirt below the belt (0 = none), coatColor, open (coat open at the front),
 *         collar: colour of a standing collar, shorts, skirt }
 */
export function body(root, c, opts = {}) {
  const w = opts.build ?? 1;
  const top = c.coat;
  // torso: shoulders -> waist -> hips, flattened front to back
  part(root, G.lathe([[0, 0.56], [0.17 * w, 0.57], [0.185 * w, 0.62], [0.16 * w, 0.72], [0.19 * w, 0.9], [0.2 * w, 0.98], [0.15 * w, 1.05], [0.07, 1.075], [0, 1.08]], 28), top,
    [0, 0, 0], [0, 0, 0], [1.12, 1, 0.74]);
  // shoulders
  for (const s of [-1, 1]) part(root, G.sphere(0.08 * w, 20), c.sleeve ?? top, [s * SHOULDER_X * w, SHOULDER_Y - 0.01, 0]);
  // hips / trousers
  part(root, G.lathe([[0, 0.5], [0.15 * w, 0.5], [0.19 * w, 0.56], [0.185 * w, 0.64], [0, 0.66]], 24), c.pants, [0, 0, 0], [0, 0, 0], [1.1, 1, 0.78]);
  // coat skirt
  if (opts.coat) {
    const L = opts.coat;
    const geo = new THREE.LatheGeometry([[0.17 * w, 0.66], [0.2 * w, 0.6], [0.22 * w + L * 0.22, 0.6 - L]].map(([r, y]) => new THREE.Vector2(r, y)), 28,
      opts.open ? Math.PI * 0.14 : 0, opts.open ? Math.PI * 1.72 : Math.PI * 2);
    geo.computeVertexNormals();
    part(root, geo, opts.coatColor ?? top, [0, 0, 0], [0, 0, 0], [1.12, 1, 0.86], { double: true });
    if (opts.lining) {
      const g2 = new THREE.LatheGeometry([[0.165 * w, 0.66], [0.195 * w, 0.6], [0.215 * w + L * 0.22, 0.605 - L]].map(([r, y]) => new THREE.Vector2(r, y)), 28,
        opts.open ? Math.PI * 0.14 : 0, opts.open ? Math.PI * 1.72 : Math.PI * 2);
      g2.computeVertexNormals();
      part(root, g2, opts.lining, [0, 0, 0], [0, 0, 0], [1.1, 1, 0.84], { double: true, outline: false });
    }
  }
  if (opts.collar) {
    const geo = new THREE.LatheGeometry([[0.1, 1.03], [0.125, 1.1], [0.135, 1.17]].map(([r, y]) => new THREE.Vector2(r, y)), 24, Math.PI * 0.18, Math.PI * 1.64);
    geo.computeVertexNormals();
    part(root, geo, opts.collar, [0, 0, -0.01], [0, 0, 0], [1.05, 1, 0.95], { double: true });
  }
  // legs
  const lw = opts.legs ?? 1;
  for (const s of [-1, 1]) {
    const hip = group(root, [s * 0.1 * w, HIP_Y - 0.04, 0]);
    rig(root)[s < 0 ? 'legL' : 'legR'] = hip;
    if (c.thigh !== false) limb(hip, [0, -0.02, 0], [s * 0.012, -0.25, 0.012], 0.083 * lw, opts.shorts ? c.skin : c.pants, opts.shorts ? { shade: c.skinShade ?? '#eeb4a0', inkColor: '#5c3230' } : undefined);
    if (opts.shorts) part(hip, G.cyl(0.098 * lw, 0.105 * lw, 0.15, 18), c.pants, [s * 0.004, -0.07, 0.004]);
    limb(hip, [s * 0.012, -0.27, 0.012], [s * 0.016, -0.44, 0.004], 0.066 * lw, c.socks ?? c.pants);
    // boot: shaft, foot and sole
    part(hip, G.cyl(0.082 * lw, 0.074 * lw, 0.2, 18), c.boots, [s * 0.016, -0.43, 0.004]);
    part(hip, G.sphere(0.092 * lw, 20), c.boots, [s * 0.018, -0.535, 0.05], [0, 0, 0], [0.92, 0.5, 1.5]);
    part(hip, G.box(0.15 * lw, 0.022, 0.25 * lw, 0.01), c.sole ?? '#2a252c', [s * 0.018, -0.568, 0.05], [0, 0, 0], [1, 1, 1], { ink: 0.008 });
    if (c.bootTrim) part(hip, G.torus(0.082 * lw, 0.016), c.bootTrim, [s * 0.016, -0.335, 0.004], [Math.PI / 2, 0, 0]);
    if (opts.knee) part(hip, G.cyl(0.078 * lw, 0.07 * lw, 0.1, 16, 0.02), opts.knee, [s * 0.013, -0.285, 0.012]);
  }
}

/** Arms. pose: {l: [elbow, hand], r: [elbow, hand]} in model coordinates. Returns hand positions. */
export function arms(root, c, pose = {}, opts = {}) {
  const w = opts.build ?? 1;
  const sh = { l: [-SHOULDER_X * w, SHOULDER_Y, 0], r: [SHOULDER_X * w, SHOULDER_Y, 0] };
  const def = { l: [[-0.3 * w, 0.8, 0.0], [-0.31 * w, 0.6, 0.07]], r: [[0.3 * w, 0.8, 0.0], [0.31 * w, 0.6, 0.07]] };
  const out = {};
  const k = opts.thick ?? 1;
  for (const s of ['l', 'r']) {
    const [elbow, hand] = pose[s] ?? def[s];
    const p = group(root, sh[s]);
    rig(root)[s === 'l' ? 'armL' : 'armR'] = p;
    const rel = (v) => [v[0] - sh[s][0], v[1] - sh[s][1], v[2] - sh[s][2]];
    const sleeve = c.sleeve ?? c.coat;
    limb(p, [0, 0, 0], rel(elbow), 0.063 * k, sleeve);
    const bare = opts.bare || (opts.bareL && s === 'l') || (opts.bareR && s === 'r');
    limb(p, rel(elbow), rel(hand), 0.057 * k, bare ? c.skin : c.forearm ?? sleeve, bare ? { shade: c.skinShade ?? '#eeb4a0', inkColor: '#5c3230' } : undefined);
    if (c.cuff && !bare) {
      const e = new THREE.Vector3(...rel(elbow)), hnd = new THREE.Vector3(...rel(hand));
      const a = e.clone().lerp(hnd, 0.62), b = e.clone().lerp(hnd, 0.92);
      along(p, G.cyl(0.068 * k, 0.065 * k, a.distanceTo(b), 16), a.toArray(), b.toArray(), c.cuff);
    }
    part(p, G.sphere(0.066 * k, 18), c.gloves ?? c.skin, rel(hand), [0, 0, 0], [1, 1, 1], c.gloves ? {} : { shade: c.skinShade ?? '#eeb4a0', inkColor: '#5c3230' });
    out[s] = hand;
  }
  return out;
}

// ---- shared props ------------------------------------------------------------------
export function belt(root, color, buckle = '#d9ad52', opts = {}) {
  const w = opts.build ?? 1;
  part(root, G.cyl(0.19 * w, 0.19 * w, 0.055, 24, 0.012), color, [0, 0.635, 0], [0, 0, 0], [1.12, 1, 0.8]);
  if (buckle) part(root, G.box(0.075, 0.06, 0.03, 0.01), buckle, [0, 0.635, 0.152 * w], [0, 0, 0], [1, 1, 1], { gloss: 0.6 });
  for (const [x, col] of opts.pouches ?? []) part(root, G.box(0.085, 0.1, 0.06, 0.018), col, [x, 0.6, Math.sqrt(Math.max(0, 1 - (x / (0.215 * w)) ** 2)) * 0.15 * w + 0.01]);
}

/** Scarf: a ring around the neck plus one or two tails streaming back. */
export function scarf(root, color, opts = {}) {
  part(root, G.torus(0.13, 0.062), color, [0, 1.085, 0.005], [Math.PI / 2 - 0.12, 0, 0], [1.08, 1, 1]);
  const tails = opts.tails ?? [[[0.1, 1.07, -0.1], [0.2, 0.98, -0.3], [0.16, 0.74, -0.42], [0.24, 0.56, -0.5]]];
  for (const t of tails) tube(root, t, [0.055, 0.075, 0.08, 0.07, 0.03], color, { flat: 0.35, side: [1, 0, 0], n: 20 });
}

/** Emblem of the Resistance: a red armband. */
export function armband(root, side = 'L', color = '#cc3138') {
  const p = rig(root)['arm' + side];
  if (!p) return;
  part(p, G.cyl(0.071, 0.071, 0.06, 16, 0.01), color, [side === 'L' ? -0.035 : 0.035, -0.1, 0], [0, 0, side === 'L' ? -0.3 : 0.3]);
}
