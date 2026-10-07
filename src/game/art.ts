// Placeholder pixel art generated at runtime, plus the hook that lets real art
// (listed in public/assets/manifest.json) replace any placeholder by texture key.
// See docs/ART_GUIDE.md for the list of keys and expected sizes.

import Phaser from 'phaser';
import { ENEMIES } from '../data/enemies';
import { OPERATORS } from '../data/operators';

export interface ManifestSprite {
  file: string;
  /** Omit for a single static image. */
  frameWidth?: number;
  frameHeight?: number;
  anims?: Record<string, { frames: number[]; fps: number; repeat?: number }>;
}

export interface Manifest {
  sprites: Record<string, ManifestSprite>;
}

export const MANIFEST_KEY = 'manifest';

// ---------------------------------------------------------------------------
// Pixel maps (16x16, drawn at 2x to fill a 32x32 frame). Characters face right.

const HUMAN = [
  '................',
  '......kkkk......',
  '.....khhhhk.....',
  '.....khhhhhk....',
  '.....khhssek....',
  '.....khssssk....',
  '......kkssk.....',
  '.....kccaacck...',
  '....kcccaaccck..',
  '....kcccccccck..',
  '....kscccccdsk..',
  '.....kccccddk...',
  '.....kppppppk...',
  '.....kppkkppk...',
  '.....kppk.kppk..',
  '....kbbbk.kbbbk.',
];

const HELMET_HEAD = [
  '................',
  '......kkkk......',
  '.....khhhhk.....',
  '.....khhhhhk....',
  '.....khvvvek....',
  '.....khhhhhk....',
  '......kkssk.....',
];

const HOUND = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '...........kk...',
  '..........kffk..',
  '.k.......kfffek.',
  'kfk.....kffffffk',
  '.kfkkkkkkfffkkk.',
  '..kffffffffk....',
  '..kffffffffk....',
  '..kfkkkkkkfk....',
  '..kfk....kfk....',
  '..kfk....kfk....',
  '..kkk....kkk....',
];

const DRONE = [
  '................',
  '................',
  '................',
  '................',
  '.kkkkk....kkkkk.',
  '...k........k...',
  '...kkkkkkkkkk...',
  '..kmmmmmmmmmmk..',
  '.kmmmmvvvvmmmmk.',
  '.kmmmvveevvmmmk.',
  '..kmmmvvvvmmmk..',
  '...kkkkkkkkkk...',
  '....k......k....',
  '................',
  '................',
  '................',
];

type Palette = Record<string, string>;
/** Extra pixels drawn over a base map: [x, y, paletteChar]. */
type Overlay = [number, number, string][];

const BASE_PAL: Palette = { k: '#0b0b0d', s: '#e3b896', e: '#1b1b1b', b: '#1b1c20', p: '#2c2e35' };

function line(x0: number, y0: number, x1: number, y1: number, ch: string): Overlay {
  const out: Overlay = [];
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i++) {
    out.push([Math.round(x0 + ((x1 - x0) * i) / (steps || 1)), Math.round(y0 + ((y1 - y0) * i) / (steps || 1)), ch]);
  }
  return out;
}

function box(x0: number, y0: number, x1: number, y1: number, fill: string, border = 'k'): Overlay {
  const out: Overlay = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const edge = x === x0 || x === x1 || y === y0 || y === y1;
      out.push([x, y, edge ? border : fill]);
    }
  }
  return out;
}

const WEAPONS: Record<string, Overlay> = {
  sword: [...line(13, 2, 13, 9, 'w'), [12, 9, 'g'], [14, 9, 'g'], [13, 10, 'g'], [14, 2, 'k'], [12, 2, 'k']],
  shield: [...box(11, 6, 14, 13, 'S'), [12, 9, 'a'], [13, 9, 'a'], [12, 10, 'a'], [13, 10, 'a']],
  medkit: [[8, 8, 'a'], [7, 9, 'a'], [8, 9, 'a'], [9, 9, 'a'], [8, 10, 'a'], ...box(12, 10, 15, 13, 'S'), [13, 11, 'a'], [14, 11, 'a']],
  rifle: [...line(7, 9, 15, 9, 'g'), [11, 8, 'g'], [12, 8, 'g'], [15, 8, 'k'], [8, 10, 'g']],
  launcher: [...box(3, 5, 15, 7, 'g'), [15, 6, 'a'], [9, 8, 'g']],
  baton: [...line(12, 7, 12, 12, 'g')],
  riotShield: [...box(11, 4, 14, 14, 'S'), ...line(12, 7, 13, 7, 'v')],
  hammer: [...line(13, 3, 13, 12, 'g'), ...box(12, 2, 15, 5, 'w')],
  pistols: [[13, 9, 'g'], [14, 9, 'g'], [15, 9, 'g'], [13, 10, 'g'], [3, 9, 'g'], [2, 9, 'g'], [1, 9, 'g'], [3, 10, 'g']],
};

