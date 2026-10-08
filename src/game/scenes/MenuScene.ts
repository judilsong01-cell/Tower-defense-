import Phaser from 'phaser';
import { COLORS, CSS, GAME_H, GAME_W, ZOOM } from '../../config';
import { idealOperators } from '../../data/counters';
import { ENEMIES } from '../../data/enemies';
import { CHAPTERS, LEVELS, levelLabel } from '../../data/levels';
import type { LevelDef } from '../../data/types';
import { getLang, LANGS, setLang, t, type StringKey } from '../../i18n';
import { dataVersion } from '../../sim/replay';
import { loadSave, session, writeSave } from '../save';
import { unitMeta } from '../art';
import { Button, panel, text } from '../ui/widgets';
import type { BattleMode } from './BattleScene';

const GRID_X = 64;
const GRID_Y = 70;
const CELL_W = 96;
const CELL_H = 34;
const CELL_GAP = 8;
const COLS = 5;
const DETAIL_Y = 152;

export class MenuScene extends Phaser.Scene {
  private gridGfx!: Phaser.GameObjects.Graphics;
  private chapterObjs: Phaser.GameObjects.GameObject[] = [];
  private detail: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Menu');
  }

  create(): void {
    this.cameras.main.setOrigin(0, 0).setZoom(ZOOM);
    this.detail = [];
    this.chapterObjs = [];
    this.drawSkyline();

    text(this, GAME_W / 2, 8, t('game.title'), { size: 16, align: 'center' });
    text(this, GAME_W / 2, 30, t('game.subtitle'), { color: CSS.dim, align: 'center' });

    new Button(this, GAME_W - 132, 6, 124, 20, t('menu.language'), () => {
      const next = LANGS[(LANGS.indexOf(getLang()) + 1) % LANGS.length];
      setLang(next);
      writeSave((s) => (s.lang = next));
      this.scene.restart();
    });

    this.gridGfx = this.add.graphics();
    if (!LEVELS.some((l) => l.id === session.selectedLevel)) session.selectedLevel = LEVELS[0].id;
    this.showChapter(LEVELS.find((l) => l.id === session.selectedLevel)!.chapter);
  }

  private showChapter(chapter: number): void {
    for (const o of this.chapterObjs) o.destroy();
    this.chapterObjs = [];
    const keep = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.chapterObjs.push(o);
      return o;
    };

    const tabW = 164;
    const tabX = GAME_W / 2 - (CHAPTERS.length * tabW + (CHAPTERS.length - 1) * 8) / 2;
    CHAPTERS.forEach((c, i) => {
      const label = `${c} ${t(`chapter.${c}` as StringKey)}`;
      keep(new Button(this, tabX + i * (tabW + 8), 44, tabW, 20, label, () => {
        const first = LEVELS.find((l) => l.chapter === c)!;
        session.selectedLevel = first.id;
        this.showChapter(c);
      }, c === chapter ? 'accent' : 'normal'));
    });

    const levels = LEVELS.filter((l) => l.chapter === chapter);
    const save = loadSave();
    levels.forEach((level, i) => {
      const [x, y] = this.cellPos(i);
      const stars = save.levels[level.id]?.stars ?? 0;
      keep(text(this, x + CELL_W / 2, y + 6, levelLabel(level), { align: 'center' }).setDepth(2));
      for (let s = 0; s < 3; s++) {
        keep(this.add.image(x + CELL_W / 2 - 15 + s * 11, y + 20, s < stars ? 'ui_star' : 'ui_star_empty').setOrigin(0, 0).setDepth(2));
      }
      keep(this.add.zone(x, y, CELL_W, CELL_H).setOrigin(0, 0).setInteractive().on('pointerup', () => this.select(level.id)));
    });
    if (!levels.some((l) => l.id === session.selectedLevel)) session.selectedLevel = levels[0].id;
    this.select(session.selectedLevel);
  }

  private cellPos(i: number): [number, number] {
    return [GRID_X + (i % COLS) * (CELL_W + CELL_GAP), GRID_Y + Math.floor(i / COLS) * (CELL_H + CELL_GAP)];
  }

  private select(id: string): void {
    session.selectedLevel = id;
    const level = LEVELS.find((l) => l.id === id)!;
    const levels = LEVELS.filter((l) => l.chapter === level.chapter);
    const g = this.gridGfx.clear();
    levels.forEach((l, i) => {
      const [x, y] = this.cellPos(i);
      const selected = l.id === id;
      panel(g, x, y, CELL_W, CELL_H, selected ? 0x3a1c1f : COLORS.panel, selected ? COLORS.redLight : COLORS.border);
    });
    for (const o of this.detail) o.destroy();
    this.detail = [];
    this.levelDetail(level);
  }

  private levelDetail(level: LevelDef): void {
    const x = GRID_X;
    const y = DETAIL_Y;
    const w = COLS * CELL_W + (COLS - 1) * CELL_GAP;
    const h = GAME_H - y - 6;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.detail.push(o);
      return o;
    };
    const g = add(this.add.graphics());
    panel(g, x, y, w, h);
    g.fillStyle(COLORS.red, 1).fillRect(x + 1, y + 1, 3, h - 2);

    const save = loadSave();
    const replay = save.replays[level.id];
    const replayValid = !!replay && replay.dataVersion === dataVersion(level);
    const enemies = level.waves.reduce((n, wave) => n + wave.count, 0);
    const portals = level.map.join('').split('').filter((c) => c === 'S' || c === 'A').length;
    const exits = level.map.join('').split('').filter((c) => c === 'B').length;

    add(text(this, x + 14, y + 10, `${levelLabel(level)}  ${t(`level.${level.id}.name` as StringKey)}`));
    add(text(this, x + 14, y + 24, t(`level.${level.id}.desc` as StringKey), { color: CSS.dim, wrap: w - 28 }));
    add(text(this, x + 14, y + 52, t('menu.info', { e: enemies, u: level.deployLimit, dp: level.startDp, p: portals, b: exits }), { color: CSS.regime }));

    // Enemy roster: tap one to see its weakness and the ideal counter.
    const kinds = [...new Set(level.waves.map((wave) => wave.enemy))];
    const info = add(text(this, x + 14, y + 104, t('menu.tapEnemy'), { color: CSS.dim, wrap: w - 28 }));
    kinds.forEach((id, i) => {
      const ix = x + 26 + i * 36;
      const meta = unitMeta(this, `en_${id}`);
      // Fit every enemy icon into the same ~30 px tall slot.
      const fit = Math.min(1, 30 / meta.height) * meta.scale;
      const img = add(this.add.image(ix, y + 98, `en_${id}`).setOrigin(0.5, meta.originY).setScale(fit));
      add(this.add.zone(ix - 16, y + 66, 32, 34).setOrigin(0, 0).setInteractive().on('pointerup', () => {
        const def = ENEMIES[id];
        const ideal = idealOperators(def, level.squad).map((o) => o.name).join(', ');
        const weak = def.weak?.length ? `${t('info.weak')}: ${def.weak.map((tag) => t(`tag.${tag}` as StringKey)).join(', ')}` : t('trait.peacekeeper');
        info.setText(`${t(`enemy.${id}` as StringKey)}: ${weak}${ideal ? `. ${t('info.ideal', { ops: ideal })}` : ''}`).setColor(CSS.gold);
        this.tweens.add({ targets: img, y: img.y - 3, duration: 80, yoyo: true });
      }));
    });

    const by = y + 128;
    add(new Button(this, x + 14, by, 150, 24, t('menu.start'), () => this.startBattle(level, 'manual'), 'accent'));
    add(new Button(this, x + 174, by, 160, 24, t('menu.replay'), () => this.startBattle(level, 'replay')).setEnabled(replayValid));
    add(new Button(this, x + 344, by, 154, 24, t('menu.ai'), () => this.startBattle(level, 'ai')));
    const hint = replayValid ? `${t('menu.hintReplay')} ${t('menu.hintAi')}` : `${t('menu.noReplay')} ${t('menu.hintAi')}`;
    add(text(this, x + 14, by + 32, hint, { color: CSS.dim, wrap: w - 28 }));
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
