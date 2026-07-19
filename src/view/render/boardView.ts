import Phaser from 'phaser';
import { BOX_SIZE, GRID_SIZE } from '../../config/constants';
import type { Coord, Grid } from '../../core/types';
import type { GameLayout } from '../layout';
import {
  BOX_LINE_COLOR,
  EMPTY_CELL_COLOR,
  FILLED_DEFAULT_COLOR,
  GHOST_INVALID_COLOR,
  GHOST_VALID_COLOR,
  GRID_LINE_COLOR,
  colorForPiece,
} from './colors';

// Draws the 9×9 board (with 3×3 box separators), renders filled cells from core Grid state,
// and shows a valid/invalid ghost preview while a piece is being dragged (02 §2.10, §2.12).
export class BoardView {
  private scene: Phaser.Scene;
  private layout: GameLayout;
  private cells: Phaser.GameObjects.Rectangle[][] = [];
  private ghostCells: Phaser.GameObjects.Rectangle[] = [];
  readonly container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, layout: GameLayout) {
    this.scene = scene;
    this.layout = layout;
    this.container = scene.add.container(0, 0);
    this.drawGridLines();
    this.createCells();
  }

  private drawGridLines(): void {
    const { boardLeft, boardTop, boardSize, cellSize } = this.layout;
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(EMPTY_CELL_COLOR, 1);
    graphics.fillRect(boardLeft, boardTop, boardSize, boardSize);

    graphics.lineStyle(1, GRID_LINE_COLOR, 1);
    for (let i = 0; i <= GRID_SIZE; i++) {
      const x = boardLeft + i * cellSize;
      graphics.lineBetween(x, boardTop, x, boardTop + boardSize);
      const y = boardTop + i * cellSize;
      graphics.lineBetween(boardLeft, y, boardLeft + boardSize, y);
    }

    graphics.lineStyle(3, BOX_LINE_COLOR, 1);
    for (let i = 0; i <= GRID_SIZE; i += BOX_SIZE) {
      const x = boardLeft + i * cellSize;
      graphics.lineBetween(x, boardTop, x, boardTop + boardSize);
      const y = boardTop + i * cellSize;
      graphics.lineBetween(boardLeft, y, boardLeft + boardSize, y);
    }
    this.container.add(graphics);
  }

  private createCells(): void {
    const { boardLeft, boardTop, cellSize } = this.layout;
    const pad = 1.5;
    for (let y = 0; y < GRID_SIZE; y++) {
      const row: Phaser.GameObjects.Rectangle[] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        const rect = this.scene.add.rectangle(
          boardLeft + x * cellSize + cellSize / 2,
          boardTop + y * cellSize + cellSize / 2,
          cellSize - pad * 2,
          cellSize - pad * 2,
          EMPTY_CELL_COLOR,
        );
        rect.setVisible(false);
        this.container.add(rect);
        row.push(rect);
      }
      this.cells.push(row);
    }
  }

  render(grid: Grid, colorAt: (x: number, y: number) => string | null): void {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const filled = grid[y][x] !== 0;
        const rect = this.cells[y][x];
        if (filled) {
          const colorId = colorAt(x, y);
          rect.setFillStyle(colorId ? colorForPiece(colorId) : FILLED_DEFAULT_COLOR);
          rect.setVisible(true);
        } else {
          rect.setVisible(false);
        }
      }
    }
  }

  gridToScreen(cell: Coord): { x: number; y: number } {
    const { boardLeft, boardTop, cellSize } = this.layout;
    return {
      x: boardLeft + cell.x * cellSize + cellSize / 2,
      y: boardTop + cell.y * cellSize + cellSize / 2,
    };
  }

  screenToGrid(x: number, y: number): Coord {
    const { boardLeft, boardTop, cellSize } = this.layout;
    return {
      x: Math.floor((x - boardLeft) / cellSize),
      y: Math.floor((y - boardTop) / cellSize),
    };
  }

  showGhost(cells: Coord[], valid: boolean): void {
    this.clearGhost();
    const { cellSize } = this.layout;
    const color = valid ? GHOST_VALID_COLOR : GHOST_INVALID_COLOR;
    for (const cell of cells) {
      if (cell.x < 0 || cell.x >= GRID_SIZE || cell.y < 0 || cell.y >= GRID_SIZE) continue;
      const pos = this.gridToScreen(cell);
      const rect = this.scene.add.rectangle(pos.x, pos.y, cellSize - 3, cellSize - 3, color, 0.55);
      this.container.add(rect);
      this.ghostCells.push(rect);
    }
  }

  clearGhost(): void {
    for (const rect of this.ghostCells) rect.destroy();
    this.ghostCells = [];
  }
}
