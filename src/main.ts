import Phaser from 'phaser';
import './style.css';
import { initDebugBridge } from './game/debug';
import { BootScene } from './game/scenes/BootScene';
import { GameScene } from './game/scenes/GameScene';
import { TitleScene } from './game/scenes/TitleScene';
import { GAME_HEIGHT, GAME_TUNING, GAME_WIDTH } from './game/tuning';

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('Missing #app mount point.');
}

root.replaceChildren();
initDebugBridge();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: root,
  backgroundColor: `#${GAME_TUNING.colors.background.toString(16).padStart(6, '0')}`,
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.NO_CENTER,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: GAME_TUNING.physics.gravity },
      debug: false,
    },
  },
  scene: [BootScene, TitleScene, GameScene],
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.destroy(true);
  });
}
