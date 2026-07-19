import { HAND_SIZE, PERK_EVERY_N_CLEARS, SCORE_PER_LINE_CLEAR } from '../config/constants';
import { applyClear, cellsForClearedLines, resolveClears } from './clearing';
import { canPlaceAnywhere } from './gameOver';
import { cloneGrid, createEmptyGrid } from './grid';
import { canPlace, place } from './placement';
import type { Perk as _Perk, PerkContext, ScoreEvent } from './perks/perkTypes';
import { drawOffers, getPerk } from './perks/registry';
import { PIECE_CATALOGUE } from './pieces';
import { createRng, pickN, rngFromState, type Rng } from './rng';
import { comboBonusPoints, placementPoints } from './scoring';
import type { ClearedLines, Coord, GameEvent, Grid, Hand, PerkId, PlaceResult, RunState } from './types';

export interface GameEngineOptions {
  seed: number;
}

function emptyPlaceResult(): PlaceResult {
  return {
    ok: false,
    placedCells: [],
    clearedCells: [],
    clearedLines: { rows: [], cols: [], boxes: [] },
    combo: 0,
    scoreDelta: 0,
    triggeredPerkSelect: false,
    gameOver: false,
    events: [],
  };
}

// A turn's mutable working state, shared by every perk hook invocation this turn (03 §3.4).
// Perks mutate grid/hand/score/currency only through the controlled methods on PerkContext;
// this class is the concrete backing store the engine hands out as `ctx`.
class TurnContext implements PerkContext {
  grid: Grid;
  hand: Hand;
  rng: Rng;
  run: RunState;
  target?: Coord;
  scoreDelta = 0;
  currencyDelta = 0;

  constructor(grid: Grid, hand: Hand, rng: Rng, run: RunState, target?: Coord) {
    this.grid = grid;
    this.hand = hand;
    this.rng = rng;
    this.run = run;
    this.target = target;
  }

  addScore(n: number): void {
    this.scoreDelta += n;
  }

  addCurrency(n: number): void {
    this.currencyDelta += n;
  }

  setCell(x: number, y: number, value: 0 | 1): void {
    this.grid[y][x] = value;
  }

  replaceHandPiece(index: number, piece: Hand[number]): void {
    this.hand[index] = piece;
  }
}

// GameEngine owns RunState and orchestrates a turn. Deterministic from a seed (03 §3.4/3.5).
// Perks are not special-cased in core rules: at each documented hook point (02 §2.7) the
// engine iterates `state.activePerks` and calls the hook if the perk implements it.
export class GameEngine {
  private rng: Rng;
  private state: RunState;

  constructor(opts: GameEngineOptions) {
    this.rng = createRng(opts.seed);
    const bootstrapState: RunState = {
      grid: createEmptyGrid(),
      hand: [null, null, null],
      score: 0,
      totalClears: 0,
      clearsSinceLastPerk: 0,
      activePerks: [],
      perkState: {},
      rngState: this.rng.getState(),
      status: 'playing',
      runCurrency: 0,
    };
    this.state = { ...bootstrapState, hand: this.dealHand(bootstrapState) };
  }

  private activePerkList(): _Perk[] {
    return this.state.activePerks.map((id) => getPerk(id)).filter((p): p is _Perk => p !== undefined);
  }

  private dealHand(run: RunState): Hand {
    const dealt = pickN(this.rng, PIECE_CATALOGUE, HAND_SIZE);
    const ctx = new TurnContext(run.grid, dealt, this.rng, run);
    let hand: Hand = dealt;
    const perks = run.activePerks.map((id) => getPerk(id)).filter((p): p is _Perk => p !== undefined);
    for (const perk of perks) {
      if (perk.onHandGenerate) hand = perk.onHandGenerate(hand, ctx);
    }
    return hand;
  }

  getState(): Readonly<RunState> {
    return this.state;
  }

  canPlaceAnywhere(): boolean {
    return canPlaceAnywhere(this.state.grid, this.state.hand);
  }

