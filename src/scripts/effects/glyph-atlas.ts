// Pre-rendered glyphs for the ASCII hero: the 12 characters of the ramp in 3 brightness levels and in coral,
// drawn once into an offscreen canvas. Painting a cell is then one drawImage instead of a fillText.

export const RAMP = ' .,:;-=+*#%@';
/** Alpha of the ink for the three brightness levels */
const LEVELS = [0.5, 0.75, 1] as const;
const INK = '233,234,238';
const CORAL = '#ff7a66';

export interface GlyphAtlas {
  /** Draws glyph `char` (index into RAMP) at level 0–2, or 3 for coral, into a cell at (x, y) in CSS px. */
  draw(ctx: CanvasRenderingContext2D, char: number, level: number, x: number, y: number): void;
}

export function createGlyphAtlas(
  cw: number,
  ch: number,
  dpr: number,
  fontFamily: string,
): GlyphAtlas {
  const pw = Math.ceil(cw * dpr);
  const ph = Math.ceil(ch * dpr);
  const atlas = document.createElement('canvas');
  atlas.width = pw * RAMP.length;
  atlas.height = ph * (LEVELS.length + 1);
  const a = atlas.getContext('2d');
  if (a) {
    a.scale(dpr, dpr);
    a.font = `500 ${Math.round(cw * 1.3)}px ${fontFamily}`;
    a.textBaseline = 'top';
    for (let row = 0; row <= LEVELS.length; row++) {
      a.fillStyle = row < LEVELS.length ? `rgba(${INK},${LEVELS[row]})` : CORAL;
      for (let c = 1; c < RAMP.length; c++)
        a.fillText(RAMP[c] ?? '', c * cw + cw * 0.12, row * ch + ch * 0.12);
    }
  }
  return {
    draw(ctx, char, level, x, y) {
      ctx.drawImage(atlas, char * pw, level * ph, pw, ph, x, y, cw, ch);
    },
  };
}
