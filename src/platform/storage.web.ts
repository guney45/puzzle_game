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
