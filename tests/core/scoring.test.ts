import { describe, expect, test } from 'vitest';
import { SCORE_COMBO_MULTIPLIER, SCORE_PER_LINE_CLEAR, SCORE_PER_PLACED_CELL } from '../../src/config/constants';
import { comboBonusPoints, linePoints, placementPoints, scoreForPlacement } from '../../src/core/scoring';

describe('scoring', () => {
  test('placementPoints scales with piece size', () => {
    expect(placementPoints(1)).toBe(1 * SCORE_PER_PLACED_CELL);
    expect(placementPoints(4)).toBe(4 * SCORE_PER_PLACED_CELL);
  });

  test('linePoints scales with number of lines cleared', () => {
    expect(linePoints(0)).toBe(0);
    expect(linePoints(1)).toBe(SCORE_PER_LINE_CLEAR);
    expect(linePoints(3)).toBe(3 * SCORE_PER_LINE_CLEAR);
  });

  test('comboBonusPoints is zero for 0 or 1 lines cleared', () => {
    expect(comboBonusPoints(0, linePoints(0))).toBe(0);
    expect(comboBonusPoints(1, linePoints(1))).toBe(0);
  });

  test('comboBonusPoints applies the combo multiplier for 2+ simultaneous clears', () => {
    const lp2 = linePoints(2);
    const lp3 = linePoints(3);
    const lp4 = linePoints(4);
    expect(comboBonusPoints(2, lp2)).toBe(lp2 * (SCORE_COMBO_MULTIPLIER - 1));
    expect(comboBonusPoints(3, lp3)).toBe(lp3 * (SCORE_COMBO_MULTIPLIER - 1));
    expect(comboBonusPoints(4, lp4)).toBe(lp4 * (SCORE_COMBO_MULTIPLIER - 1));
  });

  test('scoreForPlacement: no clear — only placement points', () => {
    const result = scoreForPlacement(3, 0);
    expect(result).toEqual({
      placementPoints: 3 * SCORE_PER_PLACED_CELL,
      linePoints: 0,
      comboBonus: 0,
      total: 3 * SCORE_PER_PLACED_CELL,
    });
  });

  test('scoreForPlacement: single line clear — exact values', () => {
    const result = scoreForPlacement(4, 1);
    const expectedLine = 1 * SCORE_PER_LINE_CLEAR;
    expect(result).toEqual({
      placementPoints: 4 * SCORE_PER_PLACED_CELL,
      linePoints: expectedLine,
      comboBonus: 0,
      total: 4 * SCORE_PER_PLACED_CELL + expectedLine,
    });
  });

  test('scoreForPlacement: 2-line combo — exact values', () => {
    const result = scoreForPlacement(2, 2);
    const expectedLine = 2 * SCORE_PER_LINE_CLEAR;
    const expectedCombo = expectedLine * (SCORE_COMBO_MULTIPLIER - 1);
    expect(result).toEqual({
      placementPoints: 2 * SCORE_PER_PLACED_CELL,
      linePoints: expectedLine,
      comboBonus: expectedCombo,
      total: 2 * SCORE_PER_PLACED_CELL + expectedLine + expectedCombo,
    });
  });

  test('scoreForPlacement: 3-line combo — exact values', () => {
    const result = scoreForPlacement(5, 3);
    const expectedLine = 3 * SCORE_PER_LINE_CLEAR;
    const expectedCombo = expectedLine * (SCORE_COMBO_MULTIPLIER - 1);
    expect(result.total).toBe(5 * SCORE_PER_PLACED_CELL + expectedLine + expectedCombo);
  });

  test('scoreForPlacement: 4-line combo — exact values', () => {
    const result = scoreForPlacement(9, 4);
    const expectedLine = 4 * SCORE_PER_LINE_CLEAR;
    const expectedCombo = expectedLine * (SCORE_COMBO_MULTIPLIER - 1);
    expect(result.total).toBe(9 * SCORE_PER_PLACED_CELL + expectedLine + expectedCombo);
  });
});
