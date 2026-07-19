import Phaser from 'phaser';
import type { Coord } from '../../core/types';
import type { GameLayout } from '../layout';
import type { BoardView } from '../render/boardView';

// "Juice" (02 §2.10): clear pop/flash + a short particle burst, floating score popups,
// combo text, and screen shake. Reduce-motion (02 §2.11) skips the particle burst and shake
// but keeps the cheap flash/text so a clear still reads as a clear.

const PARTICLE_TEXTURE_KEY = 'juice-particle';

// Generates a small white circle texture once per scene, reused by every particle burst.
export function ensureParticleTexture(scene: Phaser.Scene): string {
  if (!scene.textures.exists(PARTICLE_TEXTURE_KEY)) {
    const graphics = scene.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture(PARTICLE_TEXTURE_KEY, 8, 8);
    graphics.destroy();
  }
  return PARTICLE_TEXTURE_KEY;
}

export function flashClearedCells(
  scene: Phaser.Scene,
  boardView: BoardView,
  cells: readonly Coord[],
  layout: GameLayout,
  reduceMotion: boolean,
): void {
  for (const cell of cells) {
    const pos = boardView.gridToScreen(cell);
    const flash = scene.add.rectangle(pos.x, pos.y, layout.cellSize - 2, layout.cellSize - 2, 0xffffff, 0.9);
    scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.4,
      duration: 220,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  if (reduceMotion || cells.length === 0) return;

  const textureKey = ensureParticleTexture(scene);
  const sample = cells[Math.floor(cells.length / 2)];
  const pos = boardView.gridToScreen(sample);
  const emitter = scene.add.particles(pos.x, pos.y, textureKey, {
    speed: { min: 60, max: 160 },
    lifespan: 300,
    scale: { start: 1, end: 0 },
    quantity: Math.min(16, 4 + cells.length),
    emitting: false,
  });
  emitter.explode();
  scene.time.delayedCall(320, () => emitter.destroy());
}

export function spawnScorePopup(scene: Phaser.Scene, x: number, y: number, text: string, color = '#ffffff'): void {
  const popup = scene.add
    .text(x, y, text, {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color,
      fontStyle: 'bold',
    })
    .setOrigin(0.5);
  scene.tweens.add({
    targets: popup,
    y: y - 40,
    alpha: 0,
    duration: 700,
    ease: 'Cubic.easeOut',
    onComplete: () => popup.destroy(),
  });
}

export function spawnComboText(scene: Phaser.Scene, layout: GameLayout, lineCount: number): void {
  const text = scene.add
    .text(layout.width / 2, layout.boardTop + layout.boardSize / 2, `COMBO ×${lineCount}!`, {
      fontFamily: 'sans-serif',
      fontSize: '30px',
      color: '#f1c40f',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    })
    .setOrigin(0.5)
    .setScale(0.6)
    .setAlpha(0)
    .setDepth(900);

  scene.tweens.add({
    targets: text,
    alpha: 1,
    scale: 1,
    duration: 150,
    ease: 'Back.easeOut',
    onComplete: () => {
      scene.tweens.add({
        targets: text,
        alpha: 0,
        y: text.y - 20,
        delay: 350,
        duration: 300,
        onComplete: () => text.destroy(),
      });
    },
  });
}

export function shakeScreen(scene: Phaser.Scene, reduceMotion: boolean, lineCount: number): void {
  if (reduceMotion || lineCount < 2) return;
  const intensity = Math.min(0.012, 0.004 * lineCount);
  scene.cameras.main.shake(180, intensity);
}

export function perkPickCelebration(scene: Phaser.Scene, layout: GameLayout): void {
  const flash = scene.add.rectangle(0, 0, layout.width, layout.height, 0xffffff, 0.35).setOrigin(0, 0).setDepth(1500);
  scene.tweens.add({
    targets: flash,
    alpha: 0,
    duration: 350,
    ease: 'Cubic.easeOut',
    onComplete: () => flash.destroy(),
  });
}
