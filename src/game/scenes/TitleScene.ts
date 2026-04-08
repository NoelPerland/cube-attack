import Phaser from "phaser";
import { audio } from "../audio";
import {
  CUBE_PALETTE,
  DEFAULT_CUBE_COLOR_ID,
  getCubeColorOption,
  getCubeTextureKey,
} from "../cubePalette";
import { updateDebugState } from "../debug";
import { getStats, saveStats } from "../storage";
import { GAME_TUNING, GAME_WIDTH } from "../tuning";
import type { CubeColorOption } from "../types";
import {
  createMuteChip,
  createNeonBackdrop,
  createPanel,
  formatProgress,
  type MuteChipHandle,
} from "../visuals";

type ColorChip = {
  option: CubeColorOption;
  frame: Phaser.GameObjects.Rectangle;
  fill: Phaser.GameObjects.Rectangle;
  stripe: Phaser.GameObjects.Rectangle;
  glow: Phaser.GameObjects.Rectangle;
};

export class TitleScene extends Phaser.Scene {
  private startLocked = false;
  private selectedCubeColorId = DEFAULT_CUBE_COLOR_ID;
  private previewCube!: Phaser.GameObjects.Image;
  private runwayCube!: Phaser.GameObjects.Image;
  private cubeNameText!: Phaser.GameObjects.Text;
  private muteChip?: MuteChipHandle;
  private colorChips: ColorChip[] = [];

  constructor() {
    super("title");
  }

