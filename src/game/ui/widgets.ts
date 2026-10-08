import Phaser from 'phaser';
import { COLORS, CSS, FONT, ZOOM } from '../../config';

export function text(
  scene: Phaser.Scene,
  x: number,
  y: number,
  str: string,
  opts: { size?: number; color?: string; align?: 'left' | 'center' | 'right'; wrap?: number } = {},
): Phaser.GameObjects.Text {
  const t = scene.add.text(x, y, str, {
    fontFamily: FONT,
    fontSize: `${opts.size ?? 8}px`,
    color: opts.color ?? CSS.text,
    align: opts.align ?? 'left',
    lineSpacing: 4,
    wordWrap: opts.wrap ? { width: opts.wrap, useAdvancedWrap: true } : undefined,
  });
  // Rasterise text at the zoomed resolution so it stays sharp.
  t.setResolution(ZOOM);
  if (opts.align === 'center') t.setOrigin(0.5, 0);
  if (opts.align === 'right') t.setOrigin(1, 0);
  return t;
}

/** Draws a pixel-style panel: dark fill with a 1px border and a lighter top edge. */
export function panel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fill: number = COLORS.panel, border: number = COLORS.border): void {
  g.fillStyle(border, 1).fillRect(x, y, w, h);
  g.fillStyle(fill, 1).fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle(0xffffff, 0.06).fillRect(x + 1, y + 1, w - 2, 1);
}

export type ButtonStyle = 'normal' | 'accent' | 'toggled';

/** A rectangular pixel button. Interaction is handled by the button itself. */
export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private enabled = true;
  private style: ButtonStyle;
  private pressed = false;
  readonly w: number;
  readonly h: number;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, onClick: () => void, style: ButtonStyle = 'normal') {
    super(scene, x, y);
    this.w = w;
    this.h = h;
    this.style = style;
    this.bg = scene.add.graphics();
    this.label = text(scene, Math.round(w / 2), Math.round(h / 2) - 4, label, { align: 'center' });
    this.add([this.bg, this.label]);
    this.setSize(w, h);
    // Containers hit-test around their origin; use an explicit top-left rectangle.
    this.setInteractive(new Phaser.Geom.Rectangle(w / 2, h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    this.on('pointerdown', () => {
      if (!this.enabled) return;
      this.pressed = true;
      this.redraw();
    });
    this.on('pointerout', () => {
      this.pressed = false;
      this.redraw();
    });
    this.on('pointerup', () => {
      if (!this.enabled || !this.pressed) return;
      this.pressed = false;
      this.redraw();
      onClick();
    });
    this.redraw();
    scene.add.existing(this);
  }

  override setVisible(value: boolean): this {
    super.setVisible(value);
    // Hidden buttons must not swallow taps meant for the map.
    if (this.input) this.input.enabled = value;
    return this;
  }

  setLabel(label: string): this {
    if (this.label.text !== label) this.label.setText(label);
    return this;
  }

  setEnabled(enabled: boolean): this {
    if (this.enabled !== enabled) {
      this.enabled = enabled;
      this.redraw();
    }
    return this;
  }

  setStyle(style: ButtonStyle): this {
    if (this.style !== style) {
      this.style = style;
      this.redraw();
    }
    return this;
  }

  private redraw(): void {
    const g = this.bg.clear();
    const fill = !this.enabled ? 0x202126 : this.style === 'accent' ? COLORS.red : this.style === 'toggled' ? 0x3a4a5e : COLORS.panelLight;
    const border = !this.enabled ? 0x34363d : this.style === 'accent' ? COLORS.redLight : this.style === 'toggled' ? COLORS.regime : COLORS.border;
    g.fillStyle(0x000000, 1).fillRect(0, this.pressed ? 0 : 2, this.w, this.h);
    const oy = this.pressed ? 1 : 0;
    g.fillStyle(border, 1).fillRect(0, oy, this.w, this.h);
    g.fillStyle(fill, 1).fillRect(1, oy + 1, this.w - 2, this.h - 2);
    g.fillStyle(0xffffff, 0.12).fillRect(1, oy + 1, this.w - 2, 1);
    this.label.setY(Math.round(this.h / 2) - 4 + oy);
    this.label.setColor(this.enabled ? CSS.text : '#5a5d66');
  }
}

/** An invisible tap area (top-left anchored) that calls back on a clean tap. */
export function tapZone(scene: Phaser.Scene, x: number, y: number, w: number, h: number, onTap: () => void): Phaser.GameObjects.Zone {
  const zone = scene.add.zone(x, y, w, h).setOrigin(0, 0).setInteractive();
  let down = false;
  zone.on('pointerdown', () => (down = true));
  zone.on('pointerout', () => (down = false));
  zone.on('pointerup', () => {
    if (down) onTap();
    down = false;
  });
  return zone;
}

/** Slanted menu panel in the style of the main menu tiles (left edge leans right). */
export function slantPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fill: number, alpha = 1, slant = 10): void {
  g.fillStyle(fill, alpha).fillPoints(
    [new Phaser.Math.Vector2(x + slant, y), new Phaser.Math.Vector2(x + w, y), new Phaser.Math.Vector2(x + w, y + h), new Phaser.Math.Vector2(x, y + h)],
    true,
  );
}

/** Small padlock drawn with graphics, centred at (x, y). */
export function lockIcon(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number = COLORS.textDim): void {
  g.lineStyle(2, color, 1).beginPath().arc(x, y - 3, 4, Math.PI, 0).strokePath();
  g.fillStyle(color, 1).fillRect(x - 6, y - 2, 12, 9);
  g.fillStyle(COLORS.bg, 1).fillRect(x - 1, y + 1, 2, 3);
}
