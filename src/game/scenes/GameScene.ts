import Phaser from 'phaser';
import { audio } from '../audio';
import { DEFAULT_CUBE_COLOR_ID, getCubeTextureKey } from '../cubePalette';
import { updateDebugState } from '../debug';
import { createLevelData } from '../level';
import { getStats, saveStats } from '../storage';
import { GAME_HEIGHT, GAME_TUNING, GAME_WIDTH } from '../tuning';
import type {
  CheckpointSegment,
  GoalSegment,
  LevelData,
  PlatformSegment,
  SpikeSegment,
  WallSegment,
} from '../types';
import {
  createMuteChip,
  createNeonBackdrop,
  createPanel,
  formatProgress,
  type MuteChipHandle,
} from '../visuals';

type ResultState = 'running' | 'crash' | 'clear';

type PhysicsZone = Phaser.GameObjects.Zone & {
  body: Phaser.Physics.Arcade.StaticBody;
};

export class GameScene extends Phaser.Scene {
  private readonly level: LevelData = createLevelData();
  private player!: Phaser.Physics.Arcade.Sprite;
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private hazards!: Phaser.Physics.Arcade.StaticGroup;
  private progressText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private muteChip?: MuteChipHandle;
  private overlay!: Phaser.GameObjects.Container;
  private overlayTitle!: Phaser.GameObjects.Text;
  private overlayBody!: Phaser.GameObjects.Text;
  private overlayPrimaryAction!: Phaser.GameObjects.Text;
  private overlaySecondaryAction!: Phaser.GameObjects.Text;
  private queuedJumpUntil = 0;
  private coyoteUntil = 0;
  private currentProgress = 0;
  private resultState: ResultState = 'running';
  private bestProgress = 0;
  private completedRun = false;
  private lastPersistedBest = 0;
  private milestoneIndex = 0;
  private currentCubeColorId = DEFAULT_CUBE_COLOR_ID;
  private respawnX = this.level.startX;
  private activeCheckpointLabel: string | null = null;
  private wasGrounded = true;
  private checkpointMarkers: Array<{
    segment: CheckpointSegment;
    image: Phaser.GameObjects.Image;
    label: Phaser.GameObjects.Text;
    triggered: boolean;
    respawnX: number;
  }> = [];
  private muteKey?: Phaser.Input.Keyboard.Key;
  private spaceKey?: Phaser.Input.Keyboard.Key;
  private escapeKey?: Phaser.Input.Keyboard.Key;

  constructor() {
    super('game');
  }

  create(data?: { respawnX?: number; activeCheckpointLabel?: string | null }): void {
    const stats = getStats();
    this.bestProgress = stats.bestProgress;
    this.completedRun = stats.completed;
    this.lastPersistedBest = Math.floor(this.bestProgress);
    this.resultState = 'running';
    this.currentProgress = 0;
    this.queuedJumpUntil = 0;
    this.coyoteUntil = 0;
    this.milestoneIndex = 0;
    this.checkpointMarkers = [];
    this.currentCubeColorId = stats.cubeColorId;
    this.respawnX = data?.respawnX ?? this.level.startX;
    this.activeCheckpointLabel = data?.activeCheckpointLabel ?? null;
    this.wasGrounded = true;

    createNeonBackdrop(this, this.level.worldWidth);

    this.physics.world.setBounds(0, 0, this.level.worldWidth, GAME_HEIGHT + 300);
    this.cameras.main.setBounds(0, 0, this.level.worldWidth, GAME_HEIGHT);

    this.solids = this.physics.add.staticGroup();
    this.hazards = this.physics.add.staticGroup();

    this.buildLevel();
    this.restoreCheckpointState();
    this.createPlayer();
    this.createHud(stats.muted);
    this.createOverlay();
    this.registerControls();

    audio.startLoop(this);

    updateDebugState({
      scene: 'game',
      progress: 0,
      bestProgress: stats.bestProgress,
      muted: stats.muted,
      cubeColorId: this.currentCubeColorId,
      lastResult: 'idle',
      playerX: this.player.x,
      grounded: true,
      respawnX: this.respawnX,
      activeCheckpoint: this.activeCheckpointLabel,
      guideJumps: this.level.guideJumps,
      completed: stats.completed,
    });
  }

