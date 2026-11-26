import { afterEach, describe, expect, it, vi } from 'vitest';

const getEntry = vi.fn();
vi.mock('astro:content', () => ({ getEntry }));
const smokeImage = { src: '/smoke.jpg', width: 10, height: 10, format: 'jpg' };
const heroImage = { src: '/hero.jpg', width: 30, height: 20, format: 'jpg' };
const heroCrop = { src: '/hero.mobile.jpg', width: 12, height: 20, format: 'jpg' };
vi.mock('virtual:published-photos', () => ({
  default: { smoke: smokeImage, hero: heroImage },
  mobile: { hero: heroCrop },
}));

const { getPhoto } = await import('@/lib/photos/get');

afterEach(() => vi.restoreAllMocks());

describe('getPhoto', () => {
  it('returns a published photo with its image resolved', async () => {
    getEntry.mockResolvedValueOnce({
      id: 'smoke',
      data: { published: true, image: '../../assets/photos/smoke.jpg' },
    });
    expect(await getPhoto('smoke')).toEqual({
      id: 'smoke',
      data: { published: true, image: smokeImage },
      mobile: undefined,
    });
  });

  it('adds the portrait phone crop of a full-screen photo', async () => {
    getEntry.mockResolvedValueOnce({ id: 'hero', data: { published: true } });
    expect((await getPhoto('hero'))?.mobile).toBe(heroCrop);
  });

  it('fails loudly when a published photo has no imported image', async () => {
    getEntry.mockResolvedValueOnce({
      id: 'ghost',
      data: { published: true, image: '../../assets/photos/ghost.jpg' },
    });
    await expect(getPhoto('ghost')).rejects.toThrow(/"ghost" has no image/);
  });

  it('returns undefined and warns when the photo is withdrawn', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    getEntry.mockResolvedValueOnce({ id: 'ball', data: { published: false } });
    expect(await getPhoto('ball')).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"ball" is not published'));
  });

  it('returns undefined and warns when the YAML is gone', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    getEntry.mockResolvedValueOnce(undefined);
    expect(await getPhoto('gone')).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"gone" is not in the photos'));
  });
});
