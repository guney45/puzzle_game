import { GRID_SIZE } from '../config/constants';

// Design canvas matches the iPhone 12 logical portrait size (02 §2.12): 390×844pt.
// Phaser Scale.FIT scales this to whatever the real viewport is, so the layout math
// below stays proportionally correct on other phones too.
export const DESIGN_WIDTH = 390;
export const DESIGN_HEIGHT = 844;

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// Reads env(safe-area-inset-*) via a hidden probe element in index.html so the HUD/tray
// can pad around the iPhone notch and home indicator (03 §3.1.1).
export function readSafeAreaInsets(): SafeAreaInsets {
  const probe = document.getElementById('safe-area-probe');
  if (!probe) return { top: 0, right: 0, bottom: 0, left: 0 };
  const style = window.getComputedStyle(probe);
  return {
    top: Number.parseFloat(style.paddingTop) || 0,
    right: Number.parseFloat(style.paddingRight) || 0,
    bottom: Number.parseFloat(style.paddingBottom) || 0,
    left: Number.parseFloat(style.paddingLeft) || 0,
  };
}

export interface GameLayout {
  width: number;
  height: number;
  insets: SafeAreaInsets;
  hudTop: number;
  hudHeight: number;
  boardLeft: number;
  boardTop: number;
  boardSize: number;
  cellSize: number;
  trayTop: number;
  trayHeight: number;
  traySlotSize: number;
  traySlotGap: number;
}

const MARGIN = 16;
const HUD_HEIGHT = 64;
const TRAY_HEIGHT = 120;
const GAP = 12;

export function computeLayout(insets: SafeAreaInsets): GameLayout {
  const width = DESIGN_WIDTH;
  const height = DESIGN_HEIGHT;

  const hudTop = insets.top + 12;
  const hudHeight = HUD_HEIGHT;
  const boardTopMin = hudTop + hudHeight + GAP;

  const trayBottom = height - insets.bottom - 16;
  const trayTop = trayBottom - TRAY_HEIGHT;
  const boardBottomMax = trayTop - GAP;

  const boardAvailableWidth = width - MARGIN * 2;
  const boardAvailableHeight = boardBottomMax - boardTopMin;
  const boardSize = Math.max(0, Math.min(boardAvailableWidth, boardAvailableHeight));

  const boardLeft = (width - boardSize) / 2;
  const boardTop = boardTopMin + Math.max(0, (boardAvailableHeight - boardSize) / 2);
  const cellSize = boardSize / GRID_SIZE;

  const traySlotGap = 10;
  const traySlotSize = (boardAvailableWidth - traySlotGap * 2) / 3;

  return {
    width,
    height,
    insets,
    hudTop,
    hudHeight,
    boardLeft,
    boardTop,
    boardSize,
    cellSize,
    trayTop,
    trayHeight: TRAY_HEIGHT,
    traySlotSize,
    traySlotGap,
  };
}
