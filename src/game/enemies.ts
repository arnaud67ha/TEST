import type { EnemyDef, EnemyTypeId } from './types.ts';

export const ENEMY_DEFS: Record<EnemyTypeId, EnemyDef> = {
  orc: {
    id: 'orc',
    name: 'Orc',
    color: '#5c7a3d',
    baseHp: 40,
    speed: 1.4,
    armor: 0,
    reward: 4,
    livesDamage: 1,
    radius: 0.28,
  },
  goblin: {
    id: 'goblin',
    name: 'Gobelin',
    color: '#93ad4a',
    baseHp: 22,
    speed: 2.6,
    armor: 0,
    reward: 3,
    livesDamage: 1,
    radius: 0.22,
  },
  troll: {
    id: 'troll',
    name: 'Troll',
    color: '#6e7a5c',
    baseHp: 140,
    speed: 0.8,
    armor: 4,
    reward: 9,
    livesDamage: 2,
    radius: 0.34,
  },
  dragon: {
    id: 'dragon',
    name: 'Dragon',
    color: '#7a1f2a',
    baseHp: 900,
    speed: 0.6,
    armor: 6,
    reward: 60,
    livesDamage: 10,
    radius: 0.5,
  },
};

/** Scales an enemy's HP with the level and wave index so late-game fights stay a challenge. */
export function scaledHp(type: EnemyTypeId, levelIndex: number, waveIndex: number): number {
  const base = ENEMY_DEFS[type].baseHp;
  const multiplier = 1 + levelIndex * 0.18 + waveIndex * 0.14;
  return Math.round(base * multiplier);
}
