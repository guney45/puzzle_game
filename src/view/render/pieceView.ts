import Phaser from 'phaser';
import type { Piece } from '../../core/types';
import { colorForPiece } from './colors';

// Draws a piece's cells inside a container, scaled to fit within maxSize×maxSize,
// centered on the piece's own bounding box (so odd shapes sit visually centered).
export function drawPieceCells(
  scene: Phaser.Scene,
  piece: Piece,
  maxSize: number,
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);
  const xs = piece.cells.map((c) => c.x);
  const ys = piece.cells.map((c) => c.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX + 1;
  const spanY = maxY - minY + 1;
  const cellSize = Math.min(maxSize / spanX, maxSize / spanY);
  const boundsW = spanX * cellSize;
  const boundsH = spanY * cellSize;
  const offsetX = -boundsW / 2;
  const offsetY = -boundsH / 2;
  const pad = 1.5;
  const color = colorForPiece(piece.colorId);

  for (const cell of piece.cells) {
    const localX = (cell.x - minX) * cellSize + cellSize / 2 + offsetX;
    const localY = (cell.y - minY) * cellSize + cellSize / 2 + offsetY;
    const rect = scene.add.rectangle(localX, localY, cellSize - pad * 2, cellSize - pad * 2, color);
    container.add(rect);
  }
  return container;
}

export function pieceCellSize(piece: Piece, maxSize: number): number {
  const xs = piece.cells.map((c) => c.x);
  const ys = piece.cells.map((c) => c.y);
  const spanX = Math.max(...xs) - Math.min(...xs) + 1;
  const spanY = Math.max(...ys) - Math.min(...ys) + 1;
  return Math.min(maxSize / spanX, maxSize / spanY);
}
