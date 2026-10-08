// Placeholder pixel art generated at runtime, plus the hook that lets real art
// (listed in public/assets/manifest.json) replace any placeholder by texture key.
// See docs/ART_GUIDE.md for the list of keys and expected sizes.

import Phaser from 'phaser';
import { ENEMIES } from '../data/enemies';
import { OPERATORS } from '../data/operators';
import type { Biome } from '../data/types';

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
/** Registry key holding the set of texture keys provided by real art. */
export const ART_KEYS = 'artKeys';

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

const TANK = [
  '................',
  '................',
  '................',
  '................',
  '.....kkkkkk.....',
  '....kmmmmmmkkkkk',
  '....kmmvvmmk....',
  '..kkkkkkkkkkkk..',
  '.kmmmmmmmmmmmmk.',
  '.kmmmmmmmmmmmmk.',
  '.kddddddddddddk.',
  '.kkkkkkkkkkkkkk.',
  '.kbkbkbkbkbkbkk.',
  '..kkkkkkkkkkkk..',
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
  flamer: [...line(8, 9, 13, 9, 'g'), [14, 8, 'f'], [14, 9, 'f'], [14, 10, 'f'], [15, 9, 'y'], [15, 8, 'f']],
  knife: [[12, 9, 'w'], [13, 8, 'w'], [11, 10, 'g']],
  regimeCross: [[8, 8, 'e'], [7, 9, 'e'], [8, 9, 'e'], [9, 9, 'e'], [8, 10, 'e'], ...box(12, 10, 14, 12, 'w')],
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
  incinerator: { map: HUMAN, helmet: true, pal: { ...REGIME, h: '#4a3f36', c: '#6b5b4a', d: '#4f4236', a: '#1b1c20', p: '#3d342b', e: '#ff9a3a', g: '#2a2a2a', f: '#ff6a1a', y: '#ffd04a' }, overlay: WEAPONS.flamer },
  infiltrator: { map: HUMAN, helmet: true, pal: { ...REGIME, h: '#22252b', c: '#2a2e36', d: '#1d2026', a: '#3d4a5c', p: '#1f2228', v: '#0b0c0e', e: '#7fe0ff', w: '#c9ced6', g: '#444' }, overlay: WEAPONS.knife },
  medic: { map: HUMAN, helmet: true, pal: { ...REGIME, c: '#e6e8ec', d: '#b9bdc6', a: '#bfd7ff', w: '#f4f4f4' }, overlay: WEAPONS.regimeCross },
  armored: { map: TANK, pal: { m: '#9aa0aa', v: '#bfd7ff', d: '#5a606a', b: '#2a2c31' } },
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

/** Lightens (amount > 0) or darkens (amount < 0) a #rrggbb colour. */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amount > 0 ? (255 - c) * amount : c * amount))));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

type WallStyle = 'bricks' | 'water' | 'trees' | 'lava' | 'stars' | 'rock';

interface BiomePalette {
  ground: string;
  high: string;
  wall: string;
  wallStyle: WallStyle;
  /** Accent used by some wall styles (foam, embers, stars, leaves). */
  accent: string;
}

/** Placeholder colours for each biome. Real art can replace any tile per biome (see ART_GUIDE.md). */
export const BIOMES: Record<Biome, BiomePalette> = {
  city: { ground: '#7d8088', high: '#5f636c', wall: '#15161a', wallStyle: 'bricks', accent: '#1d1e23' },
  forest: { ground: '#a8865a', high: '#4f7a3a', wall: '#1d3a1f', wallStyle: 'trees', accent: '#2f5a2a' },
  desert: { ground: '#d9b77a', high: '#a8743f', wall: '#b08850', wallStyle: 'rock', accent: '#c49a5a' },
  ice: { ground: '#c9d3dc', high: '#7f97ad', wall: '#2f6f9a', wallStyle: 'water', accent: '#a8d8f0' },
  lava: { ground: '#5a5048', high: '#3f3833', wall: '#b8360c', wallStyle: 'lava', accent: '#ffb02a' },
  swamp: { ground: '#7a5a3a', high: '#4a6a2a', wall: '#2c3a28', wallStyle: 'water', accent: '#7fbf3a' },
  sky: { ground: '#b9a27a', high: '#5f8a3f', wall: '#8fc4ef', wallStyle: 'stars', accent: '#e8f4ff' },
  sea: { ground: '#d8c48f', high: '#5f8a3f', wall: '#1f6fb0', wallStyle: 'water', accent: '#8fd0ff' },
  ruins: { ground: '#c2b28a', high: '#6f7a5a', wall: '#2a7a8a', wallStyle: 'water', accent: '#8fe0e0' },
  tech: { ground: '#4a5160', high: '#2c3240', wall: '#0a0c1a', wallStyle: 'stars', accent: '#8fa8ff' },
  canyon: { ground: '#c79a5f', high: '#8a4f2a', wall: '#4a2414', wallStyle: 'rock', accent: '#6a3a1e' },
  cave: { ground: '#5d5a57', high: '#3a3633', wall: '#1a0f0a', wallStyle: 'lava', accent: '#d8501a' },
};

