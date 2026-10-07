import { ENEMIES } from '../data/enemies';
import { OPERATORS } from '../data/operators';
import type { LevelDef } from '../data/types';
import type { Action, Battle } from './battle';

export interface RecordedAction {
  tick: number;
  action: Action;
}

export interface ReplayData {
  levelId: string;
  /** Hash of the game data the replay was recorded with. Replays are discarded when data changes. */
  dataVersion: string;
  actions: RecordedAction[];
}

/** FNV-1a 32-bit hash, enough to detect data changes between versions. */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

export function dataVersion(level: LevelDef): string {
  return hash(JSON.stringify({ level, OPERATORS, ENEMIES }));
}

/** Records every applied action of a battle. */
export class ReplayRecorder {
  readonly actions: RecordedAction[] = [];

  constructor(battle: Battle) {
    battle.onAction = (tick, action) => this.actions.push({ tick, action });
  }

  toData(level: LevelDef): ReplayData {
    return { levelId: level.id, dataVersion: dataVersion(level), actions: [...this.actions] };
  }
}

/** Feeds recorded actions back into a battle at the exact ticks they happened. */
export class ReplayPlayer {
  private index = 0;

  constructor(private readonly data: ReplayData) {}

  /** Call before every battle.step(). */
  update(battle: Battle): void {
    const actions = this.data.actions;
    while (this.index < actions.length && actions[this.index].tick <= battle.tick) {
      battle.queue(actions[this.index++].action);
    }
  }

  get finished(): boolean {
    return this.index >= this.data.actions.length;
  }
}
