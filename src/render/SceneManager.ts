import * as THREE from 'three';
import type { GameState } from '../game/GameState.ts';
import type { Vec2, TowerTypeId, EnemyTypeId } from '../game/types.ts';
import { TOWER_DEFS } from '../game/towers.ts';
import { ENEMY_DEFS } from '../game/enemies.ts';
import {
  buildCastleModel,
  buildEnemyModel,
  buildHealthBar,
  buildProjectileModel,
  buildRangeIndicator,
  buildRockModel,
  buildTowerModel,
  buildTreeModel,
  hash2,
} from './models.ts';
import { buildGroundTexture } from './textures.ts';

interface TowerMeshEntry {
  group: THREE.Group;
  level: number;
}
interface EnemyMeshEntry {
  group: THREE.Group;
  hpFill: THREE.Mesh;
  hpMaxWidth: number;
}

export class SceneManager {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.OrthographicCamera;
  private container: HTMLElement;
  private levelGroup = new THREE.Group();
  private entitiesGroup = new THREE.Group();

  private gridWidth = 1;
  private gridHeight = 1;
  private frustumSize = 10;

  private towerMeshes = new Map<string, TowerMeshEntry>();
  private enemyMeshes = new Map<string, EnemyMeshEntry>();
  private projectileMeshes = new Map<string, THREE.Mesh>();
  private decorMeshes = new Map<string, THREE.Object3D>();
  private rangeIndicator: THREE.Mesh | null = null;
  private hpBillboardQuat = new THREE.Quaternion();

  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color('#6fa53f');
    this.scene.fog = new THREE.Fog('#6fa53f', 20, 42);

    this.camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
    // A steeper, more top-down angle than a classic 45° isometric — reads
    // closer to a painted "battle map" than a diorama.
    const dir = new THREE.Vector3(0.85, 2.0, 1.05).normalize();
    this.camera.position.copy(dir.multiplyScalar(26));
    this.camera.lookAt(0, 0, 0);
    this.hpBillboardQuat.copy(this.camera.quaternion);

    // A warm key sun plus a soft sky/ground fill reads as natural outdoor
    // light with standard (PBR) materials — unlike toon banding, this
    // falls off continuously so it tolerates a couple of lights without
    // washing out.
    this.scene.add(new THREE.HemisphereLight('#eaf2ff', '#4a7a2e', 0.75));
    const sun = new THREE.DirectionalLight('#fff4d6', 1.15);
    sun.position.set(12, 22, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -16;
    sun.shadow.camera.right = 16;
    sun.shadow.camera.top = 16;
    sun.shadow.camera.bottom = -16;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight('#9fc2e0', 0.25);
    fill.position.set(-10, 10, -8);
    this.scene.add(fill);

    this.scene.add(this.levelGroup, this.entitiesGroup);

    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();
  }

