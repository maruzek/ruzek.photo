// Adaptive quality for the canvas effects: a weak device gets the short ASCII intro and no lens.

export type Quality = 'full' | 'lite';

export interface QualityProbe {
  sample(frameMs: number): void;
  verdict(): Quality | 'pending';
}

/** Collects `frames` frame times; slower than `budgetMs` on median → `lite`. */
export function createQualityProbe(
  opts: { frames?: number; budgetMs?: number } = {},
): QualityProbe {
  const frames = opts.frames ?? 30;
  const budget = opts.budgetMs ?? 24;
  const samples: number[] = [];
  return {
    sample(frameMs) {
      if (samples.length < frames && Number.isFinite(frameMs) && frameMs > 0) samples.push(frameMs);
    },
    verdict() {
      if (samples.length < frames) return 'pending';
      const sorted = [...samples].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
      return median > budget ? 'lite' : 'full';
    },
  };
}

/** Before any frame is measured: little memory or Save-Data start in `lite`. */
export function initialQuality(nav: {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}): Quality {
  if (nav.connection?.saveData) return 'lite';
  if (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) return 'lite';
  return 'full';
}
