import Phaser from 'phaser';
import { computeLayout, readSafeAreaInsets } from '../layout';

interface GameOverData {
  score: number;
  highScore: number;
  isNewHighScore: boolean;
}

export class GameOverScene extends Phaser.Scene {
  private result!: GameOverData;

  constructor() {
    super('GameOverScene');
  }

  init(data: GameOverData): void {
    this.result = data;
  }

  create(): void {
    const layout = computeLayout(readSafeAreaInsets());
    const centerX = layout.width / 2;

    this.add
      .text(centerX, layout.height * 0.28, 'Game Over', {
        fontFamily: 'sans-serif',
        fontSize: '34px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, layout.height * 0.28 + 50, `Score: ${this.result.score}`, {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const highScoreLabel = this.result.isNewHighScore
      ? `New High Score: ${this.result.highScore}!`
      : `High Score: ${this.result.highScore}`;
    this.add
      .text(centerX, layout.height * 0.28 + 84, highScoreLabel, {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: this.result.isNewHighScore ? '#f1c40f' : '#c7c7d9',
      })
      .setOrigin(0.5);

    const buttonWidth = 220;
    const buttonHeight = 56;
    const buttonY = layout.height * 0.55;

    const button = this.add
      .rectangle(centerX, buttonY, buttonWidth, buttonHeight, 0x4caf50)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(centerX, buttonY, 'Play Again', {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    button.on('pointerup', () => {
      this.scene.start('GameScene');
    });
  }
}
