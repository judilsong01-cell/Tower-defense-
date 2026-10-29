import '@fontsource/press-start-2p/latin-400.css';
import '@fontsource/press-start-2p/latin-ext-400.css';
import Phaser from 'phaser';
import { COLORS, GAME_H, GAME_W, ZOOM } from './config';
import { audio } from './game/audio';
import { initBackButton } from './game/nav';
import { BattleScene } from './game/scenes/BattleScene';
import { ArchiveScene } from './game/scenes/ArchiveScene';
import { BootScene } from './game/scenes/BootScene';
import { HomeScene } from './game/scenes/HomeScene';
import { MenuScene } from './game/scenes/MenuScene';
import { SquadScene } from './game/scenes/SquadScene';

async function start(): Promise<void> {
  // Canvas text needs the web font loaded before the first frame, or it falls back to a system font.
  try {
    await document.fonts.load('8px "Press Start 2P"');
  } catch {
    // Fallback font is acceptable.
  }

  const game = new Phaser.Game({
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
    scene: [BootScene, HomeScene, MenuScene, SquadScene, ArchiveScene, BattleScene],
  });
  initBackButton(game);
}

// Audio may only start after a user gesture (browser and WebView rule).
window.addEventListener('pointerdown', () => audio.unlock(), { capture: true });

void start();
