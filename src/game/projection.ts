import { TILE } from '../config';
import views from '../data/mapViews.json';

/**
 * Camera of a pre-rendered stage background (written by tools/models3d/arkexport.mjs).
 * w, h: image size in pixels; ppt: image pixels per tile at the centre of the stage.
 * The camera looks at tile-space point (cx, cz) from distance d, tilted PITCH below the horizon, through
 * an off-centre frustum whose tangents are [-hw, hw] across and [bot, top] up. bg: colour behind the image.
 */
export interface MapView {
  w: number;
  h: number;
  ppt: number;
  d: number;
  cx: number;
  cz: number;
  hw: number;
  top: number;
  bot: number;
  bg: string;
}

const PITCH = (57 * Math.PI) / 180;
const SIN = Math.sin(PITCH);
const COS = Math.cos(PITCH);

/** Heights of tile tops in tiles: walkable slabs and raised platforms (same as tools/models3d/arkmap.js). */
export const SLAB_H = 0.07;
export const HIGH_H = 0.5;

/** A point in map space (logical pixels) and the size of one tile at that depth. */
export interface Projected {
  x: number;
  y: number;
  s: number;
}

/** Maps tile space (x across, y down the grid, h up, all in tiles) to the map image and back. */
export interface Projection {
  /** Map size in logical pixels. */
  readonly width: number;
  readonly height: number;
  /** True for the plain top-down grid used when a stage has no 3D background. */
  readonly flat: boolean;
  project(x: number, y: number, h?: number): Projected;
  /** Tile-space point at height h under a map-space pixel. */
  unproject(px: number, py: number, h?: number): [number, number];
}

export class PerspectiveProjection implements Projection {
  readonly flat = false;
  readonly width: number;
  readonly height: number;
  private readonly camY: number;
  private readonly camZ: number;

  constructor(private readonly v: MapView) {
    const k = TILE / v.ppt;
    this.width = v.w * k;
    this.height = v.h * k;
    this.camY = v.d * SIN;
    this.camZ = v.cz + v.d * COS;
  }

  project(x: number, y: number, h = 0): Projected {
    const v = this.v;
    const vx = x - v.cx;
    const vy = h - this.camY;
    const vz = y - this.camZ;
    const depth = -(vy * SIN + vz * COS);
    const xt = vx / depth;
    const yt = (vy * COS - vz * SIN) / depth;
    return {
      x: ((xt + v.hw) / (2 * v.hw)) * this.width,
      y: ((v.top - yt) / (v.top - v.bot)) * this.height,
      s: this.width / (2 * v.hw * depth),
    };
  }

  unproject(px: number, py: number, h = 0): [number, number] {
    const v = this.v;
    const xt = (px / this.width) * 2 * v.hw - v.hw;
    const yt = v.top - (py / this.height) * (v.top - v.bot);
    // Ray from the camera through the pixel, cut by the horizontal plane at height h.
    const dy = -SIN + yt * COS;
    const dz = -COS - yt * SIN;
    const t = (h - this.camY) / dy;
    return [v.cx + t * xt, this.camZ + t * dz];
  }
}

export class FlatProjection implements Projection {
  readonly flat = true;
  readonly width: number;
  readonly height: number;

  constructor(cols: number, rows: number) {
    this.width = cols * TILE;
    this.height = rows * TILE;
  }

  project(x: number, y: number): Projected {
    return { x: x * TILE, y: y * TILE, s: TILE };
  }

  unproject(px: number, py: number): [number, number] {
    return [px / TILE, py / TILE];
  }
}

export function mapView(levelId: string): MapView | undefined {
  return (views as Record<string, MapView>)[levelId];
}
