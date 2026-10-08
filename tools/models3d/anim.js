// Procedural animations applied on top of each model's rest pose.
// pose(model, anim, t): anim is 'idle' | 'move' | 'attack', t is the phase in [0, 1).

const TAU = Math.PI * 2;

/** How each model moves and attacks. */
export const STYLE = {
  brasa: { move: 'idle', attack: 'slash' },
  faisca: { move: 'idle', attack: 'stab' },
  muralha: { move: 'idle', attack: 'bash' },
  bastiao: { move: 'idle', attack: 'smash' },
  lirio: { move: 'idle', attack: 'heal' },
  corvo: { move: 'idle', attack: 'shoot' },
  falcao: { move: 'idle', attack: 'shoot' },
  trovao: { move: 'idle', attack: 'launch' },
  peacekeeper: { move: 'walk', attack: 'swing' },
  hound: { move: 'run', attack: 'bite' },
  riot: { move: 'walk', attack: 'bash' },
  rifleman: { move: 'walk', attack: 'shoot' },
  drone: { move: 'hover', attack: 'scan' },
  gunship: { move: 'hover', attack: 'strafe' },
  executor: { move: 'walk', attack: 'smash' },
  incinerator: { move: 'walk', attack: 'flame' },
  infiltrator: { move: 'sneak', attack: 'stab' },
  medic: { move: 'walk', attack: 'heal' },
  armored: { move: 'roll', attack: 'cannon' },
  cleric: { move: 'walk', attack: 'gunkata' },
};

const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
/** Attack curve: wind-up (0..a), strike (a..b), recover (b..1). Returns -1..1-ish shaped value. */
function strike(t, a = 0.35, b = 0.5) {
  if (t < a) return -ease(t / a);
  if (t < b) return -1 + 2 * ease((t - a) / (b - a));
  return 1 - ease((t - b) / (1 - b));
}
const hit = (t, a = 0.38, b = 0.6) => t >= a && t < b;

function snapshot(model) {
  if (model.userData.rest) return model.userData.rest;
  const rest = new Map();
  model.traverse((o) => rest.set(o, { p: o.position.clone(), r: o.rotation.clone(), s: o.scale.clone(), v: o.visible }));
  model.userData.rest = rest;
  return rest;
}

function reset(model) {
  for (const [o, st] of snapshot(model)) {
    o.position.copy(st.p);
    o.rotation.copy(st.r);
    o.scale.copy(st.s);
    o.visible = st.v;
  }
}

const show = (list, on) => (list ?? []).forEach((f) => (f.visible = on));

