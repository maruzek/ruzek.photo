import tiles from '../../design/logo/logo-tiles.json';
import { logoPaths, type LogoTiles } from './logo';

/** Square crop around the tiles of the 320 × 320 logo (they span x 64–256, y 36–255), with a little air. */
const VIEW_BOX = '42 28 236 236';

/**
 * The logo as a stand-alone SVG for the browser tab and the home-screen icon.
 * `scheme: 'auto'` follows the browser's light or dark theme (night ink on a light tab, light ink on a dark one);
 * `'tile'` draws the night logo on the light surface, for raster icons that have no theme.
 */
export function faviconSvg(scheme: 'auto' | 'tile'): string {
  const paths = logoPaths(tiles as unknown as LogoTiles)
    .map((p) => `<path transform="${p.transform}" d="${p.d}"/>`)
    .join('');
  const style =
    scheme === 'auto'
      ? '<style>g{fill:#0b0c10}@media (prefers-color-scheme:dark){g{fill:#e9eaee}}</style>'
      : '<rect x="0" y="0" width="320" height="320" fill="#f2f2f3"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW_BOX}">${style}<g>${paths}</g></svg>`;
}
