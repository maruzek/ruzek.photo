import { describe, expect, it } from 'vitest';
import { telHref } from '@/lib/contact';

describe('telHref', () => {
  it('keeps only the plus and the digits', () => {
    expect(telHref('+420 731 808 342')).toBe('tel:+420731808342');
  });
});
