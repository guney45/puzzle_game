import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2, 'Boot OK', {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // No assets to preload yet in M2; hand off to the main menu (02 §2.9 BOOT → MAIN_MENU).
    this.time.delayedCall(150, () => this.scene.start('MenuScene'));
  }
}
