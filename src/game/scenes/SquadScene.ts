import Phaser from 'phaser';
import { COLORS, CSS, GAME_H, GAME_W, ZOOM } from '../../config';
import { ENEMIES } from '../../data/enemies';
import { getLevel, levelLabel } from '../../data/levels';
import { OPERATORS } from '../../data/operators';
import type { LevelDef, OperatorClass } from '../../data/types';
import { t, type StringKey } from '../../i18n';
import { loadPortrait, PORTRAIT, unitMeta } from '../art';
import { playerSquad, SQUAD_MAX } from '../progress';
import { loadSave, writeSave } from '../save';
import { Button, panel, tapZone, text } from '../ui/widgets';

export interface SquadSceneData {
  /** When set, the screen is the last step before that stage and offers "start mission". */
  levelId?: string;
}

const TOP = 36;
const CLASS_COLOR: Record<OperatorClass, number> = {
  vanguard: 0xc8323a,
  defender: 0x6f8fb8,
  medic: 0x5fd068,
  sniper: 0xf2c94c,
};
const ORDER = Object.keys(OPERATORS);

/** Squad formation: every operator as a card with its animated 3D model; tap to inspect and swap. */
export class SquadScene extends Phaser.Scene {
  private level: LevelDef | null = null;
  private selected = '';
  private leftW = 0;
  private cards: Phaser.GameObjects.GameObject[] = [];
  private detail: Phaser.GameObjects.GameObject[] = [];
  private countText!: Phaser.GameObjects.Text;

  constructor() {
    super('Squad');
  }

  init(data: SquadSceneData): void {
    this.level = data.levelId ? getLevel(data.levelId) : null;
  }

  create(): void {
    this.cameras.main.setOrigin(0, 0).setZoom(ZOOM).setBackgroundColor(COLORS.bg);
    this.cards = [];
    this.detail = [];
    this.leftW = Math.round(GAME_W * 0.52);
    const squad = playerSquad(loadSave().squad);
    this.selected = squad[0];

    const g = this.add.graphics();
    g.fillStyle(COLORS.panel, 1).fillRect(0, 0, GAME_W, 28);
    g.fillStyle(COLORS.red, 1).fillRect(0, 28, GAME_W, 1);
    new Button(this, 8, 4, 64, 20, `< ${t('menu.back')}`, () => this.scene.start(this.level ? 'Menu' : 'Home'));
    const title = this.level ? `${t('squad.title')}  ${levelLabel(this.level)} ${t(`level.${this.level.id}.name` as StringKey)}` : t('squad.title');
    text(this, 84, 10, title);
    this.countText = text(this, GAME_W - 12, 10, '', { align: 'right', color: CSS.gold });

    this.refresh();
  }

  private squad(): string[] {
    return playerSquad(loadSave().squad);
  }

  private refresh(): void {
    this.drawCards();
    this.drawDetail();
    const squad = this.squad();
    this.countText.setText(t('squad.count', { n: squad.length, max: SQUAD_MAX }));
  }

