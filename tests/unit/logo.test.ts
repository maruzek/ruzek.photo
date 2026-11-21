import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { logoPaths, type LogoTiles } from '@/lib/logo';

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
