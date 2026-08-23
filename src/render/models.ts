import * as THREE from 'three';
import type { TowerTypeId, EnemyTypeId } from '../game/types.ts';

const geometryCache = new Map<string, THREE.BufferGeometry>();
function geo<T extends THREE.BufferGeometry>(key: string, factory: () => T): T {
  if (!geometryCache.has(key)) geometryCache.set(key, factory());
  return geometryCache.get(key) as T;
}

function shade(hex: string, amount: number): string {
  const c = new THREE.Color(hex);
  c.lerp(new THREE.Color(amount >= 0 ? '#ffffff' : '#000000'), Math.abs(amount));
  return `#${c.getHexString()}`;
}

function mat(color: string, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.05, ...opts });
}
const stoneMat = () => mat('#867d6d', { roughness: 0.95 });
const woodMat = (color = '#7a5228') => mat(color, { roughness: 0.85 });
const ironMat = (color = '#4b4a52') => mat(color, { roughness: 0.4, metalness: 0.7 });

function mesh(g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mm = new THREE.Mesh(g, m);
  mm.position.set(x, y, z);
  mm.castShadow = true;
  mm.receiveShadow = true;
  return mm;
}

function addLevelPips(group: THREE.Group, level: 1 | 2 | 3, color: string): void {
  const pipGeo = geo('pip', () => new THREE.SphereGeometry(0.045, 8, 8));
  const pipMat = mat(color, { emissive: new THREE.Color(color), emissiveIntensity: 0.7, roughness: 0.3 });
  for (let i = 0; i < level; i++) {
    group.add(mesh(pipGeo, pipMat, -0.16 + i * 0.16, 0.32, 0.34));
  }
}

export function buildTowerModel(type: TowerTypeId, level: 1 | 2 | 3, color: string, accent: string): THREE.Group {
  const group = new THREE.Group();
  const scale = 0.92 + (level - 1) * 0.12;
  const baseGeo = geo('towerBase', () => new THREE.CylinderGeometry(0.32, 0.38, 0.16, 12));
  group.add(mesh(baseGeo, stoneMat(), 0, 0.08, 0));

  switch (type) {
    case 'archer': {
      const bodyMat = mat(color, { roughness: 0.9 });
      const turret = geo('archerTurret', () => new THREE.CylinderGeometry(0.24, 0.28, 0.5, 12));
      group.add(mesh(turret, bodyMat, 0, 0.16 + 0.25 * scale, 0));

      const merlonGeo = geo('archerMerlon', () => new THREE.BoxGeometry(0.09, 0.13, 0.09));
      const merlonMat = mat(shade(color, -0.15), { roughness: 0.9 });
      const ringY = 0.16 + 0.5 * scale + 0.065;
      const ringR = 0.24;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        group.add(mesh(merlonGeo, merlonMat, Math.cos(a) * ringR, ringY, Math.sin(a) * ringR));
      }

      const pole = geo('archerPole', () => new THREE.CylinderGeometry(0.018, 0.018, 0.34, 6));
      group.add(mesh(pole, woodMat('#5a4022'), 0, ringY + 0.22, 0));
      const flag = geo('archerFlag', () => new THREE.ConeGeometry(0.09, 0.18, 4));
      const flagMesh = mesh(flag, mat(accent, { roughness: 0.6 }), 0.06, ringY + 0.32, 0);
      flagMesh.rotation.z = -Math.PI / 2;
      group.add(flagMesh);
      break;
    }
    case 'trebuchet': {
      // Two A-frame legs pivoting from a shared apex point (not just two
      // separately-positioned sticks) so they visibly converge, plus a
      // thicker throwing arm crossing through the same pivot — legibility
      // at small on-screen scale matters more than fine detail here.
      const apexY = 0.16 + 0.52 * scale;
      const legLen = 0.55 * scale;
      const legMat = woodMat(shade(color, -0.12));
      for (const angle of [0.42, -0.42]) {
        const leg = new THREE.Group();
        leg.position.set(0, apexY, 0);
        leg.rotation.z = angle;
        const legGeo = new THREE.BoxGeometry(0.09, legLen, 0.09);
        leg.add(mesh(legGeo, legMat, 0, -legLen / 2, 0));
        group.add(leg);
      }
      const pinGeo = geo('trebPin', () => new THREE.SphereGeometry(0.05, 8, 8));
      group.add(mesh(pinGeo, ironMat('#3a3a42'), 0, apexY, 0));

      const armLen = 0.95 * scale;
      const arm = new THREE.Group();
      arm.position.set(0, apexY, 0);
      arm.rotation.z = -0.55;
      const armGeo = new THREE.BoxGeometry(0.07, armLen, 0.07);
      arm.add(mesh(armGeo, woodMat(color), 0, 0, 0));
      const counterweight = geo('trebCounterweight', () => new THREE.BoxGeometry(0.2, 0.2, 0.2));
      arm.add(mesh(counterweight, ironMat(accent), 0, armLen / 2, 0));
      const boulderGeo = geo('trebBoulder', () => new THREE.SphereGeometry(0.1, 8, 8));
      arm.add(mesh(boulderGeo, stoneMat(), 0, -armLen / 2, 0));
      group.add(arm);
      break;
    }
    case 'frost': {
      const robe = geo('frostRobe', () => new THREE.ConeGeometry(0.2, 0.5, 10));
      group.add(mesh(robe, mat(color, { roughness: 0.7 }), 0, 0.16 + 0.25 * scale, 0));
      const hood = geo('frostHood', () => new THREE.SphereGeometry(0.11, 10, 10));
      group.add(mesh(hood, mat(shade(color, -0.35), { roughness: 0.75 }), 0, 0.16 + 0.5 * scale + 0.03, 0));

      const crystalMat = mat(accent, { emissive: new THREE.Color(accent), emissiveIntensity: 0.8, roughness: 0.15, metalness: 0.1 });
      const crystal = geo('frostCrystal', () => new THREE.OctahedronGeometry(0.11, 0));
      const c = mesh(crystal, crystalMat, 0, 0.16 + 0.5 * scale + 0.26, 0);
      c.rotation.y = Math.PI / 6;
      group.add(c);
      break;
    }
    case 'mage': {
      const robe = geo('mageRobe', () => new THREE.ConeGeometry(0.2, 0.5, 10));
      group.add(mesh(robe, mat(color, { roughness: 0.7 }), 0, 0.16 + 0.25 * scale, 0));
      const hood = geo('mageHood', () => new THREE.SphereGeometry(0.11, 10, 10));
      group.add(mesh(hood, mat(shade(color, -0.35), { roughness: 0.75 }), 0, 0.16 + 0.5 * scale + 0.03, 0));

      const staff = geo('mageStaff', () => new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6));
      const staffMesh = mesh(staff, woodMat('#3e2c1a'), 0.16, 0.16 + 0.4 * scale, 0);
      staffMesh.rotation.z = -0.18;
      group.add(staffMesh);
      const orbMat = mat(accent, { emissive: new THREE.Color(accent), emissiveIntensity: 1.1, roughness: 0.2 });
      const orb = geo('mageOrb', () => new THREE.SphereGeometry(0.075, 10, 10));
      group.add(mesh(orb, orbMat, 0.21, 0.16 + 0.68 * scale, 0));
      break;
    }
  }

  addLevelPips(group, level, accent);
  return group;
}

