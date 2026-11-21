/** Shape of `design/logo/logo-tiles.json` (only the fields the SVG needs). */
export interface LogoTiles {
  viewBox: readonly [number, number, number, number];
  gridSize: number;
  tileInset: number;
  tileSize: number;
  faces: Record<LogoFace, { matrix: readonly [number, number, number, number, number, number] }>;
  tiles: readonly { face: LogoFace; i: number; j: number }[];
}

export type LogoFace = 'top' | 'left' | 'right';

/** Same order as the inline SVG of the prototype (index.html:262). */
const FACES: readonly LogoFace[] = ['top', 'left', 'right'];

/** 0.79 → ".79" (the prototype drops the leading zero), 1.105 → "1.105". */
function num(n: number): string {
  const s = String(Number(n.toFixed(4)));
  return s.replace(/^(-?)0\./, '$1.');
}

/**
 * One `<path>` per cube face: the face matrix as `transform`, and a single `d` holding a closed
 * square per tile in the face's own 7×7 grid. Only listed cells exist; the rest are the dither falloff.
 */
export function logoPaths(data: LogoTiles): { transform: string; d: string }[] {
  const { tileInset, tileSize } = data;
  return FACES.map((face) => ({
    transform: `matrix(${data.faces[face].matrix.map((n) => String(n)).join(' ')})`,
    d: data.tiles
      .filter((tile) => tile.face === face)
      .map((tile) => {
        // x and y are written as in the prototype: "0.105" keeps its zero, the size is ".79"
        const x = String(Number((tile.i + tileInset).toFixed(4)));
        const y = String(Number((tile.j + tileInset).toFixed(4)));
        return `M${x} ${y}h${num(tileSize)}v${num(tileSize)}h-${num(tileSize)}z`;
      })
      .join(''),
  }));
}
