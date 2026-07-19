import { describe, expect, test } from 'vitest';
import { createEmptyGrid, setCell } from '../../../src/core/grid';
import { getPieceById } from '../../../src/core/pieces';
import { PERKS } from '../../../src/core/perks/perks';
import type { Perk, ScoreEvent } from '../../../src/core/perks/perkTypes';
import type { Hand, PlaceResult } from '../../../src/core/types';
import { makeCtx } from './fakeContext';

function getPerkOrThrow(id: string): Perk {
  const perk = PERKS.find((p) => p.id === id);
  if (!perk) throw new Error(`missing perk ${id}`);
  return perk;
}

describe('starter perks — one focused hook test per perk (02 §2.7)', () => {
  test('1. Corner Master: +10 when a placed piece touches a board corner, nothing otherwise', () => {
    const perk = getPerkOrThrow('corner-master');
    const single = getPieceById('single');

    const corner = makeCtx();
    perk.onAfterPlace!(single, { x: 0, y: 0 }, corner.ctx);
    expect(corner.calls.scoreDelta).toBe(10);

    const middle = makeCtx();
    perk.onAfterPlace!(single, { x: 4, y: 4 }, middle.ctx);
    expect(middle.calls.scoreDelta).toBe(0);
  });

  test('2. Combo Fiend: bumps a 2+-line combo bonus up one tier (×1.5), ignores single-line events', () => {
    const perk = getPerkOrThrow('combo-fiend');
    const piece = getPieceById('single');
    const { ctx } = makeCtx();

    const comboEvent: ScoreEvent = { type: 'combo', piece, at: { x: 0, y: 0 }, lineCount: 2 };
    expect(perk.scoreModifier!(20, comboEvent, ctx)).toBe(30);

    const singleLineEvent: ScoreEvent = { type: 'combo', piece, at: { x: 0, y: 0 }, lineCount: 1 };
    expect(perk.scoreModifier!(0, singleLineEvent, ctx)).toBe(0);
  });

  test('3. Box Bonus: doubles a box-clear event, leaves row/col clears untouched', () => {
    const perk = getPerkOrThrow('box-bonus');
    const piece = getPieceById('single');
    const { ctx } = makeCtx();

    const boxEvent: ScoreEvent = { type: 'lineClear', piece, at: { x: 0, y: 0 }, lineKind: 'box', lineCount: 1 };
    expect(perk.scoreModifier!(10, boxEvent, ctx)).toBe(20);

    const rowEvent: ScoreEvent = { ...boxEvent, lineKind: 'row' };
    expect(perk.scoreModifier!(10, rowEvent, ctx)).toBe(10);
  });

  test('4. Momentum: stacking +5 per consecutive clearing placement, reset by a whiff', () => {
    const perk = getPerkOrThrow('momentum');
    const first = makeCtx();
    perk.onClearResolved!({ combo: 1 } as unknown as PlaceResult, first.ctx);
    expect(first.calls.scoreDelta).toBe(5);

    const second = makeCtx({ run: first.ctx.run });
    perk.onClearResolved!({ combo: 1 } as unknown as PlaceResult, second.ctx);
    expect(second.calls.scoreDelta).toBe(10); // streak 2

    const whiff = makeCtx({ run: second.ctx.run });
    perk.onClearResolved!({ combo: 0 } as unknown as PlaceResult, whiff.ctx);
    expect(whiff.calls.scoreDelta).toBe(0);
    expect((whiff.ctx.run.perkState['momentum'] as { streak: number }).streak).toBe(0);
  });

  test('5. Full House: +200 jackpot only when a row, a column, and a box all clear together', () => {
    const perk = getPerkOrThrow('full-house');
    const jackpot = makeCtx();
    perk.onClearResolved!(
      { clearedLines: { rows: [0], cols: [0], boxes: [0] } } as unknown as PlaceResult,
      jackpot.ctx,
    );
    expect(jackpot.calls.scoreDelta).toBe(200);

    const partial = makeCtx();
    perk.onClearResolved!(
      { clearedLines: { rows: [0], cols: [0], boxes: [] } } as unknown as PlaceResult,
      partial.ctx,
    );
    expect(partial.calls.scoreDelta).toBe(0);
  });

  test('6. Minimalist: every 4th piece across successive deals becomes a 1×1 single', () => {
    const perk = getPerkOrThrow('minimalist');
    const { ctx } = makeCtx();
    const hand1 = [getPieceById('line1x3'), getPieceById('line1x3'), getPieceById('line1x3')];
    const out1 = perk.onHandGenerate!(hand1, ctx); // counts 1, 2, 3
    expect(out1.every((p) => p?.id === 'line1x3')).toBe(true);

    const hand2 = [getPieceById('line1x3'), getPieceById('line1x3'), getPieceById('line1x3')];
    const out2 = perk.onHandGenerate!(hand2, ctx); // counts 4, 5, 6
    expect(out2[0]?.id).toBe('single');
    expect(out2[1]?.id).toBe('line1x3');
    expect(out2[2]?.id).toBe('line1x3');
  });

  test('7. Slim Pickings: re-rolls any dealt 3×3 square into a different piece', () => {
    const perk = getPerkOrThrow('slim-pickings');
    const { ctx } = makeCtx();
    const hand = [getPieceById('square3x3'), getPieceById('single'), null];
    const out = perk.onHandGenerate!(hand, ctx);
    expect(out[0]?.id).not.toBe('square3x3');
    expect(out[1]?.id).toBe('single');
    expect(out[2]).toBeNull();
  });

  test('8. Twin Lines: replacements are always long-line pieces, and replacement does occur', () => {
    const perk = getPerkOrThrow('twin-lines');
    const { ctx } = makeCtx();
    const longLineIds = new Set(['line1x4', 'line4x1', 'line1x5', 'line5x1']);
    let hand: Hand = [getPieceById('single'), getPieceById('lTromino'), getPieceById('square2x2')];
    let replaced = false;
    for (let i = 0; i < 30; i++) {
      hand = perk.onHandGenerate!(hand, ctx);
      hand.forEach((piece) => {
        if (piece && longLineIds.has(piece.id)) replaced = true;
      });
    }
    expect(replaced).toBe(true);
  });

  test('9. Fresh Hand: deals a brand-new hand, usable once per run', () => {
    const perk = getPerkOrThrow('fresh-hand');
    const hand = [getPieceById('single'), getPieceById('single'), getPieceById('single')];
    const { ctx } = makeCtx({ hand });
    perk.activeAbility!(ctx);
    expect(ctx.hand.every((p) => p !== null)).toBe(true);

    const afterFirstUse = [...ctx.hand];
    perk.activeAbility!(ctx); // second use is a no-op
    expect(ctx.hand).toEqual(afterFirstUse);
  });

  test('10. Overflow: clearing a row also marks the row directly above it for clearing', () => {
    const perk = getPerkOrThrow('overflow');
    const { ctx } = makeCtx();
    const result = perk.modifyClears!({ rows: [3, 0], cols: [], boxes: [] }, ctx);
    expect(result.rows.slice().sort((a, b) => a - b)).toEqual([0, 2, 3]);
  });

  test('11. Chain Reaction: a 2+-line clear also clears one nearly-full (8/9) line', () => {
    const perk = getPerkOrThrow('chain-reaction');
    const grid = createEmptyGrid();
    for (let x = 0; x < 8; x++) setCell(grid, x, 5, 1); // row5 is 8/9 full

    const multi = makeCtx({ grid });
    const multiResult = perk.modifyClears!({ rows: [0, 1], cols: [], boxes: [] }, multi.ctx);
    expect(multiResult.rows).toContain(5);

    const single = makeCtx({ grid });
    const singleResult = perk.modifyClears!({ rows: [0], cols: [], boxes: [] }, single.ctx);
    expect(singleResult.rows).toEqual([0]);
  });

  test('12. Second Wind: rotates the board 90°, usable once per run', () => {
    const perk = getPerkOrThrow('second-wind');
    const grid = createEmptyGrid();
    setCell(grid, 0, 0, 1);
    const { ctx } = makeCtx({ grid });

    perk.activeAbility!(ctx);
    expect(ctx.grid[0][8]).toBe(1);
    expect(ctx.grid[0][0]).toBe(0);

    const afterFirstUse = ctx.grid.map((row) => [...row]);
    perk.activeAbility!(ctx); // second use is a no-op
    expect(ctx.grid).toEqual(afterFirstUse);
  });

  test('13. Bomb Draw: destroys a targeted filled cell, then a 3-turn cooldown blocks reuse', () => {
    const perk = getPerkOrThrow('bomb-draw');
    const grid = createEmptyGrid();
    setCell(grid, 4, 4, 1);
    const { ctx } = makeCtx({ grid, target: { x: 4, y: 4 } });

    perk.activeAbility!(ctx);
    expect(ctx.grid[4][4]).toBe(0);
    expect((ctx.run.perkState['bomb-draw'] as { cooldown: number }).cooldown).toBe(3);

    setCell(ctx.grid, 5, 5, 1);
    perk.activeAbility!(ctx); // still on cooldown
    expect(ctx.grid[5][5]).toBe(1);

    const single = getPieceById('single');
    perk.onAfterPlace!(single, { x: 0, y: 0 }, ctx);
    perk.onAfterPlace!(single, { x: 0, y: 0 }, ctx);
    perk.onAfterPlace!(single, { x: 0, y: 0 }, ctx);
    expect((ctx.run.perkState['bomb-draw'] as { cooldown: number }).cooldown).toBe(0);
  });

  test('14. Gap Filler: fills every empty cell fully enclosed by filled neighbors, once per run', () => {
    const perk = getPerkOrThrow('gap-filler');
    const grid = createEmptyGrid();
    setCell(grid, 3, 4, 1);
    setCell(grid, 5, 4, 1);
    setCell(grid, 4, 3, 1);
    setCell(grid, 4, 5, 1);
    const { ctx } = makeCtx({ grid });

    perk.activeAbility!(ctx);
    expect(ctx.grid[4][4]).toBe(1);
  });

  test('15. Greed: grants gold currency equal to lines cleared, nothing on a whiff', () => {
    const perk = getPerkOrThrow('greed');
    const clear = makeCtx();
    perk.onClearResolved!({ combo: 3 } as unknown as PlaceResult, clear.ctx);
    expect(clear.calls.currencyDelta).toBe(3);

    const whiff = makeCtx();
    perk.onClearResolved!({ combo: 0 } as unknown as PlaceResult, whiff.ctx);
    expect(whiff.calls.currencyDelta).toBe(0);
  });
});