export function buildRangeIndicator(radius: number): THREE.Mesh {
  const g = new THREE.RingGeometry(radius - 0.03, radius, 48);
  const m = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.28, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(g, m);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  return ring;
}

export function buildEnemyModel(type: EnemyTypeId, color: string, radius: number): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = mat(color, { roughness: 0.75 });
  const darkMat = mat(shade(color, -0.32), { roughness: 0.75 });

  switch (type) {
    case 'orc': {
      group.add(mesh(geo('orcBody', () => new THREE.BoxGeometry(radius * 1.5, radius * 1.6, radius * 1.5)), bodyMat, 0, radius * 0.8, 0));
      group.add(mesh(geo('orcHead', () => new THREE.SphereGeometry(radius * 0.6, 10, 10)), darkMat, 0, radius * 1.9, 0));
      const padGeo = geo('orcPad', () => new THREE.BoxGeometry(radius * 0.5, radius * 0.25, radius * 0.55));
      const padMat = ironMat('#5c5a63');
      group.add(mesh(padGeo, padMat, -radius * 0.85, radius * 1.35, 0));
      group.add(mesh(padGeo, padMat, radius * 0.85, radius * 1.35, 0));
      break;
    }
    case 'goblin': {
      const body = mesh(geo('goblinBody', () => new THREE.BoxGeometry(radius * 2.2, radius * 1.1, radius * 1.2)), bodyMat, 0, radius * 0.6, 0);
      group.add(body);
      const head = mesh(geo('goblinHead', () => new THREE.ConeGeometry(radius * 0.5, radius * 0.9, 8)), darkMat, radius * 1.1, radius * 0.7, 0);
      head.rotateZ(-Math.PI / 2);
      group.add(head);
      const earGeo = geo('goblinEar', () => new THREE.ConeGeometry(radius * 0.18, radius * 0.5, 6));
      const earL = mesh(earGeo, darkMat, radius * 0.85, radius * 1.05, radius * 0.28);
      earL.rotation.z = -0.7;
      const earR = mesh(earGeo, darkMat, radius * 0.85, radius * 1.05, -radius * 0.28);
      earR.rotation.z = -0.7;
      group.add(earL, earR);
      break;
    }
    case 'troll': {
      group.add(mesh(geo('trollBody', () => new THREE.BoxGeometry(radius * 2, radius * 1.8, radius * 2)), bodyMat, 0, radius, 0));
      group.add(mesh(geo('trollHead', () => new THREE.BoxGeometry(radius * 1.1, radius * 0.6, radius * 1.1)), darkMat, 0, radius * 2.1, 0));
      const club = geo('trollClub', () => new THREE.CylinderGeometry(radius * 0.22, radius * 0.16, radius * 1.6, 8));
      const clubMesh = mesh(club, woodMat('#5a4a2e'), radius * 1.5, radius * 1.1, 0);
      clubMesh.rotation.z = 0.5;
      group.add(clubMesh);
      break;
    }
    case 'dragon': {
      const bodyGeo = geo('dragonBody', () => new THREE.IcosahedronGeometry(radius * 1.1, 1));
      const body = mesh(bodyGeo, mat(color, { roughness: 0.55, metalness: 0.15 }), 0, radius * 1.3, 0);
      body.scale.set(1, 0.85, 1.6);
      group.add(body);

      const neckMat = mat(shade(color, -0.1), { roughness: 0.55, metalness: 0.15 });
      const head = mesh(geo('dragonHead', () => new THREE.ConeGeometry(radius * 0.55, radius * 0.9, 8)), neckMat, 0, radius * 1.8, radius * 1.5);
      head.rotation.x = Math.PI / 2.1;
      group.add(head);

      const hornGeo = geo('dragonHorn', () => new THREE.ConeGeometry(radius * 0.14, radius * 0.4, 6));
      const hornMat = mat('#e8dfc0', { roughness: 0.5 });
      const hornL = mesh(hornGeo, hornMat, -radius * 0.18, radius * 2.15, radius * 1.75);
      hornL.rotation.x = -0.4;
      const hornR = mesh(hornGeo, hornMat, radius * 0.18, radius * 2.15, radius * 1.75);
      hornR.rotation.x = -0.4;
      group.add(hornL, hornR);

      const wingGeo = geo('dragonWing', () => new THREE.BoxGeometry(radius * 1.6, radius * 0.06, radius * 0.9));
      const wingMat = mat(shade(color, -0.25), { roughness: 0.6 });
      const wingL = mesh(wingGeo, wingMat, -radius * 1.1, radius * 1.6, -radius * 0.1);
      wingL.rotation.z = 0.45;
      wingL.rotation.y = 0.25;
      const wingR = mesh(wingGeo, wingMat, radius * 1.1, radius * 1.6, -radius * 0.1);
      wingR.rotation.z = -0.45;
      wingR.rotation.y = -0.25;
      group.add(wingL, wingR);

      const tail = mesh(geo('dragonTail', () => new THREE.ConeGeometry(radius * 0.35, radius * 1.3, 8)), neckMat, 0, radius * 1.1, -radius * 1.6);
      tail.rotation.x = -Math.PI / 2.3;
      group.add(tail);
      break;
    }
  }
  return group;
}

