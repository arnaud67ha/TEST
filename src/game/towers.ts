import type { TowerDef, TowerTypeId } from './types.ts';

export const TOWER_DEFS: Record<TowerTypeId, TowerDef> = {
  archer: {
    id: 'archer',
    name: "Tour d'archers",
    description: 'Tir rapide et précis sur une seule cible. Polyvalente.',
    color: '#8a8f99',
    accentColor: '#b6321f',
    sellRatio: 0.6,
    levels: [
      { damage: 8, range: 3.2, fireRate: 1.6, upgradeCost: 50 },
      { damage: 14, range: 3.4, fireRate: 1.9, upgradeCost: 40 },
      { damage: 22, range: 3.6, fireRate: 2.3, upgradeCost: 90 },
    ],
  },
  trebuchet: {
    id: 'trebuchet',
    name: 'Trébuchet',
    description: 'Projectile lent mais dévastateur, ravage les groupes.',
    color: '#8a5a2e',
    accentColor: '#5c5c66',
    sellRatio: 0.6,
    levels: [
      { damage: 22, range: 2.6, fireRate: 0.6, splashRadius: 1.1, upgradeCost: 90 },
      { damage: 34, range: 2.8, fireRate: 0.7, splashRadius: 1.3, upgradeCost: 70 },
      { damage: 50, range: 3.0, fireRate: 0.85, splashRadius: 1.5, upgradeCost: 130 },
    ],
  },
  frost: {
    id: 'frost',
    name: 'Mage de givre',
    description: 'Faibles dégâts mais ralentit durablement les ennemis.',
    color: '#2f6f8f',
    accentColor: '#bfeaff',
    sellRatio: 0.6,
    levels: [
      { damage: 4, range: 2.8, fireRate: 1.0, slowFactor: 0.35, slowDuration: 1.5, upgradeCost: 70 },
      { damage: 6, range: 3.0, fireRate: 1.1, slowFactor: 0.45, slowDuration: 1.8, upgradeCost: 55 },
      { damage: 9, range: 3.2, fireRate: 1.2, slowFactor: 0.55, slowDuration: 2.2, upgradeCost: 100 },
    ],
  },
  mage: {
    id: 'mage',
    name: 'Sorcier foudroyant',
    description: 'Foudre qui rebondit sur plusieurs cibles proches.',
    color: '#4a2f7a',
    accentColor: '#b98cff',
    sellRatio: 0.6,
    levels: [
      { damage: 16, range: 2.4, fireRate: 0.8, chainCount: 2, chainRange: 1.8, upgradeCost: 130 },
      { damage: 24, range: 2.6, fireRate: 0.9, chainCount: 3, chainRange: 2.0, upgradeCost: 100 },
      { damage: 36, range: 2.8, fireRate: 1.0, chainCount: 4, chainRange: 2.2, upgradeCost: 170 },
    ],
  },
};

export const TOWER_ORDER: TowerTypeId[] = ['archer', 'trebuchet', 'frost', 'mage'];

export const PROJECTILE_SPEED: Record<TowerTypeId, number> = {
  archer: 10,
  trebuchet: 6,
  frost: 8,
  mage: 16,
};

export function towerPlacementCost(id: TowerTypeId): number {
  return TOWER_DEFS[id].levels[0].upgradeCost;
}
