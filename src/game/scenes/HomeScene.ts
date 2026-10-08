import Phaser from 'phaser';
import { COLORS, CSS, GAME_H, GAME_W, ZOOM } from '../../config';
import { LEVELS, levelLabel } from '../../data/levels';
import { OPERATORS } from '../../data/operators';
import { getLang, LANGS, setLang, t, type StringKey } from '../../i18n';
import { loadPortrait, PORTRAIT, unitMeta } from '../art';
import { isUnlocked, playerSquad, totalStars } from '../progress';
import { loadSave, session, writeSave } from '../save';
import { Button, slantPanel, tapZone, text } from '../ui/widgets';

/** Main menu: a clean title screen with the squad leader in 3D and two big entries. */
export class HomeScene extends Phaser.Scene {
  private featured = 0;
  private hero!: Phaser.GameObjects.Sprite;
  private heroName!: Phaser.GameObjects.Text;
  private heroClass!: Phaser.GameObjects.Text;

  constructor() {
    super('Home');
  }

  preload(): void {
    if (!this.textures.exists('home_bg')) this.load.image('home_bg', 'assets/maps/l21.jpg');
  }

  create(): void {
    this.cameras.main.setOrigin(0, 0).setZoom(ZOOM).setBackgroundColor(COLORS.bg);
    const save = loadSave();
    const squad = playerSquad(save.squad);

    // Background: a slowly drifting 3D map, darkened, with a light band behind the menu.
    if (this.textures.exists('home_bg')) {
      this.textures.get('home_bg').setFilter(Phaser.Textures.FilterMode.LINEAR);
      const bg = this.add.image(0, -20, 'home_bg').setOrigin(0, 0).setScale(0.5);
      const range = Math.max(0, bg.displayWidth - GAME_W);
      bg.x = -range * 0.2;
      this.tweens.add({ targets: bg, x: -range * 0.8, duration: 60000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    const shade = this.add.graphics();
    shade.fillStyle(0x07080b, 0.55).fillRect(0, 0, GAME_W, GAME_H);
    for (let i = 0; i < 24; i++) shade.fillStyle(0x07080b, 0.02 * i).fillRect(0, GAME_H - 120 + i * 5, GAME_W, 5);

    // Title.
    const g = this.add.graphics();
    g.fillStyle(COLORS.red, 1).fillRect(16, 16, 4, 34);
    text(this, 28, 16, t('game.title'), { size: 16 });
    text(this, 28, 40, t('game.subtitle'), { color: CSS.dim });

    // Featured operator (tap to cycle through the squad), like an assistant on the home screen.
    const heroX = Math.round(GAME_W * 0.27);
    g.fillStyle(COLORS.red, 0.18).fillEllipse(heroX, 318, 170, 26);
    this.hero = this.add.sprite(heroX, 322, `op_${squad[0]}`, 0);
    this.heroName = text(this, heroX, 330, '', { size: 8, align: 'center' });
    this.heroClass = text(this, heroX, 344, '', { color: CSS.dim, align: 'center' });
    text(this, heroX, 70, t('home.tapHint'), { color: CSS.dim, align: 'center' }).setAlpha(0.7);
    tapZone(this, heroX - 90, 80, 180, 250, () => this.feature(squad, this.featured + 1));
    this.feature(squad, 0);

    // Menu entries on the right.
    const mx = GAME_W - 268;
    const panelG = this.add.graphics();
    slantPanel(panelG, mx - 24, 0, GAME_W - mx + 24, GAME_H, 0x0b0c10, 0.72, 40);
    panelG.fillStyle(COLORS.red, 1).fillRect(mx - 24 + 40, 0, 2, GAME_H);

    const next = [...LEVELS].reverse().find((l) => isUnlocked(l.id, save.levels));
    const allDone = LEVELS.every((l) => (save.levels[l.id]?.stars ?? 0) >= 3);
    this.entry(mx, 92, 240, 84, t('home.combat'), allDone ? t('home.combatDone') : t('home.combatNext', { l: next ? levelLabel(next) : '1-1' }), true, () => {
      if (next) session.selectedLevel = next.id;
      this.scene.start('Menu');
    });
    this.entry(mx, 188, 240, 56, t('home.squad'), t('home.squadSub', { n: squad.length }), false, () => this.scene.start('Squad', {}));

    // Progress and language.
    this.add.image(mx + 8, 268, 'ui_star').setScale(2).setOrigin(0, 0.5);
    text(this, mx + 30, 264, `${totalStars(save.levels)}/${LEVELS.length * 3}`, { color: CSS.gold });
    new Button(this, GAME_W - 132, GAME_H - 30, 120, 20, t('menu.language'), () => {
      const lang = LANGS[(LANGS.indexOf(getLang()) + 1) % LANGS.length];
      setLang(lang);
      writeSave((s) => (s.lang = lang));
      this.scene.restart();
    });
  }

  private feature(squad: readonly string[], index: number): void {
    this.featured = ((index % squad.length) + squad.length) % squad.length;
    const id = squad[this.featured];
    const def = OPERATORS[id];
    this.heroName.setText(def.name);
    this.heroClass.setText(t(`class.${def.cls}` as StringKey));
    // Show the game sprite right away, then swap to the detailed portrait once it has loaded.
    const meta = unitMeta(this, `op_${id}`);
    this.hero.setTexture(`op_${id}`, 0).setOrigin(0.5, meta.originY).setScale(meta.scale * 2.4);
    if (this.anims.exists(`op_${id}:idle`)) this.hero.play(`op_${id}:idle`);
    loadPortrait(this, id, (key) => {
      if (!this.hero.active || squad[this.featured] !== id) return;
      this.hero.setTexture(key, 0).setOrigin(0.5, PORTRAIT.originY).setScale(240 / PORTRAIT.modelHeight);
      this.hero.play(`${key}:idle`);
    });
    this.hero.setAlpha(0);
    this.tweens.add({ targets: this.hero, alpha: 1, duration: 200 });
  }

  /** A large slanted menu tile with a title and a subtitle. */
  private entry(x: number, y: number, w: number, h: number, title: string, sub: string, accent: boolean, onTap: () => void): void {
    const g = this.add.graphics();
    const draw = (pressed: boolean) => {
      g.clear();
      slantPanel(g, x, y, w, h, 0x000000, 0.5, 14);
      slantPanel(g, x + (pressed ? 2 : 0), y + (pressed ? 2 : 0), w, h, accent ? COLORS.red : COLORS.panelLight, pressed ? 0.8 : 0.95, 14);
      g.fillStyle(0xffffff, 0.12).fillRect(x + 14, y + (pressed ? 2 : 0), w - 14, 2);
    };
    draw(false);
    text(this, x + 26, y + h / 2 - 14, title, { size: accent ? 16 : 12 });
    text(this, x + 26, y + h / 2 + 8, sub, { color: accent ? '#ffd9da' : CSS.dim });
    const zone = tapZone(this, x, y, w, h, onTap);
    zone.on('pointerdown', () => draw(true));
    zone.on('pointerup', () => draw(false));
    zone.on('pointerout', () => draw(false));
  }
}
