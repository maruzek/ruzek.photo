import { describe, it, expect } from 'vitest';
import { readPrefill } from '@/islands/prefill';

describe('readPrefill', () => {
  it('reads the Czech service parameter', () => {
    expect(readPrefill('#poptavka?sluzba=sport')).toEqual({ service: 'sport' });
  });
  it('ignores unknown values', () => {
    expect(readPrefill('#poptavka?sluzba=svatba')).toEqual({});
    expect(readPrefill('#poptavka?sluzba=match')).toEqual({});
    expect(readPrefill('#poptavka?sluzba=short')).toEqual({});
    expect(readPrefill('#poptavka')).toEqual({});
    expect(readPrefill('')).toEqual({});
  });
  it('reads the English parameters and hours', () => {
    expect(readPrefill('#inquiry?service=event&hours=4')).toEqual({ service: 'event', hours: 4 });
  });
  it('prefills other without requiring a price', () => {
    expect(readPrefill('#inquiry?service=other')).toEqual({ service: 'other' });
  });
  it('reads add-ons and drops unknown ones and out-of-range hours', () => {
    expect(readPrefill('#poptavka?sluzba=sport&doplnky=video,foo,video&hodiny=40')).toEqual({
      service: 'sport',
      addons: ['video'],
    });
  });
});
