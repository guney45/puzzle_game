import Phaser from 'phaser';
import { getHighScore, hasSavedRun } from '../../platform/storage.web';
import { computeLayout, readSafeAreaInsets } from '../layout';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    const layout = computeLayout(readSafeAreaInsets());
    const centerX = layout.width / 2;

    this.add
      .text(centerX, layout.height * 0.32, 'Puzzle Game', {
        fontFamily: 'sans-serif',
        fontSize: '36px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const highScore = getHighScore();
    this.add
      .text(centerX, layout.height * 0.32 + 44, `High Score: ${highScore}`, {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#c7c7d9',
      })
      .setOrigin(0.5);

    const buttonWidth = 200;
    const buttonHeight = 56;
    let buttonY = layout.height * 0.55;

    const canContinue = hasSavedRun();
    if (canContinue) {
      const continueButton = this.add
        .rectangle(centerX, buttonY, buttonWidth, buttonHeight, 0x4a90e2)
        .setInteractive({ useHandCursor: true });
      this.add
        .text(centerX, buttonY, 'Continue', {
          fontFamily: 'sans-serif',
          fontSize: '24px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      continueButton.on('pointerup', () => {
        this.scene.start('GameScene', { resume: true });
      });
      buttonY += buttonHeight + 16;
    }

    const button = this.add
      .rectangle(centerX, buttonY, buttonWidth, buttonHeight, 0x4caf50)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(centerX, buttonY, canContinue ? 'New Game' : 'Play', {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    button.on('pointerup', () => {
      this.scene.start('GameScene', { resume: false });
    });

    const settingsButtonY = buttonY + buttonHeight + 20;
    const settingsButton = this.add
      .rectangle(centerX, settingsButtonY, buttonWidth, 44, 0x3a3a4c)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(centerX, settingsButtonY, 'Settings', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    settingsButton.on('pointerup', () => {
      this.scene.start('SettingsScene');
    });
  }
}