export function buildHealthBar(): { group: THREE.Group; fill: THREE.Mesh } {
  const group = new THREE.Group();
  const bgGeo = geo('hpBg', () => new THREE.PlaneGeometry(0.62, 0.1));
  const fillGeo = geo('hpFill', () => new THREE.PlaneGeometry(1, 1));
  const bg = new THREE.Mesh(bgGeo, new THREE.MeshBasicMaterial({ color: '#241b12' }));
  const fill = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({ color: '#4ade80' }));
  fill.scale.set(0.56, 0.06, 1);
  fill.position.z = 0.001;
  group.add(bg, fill);
  return { group, fill };
}

export function buildProjectileModel(type: TowerTypeId, color: string): THREE.Mesh {
  switch (type) {
    case 'trebuchet': {
      const g = geo('boulder', () => new THREE.SphereGeometry(0.1, 8, 8));
      return mesh(g, stoneMat());
    }
    case 'archer': {
      const g = geo('arrow', () => new THREE.CylinderGeometry(0.02, 0.02, 0.32, 5));
      const a = mesh(g, woodMat('#6b4a28'));
      a.rotation.x = Math.PI / 2;
      return a;
    }
    default: {
      const g = geo('projectileOrb', () => new THREE.SphereGeometry(0.08, 8, 8));
      const m = mat(color, { emissive: new THREE.Color(color), emissiveIntensity: 1, roughness: 0.25 });
      return mesh(g, m);
    }
  }
}