  update(_time: number, delta: number): void {
    const deltaSeconds = delta / 1000;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const grounded = body.blocked.down || body.touching.down;

    if (this.resultState === 'running') {
      this.player.setVelocityX(GAME_TUNING.physics.runSpeed);

      if (grounded) {
        this.coyoteUntil = this.time.now + GAME_TUNING.physics.coyoteTimeMs;

        if (!this.wasGrounded) {
          this.handleLandingFeedback();
        }
      }

      if (this.queuedJumpUntil >= this.time.now && (grounded || this.coyoteUntil >= this.time.now)) {
        this.performJump();
      }

      if (!grounded) {
        this.player.angle += GAME_TUNING.player.airSpinSpeed * deltaSeconds;
      } else {
        const snappedAngle = Math.round(this.player.angle / 90) * 90;
        this.player.angle = Phaser.Math.Linear(this.player.angle, snappedAngle, 0.28);
      }

      this.currentProgress = Phaser.Math.Clamp(
        ((this.player.x - this.level.startX) / (this.level.goalX - this.level.startX)) * 100,
        0,
        100,
      );

      this.maybeStoreBestProgress();
      this.updateMilestones();
      this.updateCheckpointVisuals();

      if (this.player.x >= this.level.goalX) {
        this.finishRun('clear');
      }

      if (this.player.y > GAME_TUNING.physics.deathY) {
        this.finishRun('crash');
      }
    } else {
      this.player.setVelocityX(0);

      if (this.resultState === 'crash') {
        this.player.angle += (GAME_TUNING.player.airSpinSpeed + 180) * deltaSeconds;
      }
    }

    this.cameras.main.scrollX = Phaser.Math.Clamp(
      this.player.x - GAME_TUNING.camera.leadX,
      0,
      this.level.worldWidth - this.cameras.main.width,
    );

    this.updateHud();
    updateDebugState({
      progress: this.currentProgress,
      bestProgress: this.bestProgress,
      muted: audio.isMuted(),
      cubeColorId: this.currentCubeColorId,
      playerX: this.player.x,
      grounded,
      respawnX: this.respawnX,
      activeCheckpoint: this.activeCheckpointLabel,
      completed: this.completedRun,
    });
    this.wasGrounded = grounded;
  }

  private buildLevel(): void {
    for (const segment of this.level.segments) {
      switch (segment.type) {
        case 'ground':
          this.addImageBlock(segment.x, segment.y, segment.width, segment.height, 'ground', 5);
          this.addStaticZone(
            segment.x + segment.width / 2,
            segment.y + segment.height / 2,
            segment.width,
            segment.height,
            this.solids,
          );
          break;
        case 'pit':
          this.createPit(segment.x, segment.width);
          break;
        case 'spikes':
          this.createSpikeRow(segment);
          break;
        case 'wall':
          this.createWall(segment);
          break;
        case 'platform':
          this.createPlatform(segment);
          break;
        case 'checkpoint':
          this.createCheckpoint(segment);
          break;
        case 'goal':
          this.createGoal(segment);
          break;
      }
    }
  }

  private createPlayer(): void {
    this.player = this.physics.add
      .sprite(
        this.respawnX,
        GAME_TUNING.physics.playerStartY,
        getCubeTextureKey(this.currentCubeColorId),
      )
      .setDepth(10);

    this.player.setCollideWorldBounds(false);
    this.player.setMaxVelocity(GAME_TUNING.physics.runSpeed, GAME_TUNING.physics.terminalVelocity);
    this.player.setBodySize(
      GAME_TUNING.player.bodyWidth,
      GAME_TUNING.player.bodyHeight,
      false,
    );
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setOffset(
      GAME_TUNING.player.bodyOffsetX,
      GAME_TUNING.player.bodyOffsetY,
    );

    this.physics.add.collider(this.player, this.solids);
    this.physics.add.overlap(this.player, this.hazards, () => {
      this.finishRun('crash');
    });
  }

