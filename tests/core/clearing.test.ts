import { describe, expect, test } from 'vitest';
import { createEmptyGrid, setCell } from '../../src/core/grid';
import { applyClear, resolveClears } from '../../src/core/clearing';
import { GRID_SIZE } from '../../src/config/constants';

function fillRow(grid: ReturnType<typeof createEmptyGrid>, y: number): void {
  for (let x = 0; x < GRID_SIZE; x++) setCell(grid, x, y, 1);
}

function fillCol(grid: ReturnType<typeof createEmptyGrid>, x: number): void {
  for (let y = 0; y < GRID_SIZE; y++) setCell(grid, x, y, 1);
}

function fillBox(grid: ReturnType<typeof createEmptyGrid>, originX: number, originY: number): void {
  for (let dy = 0; dy < 3; dy++) {
    for (let dx = 0; dx < 3; dx++) setCell(grid, originX + dx, originY + dy, 1);
  }
}

describe('clearing', () => {
  test('nothing cleared on an empty or partially-filled board', () => {
    const grid = createEmptyGrid();
    setCell(grid, 0, 0, 1);
    const result = resolveClears(grid);
    expect(result.lineCount).toBe(0);
    expect(result.clearedCells).toHaveLength(0);
    expect(result.clearedLines).toEqual({ rows: [], cols: [], boxes: [] });
  });

  test('single full row clears', () => {
    const grid = createEmptyGrid();
    fillRow(grid, 4);
    const result = resolveClears(grid);
    expect(result.clearedLines).toEqual({ rows: [4], cols: [], boxes: [] });
    expect(result.lineCount).toBe(1);
    expect(result.clearedCells).toHaveLength(GRID_SIZE);
  });

  test('single full column clears', () => {
    const grid = createEmptyGrid();
    fillCol(grid, 2);
    const result = resolveClears(grid);
    expect(result.clearedLines).toEqual({ rows: [], cols: [2], boxes: [] });
    expect(result.lineCount).toBe(1);
    expect(result.clearedCells).toHaveLength(GRID_SIZE);
  });

  test('single full 3x3 box clears', () => {
    const grid = createEmptyGrid();
    fillBox(grid, 3, 3); // box index 4 (center)
    const result = resolveClears(grid);
    expect(result.clearedLines).toEqual({ rows: [], cols: [], boxes: [4] });
    expect(result.lineCount).toBe(1);
    expect(result.clearedCells).toHaveLength(9);
  });

  test('overlapping row + col + box union clears each cell once, counts each separately', () => {
    const grid = createEmptyGrid();
    // Fill row 0, col 0, and box 0 (top-left 3x3) — they overlap at (0,0), (1,0), (2,0), (0,1), (0,2).
    fillRow(grid, 0);
    fillCol(grid, 0);
    fillBox(grid, 0, 0);

    const result = resolveClears(grid);
    expect(result.clearedLines).toEqual({ rows: [0], cols: [0], boxes: [0] });
    expect(result.lineCount).toBe(3); // each line/box still counted separately for scoring

    // Union size: row(9) + col(9) + box(9) - overlaps, computed directly via a Set.
    const expectedCells = new Set<string>();
    for (let x = 0; x < GRID_SIZE; x++) expectedCells.add(`${x},0`);
    for (let y = 0; y < GRID_SIZE; y++) expectedCells.add(`0,${y}`);
    for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) expectedCells.add(`${dx},${dy}`);
    expect(result.clearedCells).toHaveLength(expectedCells.size);

    const actualKeys = new Set(result.clearedCells.map((c) => `${c.x},${c.y}`));
    expect(actualKeys).toEqual(expectedCells);
  });

  test('applyClear empties exactly the cleared cells and leaves the rest untouched', () => {
    const grid = createEmptyGrid();
    fillRow(grid, 5);
    setCell(grid, 3, 3, 1); // an unrelated filled cell
    const result = resolveClears(grid);
    const cleared = applyClear(grid, result.clearedCells);

    for (let x = 0; x < GRID_SIZE; x++) expect(cleared[5][x]).toBe(0);
    expect(cleared[3][3]).toBe(1); // untouched
    // original grid is not mutated
    expect(grid[5][0]).toBe(1);
  });
});
