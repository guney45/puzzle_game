import { BOX_SIZE, GRID_SIZE } from '../config/constants';
import { boxCells, cloneGrid } from './grid';
import type { ClearedLines, ClearResult, Coord, Grid } from './types';

const BOX_COUNT = (GRID_SIZE / BOX_SIZE) ** 2;

function coordKey(c: Coord): string {
  return `${c.x},${c.y}`;
}

export function findFullRows(grid: Grid): number[] {
  const rows: number[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    if (grid[y].every((cell) => cell === 1)) rows.push(y);
  }
  return rows;
}

export function findFullCols(grid: Grid): number[] {
  const cols: number[] = [];
  for (let x = 0; x < GRID_SIZE; x++) {
    let full = true;
    for (let y = 0; y < GRID_SIZE; y++) {
      if (grid[y][x] !== 1) {
        full = false;
        break;
      }
    }
    if (full) cols.push(x);
  }
  return cols;
}

export function findFullBoxes(grid: Grid): number[] {
  const boxes: number[] = [];
  for (let b = 0; b < BOX_COUNT; b++) {
    if (boxCells(b).every(({ x, y }) => grid[y][x] === 1)) boxes.push(b);
  }
  return boxes;
}

// Detects full rows/cols/boxes and computes the union of cells to clear. Does not mutate
// the grid or the counts — a cell shared by multiple cleared lines/boxes is cleared once,
// but each cleared row/col/box still counts separately for scoring & combos (02 §2.4).
export function resolveClears(grid: Grid): ClearResult {
  const rows = findFullRows(grid);
  const cols = findFullCols(grid);
  const boxes = findFullBoxes(grid);

  const clearedLines: ClearedLines = { rows, cols, boxes };
  const cellMap = new Map<string, Coord>();

  for (const y of rows) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const c = { x, y };
      cellMap.set(coordKey(c), c);
    }
  }
  for (const x of cols) {
    for (let y = 0; y < GRID_SIZE; y++) {
      const c = { x, y };
      cellMap.set(coordKey(c), c);
    }
  }
  for (const b of boxes) {
    for (const c of boxCells(b)) {
      cellMap.set(coordKey(c), c);
    }
  }

  return {
    clearedCells: [...cellMap.values()],
    clearedLines,
    lineCount: rows.length + cols.length + boxes.length,
  };
}

export function applyClear(grid: Grid, clearedCells: readonly Coord[]): Grid {
  const next = cloneGrid(grid);
  for (const { x, y } of clearedCells) next[y][x] = 0;
  return next;
}
