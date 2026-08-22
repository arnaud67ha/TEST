import { LEVELS } from './levels.ts';

interface SaveData {
  unlockedIndex: number; // highest level index the player can play (0-based)
  stars: number[]; // best stars (0-3) earned per level index
}

const STORAGE_KEY = 'tower-keep-save-v1';

function defaultSave(): SaveData {
  return {
    unlockedIndex: 0,
    stars: LEVELS.map(() => 0),
  };
}

function load(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const stars = LEVELS.map((_, i) => parsed.stars?.[i] ?? 0);
    return {
      unlockedIndex: typeof parsed.unlockedIndex === 'number' ? parsed.unlockedIndex : 0,
      stars,
    };
  } catch {
    return defaultSave();
  }
}

function persist(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage unavailable (private mode, quota) — progress just won't persist
  }
}

export class SaveManager {
  private data: SaveData = load();

  isUnlocked(levelIndex: number): boolean {
    return levelIndex <= this.data.unlockedIndex;
  }

  starsFor(levelIndex: number): number {
    return this.data.stars[levelIndex] ?? 0;
  }

  recordResult(levelIndex: number, stars: number): void {
    this.data.stars[levelIndex] = Math.max(this.data.stars[levelIndex] ?? 0, stars);
    if (levelIndex + 1 > this.data.unlockedIndex) {
      this.data.unlockedIndex = Math.min(levelIndex + 1, LEVELS.length - 1);
    }
    persist(this.data);
  }

  resetProgress(): void {
    this.data = defaultSave();
    persist(this.data);
  }
}
