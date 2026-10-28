import Phaser from 'phaser';
import { COLORS, CSS, GAME_H, GAME_W, TILE, ZOOM } from '../../config';
import { idealOperators } from '../../data/counters';
import { getLevel, levelLabel, LEVELS } from '../../data/levels';
import type { Dir, LevelDef } from '../../data/types';
import { t, type StringKey } from '../../i18n';
import { AutoDeployer } from '../../sim/ai';
import { Battle, DT, type BattleEvent, type EnemyUnit, type OperatorUnit } from '../../sim/battle';
import { rangeTiles, type TileKind } from '../../sim/grid';
import { dataVersion, ReplayPlayer, ReplayRecorder } from '../../sim/replay';
import { audio } from '../audio';
import { addXp, stageXp } from '../../data/progression';
import { OPERATORS } from '../../data/operators';
import { isUnlocked, operatorProgress, playerSquad, withSquad } from '../progress';
import { loadSave, session, writeSave } from '../save';
import { Button, panel, soundButtons, text } from '../ui/widgets';
import { saveSound, soundLabels } from './HomeScene';
import { tileTextureKey, unitMeta } from '../art';

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
  | { kind: 'selected'; op: string }
  | { kind: 'enemy'; uid: number };

/** Pointer position in logical (GAME_W x GAME_H) screen units. */
interface Pt {
  x: number;
  y: number;
  isDown: boolean;
  touch: boolean;
}
const logical = (p: Phaser.Input.Pointer): Pt => ({ x: p.x / ZOOM, y: p.y / ZOOM, isDown: p.isDown, touch: p.wasTouch });

/** Map zoom range (on top of ZOOM). Phones start zoomed in so tiles are big enough for a finger. */
const MAP_ZOOM_MIN = 1;
const MAP_ZOOM_MAX = 2.2;
const MAP_ZOOM_TOUCH = 1.5;
/** On touch, deploy targets sit a little above the fingertip so the finger does not hide them. */
const TOUCH_AIM_Y = -8;

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
/** Screen area where the map is shown (the deck and panels overlap its bottom edge). */
const VIEW_TOP = 30;
const VIEW_LEFT = 8;
const VIEW_RIGHT = GAME_W - 8;
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
  airSpawn: 'tile_spawn_air',
  base: 'tile_base',
};

/**
 * Pre-rendered 3D map backgrounds (public/assets/maps/<level>.jpg, made by tools/models3d/map3d.js).
 * Each image covers the map plus a margin of tiles around it, at PPU image pixels per tile.
 * High ground is drawn raised, so units and highlights on it are lifted by LIFT pixels.
 */
