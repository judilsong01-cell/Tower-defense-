import Phaser from 'phaser';
import { COLORS, CSS, GAME_H, GAME_W, ZOOM } from '../../config';
import { idealOperators } from '../../data/counters';
import { ENEMIES } from '../../data/enemies';
import { CHAPTERS, LEVELS, levelLabel } from '../../data/levels';
import type { LevelDef } from '../../data/types';
import { t, type StringKey } from '../../i18n';
import { dataVersion } from '../../sim/replay';
import { unitMeta } from '../art';
import { isUnlocked, playerSquad, previousLevel, totalStars, withSquad } from '../progress';
import { loadSave, session } from '../save';
import { Button, lockIcon, panel, tapZone, text } from '../ui/widgets';
import type { BattleMode } from './BattleScene';

const TOP = 62;
const CELL_H = 40;
const GAP = 6;
const COLS = 5;
/** Map image layout (see MAP3D in BattleScene): 64 px per tile, 7 tiles left margin, 1.5 on top. */
const MAP_PPU = 64;
const MAP_LEFT = 7;
const MAP_TOP = 1.5;

/** Stage select: chapters, stage grid with locks, a 3D preview of the map and the stage briefing. */
export class MenuScene extends Phaser.Scene {
  private leftW = 0;
  private gridGfx!: Phaser.GameObjects.Graphics;
  private chapterObjs: Phaser.GameObjects.GameObject[] = [];
  private detail: Phaser.GameObjects.GameObject[] = [];
  private preview: Phaser.GameObjects.Image | null = null;

  constructor() {
    super('Menu');
  }

  create(): void {
    this.cameras.main.setOrigin(0, 0).setZoom(ZOOM).setBackgroundColor(COLORS.bg);
    this.chapterObjs = [];
    this.detail = [];
    this.preview = null;
    this.leftW = Math.round(GAME_W * 0.47);
    const save = loadSave();

    // Top bar.
    const g = this.add.graphics();
    g.fillStyle(COLORS.panel, 1).fillRect(0, 0, GAME_W, 28);
    g.fillStyle(COLORS.red, 1).fillRect(0, 28, GAME_W, 1);
    new Button(this, 8, 4, 64, 20, `< ${t('menu.back')}`, () => this.scene.start('Home'));
    text(this, 84, 10, t('stage.title'), { size: 8 });
    this.add.image(GAME_W - 70, 14, 'ui_star').setScale(1.5);
    text(this, GAME_W - 60, 10, `${totalStars(save.levels)}/${LEVELS.length * 3}`, { color: CSS.gold });

    this.gridGfx = this.add.graphics();
    if (!LEVELS.some((l) => l.id === session.selectedLevel) || !isUnlocked(session.selectedLevel, save.levels)) {
      session.selectedLevel = [...LEVELS].reverse().find((l) => isUnlocked(l.id, save.levels))!.id;
    }
    this.showChapter(LEVELS.find((l) => l.id === session.selectedLevel)!.chapter);
  }

  private showChapter(chapter: number): void {
    for (const o of this.chapterObjs) o.destroy();
    this.chapterObjs = [];
    const keep = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.chapterObjs.push(o);
      return o;
    };
    const save = loadSave();

    const tabW = Math.floor((GAME_W - 24 - (CHAPTERS.length - 1) * 6) / CHAPTERS.length);
    CHAPTERS.forEach((c, i) => {
      const first = LEVELS.find((l) => l.chapter === c)!;
      const open = isUnlocked(first.id, save.levels);
      const label = `${c} ${t(`chapter.${c}` as StringKey)}`;
      keep(new Button(this, 12 + i * (tabW + 6), 34, tabW, 20, label, () => {
        session.selectedLevel = first.id;
        this.showChapter(c);
      }, c === chapter ? 'accent' : 'normal').setEnabled(open));
    });

