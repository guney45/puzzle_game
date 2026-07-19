import { GRID_SIZE, HAND_SIZE } from '../../config/constants';
import { findAlmostFullLines } from '../clearing';
import { inBounds } from '../grid';
import { PIECE_CATALOGUE, getPieceById } from '../pieces';
import { pickN } from '../rng';
import type { CellState, Coord } from '../types';
import type { Perk } from './perkTypes';

const CORNERS: readonly Coord[] = [
  { x: 0, y: 0 },
  { x: GRID_SIZE - 1, y: 0 },
  { x: 0, y: GRID_SIZE - 1 },
  { x: GRID_SIZE - 1, y: GRID_SIZE - 1 },
];

const LONG_LINE_IDS = ['line1x4', 'line4x1', 'line1x5', 'line5x1'];

interface MomentumState {
  streak: number;
}
interface CounterState {
  count: number;
}
interface OnceState {
  used?: boolean;
}
interface CooldownState {
  cooldown: number;
}

// The ~15 starter perks (02 §2.7). Each hooks the engine's extension points from
// perkTypes.ts; none are special-cased in core rules. Numbering matches the GDD list.

// 1. Corner Master — placing a piece touching a board corner: +10 score.
const cornerMaster: Perk = {
  id: 'corner-master',
  name: 'Corner Master',
  description: 'Placing a piece touching a board corner scores +10.',
  iconId: 'corner-master',
  onAfterPlace(piece, at, ctx) {
    const touchesCorner = piece.cells.some((offset) => {
      const cell = { x: at.x + offset.x, y: at.y + offset.y };
      return CORNERS.some((corner) => corner.x === cell.x && corner.y === cell.y);
    });
    if (touchesCorner) ctx.addScore(10);
  },
};

// 2. Combo Fiend — combo multipliers are increased by one tier.
const comboFiend: Perk = {
  id: 'combo-fiend',
  name: 'Combo Fiend',
  description: 'Combo multipliers are bumped up by one tier.',
  iconId: 'combo-fiend',
  scoreModifier(base, ev) {
    if (ev.type === 'combo' && (ev.lineCount ?? 0) >= 2) {
      return Math.round(base * 1.5);
    }
    return base;
  },
};

// 3. Box Bonus — clearing a 3×3 box scores double.
const boxBonus: Perk = {
  id: 'box-bonus',
  name: 'Box Bonus',
  description: 'Clearing a 3×3 box scores double.',
  iconId: 'box-bonus',
  scoreModifier(base, ev) {
    if (ev.type === 'lineClear' && ev.lineKind === 'box') return base * 2;
    return base;
  },
};

// 4. Momentum — each consecutive clearing placement adds a stacking +5 (resets on no-clear).
const momentum: Perk = {
  id: 'momentum',
  name: 'Momentum',
  description: 'Each consecutive clearing placement adds a stacking +5, reset by a whiff.',
  iconId: 'momentum',
  onClearResolved(result, ctx) {
    const state = (ctx.run.perkState['momentum'] as MomentumState | undefined) ?? { streak: 0 };
    if (result.combo > 0) {
      state.streak += 1;
      ctx.addScore(5 * state.streak);
    } else {
      state.streak = 0;
    }
    ctx.run.perkState['momentum'] = state;
  },
};

// 5. Full House — clearing a row *and* column *and* box in one move: +200 jackpot.
const fullHouse: Perk = {
  id: 'full-house',
  name: 'Full House',
  description: 'Clear a row, a column, and a box in one move for a +200 jackpot.',
  iconId: 'full-house',
  onClearResolved(result, ctx) {
    const { rows, cols, boxes } = result.clearedLines;
    if (rows.length > 0 && cols.length > 0 && boxes.length > 0) ctx.addScore(200);
  },
};