const MAP3D = { ppu: 64, marginLeft: 7, marginTop: 1.5, lift: 10 };

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
  /** Map panning in progress (finger or mouse drag on the map). */
  private pan: { x: number; y: number; scrollX: number; scrollY: number; moved: boolean } | null = null;
  private edgeGfx!: Phaser.GameObjects.Graphics;
  private resultShown = false;

  private opViews = new Map<number, Phaser.GameObjects.Sprite>();
  private enemyViews = new Map<number, { sprite: Phaser.GameObjects.Sprite; shadow: Phaser.GameObjects.Image | null; lastX: number }>();
  private leakedUids = new Set<number>();
  private cards: CardView[] = [];

  private overlayGfx!: Phaser.GameObjects.Graphics;
  /** True when the stage uses a pre-rendered 3D map image instead of tiles. */
  private map3d = false;
  /** Extra zoom of the map camera; the HUD camera always stays at ZOOM. */
  private mapZoom = 1;
  private uiCam!: Phaser.Cameras.Scene2D.Camera;
  private pinch: { dist: number; zoom: number; anchorX: number; anchorY: number } | null = null;
  /** First-stage tutorial step (-1 = off), see updateTutorial(). */
  private tutorial = -1;
  private tutObjs: Phaser.GameObjects.GameObject[] = [];
  /** Tile the dragged operator would land on (highlighted). */
  private dragTarget: [number, number] | null = null;
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

  preload(): void {
    // Optional: without the image the map falls back to the tile textures.
    const key = `map_${this.level.id}`;
    if (!this.textures.exists(key)) this.load.image(key, `assets/maps/${this.level.id}.jpg`);
  }

  init(data: BattleSceneData): void {
    // Every stage is played with the squad chosen in the squad screen.
    const saved = loadSave();
    this.level = withSquad(getLevel(data.levelId), playerSquad(saved.squad), saved.ops);
    session.selectedLevel = this.level.id;
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
    // Two cameras: the map camera zooms and scrolls, the HUD camera stays fixed at ZOOM.
    // New objects belong to the map unless ui() moves them to the HUD.
    const touch = this.sys.game.device.input.touch;
    this.mapZoom = Phaser.Math.Clamp(loadSave().mapZoom ?? (touch ? MAP_ZOOM_TOUCH : 1), MAP_ZOOM_MIN, MAP_ZOOM_MAX);
    this.cameras.main.setOrigin(0, 0).setZoom(ZOOM * this.mapZoom);
    const old = this.cameras.getCamera('ui');
    if (old) this.cameras.remove(old);
    this.uiCam = this.cameras.add(0, 0, GAME_W * ZOOM, GAME_H * ZOOM, false, 'ui').setOrigin(0, 0).setZoom(ZOOM);
    const toMap = (o: Phaser.GameObjects.GameObject) => this.uiCam.ignore(o);
    this.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, toMap);
    this.pinch = null;
    this.events.once('shutdown', () => {
      this.anims.globalTimeScale = 1;
      this.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, toMap);
    });
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

    this.drawMap();
    this.pan = null;
    const cam = this.cameras.main;
    const z = this.mapZoom;
    const [sx, sy] = this.clampScroll((this.battle.grid.width * TILE - GAME_W / z) / 2, (this.battle.grid.height * TILE - (PANEL_Y + VIEW_TOP) / z) / 2);
    cam.setScroll(sx, sy);

    this.overlayGfx = this.add.graphics().setDepth(5);
    this.barsGfx = this.add.graphics().setDepth(1000);
    this.ghost = this.add.image(0, 0, 'tile_ground').setOrigin(0.5, 1).setAlpha(0.75).setDepth(1500).setVisible(false);
    for (const dir of ['right', 'down', 'left', 'up'] as Dir[]) {
      const img = this.add.image(0, 0, 'ui_arrow').setScale(2).setAngle(DIR_ANGLE[dir]).setDepth(1600).setVisible(false);
      this.arrows.push({ dir, img });
    }
    this.cancelMark = text(this, 0, 0, 'X', { color: CSS.red }).setDepth(1600).setVisible(false).setOrigin(0.5);
    this.hint = ui(text(this, GAME_W / 2, VIEW_TOP + 4, t('hud.placeHint'), { align: 'center', color: CSS.gold }).setDepth(1600).setVisible(false));
    this.edgeGfx = ui(this.add.graphics().setDepth(1800));

    this.pinned(() => {
      this.createHud();
      this.createPanel();
      this.createDeck();
    });
    audio.music('battle');
    this.tutorial = this.level.id === LEVELS[0].id && this.mode === 'manual' && !save.tutorialDone ? 0 : -1;
    this.tutObjs = [];
    if (this.tutorial === 0) this.showTutorial();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length === 0) this.onDown(logical(p));
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.updatePinch()) return;
      this.onMove(logical(p));
    });
    this.input.on('wheel', (p: Phaser.Input.Pointer, _o: unknown, dx: number, dy: number, _dz: number, e?: WheelEvent) => {
      const ev = (p.event as WheelEvent | undefined) ?? e;
      if (ev?.ctrlKey) {
        // Ctrl + wheel (or a touchpad pinch) zooms around the cursor.
        this.zoomAround(this.mapZoom * (dy > 0 ? 0.9 : 1.1), p.x / ZOOM, p.y / ZOOM);
        ev.preventDefault?.();
        return;
      }
      const cam = this.cameras.main;
      const [x, y] = this.clampScroll(cam.scrollX + (dx * 0.5) / this.mapZoom, cam.scrollY + (dy * 0.5) / this.mapZoom);
      cam.setScroll(x, y);
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.pinch) {
        // Lifting a finger ends the pinch; the other finger must not turn into a tap or a pan.
        this.pinch = null;
        this.pan = null;
        return;
      }
      if (over.length === 0 || this.pan || this.state.kind === 'direction' || this.state.kind === 'drag') this.onUp(logical(p));
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
    // The tutorial holds the battle until the first deployment (queued actions still go through).
    const tutorialHold = this.tutorial >= 0 && this.tutorial < 2 && !this.battle.hasPending;
    if (!this.menuPaused && !this.placing && !tutorialHold && this.battle.result === 'running') {
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
    this.anims.globalTimeScale = this.menuPaused ? 0 : this.placing ? 0.25 : SPEEDS[this.speedIndex];
    this.autoScroll();
    this.updateTutorial();
    this.syncUnits();
    this.drawOverlay();
    this.drawEdgeMarkers();
    this.drawBars();
    this.updateHud();
    this.updateDeck();
    this.updatePanel();
  }

  // ---------------------------------------------------------------------------
  // Coordinates

  // The map lives in world space with its top-left tile at (0, 0); the camera scrolls over it.
  // HUD objects use scrollFactor 0 (see ui()), so they stay fixed on screen.

  private tileCenter(x: number, y: number): [number, number] {
    return [x * TILE + TILE / 2, y * TILE + TILE / 2 - this.lift(x, y)];
  }

  /** How far a tile's top is drawn above its grid square (raised high ground on 3D maps). */
  private lift(x: number, y: number): number {
    if (!this.map3d) return 0;
    const k = this.battle.grid.kind(x, y);
    return k === 'high' || k === 'highLocked' ? MAP3D.lift : 0;
  }

  /** Tile under a screen position, if any. Raised tiles are hit where they are drawn. */
  private tileAt(screenX: number, screenY: number): [number, number] | null {
    const p = this.toWorld(screenX, screenY);
    const x = Math.floor(p.x / TILE);
    const below = Math.floor((p.y + MAP3D.lift) / TILE);
    if (this.lift(x, below) && this.battle.grid.inBounds(x, below)) return [x, below];
    const y = Math.floor(p.y / TILE);
    return this.battle.grid.inBounds(x, y) ? [x, y] : null;
  }

  /**
   * Deploy target for a pointer: the valid tile whose top is nearest, within about one tile,
   * so a slightly-off finger still lands where the player meant (magnetic placement).
   */
  private deployTarget(p: Pt, op: string): [number, number] | null {
    const w = this.toWorld(p.x, p.y + (p.touch ? TOUCH_AIM_Y : 0));
    const gx = Math.floor(w.x / TILE);
    const gy = Math.floor(w.y / TILE);
    let best: [number, number] | null = null;
    let bestD = TILE * 0.95;
    for (let y = gy - 2; y <= gy + 2; y++) {
      for (let x = gx - 2; x <= gx + 2; x++) {
        if (!this.battle.grid.inBounds(x, y) || !this.battle.canDeployAt(op, x, y)) continue;
        const [cx, cy] = this.tileCenter(x, y);
        const d = Math.hypot(cx - w.x, cy - w.y);
        if (d < bestD) {
          bestD = d;
          best = [x, y];
        }
      }
    }
    return best;
  }

  /** World point under a logical screen position. */
  private toWorld(screenX: number, screenY: number): Phaser.Math.Vector2 {
    return this.cameras.main.getWorldPoint(screenX * ZOOM, screenY * ZOOM);
  }

  /** Applies a unit texture's scale and feet anchor; remembers its height for bars and effects. */
  private placeUnit<T extends Phaser.GameObjects.Image | Phaser.GameObjects.Sprite>(obj: T, key: string, extraScale = 1): T {
    const m = unitMeta(this, key);
    if (obj.texture.key !== key) obj.setTexture(key, 0);
    obj.setOrigin(0.5, m.originY).setScale(m.scale * extraScale);
    obj.setData('h', m.height * extraScale);
    obj.setData('baked', m.baked);
    return obj;
  }

  /** Keeps the map inside the view: centred when it fits, scrollable when it does not (all in world units). */
  private clampScroll(sx: number, sy: number): [number, number] {
    const z = this.mapZoom;
    const mapW = this.battle.grid.width * TILE;
    const mapH = this.battle.grid.height * TILE;
    const viewW = (VIEW_RIGHT - VIEW_LEFT) / z;
    const viewH = (PANEL_Y - 4 - VIEW_TOP) / z;
    const x = mapW <= viewW ? -(GAME_W / z - mapW) / 2 : Phaser.Math.Clamp(sx, -VIEW_LEFT / z, mapW - VIEW_RIGHT / z);
    const y = mapH <= viewH ? -VIEW_TOP / z : Phaser.Math.Clamp(sy, -VIEW_TOP / z, mapH - (PANEL_Y - 4) / z);
    const step = 1 / (ZOOM * z);
    return [Math.round(x / step) * step, Math.round(y / step) * step];
  }

  /** Sets the map zoom keeping the world point under (screenX, screenY) where it is. */
  private zoomAround(zoom: number, screenX: number, screenY: number, anchor?: { x: number; y: number }): void {
    const z = Phaser.Math.Clamp(zoom, MAP_ZOOM_MIN, MAP_ZOOM_MAX);
    const a = anchor ?? this.toWorld(screenX, screenY);
    this.mapZoom = z;
    const cam = this.cameras.main.setZoom(ZOOM * z);
    const [x, y] = this.clampScroll(a.x - screenX / z, a.y - screenY / z);
    cam.setScroll(x, y);
    writeSave((s) => (s.mapZoom = Math.round(z * 100) / 100));
  }

  /** Two fingers on the map zoom it. Returns true while a pinch is in progress. */
  private updatePinch(): boolean {
    const a = this.input.pointer1;
    const b = this.input.pointer2;
    if (!a?.isDown || !b?.isDown || this.state.kind === 'drag' || this.state.kind === 'direction') {
      if (this.pinch && !(a?.isDown && b?.isDown)) this.pinch = null;
      return !!this.pinch;
    }
    const dist = Math.max(10, Math.hypot(a.x - b.x, a.y - b.y));
    const mx = (a.x + b.x) / 2 / ZOOM;
    const my = (a.y + b.y) / 2 / ZOOM;
    if (!this.pinch) {
      const w = this.toWorld(mx, my);
      this.pinch = { dist, zoom: this.mapZoom, anchorX: w.x, anchorY: w.y };
      this.pan = null;
    }
    this.zoomAround(this.pinch.zoom * (dist / this.pinch.dist), mx, my, { x: this.pinch.anchorX, y: this.pinch.anchorY });
    return true;
  }

  /** While dragging a card near the screen edge, scroll the map so far tiles can be reached. */
  private autoScroll(): void {
    if (this.state.kind !== 'drag' || !this.state.moved) return;
    const p = logical(this.input.activePointer);
    const margin = 28;
    let dx = 0;
    let dy = 0;
    if (p.x < margin) dx = -6;
    else if (p.x > GAME_W - margin) dx = 6;
    if (p.y < VIEW_TOP + margin && p.y > VIEW_TOP - 10) dy = -6;
    else if (p.y > PANEL_Y - margin && p.y < DECK_Y) dy = 6;
    if (!dx && !dy) return;
    const cam = this.cameras.main;
    const [x, y] = this.clampScroll(cam.scrollX + dx / this.mapZoom, cam.scrollY + dy / this.mapZoom);
    cam.setScroll(x, y);
    this.onMove(p);
  }

  private drawMap(): void {
    const grid = this.battle.grid;
    const key = `map_${this.level.id}`;
    this.map3d = this.textures.exists(key);
    if (this.map3d) {
      const tex = this.textures.get(key);
      tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
      this.cameras.main.setBackgroundColor(0x0b0c10);
      // Big image: free it when the battle ends instead of keeping one per stage played.
      this.events.once('shutdown', () => this.textures.remove(key));
      this.add.image(-MAP3D.marginLeft * TILE, -MAP3D.marginTop * TILE, key).setOrigin(0, 0).setScale(TILE / MAP3D.ppu).setDepth(0);
      return;
    }
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const key = tileTextureKey(this, TILE_TEXTURE[grid.kind(x, y)], this.level.biome);
        this.add.image(x * TILE, y * TILE, key).setOrigin(0, 0).setDepth(0);
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

  private onDown(p: Pt): void {
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
    // On the map: a drag pans, a tap selects (decided on release).
    const cam = this.cameras.main;
    this.pan = { x: p.x, y: p.y, scrollX: cam.scrollX, scrollY: cam.scrollY, moved: false };
  }

  /** A tap on the map (not a pan): deploy target, operator or enemy selection. */
  private onMapTap(p: Pt): void {
    const s = this.state;
    const target = s.kind === 'card' && !this.locked ? this.deployTarget(p, s.op) : null;
    if (s.kind === 'card' && target) {
      this.enterDirection(s.op, target[0], target[1]);
      return;
    }
    const tile = this.tileAt(p.x, p.y);
    const op = tile ? this.battle.operatorAt(tile[0], tile[1]) : undefined;
    if (op) {
      this.state = { kind: 'selected', op: op.def.id };
      return;
    }
    const w = this.toWorld(p.x, p.y);
    let best: { uid: number; d: number } | null = null;
    for (const [uid, v] of this.enemyViews) {
      const h = (v.sprite.getData('h') as number) ?? 24;
      const d = Math.hypot(v.sprite.x - w.x, v.sprite.y - h / 2 - w.y);
      if (d <= Math.max(16, h / 2) && (!best || d < best.d)) best = { uid, d };
    }
    this.state = best ? { kind: 'enemy', uid: best.uid } : { kind: 'idle' };
  }

  private onMove(p: Pt): void {
    const s = this.state;
    if (this.pan && p.isDown) {
      if (!this.pan.moved && Math.hypot(p.x - this.pan.x, p.y - this.pan.y) > 6) this.pan.moved = true;
      if (this.pan.moved) {
        const z = this.mapZoom;
        const [x, y] = this.clampScroll(this.pan.scrollX - (p.x - this.pan.x) / z, this.pan.scrollY - (p.y - this.pan.y) / z);
        this.cameras.main.setScroll(x, y);
      }
      return;
    }
    if (s.kind === 'drag') {
      if (!s.moved && Math.hypot(p.x - s.startX, p.y - s.startY) > 6) s.moved = true;
      if (s.moved && !this.locked && this.battle.canDeployOperator(s.op)) {
        const tile = this.deployTarget(p, s.op);
        this.dragTarget = tile;
        this.placeUnit(this.ghost, `op_${s.op}`).setVisible(true);
        if (tile) {
          const [cx, cy] = this.tileCenter(tile[0], tile[1]);
          this.ghost.setPosition(cx, cy + FEET);
        } else {
          const w = this.toWorld(p.x, p.y);
          this.ghost.setPosition(w.x, w.y + 8);
        }
      }
    } else if (s.kind === 'direction' && s.gesture && p.isDown) {
      const [cx, cy] = this.tileCenter(s.x, s.y);
      const w = this.toWorld(p.x, p.y);
      if (Math.hypot(w.x - cx, w.y - cy) > 10) s.dir = vectorToDir(w.x - cx, w.y - cy);
    }
  }

  private onUp(p: Pt): void {
    const s = this.state;
    if (this.pan) {
      const tapped = !this.pan.moved;
      this.pan = null;
      if (tapped) this.onMapTap(p);
      return;
    }
    if (s.kind === 'drag') {
      this.ghost.setVisible(false);
      if (!s.moved) {
        this.state = { kind: 'card', op: s.op };
        return;
      }
      const tile = this.locked ? null : this.deployTarget(p, s.op);
      this.dragTarget = null;
      if (tile) this.enterDirection(s.op, tile[0], tile[1]);
      else this.state = { kind: 'idle' };
      return;
    }
    if (s.kind === 'direction') {
      if (!s.gesture) return;
      s.gesture = false;
      const [cx, cy] = this.tileCenter(s.x, s.y);
      const w = this.toWorld(p.x, p.y);
      const fromCenter = Math.hypot(w.x - cx, w.y - cy);
      const swiped = Math.hypot(p.x - s.downX, p.y - s.downY) > 8;
      if (swiped && fromCenter > 14) {
        this.confirmDeploy(vectorToDir(w.x - cx, w.y - cy));
        return;
      }
      const arrow = this.arrows.find((a) => Math.hypot(w.x - a.img.x, w.y - a.img.y) <= 14);
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

  /** Runs `build` and pins every object it adds to the screen, so the camera scroll does not move it. */
  private pinned(build: () => void): void {
    const before = new Set(this.children.list);
    build();
    for (const o of this.children.list) if (!before.has(o)) ui(o);
  }

  /** Red marks on the screen edge pointing at enemies outside the view. */
  private drawEdgeMarkers(): void {
    const g = this.edgeGfx.clear();
    const cam = this.cameras.main;
    const top = VIEW_TOP + 4;
    const bottom = PANEL_Y - 8;
    for (const v of this.enemyViews.values()) {
      const sx = (v.sprite.x - cam.scrollX) * this.mapZoom;
      const sy = (v.sprite.y - ((v.sprite.getData('h') as number) ?? 24) / 2 - cam.scrollY) * this.mapZoom;
      if (sx >= 0 && sx <= GAME_W && sy >= top && sy <= bottom) continue;
      const x = Phaser.Math.Clamp(sx, 6, GAME_W - 6);
      const y = Phaser.Math.Clamp(sy, top, bottom);
      g.fillStyle(0x000000, 0.8).fillRect(x - 3, y - 3, 6, 6);
      g.fillStyle(COLORS.redLight, 1).fillRect(x - 2, y - 2, 4, 4);
    }
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
      const sprite = this.placeUnit(this.add.image(CARD_W / 2, CARD_H - 6, `op_${op}`), `op_${op}`);
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
    if (s.kind === 'enemy') {
      this.updateEnemyPanel(s.uid);
      return;
    }
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
    setText(tx[0].setPosition(x, y), `${def.name} ${t('level.short')}${this.level.opLevels?.[def.id] ?? 1}  ${t(`class.${def.cls}` as StringKey)}  [${def.tags.map((tag) => t(`tag.${tag}` as StringKey)).join(', ')}]`);
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
    tx[4].setPosition(x, PANEL_Y + PANEL_H - 14).setWordWrapWidth(w - 16, true);
    setText(tx[4], info);
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

  private updateEnemyPanel(uid: number): void {
    const e = this.battle.enemies.find((en) => en.uid === uid);
    const tx = this.panelTexts;
    this.panelGfx.clear();
    this.skillBtn.setVisible(false);
    this.retreatBtn.setVisible(false);
    if (!e) {
      this.state = { kind: 'idle' };
      for (const txt of tx) txt.setVisible(false);
      return;
    }
    for (const txt of tx) txt.setVisible(true);
    const def = e.def;
    const deckLeft = Math.min(DECK_RIGHT, ...this.cards.filter((c) => c.container.visible).map((c) => c.x));
    const w = Math.max(200, deckLeft - PANEL_X - 8);
    panel(this.panelGfx, PANEL_X, PANEL_Y, w, PANEL_H, COLORS.panel, COLORS.regime);
    const x = PANEL_X + 8;
    const y = PANEL_Y + 7;
    const tagNames = (tags: readonly string[] | undefined) => (tags ?? []).map((tag) => t(`tag.${tag}` as StringKey)).join(', ');
    setText(tx[0].setPosition(x, y), `${t(`enemy.${def.id}` as StringKey)}${def.boss ? '  BOSS' : ''}`);
    tx[0].setColor(CSS.regime);
    setText(tx[1].setPosition(x, y + 14), `HP ${Math.max(0, Math.ceil(e.hp))}/${e.maxHp}  ATK ${def.atk}  DEF ${def.def}`);
    tx[1].setColor(CSS.dim);
    const ideal = idealOperators(def, this.level.squad).map((o) => o.name).join(', ');
    const weak = def.weak?.length ? `${t('info.weak')}: ${tagNames(def.weak)}` : '';
    setText(tx[2].setPosition(x, y + 30), [weak, ideal ? t('info.ideal', { ops: ideal }) : ''].filter(Boolean).join('  '));
    tx[2].setColor(CSS.gold).setWordWrapWidth(w - 16, true);
    setText(tx[3].setPosition(x, y + 52), def.resist?.length ? `${t('info.resist')}: ${tagNames(def.resist)}` : '');
    tx[3].setColor(CSS.red).setWordWrapWidth(w - 16, true);
    tx[4].setPosition(x, y + 66).setWordWrapWidth(w - 16, true);
    setText(tx[4], t(`trait.${def.id}` as StringKey));
    tx[4].setColor(CSS.text);
  }

  // ---------------------------------------------------------------------------
  // Units and effects

  private opSprite(unit: OperatorUnit): Phaser.GameObjects.Sprite {
    let s = this.opViews.get(unit.uid);
    if (!s) {
      const [cx, cy] = this.tileCenter(unit.x, unit.y);
      const key = `op_${unit.def.id}`;
      s = this.placeUnit(this.add.sprite(cx, cy + FEET, key), key).setDepth(10 + cy);
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
      const sprite = this.placeUnit(this.add.sprite(0, 0, key), key, e.def.boss ? 1.25 : 1);
      playAnim(sprite, key, 'move');
      const shadow = e.def.flying && !sprite.getData('baked') ? this.add.image(0, 0, 'fx_shadow').setDepth(6) : null;
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
      const px = Math.round(e.x * TILE + TILE / 2);
      const ground = Math.round(e.y * TILE + TILE / 2 + FEET);
      const lift = e.def.flying && !v.sprite.getData('baked') ? 12 : 0;
      v.sprite.setPosition(px, ground - lift).setDepth(10 + ground);
      // Stand still (no walking cycle) while blocked; resume when free.
      const walking = v.sprite.anims.currentAnim?.key.endsWith(':move');
      if (walking && e.blockedBy !== null && v.sprite.anims.isPlaying) v.sprite.anims.pause();
      else if (walking && e.blockedBy === null && v.sprite.anims.isPaused) v.sprite.anims.resume();
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
      this.burst(v.sprite.x, v.sprite.y - ((v.sprite.getData('h') as number) ?? 24) / 2, 0xffffff, 6);
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
          audio.play(op.def.splash > 0 ? 'blast' : op.def.placement === 'high' ? 'shot' : op.def.tags.includes('impact') ? 'impact' : 'blade', 0.8);
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
          audio.play('heal', 0.7);
          break;
        }
        case 'enemyAttack': {
          const ev2 = this.battle.enemies.find((e) => e.uid === ev.uid);
          const es = this.enemyViews.get(ev.uid)?.sprite;
          const os = this.opViews.get(ev.target);
          if (!es || !os || !ev2) break;
          playAnim(es, es.texture.key, 'attack');
          if (ev.ranged) audio.play('enemyShot');
          if (ev.ranged) this.tracer(es.x, es.y - 16, os.x, os.y - 14, COLORS.regime);
          else this.lunge(es, os.x - es.x, os.y - es.y);
          break;
        }
        case 'enemyHit': {
          const s = this.enemyViews.get(ev.uid)?.sprite;
          if (s) flash(this, s, ev.effect === 'weak' ? 0xffd84a : ev.effect === 'resist' ? 0x6a6d75 : 0xffffff);
          if (s && ev.effect === 'weak') this.burst(s.x, s.y - 14, 0xffd84a, 4);
          break;
        }
        case 'dodge': {
          const s = this.enemyViews.get(ev.uid)?.sprite;
          if (s) this.popup(s.x, s.y - 36, t('info.dodge'), CSS.dim);
          break;
        }
        case 'enemyHeal': {
          const s = this.enemyViews.get(ev.target)?.sprite;
          if (s) this.healFx(s.x, s.y - 16, 0x7fe0ff);
          break;
        }
        case 'burn': {
          const s = this.opViews.get(ev.uid);
          if (s) this.burst(s.x, s.y - 14, 0xff6a1a, 6);
          break;
        }
        case 'opHit': {
          const s = this.opViews.get(ev.uid);
          if (s) flash(this, s, 0xff5050);
          break;
        }
        case 'leak': {
          this.leakedUids.add(ev.uid);
          audio.play('leak');
          this.cameras.main.shake(120, 0.004);
          this.cameras.main.flash(120, 120, 20, 20);
          break;
        }
        case 'skill': {
          const s = this.opViews.get(ev.uid);
          if (!s) break;
          audio.play('skill');
          const name = t(`skill.${this.battle.rosterEntry(ev.op)!.def.skill.id}.name` as StringKey);
          const label = text(this, s.x, s.y - 40, name, { align: 'center', color: CSS.gold }).setDepth(3000);
          this.tweens.add({ targets: label, y: label.y - 12, alpha: 0, duration: 900, delay: 300, onComplete: () => label.destroy() });
          this.burst(s.x, s.y - 14, COLORS.red, 10);
          break;
        }
        case 'deploy':
          audio.play('deploy');
          break;
        case 'enemyDied':
          audio.play('kill', 0.7);
          break;
        case 'opDied': {
          audio.play('opDown');
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

  private popup(x: number, y: number, label: string, color: string): void {
    const txt = text(this, x, y, label, { align: 'center', color }).setDepth(3000);
    this.tweens.add({ targets: txt, y: y - 10, alpha: 0, duration: 500, onComplete: () => txt.destroy() });
  }

  private healFx(x: number, y: number, tint?: number): void {
    for (let i = 0; i < 3; i++) {
      const img = this.add.image(x + (i - 1) * 6, y + i * 2, 'fx_heal').setDepth(1100);
      if (tint) img.setTint(tint);
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
          const px = x * TILE;
          const py = y * TILE - this.lift(x, y);
          g.fillStyle(COLORS.red, 0.28).fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
          g.lineStyle(1, COLORS.redLight, 0.9).strokeRect(px + 1.5, py + 1.5, TILE - 3, TILE - 3);
        }
      }
      // The tile the operator will land on if released now.
      const tgt = s.kind === 'drag' ? this.dragTarget : null;
      if (tgt) {
        const px = tgt[0] * TILE;
        const py = tgt[1] * TILE - this.lift(tgt[0], tgt[1]);
        g.fillStyle(0xffffff, 0.25).fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
        g.lineStyle(2, 0xffffff, 1).strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
      }
    }

    if (s.kind === 'direction') {
      const def = this.battle.rosterEntry(s.op)!.def;
      this.drawRange(g, rangeTiles(def.range, s.x, s.y, s.dir), 0xffffff);
      const [cx, cy] = this.tileCenter(s.x, s.y);
      this.placeUnit(this.ghost, `op_${s.op}`).setPosition(cx, cy + FEET).setFlipX(s.dir === 'left').setVisible(true);
      for (const a of this.arrows) {
        const [vx, vy] = DIR_VEC[a.dir];
        // Taller units: keep the up arrow clear of the head.
        const reach = a.dir === 'up' ? 50 : a.dir === 'down' ? 30 : 32;
        a.img.setPosition(cx + vx * reach, cy + vy * reach).setVisible(true);
        a.img.setTint(a.dir === s.dir ? COLORS.redLight : 0xffffff).setAlpha(a.dir === s.dir ? 1 : 0.6);
      }
      this.cancelMark.setPosition(cx + 30, cy - 40).setVisible(true);
      this.hint.setVisible(true);
    } else if (s.kind !== 'drag') {
      this.ghost.setVisible(false).setFlipX(false);
    }

    if (s.kind === 'enemy') {
      const v = this.enemyViews.get(s.uid);
      if (v) {
        const h = (v.sprite.getData('h') as number) ?? v.sprite.displayHeight;
        g.lineStyle(1, COLORS.regime, 1).strokeRect(Math.round(v.sprite.x - 14) + 0.5, Math.round(v.sprite.y - h - 2) + 0.5, 28, h + 4);
      }
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
      const px = x * TILE;
      const py = y * TILE - this.lift(x, y);
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
      if (op.burn) {
        const f = Math.floor(this.time.now / 100) % 2;
        g.fillStyle(0xff6a1a, 1).fillRect(s.x - 6, s.y - 34 - f, 3, 3).fillRect(s.x + 3, s.y - 33 + f, 3, 3);
        g.fillStyle(0xffd04a, 1).fillRect(s.x - 1, s.y - 36 + f, 2, 3);
      }
      const skill = op.def.skill;
      if (op.skillActive) {
        g.fillStyle(COLORS.redLight, 1).fillRect(x, y + 3, Math.round(24 * op.skillTime / skill.duration), 1);
        const h = (s.getData('h') as number) ?? 32;
        g.lineStyle(1, COLORS.redLight, 0.4 + 0.6 * pulse).strokeRect(s.x - 15.5, s.y - h - 1.5, 31, h + 3);
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
      const top = Math.round(v.sprite.y - ((v.sprite.getData('h') as number) ?? v.sprite.displayHeight) - 3);
      const x = Math.round(v.sprite.x - w / 2);
      g.fillStyle(0x000000, 1).fillRect(x - 1, top - 1, w + 2, 4);
      g.fillStyle(COLORS.hpEnemy, 1).fillRect(x, top, Math.round(w * Math.max(0, e.hp) / e.maxHp), 2);
    }
  }

  // ---------------------------------------------------------------------------
  // Pause and result

  private openPause(): void {
    if (this.resultShown || this.menuPaused) return;
    this.pinned(() => this.buildPause());
  }

  private buildPause(): void {
    this.menuPaused = true;
    const g = this.add.graphics().setDepth(5000);
    g.fillStyle(0x000000, 0.7).fillRect(0, 0, GAME_W, GAME_H);
    const title = text(this, GAME_W / 2, 100, t('pause.title'), { size: 16, align: 'center' }).setDepth(5001);
    const bx = GAME_W / 2 - 70;
    const resume = new Button(this, bx, 140, 140, 24, t('pause.resume'), () => this.closePause(), 'accent').setDepth(5001);
    const restart = new Button(this, bx, 172, 140, 24, t('pause.restart'), () => this.scene.restart({ levelId: this.level.id, mode: this.initialMode() })).setDepth(5001);
    const quit = new Button(this, bx, 204, 140, 24, t('pause.quit'), () => this.scene.start('Menu')).setDepth(5001);
    const sound = soundButtons(this, GAME_W / 2 - 110, 244, 220, soundLabels(), saveSound).map((btn) => btn.setDepth(5001));
    this.pauseLayer = [g, title, resume, restart, quit, ...sound];
  }

  private closePause(): void {
    for (const o of this.pauseLayer) o.destroy();
    this.pauseLayer = [];
    this.menuPaused = false;
  }

  private initialMode(): BattleMode {
    return this.scene.settings.data ? (this.scene.settings.data as BattleSceneData).mode : 'manual';
  }

  // ---------------------------------------------------------------------------
  // First-stage tutorial: a banner with one instruction at a time. The battle waits for the
  // first deployment, so a new player is never rushed.

  private static readonly TUT_KEYS: StringKey[] = ['tut.drag', 'tut.dir', 'tut.ranged', 'tut.select', 'tut.done'];

  private showTutorial(): void {
    for (const o of this.tutObjs) o.destroy();
    this.tutObjs = [];
    if (this.tutorial < 0) return;
    this.pinned(() => {
      const w = Math.min(GAME_W - 120, 440);
      const x = Math.round((GAME_W - w) / 2);
      const y = VIEW_TOP + 18;
      const msg = text(this, x + 10, y + 8, t(BattleScene.TUT_KEYS[this.tutorial]), { wrap: w - 90, color: CSS.text }).setDepth(2501);
      const h = Math.max(30, msg.height + 16);
      const g = this.add.graphics().setDepth(2500);
      panel(g, x, y, w, h, 0x1d1a12, COLORS.sp);
      g.fillStyle(COLORS.sp, 1).fillRect(x + 1, y + 1, 3, h - 2);
      const skip = new Button(this, x + w - 70, y + Math.round(h / 2) - 9, 62, 18, t('tut.skip'), () => this.endTutorial()).setDepth(2501);
      this.tutObjs.push(g, msg, skip);
      if (this.tutorial === 0) {
        // Bouncing arrow over the deck.
        const arrow = this.add.image(0, DECK_Y - 18, 'ui_arrow').setScale(3).setAngle(90).setTint(COLORS.sp).setDepth(2501).setName('tutArrow');
        this.tweens.add({ targets: arrow, y: arrow.y + 6, duration: 400, yoyo: true, repeat: -1 });
        this.tutObjs.push(arrow);
      }
    });
  }

  private updateTutorial(): void {
    if (this.tutorial < 0) return;
    // Keep the arrow over the cheapest card (the leftmost one; the DP panel covers the right side).
    const arrow = this.tutObjs.find((o) => o.name === 'tutArrow') as Phaser.GameObjects.Image | undefined;
    const first = this.cards.filter((c) => c.container.visible).sort((a, b) => a.x - b.x)[0];
    if (arrow && first) arrow.setX(first.x + CARD_W / 2);
    const s = this.state;
    const deployed = this.battle.deployedCount;
    let next = this.tutorial;
    if (this.tutorial === 0 && s.kind === 'direction') next = 1;
    else if (this.tutorial === 1 && deployed >= 1) next = 2;
    else if (this.tutorial === 1 && s.kind !== 'direction' && deployed === 0) next = 0;
    else if (this.tutorial === 2 && deployed >= 2) next = 3;
    else if (this.tutorial === 3 && s.kind === 'selected') next = 4;
    if (next === this.tutorial) return;
    this.tutorial = next;
    this.showTutorial();
    if (next === 4) this.time.delayedCall(4000, () => this.tutorial === 4 && this.endTutorial());
  }

  private endTutorial(): void {
    this.tutorial = -1;
    for (const o of this.tutObjs) o.destroy();
    this.tutObjs = [];
    writeSave((s) => (s.tutorialDone = true));
  }

  private showResult(): void {
    this.pinned(() => this.buildResult());
  }

  private buildResult(): void {
    const b = this.battle;
    const won = b.result === 'won';
    const stars = b.stars();
    let replaySaved = false;
    audio.music(null);
    audio.play(won ? 'win' : 'lose');
    if (this.tutorial >= 0) this.endTutorial();
    let xpGain = 0;
    const levelUps: string[] = [];
    if (won) {
      const data = this.recorder.toData(this.level);
      writeSave((s) => {
        const prev = s.levels[this.level.id];
        xpGain = stageXp(this.level, stars, !prev?.cleared);
        s.levels[this.level.id] = { cleared: true, stars: Math.max(prev?.stars ?? 0, stars) };
        const old = s.replays[this.level.id];
        if (!old || old.dataVersion !== data.dataVersion || stars >= old.stars) {
          s.replays[this.level.id] = { ...data, stars };
          replaySaved = true;
        }
        // Experience for every operator that took part (the whole squad).
        s.ops ??= {};
        for (const id of this.level.squad) {
          const next = addXp(operatorProgress(s.ops, id), xpGain);
          s.ops[id] = { level: next.level, xp: next.xp };
          if (next.gained > 0) levelUps.push(`${OPERATORS[id]?.name ?? id} ${t('level.short')} ${next.level}`);
        }
      });
    }

    const g = this.add.graphics().setDepth(5000);
    g.fillStyle(0x000000, 0.75).fillRect(0, 0, GAME_W, GAME_H);
    g.fillStyle(won ? COLORS.red : 0x3a3d44, 1).fillRect(0, 78, GAME_W, 2).fillRect(0, 272, GAME_W, 2);
    text(this, GAME_W / 2, 94, won ? t('result.won') : t('result.lost'), { size: 16, align: 'center', color: won ? CSS.text : CSS.dim }).setDepth(5001);
    for (let i = 0; i < 3; i++) {
      this.add.image(GAME_W / 2 - 26 + i * 26, 132, i < stars ? 'ui_star' : 'ui_star_empty').setScale(2).setDepth(5001);
    }
    text(this, GAME_W / 2, 150, t('result.stats', { k: b.killed, t: b.totalEnemies, l: b.lives }), { align: 'center', color: CSS.dim }).setDepth(5001);
    const notes: [string, string][] = [];
    if (xpGain > 0) notes.push([t('result.xp', { xp: xpGain }), CSS.gold]);
    if (levelUps.length) notes.push([`${t('result.levelUp')} ${levelUps.join('  ')}`, CSS.green]);
    if (replaySaved) notes.push([t('result.replaySaved'), CSS.dim]);
    const index = LEVELS.findIndex((l) => l.id === this.level.id);
    const after = won ? LEVELS[index + 1] : undefined;
    const next = after && isUnlocked(after.id, loadSave().levels) ? after : undefined;
    if (after && !next) notes.push([t('stage.locked', { l: levelLabel(this.level) }), CSS.gold]);
    if (!won) notes.push([t('result.tip'), CSS.dim]);
    let ny = 166;
    for (const [msg, color] of notes) {
      const tx = text(this, GAME_W / 2, ny, msg, { align: 'center', color, wrap: GAME_W - 80 }).setDepth(5001);
      ny += tx.height + 4;
    }
    const buttons: [string, () => void][] = [[t('result.retry'), () => this.scene.restart({ levelId: this.level.id, mode: this.initialMode() })]];
    if (next) buttons.push([t('result.next'), () => this.scene.restart({ levelId: next.id, mode: 'manual' })]);
    buttons.push([t('result.menu'), () => this.scene.start('Menu')]);
    const bw = 120;
    const gap = 8;
    let bx = GAME_W / 2 - (buttons.length * bw + (buttons.length - 1) * gap) / 2;
    buttons.forEach(([label, onClick], i) => {
      const accent = next ? i === 1 : i === 0;
      new Button(this, bx, Math.max(236, ny + 6), bw, 24, label, onClick, accent ? 'accent' : 'normal').setDepth(5001);
      bx += bw + gap;
    });
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
  if (anim === 'attack') {
    const back = s.scene.anims.exists(`${texture}:idle`) ? 'idle' : 'move';
    s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => playAnim(s, texture, back));
  }
}

/** Pins a game object to the screen so the camera scroll does not move it. */
function ui<T extends Phaser.GameObjects.GameObject>(o: T): T {
  if (o instanceof Phaser.GameObjects.Container) o.setScrollFactor(0, 0, true);
  else (o as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor(0);
  // Drawn only by the fixed HUD camera, so map zoom never scales the interface.
  const cams = o.scene.cameras;
  const hud = cams.getCamera('ui');
  const show = (obj: Phaser.GameObjects.GameObject) => {
    if (hud) obj.cameraFilter &= ~hud.id;
    obj.cameraFilter |= cams.main.id;
    if (obj instanceof Phaser.GameObjects.Container) obj.list.forEach(show);
  };
  show(o);
  return o;
}
