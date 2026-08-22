export interface Vec2 {
  x: number;
  y: number;
}

export type TowerTypeId = 'archer' | 'cannon' | 'frost' | 'tesla';
export type EnemyTypeId = 'grunt' | 'runner' | 'tank' | 'boss';

export interface TowerLevelStats {
  damage: number;
  range: number;
  fireRate: number; // shots per second
  upgradeCost: number; // cost to reach this level from the previous one (0 for level 1 = placement cost)
  splashRadius?: number;
  slowFactor?: number; // fraction of speed removed, e.g. 0.4 = -40% speed
  slowDuration?: number; // seconds
  chainCount?: number; // extra targets hit besides the primary one
  chainRange?: number; // radius to find chain targets around the primary target
}

export interface TowerDef {
  id: TowerTypeId;
  name: string;
  description: string;
  color: string;
  accentColor: string;
  levels: [TowerLevelStats, TowerLevelStats, TowerLevelStats];
  sellRatio: number;
}

export interface EnemyDef {
  id: EnemyTypeId;
  name: string;
  color: string;
  baseHp: number;
  speed: number; // tiles per second
  armor: number; // flat damage reduction per hit
  reward: number;
  livesDamage: number;
  radius: number; // visual/collision radius in tile units
}

export interface WaveSpawnEntry {
  type: EnemyTypeId;
  count: number;
  interval: number; // seconds between individual spawns
  delay: number; // seconds after wave start before this entry begins spawning
}

export interface WaveDef {
  entries: WaveSpawnEntry[];
}

export interface LevelDef {
  id: string;
  name: string;
  gridWidth: number;
  gridHeight: number;
  path: Vec2[];
  startGold: number;
  startLives: number;
  waves: WaveDef[];
}

export type GamePhase = 'menu' | 'levelSelect' | 'playing' | 'paused' | 'victory' | 'defeat';
