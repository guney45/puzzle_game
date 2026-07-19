import Phaser from 'phaser';
import { BootScene } from './view/scenes/BootScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 720,
  height: 1280,
  backgroundColor: '#1d1d2b',
  scene: [BootScene],
};

new Phaser.Game(config);
