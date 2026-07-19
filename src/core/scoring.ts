import { SCORE_COMBO_MULTIPLIER, SCORE_PER_LINE_CLEAR, SCORE_PER_PLACED_CELL } from '../config/constants';

// Single source of truth for scoring (02 §2.5). Perks hook in later via scoreModifier.
export interface ScoreBreakdown {
  placementPoints: number;
  linePoints: number;
  comboBonus: number;
  total: number;
}

export function placementPoints(cellsInPiece: number): number {
  return cellsInPiece * SCORE_PER_PLACED_CELL;
}

export function linePoints(lineCount: number): number {
  return lineCount * SCORE_PER_LINE_CLEAR;
}

// Simultaneous multi-clears (lineCount >= 2) earn an extra multiplier on top of linePoints.
export function comboBonusPoints(lineCount: number, linePointsForClear: number): number {
  if (lineCount < 2) return 0;
  return linePointsForClear * (SCORE_COMBO_MULTIPLIER - 1);
}

export function scoreForPlacement(cellsInPiece: number, lineCount: number): ScoreBreakdown {
  const placement = placementPoints(cellsInPiece);
  const line = linePoints(lineCount);
  const combo = comboBonusPoints(lineCount, line);
  return {
    placementPoints: placement,
    linePoints: line,
    comboBonus: combo,
    total: placement + line + combo,
  };
}
