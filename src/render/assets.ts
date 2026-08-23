// Real sprites from Kenney's "Tower Defense (top-down) Pack" (CC0 1.0,
// kenney.nl), via github.com/jhonnold/tower-defense-v2 — see
// src/assets/scifi/SOURCE.txt.
import towerArcherUrl from '../assets/scifi/tower-archer.png';
import towerTrebuchetUrl from '../assets/scifi/tower-trebuchet.png';
import towerFrostUrl from '../assets/scifi/tower-frost.png';
import towerMageUrl from '../assets/scifi/tower-mage.png';
import enemyOrcUrl from '../assets/scifi/enemy-orc.png';
import enemyGoblinUrl from '../assets/scifi/enemy-goblin.png';
import enemyTrollUrl from '../assets/scifi/enemy-troll.png';
import enemyDragonUrl from '../assets/scifi/enemy-dragon.png';
import groundGrassUrl from '../assets/scifi/ground-grass.png';
import groundPathUrl from '../assets/scifi/ground-path.png';
import decoBushUrl from '../assets/scifi/deco-bush.png';
import decoRockUrl from '../assets/scifi/deco-rock.png';
import projectileRocketUrl from '../assets/scifi/projectile-rocket.png';

function img(src: string): HTMLImageElement {
  const el = new Image();
  el.src = src;
  return el;
}

export const sprites = {
  groundGrass: img(groundGrassUrl),
  groundPath: img(groundPathUrl),
  bushes: [img(decoBushUrl)],
  rocks: [img(decoRockUrl)],
  towers: {
    archer: img(towerArcherUrl),
    trebuchet: img(towerTrebuchetUrl),
    frost: img(towerFrostUrl),
    mage: img(towerMageUrl),
  },
  enemies: {
    orc: img(enemyOrcUrl),
    goblin: img(enemyGoblinUrl),
    troll: img(enemyTrollUrl),
    dragon: img(enemyDragonUrl),
  },
  projectileRocket: img(projectileRocketUrl),
};

const allImages = [
  sprites.groundGrass,
  sprites.groundPath,
  sprites.projectileRocket,
  ...sprites.bushes,
  ...sprites.rocks,
  ...Object.values(sprites.towers),
  ...Object.values(sprites.enemies),
];

let readyPromise: Promise<void> | null = null;

/** Resolves once every sprite image has finished decoding, so canvas
 * patterns/drawImage calls never hit a 0x0 not-yet-loaded image. */
export function assetsReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = Promise.all(
      allImages.map((el) =>
        el.decode().catch(() => {
          // A failed decode still resolves the group — draw calls simply
          // no-op on a broken image instead of blocking the whole level.
        }),
      ),
    ).then(() => undefined);
  }
  return readyPromise;
}
