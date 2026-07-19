import Phaser from 'phaser';
import { GRID_SIZE } from '../../config/constants';
import { GameEngine } from '../../core/engine';
import { canPlace } from '../../core/placement';
import type { Coord, Hand } from '../../core/types';
import { getHighScore, saveHighScoreIfBetter } from '../../platform/storage.web';
import { computeLayout, readSafeAreaInsets, type GameLayout } from '../layout';
import { BoardView } from '../render/boardView';
import { drawPieceCells } from '../render/pieceView';

interface TraySlot {
  root: Phaser.GameObjects.Container;
  zone: Phaser.GameObjects.Rectangle;
  index: number;
}

// Wires touch drag-and-drop input to the core GameEngine and renders its state (03 §3.2:
// this scene owns pixels/input only, never game rules). No perk UI yet (M3) — a perk-select
// trigger is auto-resolved with no perk chosen so the run keeps flowing.
export class GameScene extends Phaser.Scene {
  private engine!: GameEngine;
  private layout!: GameLayout;
  private boardView!: BoardView;
  private colorGrid: (string | null)[][] = [];
  private traySlots: TraySlot[] = [];
  private scoreText!: Phaser.GameObjects.Text;
  private highScoreText!: Phaser.GameObjects.Text;
  private highScore = 0;

  private dragging = false;
  private dragIndex = -1;
  private dragPiece: Hand[number] = null;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.engine = new GameEngine({ seed: Date.now() });
    this.layout = computeLayout(readSafeAreaInsets());
    this.colorGrid = Array.from({ length: GRID_SIZE }, () => Array<string | null>(GRID_SIZE).fill(null));
    this.highScore = getHighScore();

    this.createHud();
    this.boardView = new BoardView(this, this.layout);
    this.renderBoard();
    this.renderTray();

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.onPointerMove(pointer));
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => this.onPointerUp(pointer));
    this.input.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => this.onPointerUp(pointer));
  }

  private createHud(): void {
    const { hudTop, width } = this.layout;
    this.scoreText = this.add.text(16, hudTop, 'Score: 0', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.highScoreText = this.add
      .text(width - 16, hudTop, `Best: ${this.highScore}`, {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#c7c7d9',
      })
      .setOrigin(1, 0);
  }

  private renderBoard(): void {
    const grid = this.engine.getState().grid;
    this.boardView.render(grid, (x, y) => this.colorGrid[y][x]);
  }

  private renderTray(): void {
    for (const slot of this.traySlots) slot.root.destroy();
    this.traySlots = [];

    const { trayTop, traySlotSize, traySlotGap, width } = this.layout;
    const totalWidth = traySlotSize * 3 + traySlotGap * 2;
    const startX = (width - totalWidth) / 2;
    const centerY = trayTop + this.layout.trayHeight / 2;

    const hand = this.engine.getState().hand;
    hand.forEach((piece, index) => {
      const slotCenterX = startX + index * (traySlotSize + traySlotGap) + traySlotSize / 2;
      const root = this.add.container(slotCenterX, centerY);

      const bg = this.add.rectangle(0, 0, traySlotSize, traySlotSize, 0x2a2a3c);
      root.add(bg);

      if (piece) {
        const pieceContainer = drawPieceCells(this, piece, traySlotSize - 16);
        root.add(pieceContainer);
      }

      const hitSize = Math.max(44, traySlotSize);
      const zone = this.add.rectangle(0, 0, hitSize, hitSize, 0x000000, 0);
      zone.setInteractive({ useHandCursor: true });
      root.add(zone);

      if (piece) {
        zone.on('pointerdown', () => this.startDrag(index));
      }

      this.traySlots.push({ root, zone, index });
    });
  }

  private startDrag(index: number): void {
    if (this.dragging) return;
    const piece = this.engine.getState().hand[index];
    if (!piece) return;
    this.dragging = true;
    this.dragIndex = index;
    this.dragPiece = piece;
    this.traySlots[index].root.setAlpha(0.35);
  }

  private computeDragOrigin(pointer: Phaser.Input.Pointer): Coord {
    const liftOffset = this.layout.cellSize * 1.5;
    return this.boardView.screenToGrid(pointer.x, pointer.y - liftOffset);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.dragging || !this.dragPiece) return;
    const origin = this.computeDragOrigin(pointer);
    const valid = canPlace(this.engine.getState().grid, this.dragPiece, origin);
    const cells = this.dragPiece.cells.map((c) => ({ x: origin.x + c.x, y: origin.y + c.y }));
    this.boardView.showGhost(cells, valid);
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.dragging || !this.dragPiece) return;
    const index = this.dragIndex;
    const piece = this.dragPiece;
    const origin = this.computeDragOrigin(pointer);
    const valid = canPlace(this.engine.getState().grid, piece, origin);

    this.boardView.clearGhost();
    this.traySlots[index]?.root.setAlpha(1);
    this.dragging = false;
    this.dragIndex = -1;
    this.dragPiece = null;

    if (!valid) return;

    const result = this.engine.tryPlace(index, origin);
    if (!result.ok) return;

    for (const cell of result.placedCells) this.colorGrid[cell.y][cell.x] = piece.colorId;
    for (const cell of result.clearedCells) this.colorGrid[cell.y][cell.x] = null;

    const score = this.engine.getState().score;
    this.scoreText.setText(`Score: ${score}`);
    if (score > this.highScore) {
      this.highScore = score;
      this.highScoreText.setText(`Best: ${this.highScore}`);
    }
    document.getElementById('score-debug')?.setAttribute('data-score', String(score));
    this.renderBoard();
    this.renderTray();

    if (result.triggeredPerkSelect) {
      // Perk-select UI lands in M3; auto-resolve with no perk chosen so play continues.
      this.engine.choosePerk();
    }

    if (this.engine.getState().status === 'game_over') {
      this.handleGameOver();
    }
  }

  private handleGameOver(): void {
    const score = this.engine.getState().score;
    const newHighScore = saveHighScoreIfBetter(score);
    const isNewHighScore = newHighScore === score && score > 0;
    this.time.delayedCall(400, () => {
      this.scene.start('GameOverScene', { score, highScore: newHighScore, isNewHighScore });
    });
  }
}
