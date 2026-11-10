import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/data/levels';
import { HIGH_H, mapView, PerspectiveProjection, SLAB_H } from '../src/game/projection';

describe('map projection', () => {
  it('every stage has a camera', () => {
    for (const level of LEVELS) expect(mapView(level.id), level.id).toBeDefined();
  });

  it('unproject undoes project at any height', () => {
    const p = new PerspectiveProjection(mapView('l1')!);
    for (const h of [0, SLAB_H, HIGH_H]) {
      for (const [x, y] of [[0.5, 0.5], [7.25, 3.5], [13.9, 6.1]]) {
        const at = p.project(x, y, h);
        const [bx, by] = p.unproject(at.x, at.y, h);
        expect(bx).toBeCloseTo(x, 6);
        expect(by).toBeCloseTo(y, 6);
      }
    }
  });

  it('keeps every playable tile inside the image, nearer rows drawn larger', () => {
    for (const level of LEVELS) {
      const p = new PerspectiveProjection(mapView(level.id)!);
      level.map.forEach((row, y) => {
        [...row].forEach((c, x) => {
          if (c === '#' || c === 'A') return;
          const at = p.project(x + 0.5, y + 0.5, SLAB_H);
          expect(at.x, `${level.id} ${x},${y}`).toBeGreaterThan(0);
          expect(at.x).toBeLessThan(p.width);
          expect(at.y).toBeGreaterThan(0);
          expect(at.y).toBeLessThan(p.height);
        });
      });
      expect(p.project(1, level.map.length - 1).s).toBeGreaterThan(p.project(1, 1).s);
    }
  });
});
