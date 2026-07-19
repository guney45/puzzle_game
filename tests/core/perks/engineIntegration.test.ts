import { describe, expect, test } from 'vitest';
import { createEmptyGrid, setCell } from '../../../src/core/grid';
import { getPieceById } from '../../../src/core/pieces';
import { PERK_EVERY_N_CLEARS, SCORE_PER_PLACED_CELL } from '../../../src/config/constants';
import type { Hand } from '../../../src/core/types';
import { buildEngine } from './helpers';

describe('perk framework — engine integration (02 §2.7 AC)', () => {
  test('reaching PERK_EVERY_N_CLEARS clears opens the perk modal with 3 distinct offered ids', () => {
    const grid = createEmptyGrid();
    for (let x = 0; x < 8; x++) setCell(grid, x, 0, 1); // row 0 missing only x=8
    const hand: Hand = [getPieceById('single'), null, null];
    const engine = buildEngine({ grid, hand, clearsSinceLastPerk: PERK_EVERY_N_CLEARS - 1 });

    const result = engine.tryPlace(0, { x: 8, y: 0 });

    expect(result.triggeredPerkSelect).toBe(true);
    const state = engine.getState();
    expect(state.status).toBe('perk_select');
    expect(state.pendingPerkChoices).toHaveLength(3);
    expect(new Set(state.pendingPerkChoices).size).toBe(3);
  });

  test('Corner Master (AC example): a corner placement visibly scores the flat +10 bonus', () => {
    const hand: Hand = [getPieceById('single'), null, null];
    const engine = buildEngine({ hand, activePerks: ['corner-master'] });

    const result = engine.tryPlace(0, { x: 0, y: 0 });

    expect(result.scoreDelta).toBe(1 * SCORE_PER_PLACED_CELL + 10);
    expect(engine.getState().score).toBe(11);
  });

  test('Overflow (AC example): clearing a row also clears the row above it', () => {
    const grid = createEmptyGrid();
    for (let x = 0; x < 8; x++) setCell(grid, x, 3, 1); // row3 missing only x=8
    setCell(grid, 0, 2, 1); // row2 partially filled — not full on its own
    setCell(grid, 1, 2, 1);
    const hand: Hand = [getPieceById('single'), null, null];
    const engine = buildEngine({ grid, hand, activePerks: ['overflow'] });

    const result = engine.tryPlace(0, { x: 8, y: 3 });

    expect(result.clearedLines.rows.slice().sort((a, b) => a - b)).toEqual([2, 3]);
    const state = engine.getState();
    expect(state.grid[2].every((c) => c === 0)).toBe(true);
    expect(state.grid[3].every((c) => c === 0)).toBe(true);
  });

  test('Box Bonus: doubles the score from clearing a 3×3 box', () => {
    const grid = createEmptyGrid();
    // Fill box 0 (x0-2, y0-2) except (2,2), and nothing else — an isolated box clear.
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        if (x === 2 && y === 2) continue;
        setCell(grid, x, y, 1);
      }
    }
    const hand: Hand = [getPieceById('single'), null, null];
    const withPerk = buildEngine({ grid, hand, activePerks: ['box-bonus'] });
    const withoutPerk = buildEngine({ grid: grid.map((row) => [...row]), hand, activePerks: [] });

    const resultWith = withPerk.tryPlace(0, { x: 2, y: 2 });
    const resultWithout = withoutPerk.tryPlace(0, { x: 2, y: 2 });

    expect(resultWithout.clearedLines).toEqual({ rows: [], cols: [], boxes: [0] });
    expect(resultWith.scoreDelta).toBeGreaterThan(resultWithout.scoreDelta);
    expect(resultWith.scoreDelta - 1).toBe((resultWithout.scoreDelta - 1) * 2); // line points doubled
  });

  test('Momentum: score bonus stacks across consecutive clearing placements and resets on a whiff', () => {
    const grid = createEmptyGrid();
    for (let x = 0; x < 8; x++) setCell(grid, x, 0, 1); // row0 missing x=8
    for (let x = 0; x < 8; x++) setCell(grid, x, 1, 1); // row1 missing x=8
    const hand: Hand = [getPieceById('single'), getPieceById('single'), getPieceById('single')];
    const engine = buildEngine({ grid, hand, activePerks: ['momentum'] });

    const first = engine.tryPlace(0, { x: 8, y: 0 }); // clears row0: streak 1 (+5)
    const second = engine.tryPlace(1, { x: 8, y: 1 }); // clears row1: streak 2 (+10)
    const third = engine.tryPlace(2, { x: 0, y: 3 }); // no clear: streak resets

    expect(first.scoreDelta).toBe(1 + 10 + 5);
    expect(second.scoreDelta).toBe(1 + 10 + 10);
    expect(third.scoreDelta).toBe(1); // placement only, no momentum bonus
  });

  test('useActiveAbility: Fresh Hand deals a new hand only once per run and only while owned', () => {
    const hand: Hand = [getPieceById('single'), getPieceById('single'), getPieceById('single')];
    const engine = buildEngine({ hand, activePerks: ['fresh-hand'] });

    engine.useActiveAbility('fresh-hand');
    const afterFirst = engine.getState().hand;
    expect(afterFirst.every((p) => p !== null)).toBe(true);

    engine.useActiveAbility('fresh-hand'); // second use is a no-op (once per run)
    expect(engine.getState().hand).toEqual(afterFirst);
  });

  test('useActiveAbility: ignores a perk id the run does not own', () => {
    const hand: Hand = [getPieceById('single'), null, null];
    const engine = buildEngine({ hand, activePerks: [] });
    const before = engine.getState();

    engine.useActiveAbility('fresh-hand');

    expect(engine.getState()).toEqual(before);
  });

  test('choosePerk adds the chosen perk to activePerks and its hooks apply on the next placement', () => {
    const grid = createEmptyGrid();
    const hand: Hand = [getPieceById('single'), null, null];
    const engine = buildEngine({ grid, hand, status: 'perk_select', pendingPerkChoices: ['corner-master'] });

    engine.choosePerk('corner-master');
    expect(engine.getState().status).toBe('playing');
    expect(engine.getState().activePerks).toEqual(['corner-master']);

    const result = engine.tryPlace(0, { x: 0, y: 0 });
    expect(result.scoreDelta).toBe(1 * SCORE_PER_PLACED_CELL + 10);
  });
});
