import Phaser from 'phaser';
import { getSettings, saveSettings, type Settings } from '../../platform/storage.web';
import { computeLayout, readSafeAreaInsets } from '../layout';

type ToggleKey = keyof Settings;

// Sound, music, and reduce-motion toggles (02 §2.11), persisted via platform/storage.web.
export class SettingsScene extends Phaser.Scene {
  private settings!: Settings;

  constructor() {
    super('SettingsScene');
  }

  create(): void {
    this.settings = getSettings();
    this.syncDebugElement();

    const layout = computeLayout(readSafeAreaInsets());
    const centerX = layout.width / 2;

    this.add
      .text(centerX, layout.height * 0.18, 'Settings', {
        fontFamily: 'sans-serif',
        fontSize: '30px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const rows: Array<{ key: ToggleKey; label: string }> = [
      { key: 'soundOn', label: 'Sound' },
      { key: 'musicOn', label: 'Music' },
      { key: 'reduceMotion', label: 'Reduce Motion' },
    ];

    const rowHeight = 64;
    const startY = layout.height * 0.3;

    rows.forEach((row, i) => {
      const y = startY + i * rowHeight;
      this.add
        .text(32, y, row.label, {
          fontFamily: 'sans-serif',
          fontSize: '18px',
          color: '#ffffff',
        })
        .setOrigin(0, 0.5);

      const toggleWidth = 72;
      const toggleHeight = 34;
      const toggleX = layout.width - 32 - toggleWidth / 2;
      const bg = this.add
        .rectangle(toggleX, y, toggleWidth, toggleHeight, this.settings[row.key] ? 0x4caf50 : 0x3a3a4c)
        .setInteractive({ useHandCursor: true });
      const label = this.add
        .text(toggleX, y, this.settings[row.key] ? 'ON' : 'OFF', {
          fontFamily: 'sans-serif',
          fontSize: '14px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      bg.on('pointerup', () => {
        this.settings = { ...this.settings, [row.key]: !this.settings[row.key] };
        saveSettings(this.settings);
        this.syncDebugElement();
        bg.setFillStyle(this.settings[row.key] ? 0x4caf50 : 0x3a3a4c);
        label.setText(this.settings[row.key] ? 'ON' : 'OFF');
      });
    });

    const buttonWidth = 180;
    const buttonHeight = 52;
    const buttonY = startY + rows.length * rowHeight + 24;
    const back = this.add
      .rectangle(centerX, buttonY, buttonWidth, buttonHeight, 0x4a90e2)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(centerX, buttonY, 'Back', {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    back.on('pointerup', () => {
      this.scene.start('MenuScene');
    });
  }

  private syncDebugElement(): void {
    const el = document.getElementById('settings-debug');
    if (!el) return;
    el.setAttribute('data-sound', String(this.settings.soundOn));
    el.setAttribute('data-music', String(this.settings.musicOn));
    el.setAttribute('data-reduce-motion', String(this.settings.reduceMotion));
  }
}
