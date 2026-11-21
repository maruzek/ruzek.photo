import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { invertGrey, LOGO_GREYS, loaderTiles, logoPaths, type LogoTiles } from '@/lib/logo';

const tiles = JSON.parse(readFileSync('design/logo/logo-tiles.json', 'utf8')) as LogoTiles;
const prototype = readFileSync('design/final/rozpad/index.html', 'utf8');

describe('logoPaths', () => {
  const paths = logoPaths(tiles);

  it('returns the three faces with 74 tiles in total', () => {
    expect(paths).toHaveLength(3);
    expect(tiles.tiles).toHaveLength(74);
    // every tile is one closed sub-path
    const squares = paths.reduce((sum, p) => sum + (p.d.match(/z/g) ?? []).length, 0);
    expect(squares).toBe(74);
  });

  it('matches the inline SVG of the prototype (index.html:262) path for path', () => {
    const svg = /<svg class="roh"[\s\S]*?<\/svg>/.exec(prototype)?.[0] ?? '';
    const expected = [...svg.matchAll(/<path transform="([^"]+)" d="([^"]+)"/g)].map((m) => ({
      transform: m[1],
      d: m[2],
    }));
    expect(expected).toHaveLength(3);
    expect(paths).toEqual(expected);
  });

  it('first face transform is the top face matrix', () => {
    expect(paths[0]?.transform).toBe('matrix(13.8564 -8 -13.8564 -8 160 146)');
  });
});

describe('loaderTiles', () => {
  const { packed, paths } = loaderTiles(tiles);

  it('packs the same tiles and greys as the b-1 loader prototype', () => {
    const proto = readFileSync('design/loader-concepts/concepts/b-1.html', 'utf8');
    const logo = JSON.parse(
      /const LOGO = (\[\[[\s\S]*?\]\]);/.exec(proto)?.[1] ?? '[]',
    ) as number[][];
    expect(logo).toHaveLength(74);
    const fromProto = new Set(logo.map((t) => t.join('')));
    expect(new Set(packed.match(/\d{4}/g))).toEqual(fromProto);
  });

  it('draws every tile once in the inverted greys', () => {
    const squares = paths.reduce((sum, p) => sum + (p.d.match(/z/g) ?? []).length, 0);
    expect(squares).toBe(74);
    expect(invertGrey('#181818')).toBe('#e7e7e7');
    expect(new Set(paths.map((p) => p.fill))).toEqual(new Set(LOGO_GREYS.map(invertGrey)));
  });
});
