import * as THREE from 'three';
import type { TowerTypeId, EnemyTypeId } from '../game/types.ts';

const geometryCache = new Map<string, THREE.BufferGeometry>();
function geo<T extends THREE.BufferGeometry>(key: string, factory: () => T): T {
  if (!geometryCache.has(key)) geometryCache.set(key, factory());
  return geometryCache.get(key) as T;
}

// A 4-step gradient map turns MeshToonMaterial's lighting into flat,
// high-contrast color bands instead of a smooth PBR falloff — the crisp,
// "cartoon" look mobile tower defense games use instead of realism.
const toonGradient = (() => {
  const steps = new Uint8Array([70, 130, 195, 255]);
  const data = new Uint8Array(steps.length * 4);
  for (let i = 0; i < steps.length; i++) {
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = steps[i];
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();

function shade(hex: string, amount: number): string {
  const c = new THREE.Color(hex);
  c.lerp(new THREE.Color(amount >= 0 ? '#ffffff' : '#000000'), Math.abs(amount));
  return `#${c.getHexString()}`;
}

function mat(color: string, opts: Partial<THREE.MeshToonMaterialParameters> = {}): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonGradient, ...opts });
}

/** Like mat(), but with a low self-emissive tint so the shape still reads
 * its own hue on shadow-facing surfaces instead of collapsing to near-black. */
function vividMat(color: string, emissiveIntensity = 0.22): THREE.MeshToonMaterial {
  return mat(color, { emissive: new THREE.Color(color), emissiveIntensity });
}

const outlineMaterial = new THREE.MeshBasicMaterial({ color: '#150c30', side: THREE.BackSide });

/** Builds a mesh with a thin inverted-hull outline (a child, so it follows any later rotation/position changes). */
function mesh(g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mm = new THREE.Mesh(g, m);
  mm.position.set(x, y, z);
  mm.castShadow = true;
  mm.receiveShadow = true;
  const outline = new THREE.Mesh(g, outlineMaterial);
  outline.scale.setScalar(1.12);
  mm.add(outline);
  return mm;
}

function addLevelPips(group: THREE.Group, level: 1 | 2 | 3, color: string): void {
  const pipGeo = geo('pip', () => new THREE.SphereGeometry(0.05, 8, 8));
  const pipMat = mat(color, { emissive: new THREE.Color(color), emissiveIntensity: 0.6 });
  for (let i = 0; i < level; i++) {
    group.add(mesh(pipGeo, pipMat, -0.18 + i * 0.18, 0.05, 0.42));
  }
}

