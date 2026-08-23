import * as THREE from 'three';
import type { GameState } from '../game/GameState.ts';

const TILE_PX = 64;

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Bakes the whole level's ground into one canvas: a grass base with light
 * speckle texture, and a single continuous dirt-road stroke that follows
 * the actual path waypoints (rounded joins) instead of a grid of squares —
 * this is what makes the path read as an organic painted road.
 */
export function buildGroundTexture(state: GameState): THREE.CanvasTexture {
  const w = state.level.gridWidth * TILE_PX;
  const h = state.level.gridHeight * TILE_PX;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#5c9c44';
  ctx.fillRect(0, 0, w, h);

  const toPx = (p: { x: number; y: number }) => ({ x: (p.x + 0.5) * TILE_PX, y: (p.y + 0.5) * TILE_PX });
  const pathPx = state.level.path.map(toPx);
  const path2d = new Path2D();
  pathPx.forEach((p, i) => (i === 0 ? path2d.moveTo(p.x, p.y) : path2d.lineTo(p.x, p.y)));

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = TILE_PX * 0.8;
  ctx.strokeStyle = 'rgba(55,38,18,0.35)';
  ctx.stroke(path2d);
  ctx.lineWidth = TILE_PX * 0.66;
  ctx.strokeStyle = '#ad8049';
  ctx.stroke(path2d);

  ctx.lineWidth = TILE_PX * 0.66;
  const rand = mulberry32(1337);
  const speckleCount = Math.round((w * h) / 70);
  for (let i = 0; i < speckleCount; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const onPath = ctx.isPointInStroke(path2d, x, y);
    const r = 1.4 + rand() * 3;
    if (onPath) {
      ctx.fillStyle = rand() > 0.5 ? 'rgba(70,48,20,0.16)' : 'rgba(220,190,140,0.14)';
    } else {
      ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(20,40,10,0.09)';
    }
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.6, r, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
