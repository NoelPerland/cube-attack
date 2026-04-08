import { DEFAULT_CUBE_COLOR_ID, getCubeColorOption } from './cubePalette';
import type { PersistentStats } from './types';

const STORAGE_KEY = 'cube-attack-save-v1';

const DEFAULT_STATS: PersistentStats = {
  bestProgress: 0,
  completed: false,
  muted: false,
  cubeColorId: DEFAULT_CUBE_COLOR_ID,
};

let cachedStats: PersistentStats | null = null;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function sanitizeStats(value: unknown): PersistentStats {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_STATS };
  }

  const record = value as Partial<PersistentStats>;
  return {
    bestProgress:
      typeof record.bestProgress === 'number' && Number.isFinite(record.bestProgress)
        ? clamp(record.bestProgress, 0, 100)
        : DEFAULT_STATS.bestProgress,
    completed: Boolean(record.completed),
    muted: Boolean(record.muted),
    cubeColorId: getCubeColorOption(record.cubeColorId).id,
  };
}

export function getStats(): PersistentStats {
  if (cachedStats) {
    return { ...cachedStats };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cachedStats = raw ? sanitizeStats(JSON.parse(raw)) : { ...DEFAULT_STATS };
  } catch {
    cachedStats = { ...DEFAULT_STATS };
  }

  return { ...cachedStats };
}

export function saveStats(nextStats: PersistentStats): PersistentStats {
  cachedStats = sanitizeStats(nextStats);

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedStats));
  } catch {
    return { ...cachedStats };
  }

  return { ...cachedStats };
}
