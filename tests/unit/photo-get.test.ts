import { afterEach, describe, expect, it, vi } from 'vitest';

const getEntry = vi.fn();
vi.mock('astro:content', () => ({ getEntry }));

const { getPhoto } = await import('@/lib/photos/get');

afterEach(() => vi.restoreAllMocks());

describe('getPhoto', () => {
  it('returns a published photo', async () => {
    const entry = { id: 'smoke', data: { published: true } };
    getEntry.mockResolvedValueOnce(entry);
    expect(await getPhoto('smoke')).toBe(entry);
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
