import { describe, expect, it } from 'vitest';
import { OG_SIZE, ogSize } from '@/lib/seo/og';

// ST-09: the share image size, independent of the e2e test that reuses this helper
describe('ogSize', () => {
  it('a source at least 1200 px wide gives exactly 1200 × 630', () => {
    expect(OG_SIZE).toEqual({ width: 1200, height: 630 });
    expect(ogSize({ width: 1200, height: 630 })).toEqual({ width: 1200, height: 630 });
    expect(ogSize({ width: 6000, height: 4000 })).toEqual({ width: 1200, height: 630 });
    expect(ogSize({ width: 4000, height: 6000 })).toEqual({ width: 1200, height: 630 });
  });
  it('a smaller source gives the largest crop with the same ratio, never upscaled', () => {
    expect(ogSize({ width: 960, height: 640 })).toEqual({ width: 960, height: 504 });
    // a wide strip: the height limits the width
    expect(ogSize({ width: 2000, height: 315 })).toEqual({ width: 600, height: 315 });
  });
});
