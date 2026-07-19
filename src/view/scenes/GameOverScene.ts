import Phaser from 'phaser';
import { computeLayout, readSafeAreaInsets } from '../layout';

interface GameOverData {
  score: number;
  highScore: number;
  isNewHighScore: boolean;
  totalClears: number;
  perksTaken: string[];
}

// Polished game-over summary (02 §2.10): clears, perks taken, and a high-score badge.
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
    const top = layout.height * 0.22;

    this.add
      .text(centerX, top, 'Game Over', {
        fontFamily: 'sans-serif',
        fontSize: '34px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, top + 46, `Score: ${this.result.score}`, {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const highScoreLabel = this.result.isNewHighScore
      ? `★ New High Score: ${this.result.highScore}! ★`
      : `High Score: ${this.result.highScore}`;
    this.add
      .text(centerX, top + 78, highScoreLabel, {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: this.result.isNewHighScore ? '#f1c40f' : '#c7c7d9',
        fontStyle: this.result.isNewHighScore ? 'bold' : 'normal',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, top + 108, `Lines cleared: ${this.result.totalClears}`, {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        color: '#c7c7d9',
      })
      .setOrigin(0.5);

    const perksLabel =
      this.result.perksTaken.length > 0 ? `Perks taken: ${this.result.perksTaken.join(', ')}` : 'Perks taken: none';
    this.add
      .text(centerX, top + 132, perksLabel, {
        fontFamily: 'sans-serif',
        fontSize: '13px',
        color: '#8fd694',
        align: 'center',
        wordWrap: { width: layout.width - 48 },
      })
      .setOrigin(0.5, 0);

    const buttonWidth = 220;
    const buttonHeight = 56;
    const buttonY = layout.height * 0.62;

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
