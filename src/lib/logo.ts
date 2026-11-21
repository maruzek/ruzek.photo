/** Shape of `design/logo/logo-tiles.json` (only the fields the SVG needs). */
export interface LogoTiles {
  viewBox: readonly [number, number, number, number];
  gridSize: number;
  tileInset: number;
  tileSize: number;
  faces: Record<LogoFace, { matrix: readonly [number, number, number, number, number, number] }>;
  tiles: readonly { face: LogoFace; i: number; j: number; fill?: string }[];
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

/** The grey variant's 7 steps (logo-tiles.json `fill`), darkest at the cube corner. */
export const LOGO_GREYS = [
  '#181818',
  '#383838',
  '#585858',
  '#787878',
  '#989898',
  '#b8b8b8',
  '#d0d0d0',
] as const;

/** A grey of the logo inverted for the night background (#181818 → #e7e7e7). */
export function invertGrey(hex: string): string {
  const v = 255 - parseInt(hex.slice(1, 3), 16);
  return `#${v.toString(16).padStart(2, '0').repeat(3)}`;
}

/**
 * Logo data for the entry loader: `packed` holds one "f i j g" digit group per tile (face index in FACES order,
 * cell, grey index) for the canvas, `paths` the vector logo in inverted greys, one path per face and grey, drawn
 * on exactly the pixels the canvas used.
 */
export function loaderTiles(data: LogoTiles): {
  packed: string;
  paths: { transform: string; d: string; fill: string }[];
} {
  const grey = (fill: string | undefined): number => {
    const g = LOGO_GREYS.indexOf((fill ?? '').toLowerCase() as (typeof LOGO_GREYS)[number]);
    if (g < 0) throw new Error(`logo: unknown grey ${String(fill)}`);
    return g;
  };
  const packed = data.tiles
    .map((t) => `${FACES.indexOf(t.face)}${t.i}${t.j}${grey(t.fill)}`)
    .join('');
  const { tileInset, tileSize } = data;
  const paths = FACES.flatMap((face) =>
    LOGO_GREYS.map((hex, g) => ({
      transform: `matrix(${data.faces[face].matrix.map((n) => String(n)).join(' ')})`,
      fill: invertGrey(hex),
      d: data.tiles
        .filter((t) => t.face === face && grey(t.fill) === g)
        .map((t) => {
          const x = String(Number((t.i + tileInset).toFixed(4)));
          const y = String(Number((t.j + tileInset).toFixed(4)));
          return `M${x} ${y}h${num(tileSize)}v${num(tileSize)}h-${num(tileSize)}z`;
        })
        .join(''),
    })).filter((p) => p.d !== ''),
  );
  return { packed, paths };
}
