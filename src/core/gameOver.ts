import { enumerateValidPlacements } from './placement';
import type { Grid, Hand } from './types';

// 02 §2.6: game over iff none of the currently-held pieces can be legally placed anywhere.
export function canPlaceAnywhere(grid: Grid, hand: Hand): boolean {
  for (const piece of hand) {
    if (!piece) continue;
    if (enumerateValidPlacements(grid, piece).length > 0) return true;
  }
  return false;
}
