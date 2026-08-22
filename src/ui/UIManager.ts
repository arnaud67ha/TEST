import { el } from './dom.ts';
import type { GameState, PlacedTower } from '../game/GameState.ts';
import type { SaveManager } from '../game/SaveManager.ts';
import { LEVELS } from '../game/levels.ts';
import { TOWER_DEFS, TOWER_ORDER } from '../game/towers.ts';
import type { TowerTypeId } from '../game/types.ts';

function stars(count: number, total = 3): string {
  return Array.from({ length: total }, (_, i) => (i < count ? '★' : '☆')).join('');
}

function starsHtml(count: number, total = 3): HTMLElement {
  const span = el('span', 'level-stars');
  for (let i = 0; i < total; i++) {
    const s = el('span', i < count ? 'filled' : '', '★');
    span.appendChild(s);
  }
  return span;
}

function statLine(label: string, value: string): HTMLElement {
  const wrap = el('div');
  wrap.append(el('span', undefined, `${label}: `), el('strong', undefined, value));
  return wrap;
}

function towerSpecialLine(type: TowerTypeId, stats: (typeof TOWER_DEFS)[TowerTypeId]['levels'][number]): string | null {
  if (type === 'cannon' && stats.splashRadius) return `Zone ${stats.splashRadius.toFixed(1)}`;
  if (type === 'frost' && stats.slowFactor) return `Ralentit -${Math.round(stats.slowFactor * 100)}%`;
  if (type === 'tesla' && stats.chainCount) return `Chaîne x${stats.chainCount + 1}`;
  return null;
}

export class UIManager {
  private root: HTMLElement;
  private save: SaveManager;

  private screenLayer = el('div');
  private hudLayer = el('div');
  private modalLayer = el('div');

  private hudGoldEl!: HTMLElement;
  private hudLivesEl!: HTMLElement;
  private hudWaveEl!: HTMLElement;
  private pauseBtn!: HTMLButtonElement;
  private speedBtn!: HTMLButtonElement;
  private autoBtn!: HTMLButtonElement;
  private waveBtn!: HTMLButtonElement;
  private buildHintEl!: HTMLElement;
  private towerButtons = new Map<TowerTypeId, HTMLButtonElement>();
  private popupHost = el('div');
  private popupRefs: { towerId: string; level: number; upgradeBtn: HTMLButtonElement; sellBtn: HTMLButtonElement } | null = null;

  onPlay: (() => void) | null = null;
  onResetProgress: (() => void) | null = null;
  onSelectLevel: ((index: number) => void) | null = null;
  onBackToMenu: (() => void) | null = null;
  onBuildSelect: ((type: TowerTypeId) => void) | null = null;
  onStartWave: (() => void) | null = null;
  onTogglePause: (() => void) | null = null;
  onToggleAuto: (() => void) | null = null;
  onToggleSpeed: (() => void) | null = null;
  onUpgradeTower: ((id: string) => void) | null = null;
  onSellTower: ((id: string) => void) | null = null;
  onCloseTowerPopup: (() => void) | null = null;
  onResume: (() => void) | null = null;
  onRestartLevel: (() => void) | null = null;
  onNextLevel: (() => void) | null = null;
  onRetryLevel: (() => void) | null = null;
  onLevelsMenu: (() => void) | null = null;

  constructor(root: HTMLElement, save: SaveManager) {
    this.root = root;
    this.save = save;
    this.root.append(this.screenLayer, this.hudLayer, this.modalLayer);
  }

  // ---------------------------------------------------------------- menus

  showMainMenu(): void {
    this.hideHUD();
    this.clearModal();
    this.screenLayer.innerHTML = '';
    const screen = el('div', 'screen');
    screen.append(
      el('h1', 'title', 'Tower Keep'),
      el('p', 'subtitle', 'Défends ta forteresse — pseudo-3D, uniquement pour toi.'),
    );
    const playBtn = el('button', 'primary-btn', 'Jouer');
    playBtn.onclick = () => this.onPlay?.();
    screen.append(playBtn);

    const resetBtn = el('button', 'ghost-btn', 'Réinitialiser la progression');
    resetBtn.onclick = () => {
      if (confirm('Réinitialiser toute la progression ?')) this.onResetProgress?.();
    };
    screen.append(resetBtn);

    this.screenLayer.appendChild(screen);
  }

  showLevelSelect(): void {
    this.screenLayer.innerHTML = '';
    const screen = el('div', 'screen');
    screen.append(el('h1', 'title', 'Niveaux'));

    const list = el('div', 'level-list');
    LEVELS.forEach((level, i) => {
      const unlocked = this.save.isUnlocked(i);
      const card = el('div', `level-card${unlocked ? '' : ' locked'}`);
      const info = el('div', 'level-info');
      info.append(el('div', 'level-name', level.name), starsHtml(this.save.starsFor(i)));
      card.appendChild(info);
      const action = el('button', 'secondary-btn', unlocked ? 'Jouer' : '🔒');
      action.disabled = !unlocked;
      action.onclick = () => this.onSelectLevel?.(i);
      card.appendChild(action);
      list.appendChild(card);
    });
    screen.appendChild(list);

    const backBtn = el('button', 'ghost-btn', 'Retour au menu');
    backBtn.onclick = () => this.onBackToMenu?.();
    screen.appendChild(backBtn);

    this.screenLayer.appendChild(screen);
  }