/** Deterministic 0..1 value from integer coords, used to scatter/vary scenery without storing any state. */
export function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function buildTreeModel(seed: number): THREE.Group {
  const group = new THREE.Group();
  const h = 0.55 + hash2(seed, 1) * 0.25;
  const trunk = geo('treeTrunk', () => new THREE.CylinderGeometry(0.04, 0.06, 0.22, 6));
  group.add(mesh(trunk, woodMat('#5a3d22'), 0, 0.11, 0));
  const foliageMat = mat(shade('#2f6b34', hash2(seed, 2) * 0.16 - 0.08), { roughness: 0.85 });
  const tiers = 3;
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const r = 0.28 * (1 - t * 0.55);
    const cone = geo(`treeCone${i}`, () => new THREE.ConeGeometry(1, 1, 8));
    const c = mesh(cone, foliageMat, 0, 0.24 + t * h * 0.7 + h * 0.22, 0);
    c.scale.set(r, h * 0.42, r);
    group.add(c);
  }
  group.rotation.y = hash2(seed, 3) * Math.PI * 2;
  return group;
}

export function buildRockModel(seed: number): THREE.Group {
  const group = new THREE.Group();
  const g = geo('rock', () => new THREE.IcosahedronGeometry(0.16, 0));
  const r = mesh(g, mat(shade('#8a8578', hash2(seed, 4) * 0.2 - 0.1), { roughness: 0.95 }), 0, 0.08, 0);
  r.scale.set(1 + hash2(seed, 5) * 0.4, 0.65 + hash2(seed, 6) * 0.25, 1 + hash2(seed, 7) * 0.4);
  r.rotation.y = hash2(seed, 8) * Math.PI * 2;
  group.add(r);
  return group;
}

function turret(radius: number, height: number, roofHeight: number, wallColor: string, roofColor: string): THREE.Group {
  const group = new THREE.Group();
  const wall = geo(`turretWall${radius}-${height}`, () => new THREE.CylinderGeometry(radius, radius * 1.1, height, 10));
  group.add(mesh(wall, mat(wallColor, { roughness: 0.9 }), 0, height / 2, 0));
  const roof = geo(`turretRoof${radius}-${roofHeight}`, () => new THREE.ConeGeometry(radius * 1.15, roofHeight, 10));
  group.add(mesh(roof, mat(roofColor, { roughness: 0.5, metalness: 0.1 }), 0, height + roofHeight / 2, 0));
  return group;
}

export function buildCastleModel(): THREE.Group {
  const group = new THREE.Group();
  const stone = '#a89c86';
  const roofBlue = '#3a6ea8';

  const keep = turret(0.42, 0.85, 0.5, stone, roofBlue);
  keep.position.set(0, 0, 0);
  group.add(keep);

  const corners: [number, number][] = [
    [0.55, 0.55],
    [-0.55, 0.55],
    [0.55, -0.55],
    [-0.55, -0.55],
  ];
  for (const [x, z] of corners) {
    const t = turret(0.16, 0.55, 0.3, stone, roofBlue);
    t.position.set(x, 0, z);
    group.add(t);
  }

  const wallGeo = geo('castleWall', () => new THREE.BoxGeometry(1.1, 0.32, 0.08));
  const wallMat = mat(stone, { roughness: 0.9 });
  const front = mesh(wallGeo, wallMat, 0, 0.16, 0.55);
  group.add(front);
  const back = mesh(wallGeo, wallMat, 0, 0.16, -0.55);
  group.add(back);
  const sideGeo = geo('castleWallSide', () => new THREE.BoxGeometry(0.08, 0.32, 1.1));
  group.add(mesh(sideGeo, wallMat, 0.55, 0.16, 0));
  group.add(mesh(sideGeo, wallMat, -0.55, 0.16, 0));

  const flagPole = geo('castleFlagPole', () => new THREE.CylinderGeometry(0.015, 0.015, 0.3, 6));
  group.add(mesh(flagPole, woodMat('#3e2c1a'), 0, 1.5, 0));
  const flag = geo('castleFlag', () => new THREE.ConeGeometry(0.09, 0.18, 4));
  const flagMesh = mesh(flag, mat('#b6321f', { roughness: 0.6 }), 0.07, 1.58, 0);
  flagMesh.rotation.z = -Math.PI / 2;
  group.add(flagMesh);

  return group;
}
