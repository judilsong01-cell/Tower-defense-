import '@fontsource/press-start-2p/latin-400.css';
import '@fontsource/press-start-2p/latin-ext-400.css';
import Phaser from 'phaser';
import { COLORS, GAME_H, GAME_W, ZOOM } from './config';
import { BattleScene } from './game/scenes/BattleScene';
import { BootScene } from './game/scenes/BootScene';
import { MenuScene } from './game/scenes/MenuScene';

async function start(): Promise<void> {
  // Canvas text needs the web font loaded before the first frame, or it falls back to a system font.
  try {
    await document.fonts.load('8px "Press Start 2P"');
  } catch {
    // Fallback font is acceptable.
  }

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_W * ZOOM,
    height: GAME_H * ZOOM,
    backgroundColor: COLORS.bg,
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: { activePointers: 2 },
    scene: [BootScene, MenuScene, BattleScene],
  });
}

void start();
