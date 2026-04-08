import Phaser from 'phaser';
import { audio } from '../audio';
import { CUBE_PALETTE, getCubeTextureKey } from '../cubePalette';
import { updateDebugState } from '../debug';
import { getStats } from '../storage';
import { GAME_TUNING } from '../tuning';

function createRectTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (graphics: Phaser.GameObjects.Graphics) => void,
): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const graphics = scene.add.graphics();
  draw(graphics);
  graphics.generateTexture(key, width, height);
  graphics.destroy();
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    this.createTextures();

    const stats = getStats();
    audio.setMuted(stats.muted);

    updateDebugState({
      scene: 'boot',
      progress: 0,
      bestProgress: stats.bestProgress,
      muted: stats.muted,
      cubeColorId: stats.cubeColorId,
      lastResult: 'idle',
      playerX: GAME_TUNING.physics.playerStartX,
      grounded: false,
      respawnX: GAME_TUNING.physics.playerStartX,
      activeCheckpoint: null,
      guideJumps: [],
      completed: stats.completed,
    });

    this.scene.start('title');
  }

  private createTextures(): void {
    createRectTexture(this, 'pixel', 4, 4, (graphics) => {
      graphics.fillStyle(0xffffff, 1);
      graphics.fillRect(0, 0, 4, 4);
    });

    for (const option of CUBE_PALETTE) {
      createRectTexture(this, getCubeTextureKey(option.id), 48, 48, (graphics) => {
        graphics.fillStyle(option.glow, 0.18);
        graphics.fillRect(0, 0, 48, 48);
        graphics.fillStyle(option.primary, 1);
        graphics.fillRect(4, 4, 40, 40);
        graphics.fillStyle(0x09111d, 1);
        graphics.fillRect(10, 10, 28, 28);
        graphics.fillStyle(option.stripe, 1);
        graphics.fillRect(10, 10, 28, 8);
        graphics.fillStyle(GAME_TUNING.colors.white, 0.92);
        graphics.fillRect(10, 10, 14, 8);
        graphics.fillStyle(option.glow, 0.35);
        graphics.fillRect(12, 24, 24, 8);
        graphics.lineStyle(2, option.glow, 1);
        graphics.strokeRect(4, 4, 40, 40);
      });
    }

    createRectTexture(this, 'ground', 96, 138, (graphics) => {
      graphics.fillStyle(GAME_TUNING.colors.ground, 1);
      graphics.fillRect(0, 0, 96, 138);
      graphics.fillStyle(GAME_TUNING.colors.cyan, 0.9);
      graphics.fillRect(0, 0, 96, 8);
      graphics.fillStyle(GAME_TUNING.colors.cyan, 0.18);
      graphics.fillRect(0, 8, 96, 12);
      graphics.fillStyle(GAME_TUNING.colors.magenta, 0.35);
      graphics.fillRect(10, 26, 12, 12);
      graphics.fillRect(64, 54, 10, 10);
      graphics.fillRect(30, 78, 16, 8);
      graphics.fillRect(72, 102, 14, 10);
    });

    createRectTexture(this, 'platform', 96, 86, (graphics) => {
      graphics.fillStyle(0x102541, 1);
      graphics.fillRect(0, 0, 96, 86);
      graphics.fillStyle(GAME_TUNING.colors.cyan, 0.9);
      graphics.fillRect(0, 0, 96, 8);
      graphics.fillStyle(GAME_TUNING.colors.magenta, 0.2);
      graphics.fillRect(12, 18, 14, 12);
      graphics.fillRect(58, 42, 18, 10);
      graphics.lineStyle(2, GAME_TUNING.colors.cyan, 0.7);
      graphics.strokeRect(0, 0, 96, 86);
    });

    createRectTexture(this, 'wall', 52, 144, (graphics) => {
      graphics.fillStyle(0x24111f, 1);
      graphics.fillRect(0, 0, 52, 144);
      graphics.fillStyle(GAME_TUNING.colors.magenta, 0.75);
      graphics.fillRect(0, 0, 52, 12);
      graphics.fillStyle(GAME_TUNING.colors.cyan, 0.7);
      graphics.fillRect(6, 18, 6, 108);
      graphics.fillRect(22, 34, 6, 90);
      graphics.fillRect(38, 50, 6, 74);
      graphics.lineStyle(2, GAME_TUNING.colors.magenta, 1);
      graphics.strokeRect(0, 0, 52, 144);
    });

    createRectTexture(this, 'spike', 48, 40, (graphics) => {
      const points = [
        new Phaser.Geom.Point(4, 38),
        new Phaser.Geom.Point(24, 2),
        new Phaser.Geom.Point(44, 38),
      ];
      graphics.fillStyle(GAME_TUNING.colors.magenta, 1);
      graphics.fillPoints(points, true);
      graphics.lineStyle(2, GAME_TUNING.colors.cyan, 1);
      graphics.strokePoints(points, true);
      graphics.fillStyle(GAME_TUNING.colors.white, 0.65);
      graphics.fillTriangle(16, 24, 24, 9, 30, 24);
    });

    createRectTexture(this, 'checkpoint', 48, 88, (graphics) => {
      graphics.fillStyle(GAME_TUNING.colors.cyan, 1);
      graphics.fillRect(22, 12, 4, 62);
      graphics.fillStyle(GAME_TUNING.colors.magenta, 0.95);
      graphics.fillTriangle(24, 4, 40, 18, 24, 32);
      graphics.fillStyle(GAME_TUNING.colors.white, 1);
      graphics.fillRect(20, 68, 8, 12);
    });

    createRectTexture(this, 'goal', 80, 176, (graphics) => {
      graphics.fillStyle(GAME_TUNING.colors.cyan, 1);
      graphics.fillRect(4, 24, 10, 148);
      graphics.fillRect(66, 24, 10, 148);
      graphics.fillRect(4, 24, 72, 10);
      graphics.fillStyle(GAME_TUNING.colors.magenta, 0.9);
      graphics.fillRect(20, 42, 40, 10);
      graphics.fillStyle(GAME_TUNING.colors.white, 0.8);
      graphics.fillTriangle(40, 58, 56, 84, 24, 84);
      graphics.lineStyle(2, GAME_TUNING.colors.cyan, 0.7);
      graphics.strokeRect(4, 24, 72, 148);
    });
  }
}
