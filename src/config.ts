/**
 * Logical width that fills the screen's aspect ratio at a fixed logical height of 360,
 * so wide phones (20:9 and up) use the whole display instead of showing black bars.
 * Phones use the physical screen shape (the app runs full screen, in landscape); desktop
 * browsers use the window. Ranges from 640 (16:9) to 864 (2.4:1).
 */
function logicalWidth(): number {
  if (typeof window === 'undefined') return 640;
  const touch = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const w = touch ? Math.max(screen.width, screen.height) : window.innerWidth;
  const h = touch ? Math.min(screen.width, screen.height) : window.innerHeight;
  const aspect = w > 0 && h > 0 ? w / h : 16 / 9;
  const width = Math.min(864, Math.max(640, 360 * aspect));
  return 2 * Math.round(width / 2);
}

// Logical resolution used by all game and UI coordinates.
export const GAME_W = logicalWidth();
export const GAME_H = 360;
/**
 * The canvas is ZOOM times the logical size and every camera zooms in by ZOOM, so game code
 * keeps working in GAME_W x 360 units while smooth art (the 3D characters) renders at full detail.
 */
export const ZOOM = 2;
export const TILE = 32;

export const FONT = '"Press Start 2P", monospace';

// Visual identity: a sterile, monochrome regime (cold whites/greys) versus the
// Resistance, whose colour is red, the colour of emotion.
export const COLORS = {
  bg: 0x0e0f12,
  panel: 0x1a1b20,
  panelLight: 0x2a2c33,
  border: 0x4a4d57,
  text: 0xe6e6e6,
  textDim: 0x8b8e98,
  red: 0xc8323a,
  redLight: 0xff5a5f,
  regime: 0xbfd7ff,
  hp: 0x5fd068,
  hpEnemy: 0xd84a4a,
  sp: 0xf2c94c,
  heal: 0x7dffa1,
  dp: 0xe0e0e0,
} as const;

export const CSS = {
  text: '#e6e6e6',
  dim: '#8b8e98',
  red: '#ff5a5f',
  gold: '#f2c94c',
  green: '#7dffa1',
  regime: '#bfd7ff',
} as const;