  create(): void {
    const stats = getStats();
    this.startLocked = false;
    this.selectedCubeColorId = stats.cubeColorId;
    this.colorChips = [];

    updateDebugState({
      scene: "title",
      progress: 0,
      bestProgress: stats.bestProgress,
      muted: stats.muted,
      cubeColorId: this.selectedCubeColorId,
      lastResult: "idle",
      playerX: GAME_TUNING.physics.playerStartX,
      grounded: false,
      respawnX: GAME_TUNING.physics.playerStartX,
      activeCheckpoint: null,
      completed: stats.completed,
    });

    createNeonBackdrop(this, GAME_WIDTH);

    this.add
      .text(GAME_WIDTH / 2, 94, "CUBE ATTACK", {
        fontFamily: '"Trebuchet MS", "Lucida Console", monospace',
        fontSize: "78px",
        color: "#f2fcff",
        stroke: "#153048",
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setShadow(0, 0, "#6ff6ff", 24, true, true);

    this.add
      .text(GAME_WIDTH / 2, 156, "Neon precision runner", {
        fontFamily: '"Trebuchet MS", sans-serif',
        fontSize: "24px",
        color: "#6ff6ff",
        letterSpacing: 4,
      })
      .setOrigin(0.5);

    this.createInfoPanel(stats.bestProgress, stats.completed);
    this.createColorPanel();
    this.createRunwayPreview();
    this.createMuteUtility(stats.muted);
    this.selectCubeColor(this.selectedCubeColorId, false);
    this.registerControls();
  }

  private createInfoPanel(bestProgress: number, completed: boolean): void {
    const panel = createPanel(this, 382, 360, 500, 272);
    panel.setDepth(4);

    this.add
      .text(382, 254, this.getStatusText(bestProgress), {
        fontFamily: '"Trebuchet MS", sans-serif',
        fontSize: "30px",
        color: "#ffd166",
      })
      .setOrigin(0.5)
      .setDepth(5);

    if (completed) {
      this.add
        .text(382, 286, "LEVEL CLEARED", {
          fontFamily: '"Lucida Console", monospace',
          fontSize: "15px",
          color: "#80ffb0",
        })
        .setOrigin(0.5)
        .setDepth(5);
    }

    const startGlow = this.add
      .rectangle(382, 334, 350, 76, GAME_TUNING.colors.cyan, 0.08)
      .setDepth(5);
    const startButton = this.add
      .rectangle(382, 334, 330, 60, 0x102541, 0.96)
      .setStrokeStyle(2, GAME_TUNING.colors.cyan, 1)
      .setDepth(6)
      .setInteractive({ useHandCursor: true });
    const startLabel = this.add
      .text(382, 322, "START RUN", {
        fontFamily: '"Trebuchet MS", sans-serif',
        fontSize: "30px",
        color: "#f2fcff",
      })
      .setOrigin(0.5)
      .setDepth(7);
    this.add
      .text(382, 351, "SPACE / ENTER / CLICK", {
        fontFamily: '"Lucida Console", monospace',
        fontSize: "15px",
        color: "#bfefff",
      })
      .setOrigin(0.5)
      .setDepth(7);

    startButton.on("pointerover", () => {
      startButton.setFillStyle(0x14304f, 1);
      startGlow.setAlpha(0.14);
      startLabel.setColor("#ffffff");
    });
    startButton.on("pointerout", () => {
      startButton.setFillStyle(0x102541, 0.96);
      startGlow.setAlpha(0.08);
      startLabel.setColor("#f2fcff");
    });
    startButton.on("pointerdown", () => {
      void this.startRun();
    });

    this.add
      .text(
        382,
        424,
        [
          "MAKE IT TO THE FINISH LINE.",
          "SPIKES, WALLS, AND PITS END THE RUN.",
        ].join("\n"),
        {
          align: "center",
          fontFamily: '"Lucida Console", monospace',
          fontSize: "15px",
          lineSpacing: 8,
          color: "#bfefff",
        },
      )
      .setOrigin(0.5)
      .setDepth(5);
  }

  private createColorPanel(): void {
    const panel = createPanel(this, 952, 360, 340, 272);
    panel.setDepth(4);

    this.previewCube = this.add
      .image(952, 302, getCubeTextureKey(this.selectedCubeColorId))
      .setScale(2.6)
      .setDepth(6);

    const previewHalo = this.add
      .rectangle(952, 302, 136, 136, GAME_TUNING.colors.cyan, 0.04)
      .setStrokeStyle(1, GAME_TUNING.colors.grid, 0.85)
      .setDepth(5);

    this.tweens.add({
      targets: [this.previewCube, previewHalo],
      y: "-=6",
      duration: 1900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });

    this.cubeNameText = this.add
      .text(952, 380, "", {
        fontFamily: '"Lucida Console", monospace',
        fontSize: "16px",
        color: "#ffd166",
      })
      .setOrigin(0.5)
      .setDepth(6);

    const firstChipX = 952 - ((CUBE_PALETTE.length - 1) * 58) / 2;
    for (const [index, option] of CUBE_PALETTE.entries()) {
      const x = firstChipX + index * 58;
      const glow = this.add
        .rectangle(x, 432, 50, 50, option.glow, 0.08)
        .setDepth(5);
      const frame = this.add
        .rectangle(x, 432, 42, 42, 0x08101f, 1)
        .setStrokeStyle(2, GAME_TUNING.colors.panelBorder, 0.32)
        .setDepth(6)
        .setInteractive({ useHandCursor: true });
      const fill = this.add
        .rectangle(x, 432, 34, 34, option.primary, 1)
        .setDepth(6);
      const stripe = this.add
        .rectangle(x, 424, 34, 7, option.stripe, 0.95)
        .setDepth(7);

      frame.on("pointerdown", () => {
        this.selectCubeColor(option.id, true);
      });
      frame.on("pointerover", () => {
        if (this.selectedCubeColorId !== option.id) {
          glow.setAlpha(0.15);
          frame.setStrokeStyle(2, option.glow, 0.75);
        }
      });
      frame.on("pointerout", () => {
        if (this.selectedCubeColorId !== option.id) {
          glow.setAlpha(0.08);
          frame.setStrokeStyle(2, GAME_TUNING.colors.panelBorder, 0.32);
        }
      });

      this.colorChips.push({ option, frame, fill, stripe, glow });
    }
  }

  private createRunwayPreview(): void {
    const previewGround = this.add
      .image(0, 612, "ground")
      .setOrigin(0, 0)
      .setDisplaySize(GAME_WIDTH, 108)
      .setDepth(1);
    previewGround.setAlpha(0.9);

    const previewGlow = this.add
      .rectangle(-180, 534, 240, 180, GAME_TUNING.colors.cyan, 0.08)
      .setAngle(-18)
      .setDepth(2);
    this.runwayCube = this.add
      .image(274, 548, getCubeTextureKey(this.selectedCubeColorId))
      .setDepth(3);
    const previewSpike = this.add
      .image(894, 584, "spike")
      .setOrigin(0.5, 1)
      .setDepth(3);
    const previewSpikeTwo = this.add
      .image(950, 584, "spike")
      .setOrigin(0.5, 1)
      .setDepth(3);
    const previewSpikeThree = this.add
      .image(1080, 584, "spike")
      .setOrigin(0.5, 1)
      .setDepth(3);

    this.tweens.add({
      targets: this.runwayCube,
      x: 400,
      y: 508,
      angle: 180,
      duration: 2300,
      ease: "Cubic.easeOut",
      yoyo: true,
      hold: 300,
      repeat: -1,
    });

    this.tweens.add({
      targets: [previewSpike, previewSpikeTwo, previewSpikeThree],
      x: "-=360",
      duration: 5200,
      repeat: -1,
      ease: "Sine.easeInOut",
      repeatDelay: 220,
      onRepeat: () => {
        previewSpike.x = 894;
        previewSpikeTwo.x = 950;
        previewSpikeThree.x = 1080;
      },
    });

    this.tweens.add({
      targets: previewGlow,
      x: GAME_WIDTH + 220,
      alpha: { from: 0.04, to: 0.12 },
      duration: 6400,
      repeat: -1,
      repeatDelay: 600,
      ease: "Sine.easeInOut",
      onRepeat: () => {
        previewGlow.x = -180;
      },
    });
  }

  private createMuteUtility(muted: boolean): void {
    this.muteChip = createMuteChip(this, GAME_WIDTH - 104, 74, muted);
    this.muteChip.container.setDepth(8);
    this.muteChip.hitArea.setDepth(9);
  }

  private registerControls(): void {
    const space = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );
    const enter = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.ENTER,
    );
    const mute = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    const toggleMute = (): void => {
      const currentStats = getStats();
      const muted = audio.toggleMute();
      saveStats({
        bestProgress: currentStats.bestProgress,
        completed: currentStats.completed,
        muted,
        cubeColorId: this.selectedCubeColorId,
      });
      this.muteChip?.setMuted(muted);
      updateDebugState({ muted });
    };

    space?.on("down", () => void this.startRun());
    enter?.on("down", () => void this.startRun());

    mute?.on("down", () => {
      toggleMute();
    });
    this.muteChip?.hitArea.on("pointerdown", toggleMute);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      space?.off("down");
      enter?.off("down");
      mute?.off("down");
      this.muteChip?.hitArea.removeAllListeners();
    });
  }

  private selectCubeColor(colorId: string, persist: boolean): void {
    const option = getCubeColorOption(colorId);
    this.selectedCubeColorId = option.id;
    this.previewCube.setTexture(getCubeTextureKey(option.id));
    this.runwayCube.setTexture(getCubeTextureKey(option.id));
    this.cubeNameText.setText(option.label.toUpperCase());

    for (const chip of this.colorChips) {
      const isActive = chip.option.id === option.id;
      chip.glow.setAlpha(isActive ? 0.2 : 0.08);
      chip.frame.setStrokeStyle(
        2,
        isActive ? chip.option.glow : GAME_TUNING.colors.panelBorder,
        isActive ? 1 : 0.32,
      );
      chip.frame.setScale(isActive ? 1.08 : 1);
      chip.fill.setScale(isActive ? 1.04 : 1);
      chip.stripe.setAlpha(isActive ? 1 : 0.85);
    }

    this.previewCube.setScale(3, 2.6);
    this.runwayCube.setScale(1.12, 0.9);
    this.tweens.add({
      targets: this.previewCube,
      scaleX: 2.8,
      scaleY: 2.8,
      duration: 160,
      ease: "Quad.easeOut",
    });
    this.tweens.add({
      targets: this.runwayCube,
      scaleX: 1,
      scaleY: 1,
      duration: 160,
      ease: "Quad.easeOut",
    });

    if (persist) {
      const currentStats = getStats();
      saveStats({
        bestProgress: currentStats.bestProgress,
        completed: currentStats.completed,
        muted: currentStats.muted,
        cubeColorId: option.id,
      });
    }

    updateDebugState({ cubeColorId: option.id });
  }

  private async startRun(): Promise<void> {
    if (this.startLocked) {
      return;
    }

    this.startLocked = true;
    await audio.unlock();
    audio.playStart();
    this.scene.start("game");
  }

  private getStatusText(bestProgress: number): string {
    return `BEST RUN ${formatProgress(bestProgress)}`;
  }
}