// 6. Minimalist — every 4th piece dealt is a 1×1 single.
const minimalist: Perk = {
  id: 'minimalist',
  name: 'Minimalist',
  description: 'Every 4th piece dealt is a 1×1 single.',
  iconId: 'minimalist',
  onHandGenerate(hand, ctx) {
    const state = (ctx.run.perkState['minimalist'] as CounterState | undefined) ?? { count: 0 };
    const next = hand.map((piece) => {
      if (!piece) return piece;
      state.count += 1;
      return state.count % 4 === 0 ? getPieceById('single') : piece;
    });
    ctx.run.perkState['minimalist'] = state;
    return next;
  },
};

// 7. Slim Pickings — never be dealt a 3×3 square.
const slimPickings: Perk = {
  id: 'slim-pickings',
  name: 'Slim Pickings',
  description: 'You are never dealt the board-clogging 3×3 square.',
  iconId: 'slim-pickings',
  onHandGenerate(hand, ctx) {
    const pool = PIECE_CATALOGUE.filter((p) => p.id !== 'square3x3');
    return hand.map((piece) => (piece && piece.id === 'square3x3' ? pool[ctx.rng.nextInt(pool.length)] : piece));
  },
};

// 8. Twin Lines — bias the deck toward long lines (1×4 / 1×5) more often.
const twinLines: Perk = {
  id: 'twin-lines',
  name: 'Twin Lines',
  description: 'The deck is biased toward long line pieces (1×4 / 1×5).',
  iconId: 'twin-lines',
  onHandGenerate(hand, ctx) {
    return hand.map((piece) => {
      if (!piece) return piece;
      if (ctx.rng.next() < 0.35) {
        return getPieceById(LONG_LINE_IDS[ctx.rng.nextInt(LONG_LINE_IDS.length)]);
      }
      return piece;
    });
  },
};

// 9. Fresh Hand — once per run, an active ability: discard current hand, deal a new 3.
const freshHand: Perk = {
  id: 'fresh-hand',
  name: 'Fresh Hand',
  description: 'Once per run: discard your current hand and deal a fresh 3.',
  iconId: 'fresh-hand',
  hasActiveAbility: true,
  activeAbility(ctx) {
    const state = (ctx.run.perkState['fresh-hand'] as OnceState | undefined) ?? {};
    if (state.used) return;
    state.used = true;
    ctx.run.perkState['fresh-hand'] = state;
    const newHand = pickN(ctx.rng, PIECE_CATALOGUE, HAND_SIZE);
    newHand.forEach((piece, index) => ctx.replaceHandPiece(index, piece));
  },
};

// 10. Overflow — when you clear a row, also clear the row directly above it.
const overflow: Perk = {
  id: 'overflow',
  name: 'Overflow',
  description: 'Clearing a row also clears the row directly above it.',
  iconId: 'overflow',
  modifyClears(lines) {
    const rows = new Set(lines.rows);
    for (const r of lines.rows) {
      if (r > 0) rows.add(r - 1);
    }
    return { ...lines, rows: [...rows].sort((a, b) => a - b) };
  },
};

// 11. Chain Reaction — a placement clearing ≥2 lines also clears one almost-full (8/9) line.
const chainReaction: Perk = {
  id: 'chain-reaction',
  name: 'Chain Reaction',
  description: 'A placement clearing 2+ lines also clears one nearly-full (8/9) line.',
  iconId: 'chain-reaction',
  modifyClears(lines, ctx) {
    const total = lines.rows.length + lines.cols.length + lines.boxes.length;
    if (total < 2) return lines;

    const almost = findAlmostFullLines(ctx.grid);
    const candidates: Array<{ kind: 'row' | 'col' | 'box'; idx: number }> = [
      ...almost.rows.filter((r) => !lines.rows.includes(r)).map((idx) => ({ kind: 'row' as const, idx })),
      ...almost.cols.filter((c) => !lines.cols.includes(c)).map((idx) => ({ kind: 'col' as const, idx })),
      ...almost.boxes.filter((b) => !lines.boxes.includes(b)).map((idx) => ({ kind: 'box' as const, idx })),
    ];
    if (candidates.length === 0) return lines;

    const pick = candidates[ctx.rng.nextInt(candidates.length)];
    const next = { rows: [...lines.rows], cols: [...lines.cols], boxes: [...lines.boxes] };
    if (pick.kind === 'row') next.rows.push(pick.idx);
    else if (pick.kind === 'col') next.cols.push(pick.idx);
    else next.boxes.push(pick.idx);
    return next;
  },
};