  private drawCards(): void {
    for (const o of this.cards) o.destroy();
    this.cards = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.cards.push(o);
      return o;
    };
    const squad = this.squad();
    const cols = 4;
    const gap = 6;
    const cw = Math.floor((this.leftW - (cols - 1) * gap) / cols);
    const ch = Math.floor((GAME_H - TOP - 10 - gap) / 2);
    ORDER.forEach((id, i) => {
      const def = OPERATORS[id];
      const x = 12 + (i % cols) * (cw + gap);
      const y = TOP + Math.floor(i / cols) * (ch + gap);
      const slot = squad.indexOf(id);
      const inSquad = slot >= 0;
      const g = add(this.add.graphics());
      panel(g, x, y, cw, ch, inSquad ? 0x221a1d : 0x141519, id === this.selected ? 0xffffff : inSquad ? COLORS.redLight : COLORS.border);
      if (id === this.selected) g.lineStyle(1, 0xffffff, 1).strokeRect(x + 1.5, y + 1.5, cw - 3, ch - 3);
      g.fillStyle(CLASS_COLOR[def.cls], inSquad ? 1 : 0.4).fillRect(x + 2, y + 2, cw - 4, 3);
      // Floor glow under the model.
      g.fillStyle(inSquad ? COLORS.red : 0x333640, 0.25).fillEllipse(x + cw / 2, y + ch - 36, cw - 18, 10);

      add(text(this, x + 5, y + 9, `${def.cost}`, { color: inSquad ? CSS.text : CSS.dim }));
      add(this.add.image(x + cw - 9, y + 13, `icon_${def.cls}`).setAlpha(inSquad ? 1 : 0.5));

      const key = `op_${id}`;
      const meta = unitMeta(this, key);
      const sprite = add(this.add.sprite(x + cw / 2, y + ch - 34, key, 0).setOrigin(0.5, meta.originY).setScale(meta.scale * 1.5));
      if (this.anims.exists(`${key}:idle`)) sprite.play({ key: `${key}:idle`, startFrame: i % 8 });
      if (!inSquad) sprite.setAlpha(0.45).setTint(0x9a9aa6);

      add(text(this, x + cw / 2, y + ch - 28, def.name, { align: 'center', color: inSquad ? CSS.text : CSS.dim }));
      add(text(this, x + cw / 2, y + ch - 14, inSquad ? `#${slot + 1}` : t('squad.out'), { align: 'center', color: inSquad ? CSS.red : CSS.dim }));
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
    const def = OPERATORS[id];
    const squad = this.squad();
    const inSquad = squad.includes(id);
    const x = this.leftW + 20;
    const y = TOP;
    const w = GAME_W - x - 12;
    const h = GAME_H - y - 10;
    const g = add(this.add.graphics());
    panel(g, x, y, w, h);
    g.fillStyle(CLASS_COLOR[def.cls], 1).fillRect(x + 1, y + 1, 3, h - 2);

    // Big animated 3D model on the left of the panel.
    const px = x + 62;
    const feet = y + 186;
    g.fillStyle(CLASS_COLOR[def.cls], 0.2).fillEllipse(px, feet - 2, 92, 14);
    const key = `op_${id}`;
    const meta = unitMeta(this, key);
    const model = add(this.add.sprite(px, feet, key, 0).setOrigin(0.5, meta.originY).setScale(meta.scale * 1.45));
    if (this.anims.exists(`${key}:idle`)) model.play(`${key}:idle`);
    loadPortrait(this, id, (pkey) => {
      if (!model.active || this.selected !== id) return;
      model.setTexture(pkey, 0).setOrigin(0.5, PORTRAIT.originY).setScale(140 / PORTRAIT.modelHeight);
      model.play(`${pkey}:idle`);
    });

    // Stats on the right.
    const sx = x + 126;
    const sw = w - (sx - x) - 10;
    add(text(this, sx, y + 10, def.name, { size: 12 }));
    add(text(this, sx, y + 30, t(`class.${def.cls}` as StringKey), { color: CSS.dim }));
    add(text(this, sx, y + 44, t(`squad.placement.${def.placement}` as StringKey), { color: CSS.dim, wrap: sw }));
    add(text(this, sx, y + 70, def.tags.map((tag) => t(`tag.${tag}` as StringKey)).join(', '), { color: CSS.gold, wrap: sw }));
    const stats = [
      `HP ${def.hp}`,
      `${def.heals ? '+' : 'ATK'} ${def.atk}  DEF ${def.def}`,
      def.placement === 'ground' ? t('panel.block', { n: def.block }) : '',
      t('panel.cost', { n: def.cost }),
      t('panel.cooldown', { s: def.redeploy }),
    ].filter(Boolean);
    add(text(this, sx, y + 90, stats.join('\n'), { wrap: sw }));

    // Attack range (facing right): red = the operator, light = tiles it reaches.
    add(text(this, sx, y + 160, t('squad.range'), { color: CSS.dim }));
    const cell = 7;
    const xs = def.range.map((o) => o[0]).concat(0);
    const ys = def.range.map((o) => o[1]).concat(0);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const rx = sx + 64;
    const ry = y + 156;
    for (const [ox, oy] of def.range) g.fillStyle(def.heals ? COLORS.heal : COLORS.regime, 0.7).fillRect(rx + (ox - minX) * cell, ry + (oy - minY) * cell, cell - 1, cell - 1);
    g.fillStyle(COLORS.red, 1).fillRect(rx - minX * cell, ry - minY * cell, cell - 1, cell - 1);

    // Skill.
    const skill = def.skill;
    add(text(this, x + 14, y + 200, `${t('panel.skill')}: ${t(`skill.${skill.id}.name` as StringKey)}`, { color: CSS.gold, wrap: w - 28 }));
    add(text(this, x + 14, y + 214, t(`skill.${skill.id}.desc` as StringKey), { color: CSS.dim, wrap: w - 28 }));

    // Warnings for the coming stage.
    const notes: string[] = [];
    if (this.level) {
      notes.push(t('squad.field', { n: this.level.deployLimit }));
      const flying = this.level.waves.some((wave) => ENEMIES[wave.enemy]?.flying);
      if (flying && !squad.some((op) => OPERATORS[op].canHitAir)) notes.push(t('squad.noAntiAir'));
    } else {
      notes.push(t('squad.hint'));
    }
    add(text(this, x + 14, y + 246, notes.join('\n'), { color: notes.length > 1 ? CSS.gold : CSS.dim, wrap: w - 28 }));

    // Buttons.
    const by = y + h - 30;
    const toggle = () => {
      const current = this.squad();
      let next: string[];
      if (current.includes(id)) {
        if (current.length <= 1) return this.flash(t('squad.empty'));
        next = current.filter((op) => op !== id);
      } else {
        if (current.length >= SQUAD_MAX) return;
        next = [...current, id];
      }
      writeSave((s) => (s.squad = next));
      this.refresh();
    };
    const label = inSquad ? t('squad.remove') : t('squad.add');
    if (this.level) {
      const half = Math.floor((w - 28 - 8) / 2);
      add(new Button(this, x + 14, by, half - 20, 22, label, toggle));
      const level = this.level;
      add(new Button(this, x + 14 + half - 12, by, w - 28 - half + 12, 22, t('squad.start'), () => this.scene.start('Battle', { levelId: level.id, mode: 'manual' }), 'accent'));
    } else {
      add(new Button(this, x + 14, by, w - 28, 22, label, toggle, inSquad ? 'normal' : 'accent'));
    }
  }

  private flash(message: string): void {
    const msg = text(this, GAME_W / 2, GAME_H / 2, message, { align: 'center', color: CSS.gold }).setDepth(100);
    const bg = this.add.graphics().setDepth(99);
    bg.fillStyle(0x000000, 0.8).fillRect(GAME_W / 2 - msg.width / 2 - 10, GAME_H / 2 - 8, msg.width + 20, 24);
    this.time.delayedCall(1400, () => {
      msg.destroy();
      bg.destroy();
    });
  }
}
