import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PUBLISHED_PHOTOS_ID, publishedPhotos } from '../../scripts/vite-published-photos';

async function load(yamls: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'photos-'));
  for (const [name, body] of Object.entries(yamls)) await writeFile(join(dir, name), body);
  const plugin = publishedPhotos(dir) as unknown as {
    load(this: { addWatchFile(p: string): void }, id: string): Promise<string>;
  };
  return plugin.load.call({ addWatchFile: () => undefined }, `\0${PUBLISHED_PHOTOS_ID}`);
}

describe('virtual:published-photos', () => {
  it('fails when two entries point to the same file, even if one is unpublished (HM-01)', async () => {
    await expect(
      load({
        'stage.yaml': 'image: ../assets/stage.jpg\npublished: false\n',
        'toast.yaml': 'image: ../assets/./x/../stage.jpg\npublished: true\n',
      }),
    ).rejects.toThrow(/stage\.yaml.*toast\.yaml|toast\.yaml.*stage\.yaml/);
  });

  it('imports only published photos', async () => {
    const code = await load({
      'a.yaml': 'image: ../assets/a.jpg\npublished: true\n',
      'b.yaml': 'image: ../assets/b.jpg\npublished: false\n',
    });
    expect(code).toContain('a.jpg');
    expect(code).not.toContain('b.jpg');
  });
});
