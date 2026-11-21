import { describe, it, expect } from 'vitest';
import { cs } from '@/i18n/cs';
import { en } from '@/i18n/en';
import { localePath, alternates, t, fill } from '@/i18n';
import { SERVICE_IDS } from '@/config/pricing';

// Dotted paths of every leaf (strings inside arrays get their index as a path segment).
const keys = (o: object, p = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? keys(v, `${p}${k}.`) : [`${p}${k}`],
  );

const read = (d: object, path: string): unknown =>
  path.split('.').reduce<unknown>((o, x) => (o as Record<string, unknown>)[x], d);

describe('i18n', () => {
  it('en has exactly the cs keys', () => expect(keys(en).sort()).toEqual(keys(cs).sort()));
  it('no empty strings', () => {
    for (const d of [cs, en]) for (const k of keys(d)) expect(read(d, k), k).not.toBe('');
  });
  it('builds paths', () => {
    expect(localePath('cs', 'home')).toBe('/');
    expect(localePath('en', 'home')).toBe('/en/');
    expect(alternates('privacy')).toEqual({ cs: '/zasady-ochrany-osobnich-udaju/', en: '/en/privacy/' });
  });
  it('builds the remaining routes', () => {
    expect(localePath('cs', 'privacy')).toBe('/zasady-ochrany-osobnich-udaju/');
    expect(localePath('en', 'privacy')).toBe('/en/privacy/');
    expect(alternates('home')).toEqual({ cs: '/', en: '/en/' });
    expect(alternates('caseStudy', 'turnaj')).toEqual({
      cs: '/pripadove-studie/turnaj/',
      en: '/en/case-studies/turnaj/',
    });
    expect(localePath('en', 'caseStudy', 'turnaj')).toBe('/en/case-studies/turnaj/');
  });
  it('has no case-study index page, so a slug is required', () => {
    expect(() => alternates('caseStudy')).toThrow(/slug/);
  });
  it('every pricing service resolves to a card in both languages', () => {
    for (const d of [cs, en])
      for (const id of SERVICE_IDS) {
        expect(d.services.cards[id].title, id).toBeTruthy();
        expect(d.services.cards[id].text, id).toBeTruthy();
      }
  });
  it('the language switch names the other language in that language', () => {
    expect(cs.lang.other).toBe('English');
    expect(en.lang.other).toBe('Čeština');
  });
  it('the form has only the acknowledgement sentence about privacy (docs/decisions.md)', () => {
    for (const d of [cs, en]) expect(Object.keys(d.inquiry.privacy).sort()).toEqual(['acknowledge', 'link']);
  });
  it('t() returns the dictionary of the locale', () => {
    expect(t('cs')).toBe(cs);
    expect(t('en')).toBe(en);
  });
  it('English page is flagged until the translation is approved', () => {
    expect(en.meta.translationTodo).toMatch(/překlad/);
  });
  it('section anchors differ per language', () => {
    expect(cs.anchors).toEqual({ work: 'prace', services: 'sluzby', about: 'o-mne', inquiry: 'poptavka' });
    expect(en.anchors).toEqual({ work: 'work', services: 'services', about: 'about', inquiry: 'inquiry' });
  });
  it('emphasis markers are balanced', () => {
    for (const d of [cs, en])
      for (const k of keys(d)) {
        const v = read(d, k);
        if (typeof v === 'string') expect((v.match(/\*/g) ?? []).length % 2, k).toBe(0);
      }
  });
  it('prices live in the pricing config, never in dictionaries', () => {
    for (const d of [cs, en])
      for (const k of keys(d)) {
        const v = read(d, k);
        if (typeof v === 'string') expect(v, k).not.toMatch(/\d[\d\s\u00A0,.–-]*\s?(Kč|CZK|%)/);
      }
  });
  it('mentions no camera brands', () => {
    for (const d of [cs, en])
      for (const k of keys(d)) {
        const v = read(d, k);
        if (typeof v === 'string') expect(v, k).not.toMatch(/canon|nikon|sony|fuji|lumix|leica|olympus|panasonic/i);
      }
  });
  it('keeps real contact addresses out of the dictionaries (they live in site config)', () => {
    for (const d of [cs, en])
      for (const k of keys(d)) {
        const v = read(d, k);
        if (typeof v === 'string') expect(v, k).not.toMatch(/martinruzek|@gmail\./i);
      }
  });
});

describe('fill', () => {
  it('replaces named placeholders', () => expect(fill('Instagram {handle}', { handle: '@x' })).toBe('Instagram @x'));
  it('fails loudly on a missing value', () => expect(() => fill('a {b}', {})).toThrow(/b/));
});
