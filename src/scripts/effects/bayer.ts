// The 8 × 8 ordered-dither (Bayer) matrix, normalised to 0..1 (prototype: rozpad.js "8×8 Bayer matrix").

function build(): Float32Array {
  let m: number[][] = [[0]];
  for (let n = 1; n < 8; n *= 2) {
    const s = m.length;
    const next: number[][] = [];
    for (let y = 0; y < s * 2; y++) {
      const row: number[] = [];
      for (let x = 0; x < s * 2; x++) {
        const quadrant = (y < s ? 0 : 2) + (x < s ? 0 : 1);
        const base = [0, 2, 3, 1][quadrant] ?? 0;
        row.push(4 * (m[y % s]?.[x % s] ?? 0) + base);
      }
      next.push(row);
    }
    m = next;
  }
  return Float32Array.from(m.flat(), (v) => (v + 0.5) / 64);
}

/** 64 thresholds `(m + .5) / 64`, index `(y & 7) * 8 + (x & 7)`. */
export const B8: Float32Array = build();

/** Threshold of the cell at (x, y); coordinates wrap every 8 cells. */
export function b8(x: number, y: number): number {
  return B8[(y & 7) * 8 + (x & 7)] ?? 0;
}
