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

/** Deterministic 0..1 value from coords — used to scatter/vary scenery without storing any RNG state. */
export function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// ---------------------------------------------------------------- ground

const GROUND_TILE_PX = 96;

/** Bakes a whole level's terrain to an offscreen canvas: Kenney's real
 * painted grass/dirt textures tiled as patterns, with one continuous
 * dirt-road stroke following the real path (rounded joins) instead of a
 * grid of separate tiles. */
export function bakeGround(gridWidth: number, gridHeight: number, path: Vec2[]): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = gridWidth * GROUND_TILE_PX;
  canvas.height = gridHeight * GROUND_TILE_PX;
  const ctx = canvas.getContext('2d')!;

  const grassPattern = ctx.createPattern(sprites.grass, 'repeat');
  ctx.fillStyle = grassPattern ?? '#5c9c44';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const toPx = (p: Vec2) => ({ x: (p.x + 0.5) * GROUND_TILE_PX, y: (p.y + 0.5) * GROUND_TILE_PX });
  const pathPx = path.map(toPx);
  const path2d = new Path2D();
  pathPx.forEach((p, i) => (i === 0 ? path2d.moveTo(p.x, p.y) : path2d.lineTo(p.x, p.y)));

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = GROUND_TILE_PX * 0.82;
  ctx.strokeStyle = 'rgba(40,25,10,0.4)';
  ctx.stroke(path2d);

  const dirtPattern = ctx.createPattern(sprites.dirt, 'repeat');
  ctx.lineWidth = GROUND_TILE_PX * 0.66;
  ctx.strokeStyle = dirtPattern ?? '#ad8049';
  ctx.stroke(path2d);

  return canvas;
}

// ---------------------------------------------------------------- helpers

function drawShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
  ctx.fillStyle = 'rgba(8,18,4,0.28)';
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
  const variant = sprites.trees[Math.floor(hash2(seed, 1) * sprites.trees.length)];
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

export function drawCastle(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
  drawShadow(ctx, cx, cy + s * 0.14, s * 0.9, s * 0.34);
  drawSprite(ctx, sprites.castle, cx, cy + s * 0.16, s * 1.75, s * 1.75);
}