export function pose(model, anim, t) {
  reset(model);
  const R = model.userData.rig ?? {};
  const st = STYLE[model.userData.id] ?? { move: 'idle', attack: 'slash' };
  const kind = anim === 'attack' ? st.attack : anim === 'move' ? st.move : 'idle';
  const s = Math.sin(t * TAU);
  const c = Math.cos(t * TAU);
  const baseY = model.position.y;

  // breathing for everyone with a head
  if (R.head && kind !== 'run' && kind !== 'bite') {
    R.head.position.y += s * 0.012;
    R.head.rotation.z += s * 0.025;
  }

  switch (kind) {
    case 'idle':
      if (R.armL) R.armL.rotation.x += s * 0.05;
      if (R.armR) R.armR.rotation.x -= s * 0.05;
      model.scale.y *= 1 + s * 0.008;
      break;

    case 'walk':
    case 'sneak': {
      const amp = kind === 'sneak' ? 0.45 : 0.6;
      if (R.legL) R.legL.rotation.x += s * amp;
      if (R.legR) R.legR.rotation.x -= s * amp;
      if (R.armL) R.armL.rotation.x -= s * amp * 0.6;
      if (R.armR) R.armR.rotation.x += s * amp * 0.25;
      model.position.y = baseY + Math.abs(c) * 0.035;
      if (kind === 'sneak') model.rotation.x += 0.12;
      break;
    }

    case 'run':
      R.legs?.forEach((l, i) => (l.rotation.x += Math.sin(t * TAU + (i % 2 === (i < 2 ? 0 : 1) ? 0 : Math.PI)) * 0.7));
      if (R.head) R.head.position.y += Math.abs(s) * 0.03;
      model.position.y = baseY + Math.abs(s) * 0.05;
      break;

    case 'hover':
      model.position.y = baseY + s * 0.06;
      model.rotation.z += c * 0.04;
      R.rotors?.forEach((r, i) => (r.rotation.y += t * TAU * 3 * (i % 2 ? 1 : -1)));
      break;

    case 'roll':
      R.wheels?.forEach((w) => (w.rotation.x += t * TAU));
      model.position.y = baseY + Math.abs(Math.sin(t * TAU * 2)) * 0.012;
      if (R.turret) R.turret.rotation.y += s * 0.08;
      break;

    // ---- attacks ------------------------------------------------------------
    case 'slash': {
      const k = strike(t);
      if (R.armR) { R.armR.rotation.x += k * 1.3 - 0.2; R.armR.rotation.z += k * 0.35; }
      model.rotation.y += k * 0.12;
      if (R.legR) R.legR.rotation.x -= Math.max(0, -k) * 0.3;
      break;
    }
    case 'stab': {
      const k = strike(t, 0.3, 0.45);
      if (R.armR) { R.armR.rotation.x += -Math.max(0, k) * 1.2 + Math.max(0, -k) * 0.6; }
      model.position.z += Math.max(0, k) * 0.12;
      break;
    }
    case 'bash': {
      const k = strike(t, 0.35, 0.5);
      model.rotation.x += Math.max(0, k) * 0.18 - Math.max(0, -k) * 0.08;
      model.position.z += Math.max(0, k) * 0.15;
      if (R.armR) R.armR.rotation.x -= Math.max(0, k) * 0.5;
      break;
    }
    case 'smash':
    case 'swing': {
      const k = strike(t, 0.4, 0.52);
      if (R.armR) R.armR.rotation.x += k * (kind === 'smash' ? 1.1 : 1.3);
      model.rotation.x += Math.max(0, k) * 0.1;
      show(R.flash, kind === 'swing' && hit(t, 0.48, 0.62));
      break;
    }
    case 'heal': {
      const k = Math.sin(Math.min(1, t / 0.6) * Math.PI);
      if (R.armR) R.armR.rotation.x -= k * 1.0;
      show(R.flash, t > 0.25 && t < 0.75);
      (R.flash ?? []).forEach((f) => f.scale.setScalar(0.6 + k * 0.8));
      break;
    }
    case 'shoot':
    case 'launch': {
      const kick = t > 0.4 && t < 0.7 ? 1 - (t - 0.4) / 0.3 : 0;
      const amt = kind === 'launch' ? 0.22 : 0.12;
      if (R.armR) R.armR.rotation.x += kick * amt;
      if (R.armL) R.armL.rotation.x += kick * amt;
      model.rotation.x -= kick * amt * 0.25;
      model.position.z -= kick * amt * 0.25;
      show(R.flash, hit(t, 0.4, 0.55));
      (R.flash ?? []).forEach((f) => f.scale.setScalar(kind === 'launch' ? 1.4 : 1));
      break;
    }
    case 'gunkata': {
      const k1 = Math.max(0, Math.sin(t * TAU));
      const k2 = Math.max(0, -Math.sin(t * TAU));
      if (R.armR) R.armR.rotation.x -= k1 * 0.5;
      if (R.armL) R.armL.rotation.x -= k2 * 0.5;
      model.rotation.y += Math.sin(t * TAU) * 0.25;
      show(R.flash, hit(t, 0.2, 0.32));
      show(R.flash2, hit(t, 0.7, 0.82));
      break;
    }
    case 'flame': {
      if (R.armR) R.armR.rotation.x += s * 0.05;
      (R.flame ?? []).forEach((f, i) => f.scale.set(1 + s * 0.15, 1.2 + Math.abs(Math.sin(t * TAU * 3 + i)) * 0.8, 1 + c * 0.15));
      break;
    }
    case 'bite': {
      const k = strike(t, 0.35, 0.5);
      if (R.head) { R.head.position.z += Math.max(0, k) * 0.3; R.head.position.y -= Math.max(0, k) * 0.1; R.head.rotation.x += Math.max(0, k) * 0.45 - Math.max(0, -k) * 0.3; }
      model.position.z += Math.max(0, k) * 0.18;
      R.legs?.forEach((l, i) => (l.rotation.x += (i < 2 ? -1 : 1) * Math.max(0, -k) * 0.2));
      break;
    }
    case 'scan':
      model.position.y = baseY + s * 0.06;
      R.rotors?.forEach((r, i) => (r.rotation.y += t * TAU * 3 * (i % 2 ? 1 : -1)));
      model.rotation.y += s * 0.4;
      break;
    case 'strafe':
      R.rotors?.forEach((r, i) => (r.rotation.y += t * TAU * 3 * (i % 2 ? 1 : -1)));
      model.rotation.x += 0.15;
      model.position.y = baseY + s * 0.03;
      show(R.flash, (t * 4) % 1 < 0.35);
      break;
    case 'cannon': {
      const kick = t > 0.35 && t < 0.8 ? 1 - (t - 0.35) / 0.45 : 0;
      if (R.turret) R.turret.position.z -= kick * 0.12;
      model.rotation.x -= kick * 0.04;
      show(R.flash, hit(t, 0.35, 0.5));
      break;
    }
  }
}
