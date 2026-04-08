import { DEFAULT_CUBE_COLOR_ID } from './cubePalette';
import type { DebugState } from './types';

declare global {
  interface Window {
    __cubeAttackDebug__?: {
      getState: () => DebugState;
    };
  }
}

const debugState: DebugState = {
  scene: 'boot',
  progress: 0,
  bestProgress: 0,
  muted: false,
  cubeColorId: DEFAULT_CUBE_COLOR_ID,
  lastResult: 'idle',
  playerX: 0,
  grounded: false,
  respawnX: 0,
  activeCheckpoint: null,
  guideJumps: [],
  completed: false,
};

function shouldExposeDebug(): boolean {
  return import.meta.env.DEV || new URLSearchParams(window.location.search).has('e2e');
}

export function initDebugBridge(): void {
  if (!shouldExposeDebug()) {
    return;
  }

  window.__cubeAttackDebug__ = {
    getState: () => ({
      ...debugState,
      guideJumps: [...debugState.guideJumps],
    }),
  };
}

export function updateDebugState(patch: Partial<DebugState>): void {
  Object.assign(debugState, patch);
}
