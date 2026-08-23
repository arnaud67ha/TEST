import './style.css';
import { GameState, type PlacedTower } from './game/GameState.ts';
import { SaveManager } from './game/SaveManager.ts';
import { LEVELS } from './game/levels.ts';
import { TOWER_DEFS } from './game/towers.ts';
import type { TowerTypeId } from './game/types.ts';
import { Canvas2DRenderer } from './render/Canvas2DRenderer.ts';
import { UIManager } from './ui/UIManager.ts';

const app = document.getElementById('app')!;
const canvasContainer = document.createElement('div');
canvasContainer.className = 'canvas-container';
const uiLayer = document.createElement('div');
uiLayer.className = 'ui-layer';
app.append(canvasContainer, uiLayer);

const saveManager = new SaveManager();
const sceneManager = new Canvas2DRenderer(canvasContainer);
const ui = new UIManager(uiLayer, saveManager);

let gameState: GameState | null = null;
let buildSelection: TowerTypeId | null = null;
let selectedTowerId: string | null = null;
let paused = false;

function startLevel(levelIndex: number): void {
  const level = LEVELS[levelIndex];
  if (!level) return;
  gameState = new GameState(level, levelIndex);
  buildSelection = null;
  selectedTowerId = null;
  paused = false;
  sceneManager.loadLevel(gameState);
  ui.clearModal();
  ui.showHUD();
}

ui.onPlay = () => ui.showLevelSelect();
ui.onResetProgress = () => saveManager.resetProgress();
ui.onSelectLevel = (index) => startLevel(index);
ui.onBackToMenu = () => ui.showMainMenu();

ui.onBuildSelect = (type) => {
  if (!gameState) return;
  selectedTowerId = null;
  buildSelection = buildSelection === type ? null : type;
};
ui.onStartWave = () => gameState?.startWave();
ui.onTogglePause = () => {
  paused = true;
  ui.showPause();
};
ui.onToggleAuto = () => {
  if (gameState) gameState.autoStart = !gameState.autoStart;
};
ui.onToggleSpeed = () => {
  if (gameState) gameState.timeScale = gameState.timeScale === 1 ? 2 : 1;
};
ui.onUpgradeTower = (id) => gameState?.upgradeTower(id);
ui.onSellTower = (id) => {
  gameState?.sellTower(id);
  selectedTowerId = null;
};
ui.onCloseTowerPopup = () => {
  selectedTowerId = null;
};
ui.onResume = () => {
  paused = false;
  ui.clearModal();
};
ui.onRestartLevel = () => {
  if (gameState) startLevel(gameState.levelIndex);
};
ui.onNextLevel = () => {
  if (gameState) startLevel(gameState.levelIndex + 1);
};
ui.onRetryLevel = () => {
  if (gameState) startLevel(gameState.levelIndex);
};
ui.onLevelsMenu = () => {
  paused = false;
  gameState = null;
  ui.clearModal();
  ui.showLevelSelect();
};

function handlePointerDown(e: PointerEvent): void {
  if (!gameState || gameState.outcome !== 'playing' || paused) return;
  const cell = sceneManager.screenToGridCell(e.clientX, e.clientY);
  if (!cell) return;

  if (buildSelection) {
    const placed = gameState.placeTower(buildSelection, cell.x, cell.y);
    if (placed) {
      selectedTowerId = placed.id;
      buildSelection = null;
    }
    return;
  }

  const tower = gameState.towerAt(cell.x, cell.y);
  selectedTowerId = tower && selectedTowerId === tower.id ? null : tower?.id ?? null;
}
canvasContainer.addEventListener('pointerdown', handlePointerDown);

let lastTime = performance.now();
function loop(now: number): void {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (gameState && !paused) {
    const wasPlaying = gameState.outcome === 'playing';
    gameState.update(dt);

    const selectedTower: PlacedTower | null = selectedTowerId
      ? gameState.towers.find((t) => t.id === selectedTowerId) ?? null
      : null;
    if (selectedTower) {
      const stats = TOWER_DEFS[selectedTower.type].levels[selectedTower.level - 1];
      sceneManager.setSelectedTower(selectedTower.gridPos, stats.range);
    } else {
      sceneManager.setSelectedTower(null, null);
    }

    ui.updateHUD(gameState, selectedTower, buildSelection);

    if (wasPlaying && gameState.outcome === 'victory') {
      saveManager.recordResult(gameState.levelIndex, gameState.starsEarned);
      ui.showVictory(gameState, gameState.levelIndex === LEVELS.length - 1);
    } else if (wasPlaying && gameState.outcome === 'defeat') {
      ui.showDefeat(gameState);
    }
  }

  if (gameState) sceneManager.render(gameState);
  requestAnimationFrame(loop);
}

ui.showMainMenu();
requestAnimationFrame(loop);
