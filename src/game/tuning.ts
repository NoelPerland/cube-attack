export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const GAME_TUNING = {
  colors: {
    background: 0x050813,
    panel: 0x08101f,
    panelBorder: 0x6ff6ff,
    cyan: 0x6ff6ff,
    magenta: 0xff5aa5,
    gold: 0xffd166,
    ground: 0x10192c,
    pit: 0x02040a,
    grid: 0x14304f,
    white: 0xf2fcff,
    success: 0x80ffb0,
    danger: 0xff7a7a,
  },
  physics: {
    gravity: 2200,
    runSpeed: 330,
    jumpVelocity: 770,
    terminalVelocity: 1600,
    playerStartX: 176,
    playerStartY: 516,
    coyoteTimeMs: 95,
    jumpBufferMs: 120,
    deathY: 900,
  },
  world: {
    width: 12672,
    groundY: 582,
    groundHeight: 138,
  },
  camera: {
    leadX: 280,
  },
  player: {
    bodyWidth: 30,
    bodyHeight: 38,
    bodyOffsetX: 7,
    bodyOffsetY: 6,
    airSpinSpeed: 480,
  },
  obstacles: {
    spikeHitboxWidth: 36,
    spikeHitboxHeight: 24,
    spikeHitboxOffsetX: 6,
    spikeHitboxOffsetY: 14,
    platformTopThickness: 18,
  },
  score: {
    milestonePercents: [25, 50, 75, 100],
    persistStepPercent: 1,
  },
  audio: {
    masterVolume: 0.18,
    loopVolume: 0.06,
    uiVolume: 0.085,
    sfxVolume: 0.12,
  },
} as const;

export type GameTuning = typeof GAME_TUNING;
