import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { parse } from 'yaml';
import { z } from 'astro/zod';
import { photoSchema } from '@/lib/photos/schema';

const S = photoSchema(z.string());
const base = {
  image: 'x.jpg',
  alt: { cs: 'Řečník na pódiu', en: 'Speaker on stage' },
  category: 'event',
};

describe('photoSchema', () => {
  it('rejects published real photo without consentRef', () =>
    expect(S.safeParse({ ...base, published: true }).success).toBe(false));
  it('accepts published real photo with consentRef', () =>
    expect(S.safeParse({ ...base, published: true, consentRef: 'C-2026-001' }).success).toBe(true));
  it('rejects minors without parental consent', () =>
    expect(S.safeParse({ ...base, consentRef: 'C-1', minors: true }).success).toBe(false));
  it('rejects published minors without parental consent even with a valid consentRef', () =>
    expect(
      S.safeParse({ ...base, published: true, consentRef: 'C-2026-001', minors: true }).success
    ).toBe(false));
  it('accepts published minors with parental consent', () =>
    expect(
      S.safeParse({
        ...base,
        published: true,
        consentRef: 'C-2026-001',
        minors: true,
        parentalConsent: true,
      }).success
    ).toBe(true));
  it('placeholder needs credit, not consent', () => {
    expect(S.safeParse({ ...base, placeholder: true }).success).toBe(false);
    expect(S.safeParse({ ...base, placeholder: true, credit: 'StockSnap, CC0' }).success).toBe(true);
    expect(
      S.safeParse({ ...base, placeholder: true, published: true, credit: 'StockSnap, CC0' }).success
    ).toBe(true);
  });
  it('rejects consentRef that looks like an e-mail or name', () => {
    expect(S.safeParse({ ...base, consentRef: 'jana@firma.cz' }).success).toBe(false);
    expect(S.safeParse({ ...base, consentRef: 'Jana Nováková' }).success).toBe(false);
    expect(S.safeParse({ ...base, published: true, consentRef: 'C-2026-01' }).success).toBe(false);
  });
  it('unpublished photo needs nothing', () =>
    expect(S.safeParse({ ...base, published: false }).success).toBe(true));
  it('is unpublished by default and fills the other defaults', () => {
    const parsed = S.parse(base);
    expect(parsed).toMatchObject({
      published: false,
      placeholder: false,
      minors: false,
      parentalConsent: false,
      shade: 'normal',
    });
  });
  it('rejects a published photo whose alt text is still a TODO', () => {
    const alt = { cs: 'TODO', en: 'TODO' };
    expect(S.safeParse({ ...base, alt, published: true, consentRef: 'C-2026-001' }).success).toBe(false);
    expect(S.safeParse({ ...base, alt, published: false }).success).toBe(true);
  });
  it('rejects an empty alt text and unknown categories and shades', () => {
    expect(S.safeParse({ ...base, alt: { cs: '', en: 'x' } }).success).toBe(false);
    expect(S.safeParse({ ...base, category: 'wedding' }).success).toBe(false);
    expect(S.safeParse({ ...base, shade: 'soft' }).success).toBe(false);
  });
  it('accepts a caption in both languages and rejects half of one', () => {
    expect(S.safeParse({ ...base, caption: { cs: 'Ples', en: 'Ball' } }).success).toBe(true);
    expect(S.safeParse({ ...base, caption: { cs: 'Ples' } }).success).toBe(false);
  });
});

describe('src/content/photos', () => {
  const dir = join(import.meta.dirname, '../../src/content/photos');
  const files = readdirSync(dir).filter((f) => f.endsWith('.yaml'));

  it('has the 14 placeholders', () => expect(files).toHaveLength(14));
  it.each(files)('%s passes the schema', (file) => {
    const result = S.safeParse(parse(readFileSync(join(dir, file), 'utf8')));
    expect(result.error?.issues ?? []).toEqual([]);
    expect(result.success).toBe(true);
  });
});
