import { GAME_TUNING } from './tuning';
import type {
  CheckpointSegment,
  GoalSegment,
  GroundSegment,
  LevelData,
  LevelSegment,
  PitSegment,
  PlatformSegment,
  SpikeSegment,
  WallSegment,
} from './types';

const groundY = GAME_TUNING.world.groundY;
const groundHeight = GAME_TUNING.world.groundHeight;

function buildGroundSegments(pits: PitSegment[], endX: number): GroundSegment[] {
  const sortedPits = [...pits].sort((left, right) => left.x - right.x);
  const groundSegments: GroundSegment[] = [];
  let cursor = 0;

  for (const pit of sortedPits) {
    if (pit.x > cursor) {
      groundSegments.push({
        type: 'ground',
        x: cursor,
        width: pit.x - cursor,
        y: groundY,
        height: groundHeight,
      });
    }

    cursor = pit.x + pit.width;
  }

  if (cursor < endX) {
    groundSegments.push({
      type: 'ground',
      x: cursor,
      width: endX - cursor,
      y: groundY,
      height: groundHeight,
    });
  }

  return groundSegments;
}

export function createLevelData(): LevelData {
  const pits: PitSegment[] = [
    { type: 'pit', x: 2260, width: 160 },
    { type: 'pit', x: 3990, width: 176 },
    { type: 'pit', x: 5690, width: 190 },
    { type: 'pit', x: 7520, width: 196 },
    { type: 'pit', x: 9150, width: 208 },
    { type: 'pit', x: 10820, width: 220 },
    { type: 'pit', x: 11860, width: 170 },
  ];

  const spikes: SpikeSegment[] = [
    { type: 'spikes', x: 860, count: 1, spacing: 48, y: groundY },
    { type: 'spikes', x: 1324, count: 2, spacing: 48, y: groundY },
    { type: 'spikes', x: 1788, count: 3, spacing: 48, y: groundY },
    { type: 'spikes', x: 3388, count: 2, spacing: 48, y: groundY },
    { type: 'spikes', x: 4500, count: 5, spacing: 48, y: groundY },
    { type: 'spikes', x: 6386, count: 2, spacing: 48, y: groundY },
    { type: 'spikes', x: 8040, count: 3, spacing: 48, y: groundY },
    { type: 'spikes', x: 8556, count: 2, spacing: 48, y: groundY },
    { type: 'spikes', x: 9696, count: 5, spacing: 48, y: groundY },
    { type: 'spikes', x: 11392, count: 3, spacing: 48, y: groundY },
  ];

  const walls: WallSegment[] = [
    { type: 'wall', x: 2860, width: 52, height: 92, y: groundY },
    { type: 'wall', x: 5108, width: 52, height: 104, y: groundY },
  ];

  const platforms: PlatformSegment[] = [
    { type: 'platform', x: 4564, width: 180, height: 86, y: 486 },
    { type: 'platform', x: 9762, width: 180, height: 78, y: 496 },
  ];

  const checkpoints: CheckpointSegment[] = [
    { type: 'checkpoint', x: 3560, label: 'A' },
    { type: 'checkpoint', x: 6200, label: 'B' },
    { type: 'checkpoint', x: 8780, label: 'C' },
  ];

  const goal: GoalSegment = {
    type: 'goal',
    x: 12200,
    width: 76,
    height: 168,
    y: groundY,
  };

  const guideJumps = [
    760, 1230, 1730, 2180, 2760, 3290, 3930, 4380, 5010, 5630, 6290, 7465, 7960,
    8485, 9050, 9600, 10720, 11300, 11780,
  ];

  const groundSegments = buildGroundSegments(pits, goal.x + 420);
  const segments: LevelSegment[] = [
    ...groundSegments,
    ...pits,
    ...spikes,
    ...walls,
    ...platforms,
    ...checkpoints,
    goal,
  ];

  return {
    worldWidth: GAME_TUNING.world.width,
    startX: GAME_TUNING.physics.playerStartX,
    goalX: goal.x + goal.width * 0.6,
    guideJumps,
    segments,
    checkpoints,
    pits,
  };
}