  // ------------------------------------------------------------------ HUD

  showHUD(): void {
    this.screenLayer.innerHTML = '';
    this.hudLayer.innerHTML = '';
    this.towerButtons.clear();

    const top = el('div', 'hud-top');
    const stats = el('div', 'hud-controls');
    this.hudGoldEl = el('div', 'hud-stat gold', '🪙 0');
    this.hudLivesEl = el('div', 'hud-stat lives', '❤ 0');
    this.hudWaveEl = el('div', 'hud-stat wave', 'Vague -/-');
    stats.append(this.hudGoldEl, this.hudLivesEl, this.hudWaveEl);

    const controls = el('div', 'hud-controls');
    this.autoBtn = el('button', 'icon-btn', 'A');
    this.autoBtn.title = 'Démarrage automatique des vagues';
    this.autoBtn.onclick = () => this.onToggleAuto?.();
    this.speedBtn = el('button', 'icon-btn', '1x');
    this.speedBtn.title = 'Vitesse de jeu';
    this.speedBtn.onclick = () => this.onToggleSpeed?.();
    this.pauseBtn = el('button', 'icon-btn', '❚❚');
    this.pauseBtn.title = 'Pause';
    this.pauseBtn.onclick = () => this.onTogglePause?.();
    controls.append(this.autoBtn, this.speedBtn, this.pauseBtn);

    top.append(stats, controls);

    const bottom = el('div', 'hud-bottom');
    this.buildHintEl = el('div', 'build-hint', '');
    const shop = el('div', 'tower-shop');
    for (const type of TOWER_ORDER) {
      const def = TOWER_DEFS[type];
      const btn = el('button', 'tower-btn');
      const swatch = el('div', 'swatch');
      swatch.style.background = def.color;
      btn.append(swatch, el('div', 'name', def.name), el('div', 'cost', `${def.levels[0].upgradeCost}🪙`));
      btn.onclick = () => this.onBuildSelect?.(type);
      this.towerButtons.set(type, btn);
      shop.appendChild(btn);
    }
    this.waveBtn = el('button', 'wave-btn', 'Lancer la vague');
    this.waveBtn.onclick = () => this.onStartWave?.();

    this.popupHost.innerHTML = '';
    this.popupRefs = null;
    bottom.append(this.buildHintEl, this.popupHost, shop, this.waveBtn);

    this.hudLayer.append(top, bottom);
  }

  hideHUD(): void {
    this.hudLayer.innerHTML = '';
  }

  updateHUD(
    state: GameState,
    selectedTower: PlacedTower | null,
    buildSelection: TowerTypeId | null,
  ): void {
    this.hudGoldEl.textContent = `🪙 ${state.gold}`;
    this.hudLivesEl.textContent = `❤ ${state.lives}`;
    const currentWave = state.waveNumber >= 0 ? state.waveNumber + 1 : 0;
    this.hudWaveEl.textContent = `Vague ${currentWave}/${state.totalWaves}`;

    this.autoBtn.classList.toggle('active', state.autoStart);
    this.speedBtn.textContent = `${state.timeScale}x`;
    this.speedBtn.classList.toggle('active', state.timeScale === 2);

    for (const [type, btn] of this.towerButtons) {
      const cost = TOWER_DEFS[type].levels[0].upgradeCost;
      btn.disabled = state.gold < cost;
      btn.classList.toggle('selected', buildSelection === type);
    }
    this.buildHintEl.textContent = buildSelection ? 'Touche une case libre pour construire' : '';

    if (state.waveInProgress) {
      this.waveBtn.textContent = 'Vague en cours…';
      this.waveBtn.disabled = true;
    } else if (!state.canStartWave()) {
      this.waveBtn.textContent = 'Terminé';
      this.waveBtn.disabled = true;
    } else {
      this.waveBtn.textContent = `Lancer la vague ${currentWave + 1}/${state.totalWaves}`;
      this.waveBtn.disabled = false;
    }

    this.renderTowerPopup(state, selectedTower);
  }

