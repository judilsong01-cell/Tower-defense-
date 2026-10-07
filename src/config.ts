// Internal resolution. The canvas is scaled to fit the screen with nearest-neighbour
// filtering, so everything is drawn on this low-res pixel grid.
export const GAME_W = 640;
export const GAME_H = 360;
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
