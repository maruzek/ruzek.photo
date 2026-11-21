import { describe, it, expect } from 'vitest';
import { readSource } from '@/lib/inquiry/source';

describe('readSource', () => {
  it('reads referrer, landing path and UTM parameters', () => {
    expect(
      readSource({ href: 'https://martinruzek.eu/?utm_source=ig&utm_campaign=jaro' }, 'https://www.instagram.com/', 'martinruzek.eu'),
    ).toEqual({ referrer: 'https://www.instagram.com/', landingPath: '/', utmSource: 'ig', utmCampaign: 'jaro' });
  });
  it('drops a referrer from the own host', () => {
    expect(readSource({ href: 'https://martinruzek.eu/en/' }, 'https://martinruzek.eu/', 'martinruzek.eu')).toEqual({
      landingPath: '/en/',
    });
  });
  it('drops an empty or non-http referrer', () => {
    expect(readSource({ href: 'https://martinruzek.eu/' }, '', 'martinruzek.eu')).toEqual({ landingPath: '/' });
    expect(readSource({ href: 'https://martinruzek.eu/' }, 'android-app://com.x/', 'martinruzek.eu')).toEqual({
      landingPath: '/',
    });
  });
  it('trims every value to 200 characters and skips empty UTM values', () => {
    const long = 'x'.repeat(300);
    const s = readSource({ href: `https://martinruzek.eu/?utm_medium=${long}&utm_source=` }, '', 'martinruzek.eu');
    expect(s.utmMedium).toHaveLength(200);
    expect(s).not.toHaveProperty('utmSource');
  });
});
