import { BOX_SIZE, GRID_SIZE } from '../config/constants';
import type { CellState, Coord, Grid } from './types';

export function createEmptyGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () => Array<CellState>(GRID_SIZE).fill(0));
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
}

export function getCell(grid: Grid, x: number, y: number): CellState {
  return grid[y][x];
}

export function setCell(grid: Grid, x: number, y: number, value: CellState): void {
  grid[y][x] = value;
}

const BOXES_PER_ROW = GRID_SIZE / BOX_SIZE;

export function boxIndexOf(x: number, y: number): number {
  const boxX = Math.floor(x / BOX_SIZE);
  const boxY = Math.floor(y / BOX_SIZE);
  return boxY * BOXES_PER_ROW + boxX;
}

export function boxOrigin(boxIndex: number): Coord {
  const boxX = boxIndex % BOXES_PER_ROW;
  const boxY = Math.floor(boxIndex / BOXES_PER_ROW);
  return { x: boxX * BOX_SIZE, y: boxY * BOX_SIZE };
}

export function boxCells(boxIndex: number): Coord[] {
  const origin = boxOrigin(boxIndex);
  const cells: Coord[] = [];
  for (let dy = 0; dy < BOX_SIZE; dy++) {
    for (let dx = 0; dx < BOX_SIZE; dx++) {
      cells.push({ x: origin.x + dx, y: origin.y + dy });
    }
  }
  return cells;
}
