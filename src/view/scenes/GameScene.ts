import Phaser from 'phaser';
import { GRID_SIZE } from '../../config/constants';
import { GameEngine } from '../../core/engine';
import { canPlace } from '../../core/placement';
import { getPerk } from '../../core/perks/registry';
import type { Coord, Hand, PerkId } from '../../core/types';
import { getHighScore, saveHighScoreIfBetter } from '../../platform/storage.web';
import { computeLayout, readSafeAreaInsets, type GameLayout } from '../layout';
import { BoardView } from '../render/boardView';
import { drawPieceCells } from '../render/pieceView';

interface TraySlot {
  root: Phaser.GameObjects.Container;
  zone: Phaser.GameObjects.Rectangle;
  index: number;
}

// Wires touch drag-and-drop input to the core GameEngine and renders its state (03 §3.2:
// this scene owns pixels/input only, never game rules). Perk selection is an in-scene modal
// overlay (02 §2.9 PERK_SELECT pauses PLAYING) rather than a separate Phaser scene, to avoid
// juggling scene-launch/pause lifecycle for a simple 3-card picker.
export class GameScene extends Phaser.Scene {
  private engine!: GameEngine;
  private layout!: GameLayout;
  private boardView!: BoardView;
  private colorGrid: (string | null)[][] = [];
  private traySlots: TraySlot[] = [];
  private scoreText!: Phaser.GameObjects.Text;
  private highScoreText!: Phaser.GameObjects.Text;
  private ownedPerksText!: Phaser.GameObjects.Text;
  private abilityButtonsRoot!: Phaser.GameObjects.Container;
  private highScore = 0;

  private dragging = false;
  private dragIndex = -1;
  private dragPiece: Hand[number] = null;

  private perkOverlay: Phaser.GameObjects.Container | null = null;
  private armedAbility: PerkId | null = null;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.engine = new GameEngine({ seed: Date.now() });
    this.layout = computeLayout(readSafeAreaInsets());
    this.colorGrid = Array.from({ length: GRID_SIZE }, () => Array<string | null>(GRID_SIZE).fill(null));
    this.highScore = getHighScore();

