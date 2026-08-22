import type { TowerDef, TowerTypeId } from './types.ts';

export const TOWER_DEFS: Record<TowerTypeId, TowerDef> = {
  archer: {
    id: 'archer',
    name: 'Archer',
    description: 'Cadence rapide, cible un seul ennemi. Bon partout.',
    color: '#4a90d9',
    accentColor: '#c9e3ff',
    sellRatio: 0.6,
    levels: [
      { damage: 8, range: 3.2, fireRate: 1.6, upgradeCost: 50 },
      { damage: 14, range: 3.4, fireRate: 1.9, upgradeCost: 40 },
      { damage: 22, range: 3.6, fireRate: 2.3, upgradeCost: 90 },
    ],
  },
  cannon: {
    id: 'cannon',
    name: 'Canon',
    description: 'Tir lent mais explosif, touche les ennemis groupés.',
    color: '#d9701a',
    accentColor: '#ffd7ad',
    sellRatio: 0.6,
    levels: [
      { damage: 22, range: 2.6, fireRate: 0.6, splashRadius: 1.1, upgradeCost: 90 },
      { damage: 34, range: 2.8, fireRate: 0.7, splashRadius: 1.3, upgradeCost: 70 },
      { damage: 50, range: 3.0, fireRate: 0.85, splashRadius: 1.5, upgradeCost: 130 },
    ],
  },
  frost: {
    id: 'frost',
    name: 'Givre',
    description: 'Faibles dégâts mais ralentit durablement les ennemis.',
    color: '#5fd0e0',
    accentColor: '#e3fbff',
    sellRatio: 0.6,
    levels: [
      { damage: 4, range: 2.8, fireRate: 1.0, slowFactor: 0.35, slowDuration: 1.5, upgradeCost: 70 },
      { damage: 6, range: 3.0, fireRate: 1.1, slowFactor: 0.45, slowDuration: 1.8, upgradeCost: 55 },
      { damage: 9, range: 3.2, fireRate: 1.2, slowFactor: 0.55, slowDuration: 2.2, upgradeCost: 100 },
    ],
  },
  tesla: {
    id: 'tesla',
    name: 'Tesla',
    description: "Foudre chaînée qui rebondit sur plusieurs cibles proches.",
    color: '#9b5cf6',
    accentColor: '#ecdcff',
    sellRatio: 0.6,
    levels: [
      { damage: 16, range: 2.4, fireRate: 0.8, chainCount: 2, chainRange: 1.8, upgradeCost: 130 },
      { damage: 24, range: 2.6, fireRate: 0.9, chainCount: 3, chainRange: 2.0, upgradeCost: 100 },
      { damage: 36, range: 2.8, fireRate: 1.0, chainCount: 4, chainRange: 2.2, upgradeCost: 170 },
    ],
  },
};

export const TOWER_ORDER: TowerTypeId[] = ['archer', 'cannon', 'frost', 'tesla'];

export const PROJECTILE_SPEED: Record<TowerTypeId, number> = {
  archer: 10,
  cannon: 6,
  frost: 8,
  tesla: 16,
};

export function towerPlacementCost(id: TowerTypeId): number {
  return TOWER_DEFS[id].levels[0].upgradeCost;
}