interface CharacterArt {
  map: string[];
  pal: Palette;
  overlay?: Overlay;
  helmet?: boolean;
  /** Long coat instead of trousers. */
  coat?: boolean;
}

const OP_ART: Record<string, CharacterArt> = {
  brasa: { map: HUMAN, pal: { h: '#8a2a1c', c: '#2b2d34', d: '#1f2026', a: '#c8323a', w: '#d8dde3', g: '#555' }, overlay: WEAPONS.sword },
  faisca: { map: HUMAN, pal: { h: '#e0b050', c: '#33353d', d: '#24252b', a: '#ff6a3a', w: '#ffd9a0', g: '#555' }, overlay: WEAPONS.sword },
  muralha: { map: HUMAN, pal: { h: '#3b3b3b', c: '#4a4e57', d: '#363940', a: '#c8323a', S: '#6b707a' }, overlay: WEAPONS.shield },
  bastiao: { map: HUMAN, pal: { h: '#6b5a4a', c: '#3d4048', d: '#2c2e34', a: '#c8323a', S: '#8a7f73' }, overlay: WEAPONS.shield },
  falcao: { map: HUMAN, pal: { h: '#a8a8a8', c: '#2a2724', d: '#1d1b19', a: '#c8323a', g: '#6b707a' }, overlay: WEAPONS.rifle },
  lirio: { map: HUMAN, pal: { h: '#d9d2c5', c: '#e8e8e8', d: '#bdbdbd', a: '#c8323a', S: '#f4f4f4' }, overlay: WEAPONS.medkit },
  corvo: { map: HUMAN, pal: { h: '#121214', c: '#1d1e22', d: '#141518', a: '#c8323a', g: '#5c616b' }, overlay: WEAPONS.rifle },
  trovao: { map: HUMAN, pal: { h: '#5a4632', c: '#3f4436', d: '#2f3329', a: '#c8323a', g: '#2a2c30' }, overlay: WEAPONS.launcher },
};

const REGIME = { h: '#d9dbe0', c: '#c9ccd3', d: '#9a9ea8', a: '#1b1c20', p: '#8e939c', v: '#111214', e: '#bfd7ff', g: '#333' };

const ENEMY_ART: Record<string, CharacterArt> = {
  peacekeeper: { map: HUMAN, helmet: true, pal: REGIME, overlay: WEAPONS.baton },
  rifleman: { map: HUMAN, helmet: true, pal: { ...REGIME, c: '#b4b9c2', a: '#5a6b85', g: '#26272b' }, overlay: WEAPONS.rifle },
  riot: { map: HUMAN, helmet: true, pal: { ...REGIME, h: '#1d1f24', c: '#2b2d33', d: '#1f2025', a: '#bfd7ff', p: '#26282d', S: '#9fb0c8' }, overlay: WEAPONS.riotShield },
  cleric: { map: HUMAN, coat: true, pal: { h: '#0c0c0e', c: '#151518', d: '#050506', a: '#efefef', p: '#151518', g: '#9aa0aa', s: '#e8cfc0' }, overlay: WEAPONS.pistols },
  executor: { map: HUMAN, helmet: true, pal: { ...REGIME, h: '#26282e', c: '#33363d', d: '#22242a', a: '#bfd7ff', p: '#2a2c32', w: '#8d939e', g: '#4a4d55' }, overlay: WEAPONS.hammer },
  gunship: { map: DRONE, pal: { m: '#4a4f5a', v: '#0e0f12', e: '#ff5a5f' }, overlay: [[2, 11, 'v'], [3, 12, 'v'], [13, 11, 'v'], [12, 12, 'v']] },
  hound: { map: HOUND, pal: { f: '#3a3d44', e: '#bfd7ff' } },
  drone: { map: DRONE, pal: { m: '#d9dbe0', v: '#16171a', e: '#bfd7ff' } },
};

function composeCharacter(art: CharacterArt): string[][] {
  const rows = art.map.map((r) => r.split(''));
  if (art.helmet) HELMET_HEAD.forEach((r, y) => (rows[y] = r.split('')));
  if (art.coat) {
    for (let y = 11; y <= 14; y++) for (let x = 0; x < 16; x++) if (rows[y][x] === 'p') rows[y][x] = 'c';
  }
  for (const [x, y, ch] of art.overlay ?? []) if (x >= 0 && x < 16 && y >= 0 && y < 16) rows[y][x] = ch;
  return rows;
}

// ---------------------------------------------------------------------------
// Drawing helpers

function canvasTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  draw(tex.getContext());
  tex.refresh();
}

function drawMap(ctx: CanvasRenderingContext2D, rows: string[][], pal: Palette, scale: number, ox = 0, oy = 0): void {
  rows.forEach((row, y) =>
    row.forEach((ch, x) => {
      if (ch === '.') return;
      const color = pal[ch] ?? BASE_PAL[ch];
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
    }),
  );
}

/** Deterministic per-pixel noise so tiles look textured but identical every run. */
function noise(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function stripes(ctx: CanvasRenderingContext2D, color: string): void {
  ctx.fillStyle = color;
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if ((x + y) % 8 < 2) ctx.fillRect(x, y, 1, 1);
}

function groundTile(ctx: CanvasRenderingContext2D, locked: boolean): void {
  px(ctx, 0, 0, 32, 32, '#7d8088');
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = noise(x, y, 1);
    if (n < 0.06) px(ctx, x, y, 1, 1, '#6f727a');
    else if (n > 0.95) px(ctx, x, y, 1, 1, '#8d9098');
  }
  if (locked) stripes(ctx, '#666971');
  px(ctx, 0, 0, 32, 1, '#9a9da5');
  px(ctx, 0, 0, 1, 32, '#9a9da5');
  px(ctx, 0, 31, 32, 1, '#55585f');
  px(ctx, 31, 0, 1, 32, '#55585f');
}

function highTile(ctx: CanvasRenderingContext2D, locked: boolean): void {
  px(ctx, 0, 0, 32, 32, '#3a3d44');
  px(ctx, 1, 1, 30, 24, '#5f636c');
  for (let y = 1; y < 25; y++) for (let x = 1; x < 31; x++) if (noise(x, y, 2) < 0.05) px(ctx, x, y, 1, 1, '#555960');
  if (locked) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(1, 1, 30, 24);
    ctx.clip();
    stripes(ctx, '#4c5058');
    ctx.restore();
  }
  px(ctx, 1, 1, 30, 1, '#8a8e97');
  px(ctx, 1, 25, 30, 1, '#2a2c31');
  px(ctx, 0, 26, 32, 6, '#2e3036');
  for (const x of [4, 27]) px(ctx, x, 4, 1, 1, '#9da1aa');
  for (const x of [4, 27]) px(ctx, x, 21, 1, 1, '#9da1aa');
}

function wallTile(ctx: CanvasRenderingContext2D): void {
  px(ctx, 0, 0, 32, 32, '#15161a');
  for (let row = 0; row < 4; row++) {
    const off = row % 2 === 0 ? 0 : 8;
    px(ctx, 0, row * 8, 32, 1, '#1d1e23');
    for (let x = off; x < 32; x += 16) px(ctx, x, row * 8, 1, 8, '#1d1e23');
  }
}

function portalTile(ctx: CanvasRenderingContext2D, fill: string, glow: string, dark: string): void {
  px(ctx, 0, 0, 32, 32, dark);
  px(ctx, 3, 3, 26, 26, glow);
  px(ctx, 5, 5, 22, 22, fill);
  px(ctx, 9, 9, 14, 14, glow);
  px(ctx, 11, 11, 10, 10, fill);
  px(ctx, 15, 6, 2, 20, glow);
}

const ICONS: Record<string, string[]> = {
  icon_vanguard: ['..kk....', '.kwwk...', '.kwwwk..', '..kwwwk.', '...kwwk.', '..k.kk..', '.k......', 'k.......'],
  icon_defender: ['.kkkkkk.', 'kwwwwwwk', 'kwwkkwwk', 'kwwkkwwk', 'kwwwwwwk', '.kwwwwk.', '..kwwk..', '...kk...'],
  icon_medic: ['..kkkk..', '..kwwk..', 'kkkwwkkk', 'kwwwwwwk', 'kwwwwwwk', 'kkkwwkkk', '..kwwk..', '..kkkk..'],
  icon_sniper: ['...ww...', '..kwwk..', '.k.ww.k.', 'wwwkkwww', 'wwwkkwww', '.k.ww.k.', '..kwwk..', '...ww...'],
  ui_heart: ['.kk..kk.', 'krrkkrrk', 'krrrrrrk', 'krrrrrrk', '.krrrrk.', '..krrk..', '...kk...', '........'],
  ui_dp: ['...kk...', '..kwwk..', '.kwwwwk.', 'kwwwwwwk', 'kwwwwwwk', '.kwwwwk.', '..kwwk..', '...kk...'],
  ui_star: ['...kk...', '..kyyk..', 'kkkyykkk', 'kyyyyyyk', '.kyyyyk.', '.kykkyk.', 'kyk..kyk', 'kk....kk'],
  ui_star_empty: ['...kk...', '..kmmk..', 'kkkmmkkk', 'kmmmmmmk', '.kmmmmk.', '.kmkkmk.', 'kmk..kmk', 'kk....kk'],
  ui_arrow: ['k.......', 'kwk.....', 'kwwwk...', 'kwwwwwk.', 'kwwwwwk.', 'kwwwk...', 'kwk.....', 'k.......'],
};

