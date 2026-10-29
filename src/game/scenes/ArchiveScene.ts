import Phaser from 'phaser';
import { COLORS, CSS, GAME_H, GAME_W, ZOOM } from '../../config';
import { idealOperators } from '../../data/counters';
import { ENEMIES } from '../../data/enemies';
import { LEVELS, levelLabel } from '../../data/levels';
import { OPERATORS } from '../../data/operators';
import type { EnemyDef } from '../../data/types';
import { t, type StringKey } from '../../i18n';
import { unitMeta } from '../art';
import { audio } from '../audio';
import { Button, panel, tapZone, text } from '../ui/widgets';

const TOP = 36;
const ORDER = Object.keys(ENEMIES);
const ALL_OPS = Object.keys(OPERATORS);

/** Enemy archive: every Regime unit with its model, stats, weakness and the best counters. */
export class ArchiveScene extends Phaser.Scene {
  private selected = ORDER[0];
  private leftW = 0;
  private cards: Phaser.GameObjects.GameObject[] = [];
  private detail: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Archive');
  }

  create(): void {
    this.cameras.main.setOrigin(0, 0).setZoom(ZOOM).setBackgroundColor(COLORS.bg);
    audio.music('menu');
    this.cards = [];
    this.detail = [];
    this.leftW = Math.round(GAME_W * 0.5);
    const g = this.add.graphics();
    g.fillStyle(COLORS.panel, 1).fillRect(0, 0, GAME_W, 28);
    g.fillStyle(COLORS.regime, 1).fillRect(0, 28, GAME_W, 1);
    new Button(this, 8, 4, 64, 20, `< ${t('menu.back')}`, () => this.scene.start('Home'));
    text(this, 84, 10, t('archive.title'));
    text(this, GAME_W - 12, 10, t('archive.count', { n: ORDER.length }), { align: 'right', color: CSS.regime });
    this.refresh();
  }

  onBack(): void {
    this.scene.start('Home');
  }

  private refresh(): void {
    this.drawCards();
    this.drawDetail();
  }

  private drawCards(): void {
    for (const o of this.cards) o.destroy();
    this.cards = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.cards.push(o);
      return o;
    };
    const cols = 4;
    const gap = 6;
    const rows = Math.ceil(ORDER.length / cols);
    const cw = Math.floor((this.leftW - (cols - 1) * gap) / cols);
    const ch = Math.floor((GAME_H - TOP - 10 - (rows - 1) * gap) / rows);
    ORDER.forEach((id, i) => {
      const def = ENEMIES[id];
      const x = 12 + (i % cols) * (cw + gap);
      const y = TOP + Math.floor(i / cols) * (ch + gap);
      const sel = id === this.selected;
      const g = add(this.add.graphics());
      panel(g, x, y, cw, ch, sel ? 0x1c2230 : 0x15171c, sel ? 0xffffff : def.boss ? COLORS.sp : COLORS.border);
      if (def.flying) g.fillStyle(COLORS.regime, 0.5).fillRect(x + 2, y + 2, cw - 4, 2);
      const key = `en_${id}`;
      const meta = unitMeta(this, key);
      const fit = Math.min(1.2, (ch - 16) / meta.height) * meta.scale;
      const s = add(this.add.sprite(x + cw / 2, y + ch - 8, key, 0).setOrigin(0.5, meta.originY).setScale(fit));
      const anim = this.anims.exists(`${key}:move`) ? `${key}:move` : `${key}:idle`;
      if (this.anims.exists(anim)) s.play({ key: anim, startFrame: i % 8 });
      add(tapZone(this, x, y, cw, ch, () => {
        this.selected = id;
        this.refresh();
      }));
    });
  }

  private drawDetail(): void {
    for (const o of this.detail) o.destroy();
    this.detail = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.detail.push(o);
      return o;
    };
    const id = this.selected;
    const def: EnemyDef = ENEMIES[id];
    const x = this.leftW + 20;
    const y = TOP;
    const w = GAME_W - x - 12;
    const h = GAME_H - y - 10;
    const g = add(this.add.graphics());
    panel(g, x, y, w, h);
    g.fillStyle(def.boss ? COLORS.sp : COLORS.regime, 1).fillRect(x + 1, y + 1, 3, h - 2);

    // Model on the left.
    const px = x + 50;
    const feet = y + 104;
    g.fillStyle(COLORS.regime, 0.15).fillEllipse(px, feet - 2, 76, 12);
    const key = `en_${id}`;
    const meta = unitMeta(this, key);
    const big = add(this.add.sprite(px, feet, key, 0).setOrigin(0.5, meta.originY).setScale(Math.min(1.6, 80 / meta.height) * meta.scale));
    const anim = this.anims.exists(`${key}:move`) ? `${key}:move` : `${key}:idle`;
    if (this.anims.exists(anim)) big.play(anim);

    // Name, tags and stats on the right.
    const sx = x + 104;
    const sw = w - (sx - x) - 10;
    add(text(this, sx, y + 10, t(`enemy.${id}` as StringKey), { wrap: sw }));
    const tags = [def.boss ? 'BOSS' : '', def.flying ? t('archive.flying') : t('archive.ground')].filter(Boolean).join(' · ');
    add(text(this, sx, y + 26, tags, { color: def.boss ? CSS.gold : CSS.regime, wrap: sw }));
    const stats = [
      `HP ${def.hp}`,
      `ATK ${def.atk}  DEF ${def.def}`,
      t('archive.speed', { v: def.speed }),
      def.flying ? '' : t('archive.block', { n: def.blockCost }),
      t('archive.lives', { n: def.lifeDamage }),
    ].filter(Boolean);
    add(text(this, sx, y + 42, stats.join('\n'), { color: CSS.dim, wrap: sw }));

    const tagNames = (list: readonly string[] | undefined) => (list ?? []).map((tag) => t(`tag.${tag}` as StringKey)).join(', ');
    let ty = y + 120;
    const line = (label: string, color: string) => {
      const o = add(text(this, x + 12, ty, label, { color, wrap: w - 24 }));
      ty += o.height + 6;
    };
    line(t(`trait.${id}` as StringKey), CSS.text);
    if (def.weak?.length) line(`${t('info.weak')}: ${tagNames(def.weak)}`, CSS.gold);
    if (def.resist?.length) line(`${t('info.resist')}: ${tagNames(def.resist)}`, CSS.red);
    const ideal = idealOperators(def, ALL_OPS).map((o) => o.name).join(', ');
    if (ideal) line(t('info.ideal', { ops: ideal }), CSS.green);
    const first = LEVELS.find((l) => l.waves.some((wave) => wave.enemy === id));
    if (first) line(t('archive.first', { l: `${levelLabel(first)} ${t(`level.${first.id}.name` as StringKey)}` }), CSS.dim);
  }
}