  tryPlace(pieceIndex: number, at: Coord): PlaceResult {
    if (this.state.status !== 'playing') return emptyPlaceResult();

    const piece = this.state.hand[pieceIndex];
    if (!piece || !canPlace(this.state.grid, piece, at)) return emptyPlaceResult();

    const perks = this.activePerkList();
    const events: GameEvent[] = [];

    const nextHand: Hand = [...this.state.hand];
    const ctx = new TurnContext(this.state.grid, nextHand, this.rng, this.state);
    for (const perk of perks) perk.onBeforePlace?.(piece, at, ctx);

    const { grid: placedGrid, placedCells } = place(this.state.grid, piece, at);
    events.push({ type: 'placed', cells: placedCells });

    nextHand[pieceIndex] = null;
    ctx.grid = placedGrid;
    for (const perk of perks) perk.onAfterPlace?.(piece, at, ctx);

    const rawClear = resolveClears(placedGrid);
    let clearedLines: ClearedLines = rawClear.clearedLines;
    for (const perk of perks) {
      if (perk.modifyClears) clearedLines = perk.modifyClears(clearedLines, ctx);
    }
    const clearedCells = cellsForClearedLines(clearedLines);
    const lineCount = clearedLines.rows.length + clearedLines.cols.length + clearedLines.boxes.length;

    const finalGrid = lineCount > 0 ? applyClear(placedGrid, clearedCells) : placedGrid;
    if (lineCount > 0) {
      events.push({ type: 'linesCleared', cells: clearedCells, lines: clearedLines, combo: lineCount });
    }
    ctx.grid = finalGrid;

    // scoreDelta so far covers placement/line/combo points plus any ctx.addScore() calls
    // made from onBeforePlace/onAfterPlace/modifyClears.
    const scoreDeltaSoFar = this.resolveScore(piece, at, clearedLines, lineCount, perks, ctx);

    if (handIsEmpty(nextHand)) {
      const freshHand = this.dealHand(this.state);
      for (let i = 0; i < freshHand.length; i++) nextHand[i] = freshHand[i];
      events.push({ type: 'handRefilled' });
    }

    const totalClears = this.state.totalClears + lineCount;
    let clearsSinceLastPerk = this.state.clearsSinceLastPerk + lineCount;

    let triggeredPerkSelect = false;
    let status: RunState['status'] = 'playing';
    let pendingPerkChoices: PerkId[] | undefined;
    if (clearsSinceLastPerk >= PERK_EVERY_N_CLEARS) {
      clearsSinceLastPerk -= PERK_EVERY_N_CLEARS;
      triggeredPerkSelect = true;
      status = 'perk_select';
      pendingPerkChoices = drawOffers(this.rng, this.state.activePerks);
      events.push({ type: 'perkSelectTriggered' });
    }

    const gameOver = !triggeredPerkSelect && !canPlaceAnywhere(finalGrid, nextHand);
    if (gameOver) {
      status = 'game_over';
      events.push({ type: 'gameOver' });
    }

    const result: PlaceResult = {
      ok: true,
      placedCells,
      clearedCells,
      clearedLines,
      combo: lineCount,
      scoreDelta: scoreDeltaSoFar,
      triggeredPerkSelect,
      gameOver,
      events,
    };

    // onClearResolved may add further score/currency (Momentum, Full House, Greed) — fold
    // that on top of what's already accumulated before committing the final state.
    const scoreBeforeClearResolved = ctx.scoreDelta;
    for (const perk of perks) perk.onClearResolved?.(result, ctx);
    result.scoreDelta += ctx.scoreDelta - scoreBeforeClearResolved;

    if (gameOver) for (const perk of perks) perk.onGameOver?.(ctx);

    this.state = {
      ...this.state,
      grid: finalGrid,
      hand: nextHand,
      score: this.state.score + result.scoreDelta,
      runCurrency: (this.state.runCurrency ?? 0) + ctx.currencyDelta,
      totalClears,
      clearsSinceLastPerk,
      rngState: this.rng.getState(),
      status,
      pendingPerkChoices,
    };

    return result;
  }

