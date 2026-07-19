import type { Rng } from '../rng';
import type { ClearedLines, Coord, Grid, Hand, Piece, PerkId, PlaceResult, RunState } from '../types';

export type ScoreEventType = 'placement' | 'lineClear' | 'combo';
export type LineKind = 'row' | 'col' | 'box';

export interface ScoreEvent {
  type: ScoreEventType;
  piece: Piece;
  at: Coord;
  lineKind?: LineKind; // set when type === 'lineClear'
  lineCount?: number; // total lines cleared this placement (type === 'combo' | 'lineClear')
}

// Read/controlled-write access to run state a perk hook may need (03 §3.4). Perks mutate
// grid/hand through these methods rather than reaching into RunState directly, so the engine
// stays the single place that decides how a turn is assembled.
export interface PerkContext {
  readonly grid: Grid;
  readonly hand: Hand;
  readonly rng: Rng;
  readonly run: RunState;
  readonly target?: Coord; // optional cell the player targeted (e.g. Bomb Draw)
  addScore(n: number): void;
  addCurrency(n: number): void;
  setCell(x: number, y: number, value: 0 | 1): void;
  replaceHandPiece(index: number, piece: Piece | null): void;
}

export interface Perk {
  id: PerkId;
  name: string;
  description: string;
  iconId: string;
  stackable?: boolean;
  hasActiveAbility?: boolean;
  onHandGenerate?(hand: Hand, ctx: PerkContext): Hand;
  onBeforePlace?(piece: Piece, at: Coord, ctx: PerkContext): void;
  onAfterPlace?(piece: Piece, at: Coord, ctx: PerkContext): void;
  modifyClears?(lines: ClearedLines, ctx: PerkContext): ClearedLines;
  scoreModifier?(base: number, ev: ScoreEvent, ctx: PerkContext): number;
  onClearResolved?(result: PlaceResult, ctx: PerkContext): void;
  activeAbility?(ctx: PerkContext): void;
  onGameOver?(ctx: PerkContext): void;
}
