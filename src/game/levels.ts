import type { LevelDef, Vec2, WaveDef, EnemyTypeId } from './types.ts';

function path(points: [number, number][]): Vec2[] {
  return points.map(([x, y]) => ({ x, y }));
}

function generateWaves(waveCount: number): WaveDef[] {
  const waves: WaveDef[] = [];
  for (let i = 0; i < waveCount; i++) {
    const isFinal = i === waveCount - 1;
    const entries: { type: EnemyTypeId; count: number; interval: number; delay: number }[] = [];

    if (isFinal) {
      entries.push({ type: 'orc', count: 6 + i, interval: 0.8, delay: 0 });
      entries.push({ type: 'troll', count: 2 + Math.floor(i / 4), interval: 1.3, delay: 3 });
      entries.push({ type: 'dragon', count: 1, interval: 0, delay: 6 });
    } else {
      const orcCount = 4 + Math.floor(i * 1.3);
      entries.push({ type: 'orc', count: orcCount, interval: 0.9, delay: 0 });
      if (i >= 1) entries.push({ type: 'goblin', count: 2 + Math.floor(i * 0.8), interval: 0.45, delay: 1.0 });
      if (i >= 3) entries.push({ type: 'troll', count: 1 + Math.floor((i - 2) * 0.5), interval: 1.4, delay: 2.2 });
    }
    waves.push({ entries });
  }
  return waves;
}

export const LEVELS: LevelDef[] = [
  {
    id: 'vallee-verte',
    name: 'Vallée Verte',
    // Portrait-shaped grids (taller than wide) so the board fills a phone
    // screen edge to edge instead of leaving empty margins top and bottom.
    gridWidth: 8,
    gridHeight: 13,
    path: path([
      [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1],
      [6, 2], [6, 3], [6, 4], [5, 4], [4, 4], [3, 4], [2, 4], [1, 4],
      [1, 5], [1, 6], [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7],
      [6, 8], [6, 9], [6, 10], [5, 10], [4, 10], [3, 10], [2, 10], [1, 10],
    ]),
    startGold: 180,
    startLives: 20,
    waves: generateWaves(8),
  },
  {
    id: 'canyon-brise',
    name: 'Canyon Brisé',
    gridWidth: 9,
    gridHeight: 14,
    path: path([
      [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1],
      [7, 2], [7, 3], [7, 4], [6, 4], [5, 4], [4, 4], [3, 4], [2, 4], [1, 4],
      [1, 5], [1, 6], [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7], [7, 7],
      [7, 8], [7, 9], [7, 10], [6, 10], [5, 10], [4, 10], [3, 10], [2, 10], [1, 10],
      [1, 11], [1, 12], [2, 12], [3, 12], [4, 12], [5, 12], [6, 12], [7, 12],
    ]),
    startGold: 220,
    startLives: 18,
    waves: generateWaves(10),
  },
  {
    id: 'citadelle-oubliee',
    name: 'Citadelle Oubliée',
    gridWidth: 10,
    gridHeight: 15,
    path: path([
      [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1],
      [8, 2], [8, 3], [8, 4], [7, 4], [6, 4], [5, 4], [4, 4], [3, 4], [2, 4], [1, 4],
      [1, 5], [1, 6], [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7], [7, 7], [8, 7],
      [8, 8], [8, 9], [8, 10], [7, 10], [6, 10], [5, 10], [4, 10], [3, 10], [2, 10], [1, 10],
      [1, 11], [1, 12], [1, 13], [2, 13], [3, 13], [4, 13], [5, 13], [6, 13], [7, 13], [8, 13],
    ]),
    startGold: 260,
    startLives: 16,
    waves: generateWaves(12),
  },
];

export function getLevelIndex(levelId: string): number {
  return LEVELS.findIndex((l) => l.id === levelId);
}
