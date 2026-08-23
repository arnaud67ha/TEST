// Real painted sprites from Kenney's "Medieval RTS" pack (CC0 1.0,
// kenney.nl) — see public/assets/medieval-rts/KENNEY_LICENSE.txt.
// Towers and monsters have no equivalent in that pack and stay hand-drawn
// in sprites.ts. Imported (not just referenced by URL) so Vite inlines
// them as data URIs — these are tiny, and it keeps the single-file
// artifact build self-contained.
import grassUrl from '../assets/medieval-rts/grass.png';
import dirtUrl from '../assets/medieval-rts/dirt.png';
import castleUrl from '../assets/medieval-rts/castle.png';
import tree1Url from '../assets/medieval-rts/tree1.png';
import tree2Url from '../assets/medieval-rts/tree2.png';
import tree3Url from '../assets/medieval-rts/tree3.png';
import tree4Url from '../assets/medieval-rts/tree4.png';
import rock1Url from '../assets/medieval-rts/rock1.png';
import rock2Url from '../assets/medieval-rts/rock2.png';
import rock3Url from '../assets/medieval-rts/rock3.png';
import rock4Url from '../assets/medieval-rts/rock4.png';
import rock5Url from '../assets/medieval-rts/rock5.png';

function img(src: string): HTMLImageElement {
  const el = new Image();
  el.src = src;
  return el;
}

export const sprites = {
  grass: img(grassUrl),
  dirt: img(dirtUrl),
  castle: img(castleUrl),
  trees: [img(tree1Url), img(tree2Url), img(tree3Url), img(tree4Url)],
  rocks: [img(rock1Url), img(rock2Url), img(rock3Url), img(rock4Url), img(rock5Url)],
};

const allImages = [sprites.grass, sprites.dirt, sprites.castle, ...sprites.trees, ...sprites.rocks];

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
