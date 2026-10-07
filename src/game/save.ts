// Local progress, stored in the WebView's localStorage. Every access is guarded
// because storage can be unavailable (private mode, cleared data).

import type { Lang } from '../i18n';
import type { ReplayData } from '../sim/replay';

export interface LevelProgress {
  cleared: boolean;
  stars: number;
}

export interface SaveData {
  version: 1;
  lang?: Lang;
  autoSkill: boolean;
  levels: Record<string, LevelProgress>;
  replays: Record<string, ReplayData & { stars: number }>;
}

const KEY = 'td.save.v1';

function empty(): SaveData {
  return { version: 1, autoSkill: false, levels: {}, replays: {} };
}

let cache: SaveData | null = null;

export function loadSave(): SaveData {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as SaveData) : null;
    cache = parsed && parsed.version === 1 ? { ...empty(), ...parsed } : empty();
  } catch {
    cache = empty();
  }
  return cache;
}

export function writeSave(update: (data: SaveData) => void): void {
  const data = loadSave();
  update(data);
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable: progress lives only for this session.
  }
}
