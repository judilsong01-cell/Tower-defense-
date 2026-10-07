import type { Dir, LevelDef, Offset, Placement, Point, RouteDef } from '../data/types';

export type TileKind = 'ground' | 'groundLocked' | 'high' | 'highLocked' | 'wall' | 'spawn' | 'base';

const CHAR_TO_KIND: Record<string, TileKind> = {
  '.': 'ground',
  ',': 'groundLocked',
  H: 'high',
  h: 'highLocked',
  '#': 'wall',
  S: 'spawn',
  B: 'base',
};

export class Grid {
  readonly width: number;
  readonly height: number;
  private readonly tiles: TileKind[];

  constructor(map: readonly string[]) {
    this.height = map.length;
    this.width = map[0]?.length ?? 0;
    this.tiles = [];
    for (let y = 0; y < this.height; y++) {
      const row = map[y];
      if (row.length !== this.width) throw new Error(`Map row ${y} has length ${row.length}, expected ${this.width}`);
      for (const ch of row) {
        const kind = CHAR_TO_KIND[ch];
        if (!kind) throw new Error(`Unknown map character '${ch}' in row ${y}`);
        this.tiles.push(kind);
      }
    }
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  kind(x: number, y: number): TileKind {
    return this.inBounds(x, y) ? this.tiles[y * this.width + x] : 'wall';
  }

  walkable(x: number, y: number): boolean {
    const k = this.kind(x, y);
    return k === 'ground' || k === 'groundLocked' || k === 'spawn' || k === 'base';
  }

  deployable(x: number, y: number, placement: Placement): boolean {
    const k = this.kind(x, y);
    return placement === 'ground' ? k === 'ground' : k === 'high';
  }
}

/** Breadth-first shortest path over walkable tiles (4-directional). Inclusive of both ends. */
export function findPath(grid: Grid, from: Point, to: Point): Point[] {
  const key = (x: number, y: number) => y * grid.width + x;
  const prev = new Map<number, number>();
  const start = key(from[0], from[1]);
  const goal = key(to[0], to[1]);
  const queue: number[] = [start];
  prev.set(start, -1);
  const steps: Point[] = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur === goal) break;
    const cx = cur % grid.width;
    const cy = Math.floor(cur / grid.width);
    for (const [dx, dy] of steps) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!grid.walkable(nx, ny)) continue;
      const nk = key(nx, ny);
      if (prev.has(nk)) continue;
      prev.set(nk, cur);
      queue.push(nk);
    }
  }
  if (!prev.has(goal)) throw new Error(`No path from ${from} to ${to}`);
  const path: Point[] = [];
  for (let k = goal; k !== -1; k = prev.get(k)!) path.push([k % grid.width, Math.floor(k / grid.width)]);
  return path.reverse();
}

/** Builds the list of points an enemy on this route walks through (tile centres, in tile units). */
export function buildRoutePath(grid: Grid, route: RouteDef): Point[] {
  const stops: Point[] = [route.spawn, ...(route.checkpoints ?? []), route.base];
  if (route.flying) return stops.map((p) => [p[0], p[1]] as Point);
  const out: Point[] = [route.spawn];
  for (let i = 1; i < stops.length; i++) {
    const seg = findPath(grid, stops[i - 1], stops[i]);
    out.push(...seg.slice(1));
  }
  return simplify(out);
}

/** Removes collinear intermediate points so movement is a clean polyline. */
function simplify(points: Point[]): Point[] {
  if (points.length <= 2) return points;
  const out: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const [ax, ay] = out[out.length - 1];
    const [bx, by] = points[i];
    const [cx, cy] = points[i + 1];
    const collinear = (bx - ax) * (cy - by) - (by - ay) * (cx - bx) === 0;
    if (!collinear) out.push(points[i]);
  }
  out.push(points[points.length - 1]);
  return out;
}

/** Rotates a right-facing offset to the given direction (screen coordinates, y grows down). */
export function rotateOffset([dx, dy]: Offset, dir: Dir): Offset {
  switch (dir) {
    case 'right':
      return [dx, dy];
    case 'down':
      return [-dy, dx];
    case 'left':
      return [-dx, -dy];
    case 'up':
      return [dy, -dx];
  }
}

/** Absolute tiles covered by a range when standing at (x, y) facing `dir`. */
export function rangeTiles(range: readonly Offset[], x: number, y: number, dir: Dir): Point[] {
  return range.map((o) => {
    const [dx, dy] = rotateOffset(o, dir);
    return [x + dx, y + dy] as Point;
  });
}

export function tileKey(x: number, y: number): number {
  return y * 1000 + x;
}

export function levelGrid(level: LevelDef): Grid {
  return new Grid(level.map);
}

/** Every tile (not simplified) an enemy on this route crosses, from spawn to base. */
export function routeTiles(grid: Grid, route: RouteDef): Point[] {
  const stops: Point[] = [route.spawn, ...(route.checkpoints ?? []), route.base];
  const out: Point[] = [route.spawn];
  for (let i = 1; i < stops.length; i++) {
    if (route.flying) {
      const [ax, ay] = stops[i - 1];
      const [bx, by] = stops[i];
      const samples = Math.ceil(Math.hypot(bx - ax, by - ay) * 4);
      for (let s = 1; s <= samples; s++) {
        const p: Point = [Math.round(ax + ((bx - ax) * s) / samples), Math.round(ay + ((by - ay) * s) / samples)];
        const last = out[out.length - 1];
        if (last[0] !== p[0] || last[1] !== p[1]) out.push(p);
      }
    } else {
      out.push(...findPath(grid, stops[i - 1], stops[i]).slice(1));
    }
  }
  return out;
}