function groundTile(ctx: CanvasRenderingContext2D, pal: BiomePalette, locked: boolean): void {
  px(ctx, 0, 0, 32, 32, pal.ground);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = noise(x, y, 1);
    if (n < 0.06) px(ctx, x, y, 1, 1, shade(pal.ground, -0.1));
    else if (n > 0.95) px(ctx, x, y, 1, 1, shade(pal.ground, 0.08));
  }
  if (locked) stripes(ctx, shade(pal.ground, -0.18));
  px(ctx, 0, 0, 32, 1, shade(pal.ground, 0.18));
  px(ctx, 0, 0, 1, 32, shade(pal.ground, 0.18));
  px(ctx, 0, 31, 32, 1, shade(pal.ground, -0.3));
  px(ctx, 31, 0, 1, 32, shade(pal.ground, -0.3));
}

function highTile(ctx: CanvasRenderingContext2D, pal: BiomePalette, locked: boolean): void {
  px(ctx, 0, 0, 32, 32, shade(pal.high, -0.4));
  px(ctx, 1, 1, 30, 24, pal.high);
  for (let y = 1; y < 25; y++) for (let x = 1; x < 31; x++) if (noise(x, y, 2) < 0.05) px(ctx, x, y, 1, 1, shade(pal.high, -0.12));
  if (locked) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(1, 1, 30, 24);
    ctx.clip();
    stripes(ctx, shade(pal.high, -0.2));
    ctx.restore();
  }
  px(ctx, 1, 1, 30, 1, shade(pal.high, 0.3));
  px(ctx, 1, 25, 30, 1, shade(pal.high, -0.55));
  px(ctx, 0, 26, 32, 6, shade(pal.high, -0.5));
  for (const x of [4, 27]) px(ctx, x, 4, 1, 1, shade(pal.high, 0.4));
  for (const x of [4, 27]) px(ctx, x, 21, 1, 1, shade(pal.high, 0.4));
}

function wallTile(ctx: CanvasRenderingContext2D, pal: BiomePalette): void {
  px(ctx, 0, 0, 32, 32, pal.wall);
  switch (pal.wallStyle) {
    case 'bricks':
      for (let row = 0; row < 4; row++) {
        const off = row % 2 === 0 ? 0 : 8;
        px(ctx, 0, row * 8, 32, 1, pal.accent);
        for (let x = off; x < 32; x += 16) px(ctx, x, row * 8, 1, 8, pal.accent);
      }
      break;
    case 'water':
      for (let y = 2; y < 32; y += 8) for (let x = 0; x < 32; x++) if ((x + y * 3) % 12 < 4) px(ctx, x, y + ((x >> 2) % 2), 1, 1, pal.accent);
      break;
    case 'trees':
      for (const [cx, cy] of [[8, 8], [24, 10], [14, 24], [28, 27], [3, 22]]) {
        px(ctx, cx - 4, cy - 3, 8, 6, pal.accent);
        px(ctx, cx - 3, cy - 4, 6, 8, pal.accent);
        px(ctx, cx - 2, cy - 2, 2, 2, shade(pal.accent, 0.25));
      }
      break;
    case 'lava':
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
        const n = noise(x >> 1, y >> 1, 7);
        if (n > 0.8) px(ctx, x, y, 1, 1, pal.accent);
        else if (n < 0.15) px(ctx, x, y, 1, 1, shade(pal.wall, -0.4));
      }
      break;
    case 'stars':
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (noise(x, y, 9) > 0.985) px(ctx, x, y, 1, 1, pal.accent);
      break;
    case 'rock':
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
        const n = noise(x >> 2, y >> 2, 5);
        if (n > 0.7) px(ctx, x, y, 1, 1, pal.accent);
        else if (n < 0.2) px(ctx, x, y, 1, 1, shade(pal.wall, -0.25));
      }
      break;
  }
}

/** Texture key for a map tile: real art for the biome, else generic real art, else the biome placeholder. */
export function tileTextureKey(scene: Phaser.Scene, base: string, biome: Biome): string {
  const art = (scene.registry.get(ART_KEYS) as Set<string> | undefined) ?? new Set<string>();
  const real = (key: string) => art.has(key) && scene.textures.exists(key);
  if (real(`${base}@${biome}`)) return `${base}@${biome}`;
  if (real(base)) return base;
  return scene.textures.exists(`${base}@${biome}`) ? `${base}@${biome}` : base;
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
  for (const [biome, pal] of Object.entries(BIOMES)) {
    const suffix = biome === 'city' ? '' : `@${biome}`;
    canvasTexture(scene, `tile_ground${suffix}`, 32, 32, (c) => groundTile(c, pal, false));
    canvasTexture(scene, `tile_ground_locked${suffix}`, 32, 32, (c) => groundTile(c, pal, true));
    canvasTexture(scene, `tile_high${suffix}`, 32, 32, (c) => highTile(c, pal, false));
    canvasTexture(scene, `tile_high_locked${suffix}`, 32, 32, (c) => highTile(c, pal, true));
    canvasTexture(scene, `tile_wall${suffix}`, 32, 32, (c) => wallTile(c, pal));
  }
  canvasTexture(scene, 'tile_spawn_air', 32, 32, (c) => {
    portalTile(c, '#141c26', '#7fe0ff', '#0b0e13');
    px(c, 8, 14, 16, 2, '#0b0e13');
    px(c, 6, 12, 6, 2, '#7fe0ff');
    px(c, 20, 12, 6, 2, '#7fe0ff');
  });
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
  scene.registry.set(ART_KEYS, new Set(Object.keys(manifest?.sprites ?? {}).filter((k) => !k.startsWith('_'))));
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
