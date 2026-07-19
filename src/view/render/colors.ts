// Maps each piece catalogue colorId (02 §2.3) to a hex fill for rendering.
const COLOR_HEX: Record<string, number> = {
  blue: 0x4a90e2,
  green: 0x4caf50,
  yellow: 0xf1c40f,
  orange: 0xe67e22,
  purple: 0x9b59b6,
  red: 0xe74c3c,
  cyan: 0x1abc9c,
  pink: 0xe91e8c,
  teal: 0x16a085,
  lime: 0xa4de02,
  crimson: 0xc0392b,
  gold: 0xd4a017,
};

export function colorForPiece(colorId: string): number {
  return COLOR_HEX[colorId] ?? 0x888888;
}

export const EMPTY_CELL_COLOR = 0x2a2a3c;
export const GRID_LINE_COLOR = 0x3f3f52;
export const BOX_LINE_COLOR = 0x6f6f8c;
export const GHOST_VALID_COLOR = 0x4caf50;
export const GHOST_INVALID_COLOR = 0xe74c3c;
