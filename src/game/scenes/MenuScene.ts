import Phaser from 'phaser';
import { COLORS, CSS, GAME_H, GAME_W } from '../../config';
import { LEVELS } from '../../data/levels';
import type { LevelDef } from '../../data/types';
import { getLang, LANGS, setLang, t, type StringKey } from '../../i18n';
import { dataVersion } from '../../sim/replay';
import { loadSave, writeSave } from '../save';
import { Button, panel, text } from '../ui/widgets';
import type { BattleMode } from './BattleScene';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    this.drawSkyline();

    text(this, GAME_W / 2, 28, t('game.title'), { size: 16, align: 'center' });
    text(this, GAME_W / 2, 54, t('game.subtitle'), { color: CSS.dim, align: 'center' });

    new Button(this, GAME_W - 132, 8, 124, 20, t('menu.language'), () => {
      const next = LANGS[(LANGS.indexOf(getLang()) + 1) % LANGS.length];
      setLang(next);
      writeSave((s) => (s.lang = next));
      this.scene.restart();
    });

    text(this, GAME_W / 2, 80, t('menu.selectLevel'), { color: CSS.red, align: 'center' });
    LEVELS.forEach((level, i) => this.levelCard(level, 120, 94 + i * 170));
  }

  private levelCard(level: LevelDef, x: number, y: number): void {
    const w = 400;
    const h = 160;
    const g = this.add.graphics();
    panel(g, x, y, w, h);
    g.fillStyle(COLORS.red, 1).fillRect(x + 1, y + 1, 3, h - 2);

    const save = loadSave();
    const progress = save.levels[level.id];
    const replay = save.replays[level.id];
    const replayValid = !!replay && replay.dataVersion === dataVersion(level);

    text(this, x + 14, y + 12, t(`level.${level.id}.name` as StringKey));
    for (let s = 0; s < 3; s++) {
      const key = progress && s < progress.stars ? 'ui_star' : 'ui_star_empty';
      this.add.image(x + w - 40 + s * 11, y + 15, key).setOrigin(0, 0);
    }
    text(this, x + 14, y + 30, t(`level.${level.id}.desc` as StringKey), { color: CSS.dim, wrap: w - 28 });

    const by = y + 76;
    new Button(this, x + 14, by, 110, 22, t('menu.start'), () => this.startBattle(level, 'manual'), 'accent');
    const replayBtn = new Button(this, x + 132, by, 124, 22, t('menu.replay'), () => this.startBattle(level, 'replay'));
    replayBtn.setEnabled(replayValid);
    new Button(this, x + 264, by, 122, 22, t('menu.ai'), () => this.startBattle(level, 'ai'));

    const hint = replayValid ? `${t('menu.hintReplay')} ${t('menu.hintAi')}` : `${t('menu.noReplay')} ${t('menu.hintAi')}`;
    text(this, x + 14, by + 30, hint, { color: CSS.dim, wrap: w - 28 });
  }

  private startBattle(level: LevelDef, mode: BattleMode): void {
    this.scene.start('Battle', { levelId: level.id, mode });
  }

  /** A sterile grey city at night. One red window: someone, somewhere, still feels. */
  private drawSkyline(): void {
    const g = this.add.graphics();
    g.fillStyle(0x121318, 1).fillRect(0, 0, GAME_W, GAME_H);
    let x = 0;
    let i = 0;
    while (x < GAME_W) {
      const w = 24 + ((i * 37) % 40);
      const h = 60 + ((i * 53) % 110);
      const top = GAME_H - h;
      g.fillStyle(i % 2 ? 0x1b1d23 : 0x202229, 1).fillRect(x, top, w - 2, h);
      for (let wy = top + 6; wy < GAME_H - 8; wy += 10) {
        for (let wx = x + 4; wx < x + w - 6; wx += 8) {
          const lit = (wx * 7 + wy * 13 + i) % 11 === 0;
          g.fillStyle(lit ? 0x8f99a8 : 0x2a2d35, 1).fillRect(wx, wy, 3, 4);
        }
      }
      x += w;
      i++;
    }
    g.fillStyle(0x000000, 0.45).fillRect(0, 0, GAME_W, GAME_H);
    g.fillStyle(COLORS.red, 1).fillRect(GAME_W - 70, GAME_H - 46, 3, 4);
  }
}