  private handleResize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h);
    const aspect = w / h;
    const size = this.frustumSize;
    this.camera.left = (-size * aspect) / 2;
    this.camera.right = (size * aspect) / 2;
    this.camera.top = size / 2;
    this.camera.bottom = -size / 2;
    this.camera.updateProjectionMatrix();
  }

  private gridToWorld(x: number, y: number): THREE.Vector3 {
    return new THREE.Vector3(x - this.gridWidth / 2 + 0.5, 0, y - this.gridHeight / 2 + 0.5);
  }

  loadLevel(state: GameState): void {
    this.levelGroup.clear();
    this.entitiesGroup.clear();
    this.towerMeshes.clear();
    this.enemyMeshes.clear();
    this.projectileMeshes.clear();
    this.decorMeshes.clear();
    this.rangeIndicator = null;

    this.gridWidth = state.level.gridWidth;
    this.gridHeight = state.level.gridHeight;
    this.frustumSize = Math.max(this.gridWidth, this.gridHeight) * 1.15 + 2;
    this.handleResize();

    // One baked texture for the whole level — a continuous painted dirt
    // road following the real path — instead of a grid of separate tiles.
    const groundTex = buildGroundTexture(state);
    groundTex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const groundGeo = new THREE.PlaneGeometry(this.gridWidth, this.gridHeight);
    const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.levelGroup.add(ground);

    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        if (state.isOnPath(x, y)) continue;
        const roll = hash2(x * 12.9898, y * 78.233);
        if (roll > 0.32) continue;
        const seed = x * 1000 + y;
        const model = roll < 0.09 ? buildRockModel(seed) : buildTreeModel(seed);
        const p = this.gridToWorld(x, y);
        const jx = (hash2(x, y * 2 + 1) - 0.5) * 0.35;
        const jz = (hash2(x * 2 + 1, y) - 0.5) * 0.35;
        model.position.set(p.x + jx, 0, p.z + jz);
        this.levelGroup.add(model);
        this.decorMeshes.set(`${x},${y}`, model);
      }
    }

    const goal = state.level.path[state.level.path.length - 1];
    const castle = buildCastleModel();
    const goalPos = this.gridToWorld(goal.x, goal.y);
    castle.position.set(goalPos.x, 0, goalPos.z);
    castle.scale.setScalar(1.05);
    this.levelGroup.add(castle);
  }

  screenToGridCell(clientX: number, clientY: number): Vec2 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(this.groundPlane, hit)) return null;
    const gx = Math.floor(hit.x + this.gridWidth / 2);
    const gy = Math.floor(hit.z + this.gridHeight / 2);
    return { x: gx, y: gy };
  }

  setSelectedTower(gridPos: Vec2 | null, range: number | null): void {
    if (this.rangeIndicator) {
      this.entitiesGroup.remove(this.rangeIndicator);
      this.rangeIndicator = null;
    }
    if (gridPos && range !== null) {
      const ring = buildRangeIndicator(range);
      const p = this.gridToWorld(gridPos.x, gridPos.y);
      ring.position.set(p.x, 0.03, p.z);
      this.entitiesGroup.add(ring);
      this.rangeIndicator = ring;
    }
  }

  private ensureTower(id: string, type: TowerTypeId, level: 1 | 2 | 3, gridPos: Vec2): void {
    const existing = this.towerMeshes.get(id);
    if (existing && existing.level === level) {
      return;
    }
    if (existing) {
      this.entitiesGroup.remove(existing.group);
    } else {
      const decorKey = `${gridPos.x},${gridPos.y}`;
      const decor = this.decorMeshes.get(decorKey);
      if (decor) {
        this.levelGroup.remove(decor);
        this.decorMeshes.delete(decorKey);
      }
    }
    const def = TOWER_DEFS[type];
    const group = buildTowerModel(type, level, def.color, def.accentColor);
    const p = this.gridToWorld(gridPos.x, gridPos.y);
    group.position.set(p.x, 0, p.z);
    this.entitiesGroup.add(group);
    this.towerMeshes.set(id, { group, level });
  }

  private ensureEnemy(id: string, type: EnemyTypeId): EnemyMeshEntry {
    let entry = this.enemyMeshes.get(id);
    if (entry) return entry;
    const def = ENEMY_DEFS[type];
    const group = new THREE.Group();
    const model = buildEnemyModel(type, def.color, def.radius);
    group.add(model);
    const { group: hpGroup, fill } = buildHealthBar();
    hpGroup.position.y = def.radius * 2.6 + 0.35;
    hpGroup.quaternion.copy(this.hpBillboardQuat);
    group.add(hpGroup);
    this.entitiesGroup.add(group);
    entry = { group, hpFill: fill, hpMaxWidth: 0.56 };
    this.enemyMeshes.set(id, entry);
    return entry;
  }

  sync(state: GameState): void {
    const liveTowerIds = new Set(state.towers.map((t) => t.id));
    for (const tower of state.towers) this.ensureTower(tower.id, tower.type, tower.level, tower.gridPos);
    for (const [id, entry] of this.towerMeshes) {
      if (!liveTowerIds.has(id)) {
        this.entitiesGroup.remove(entry.group);
        this.towerMeshes.delete(id);
      }
    }

    const liveEnemyIds = new Set(state.enemies.map((e) => e.id));
    for (const enemy of state.enemies) {
      const entry = this.ensureEnemy(enemy.id, enemy.type);
      const p = this.gridToWorld(enemy.pos.x, enemy.pos.y);
      entry.group.position.set(p.x, 0, p.z);
      const ratio = Math.max(0, enemy.hp / enemy.maxHp);
      entry.hpFill.scale.set(entry.hpMaxWidth * ratio, 0.06, 1);
      entry.hpFill.position.x = -(entry.hpMaxWidth * (1 - ratio)) / 2;
    }
    for (const [id, entry] of this.enemyMeshes) {
      if (!liveEnemyIds.has(id)) {
        this.entitiesGroup.remove(entry.group);
        this.enemyMeshes.delete(id);
      }
    }

    const liveProjectileIds = new Set(state.projectiles.map((p) => p.id));
    for (const projectile of state.projectiles) {
      let m = this.projectileMeshes.get(projectile.id);
      if (!m) {
        m = buildProjectileModel(projectile.towerType, TOWER_DEFS[projectile.towerType].accentColor);
        this.entitiesGroup.add(m);
        this.projectileMeshes.set(projectile.id, m);
      }
      const p = this.gridToWorld(projectile.pos.x, projectile.pos.y);
      m.position.set(p.x, 0.35, p.z);
    }
    for (const [id, m] of this.projectileMeshes) {
      if (!liveProjectileIds.has(id)) {
        this.entitiesGroup.remove(m);
        this.projectileMeshes.delete(id);
      }
    }
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
