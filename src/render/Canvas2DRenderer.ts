import type { GameState } from '../game/GameState.ts';
import type { Vec2 } from '../game/types.ts';
import { TOWER_DEFS } from '../game/towers.ts';
import { ENEMY_DEFS } from '../game/enemies.ts';
import { bakeGround, drawCastle, drawEnemy, drawHealthBar, drawProjectile, drawRangeRing, drawRock, drawTower, drawTree, hash2 } from './sprites.ts';
import { assetsReady } from './assets.ts';

interface Decoration {
  x: number;
  y: number;
  seed: number;
  kind: 'tree' | 'rock';
}

export class Canvas2DRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;

  private gridWidth = 1;
  private gridHeight = 1;
  private tileSize = 40;
  private originX = 0;
  private originY = 0;
  private dpr = Math.min(window.devicePixelRatio, 2);

  private groundCanvas: HTMLCanvasElement | null = null;
  private decorations: Decoration[] = [];
  private goalPos: Vec2 | null = null;
  private selected: { gridPos: Vec2; range: number } | null = null;
  private prevEnemyX = new Map<string, number>();

  constructor(container: HTMLElement) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.canvas.style.touchAction = 'none';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;

    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();
  }

  private handleResize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.dpr = Math.min(window.devicePixelRatio, 2);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.computeTransform(w, h);
  }

  private computeTransform(w: number, h: number): void {
    const margin = 16;
    this.tileSize = Math.min((w - margin * 2) / this.gridWidth, (h - margin * 2) / this.gridHeight);
    this.originX = w / 2 - (this.gridWidth * this.tileSize) / 2;
    this.originY = h / 2 - (this.gridHeight * this.tileSize) / 2;
  }

  private cellCenter(gx: number, gy: number): Vec2 {
    return { x: this.originX + (gx + 0.5) * this.tileSize, y: this.originY + (gy + 0.5) * this.tileSize };
  }

  async loadLevel(state: GameState): Promise<void> {
    this.gridWidth = state.level.gridWidth;
    this.gridHeight = state.level.gridHeight;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w > 0 && h > 0) this.computeTransform(w, h);

    await assetsReady();
    this.groundCanvas = bakeGround(this.gridWidth, this.gridHeight, state.level.path);

    this.decorations = [];
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        if (state.isOnPath(x, y)) continue;
        const roll = hash2(x * 12.9898, y * 78.233);
        if (roll > 0.32) continue;
        this.decorations.push({
          x: x + (hash2(x, y * 2 + 1) - 0.5) * 0.35,
          y: y + (hash2(x * 2 + 1, y) - 0.5) * 0.35,
          seed: x * 1000 + y,
          kind: roll < 0.09 ? 'rock' : 'tree',
        });
      }
    }

    const goal = state.level.path[state.level.path.length - 1];
    this.goalPos = { x: goal.x, y: goal.y };
    this.selected = null;
    this.prevEnemyX.clear();
  }

  screenToGridCell(clientX: number, clientY: number): Vec2 | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const gx = Math.floor((x - this.originX) / this.tileSize);
    const gy = Math.floor((y - this.originY) / this.tileSize);
    return { x: gx, y: gy };
  }

  setSelectedTower(gridPos: Vec2 | null, range: number | null): void {
    this.selected = gridPos && range !== null ? { gridPos, range } : null;
  }

  render(state: GameState): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0 || !this.groundCanvas) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    ctx.drawImage(this.groundCanvas, this.originX, this.originY, this.gridWidth * this.tileSize, this.gridHeight * this.tileSize);

    if (this.selected) {
      const c = this.cellCenter(this.selected.gridPos.x, this.selected.gridPos.y);
      drawRangeRing(ctx, c.x, c.y, this.selected.range * this.tileSize);
    }

    const occupied = new Set(state.towers.map((t) => `${t.gridPos.x},${t.gridPos.y}`));
    type Drawable = { depth: number; draw: () => void };
    const drawables: Drawable[] = [];

    for (const d of this.decorations) {
      const key = `${Math.round(d.x)},${Math.round(d.y)}`;
      if (occupied.has(key)) continue;
      const c = this.cellCenter(d.x, d.y);
      drawables.push({
        depth: d.y,
        draw: () => (d.kind === 'tree' ? drawTree(ctx, c.x, c.y, this.tileSize, d.seed) : drawRock(ctx, c.x, c.y, this.tileSize, d.seed)),
      });
    }

    if (this.goalPos) {
      const c = this.cellCenter(this.goalPos.x, this.goalPos.y);
      drawables.push({ depth: this.goalPos.y + 0.3, draw: () => drawCastle(ctx, c.x, c.y, this.tileSize) });
    }

    for (const tower of state.towers) {
      const def = TOWER_DEFS[tower.type];
      const c = this.cellCenter(tower.gridPos.x, tower.gridPos.y);
      drawables.push({ depth: tower.gridPos.y, draw: () => drawTower(ctx, c.x, c.y, this.tileSize, tower.type, tower.level, def) });
    }

    for (const enemy of state.enemies) {
      const def = ENEMY_DEFS[enemy.type];
      const c = this.cellCenter(enemy.pos.x, enemy.pos.y);
      const prevX = this.prevEnemyX.get(enemy.id) ?? enemy.pos.x;
      const facing: 1 | -1 = enemy.pos.x < prevX - 0.001 ? -1 : 1;
      this.prevEnemyX.set(enemy.id, enemy.pos.x);
      const ratio = Math.max(0, enemy.hp / enemy.maxHp);
      drawables.push({
        depth: enemy.pos.y,
        draw: () => {
          drawEnemy(ctx, c.x, c.y, this.tileSize, enemy.type, def, facing);
          drawHealthBar(ctx, c.x, c.y - this.tileSize * (def.radius * 2 + 0.45), this.tileSize, ratio);
        },
      });
    }

    drawables.sort((a, b) => a.depth - b.depth);
    for (const d of drawables) d.draw();

    for (const projectile of state.projectiles) {
      const c = this.cellCenter(projectile.pos.x, projectile.pos.y);
      const color = TOWER_DEFS[projectile.towerType].accentColor;
      drawProjectile(ctx, c.x, c.y, this.tileSize, projectile.towerType, color);
    }
  }

  dispose(): void {
    this.canvas.remove();
  }
}
