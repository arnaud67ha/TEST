import type { EnemyTypeId, LevelDef, TowerTypeId, Vec2, WaveSpawnEntry } from './types.ts';
import { ENEMY_DEFS, scaledHp } from './enemies.ts';
import { TOWER_DEFS, PROJECTILE_SPEED } from './towers.ts';

export interface PlacedTower {
  id: string;
  type: TowerTypeId;
  level: 1 | 2 | 3;
  gridPos: Vec2;
  cooldown: number;
  investedGold: number;
}

export interface EnemyInstance {
  id: string;
  type: EnemyTypeId;
  hp: number;
  maxHp: number;
  armor: number;
  baseSpeed: number;
  distance: number; // progress along the path, in tile units
  pos: Vec2;
  reward: number;
  livesDamage: number;
  radius: number;
  slowFactor: number;
  slowUntil: number;
}

export interface Projectile {
  id: string;
  towerType: TowerTypeId;
  pos: Vec2;
  targetId: string;
  speed: number;
  damage: number;
  splashRadius?: number;
  slowFactor?: number;
  slowDuration?: number;
  chainCount?: number;
  chainRange?: number;
}

interface PendingSpawn {
  time: number;
  type: EnemyTypeId;
}

export type GameOutcome = 'playing' | 'victory' | 'defeat';

const AUTO_START_DELAY = 1.6;
const PROJECTILE_HIT_RADIUS = 0.18;

export class GameState {
  readonly level: LevelDef;
  readonly levelIndex: number;
  readonly pathLength: number;
  private readonly pathSet: Set<string>;

  towers: PlacedTower[] = [];
  enemies: EnemyInstance[] = [];
  projectiles: Projectile[] = [];

  gold: number;
  lives: number;
  maxLives: number;
  waveNumber = -1; // index of current/last started wave
  waveInProgress = false;
  autoStart = false;
  timeScale: 1 | 2 = 1;
  outcome: GameOutcome = 'playing';
  starsEarned = 0;

  private pendingSpawns: PendingSpawn[] = [];
  private waveTimer = 0;
  private autoStartTimer = 0;
  private nextId = 1;

  constructor(level: LevelDef, levelIndex: number) {
    this.level = level;
    this.levelIndex = levelIndex;
    this.pathLength = level.path.length - 1;
    this.gold = level.startGold;
    this.lives = level.startLives;
    this.maxLives = level.startLives;
    this.pathSet = new Set(level.path.map((p) => `${p.x},${p.y}`));
  }

  get totalWaves(): number {
    return this.level.waves.length;
  }

  isOnPath(x: number, y: number): boolean {
    return this.pathSet.has(`${x},${y}`);
  }

