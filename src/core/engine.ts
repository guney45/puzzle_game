import { HAND_SIZE, PERK_EVERY_N_CLEARS } from '../config/constants';
import { applyClear, resolveClears } from './clearing';
import { canPlaceAnywhere } from './gameOver';
import { createEmptyGrid } from './grid';
import { canPlace, place } from './placement';
import { PIECE_CATALOGUE } from './pieces';
import { createRng, pickN, rngFromState, type Rng } from './rng';
import { scoreForPlacement } from './scoring';
import type { Coord, GameEvent, Hand, PerkId, PlaceResult, RunState } from './types';

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

// GameEngine owns RunState and orchestrates a turn. Deterministic from a seed (03 §3.4/3.5).
// Perk hooks are not wired yet (M3) — reaching PERK_EVERY_N_CLEARS just flips status to
// 'perk_select'; choosePerk() resolves it back to 'playing' with no gameplay effect for now.
export class GameEngine {
  private rng: Rng;
  private state: RunState;

  constructor(opts: GameEngineOptions) {
    this.rng = createRng(opts.seed);
    this.state = {
      grid: createEmptyGrid(),
      hand: this.dealHand(),
      score: 0,
      totalClears: 0,
      clearsSinceLastPerk: 0,
      activePerks: [],
      perkState: {},
      rngState: this.rng.getState(),
      status: 'playing',
    };
  }

  private dealHand(): Hand {
    return pickN(this.rng, PIECE_CATALOGUE, HAND_SIZE);
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

    const events: GameEvent[] = [];
    const { grid: placedGrid, placedCells } = place(this.state.grid, piece, at);
    events.push({ type: 'placed', cells: placedCells });

    const clearResult = resolveClears(placedGrid);
    const finalGrid = clearResult.lineCount > 0 ? applyClear(placedGrid, clearResult.clearedCells) : placedGrid;
    if (clearResult.lineCount > 0) {
      events.push({
        type: 'linesCleared',
        cells: clearResult.clearedCells,
        lines: clearResult.clearedLines,
        combo: clearResult.lineCount,
      });
    }

    const breakdown = scoreForPlacement(piece.size, clearResult.lineCount);

    const nextHand: Hand = [...this.state.hand];
    nextHand[pieceIndex] = null;
    let handEmpty = true;
    for (const heldPiece of nextHand) {
      if (heldPiece !== null) {
        handEmpty = false;
        break;
      }
    }
    if (handEmpty) {
      const freshHand: Hand = this.dealHand();
      for (let i = 0; i < freshHand.length; i++) {
        nextHand[i] = freshHand[i];
      }
      events.push({ type: 'handRefilled' });
    }

    const totalClears = this.state.totalClears + clearResult.lineCount;
    let clearsSinceLastPerk = this.state.clearsSinceLastPerk + clearResult.lineCount;

    let triggeredPerkSelect = false;
    let status: RunState['status'] = 'playing';
    if (clearsSinceLastPerk >= PERK_EVERY_N_CLEARS) {
      clearsSinceLastPerk -= PERK_EVERY_N_CLEARS;
      triggeredPerkSelect = true;
      status = 'perk_select';
      events.push({ type: 'perkSelectTriggered' });
    }

    const gameOver = !triggeredPerkSelect && !canPlaceAnywhere(finalGrid, nextHand);
    if (gameOver) {
      status = 'game_over';
      events.push({ type: 'gameOver' });
    }

    this.state = {
      ...this.state,
      grid: finalGrid,
      hand: nextHand,
      score: this.state.score + breakdown.total,
      totalClears,
      clearsSinceLastPerk,
      rngState: this.rng.getState(),
      status,
    };

    return {
      ok: true,
      placedCells,
      clearedCells: clearResult.clearedCells,
      clearedLines: clearResult.clearedLines,
      combo: clearResult.lineCount,
      scoreDelta: breakdown.total,
      triggeredPerkSelect,
      gameOver,
      events,
    };
  }

  // Resolves a pending PERK_SELECT. perkId is recorded but has no gameplay effect until
  // the perk framework lands in M3.
  choosePerk(perkId?: PerkId): void {
    if (this.state.status !== 'perk_select') return;
    const activePerks = perkId ? [...this.state.activePerks, perkId] : this.state.activePerks;
    const gameOver = !canPlaceAnywhere(this.state.grid, this.state.hand);
    this.state = {
      ...this.state,
      activePerks,
      status: gameOver ? 'game_over' : 'playing',
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
