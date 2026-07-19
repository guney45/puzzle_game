export type CellState = 0 | 1;
export type Grid = CellState[][]; // grid[y][x]

export interface Coord {
  x: number;
  y: number;
}

export interface Piece {
  id: string;
  cells: Coord[]; // offsets from the piece's origin
  colorId: string;
  size: number; // cells.length, cached
}

export type Hand = (Piece | null)[]; // length HAND_SIZE; null = already placed

export type PerkId = string;

export interface ClearedLines {
  rows: number[];
  cols: number[];
  boxes: number[];
}

export interface ClearResult {
  clearedCells: Coord[];
  clearedLines: ClearedLines;
  lineCount: number; // rows + cols + boxes cleared this step
}

export type GameStatus = 'playing' | 'perk_select' | 'game_over';

export interface RunState {
  grid: Grid;
  hand: Hand;
  score: number;
  totalClears: number;
  clearsSinceLastPerk: number;
  activePerks: PerkId[];
  perkState: Record<PerkId, unknown>;
  rngState: number; // serializable seed/state for save+resume
  status: GameStatus;
  pendingPerkChoices?: PerkId[];
}

export type GameEventType =
  | 'placed'
  | 'linesCleared'
  | 'handRefilled'
  | 'perkSelectTriggered'
  | 'gameOver';

export interface GameEvent {
  type: GameEventType;
  [key: string]: unknown;
}

// Result of committing a placement — the VIEW animates from this.
export interface PlaceResult {
  ok: boolean;
  placedCells: Coord[];
  clearedCells: Coord[];
  clearedLines: ClearedLines;
  combo: number;
  scoreDelta: number;
  triggeredPerkSelect: boolean;
  gameOver: boolean;
  events: GameEvent[];
}