  isBuildable(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.level.gridWidth || y >= this.level.gridHeight) return false;
    if (this.isOnPath(x, y)) return false;
    return !this.towers.some((t) => t.gridPos.x === x && t.gridPos.y === y);
  }

  towerAt(x: number, y: number): PlacedTower | undefined {
    return this.towers.find((t) => t.gridPos.x === x && t.gridPos.y === y);
  }

  placeTower(type: TowerTypeId, x: number, y: number): PlacedTower | null {
    if (this.outcome !== 'playing') return null;
    if (!this.isBuildable(x, y)) return null;
    const cost = TOWER_DEFS[type].levels[0].upgradeCost;
    if (this.gold < cost) return null;
    this.gold -= cost;
    const tower: PlacedTower = {
      id: `t${this.nextId++}`,
      type,
      level: 1,
      gridPos: { x, y },
      cooldown: 0,
      investedGold: cost,
    };
    this.towers.push(tower);
    return tower;
  }

  upgradeCostFor(tower: PlacedTower): number | null {
    const levels = TOWER_DEFS[tower.type].levels;
    if (tower.level === 1) return levels[1].upgradeCost;
    if (tower.level === 2) return levels[2].upgradeCost;
    return null;
  }

  upgradeTower(towerId: string): boolean {
    const tower = this.towers.find((t) => t.id === towerId);
    if (!tower) return false;
    const cost = this.upgradeCostFor(tower);
    if (cost === null || this.gold < cost) return false;
    this.gold -= cost;
    tower.investedGold += cost;
    tower.level = (tower.level + 1) as 1 | 2 | 3;
    return true;
  }

  sellTower(towerId: string): boolean {
    const idx = this.towers.findIndex((t) => t.id === towerId);
    if (idx === -1) return false;
    const tower = this.towers[idx];
    const refund = Math.round(tower.investedGold * TOWER_DEFS[tower.type].sellRatio);
    this.gold += refund;
    this.towers.splice(idx, 1);
    return true;
  }

  canStartWave(): boolean {
    return (
      this.outcome === 'playing' &&
      !this.waveInProgress &&
      this.waveNumber + 1 < this.totalWaves &&
      this.enemies.length === 0
    );
  }

  startWave(): boolean {
    if (!this.canStartWave()) return false;
    this.waveNumber += 1;
    const wave = this.level.waves[this.waveNumber];
    const schedule: PendingSpawn[] = [];
    for (const entry of wave.entries as WaveSpawnEntry[]) {
      for (let i = 0; i < entry.count; i++) {
        schedule.push({ time: entry.delay + i * entry.interval, type: entry.type });
      }
    }
    schedule.sort((a, b) => a.time - b.time);
    this.pendingSpawns = schedule;
    this.waveTimer = 0;
    this.waveInProgress = true;
    return true;
  }

  private spawnEnemy(type: EnemyTypeId): void {
    const def = ENEMY_DEFS[type];
    const start = this.level.path[0];
    const enemy: EnemyInstance = {
      id: `e${this.nextId++}`,
      type,
      hp: scaledHp(type, this.levelIndex, this.waveNumber),
      maxHp: scaledHp(type, this.levelIndex, this.waveNumber),
      armor: def.armor,
      baseSpeed: def.speed,
      distance: 0,
      pos: { x: start.x, y: start.y },
      reward: def.reward,
      livesDamage: def.livesDamage,
      radius: def.radius,
      slowFactor: 0,
      slowUntil: 0,
    };
    this.enemies.push(enemy);
  }

  private positionAtDistance(distance: number): Vec2 {
    const clamped = Math.max(0, Math.min(distance, this.pathLength));
    const segment = Math.min(Math.floor(clamped), this.level.path.length - 2);
    const t = clamped - segment;
    const a = this.level.path[segment];
    const b = this.level.path[segment + 1];
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  private currentSpeed(enemy: EnemyInstance, elapsed: number): number {
    const slowed = elapsed < enemy.slowUntil;
    return slowed ? enemy.baseSpeed * (1 - enemy.slowFactor) : enemy.baseSpeed;
  }

  private applyDamage(enemy: EnemyInstance, rawDamage: number): void {
    const dmg = Math.max(1, rawDamage - enemy.armor);
    enemy.hp -= dmg;
  }

  private fireTower(tower: PlacedTower, target: EnemyInstance): void {
    const stats = TOWER_DEFS[tower.type].levels[tower.level - 1];
    tower.cooldown = 1 / stats.fireRate;
    this.projectiles.push({
      id: `p${this.nextId++}`,
      towerType: tower.type,
      pos: { x: tower.gridPos.x, y: tower.gridPos.y },
      targetId: target.id,
      speed: PROJECTILE_SPEED[tower.type],
      damage: stats.damage,
      splashRadius: stats.splashRadius,
      slowFactor: stats.slowFactor,
      slowDuration: stats.slowDuration,
      chainCount: stats.chainCount,
      chainRange: stats.chainRange,
    });
  }

  private resolveImpact(projectile: Projectile, primary: EnemyInstance): void {
    this.applyDamage(primary, projectile.damage);
    if (projectile.slowFactor && projectile.slowDuration) {
      primary.slowFactor = Math.max(primary.slowFactor, projectile.slowFactor);
      primary.slowUntil = Math.max(primary.slowUntil, this.waveTimer + projectile.slowDuration);
    }
    if (projectile.splashRadius) {
      for (const other of this.enemies) {
        if (other.id === primary.id) continue;
        const d = Math.hypot(other.pos.x - primary.pos.x, other.pos.y - primary.pos.y);
        if (d <= projectile.splashRadius) this.applyDamage(other, projectile.damage);
      }
    }
    if (projectile.chainCount && projectile.chainRange) {
      let sourcePos = primary.pos;
      const hit = new Set([primary.id]);
      let remaining = projectile.chainCount;
      let chainDamage = projectile.damage;
      while (remaining > 0) {
        chainDamage *= 0.75;
        let nearest: EnemyInstance | null = null;
        let nearestDist = Infinity;
        for (const candidate of this.enemies) {
          if (hit.has(candidate.id) || candidate.hp <= 0) continue;
          const d = Math.hypot(candidate.pos.x - sourcePos.x, candidate.pos.y - sourcePos.y);
          if (d <= projectile.chainRange && d < nearestDist) {
            nearest = candidate;
            nearestDist = d;
          }
        }
        if (!nearest) break;
        this.applyDamage(nearest, chainDamage);
        hit.add(nearest.id);
        sourcePos = nearest.pos;
        remaining -= 1;
      }
    }
  }

  update(rawDt: number): void {
    if (this.outcome !== 'playing') return;
    const dt = rawDt * this.timeScale;
    this.waveTimer += dt;

    if (this.waveInProgress) {
      while (this.pendingSpawns.length > 0 && this.pendingSpawns[0].time <= this.waveTimer) {
        const next = this.pendingSpawns.shift()!;
        this.spawnEnemy(next.type);
      }
    }

    for (const enemy of this.enemies) {
      const speed = this.currentSpeed(enemy, this.waveTimer);
      enemy.distance += speed * dt;
      enemy.pos = this.positionAtDistance(enemy.distance);
    }

    const arrived = this.enemies.filter((e) => e.distance >= this.pathLength);
    for (const enemy of arrived) {
      this.lives -= enemy.livesDamage;
    }
    if (arrived.length > 0) {
      this.enemies = this.enemies.filter((e) => e.distance < this.pathLength);
    }

    for (const tower of this.towers) {
      tower.cooldown = Math.max(0, tower.cooldown - dt);
      if (tower.cooldown > 0) continue;
      const stats = TOWER_DEFS[tower.type].levels[tower.level - 1];
      let best: EnemyInstance | null = null;
      let bestDistance = -1;
      for (const enemy of this.enemies) {
        const d = Math.hypot(enemy.pos.x - tower.gridPos.x, enemy.pos.y - tower.gridPos.y);
        if (d <= stats.range && enemy.distance > bestDistance) {
          best = enemy;
          bestDistance = enemy.distance;
        }
      }
      if (best) this.fireTower(tower, best);
    }

    const remainingProjectiles: Projectile[] = [];
    for (const projectile of this.projectiles) {
      const target = this.enemies.find((e) => e.id === projectile.targetId);
      if (!target) continue; // target died before impact, projectile fizzles
      const dx = target.pos.x - projectile.pos.x;
      const dy = target.pos.y - projectile.pos.y;
      const dist = Math.hypot(dx, dy);
      const step = projectile.speed * dt;
      if (dist <= Math.max(step, PROJECTILE_HIT_RADIUS)) {
        this.resolveImpact(projectile, target);
      } else {
        projectile.pos = { x: projectile.pos.x + (dx / dist) * step, y: projectile.pos.y + (dy / dist) * step };
        remainingProjectiles.push(projectile);
      }
    }
    this.projectiles = remainingProjectiles;

    const dead = this.enemies.filter((e) => e.hp <= 0);
    for (const enemy of dead) this.gold += enemy.reward;
    if (dead.length > 0) this.enemies = this.enemies.filter((e) => e.hp > 0);

    if (this.lives <= 0) {
      this.lives = 0;
      this.outcome = 'defeat';
      return;
    }

    if (this.waveInProgress && this.pendingSpawns.length === 0 && this.enemies.length === 0) {
      this.waveInProgress = false;
      if (this.waveNumber + 1 >= this.totalWaves) {
        this.outcome = 'victory';
        const ratio = this.lives / this.maxLives;
        this.starsEarned = ratio >= 0.8 ? 3 : ratio >= 0.4 ? 2 : 1;
        return;
      }
      if (this.autoStart) this.autoStartTimer = AUTO_START_DELAY;
    }

    if (!this.waveInProgress && this.autoStartTimer > 0) {
      this.autoStartTimer -= dt;
      if (this.autoStartTimer <= 0) this.startWave();
    }
  }
}