// ---------------------------------------------------------------- towers

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
  const color = def.color;
  const accent = def.accentColor;

  drawShadow(ctx, cx, cy + s * 0.04, s * 0.34, s * 0.15);
  const baseGrad = ctx.createRadialGradient(cx, cy - s * 0.02, s * 0.05, cx, cy, s * 0.32);
  baseGrad.addColorStop(0, shade('#867d6d', 0.15));
  baseGrad.addColorStop(1, shade('#867d6d', -0.15));
  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, s * 0.32, s * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  const groundY = cy - s * 0.03;

  switch (type) {
    case 'archer': {
      const bodyH = s * 0.55 * scale;
      const r = s * 0.22;
      const grad = ctx.createLinearGradient(cx - r, groundY - bodyH, cx + r, groundY);
      grad.addColorStop(0, shade(color, 0.18));
      grad.addColorStop(1, shade(color, -0.2));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(cx - r, groundY);
      ctx.lineTo(cx - r * 0.85, groundY - bodyH);
      ctx.lineTo(cx + r * 0.85, groundY - bodyH);
      ctx.lineTo(cx + r, groundY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = shade(color, -0.3);
      for (let i = -2; i <= 2; i++) {
        ctx.fillRect(cx + i * r * 0.36 - s * 0.03, groundY - bodyH - s * 0.08, s * 0.06, s * 0.09);
      }

      ctx.strokeStyle = '#4a3320';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, groundY - bodyH - s * 0.08);
      ctx.lineTo(cx, groundY - bodyH - s * 0.28);
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(cx, groundY - bodyH - s * 0.28);
      ctx.lineTo(cx + s * 0.12, groundY - bodyH - s * 0.22);
      ctx.lineTo(cx, groundY - bodyH - s * 0.16);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'trebuchet': {
      const apexY = groundY - s * 0.42 * scale;
      ctx.strokeStyle = shade(color, -0.15);
      ctx.lineWidth = s * 0.09;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.24, groundY);
      ctx.lineTo(cx, apexY);
      ctx.lineTo(cx + s * 0.24, groundY);
      ctx.stroke();

      const armLen = s * 0.5 * scale;
      const armAngle = -0.55;
      const ex = cx + Math.sin(armAngle) * armLen;
      const ey = apexY - Math.cos(armAngle) * armLen;
      const wx = cx - Math.sin(armAngle) * armLen * 0.7;
      const wy = apexY + Math.cos(armAngle) * armLen * 0.7;
      ctx.strokeStyle = color;
      ctx.lineWidth = s * 0.06;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      ctx.fillStyle = shade(accent, -0.1);
      ctx.fillRect(wx - s * 0.09, wy - s * 0.09, s * 0.18, s * 0.18);
      ctx.fillStyle = shade('#867d6d', 0.1);
      ctx.beginPath();
      ctx.arc(ex, ey, s * 0.09, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#2a2530';
      ctx.beginPath();
      ctx.arc(cx, apexY, s * 0.035, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'frost':
    case 'mage': {
      const bodyH = s * 0.5 * scale;
      const r = s * 0.2;
      const grad = ctx.createLinearGradient(cx - r, groundY - bodyH, cx + r, groundY);
      grad.addColorStop(0, shade(color, 0.16));
      grad.addColorStop(1, shade(color, -0.2));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(cx, groundY - bodyH);
      ctx.lineTo(cx + r, groundY);
      ctx.lineTo(cx - r, groundY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = shade(color, -0.35);
      ctx.beginPath();
      ctx.arc(cx, groundY - bodyH - s * 0.02, s * 0.1, 0, Math.PI * 2);
      ctx.fill();

      const glowY = groundY - bodyH - (type === 'mage' ? s * 0.32 : s * 0.05);
      const glowX = type === 'mage' ? cx + s * 0.14 : cx;
      if (type === 'mage') {
        ctx.strokeStyle = '#3e2c1a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + s * 0.05, groundY - bodyH * 0.6);
        ctx.lineTo(glowX, glowY);
        ctx.stroke();
      }
      const orbGrad = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, s * 0.11);
      orbGrad.addColorStop(0, '#ffffff');
      orbGrad.addColorStop(0.4, accent);
      orbGrad.addColorStop(1, alpha(accent, 0.2));
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(glowX, glowY, s * 0.11, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }

  for (let i = 0; i < level; i++) {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(cx - s * 0.16 + i * s * 0.16, cy + s * 0.02, s * 0.035, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------------------------------------------------------------- enemies

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
  const color = def.color;
  const dark = shade(color, -0.32);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(facing, 1);

  switch (type) {
    case 'orc': {
      drawShadow(ctx, 0, r * 0.15, r * 1.1, r * 0.5);
      const grad = ctx.createLinearGradient(0, -r * 2.2, 0, 0);
      grad.addColorStop(0, shade(color, 0.15));
      grad.addColorStop(1, shade(color, -0.15));
      ctx.fillStyle = grad;
      roundRect(ctx, -r * 0.7, -r * 1.9, r * 1.4, r * 1.6, r * 0.4);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.arc(0, -r * 2.15, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5c5a63';
      roundRect(ctx, -r * 1.05, -r * 1.7, r * 0.5, r * 0.4, r * 0.12);
      ctx.fill();
      roundRect(ctx, r * 0.55, -r * 1.7, r * 0.5, r * 0.4, r * 0.12);
      ctx.fill();
      break;
    }
    case 'goblin': {
      drawShadow(ctx, 0, r * 0.1, r * 1.15, r * 0.45);
      const grad = ctx.createLinearGradient(0, -r * 1.5, 0, 0);
      grad.addColorStop(0, shade(color, 0.15));
      grad.addColorStop(1, shade(color, -0.15));
      ctx.fillStyle = grad;
      roundRect(ctx, -r * 1.05, -r * 1.3, r * 1.7, r * 1.05, r * 0.4);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(r * 0.5, -r * 1.05);
      ctx.lineTo(r * 1.4, -r * 0.85);
      ctx.lineTo(r * 0.5, -r * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-r * 0.55, -r * 1.25);
      ctx.lineTo(-r * 0.85, -r * 1.7);
      ctx.lineTo(-r * 0.25, -r * 1.35);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'troll': {
      drawShadow(ctx, 0, r * 0.15, r * 1.3, r * 0.55);
      const grad = ctx.createLinearGradient(0, -r * 2.4, 0, 0);
      grad.addColorStop(0, shade(color, 0.15));
      grad.addColorStop(1, shade(color, -0.15));
      ctx.fillStyle = grad;
      roundRect(ctx, -r, -r * 2.1, r * 2, r * 1.9, r * 0.35);
      ctx.fill();
      ctx.fillStyle = dark;
      roundRect(ctx, -r * 0.6, -r * 2.5, r * 1.2, r * 0.65, r * 0.2);
      ctx.fill();
      ctx.strokeStyle = '#5a4a2e';
      ctx.lineWidth = r * 0.35;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(r * 1.05, -r * 0.4);
      ctx.lineTo(r * 1.7, -r * 1.6);
      ctx.stroke();
      break;
    }
    case 'dragon': {
      drawShadow(ctx, 0, r * 0.2, r * 1.9, r * 0.7);
      const wingGrad = ctx.createLinearGradient(0, -r * 1.9, 0, -r * 1.1);
      wingGrad.addColorStop(0, shade(color, -0.1));
      wingGrad.addColorStop(1, shade(color, -0.35));
      ctx.fillStyle = wingGrad;
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, -r * 1.6);
      ctx.quadraticCurveTo(-r * 2.1, -r * 2.4, -r * 1.9, -r * 0.9);
      ctx.quadraticCurveTo(-r * 1.1, -r * 1.2, -r * 0.3, -r * 1.6);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(r * 0.3, -r * 1.6);
      ctx.quadraticCurveTo(r * 2.1, -r * 2.4, r * 1.9, -r * 0.9);
      ctx.quadraticCurveTo(r * 1.1, -r * 1.2, r * 0.3, -r * 1.6);
      ctx.fill();

      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, -r * 0.3);
      ctx.quadraticCurveTo(-r * 1.8, -r * 0.5, -r * 2.2, r * 0.1);
      ctx.quadraticCurveTo(-r * 1.4, r * 0.05, -r * 0.3, -r * 0.1);
      ctx.fill();

      const bodyGrad = ctx.createRadialGradient(-r * 0.2, -r * 1.4, r * 0.2, 0, -r * 1.1, r * 1.6);
      bodyGrad.addColorStop(0, shade(color, 0.2));
      bodyGrad.addColorStop(1, shade(color, -0.1));
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.ellipse(0, -r * 1.1, r * 1.5, r * 1.15, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = shade(color, 0.05);
      ctx.beginPath();
      ctx.ellipse(r * 1.05, -r * 1.7, r * 0.55, r * 0.5, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8dfc0';
      ctx.beginPath();
      ctx.moveTo(r * 0.75, -r * 2.1);
      ctx.lineTo(r * 0.95, -r * 2.55);
      ctx.lineTo(r * 1.1, -r * 2.05);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(r * 1.25, -r * 2.05);
      ctx.lineTo(r * 1.5, -r * 2.45);
      ctx.lineTo(r * 1.55, -r * 1.95);
      ctx.closePath();
      ctx.fill();
      break;
    }
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
    case 'trebuchet': {
      const grad = ctx.createRadialGradient(cx - s * 0.02, cy - s * 0.02, 0, cx, cy, s * 0.09);
      grad.addColorStop(0, shade('#867d6d', 0.3));
      grad.addColorStop(1, shade('#867d6d', -0.2));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.09, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'archer': {
      ctx.strokeStyle = '#6b4a28';
      ctx.lineWidth = s * 0.035;
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.16, cy);
      ctx.lineTo(cx + s * 0.16, cy);
      ctx.stroke();
      ctx.fillStyle = '#3a3a42';
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.16, cy);
      ctx.lineTo(cx + s * 0.1, cy - s * 0.04);
      ctx.lineTo(cx + s * 0.1, cy + s * 0.04);
      ctx.closePath();
      ctx.fill();
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
