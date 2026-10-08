import { OPERATORS } from './operators';
import type { EnemyDef, OperatorDef } from './types';

/** Operators (from `squad`) that exploit this enemy's weakness or special trait. */
export function idealOperators(enemy: EnemyDef, squad: readonly string[]): OperatorDef[] {
  return squad
    .map((id) => OPERATORS[id])
    .filter((op): op is OperatorDef => !!op)
    .filter((op) => (enemy.weak ?? []).some((t) => op.tags.includes(t)) || (!!enemy.burn && op.heals));
}
