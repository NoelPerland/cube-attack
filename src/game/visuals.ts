import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_TUNING } from './tuning';

export interface MuteChipHandle {
  container: Phaser.GameObjects.Container;
  hitArea: Phaser.GameObjects.Zone;
  setMuted: (muted: boolean) => void;
}

export function createNeonBackdrop(scene: Phaser.Scene, worldWidth: number): void {
  scene.add
    .rectangle(0, 0, worldWidth, GAME_HEIGHT, GAME_TUNING.colors.background)
    .setOrigin(0)
    .setDepth(-10);

  const seed = new Phaser.Math.RandomDataGenerator(['cube-attack-backdrop']);

  for (let index = 0; index < 90; index += 1) {
    scene.add
      .rectangle(
        seed.integerInRange(0, worldWidth),
        seed.integerInRange(28, 300),
        seed.integerInRange(2, 4),
        seed.integerInRange(2, 4),
        GAME_TUNING.colors.white,
        seed.realInRange(0.25, 0.75),
      )
      .setDepth(-9)
      .setScrollFactor(0.2);
  }

  for (let index = 0; index < 18; index += 1) {
    scene.add
      .rectangle(
        seed.integerInRange(0, worldWidth),
        seed.integerInRange(80, 260),
        seed.integerInRange(180, 460),
        seed.integerInRange(24, 58),
        index % 2 === 0 ? GAME_TUNING.colors.cyan : GAME_TUNING.colors.magenta,
        0.05,
      )
      .setAngle(seed.integerInRange(-24, -10))
      .setDepth(-8)
      .setScrollFactor(0.15);
  }

  const grid = scene.add.graphics().setDepth(-7);
  grid.lineStyle(1, GAME_TUNING.colors.grid, 0.6);

  for (let y = 384; y < GAME_HEIGHT; y += 48) {
    grid.lineBetween(0, y, worldWidth, y);
  }

  for (let x = 0; x < worldWidth; x += 160) {
    grid.lineBetween(x, 384, x + 60, GAME_HEIGHT);
  }

  scene.add
    .rectangle(
      worldWidth / 2,
      GAME_TUNING.world.groundY + 4,
      worldWidth,
      10,
      GAME_TUNING.colors.cyan,
      0.15,
    )
    .setDepth(-6);
}

export function createPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
): Phaser.GameObjects.Container {
  const glow = scene.add.rectangle(
    x,
    y,
    width + 14,
    height + 14,
    GAME_TUNING.colors.cyan,
    0.08,
  );
  const panel = scene.add.rectangle(
    x,
    y,
    width,
    height,
    GAME_TUNING.colors.panel,
    0.88,
  );
  panel.setStrokeStyle(2, GAME_TUNING.colors.panelBorder, 0.95);

  return scene.add.container(0, 0, [glow, panel]);
}

export function createMuteChip(
  scene: Phaser.Scene,
  x: number,
  y: number,
  muted: boolean,
): MuteChipHandle {
  const glow = scene.add.rectangle(0, 0, 112, 46, GAME_TUNING.colors.cyan, 0.08);
  const panel = scene.add
    .rectangle(0, 0, 98, 32, GAME_TUNING.colors.panel, 0.96)
    .setStrokeStyle(2, GAME_TUNING.colors.panelBorder, 0.65);
  const icon = scene.add.graphics();
  icon.setPosition(-11, 0);

  const label = scene.add
    .text(20, 0, '', {
      fontFamily: '"Lucida Console", monospace',
      fontSize: '15px',
      color: '#f2fcff',
    })
    .setOrigin(0.5);

  const container = scene.add.container(x, y, [glow, panel, icon, label]);
  const hitArea = scene.add
    .zone(x, y, 118, 46)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

  const drawIcon = (isMuted: boolean): void => {
    const color = isMuted ? GAME_TUNING.colors.magenta : GAME_TUNING.colors.cyan;

    icon.clear();
    icon.fillStyle(color, 1);
    icon.fillRoundedRect(-12, -5, 4, 10, 2);
    icon.fillTriangle(-8, -9, 0, -14, 0, 14);
    icon.lineStyle(1.8, color, 0.95);

    if (isMuted) {
      icon.lineBetween(4, -9, 16, 9);
      icon.lineBetween(4, 9, 16, -9);
    } else {
      icon.beginPath();
      icon.moveTo(3, -6);
      icon.lineTo(7, -3);
      icon.lineTo(9, 0);
      icon.lineTo(7, 3);
      icon.lineTo(3, 6);
      icon.strokePath();
      icon.beginPath();
      icon.moveTo(9, -8);
      icon.lineTo(13, -4);
      icon.lineTo(15, 0);
      icon.lineTo(13, 4);
      icon.lineTo(9, 8);
      icon.strokePath();
    }

    label.setText(isMuted ? 'OFF' : 'ON');
    label.setColor(isMuted ? '#ff7a7a' : '#6ff6ff');
    panel.setStrokeStyle(2, color, 0.78);
    glow.setFillStyle(color, isMuted ? 0.1 : 0.08);
  };

  hitArea.on('pointerover', () => {
    container.setScale(1.03);
    glow.setAlpha(0.14);
  });

  hitArea.on('pointerout', () => {
    container.setScale(1);
    glow.setAlpha(0.08);
  });

  drawIcon(muted);

  return {
    container,
    hitArea,
    setMuted: drawIcon,
  };
}

export function formatProgress(value: number): string {
  return `${Math.round(Phaser.Math.Clamp(value, 0, 100))}%`;
}
