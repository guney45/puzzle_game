// Lightweight procedural SFX via the Web Audio API — no binary audio assets to ship, and
// every call site is inside a touch handler so iOS Safari's autoplay-unlock requirement
// (audio can only start from a user gesture) is satisfied for free (02 §2.10, §2.11).
export class AudioManager {
  private ctx: AudioContext | null = null;
  private enabled: boolean;

  constructor(enabled = true) {
    this.enabled = enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!this.ctx) this.ctx = new Ctor();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private beep(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15, delay = 0): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration);
  }

  place(): void {
    this.beep(220, 0.08, 'square', 0.08);
  }

  clear(): void {
    this.beep(440, 0.16, 'triangle', 0.12);
  }

  combo(lineCount: number): void {
    const notes = [523, 659, 784, 988];
    const note = notes[Math.min(lineCount - 2, notes.length - 1)];
    this.beep(note, 0.22, 'sawtooth', 0.13);
  }

  ability(): void {
    this.beep(330, 0.12, 'square', 0.1);
  }

  perkPick(): void {
    [440, 554, 659].forEach((freq, i) => this.beep(freq, 0.16, 'sine', 0.1, i * 0.09));
  }

  gameOver(): void {
    this.beep(196, 0.4, 'sine', 0.15);
    this.beep(147, 0.5, 'sine', 0.12, 0.15);
  }
}
