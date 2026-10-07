import Phaser from 'phaser';
import { COLORS, CSS, GAME_H, GAME_W, TILE } from '../../config';
import { getLevel } from '../../data/levels';
import type { Dir, LevelDef } from '../../data/types';
import { t, type StringKey } from '../../i18n';
import { AutoDeployer } from '../../sim/ai';
import { Battle, DT, type BattleEvent, type EnemyUnit, type OperatorUnit } from '../../sim/battle';
import { rangeTiles, type TileKind } from '../../sim/grid';
import { dataVersion, ReplayPlayer, ReplayRecorder } from '../../sim/replay';
import { loadSave, writeSave } from '../save';
import { Button, panel, text } from '../ui/widgets';

export type BattleMode = 'manual' | 'replay' | 'ai';

interface BattleSceneData {
  levelId: string;
  mode: BattleMode;
}

type UiState =
  | { kind: 'idle' }
  | { kind: 'drag'; op: string; startX: number; startY: number; moved: boolean }
  | { kind: 'card'; op: string }
  | { kind: 'direction'; op: string; x: number; y: number; dir: Dir; gesture: boolean; downX: number; downY: number }
  | { kind: 'selected'; op: string };

interface Driver {
  update(battle: Battle): void;
}

interface CardView {
  op: string;
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  sprite: Phaser.GameObjects.Image;
  cost: Phaser.GameObjects.Text;
  cooldown: Phaser.GameObjects.Text;
  signature: string;
  x: number;
}

const SPEEDS = [1, 2, 3];
const MAP_Y = 32;
const DECK_Y = 290;
const CARD_W = 50;
const CARD_H = 64;
const CARD_GAP = 4;
const DECK_RIGHT = GAME_W - 8;
const PANEL_X = 8;
const PANEL_Y = 262;
const PANEL_H = GAME_H - PANEL_Y - 4;
/** Sprites stand with their feet this many pixels below the tile centre. */
const FEET = 12;

const TILE_TEXTURE: Record<TileKind, string> = {
  ground: 'tile_ground',
  groundLocked: 'tile_ground_locked',
  high: 'tile_high',
  highLocked: 'tile_high_locked',
  wall: 'tile_wall',
  spawn: 'tile_spawn',
  base: 'tile_base',
};

const DIR_ANGLE: Record<Dir, number> = { right: 0, down: 90, left: 180, up: 270 };
const DIR_VEC: Record<Dir, [number, number]> = { right: [1, 0], down: [0, 1], left: [-1, 0], up: [0, -1] };

export class BattleScene extends Phaser.Scene {
  private level!: LevelDef;
  private battle!: Battle;
  private mode: BattleMode = 'manual';
  private driver: Driver | null = null;
  private recorder!: ReplayRecorder;
  private speedIndex = 0;
  private menuPaused = false;
  private acc = 0;
  private state: UiState = { kind: 'idle' };
  private mapX = 0;
  private resultShown = false;

  private opViews = new Map<number, Phaser.GameObjects.Sprite>();
  private enemyViews = new Map<number, { sprite: Phaser.GameObjects.Sprite; shadow: Phaser.GameObjects.Image | null; lastX: number }>();
  private leakedUids = new Set<number>();
  private cards: CardView[] = [];

  private overlayGfx!: Phaser.GameObjects.Graphics;
  private barsGfx!: Phaser.GameObjects.Graphics;
  private ghost!: Phaser.GameObjects.Image;
  private arrows: { dir: Dir; img: Phaser.GameObjects.Image }[] = [];
  private cancelMark!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;

  private enemiesText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private dpText!: Phaser.GameObjects.Text;
  private dpBarGfx!: Phaser.GameObjects.Graphics;
  private deployText!: Phaser.GameObjects.Text;
  private speedBtn!: Button;
  private autoBtn!: Button;
  private modeBadge: Phaser.GameObjects.GameObject[] = [];