    this.createHud();
    this.boardView = new BoardView(this, this.layout);
    this.renderBoard();
    this.renderTray();
    this.renderOwnedPerks();
    this.renderAbilityButtons();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.onPointerDown(pointer));
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.onPointerMove(pointer));
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => this.onPointerUp(pointer));
    this.input.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => this.onPointerUp(pointer));
  }

  private get inputLocked(): boolean {
    return this.perkOverlay !== null;
  }

  private createHud(): void {
    const { hudTop, width } = this.layout;
    this.scoreText = this.add.text(16, hudTop, 'Score: 0', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.highScoreText = this.add
      .text(width - 16, hudTop, `Best: ${this.highScore}`, {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#c7c7d9',
      })
      .setOrigin(1, 0);
    this.ownedPerksText = this.add.text(16, hudTop + 24, '', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#8fd694',
    });
    this.abilityButtonsRoot = this.add.container(0, 0);
  }

  private renderBoard(): void {
    const grid = this.engine.getState().grid;
    this.boardView.render(grid, (x, y) => this.colorGrid[y][x]);
  }

  private renderOwnedPerks(): void {
    const activePerks = this.engine.getState().activePerks;
    if (activePerks.length === 0) {
      this.ownedPerksText.setText('');
      return;
    }
    const names = activePerks.map((id) => getPerk(id)?.name ?? id);
    this.ownedPerksText.setText(`Perks: ${names.join(', ')}`);
  }

  private isAbilityAvailable(perkId: PerkId): boolean {
    const raw = this.engine.getState().perkState[perkId] as { used?: boolean; cooldown?: number } | undefined;
    if (!raw) return true;
    if (raw.used) return false;
    if (typeof raw.cooldown === 'number' && raw.cooldown > 0) return false;
    return true;
  }

  private renderAbilityButtons(): void {
    this.abilityButtonsRoot.removeAll(true);

    const activeAbilityIds = this.engine
      .getState()
      .activePerks.filter((id) => getPerk(id)?.hasActiveAbility);
    if (activeAbilityIds.length === 0) return;

    const { hudTop } = this.layout;
    const buttonHeight = 22;
    const gap = 6;
    let x = 16;
    const y = hudTop + 44;

    for (const perkId of activeAbilityIds) {
      const perk = getPerk(perkId);
      if (!perk) continue;
      const available = this.isAbilityAvailable(perkId);
      const armed = this.armedAbility === perkId;
      const label = armed ? `${perk.name} (tap board)` : perk.name;
      const textWidth = Math.max(60, label.length * 6.5);

      const container = this.add.container(x + textWidth / 2, y + buttonHeight / 2);
      const bg = this.add.rectangle(
        0,
        0,
        textWidth,
        buttonHeight,
        armed ? 0xf1c40f : available ? 0x4a90e2 : 0x3a3a4c,
      );
      const text = this.add
        .text(0, 0, label, { fontFamily: 'sans-serif', fontSize: '11px', color: '#ffffff' })
        .setOrigin(0.5);
      container.add([bg, text]);

      if (available || armed) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerup', () => this.onAbilityButtonTap(perkId));
      }

      this.abilityButtonsRoot.add(container);
      x += textWidth + gap;
    }
  }

  private onAbilityButtonTap(perkId: PerkId): void {
    if (this.inputLocked) return;
    if (perkId === 'bomb-draw') {
      this.armedAbility = this.armedAbility === perkId ? null : perkId;
      this.renderAbilityButtons();
      return;
    }
    this.engine.useActiveAbility(perkId);
    this.afterEngineMutation();
  }

  private renderTray(): void {
    for (const slot of this.traySlots) slot.root.destroy();
    this.traySlots = [];

    const { trayTop, traySlotSize, traySlotGap, width } = this.layout;
    const totalWidth = traySlotSize * 3 + traySlotGap * 2;
    const startX = (width - totalWidth) / 2;
    const centerY = trayTop + this.layout.trayHeight / 2;

    const hand = this.engine.getState().hand;
    hand.forEach((piece, index) => {
      const slotCenterX = startX + index * (traySlotSize + traySlotGap) + traySlotSize / 2;
      const root = this.add.container(slotCenterX, centerY);

      const bg = this.add.rectangle(0, 0, traySlotSize, traySlotSize, 0x2a2a3c);
      root.add(bg);

      if (piece) {
        const pieceContainer = drawPieceCells(this, piece, traySlotSize - 16);
        root.add(pieceContainer);
      }

      const hitSize = Math.max(44, traySlotSize);
      const zone = this.add.rectangle(0, 0, hitSize, hitSize, 0x000000, 0);
      zone.setInteractive({ useHandCursor: true });
      root.add(zone);

      if (piece) {
        zone.on('pointerdown', () => this.startDrag(index));
      }

      this.traySlots.push({ root, zone, index });
    });
  }

  private startDrag(index: number): void {
    if (this.inputLocked || this.armedAbility) return;
    if (this.dragging) return;
    const piece = this.engine.getState().hand[index];
    if (!piece) return;
    this.dragging = true;
    this.dragIndex = index;
    this.dragPiece = piece;
    this.traySlots[index].root.setAlpha(0.35);
  }

  private computeDragOrigin(pointer: Phaser.Input.Pointer): Coord {
    const liftOffset = this.layout.cellSize * 1.5;
    return this.boardView.screenToGrid(pointer.x, pointer.y - liftOffset);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.inputLocked || !this.armedAbility) return;
    // A targeted active ability (Bomb Draw) is armed: the next board tap is its target.
    const cell = this.boardView.screenToGrid(pointer.x, pointer.y);
    if (cell.x < 0 || cell.x >= GRID_SIZE || cell.y < 0 || cell.y >= GRID_SIZE) return;
    const perkId = this.armedAbility;
    this.armedAbility = null;
    this.engine.useActiveAbility(perkId, cell);
    this.afterEngineMutation();
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.inputLocked) return;
    if (!this.dragging || !this.dragPiece) return;
    const origin = this.computeDragOrigin(pointer);
    const valid = canPlace(this.engine.getState().grid, this.dragPiece, origin);
    const cells = this.dragPiece.cells.map((c) => ({ x: origin.x + c.x, y: origin.y + c.y }));
    this.boardView.showGhost(cells, valid);
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.inputLocked) return;
    if (!this.dragging || !this.dragPiece) return;
    const index = this.dragIndex;
    const piece = this.dragPiece;
    const origin = this.computeDragOrigin(pointer);
    const valid = canPlace(this.engine.getState().grid, piece, origin);

    this.boardView.clearGhost();
    this.traySlots[index]?.root.setAlpha(1);
    this.dragging = false;
    this.dragIndex = -1;
    this.dragPiece = null;

    if (!valid) return;

    const result = this.engine.tryPlace(index, origin);
    if (!result.ok) return;

    for (const cell of result.placedCells) this.colorGrid[cell.y][cell.x] = piece.colorId;
    for (const cell of result.clearedCells) this.colorGrid[cell.y][cell.x] = null;

    this.afterEngineMutation();

    if (result.triggeredPerkSelect) {
      const choices = this.engine.getState().pendingPerkChoices ?? [];
      this.showPerkSelectOverlay(choices);
    }
  }

  // Re-renders everything that can change after any engine mutation (placement or active
  // ability), and checks for game-over. Cheap for a board this small (03 §3.8).
  private afterEngineMutation(): void {
    const score = this.engine.getState().score;
    this.scoreText.setText(`Score: ${score}`);
    if (score > this.highScore) {
      this.highScore = score;
      this.highScoreText.setText(`Best: ${this.highScore}`);
    }
    document.getElementById('score-debug')?.setAttribute('data-score', String(score));
    this.renderBoard();
    this.renderTray();
    this.renderOwnedPerks();
    this.renderAbilityButtons();

    if (this.engine.getState().status === 'game_over') {
      this.handleGameOver();
    }
  }

  private showPerkSelectOverlay(choiceIds: PerkId[]): void {
    if (choiceIds.length === 0) {
      // Nothing offerable (all perks owned) — resolve with no pick so play continues.
      this.engine.choosePerk();
      this.afterEngineMutation();
      return;
    }

    const { width, height } = this.layout;
    const overlay = this.add.container(0, 0);
    overlay.setDepth(1000);

    const backdrop = this.add.rectangle(0, 0, width, height, 0x000000, 0.72).setOrigin(0, 0);
    backdrop.setInteractive();
    overlay.add(backdrop);

    overlay.add(
      this.add
        .text(width / 2, height * 0.22, 'Choose a Perk', {
          fontFamily: 'sans-serif',
          fontSize: '24px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );

    const cardWidth = width - 64;
    const cardHeight = 84;
    const gap = 16;
    const startY = height * 0.32;

    choiceIds.forEach((perkId, i) => {
      const perk = getPerk(perkId);
      const centerY = startY + i * (cardHeight + gap) + cardHeight / 2;
      const card = this.add.container(width / 2, centerY);

      const bg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x2a2a3c).setInteractive({ useHandCursor: true });
      const name = this.add
        .text(0, -cardHeight / 2 + 20, perk?.name ?? perkId, {
          fontFamily: 'sans-serif',
          fontSize: '18px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      const desc = this.add
        .text(0, 4, perk?.description ?? '', {
          fontFamily: 'sans-serif',
          fontSize: '13px',
          color: '#c7c7d9',
          align: 'center',
          wordWrap: { width: cardWidth - 24 },
        })
        .setOrigin(0.5, 0);
      card.add([bg, name, desc]);
      overlay.add(card);

      bg.on('pointerup', () => {
        this.engine.choosePerk(perkId);
        overlay.destroy();
        this.perkOverlay = null;
        this.afterEngineMutation();
      });
    });

    this.perkOverlay = overlay;
  }

  private handleGameOver(): void {
    const score = this.engine.getState().score;
    const newHighScore = saveHighScoreIfBetter(score);
    const isNewHighScore = newHighScore === score && score > 0;
    this.time.delayedCall(400, () => {
      this.scene.start('GameOverScene', { score, highScore: newHighScore, isNewHighScore });
    });
  }
}