    const cellW = Math.floor((this.leftW - (COLS - 1) * GAP) / COLS);
    const levels = LEVELS.filter((l) => l.chapter === chapter);
    levels.forEach((level, i) => {
      const x = 12 + (i % COLS) * (cellW + GAP);
      const y = TOP + Math.floor(i / COLS) * (CELL_H + GAP);
      const open = isUnlocked(level.id, save.levels);
      const stars = save.levels[level.id]?.stars ?? 0;
      keep(text(this, x + cellW / 2, y + 7, levelLabel(level), { align: 'center', color: open ? CSS.text : CSS.dim }).setDepth(2));
      if (open) {
        for (let s = 0; s < 3; s++) keep(this.add.image(x + cellW / 2 - 11 + s * 11, y + 27, s < stars ? 'ui_star' : 'ui_star_empty').setDepth(2));
      }
      keep(tapZone(this, x, y, cellW, CELL_H, () => this.select(level.id)));
    });
    if (!levels.some((l) => l.id === session.selectedLevel)) session.selectedLevel = levels[0].id;
    this.select(session.selectedLevel);
  }

  private select(id: string): void {
    session.selectedLevel = id;
    const level = LEVELS.find((l) => l.id === id)!;
    const save = loadSave();
    const levels = LEVELS.filter((l) => l.chapter === level.chapter);
    const cellW = Math.floor((this.leftW - (COLS - 1) * GAP) / COLS);
    const g = this.gridGfx.clear();
    levels.forEach((l, i) => {
      const x = 12 + (i % COLS) * (cellW + GAP);
      const y = TOP + Math.floor(i / COLS) * (CELL_H + GAP);
      const selected = l.id === id;
      const open = isUnlocked(l.id, save.levels);
      panel(g, x, y, cellW, CELL_H, selected ? 0x3a1c1f : open ? COLORS.panel : 0x141519, selected ? COLORS.redLight : open ? COLORS.border : 0x2a2c33);
      if (!open) lockIcon(g, x + cellW / 2, y + 28);
    });
    for (const o of this.detail) o.destroy();
    this.detail = [];
    this.showPreview(level);
    this.levelDetail(level);
  }

  /** The stage's 3D map, cropped to the playable area, under the stage grid. */
  private showPreview(level: LevelDef): void {
    const box = { x: 12, y: TOP + 2 * (CELL_H + GAP) + 4, w: this.leftW, h: GAME_H - (TOP + 2 * (CELL_H + GAP) + 4) - 10 };
    const g = this.add.graphics();
    this.detail.push(g);
    panel(g, box.x - 1, box.y - 1, box.w + 2, box.h + 2, 0x08090c);
    const key = `map_${level.id}`;
    const show = () => {
      if (session.selectedLevel !== level.id || !this.sys.isActive() || !this.textures.exists(key)) return;
      this.preview?.destroy();
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
      const w = level.map[0].length;
      const h = level.map.length;
      const cx = (MAP_LEFT - 0.5) * MAP_PPU;
      const cy = (MAP_TOP - 0.5) * MAP_PPU;
      const cw = (w + 1) * MAP_PPU;
      const ch = (h + 1.5) * MAP_PPU;
      const s = Math.min(box.w / cw, box.h / ch);
      this.preview = this.add.image(0, 0, key).setOrigin(0, 0).setScale(s).setCrop(cx, cy, cw, ch);
      this.preview.setPosition(Math.round(box.x + (box.w - cw * s) / 2 - cx * s), Math.round(box.y + (box.h - ch * s) / 2 - cy * s));
      this.preview.setAlpha(0);
      this.tweens.add({ targets: this.preview, alpha: 1, duration: 150 });
      this.detail.push(this.preview);
      // Keep only this stage's map in memory (the battle reuses it).
      for (const l of LEVELS) if (l.id !== level.id && this.textures.exists(`map_${l.id}`)) this.textures.remove(`map_${l.id}`);
    };
    if (this.textures.exists(key)) show();
    else {
      this.load.image(key, `assets/maps/${level.id}.jpg`);
      this.load.once(`filecomplete-image-${key}`, show);
      if (!this.load.isLoading()) this.load.start();
    }
  }

  private levelDetail(level: LevelDef): void {
    const x = this.leftW + 24;
    const y = TOP;
    const w = GAME_W - x - 12;
    const h = GAME_H - y - 10;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.detail.push(o);
      return o;
    };
    const g = add(this.add.graphics());
    panel(g, x, y, w, h);
    g.fillStyle(COLORS.red, 1).fillRect(x + 1, y + 1, 3, h - 2);

    const save = loadSave();
    const open = isUnlocked(level.id, save.levels);
    const played = withSquad(level, playerSquad(save.squad));
    const replay = save.replays[level.id];
    const replayValid = !!replay && replay.dataVersion === dataVersion(played);
    const enemies = level.waves.reduce((n, wave) => n + wave.count, 0);
    const portals = level.map.join('').split('').filter((c) => c === 'S' || c === 'A').length;
    const exits = level.map.join('').split('').filter((c) => c === 'B').length;

    add(text(this, x + 14, y + 10, `${levelLabel(level)}  ${t(`level.${level.id}.name` as StringKey)}`, { wrap: w - 28 }));
    add(text(this, x + 14, y + 28, t(`level.${level.id}.desc` as StringKey), { color: CSS.dim, wrap: w - 28 }));
    add(text(this, x + 14, y + 76, t('menu.info', { e: enemies, u: level.deployLimit, dp: level.startDp, p: portals, b: exits }), { color: CSS.regime, wrap: w - 28 }));

    // Enemy roster: tap one to see its weakness and the ideal counter.
    const kinds = [...new Set(level.waves.map((wave) => wave.enemy))];
    const info = add(text(this, x + 14, y + 150, t('menu.tapEnemy'), { color: CSS.dim, wrap: w - 28 }));
    const step = Math.min(36, Math.floor((w - 28) / Math.max(1, kinds.length)));
    kinds.forEach((id, i) => {
      const ix = x + 26 + i * step;
      const meta = unitMeta(this, `en_${id}`);
      const fit = Math.min(1, 30 / meta.height) * meta.scale;
      const img = add(this.add.image(ix, y + 140, `en_${id}`).setOrigin(0.5, meta.originY).setScale(fit));
      add(tapZone(this, ix - step / 2, y + 106, step, 36, () => {
        const def = ENEMIES[id];
        const ideal = idealOperators(def, played.squad).map((o) => o.name).join(', ');
        const weak = def.weak?.length ? `${t('info.weak')}: ${def.weak.map((tag) => t(`tag.${tag}` as StringKey)).join(', ')}` : t('trait.peacekeeper');
        info.setText(`${t(`enemy.${id}` as StringKey)}: ${weak}${ideal ? `. ${t('info.ideal', { ops: ideal })}` : ''}`).setColor(CSS.gold);
        this.tweens.add({ targets: img, y: img.y - 3, duration: 80, yoyo: true });
      }));
    });

    const by = y + h - 62;
    if (!open) {
      const prev = previousLevel(level.id);
      add(text(this, x + 14, by - 22, t('stage.locked', { l: prev ? levelLabel(prev) : '' }), { color: CSS.gold, wrap: w - 28 }));
    }
    const half = Math.floor((w - 28 - 8) / 2);
    add(new Button(this, x + 14, by + 16, w - 28, 22, open ? t('menu.start') : t('stage.lockedShort'), () => this.scene.start('Squad', { levelId: level.id }), 'accent').setEnabled(open));
    add(new Button(this, x + 14, by + 42, half, 18, t('menu.replay'), () => this.startBattle(level, 'replay')).setEnabled(open && replayValid));
    add(new Button(this, x + 14 + half + 8, by + 42, half, 18, t('menu.ai'), () => this.startBattle(level, 'ai')).setEnabled(open));
  }

  private startBattle(level: LevelDef, mode: BattleMode): void {
    this.scene.start('Battle', { levelId: level.id, mode });
  }
}