  // Runs the scoreModifier hook chain over each scoring event this placement produced
  // (placement points, each cleared row/col/box, and the combo bonus), then applies any
  // ctx.addScore(...) calls perks made from onAfterPlace/modifyClears along the way.
  private resolveScore(
    piece: Hand[number],
    at: Coord,
    clearedLines: ClearedLines,
    lineCount: number,
    perks: _Perk[],
    ctx: TurnContext,
  ): number {
    if (!piece) return 0;

    const applyModifiers = (base: number, ev: ScoreEvent): number =>
      perks.reduce((value, perk) => (perk.scoreModifier ? perk.scoreModifier(value, ev, ctx) : value), base);

    const placementEvent: ScoreEvent = { type: 'placement', piece, at };
    const placementTotal = applyModifiers(placementPoints(piece.size), placementEvent);

    const kindTotals: Record<'row' | 'col' | 'box', number> = { row: 0, col: 0, box: 0 };
    const kindCounts: Record<'row' | 'col' | 'box', number> = {
      row: clearedLines.rows.length,
      col: clearedLines.cols.length,
      box: clearedLines.boxes.length,
    };
    for (const kind of ['row', 'col', 'box'] as const) {
      const base = kindCounts[kind] * SCORE_PER_LINE_CLEAR;
      const ev: ScoreEvent = { type: 'lineClear', piece, at, lineKind: kind, lineCount };
      kindTotals[kind] = applyModifiers(base, ev);
    }
    const lineTotal = kindTotals.row + kindTotals.col + kindTotals.box;

    const comboEvent: ScoreEvent = { type: 'combo', piece, at, lineCount };
    const comboTotal = applyModifiers(comboBonusPoints(lineCount, lineTotal), comboEvent);

    return placementTotal + lineTotal + comboTotal + ctx.scoreDelta;
  }

  // Resolves a pending PERK_SELECT: records the chosen perk (if any) as active. Passive
  // hook perks take effect automatically from the next placement onward; the framework
  // does not require any further "apply" step.
  choosePerk(perkId?: PerkId): void {
    if (this.state.status !== 'perk_select') return;
    const activePerks = perkId ? [...this.state.activePerks, perkId] : this.state.activePerks;
    const gameOver = !canPlaceAnywhere(this.state.grid, this.state.hand);
    this.state = {
      ...this.state,
      activePerks,
      pendingPerkChoices: undefined,
      status: gameOver ? 'game_over' : 'playing',
    };
  }

  // Fires a perk's active ability (02 §2.7 #9/#12/#13/#14). `target` is only used by perks
  // that need a specific cell (e.g. Bomb Draw); other active abilities ignore it.
  useActiveAbility(perkId: PerkId, target?: Coord): void {
    if (this.state.status !== 'playing') return;
    if (!this.state.activePerks.includes(perkId)) return;
    const perk = getPerk(perkId);
    if (!perk?.hasActiveAbility || !perk.activeAbility) return;

    const grid = cloneGrid(this.state.grid);
    const hand: Hand = [...this.state.hand];
    const ctx = new TurnContext(grid, hand, this.rng, this.state, target);
    perk.activeAbility(ctx);

    const gameOver = !canPlaceAnywhere(grid, hand);
    this.state = {
      ...this.state,
      grid,
      hand,
      score: this.state.score + ctx.scoreDelta,
      runCurrency: (this.state.runCurrency ?? 0) + ctx.currencyDelta,
      rngState: this.rng.getState(),
      status: gameOver ? 'game_over' : this.state.status,
    };
  }

  serialize(): string {
    return JSON.stringify(this.state);
  }

  static deserialize(serialized: string): GameEngine {
    const state = JSON.parse(serialized) as RunState;
    const engine = Object.create(GameEngine.prototype) as GameEngine;
    engine.rng = rngFromState(state.rngState);
    engine.state = state;
    return engine;
  }
}

function handIsEmpty(hand: Hand): boolean {
  return hand.every((p) => p === null);
}
