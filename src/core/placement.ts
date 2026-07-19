import { GRID_SIZE } from '../config/constants';
import { cloneGrid, inBounds } from './grid';
import type { Coord, Grid, Piece } from './types';

export function canPlace(grid: Grid, piece: Piece, at: Coord): boolean {
  for (const offset of piece.cells) {
    const x = at.x + offset.x;
    const y = at.y + offset.y;
    if (!inBounds(x, y)) return false;
    if (grid[y][x] !== 0) return false;
  }
  return true;
}

export function place(grid: Grid, piece: Piece, at: Coord): { grid: Grid; placedCells: Coord[] } {
  if (!canPlace(grid, piece, at)) {
    throw new Error(`Cannot place piece "${piece.id}" at (${at.x}, ${at.y})`);
  }
  const next = cloneGrid(grid);
  const placedCells: Coord[] = [];
  for (const offset of piece.cells) {
    const x = at.x + offset.x;
    const y = at.y + offset.y;
    next[y][x] = 1;
    placedCells.push({ x, y });
  }
  return { grid: next, placedCells };
}

export function enumerateValidPlacements(grid: Grid, piece: Piece): Coord[] {
  const placements: Coord[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (canPlace(grid, piece, { x, y })) placements.push({ x, y });
    }
  }
  return placements;
}
