export interface CubeColorOption {
  id: string;
  label: string;
  primary: number;
  glow: number;
  stripe: number;
}

export type HazardKind = 'spike' | 'wall' | 'pit';

export interface PersistentStats {
  bestProgress: number;
  completed: boolean;
  muted: boolean;
  cubeColorId: string;
}

interface SegmentBase {
  type: string;
  x: number;
}

export interface GroundSegment extends SegmentBase {
  type: 'ground';
  width: number;
  y: number;
  height: number;
}

export interface PitSegment extends SegmentBase {
  type: 'pit';
  width: number;
}

export interface SpikeSegment extends SegmentBase {
  type: 'spikes';
  count: number;
  y: number;
  spacing: number;
}

export interface WallSegment extends SegmentBase {
  type: 'wall';
  width: number;
  height: number;
  y: number;
}

export interface PlatformSegment extends SegmentBase {
  type: 'platform';
  width: number;
  height: number;
  y: number;
}

export interface CheckpointSegment extends SegmentBase {
  type: 'checkpoint';
  label: string;
}

export interface GoalSegment extends SegmentBase {
  type: 'goal';
  width: number;
  height: number;
  y: number;
}

export type LevelSegment =
  | GroundSegment
  | PitSegment
  | SpikeSegment
  | WallSegment
  | PlatformSegment
  | CheckpointSegment
  | GoalSegment;

export interface LevelData {
  worldWidth: number;
  startX: number;
  goalX: number;
  guideJumps: number[];
  segments: LevelSegment[];
  checkpoints: CheckpointSegment[];
  pits: PitSegment[];
}

export interface DebugState {
  scene: 'boot' | 'title' | 'game';
  progress: number;
  bestProgress: number;
  muted: boolean;
  cubeColorId: string;
  lastResult: 'idle' | 'crash' | 'clear';
  playerX: number;
  grounded: boolean;
  respawnX: number;
  activeCheckpoint: string | null;
  guideJumps: number[];
  completed: boolean;
}