export function buildTowerModel(type: TowerTypeId, level: 1 | 2 | 3, color: string, accent: string): THREE.Group {
  const group = new THREE.Group();
  const scale = 0.92 + (level - 1) * 0.12;
  const baseGeo = geo('towerBase', () => new THREE.CylinderGeometry(0.3, 0.36, 0.14, 12));
  group.add(mesh(baseGeo, mat('#6a5da0'), 0, 0.07, 0));

  const bodyMat = vividMat(color);
  const accentMat = vividMat(accent, 0.4);

  switch (type) {
    case 'archer': {
      const trunk = geo('archerTrunk', () => new THREE.CylinderGeometry(0.12, 0.16, 0.55, 10));
      const roof = geo('archerRoof', () => new THREE.ConeGeometry(0.22, 0.32, 10));
      group.add(mesh(trunk, bodyMat, 0, 0.16 + 0.275 * scale, 0));
      group.add(mesh(roof, accentMat, 0, 0.16 + 0.55 * scale + 0.16 * scale, 0));
      break;
    }
    case 'cannon': {
      const drum = geo('cannonDrum', () => new THREE.CylinderGeometry(0.26, 0.3, 0.3, 12));
      const barrel = geo('cannonBarrel', () => new THREE.CylinderGeometry(0.09, 0.1, 0.55, 10));
      const d = mesh(drum, bodyMat, 0, 0.16 + 0.15 * scale, 0);
      group.add(d);
      const barrelMesh = mesh(barrel, accentMat, 0, 0.16 + 0.2 * scale, 0.28 * scale);
      barrelMesh.rotation.x = Math.PI / 2;
      group.add(barrelMesh);
      break;
    }
    case 'frost': {
      const crystalMat = mat(color, { emissive: new THREE.Color(color), emissiveIntensity: 0.55 });
      const crystal = geo('frostCrystal', () => new THREE.OctahedronGeometry(0.26, 0));
      const c = mesh(crystal, crystalMat, 0, 0.16 + 0.34 * scale, 0);
      c.rotation.y = Math.PI / 6;
      group.add(c);
      const orbit = geo('frostOrbit', () => new THREE.TorusGeometry(0.22, 0.02, 6, 16));
      const o = mesh(orbit, accentMat, 0, 0.16 + 0.34 * scale, 0);
      o.rotation.x = Math.PI / 2.4;
      group.add(o);
      break;
    }
    case 'tesla': {
      const rod = geo('teslaRod', () => new THREE.CylinderGeometry(0.06, 0.09, 0.62, 8));
      group.add(mesh(rod, bodyMat, 0, 0.16 + 0.31 * scale, 0));
      const ring = geo('teslaRing', () => new THREE.TorusGeometry(0.17, 0.03, 8, 16));
      const r = mesh(ring, accentMat, 0, 0.16 + 0.5 * scale, 0);
      r.rotation.x = Math.PI / 2;
      group.add(r);
      const orbMat = mat(accent, { emissive: new THREE.Color(accent), emissiveIntensity: 1 });
      const orb = geo('teslaOrb', () => new THREE.SphereGeometry(0.1, 10, 10));
      group.add(mesh(orb, orbMat, 0, 0.16 + 0.62 * scale, 0));
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
  const bodyMat = vividMat(color, 0.18);
  const darkMat = vividMat(shade(color, -0.32), 0.12);

  switch (type) {
    case 'grunt': {
      group.add(mesh(geo('gruntBody', () => new THREE.BoxGeometry(radius * 1.5, radius * 1.6, radius * 1.5)), bodyMat, 0, radius * 0.8, 0));
      group.add(mesh(geo('gruntHead', () => new THREE.SphereGeometry(radius * 0.6, 10, 10)), darkMat, 0, radius * 1.9, 0));
      break;
    }
    case 'runner': {
      const body = mesh(geo('runnerBody', () => new THREE.BoxGeometry(radius * 2.2, radius * 1.1, radius * 1.2)), bodyMat, 0, radius * 0.6, 0);
      group.add(body);
      const head = mesh(geo('runnerHead', () => new THREE.ConeGeometry(radius * 0.5, radius * 0.9, 8)), darkMat, radius * 1.1, radius * 0.7, 0);
      head.rotateZ(-Math.PI / 2);
      group.add(head);
      break;
    }
    case 'tank': {
      group.add(mesh(geo('tankBody', () => new THREE.BoxGeometry(radius * 2, radius * 1.8, radius * 2)), bodyMat, 0, radius, 0));
      group.add(mesh(geo('tankTop', () => new THREE.BoxGeometry(radius * 1.1, radius * 0.6, radius * 1.1)), darkMat, 0, radius * 2.1, 0));
      break;
    }
    case 'boss': {
      const coreMat = mat(color, { emissive: new THREE.Color(color), emissiveIntensity: 0.5 });
      const core = mesh(geo('bossCore', () => new THREE.IcosahedronGeometry(radius * 1.3, 0)), coreMat, 0, radius * 1.4, 0);
      group.add(core);
      group.add(mesh(geo('bossCrown', () => new THREE.ConeGeometry(radius * 0.9, radius * 0.9, 6)), darkMat, 0, radius * 2.6, 0));
      break;
    }
  }
  return group;
}

export function buildHealthBar(): { group: THREE.Group; fill: THREE.Mesh } {
  const group = new THREE.Group();
  const bgGeo = geo('hpBg', () => new THREE.PlaneGeometry(0.62, 0.1));
  const fillGeo = geo('hpFill', () => new THREE.PlaneGeometry(1, 1));
  const bg = new THREE.Mesh(bgGeo, new THREE.MeshBasicMaterial({ color: '#150c30' }));
  const fill = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({ color: '#4ade80' }));
  fill.scale.set(0.56, 0.06, 1);
  fill.position.z = 0.001;
  group.add(bg, fill);
  return { group, fill };
}

export function buildProjectileModel(color: string): THREE.Mesh {
  const g = geo('projectile', () => new THREE.SphereGeometry(0.08, 8, 8));
  const m = mat(color, { emissive: new THREE.Color(color), emissiveIntensity: 1 });
  return mesh(g, m);
}

export function buildTileMesh(color: string): THREE.Mesh {
  const g = geo('tile', () => new THREE.BoxGeometry(0.9, 0.24, 0.9));
  // Two-tone bevel (bright top, darker sides) reads as a chunky, toy-like
  // tile instead of a flat-shaded slab. BoxGeometry face order is
  // [+x, -x, +y(top), -y(bottom), +z, -z].
  const top = mat(shade(color, 0.16));
  const side = mat(shade(color, -0.34));
  const t = new THREE.Mesh(g, [side, side, top, side, side, side]);
  t.receiveShadow = true;
  t.castShadow = false;
  return t;
}
