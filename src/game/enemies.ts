import type { EnemyDef, EnemyTypeId } from './types.ts';

export const ENEMY_DEFS: Record<EnemyTypeId, EnemyDef> = {
  grunt: {
    id: 'grunt',
    name: 'Maraudeur',
    color: '#7f9c6a',
    baseHp: 40,
    speed: 1.4,
    armor: 0,
    reward: 4,
    livesDamage: 1,
    radius: 0.28,
  },
  runner: {
    id: 'runner',
    name: 'Éclaireur',
    color: '#e8d44d',
    baseHp: 22,
    speed: 2.6,
    armor: 0,
    reward: 3,
    livesDamage: 1,
    radius: 0.22,
  },
  tank: {
    id: 'tank',
    name: 'Blindé',
    color: '#8a5a3b',
    baseHp: 140,
    speed: 0.8,
    armor: 4,
    reward: 9,
    livesDamage: 2,
    radius: 0.34,
  },
  boss: {
    id: 'boss',
    name: 'Colosse',
    color: '#b32d2d',
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