const ICON_PAL: Palette = { k: '#0b0b0d', w: '#e6e6e6', r: '#c8323a', y: '#f2c94c', m: '#4a4d57' };

/** Creates every placeholder texture whose key is not already loaded from real art. */
export function createPlaceholderTextures(scene: Phaser.Scene): void {
  canvasTexture(scene, 'tile_ground', 32, 32, (c) => groundTile(c, false));
  canvasTexture(scene, 'tile_ground_locked', 32, 32, (c) => groundTile(c, true));
  canvasTexture(scene, 'tile_high', 32, 32, (c) => highTile(c, false));
  canvasTexture(scene, 'tile_high_locked', 32, 32, (c) => highTile(c, true));
  canvasTexture(scene, 'tile_wall', 32, 32, wallTile);
  canvasTexture(scene, 'tile_spawn', 32, 32, (c) => portalTile(c, '#1e2a3a', '#bfd7ff', '#101318'));
  canvasTexture(scene, 'tile_base', 32, 32, (c) => portalTile(c, '#3a1416', '#c8323a', '#1a0a0b'));

  for (const id of Object.keys(OPERATORS)) {
    const art = OP_ART[id];
    if (!art) continue;
    canvasTexture(scene, `op_${id}`, 32, 32, (c) => drawMap(c, composeCharacter(art), art.pal, 2));
  }
  for (const id of Object.keys(ENEMIES)) {
    const art = ENEMY_ART[id];
    if (!art) continue;
    canvasTexture(scene, `en_${id}`, 32, 32, (c) => drawMap(c, composeCharacter(art), art.pal, 2));
  }

  for (const [key, map] of Object.entries(ICONS)) {
    canvasTexture(scene, key, 8, 8, (c) => drawMap(c, map.map((r) => r.split('')), ICON_PAL, 1));
  }

  canvasTexture(scene, 'fx_slash', 16, 16, (c) => {
    for (let i = 0; i < 12; i++) {
      const a = -1.2 + (i / 11) * 2.4;
      px(c, Math.round(8 + Math.cos(a) * 6), Math.round(8 + Math.sin(a) * 6), 2, 2, '#ffffff');
    }
  });
  canvasTexture(scene, 'fx_spark', 2, 2, (c) => px(c, 0, 0, 2, 2, '#ffffff'));
  canvasTexture(scene, 'fx_shell', 4, 4, (c) => {
    px(c, 0, 0, 4, 4, '#0b0b0d');
    px(c, 1, 1, 2, 2, '#f2c94c');
  });
  canvasTexture(scene, 'fx_heal', 5, 5, (c) => {
    px(c, 2, 0, 1, 5, '#7dffa1');
    px(c, 0, 2, 5, 1, '#7dffa1');
  });
  canvasTexture(scene, 'fx_shadow', 16, 4, (c) => {
    px(c, 2, 0, 12, 4, 'rgba(0,0,0,0.45)');
    px(c, 0, 1, 16, 2, 'rgba(0,0,0,0.45)');
  });
}

/** Queues every sprite from the manifest; call from a scene's create() and then start the loader. */
export function queueManifest(scene: Phaser.Scene, manifest: Manifest | undefined): void {
  for (const [key, s] of Object.entries(manifest?.sprites ?? {})) {
    if (key.startsWith('_')) continue;
    const url = `assets/${s.file}`;
    if (s.frameWidth) scene.load.spritesheet(key, url, { frameWidth: s.frameWidth, frameHeight: s.frameHeight ?? s.frameWidth });
    else scene.load.image(key, url);
  }
}

/** Registers animations declared in the manifest as `<textureKey>:<animName>`. */
export function createManifestAnims(scene: Phaser.Scene, manifest: Manifest | undefined): void {
  for (const [key, s] of Object.entries(manifest?.sprites ?? {})) {
    if (!s.anims || !scene.textures.exists(key)) continue;
    for (const [name, a] of Object.entries(s.anims)) {
      const animKey = `${key}:${name}`;
      if (scene.anims.exists(animKey)) continue;
      scene.anims.create({
        key: animKey,
        frames: scene.anims.generateFrameNumbers(key, { frames: a.frames }),
        frameRate: a.fps,
        repeat: a.repeat ?? (name === 'idle' || name === 'move' ? -1 : 0),
      });
    }
  }
}
