import type { Storage } from './storage';

export const webStorage: Storage = {
  get(key) {
    return window.localStorage.getItem(key);
  },
  set(key, value) {
    window.localStorage.setItem(key, value);
  },
  remove(key) {
    window.localStorage.removeItem(key);
  },
};

const HIGH_SCORE_KEY = 'puzzle-game:high-score';

export function getHighScore(): number {
  const raw = webStorage.get(HIGH_SCORE_KEY);
  const parsed = raw !== null ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function saveHighScoreIfBetter(score: number): number {
  const current = getHighScore();
  if (score > current) {
    webStorage.set(HIGH_SCORE_KEY, String(score));
    return score;
  }
  return current;
}

// Settings persistence (02 §2.11): sound/music toggles and reduce-motion, hardened in M5
// alongside run-resume, but usable from M4 onward for the mute toggle and shake gating.
export interface Settings {
  soundOn: boolean;
  musicOn: boolean;
  reduceMotion: boolean;
}

const SETTINGS_KEY = 'puzzle-game:settings';

const DEFAULT_SETTINGS: Settings = {
  soundOn: true,
  musicOn: true,
  reduceMotion: false,
};

export function getSettings(): Settings {
  const raw = webStorage.get(SETTINGS_KEY);
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  webStorage.set(SETTINGS_KEY, JSON.stringify(settings));
}

// Save/resume an in-progress run (03 §3.6): a serialized RunState (GameEngine.serialize(),
// incl. RNG state) so a reload can restore an identical board/hand/score/perks. Saved after
// each resolved turn; cleared on game-over so a finished run never offers a stale Continue.
const RUN_KEY = 'puzzle-game:run';

export function saveRunState(serialized: string): void {
  webStorage.set(RUN_KEY, serialized);
}

export function loadRunState(): string | null {
  return webStorage.get(RUN_KEY);
}

export function clearRunState(): void {
  webStorage.remove(RUN_KEY);
}

export function hasSavedRun(): boolean {
  return loadRunState() !== null;
}