  private renderTowerPopup(state: GameState, tower: PlacedTower | null): void {
    if (!tower) {
      if (this.popupRefs) {
        this.popupHost.innerHTML = '';
        this.popupRefs = null;
      }
      return;
    }

    const def = TOWER_DEFS[tower.type];

    // Rebuild the DOM only when the selection itself changes (a different
    // tower, or a level-up) — not every animation frame. Recreating these
    // nodes each frame would detach the buttons mid-tap on touch devices,
    // silently swallowing every "Améliorer" press.
    if (!this.popupRefs || this.popupRefs.towerId !== tower.id || this.popupRefs.level !== tower.level) {
      this.popupHost.innerHTML = '';
      const levelStats = def.levels[tower.level - 1];
      const popup = el('div', 'tower-popup');

      const header = el('div', 'tower-popup-header');
      header.append(el('span', undefined, `${def.name} — Niv. ${tower.level}`));
      popup.appendChild(header);

      const statsGrid = el('div', 'tower-popup-stats');
      statsGrid.append(
        statLine('Dégâts', `${levelStats.damage}`),
        statLine('Portée', levelStats.range.toFixed(1)),
        statLine('Cadence', `${levelStats.fireRate.toFixed(1)}/s`),
      );
      const special = towerSpecialLine(tower.type, levelStats);
      if (special) statsGrid.appendChild(statLine('Spécial', special));
      popup.appendChild(statsGrid);

      const actions = el('div', 'tower-popup-actions');
      const upgradeBtn = el('button', 'btn-upgrade');
      upgradeBtn.onclick = () => this.onUpgradeTower?.(tower.id);

      const sellBtn = el('button', 'btn-sell');
      sellBtn.onclick = () => this.onSellTower?.(tower.id);

      const closeBtn = el('button', 'btn-close', '✕');
      closeBtn.onclick = () => this.onCloseTowerPopup?.();

      actions.append(upgradeBtn, sellBtn, closeBtn);
      popup.appendChild(actions);
      this.popupHost.appendChild(popup);

      this.popupRefs = { towerId: tower.id, level: tower.level, upgradeBtn, sellBtn };
    }

    // Cheap per-frame refresh: text/disabled state only, nodes stay put.
    const upgradeCost = state.upgradeCostFor(tower);
    this.popupRefs.upgradeBtn.textContent = upgradeCost === null ? 'Niveau max' : `Améliorer (${upgradeCost}🪙)`;
    this.popupRefs.upgradeBtn.disabled = upgradeCost === null || state.gold < upgradeCost;

    const refund = Math.round(tower.investedGold * def.sellRatio);
    this.popupRefs.sellBtn.textContent = `Vendre (+${refund}🪙)`;
  }

  // --------------------------------------------------------------- modals

  private buildModalCard(): { backdrop: HTMLElement; card: HTMLElement } {
    const backdrop = el('div', 'modal-backdrop');
    const card = el('div', 'modal-card');
    backdrop.appendChild(card);
    return { backdrop, card };
  }

  clearModal(): void {
    this.modalLayer.innerHTML = '';
  }

  showPause(): void {
    this.clearModal();
    const { backdrop, card } = this.buildModalCard();
    card.append(el('div', 'modal-title', 'Pause'));
    const actions = el('div', 'modal-actions');
    const resume = el('button', 'primary-btn', 'Reprendre');
    resume.onclick = () => this.onResume?.();
    const restart = el('button', 'secondary-btn', 'Recommencer le niveau');
    restart.onclick = () => this.onRestartLevel?.();
    const menu = el('button', 'ghost-btn', 'Menu des niveaux');
    menu.onclick = () => this.onLevelsMenu?.();
    actions.append(resume, restart, menu);
    card.appendChild(actions);
    this.modalLayer.appendChild(backdrop);
  }

  showVictory(state: GameState, isLastLevel: boolean): void {
    this.clearModal();
    const { backdrop, card } = this.buildModalCard();
    card.append(el('div', 'modal-title victory', 'Niveau réussi !'));
    card.append(el('div', 'modal-stars', stars(state.starsEarned)));
    card.append(el('div', 'modal-stats', `Vies restantes : ${state.lives}/${state.maxLives} — Or : ${state.gold}`));
    const actions = el('div', 'modal-actions');
    if (!isLastLevel) {
      const next = el('button', 'primary-btn', 'Niveau suivant');
      next.onclick = () => this.onNextLevel?.();
      actions.appendChild(next);
    }
    const retry = el('button', 'secondary-btn', 'Rejouer');
    retry.onclick = () => this.onRetryLevel?.();
    const menu = el('button', 'ghost-btn', 'Menu des niveaux');
    menu.onclick = () => this.onLevelsMenu?.();
    actions.append(retry, menu);
    card.appendChild(actions);
    this.modalLayer.appendChild(backdrop);
  }

  showDefeat(state: GameState): void {
    this.clearModal();
    const { backdrop, card } = this.buildModalCard();
    card.append(el('div', 'modal-title defeat', 'Défaite'));
    card.append(el('div', 'modal-stats', `Ta forteresse est tombée à la vague ${state.waveNumber + 1}/${state.totalWaves}.`));
    const actions = el('div', 'modal-actions');
    const retry = el('button', 'primary-btn', 'Réessayer');
    retry.onclick = () => this.onRetryLevel?.();
    const menu = el('button', 'ghost-btn', 'Menu des niveaux');
    menu.onclick = () => this.onLevelsMenu?.();
    actions.append(retry, menu);
    card.appendChild(actions);
    this.modalLayer.appendChild(backdrop);
  }
}