// 12. Second Wind — active ability, once per run: rotate the entire board 90°.
const secondWind: Perk = {
  id: 'second-wind',
  name: 'Second Wind',
  description: 'Once per run: rotate the entire board 90°.',
  iconId: 'second-wind',
  hasActiveAbility: true,
  activeAbility(ctx) {
    const state = (ctx.run.perkState['second-wind'] as OnceState | undefined) ?? {};
    if (state.used) return;
    state.used = true;
    ctx.run.perkState['second-wind'] = state;

    const size = GRID_SIZE;
    const snapshot: CellState[][] = ctx.grid.map((row) => [...row]);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        ctx.setCell(x, y, snapshot[size - 1 - x][y]);
      }
    }
  },
};

// 13. Bomb Draw — active ability with a cooldown: destroy a single targeted cell.
const bombDraw: Perk = {
  id: 'bomb-draw',
  name: 'Bomb Draw',
  description: 'Destroy a single targeted cell. 3-turn cooldown after use.',
  iconId: 'bomb-draw',
  hasActiveAbility: true,
  onAfterPlace(_piece, _at, ctx) {
    const state = (ctx.run.perkState['bomb-draw'] as CooldownState | undefined) ?? { cooldown: 0 };
    if (state.cooldown > 0) {
      state.cooldown -= 1;
      ctx.run.perkState['bomb-draw'] = state;
    }
  },
  activeAbility(ctx) {
    const state = (ctx.run.perkState['bomb-draw'] as CooldownState | undefined) ?? { cooldown: 0 };
    if (state.cooldown > 0) return;
    const target = ctx.target;
    if (!target || !inBounds(target.x, target.y) || ctx.grid[target.y][target.x] !== 1) return;
    ctx.setCell(target.x, target.y, 0);
    state.cooldown = 3;
    ctx.run.perkState['bomb-draw'] = state;
  },
};

// 14. Gap Filler — once per run: fill all isolated single-empty gaps enclosed by filled cells.
const gapFiller: Perk = {
  id: 'gap-filler',
  name: 'Gap Filler',
  description: 'Once per run: fill every empty cell fully enclosed by filled neighbors.',
  iconId: 'gap-filler',
  hasActiveAbility: true,
  activeAbility(ctx) {
    const state = (ctx.run.perkState['gap-filler'] as OnceState | undefined) ?? {};
    if (state.used) return;
    state.used = true;
    ctx.run.perkState['gap-filler'] = state;

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (ctx.grid[y][x] !== 0) continue;
        const neighbors = [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ].filter(([nx, ny]) => inBounds(nx, ny));
        if (neighbors.length > 0 && neighbors.every(([nx, ny]) => ctx.grid[ny][nx] === 1)) {
          ctx.setCell(x, y, 1);
        }
      }
    }
  },
};

// 15. Greed — clears grant a small "gold" run-currency (unused beyond display in MVP).
const greed: Perk = {
  id: 'greed',
  name: 'Greed',
  description: 'Clears grant a small amount of gold (spend it in a later update).',
  iconId: 'greed',
  onClearResolved(result, ctx) {
    if (result.combo > 0) ctx.addCurrency(result.combo);
  },
};

export const PERKS: readonly Perk[] = [
  cornerMaster,
  comboFiend,
  boxBonus,
  momentum,
  fullHouse,
  minimalist,
  slimPickings,
  twinLines,
  freshHand,
  overflow,
  chainReaction,
  secondWind,
  bombDraw,
  gapFiller,
  greed,
];
