// Thin persistence interface (03 §3.6). Swap the implementation web ↔ native without
// touching game code.
export interface Storage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}