  private createHud(muted: boolean): void {
    const leftPanel = createPanel(this, 172, 64, 280, 84);
    leftPanel.setScrollFactor(0).setDepth(19);

    this.progressText = this.add
      .text(44, 30, 'RUN 0%', {
        fontFamily: '"Lucida Console", monospace',
        fontSize: '28px',
        color: '#f2fcff',
      })
      .setScrollFactor(0)
      .setDepth(20);

    this.bestText = this.add
      .text(44, 62, this.getBestLabel(), {
        fontFamily: '"Lucida Console", monospace',
        fontSize: '18px',
        color: '#ffd166',
      })
      .setScrollFactor(0)
      .setDepth(20);

    this.muteChip = createMuteChip(this, GAME_WIDTH - 98, 56, muted);
    this.muteChip.container.setScrollFactor(0).setDepth(20);
    this.muteChip.hitArea.setScrollFactor(0).setDepth(21);
  }

  private createOverlay(): void {
    const panel = createPanel(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, 468, 252);
    panel.setScrollFactor(0).setDepth(29);

    this.overlayTitle = this.add
      .text(GAME_WIDTH / 2, 314, '', {
        fontFamily: '"Trebuchet MS", sans-serif',
        fontSize: '48px',
        color: '#f2fcff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30);

    this.overlayBody = this.add
      .text(GAME_WIDTH / 2, 372, '', {
        fontFamily: '"Lucida Console", monospace',
        fontSize: '20px',
        align: 'center',
        color: '#bfefff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30);

    this.overlayPrimaryAction = this.add
      .text(GAME_WIDTH / 2, 432, '', {
        fontFamily: '"Lucida Console", monospace',
        fontSize: '18px',
        color: '#ff5aa5',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30);

    this.overlaySecondaryAction = this.add
      .text(GAME_WIDTH / 2, 462, '', {
        fontFamily: '"Lucida Console", monospace',
        fontSize: '16px',
        color: '#bfefff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30);

    this.overlay = this.add
      .container(0, 0, [
        panel,
        this.overlayTitle,
        this.overlayBody,
        this.overlayPrimaryAction,
        this.overlaySecondaryAction,
      ])
      .setVisible(false)
      .setDepth(29);
  }

  private registerControls(): void {
    this.spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.escapeKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.muteKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.M);

    this.spaceKey?.on('down', () => {
      if (this.resultState === 'running') {
        this.queueJump();
      } else {
        void this.restartRun();
      }
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isPointerOnMuteChip(pointer)) {
        return;
      }

      if (this.resultState === 'running') {
        this.queueJump();
      } else {
        void this.restartRun();
      }
    });

    this.escapeKey?.on('down', () => {
      if (this.resultState !== 'running') {
        audio.stopLoop();
        this.scene.start('title');
      }
    });

    this.muteKey?.on('down', () => {
      const muted = audio.toggleMute();
      saveStats({
        bestProgress: this.bestProgress,
        completed: this.completedRun,
        muted,
        cubeColorId: this.currentCubeColorId,
      });
      this.muteChip?.setMuted(muted);
      updateDebugState({ muted });
    });
    this.muteChip?.hitArea.on('pointerdown', () => {
      const muted = audio.toggleMute();
      saveStats({
        bestProgress: this.bestProgress,
        completed: this.completedRun,
        muted,
        cubeColorId: this.currentCubeColorId,
      });
      this.muteChip?.setMuted(muted);
      updateDebugState({ muted });
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      audio.stopLoop();
      this.spaceKey?.off('down');
      this.escapeKey?.off('down');
      this.muteKey?.off('down');
      this.muteChip?.hitArea.removeAllListeners();
      this.input.off('pointerdown');
    });
  }

  private queueJump(): void {
    this.queuedJumpUntil = this.time.now + GAME_TUNING.physics.jumpBufferMs;
  }

  private performJump(): void {
    if (this.resultState !== 'running') {
      return;
    }

    this.player.setVelocityY(-GAME_TUNING.physics.jumpVelocity);
    this.queuedJumpUntil = 0;
    this.coyoteUntil = 0;
    this.tweens.killTweensOf(this.player);
    this.player.setScale(1.08, 0.9);
    this.tweens.add({
      targets: this.player,
      scaleX: 1,
      scaleY: 1,
      duration: 140,
      ease: 'Quad.easeOut',
    });
    audio.playJump();
  }

  private maybeStoreBestProgress(): void {
    if (this.currentProgress <= this.bestProgress) {
      return;
    }

    this.bestProgress = this.currentProgress;

    const roundedBest = Math.floor(this.bestProgress);
    if (roundedBest >= this.lastPersistedBest + GAME_TUNING.score.persistStepPercent) {
      saveStats({
        bestProgress: this.bestProgress,
        completed: this.completedRun,
        muted: audio.isMuted(),
        cubeColorId: this.currentCubeColorId,
      });
      this.lastPersistedBest = roundedBest;
    }
  }

  private updateMilestones(): void {
    const milestones = GAME_TUNING.score.milestonePercents;
    if (this.milestoneIndex >= milestones.length) {
      return;
    }

    if (this.currentProgress >= milestones[this.milestoneIndex]) {
      audio.playMilestone();
      this.milestoneIndex += 1;
    }
  }

  private updateCheckpointVisuals(): void {
    for (const checkpoint of this.checkpointMarkers) {
      if (this.player.x >= checkpoint.segment.x && checkpoint.respawnX > this.respawnX) {
        this.activateCheckpoint(checkpoint, true);
      }
    }
  }

  private activateCheckpoint(
    checkpoint: {
      segment: CheckpointSegment;
      image: Phaser.GameObjects.Image;
      label: Phaser.GameObjects.Text;
      triggered: boolean;
      respawnX: number;
    },
    playSound: boolean,
  ): void {
    if (checkpoint.respawnX <= this.respawnX && checkpoint.segment.label === this.activeCheckpointLabel) {
      return;
    }

    this.respawnX = checkpoint.respawnX;
    this.activeCheckpointLabel = checkpoint.segment.label;
    this.refreshCheckpointVisuals();

    if (playSound) {
      audio.playMilestone();
    }
  }

  private updateHud(): void {
    this.progressText.setText(`RUN ${formatProgress(this.currentProgress)}`);
    this.bestText.setText(this.getBestLabel());
  }

  private getBestLabel(): string {
    return this.completedRun
      ? `BEST ${formatProgress(this.bestProgress)}  CLEAR`
      : `BEST ${formatProgress(this.bestProgress)}`;
  }

  private finishRun(result: Exclude<ResultState, 'running'>): void {
    if (this.resultState !== 'running') {
      return;
    }

    this.resultState = result;
    const completed = result === 'clear';
    this.completedRun = this.completedRun || completed;
    this.currentProgress = completed ? 100 : this.currentProgress;
    this.bestProgress = Math.max(this.bestProgress, this.currentProgress);

    saveStats({
      bestProgress: this.bestProgress,
      completed: this.completedRun,
      muted: audio.isMuted(),
      cubeColorId: this.currentCubeColorId,
    });

    if (completed) {
      audio.playMilestone();
      this.cameras.main.flash(180, 100, 255, 190);
      this.overlayTitle.setText('LEVEL CLEAR');
      this.overlayTitle.setColor('#80ffb0');
      this.overlayBody.setText(
        `FINISH ${formatProgress(this.currentProgress)}\nBEST ${formatProgress(this.bestProgress)}`,
      );
      this.overlayPrimaryAction.setText('SPACE / CLICK TO RUN AGAIN');
      this.overlaySecondaryAction.setText('ESC TO TITLE');
    } else {
      audio.playDeath();
      this.player.setVelocityY(-260);
      this.player.setTint(GAME_TUNING.colors.danger);
      this.player.setAlpha(0.94);
      this.cameras.main.shake(180, 0.008);
      this.overlayTitle.setText('GAME OVER');
      this.overlayTitle.setColor('#ff7a7a');
      this.overlayBody.setText(
        `CRASH AT ${formatProgress(this.currentProgress)}\nBEST ${formatProgress(this.bestProgress)}`,
      );
      this.overlayPrimaryAction.setText('SPACE / CLICK TO RETRY');
      this.overlaySecondaryAction.setText('ESC TO TITLE');
    }

    this.overlay.setVisible(true);
    updateDebugState({
      progress: this.currentProgress,
      bestProgress: this.bestProgress,
      cubeColorId: this.currentCubeColorId,
      lastResult: completed ? 'clear' : 'crash',
      respawnX: this.respawnX,
      activeCheckpoint: this.activeCheckpointLabel,
      completed: this.completedRun,
    });
  }

  private async restartRun(): Promise<void> {
    await audio.unlock();
    audio.playStart();
    this.scene.restart({
      respawnX: this.respawnX,
      activeCheckpointLabel: this.activeCheckpointLabel,
    });
  }

  private createSpikeRow(segment: SpikeSegment): void {
    for (let index = 0; index < segment.count; index += 1) {
      const spikeX = segment.x + index * segment.spacing;
      this.add
        .image(spikeX, segment.y, 'spike')
        .setOrigin(0, 1)
        .setDepth(7);

      this.addStaticZone(
        spikeX + GAME_TUNING.obstacles.spikeHitboxWidth / 2 + GAME_TUNING.obstacles.spikeHitboxOffsetX,
        segment.y
          - GAME_TUNING.obstacles.spikeHitboxHeight / 2
          - GAME_TUNING.obstacles.spikeHitboxOffsetY,
        GAME_TUNING.obstacles.spikeHitboxWidth,
        GAME_TUNING.obstacles.spikeHitboxHeight,
        this.hazards,
      );
    }
  }

  private createWall(segment: WallSegment): void {
    this.addImageBlock(segment.x, segment.y - segment.height, segment.width, segment.height, 'wall', 8);

    this.addStaticZone(
      segment.x + segment.width / 2,
      segment.y - segment.height / 2,
      segment.width - 8,
      segment.height - 6,
      this.hazards,
    );
  }

  private createPlatform(segment: PlatformSegment): void {
    this.addImageBlock(segment.x, segment.y, segment.width, segment.height, 'platform', 6);
    this.addStaticZone(
      segment.x + segment.width / 2,
      segment.y + GAME_TUNING.obstacles.platformTopThickness / 2,
      segment.width,
      GAME_TUNING.obstacles.platformTopThickness,
      this.solids,
    );
  }

  private createCheckpoint(segment: CheckpointSegment): void {
    const image = this.add.image(segment.x, GAME_TUNING.world.groundY, 'checkpoint').setOrigin(0.5, 1).setDepth(9);
    const label = this.add
      .text(segment.x, GAME_TUNING.world.groundY - 90, segment.label, {
        fontFamily: '"Lucida Console", monospace',
        fontSize: '20px',
        color: '#6ff6ff',
      })
      .setOrigin(0.5)
      .setDepth(9);

    this.tweens.add({
      targets: image,
      y: '-=8',
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    const marker = {
      segment,
      image,
      label,
      triggered: false,
      respawnX: segment.x + 78,
    };

    this.checkpointMarkers.push(marker);
  }

  private createGoal(segment: GoalSegment): void {
    this.addImageBlock(segment.x, segment.y - segment.height, segment.width, segment.height, 'goal', 9);
  }

  private createPit(x: number, width: number): void {
    this.add
      .rectangle(
        x + width / 2,
        GAME_TUNING.world.groundY + 18,
        width,
        GAME_HEIGHT - GAME_TUNING.world.groundY + 120,
        GAME_TUNING.colors.pit,
        1,
      )
      .setOrigin(0.5, 0)
      .setDepth(1);

    this.add
      .rectangle(x + width / 2, GAME_TUNING.world.groundY + 6, width - 10, 4, GAME_TUNING.colors.magenta, 0.8)
      .setDepth(2);

    for (let offset = 24; offset < width - 24; offset += 48) {
      this.add
        .image(x + offset, GAME_TUNING.world.groundY + 102, 'spike')
        .setOrigin(0, 1)
        .setScale(0.8)
        .setAlpha(0.35)
        .setDepth(2);
    }
  }

  private addImageBlock(
    x: number,
    y: number,
    width: number,
    height: number,
    texture: string,
    depth: number,
  ): void {
    this.add
      .image(x, y, texture)
      .setOrigin(0, 0)
      .setDisplaySize(width, height)
      .setDepth(depth);
  }

  private addStaticZone(
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    group: Phaser.Physics.Arcade.StaticGroup,
  ): PhysicsZone {
    const zone = this.add.zone(centerX, centerY, width, height) as PhysicsZone;
    this.physics.add.existing(zone, true);
    group.add(zone);
    zone.body.updateFromGameObject();
    return zone;
  }

  private isPointerOnMuteChip(pointer: Phaser.Input.Pointer): boolean {
    if (!this.muteChip) {
      return false;
    }

    const bounds = this.muteChip.hitArea.getBounds();
    return Phaser.Geom.Rectangle.Contains(bounds, pointer.x, pointer.y);
  }

  private handleLandingFeedback(): void {
    if (this.resultState !== 'running') {
      return;
    }

    this.tweens.killTweensOf(this.player);
    this.player.setScale(0.92, 1.08);
    this.tweens.add({
      targets: this.player,
      scaleX: 1,
      scaleY: 1,
      duration: 120,
      ease: 'Quad.easeOut',
    });
  }

  private restoreCheckpointState(): void {
    const labeledCheckpoint = this.activeCheckpointLabel
      ? this.checkpointMarkers.find((checkpoint) => checkpoint.segment.label === this.activeCheckpointLabel) ?? null
      : null;

    const reachableCheckpoints = [...this.checkpointMarkers]
      .sort((left, right) => left.respawnX - right.respawnX)
      .filter((checkpoint) => checkpoint.respawnX <= this.respawnX);

    const furthestCheckpoint =
      reachableCheckpoints.length > 0
        ? reachableCheckpoints[reachableCheckpoints.length - 1]
        : null;

    const restoredCheckpoint = labeledCheckpoint ?? furthestCheckpoint;

    if (restoredCheckpoint) {
      this.respawnX = restoredCheckpoint.respawnX;
      this.activeCheckpointLabel = restoredCheckpoint.segment.label;
    } else {
      this.respawnX = this.level.startX;
      this.activeCheckpointLabel = null;
    }

    this.refreshCheckpointVisuals();
  }

  private refreshCheckpointVisuals(): void {
    for (const checkpoint of this.checkpointMarkers) {
      const isCaptured = checkpoint.respawnX <= this.respawnX;
      const isActive = checkpoint.segment.label === this.activeCheckpointLabel;

      checkpoint.triggered = isCaptured;

      if (isActive) {
        checkpoint.image.setTint(GAME_TUNING.colors.gold).setAlpha(1);
        checkpoint.label.setColor('#ffd166').setAlpha(1);
        continue;
      }

      if (isCaptured) {
        checkpoint.image.setTint(GAME_TUNING.colors.cyan).setAlpha(0.92);
        checkpoint.label.setColor('#bfefff').setAlpha(0.92);
        continue;
      }

      checkpoint.image.clearTint().setAlpha(0.86);
      checkpoint.label.setColor('#6ff6ff').setAlpha(0.86);
    }
  }
}
