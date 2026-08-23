import type { Vec2, TowerTypeId, EnemyTypeId } from '../game/types.ts';
import type { TowerDef } from '../game/types.ts';
import type { EnemyDef } from '../game/types.ts';
import { sprites } from './assets.ts';

// ---------------------------------------------------------------- color

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
export function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const target = amount >= 0 ? 255 : 0;
  const t = Math.abs(amount);
  return rgbToHex(r + (target - r) * t, g + (target - g) * t, b + (target - b) * t);
}
function alpha(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** Outlines the current path in dark ink, then fills it — the stroke's
 * outer half stays visible as a thin rim once the fill covers the inner
 * half, giving hand-drawn shapes the same "inked outline" read as the
 * pixel-art sprites they sit next to. */
function fillOutlined(ctx: CanvasRenderingContext2D, fillStyle: string | CanvasGradient, lineWidth: number): void {
  ctx.strokeStyle = 'rgba(10,14,18,0.65)';
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

/** Deterministic 0..1 value from coords — used to scatter/vary scenery without storing any RNG state. */
export function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// ---------------------------------------------------------------- ground

const GROUND_TILE_PX = 96;

/** Bakes a whole level's terrain to an offscreen canvas: Kenney's real
 * "Tower Defense (top-down)" ground/tarmac tiles as patterns, with one
 * continuous road stroke following the real path (rounded joins) instead
 * of a grid of separate tiles. */
export function bakeGround(gridWidth: number, gridHeight: number, path: Vec2[]): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = gridWidth * GROUND_TILE_PX;
  canvas.height = gridHeight * GROUND_TILE_PX;
  const ctx = canvas.getContext('2d')!;

  const groundPattern = ctx.createPattern(sprites.groundGrass, 'repeat');
  ctx.fillStyle = groundPattern ?? '#3a4a3f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const toPx = (p: Vec2) => ({ x: (p.x + 0.5) * GROUND_TILE_PX, y: (p.y + 0.5) * GROUND_TILE_PX });
  const pathPx = path.map(toPx);
  const path2d = new Path2D();
  pathPx.forEach((p, i) => (i === 0 ? path2d.moveTo(p.x, p.y) : path2d.lineTo(p.x, p.y)));

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = GROUND_TILE_PX * 0.82;
  ctx.strokeStyle = 'rgba(8,12,16,0.4)';
  ctx.stroke(path2d);

  const pathPattern = ctx.createPattern(sprites.groundPath, 'repeat');
  ctx.lineWidth = GROUND_TILE_PX * 0.66;
  ctx.strokeStyle = pathPattern ?? '#5c6b73';
  ctx.stroke(path2d);

  return canvas;
}

// ---------------------------------------------------------------- helpers

function drawShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
  ctx.fillStyle = 'rgba(4,10,14,0.32)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------- scenery

/** Draws a sprite image anchored so its bottom-center sits at the ground
 * contact point (cx, cy) — the image's own content extends upward from
 * there, same convention as the hand-drawn shapes below. */
function drawSprite(ctx: CanvasRenderingContext2D, image: HTMLImageElement, cx: number, cy: number, w: number, h: number): void {
  if (!image.complete || image.naturalWidth === 0) return;
  ctx.drawImage(image, cx - w / 2, cy - h, w, h);
}

export function drawTree(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, seed: number): void {
  const variant = sprites.bushes[Math.floor(hash2(seed, 1) * sprites.bushes.length)];
  const size = s * (0.9 + hash2(seed, 2) * 0.4);
  drawShadow(ctx, cx, cy + s * 0.05, size * 0.34, size * 0.14);
  drawSprite(ctx, variant, cx, cy + s * 0.06, size, size);
}

export function drawRock(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, seed: number): void {
  const variant = sprites.rocks[Math.floor(hash2(seed, 3) * sprites.rocks.length)];
  const size = s * (0.55 + hash2(seed, 4) * 0.25);
  drawShadow(ctx, cx, cy + s * 0.03, size * 0.42, size * 0.16);
  drawSprite(ctx, variant, cx, cy + s * 0.04, size, size);
}

/** No dedicated HQ sprite exists in the sourced sci-fi pack (turrets and
 * ground tiles only), so the command base stays hand-drawn — reskinned to
 * grey/blue gunmetal with warning stripes and a beacon instead of stone. */
export function drawCastle(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
  drawShadow(ctx, cx, cy + s * 0.14, s * 0.95, s * 0.36);

  const padGrad = ctx.createRadialGradient(cx, cy - s * 0.05, s * 0.1, cx, cy + s * 0.1, s);
  padGrad.addColorStop(0, shade('#5b6b74', 0.22));
  padGrad.addColorStop(1, shade('#5b6b74', -0.25));
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.12, s * 0.95, s * 0.4, 0, 0, Math.PI * 2);
  fillOutlined(ctx, padGrad, s * 0.03);

  ctx.strokeStyle = alpha('#ffb020', 0.85);
  ctx.lineWidth = s * 0.03;
  ctx.setLineDash([s * 0.08, s * 0.06]);
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.12, s * 0.78, s * 0.32, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  const towerH = s * 1.3;
  const towerW = s * 0.62;
  const bodyGrad = ctx.createLinearGradient(cx - towerW / 2, cy - towerH, cx + towerW / 2, cy);
  bodyGrad.addColorStop(0, shade('#8b98a0', 0.2));
  bodyGrad.addColorStop(1, shade('#8b98a0', -0.3));
  ctx.beginPath();
  ctx.moveTo(cx - towerW / 2, cy);
  ctx.lineTo(cx - towerW * 0.38, cy - towerH);
  ctx.lineTo(cx + towerW * 0.38, cy - towerH);
  ctx.lineTo(cx + towerW / 2, cy);
  ctx.closePath();
  fillOutlined(ctx, bodyGrad, s * 0.035);

  ctx.fillStyle = '#5ad1ff';
  for (let row = 0; row < 3; row++) {
    const t = 0.25 + row * 0.22;
    const y = cy - towerH * t;
    const rowW = towerW * (0.34 + (1 - t) * 0.1);
    ctx.beginPath();
    ctx.rect(cx - rowW / 2, y, rowW, s * 0.06);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(cx, cy - towerH, towerW * 0.34, Math.PI, 0);
  fillOutlined(ctx, shade('#8b98a0', 0.1), s * 0.03);

  const beaconY = cy - towerH - towerW * 0.34;
  ctx.strokeStyle = '#3c464d';
  ctx.lineWidth = s * 0.02;
  ctx.beginPath();
  ctx.moveTo(cx, beaconY);
  ctx.lineTo(cx, beaconY - s * 0.22);
  ctx.stroke();
  const glow = ctx.createRadialGradient(cx, beaconY - s * 0.22, 0, cx, beaconY - s * 0.22, s * 0.12);
  glow.addColorStop(0, '#ffffff');
  glow.addColorStop(0.5, '#ff4d4d');
  glow.addColorStop(1, alpha('#ff4d4d', 0.15));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, beaconY - s * 0.22, s * 0.09, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------- towers

/** Real Kenney turret sprites for all 4 types. Frost/mage share the same
 * red rocket-launcher art as the other two in the source pack, so they're
 * hue-rotated (blue/cyan, purple) to stay visually distinct as "energy"
 * weapons next to the "kinetic" archer/trebuchet. */
export function drawTower(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
  type: TowerTypeId,
  level: 1 | 2 | 3,
  def: TowerDef,
): void {
  const scale = 0.92 + (level - 1) * 0.12;
  const accent = def.accentColor;
  const groundY = cy - s * 0.02;

  drawShadow(ctx, cx, cy + s * 0.05, s * 0.36, s * 0.16);

  const baseGrad = ctx.createRadialGradient(cx, cy - s * 0.02, s * 0.05, cx, cy, s * 0.34);
  baseGrad.addColorStop(0, shade('#5b6b74', 0.22));
  baseGrad.addColorStop(1, shade('#5b6b74', -0.25));
  ctx.beginPath();
  ctx.ellipse(cx, cy, s * 0.34, s * 0.17, 0, 0, Math.PI * 2);
  fillOutlined(ctx, baseGrad, s * 0.02);
  ctx.strokeStyle = alpha(accent, 0.7);
  ctx.lineWidth = s * 0.015;
  ctx.beginPath();
  ctx.ellipse(cx, cy, s * 0.26, s * 0.13, 0, 0, Math.PI * 2);
  ctx.stroke();

  const sprite = sprites.towers[type];
  const ratio = sprite.naturalWidth && sprite.naturalHeight ? sprite.naturalWidth / sprite.naturalHeight : 1;
  const h = s * 0.98 * scale;
  const w = h * ratio;
  const hueRotate = type === 'frost' ? 180 : type === 'mage' ? 265 : 0;

  ctx.save();
  if (hueRotate) ctx.filter = `hue-rotate(${hueRotate}deg) saturate(1.35)`;
  const prevSmoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  drawSprite(ctx, sprite, cx, groundY + h * 0.06, w, h);
  ctx.imageSmoothingEnabled = prevSmoothing;
  ctx.restore();

  for (let i = 0; i < level; i++) {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(cx - s * 0.16 + i * s * 0.16, cy + s * 0.09, s * 0.035, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------------------------------------------------------------- enemies

/** Draws a bottom-anchored creature/vehicle sprite in local (already
 * translated+flipped) coordinates, plus a matching ground shadow. */
function drawCreatureSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  h: number,
  shadowCy: number,
  shadowRx: number,
  shadowRy: number,
): void {
  drawShadow(ctx, 0, shadowCy, shadowRx, shadowRy);
  if (img.complete && img.naturalWidth > 0) {
    const w = h * (img.naturalWidth / img.naturalHeight);
    const prevSmoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, -w / 2, -h, w, h);
    ctx.imageSmoothingEnabled = prevSmoothing;
  }
}

export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
  type: EnemyTypeId,
  def: EnemyDef,
  facing: 1 | -1,
): void {
  const r = s * def.radius;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(facing, 1);

  switch (type) {
    case 'orc':
      drawCreatureSprite(ctx, sprites.enemies.orc, s * 0.95, r * 0.1, r * 1.05, r * 0.42);
      break;
    case 'goblin':
      drawCreatureSprite(ctx, sprites.enemies.goblin, s * 0.72, r * 0.1, r * 1.15, r * 0.45);
      break;
    case 'troll':
      drawCreatureSprite(ctx, sprites.enemies.troll, s * 1.15, r * 0.15, r * 1.3, r * 0.55);
      break;
    case 'dragon':
      drawCreatureSprite(ctx, sprites.enemies.dragon, s * 1.5, r * 0.2, r * 1.9, r * 0.7);
      break;
  }

  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ------------------------------------------------------------- effects

export function drawProjectile(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, type: TowerTypeId, color: string): void {
  switch (type) {
    case 'trebuchet':
    case 'archer': {
      const img = sprites.projectileRocket;
      if (img.complete && img.naturalWidth > 0) {
        const h = s * 0.4;
        const w = h * (img.naturalWidth / img.naturalHeight);
        const prevSmoothing = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
        ctx.imageSmoothingEnabled = prevSmoothing;
      }
      break;
    }
    default: {
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.09);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.5, color);
      grad.addColorStop(1, alpha(color, 0.15));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawHealthBar(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, ratio: number): void {
  const w = s * 0.5;
  const h = s * 0.08;
  ctx.fillStyle = 'rgba(20,15,10,0.75)';
  roundRect(ctx, cx - w / 2, cy, w, h, h / 2);
  ctx.fill();
  const fillColor = ratio > 0.5 ? '#4ade80' : ratio > 0.25 ? '#f5c542' : '#e2555a';
  ctx.fillStyle = fillColor;
  roundRect(ctx, cx - w / 2, cy, Math.max(h, w * ratio), h, h / 2);
  ctx.fill();
}

export function drawRangeRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, radiusPx: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 5]);
  ctx.stroke();
  ctx.restore();
}
