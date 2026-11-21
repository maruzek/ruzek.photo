import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PLACEMENT, TEXT_OVER_PHOTOS } from '@/config/placement';

describe('placement', () => {
  it('lists the hero first, then the folds, as the photos check:contrast measures', () => {
    expect(TEXT_OVER_PHOTOS).toEqual([PLACEMENT.hero, ...PLACEMENT.folds]);
  });

  it('names photos that exist in the collection', () => {
    for (const id of TEXT_OVER_PHOTOS) {
      expect(existsSync(`src/content/photos/${id}.yaml`), id).toBe(true);
    }
  });
});
