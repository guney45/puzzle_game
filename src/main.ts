import Phaser from 'phaser';
import { BootScene } from './view/scenes/BootScene';
import { MenuScene } from './view/scenes/MenuScene';
import { GameScene } from './view/scenes/GameScene';
import { GameOverScene } from './view/scenes/GameOverScene';
import { DESIGN_WIDTH, DESIGN_HEIGHT } from './view/layout';

// Portrait, safe-area-aware, DPR-crisp boot config (02 §2.12, 03 §3.1.1). The design canvas
// is the iPhone 12 logical size; Scale.FIT + autoCenter scale it to fit any real viewport
// without ever stretching the aspect ratio.
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: DESIGN_WIDTH,
  height: DESIGN_HEIGHT,
  backgroundColor: '#1d1d2b',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
    zoom: window.devicePixelRatio || 1,
  },
  scene: [BootScene, MenuScene, GameScene, GameOverScene],
};

new Phaser.Game(config);
