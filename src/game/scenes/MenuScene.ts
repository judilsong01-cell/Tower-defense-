import Phaser from 'phaser';
import { COLORS, CSS, GAME_H, GAME_W } from '../../config';
import { LEVELS } from '../../data/levels';
import type { LevelDef } from '../../data/types';
import { getLang, LANGS, setLang, t, type StringKey } from '../../i18n';
import { dataVersion } from '../../sim/replay';
import { loadSave, session, writeSave } from '../save';
import { Button, panel, text } from '../ui/widgets';
import type { BattleMode } from './BattleScene';

const GRID_X = 64;
const GRID_Y = 76;
const CELL_W = 96;
const CELL_H = 36;
const CELL_GAP = 8;
const COLS = 5;
const DETAIL_Y = 168;

export class MenuScene extends Phaser.Scene {
  private gridGfx!: Phaser.GameObjects.Graphics;
  private detail: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Menu');
  }

  create(): void {
    this.detail = [];
    this.drawSkyline();

    text(this, GAME_W / 2, 16, t('game.title'), { size: 16, align: 'center' });
    text(this, GAME_W / 2, 38, t('game.subtitle'), { color: CSS.dim, align: 'center' });

    new Button(this, GAME_W - 132, 8, 124, 20, t('menu.language'), () => {
      const next = LANGS[(LANGS.indexOf(getLang()) + 1) % LANGS.length];
      setLang(next);
      writeSave((s) => (s.lang = next));
      this.scene.restart();
    });

    text(this, GAME_W / 2, 58, t('menu.selectLevel'), { color: CSS.red, align: 'center' });
    this.gridGfx = this.add.graphics();
    LEVELS.forEach((level, i) => this.levelCell(level, i));
    if (!LEVELS.some((l) => l.id === session.selectedLevel)) session.selectedLevel = LEVELS[0].id;
    this.select(session.selectedLevel);
  }

  private cellPos(i: number): [number, number] {
    return [GRID_X + (i % COLS) * (CELL_W + CELL_GAP), GRID_Y + Math.floor(i / COLS) * (CELL_H + CELL_GAP)];
  }

  private levelCell(level: LevelDef, i: number): void {
    const [x, y] = this.cellPos(i);
    const stars = loadSave().levels[level.id]?.stars ?? 0;
    text(this, x + CELL_W / 2, y + 7, `1-${i + 1}`, { align: 'center' }).setDepth(2);
    for (let s = 0; s < 3; s++) {
      this.add.image(x + CELL_W / 2 - 15 + s * 11, y + 22, s < stars ? 'ui_star' : 'ui_star_empty').setOrigin(0, 0).setDepth(2);
    }
    this.add
      .zone(x, y, CELL_W, CELL_H)
      .setOrigin(0, 0)
      .setInteractive()
      .on('pointerup', () => this.select(level.id));
  }

  private select(id: string): void {
    session.selectedLevel = id;
    const g = this.gridGfx.clear();
    LEVELS.forEach((level, i) => {
      const [x, y] = this.cellPos(i);
      const selected = level.id === id;
      panel(g, x, y, CELL_W, CELL_H, selected ? 0x3a1c1f : COLORS.panel, selected ? COLORS.redLight : COLORS.border);
    });
    for (const o of this.detail) o.destroy();
    this.detail = [];
    this.levelDetail(LEVELS.find((l) => l.id === id)!);
  }

  private levelDetail(level: LevelDef): void {
    const x = GRID_X;
    const y = DETAIL_Y;
    const w = COLS * CELL_W + (COLS - 1) * CELL_GAP;
    const h = GAME_H - y - 8;
    const g = this.add.graphics();
    panel(g, x, y, w, h);
    g.fillStyle(COLORS.red, 1).fillRect(x + 1, y + 1, 3, h - 2);
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.detail.push(o);
      return o;
    };
    add(g);

    const save = loadSave();
    const replay = save.replays[level.id];
    const replayValid = !!replay && replay.dataVersion === dataVersion(level);
    const enemies = level.waves.reduce((n, wave) => n + wave.count, 0);

    add(text(this, x + 14, y + 12, t(`level.${level.id}.name` as StringKey)));
    add(text(this, x + 14, y + 30, t(`level.${level.id}.desc` as StringKey), { color: CSS.dim, wrap: w - 28 }));
    add(text(this, x + 14, y + 66, t('menu.info', { e: enemies, u: level.deployLimit, dp: level.startDp }), { color: CSS.regime }));

    const by = y + 88;
    add(new Button(this, x + 14, by, 150, 24, t('menu.start'), () => this.startBattle(level, 'manual'), 'accent'));
    add(new Button(this, x + 174, by, 160, 24, t('menu.replay'), () => this.startBattle(level, 'replay')).setEnabled(replayValid));
    add(new Button(this, x + 344, by, 154, 24, t('menu.ai'), () => this.startBattle(level, 'ai')));

    const hint = replayValid ? `${t('menu.hintReplay')} ${t('menu.hintAi')}` : `${t('menu.noReplay')} ${t('menu.hintAi')}`;
    add(text(this, x + 14, by + 34, hint, { color: CSS.dim, wrap: w - 28 }));
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