  private panelGfx!: Phaser.GameObjects.Graphics;
  private panelTexts: Phaser.GameObjects.Text[] = [];
  private skillBtn!: Button;
  private retreatBtn!: Button;
  private pauseLayer: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Battle');
  }

  init(data: BattleSceneData): void {
    this.level = getLevel(data.levelId);
    this.mode = data.mode;
    this.speedIndex = 0;
    this.menuPaused = false;
    this.acc = 0;
    this.state = { kind: 'idle' };
    this.resultShown = false;
    this.opViews = new Map();
    this.enemyViews = new Map();
    this.leakedUids = new Set();
    this.cards = [];
    this.arrows = [];
    this.modeBadge = [];
    this.panelTexts = [];
    this.pauseLayer = [];
  }

  create(): void {
    this.battle = new Battle(this.level);
    this.recorder = new ReplayRecorder(this.battle);
    const save = loadSave();

    if (this.mode === 'replay') {
      const replay = save.replays[this.level.id];
      if (replay && replay.dataVersion === dataVersion(this.level)) this.driver = new ReplayPlayer(replay);
      else this.mode = 'manual';
    } else if (this.mode === 'ai') {
      this.driver = new AutoDeployer(this.battle);
    } else {
      this.driver = null;
    }
    if (this.mode === 'manual' && save.autoSkill) this.battle.queue({ type: 'autoSkill', on: true });

    this.mapX = Math.floor((GAME_W - this.battle.grid.width * TILE) / 2);
    this.drawMap();

    this.overlayGfx = this.add.graphics().setDepth(5);
    this.barsGfx = this.add.graphics().setDepth(1000);
    this.ghost = this.add.image(0, 0, 'tile_ground').setOrigin(0.5, 1).setAlpha(0.75).setDepth(1500).setVisible(false);
    for (const dir of ['right', 'down', 'left', 'up'] as Dir[]) {
      const img = this.add.image(0, 0, 'ui_arrow').setScale(2).setAngle(DIR_ANGLE[dir]).setDepth(1600).setVisible(false);
      this.arrows.push({ dir, img });
    }
    this.cancelMark = text(this, 0, 0, 'X', { color: CSS.red }).setDepth(1600).setVisible(false).setOrigin(0.5);
    this.hint = text(this, GAME_W / 2, MAP_Y + 4, t('hud.placeHint'), { align: 'center', color: CSS.gold }).setDepth(1600).setVisible(false);

    this.createHud();
    this.createPanel();
    this.createDeck();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length === 0) this.onDown(p);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length === 0 || this.state.kind === 'direction' || this.state.kind === 'drag') this.onUp(p);
    });
  }

  private get locked(): boolean {
    return this.driver !== null;
  }

  private get placing(): boolean {
    const k = this.state.kind;
    return !this.locked && (k === 'drag' || k === 'card' || k === 'direction');
  }

  update(_time: number, delta: number): void {
    if (!this.menuPaused && !this.placing && this.battle.result === 'running') {
      this.acc += (Math.min(delta, 100) / 1000) * SPEEDS[this.speedIndex];
      while (this.acc >= DT && this.battle.result === 'running') {
        this.acc -= DT;
        this.driver?.update(this.battle);
        this.battle.step();
        this.handleEvents(this.battle.events);
      }
    }
    if (this.battle.result !== 'running' && !this.resultShown) {
      this.resultShown = true;
      this.time.delayedCall(700, () => this.showResult());
    }
    this.syncUnits();
    this.drawOverlay();
    this.drawBars();
    this.updateHud();
    this.updateDeck();
    this.updatePanel();
  }

  // ---------------------------------------------------------------------------
  // Coordinates

  private tileCenter(x: number, y: number): [number, number] {
    return [this.mapX + x * TILE + TILE / 2, MAP_Y + y * TILE + TILE / 2];
  }

  private tileAt(px: number, py: number): [number, number] | null {
    const x = Math.floor((px - this.mapX) / TILE);
    const y = Math.floor((py - MAP_Y) / TILE);
    return this.battle.grid.inBounds(x, y) ? [x, y] : null;
  }

  private drawMap(): void {
    const grid = this.battle.grid;
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        this.add.image(this.mapX + x * TILE, MAP_Y + y * TILE, TILE_TEXTURE[grid.kind(x, y)]).setOrigin(0, 0).setDepth(0);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Input

  private cardAt(px: number, py: number): string | null {
    for (const c of this.cards) {
      if (!c.container.visible) continue;
      if (px >= c.x && px < c.x + CARD_W && py >= DECK_Y - 4 && py < DECK_Y + CARD_H) return c.op;
    }
    return null;
  }

  private onDown(p: Phaser.Input.Pointer): void {
    if (this.resultShown || this.menuPaused) return;
    const s = this.state;
    if (s.kind === 'direction') {
      s.gesture = true;
      s.downX = p.x;
      s.downY = p.y;
      return;
    }
    const card = this.cardAt(p.x, p.y);
    if (card) {
      if (s.kind === 'card' && s.op === card) this.state = { kind: 'idle' };
      else this.state = { kind: 'drag', op: card, startX: p.x, startY: p.y, moved: false };
      return;
    }
    const tile = this.tileAt(p.x, p.y);
    if (tile && s.kind === 'card' && !this.locked && this.battle.canDeployAt(s.op, tile[0], tile[1])) {
      this.enterDirection(s.op, tile[0], tile[1]);
      return;
    }
    const op = tile ? this.battle.operatorAt(tile[0], tile[1]) : undefined;
    this.state = op ? { kind: 'selected', op: op.def.id } : { kind: 'idle' };
  }

  private onMove(p: Phaser.Input.Pointer): void {
    const s = this.state;
    if (s.kind === 'drag') {
      if (!s.moved && Math.hypot(p.x - s.startX, p.y - s.startY) > 6) s.moved = true;
      if (s.moved && !this.locked && this.battle.canDeployOperator(s.op)) {
        const tile = this.tileAt(p.x, p.y);
        this.ghost.setTexture(`op_${s.op}`).setVisible(true);
        if (tile && this.battle.canDeployAt(s.op, tile[0], tile[1])) {
          const [cx, cy] = this.tileCenter(tile[0], tile[1]);
          this.ghost.setPosition(cx, cy + FEET);
        } else {
          this.ghost.setPosition(p.x, p.y + 8);
        }
      }
    } else if (s.kind === 'direction' && s.gesture && p.isDown) {
      const [cx, cy] = this.tileCenter(s.x, s.y);
      if (Math.hypot(p.x - cx, p.y - cy) > 10) s.dir = vectorToDir(p.x - cx, p.y - cy);
    }
  }

  private onUp(p: Phaser.Input.Pointer): void {
    const s = this.state;
    if (s.kind === 'drag') {
      this.ghost.setVisible(false);
      if (!s.moved) {
        this.state = { kind: 'card', op: s.op };
        return;
      }
      const tile = this.tileAt(p.x, p.y);
      if (tile && !this.locked && this.battle.canDeployAt(s.op, tile[0], tile[1])) this.enterDirection(s.op, tile[0], tile[1]);
      else this.state = { kind: 'idle' };
      return;
    }
    if (s.kind === 'direction') {
      if (!s.gesture) return;
      s.gesture = false;
      const [cx, cy] = this.tileCenter(s.x, s.y);
      const fromCenter = Math.hypot(p.x - cx, p.y - cy);
      const swiped = Math.hypot(p.x - s.downX, p.y - s.downY) > 8;
      if (swiped && fromCenter > 14) {
        this.confirmDeploy(vectorToDir(p.x - cx, p.y - cy));
        return;
      }
      const arrow = this.arrows.find((a) => Math.hypot(p.x - a.img.x, p.y - a.img.y) <= 14);
      if (arrow) this.confirmDeploy(arrow.dir);
      else if (fromCenter <= 16) this.confirmDeploy(s.dir);
      else this.cancelPlacement();
    }
  }

  private enterDirection(op: string, x: number, y: number): void {
    this.state = { kind: 'direction', op, x, y, dir: this.suggestDir(op, x, y), gesture: false, downX: 0, downY: 0 };
  }

  /** Default facing: towards where enemies come from on that tile, else right. */
  private suggestDir(op: string, x: number, y: number): Dir {
    const def = this.battle.rosterEntry(op)!.def;
    let best: Dir = 'right';
    let bestScore = -1;
    for (const dir of ['right', 'down', 'left', 'up'] as Dir[]) {
      let score = 0;
      for (const [tx, ty] of rangeTiles(def.range, x, y, dir)) if (this.battle.grid.walkable(tx, ty)) score++;
      if (score > bestScore) {
        bestScore = score;
        best = dir;
      }
    }
    return best;
  }

  private confirmDeploy(dir: Dir): void {
    const s = this.state;
    if (s.kind !== 'direction') return;
    this.battle.queue({ type: 'deploy', op: s.op, x: s.x, y: s.y, dir });
    this.state = { kind: 'idle' };
  }

  private cancelPlacement(): void {
    this.state = { kind: 'idle' };
  }

  // ---------------------------------------------------------------------------
  // HUD, deck and panel

  private createHud(): void {
    const g = this.add.graphics().setDepth(1900);
    g.fillStyle(COLORS.panel, 1).fillRect(0, 0, GAME_W, 26);
    g.fillStyle(COLORS.border, 1).fillRect(0, 26, GAME_W, 1);
    this.enemiesText = text(this, 8, 9, '').setDepth(2000);
    this.add.image(GAME_W / 2 - 22, 13, 'ui_heart').setScale(2).setDepth(2000);
    this.livesText = text(this, GAME_W / 2 - 10, 9, '').setDepth(2000);

    const pauseBtn = new Button(this, GAME_W - 36, 3, 28, 20, 'II', () => this.openPause());
    this.speedBtn = new Button(this, GAME_W - 76, 3, 36, 20, 'x1', () => {
      this.speedIndex = (this.speedIndex + 1) % SPEEDS.length;
    });
    this.autoBtn = new Button(this, GAME_W - 152, 3, 72, 20, t('hud.autoSkill'), () => {
      const on = !this.battle.autoSkill;
      this.battle.queue({ type: 'autoSkill', on });
      writeSave((s) => (s.autoSkill = on));
    });
    for (const b of [pauseBtn, this.speedBtn, this.autoBtn]) b.setDepth(2000);

    if (this.locked) {
      const label = this.mode === 'replay' ? t('hud.modeReplay') : t('hud.modeAi');
      const badge = text(this, 168, 9, label, { color: CSS.red }).setDepth(2000);
      const takeOver = new Button(this, 168 + badge.width + 8, 3, 84, 20, t('hud.takeOver'), () => this.takeOver(), 'accent').setDepth(2000);
      this.modeBadge = [badge, takeOver];
    }

    const dg = this.add.graphics().setDepth(1900);
    panel(dg, GAME_W - 92, PANEL_Y, 84, 24);
    panel(dg, GAME_W - 176, PANEL_Y, 80, 24);
    this.add.image(GAME_W - 82, PANEL_Y + 10, 'ui_dp').setScale(1).setDepth(2000);
    this.dpText = text(this, GAME_W - 72, PANEL_Y + 6, '').setDepth(2000);
    this.dpBarGfx = this.add.graphics().setDepth(2000);
    this.deployText = text(this, GAME_W - 170, PANEL_Y + 9, '').setDepth(2000);
  }

  private takeOver(): void {
    this.driver = null;
    this.mode = 'manual';
    for (const o of this.modeBadge) o.destroy();
    this.modeBadge = [];
  }

  private updateHud(): void {
    const b = this.battle;
    setText(this.enemiesText, t('hud.enemies', { n: b.killed + b.leaked, total: b.totalEnemies }));
    setText(this.livesText, String(b.lives));
    setText(this.dpText, `${t('hud.dp')} ${Math.floor(b.dp)}`);
    setText(this.deployText, t('hud.deploy', { n: b.deployedCount, max: b.level.deployLimit }));
    this.speedBtn.setLabel(`x${SPEEDS[this.speedIndex]}`);
    this.autoBtn.setStyle(b.autoSkill ? 'toggled' : 'normal').setEnabled(!this.locked);
    const frac = b.dp >= 99 ? 1 : b.dp - Math.floor(b.dp);
    this.dpBarGfx.clear().fillStyle(0x000000, 1).fillRect(GAME_W - 72, PANEL_Y + 17, 58, 3).fillStyle(COLORS.dp, 1).fillRect(GAME_W - 72, PANEL_Y + 17, Math.round(58 * frac), 3);
  }

  private createDeck(): void {
    for (const entry of this.battle.roster) {
      const op = entry.def.id;
      const container = this.add.container(0, DECK_Y).setDepth(2000);
      const bg = this.add.graphics();
      const sprite = this.add.image(CARD_W / 2, CARD_H - 8, `op_${op}`).setOrigin(0.5, 1);
      const icon = this.add.image(CARD_W - 7, 7, `icon_${entry.def.cls}`);
      const cost = text(this, 3, 3, String(entry.def.cost));
      const cooldown = text(this, CARD_W / 2, CARD_H / 2 - 4, '', { align: 'center', color: CSS.red });
      container.add([bg, sprite, icon, cost, cooldown]);
      this.cards.push({ op, container, bg, sprite, cost, cooldown, signature: '', x: 0 });
    }
  }

  private updateDeck(): void {
    const b = this.battle;
    const visible = this.cards
      .filter((c) => b.rosterEntry(c.op)!.status !== 'deployed')
      .sort((a, c) => b.costOf(a.op) - b.costOf(c.op) || a.op.localeCompare(c.op));
    for (const c of this.cards) c.container.setVisible(false);
    let x = DECK_RIGHT - visible.length * (CARD_W + CARD_GAP) + CARD_GAP;
    const selected = this.state.kind === 'card' || this.state.kind === 'drag' || this.state.kind === 'direction' ? this.state.op : null;
    for (const c of visible) {
      const entry = b.rosterEntry(c.op)!;
      const cost = b.costOf(c.op);
      const affordable = Math.floor(b.dp) >= cost;
      const cooling = entry.status === 'cooldown';
      const isSel = selected === c.op;
      c.x = x;
      c.container.setVisible(true).setPosition(x, DECK_Y - (isSel ? 4 : 0));
      const sig = `${cooling ? Math.ceil(entry.cooldown) : '-'}|${affordable}|${isSel}|${cost}|${b.deployedCount >= b.level.deployLimit}`;
      if (sig !== c.signature) {
        c.signature = sig;
        const usable = !cooling && affordable && b.deployedCount < b.level.deployLimit;
        const g = c.bg.clear();
        g.fillStyle(isSel ? COLORS.redLight : COLORS.border, 1).fillRect(0, 0, CARD_W, CARD_H);
        g.fillStyle(COLORS.panelLight, 1).fillRect(1, 1, CARD_W - 2, CARD_H - 2);
        g.fillStyle(COLORS.red, 1).fillRect(1, CARD_H - 4, CARD_W - 2, 3);
        g.fillStyle(0x000000, 1).fillRect(1, 1, 18, 12);
        c.cost.setText(String(cost)).setColor(affordable ? CSS.text : CSS.red);
        c.sprite.setAlpha(usable ? 1 : 0.4);
        if (cooling) {
          g.fillStyle(0x000000, 0.6).fillRect(1, 14, CARD_W - 2, CARD_H - 18);
          c.cooldown.setText(`${Math.ceil(entry.cooldown)}`);
        } else {
          c.cooldown.setText('');
        }
      }
      x += CARD_W + CARD_GAP;
    }
  }

  private createPanel(): void {
    this.panelGfx = this.add.graphics().setDepth(1900);
    for (let i = 0; i < 5; i++) this.panelTexts.push(text(this, 0, 0, '').setDepth(2000));
    this.skillBtn = new Button(this, 0, 0, 78, 20, t('panel.skill'), () => {
      const op = this.panelOp();
      if (op && !this.locked) this.battle.queue({ type: 'skill', op: op.def.id });
    }, 'accent').setDepth(2000);
    this.retreatBtn = new Button(this, 0, 0, 78, 20, '', () => {
      const op = this.panelOp();
      if (op && !this.locked) {
        this.battle.queue({ type: 'retreat', op: op.def.id });
        this.state = { kind: 'idle' };
      }
    }).setDepth(2000);
  }

  private panelOp(): OperatorUnit | undefined {
    return this.state.kind === 'selected' ? this.battle.operatorById(this.state.op) : undefined;
  }

  private updatePanel(): void {
    const s = this.state;
    const opId = s.kind === 'idle' ? null : s.op;
    const entry = opId ? this.battle.rosterEntry(opId) : undefined;
    const unit = s.kind === 'selected' ? this.panelOp() : undefined;
    if (s.kind === 'selected' && !unit) this.state = { kind: 'idle' };
    const show = !!entry && (s.kind !== 'selected' || !!unit);
    const deckLeft = Math.min(DECK_RIGHT, ...this.cards.filter((c) => c.container.visible).map((c) => c.x));
    const w = Math.max(200, deckLeft - PANEL_X - 8);
    const tx = this.panelTexts;
    this.panelGfx.clear();
    for (const txt of tx) txt.setVisible(show);
    const showButtons = show && !!unit && !this.locked;
    this.skillBtn.setVisible(showButtons);
    this.retreatBtn.setVisible(showButtons);
    if (!show || !entry) return;

    const def = entry.def;
    panel(this.panelGfx, PANEL_X, PANEL_Y, w, PANEL_H);
    const x = PANEL_X + 8;
    const y = PANEL_Y + 7;
    const statsAtk = unit ? Math.round(this.battle.stats(unit).atk) : def.atk;
    const statsDef = unit ? Math.round(this.battle.stats(unit).def) : def.def;
    setText(tx[0].setPosition(x, y), `${def.name}  ${t(`class.${def.cls}` as StringKey)}`);
    tx[0].setColor(CSS.text);
    const hp = unit ? `HP ${Math.max(0, Math.ceil(unit.hp))}/${unit.maxHp}` : `HP ${def.hp}`;
    setText(tx[1].setPosition(x, y + 14), `${hp}  ${def.heals ? '+' : 'ATK'} ${statsAtk}  DEF ${statsDef}`);
    tx[1].setColor(CSS.dim);
    const skill = def.skill;
    const status = unit ? (unit.skillActive ? t('panel.active') : unit.sp >= skill.spCost ? t('panel.ready') : `${Math.floor(unit.sp)}/${skill.spCost}`) : `${skill.spInitial}/${skill.spCost}`;
    setText(tx[2].setPosition(x, y + 30), `${t(`skill.${skill.id}.name` as StringKey)}  ${status}`);
    tx[2].setColor(CSS.gold);
    const descW = showButtons ? w - 106 : w - 16;
    tx[3].setPosition(x, y + 44).setWordWrapWidth(descW, true);
    setText(tx[3], t(`skill.${skill.id}.desc` as StringKey));
    tx[3].setColor(CSS.dim);
    const info = unit
      ? ''
      : `${t('panel.cost', { n: this.battle.costOf(def.id) })}  ${def.placement === 'ground' ? t('panel.block', { n: def.block }) + '  ' : ''}${t('panel.cooldown', { s: def.redeploy })}`;
    setText(tx[4].setPosition(x, PANEL_Y + PANEL_H - 14), info);
    tx[4].setColor(CSS.text);

    if (unit) {
      const barW = Math.min(140, w - 120);
      const bx = x;
      const by = y + 24;
      this.panelGfx.fillStyle(0x000000, 1).fillRect(bx, by, barW, 3);
      this.panelGfx.fillStyle(unit.skillActive ? COLORS.redLight : COLORS.sp, 1).fillRect(bx, by, Math.round(barW * (unit.skillActive ? unit.skillTime / skill.duration : unit.sp / skill.spCost)), 3);
    }
    if (showButtons && unit) {
      const bx = PANEL_X + w - 86;
      this.skillBtn.setPosition(bx, PANEL_Y + 34).setEnabled(this.battle.canUseSkill(unit.def.id));
      this.retreatBtn.setPosition(bx, PANEL_Y + 62).setLabel(t('panel.retreat', { dp: this.battle.refundOf(unit.def.id) }));
    }
  }

  // ---------------------------------------------------------------------------
  // Units and effects

  private opSprite(unit: OperatorUnit): Phaser.GameObjects.Sprite {
    let s = this.opViews.get(unit.uid);
    if (!s) {
      const [cx, cy] = this.tileCenter(unit.x, unit.y);
      const key = `op_${unit.def.id}`;
      s = this.add.sprite(cx, cy + FEET, key).setOrigin(0.5, 1).setDepth(10 + cy);
      s.setFlipX(unit.dir === 'left');
      playAnim(s, key, 'idle');
      s.setAlpha(0).setY(cy + FEET - 10);
      this.tweens.add({ targets: s, alpha: 1, y: cy + FEET, duration: 180, ease: 'Quad.easeIn' });
      this.opViews.set(unit.uid, s);
    }
    return s;
  }

  private enemyView(e: EnemyUnit) {
    let v = this.enemyViews.get(e.uid);
    if (!v) {
      const key = `en_${e.def.id}`;
      const sprite = this.add.sprite(0, 0, key).setOrigin(0.5, 1);
      if (e.def.boss) sprite.setScale(1.25);
      playAnim(sprite, key, 'move');
      const shadow = e.def.flying ? this.add.image(0, 0, 'fx_shadow').setDepth(6) : null;
      v = { sprite, shadow, lastX: e.x };
      this.enemyViews.set(e.uid, v);
    }
    return v;
  }

  private syncUnits(): void {
    const alive = new Set<number>();
    for (const op of this.battle.operators) {
      alive.add(op.uid);
      this.opSprite(op);
    }
    for (const [uid, s] of this.opViews) {
      if (alive.has(uid)) continue;
      this.opViews.delete(uid);
      this.tweens.add({ targets: s, alpha: 0, y: s.y - 8, duration: 250, onComplete: () => s.destroy() });
    }

    alive.clear();
    for (const e of this.battle.enemies) {
      alive.add(e.uid);
      const v = this.enemyView(e);
      const px = Math.round(this.mapX + e.x * TILE + TILE / 2);
      const ground = Math.round(MAP_Y + e.y * TILE + TILE / 2 + FEET);
      const lift = e.def.flying ? 12 : 0;
      v.sprite.setPosition(px, ground - lift).setDepth(10 + ground);
      if (Math.abs(e.x - v.lastX) > 0.001) v.sprite.setFlipX(e.x < v.lastX);
      v.lastX = e.x;
      v.shadow?.setPosition(px, ground - 2);
    }
    for (const [uid, v] of this.enemyViews) {
      if (alive.has(uid)) continue;
      this.enemyViews.delete(uid);
      v.shadow?.destroy();
      if (this.leakedUids.has(uid)) {
        this.leakedUids.delete(uid);
        v.sprite.destroy();
        continue;
      }
      this.burst(v.sprite.x, v.sprite.y - 12, 0xffffff, 6);
      this.tweens.add({ targets: v.sprite, alpha: 0, scaleY: 0.2, duration: 220, onComplete: () => v.sprite.destroy() });
    }
  }

  private findOp(uid: number): OperatorUnit | undefined {
    return this.battle.operators.find((o) => o.uid === uid);
  }

  private handleEvents(events: readonly BattleEvent[]): void {
    for (const ev of events) {
      switch (ev.type) {
        case 'attack': {
          const op = this.findOp(ev.uid);
          const target = this.enemyViews.get(ev.target)?.sprite;
          const s = this.opViews.get(ev.uid);
          if (!op || !target || !s) break;
          playAnim(s, `op_${op.def.id}`, 'attack');
          if (op.def.placement === 'ground') {
            this.slash(target.x, target.y - 14);
            this.lunge(s, target.x - s.x, target.y - s.y);
          } else if (op.def.splash > 0) {
            this.shell(s.x, s.y - 20, target.x, target.y - 10, op.def.splash);
          } else {
            this.tracer(s.x, s.y - 18, target.x, target.y - 14, 0xf2e6b0);
          }
          break;
        }
        case 'heal': {
          const t = this.opViews.get(ev.target);
          if (t) this.healFx(t.x, t.y - 16);
          break;
        }
        case 'enemyAttack': {
          const ev2 = this.battle.enemies.find((e) => e.uid === ev.uid);
          const es = this.enemyViews.get(ev.uid)?.sprite;
          const os = this.opViews.get(ev.target);
          if (!es || !os || !ev2) break;
          if (ev.ranged) this.tracer(es.x, es.y - 16, os.x, os.y - 14, COLORS.regime);
          else this.lunge(es, os.x - es.x, os.y - es.y);
          break;
        }
        case 'enemyHit': {
          const s = this.enemyViews.get(ev.uid)?.sprite;
          if (s) flash(this, s, 0xffffff);
          break;
        }
        case 'opHit': {
          const s = this.opViews.get(ev.uid);
          if (s) flash(this, s, 0xff5050);
          break;
        }
        case 'leak': {
          this.leakedUids.add(ev.uid);
          this.cameras.main.shake(120, 0.004);
          this.cameras.main.flash(120, 120, 20, 20);
          break;
        }
        case 'skill': {
          const s = this.opViews.get(ev.uid);
          if (!s) break;
          const name = t(`skill.${this.battle.rosterEntry(ev.op)!.def.skill.id}.name` as StringKey);
          const label = text(this, s.x, s.y - 40, name, { align: 'center', color: CSS.gold }).setDepth(3000);
          this.tweens.add({ targets: label, y: label.y - 12, alpha: 0, duration: 900, delay: 300, onComplete: () => label.destroy() });
          this.burst(s.x, s.y - 14, COLORS.red, 10);
          break;
        }
        case 'opDied': {
          const s = this.opViews.get(ev.uid);
          if (s) this.burst(s.x, s.y - 14, COLORS.red, 10);
          break;
        }
        default:
          break;
      }
    }
  }

  private slash(x: number, y: number): void {
    const img = this.add.image(x, y, 'fx_slash').setDepth(1100).setAngle(Phaser.Math.Between(0, 3) * 90);
    this.tweens.add({ targets: img, alpha: 0, duration: 140, onComplete: () => img.destroy() });
  }

  private lunge(s: Phaser.GameObjects.Sprite, dx: number, dy: number): void {
    const len = Math.hypot(dx, dy) || 1;
    const ox = s.x;
    const oy = s.y;
    this.tweens.add({
      targets: s,
      x: ox + Math.round((dx / len) * 3),
      y: oy + Math.round((dy / len) * 3),
      duration: 60,
      yoyo: true,
      onComplete: () => s.active && s.setPosition(ox, oy),
    });
  }

  private tracer(x0: number, y0: number, x1: number, y1: number, color: number): void {
    const g = this.add.graphics().setDepth(1100);
    g.lineStyle(1, color, 1).lineBetween(x0, y0, x1, y1);
    this.tweens.add({ targets: g, alpha: 0, duration: 90, onComplete: () => g.destroy() });
  }

  private shell(x0: number, y0: number, x1: number, y1: number, radius: number): void {
    const img = this.add.image(x0, y0, 'fx_shell').setDepth(1100);
    this.tweens.add({
      targets: img,
      x: x1,
      y: y1,
      duration: 220,
      onComplete: () => {
        img.destroy();
        const g = this.add.graphics().setDepth(1100);
        g.fillStyle(0xf2c94c, 0.35).fillCircle(x1, y1, radius * TILE * 0.8);
        g.lineStyle(1, 0xffe9a0, 1).strokeCircle(x1, y1, radius * TILE * 0.8);
        this.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
        this.burst(x1, y1, 0xf2c94c, 6);
      },
    });
  }

  private healFx(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      const img = this.add.image(x + (i - 1) * 6, y + i * 2, 'fx_heal').setDepth(1100);
      this.tweens.add({ targets: img, y: img.y - 12, alpha: 0, duration: 500, delay: i * 80, onComplete: () => img.destroy() });
    }
  }

  private burst(x: number, y: number, color: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const img = this.add.image(x, y, 'fx_spark').setTint(color).setDepth(1100);
      this.tweens.add({ targets: img, x: x + Math.cos(a) * 12, y: y + Math.sin(a) * 10, alpha: 0, duration: 300, onComplete: () => img.destroy() });
    }
  }

  // ---------------------------------------------------------------------------
  // Per-frame drawing

  private drawOverlay(): void {
    const g = this.overlayGfx.clear();
    const s = this.state;
    for (const a of this.arrows) a.img.setVisible(false);
    this.cancelMark.setVisible(false);
    this.hint.setVisible(false);

    if ((s.kind === 'drag' || s.kind === 'card') && !this.locked && this.battle.canDeployOperator(s.op)) {
      const grid = this.battle.grid;
      for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
          if (!this.battle.canDeployAt(s.op, x, y)) continue;
          const px = this.mapX + x * TILE;
          const py = MAP_Y + y * TILE;
          g.fillStyle(COLORS.red, 0.28).fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
          g.lineStyle(1, COLORS.redLight, 0.9).strokeRect(px + 1.5, py + 1.5, TILE - 3, TILE - 3);
        }
      }
    }

    if (s.kind === 'direction') {
      const def = this.battle.rosterEntry(s.op)!.def;
      this.drawRange(g, rangeTiles(def.range, s.x, s.y, s.dir), 0xffffff);
      const [cx, cy] = this.tileCenter(s.x, s.y);
      this.ghost.setTexture(`op_${s.op}`).setPosition(cx, cy + FEET).setFlipX(s.dir === 'left').setVisible(true);
      for (const a of this.arrows) {
        const [vx, vy] = DIR_VEC[a.dir];
        a.img.setPosition(cx + vx * 28, cy + vy * 28).setVisible(true);
        a.img.setTint(a.dir === s.dir ? COLORS.redLight : 0xffffff).setAlpha(a.dir === s.dir ? 1 : 0.6);
      }
      this.cancelMark.setPosition(cx + 26, cy - 26).setVisible(true);
      this.hint.setVisible(true);
    } else if (s.kind !== 'drag') {
      this.ghost.setVisible(false).setFlipX(false);
    }

    if (s.kind === 'selected') {
      const op = this.battle.operatorById(s.op);
      if (op) {
        this.drawRange(g, op.rangeList, op.def.heals ? COLORS.heal : COLORS.sp);
        const [cx, cy] = this.tileCenter(op.x, op.y);
        g.lineStyle(1, 0xffffff, 1).strokeRect(cx - TILE / 2 + 0.5, cy - TILE / 2 + 0.5, TILE - 1, TILE - 1);
      }
    }
  }

  private drawRange(g: Phaser.GameObjects.Graphics, tiles: readonly (readonly [number, number])[], color: number): void {
    for (const [x, y] of tiles) {
      if (!this.battle.grid.inBounds(x, y)) continue;
      const px = this.mapX + x * TILE;
      const py = MAP_Y + y * TILE;
      g.fillStyle(color, 0.22).fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
      g.lineStyle(1, color, 0.8).strokeRect(px + 1.5, py + 1.5, TILE - 3, TILE - 3);
    }
  }

  private drawBars(): void {
    const g = this.barsGfx.clear();
    const pulse = 0.5 + 0.5 * Math.sin(this.time.now / 120);
    for (const op of this.battle.operators) {
      const s = this.opViews.get(op.uid);
      if (!s) continue;
      const x = Math.round(s.x - 12);
      const y = Math.round(s.y + 2);
      g.fillStyle(0x000000, 1).fillRect(x - 1, y - 1, 26, 6);
      g.fillStyle(COLORS.hp, 1).fillRect(x, y, Math.round(24 * Math.max(0, op.hp) / op.maxHp), 2);
      const skill = op.def.skill;
      if (op.skillActive) {
        g.fillStyle(COLORS.redLight, 1).fillRect(x, y + 3, Math.round(24 * op.skillTime / skill.duration), 1);
        g.lineStyle(1, COLORS.redLight, 0.4 + 0.6 * pulse).strokeRect(s.x - 15.5, s.y - 33.5, 31, 35);
      } else {
        const ready = op.sp >= skill.spCost;
        g.fillStyle(ready ? (pulse > 0.5 ? 0xffffff : COLORS.sp) : COLORS.sp, 1).fillRect(x, y + 3, Math.round(24 * op.sp / skill.spCost), 1);
      }
    }
    for (const e of this.battle.enemies) {
      if (e.hp >= e.maxHp) continue;
      const v = this.enemyViews.get(e.uid);
      if (!v) continue;
      const w = e.def.boss ? 28 : 20;
      const top = Math.round(v.sprite.y - v.sprite.displayHeight - 3);
      const x = Math.round(v.sprite.x - w / 2);
      g.fillStyle(0x000000, 1).fillRect(x - 1, top - 1, w + 2, 4);
      g.fillStyle(COLORS.hpEnemy, 1).fillRect(x, top, Math.round(w * Math.max(0, e.hp) / e.maxHp), 2);
    }
  }

  // ---------------------------------------------------------------------------
  // Pause and result

  private openPause(): void {
    if (this.resultShown || this.menuPaused) return;
    this.menuPaused = true;
    const g = this.add.graphics().setDepth(5000);
    g.fillStyle(0x000000, 0.7).fillRect(0, 0, GAME_W, GAME_H);
    const title = text(this, GAME_W / 2, 100, t('pause.title'), { size: 16, align: 'center' }).setDepth(5001);
    const bx = GAME_W / 2 - 70;
    const resume = new Button(this, bx, 140, 140, 24, t('pause.resume'), () => this.closePause(), 'accent').setDepth(5001);
    const restart = new Button(this, bx, 172, 140, 24, t('pause.restart'), () => this.scene.restart({ levelId: this.level.id, mode: this.initialMode() })).setDepth(5001);
    const quit = new Button(this, bx, 204, 140, 24, t('pause.quit'), () => this.scene.start('Menu')).setDepth(5001);
    this.pauseLayer = [g, title, resume, restart, quit];
  }

  private closePause(): void {
    for (const o of this.pauseLayer) o.destroy();
    this.pauseLayer = [];
    this.menuPaused = false;
  }

  private initialMode(): BattleMode {
    return this.scene.settings.data ? (this.scene.settings.data as BattleSceneData).mode : 'manual';
  }

  private showResult(): void {
    const b = this.battle;
    const won = b.result === 'won';
    const stars = b.stars();
    let replaySaved = false;
    if (won) {
      const data = this.recorder.toData(this.level);
      writeSave((s) => {
        const prev = s.levels[this.level.id];
        s.levels[this.level.id] = { cleared: true, stars: Math.max(prev?.stars ?? 0, stars) };
        const old = s.replays[this.level.id];
        if (!old || old.dataVersion !== data.dataVersion || stars >= old.stars) {
          s.replays[this.level.id] = { ...data, stars };
          replaySaved = true;
        }
      });
    }

    const g = this.add.graphics().setDepth(5000);
    g.fillStyle(0x000000, 0.75).fillRect(0, 0, GAME_W, GAME_H);
    g.fillStyle(won ? COLORS.red : 0x3a3d44, 1).fillRect(0, 96, GAME_W, 2).fillRect(0, 246, GAME_W, 2);
    text(this, GAME_W / 2, 116, won ? t('result.won') : t('result.lost'), { size: 16, align: 'center', color: won ? CSS.text : CSS.dim }).setDepth(5001);
    for (let i = 0; i < 3; i++) {
      this.add.image(GAME_W / 2 - 26 + i * 26, 156, i < stars ? 'ui_star' : 'ui_star_empty').setScale(2).setDepth(5001);
    }
    text(this, GAME_W / 2, 178, t('result.stats', { k: b.killed, t: b.totalEnemies, l: b.lives }), { align: 'center', color: CSS.dim }).setDepth(5001);
    if (replaySaved) text(this, GAME_W / 2, 194, t('result.replaySaved'), { align: 'center', color: CSS.gold }).setDepth(5001);
    new Button(this, GAME_W / 2 - 128, 212, 120, 24, t('result.retry'), () => this.scene.restart({ levelId: this.level.id, mode: this.initialMode() }), 'accent').setDepth(5001);
    new Button(this, GAME_W / 2 + 8, 212, 120, 24, t('result.menu'), () => this.scene.start('Menu')).setDepth(5001);
  }
}

function vectorToDir(dx: number, dy: number): Dir {
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'down' : 'up';
}

function setText(obj: Phaser.GameObjects.Text, value: string): void {
  if (obj.text !== value) obj.setText(value);
}

function flash(scene: Phaser.Scene, s: Phaser.GameObjects.Sprite, color: number): void {
  s.setTintFill(color);
  scene.time.delayedCall(60, () => s.active && s.clearTint());
}

/** Plays `<texture>:<anim>` if real art declared that animation; placeholders are static. */
function playAnim(s: Phaser.GameObjects.Sprite, texture: string, anim: string): void {
  const key = `${texture}:${anim}`;
  if (!s.scene.anims.exists(key)) return;
  s.play(key, anim === 'idle' || anim === 'move');
  if (anim === 'attack') s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => playAnim(s, texture, 'idle'));
}
