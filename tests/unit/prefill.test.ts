import { describe, it, expect } from 'vitest';
import { readPrefill } from '@/islands/prefill';

describe('readPrefill', () => {
  it('reads the Czech service parameter', () => {
    expect(readPrefill('#poptavka?sluzba=match')).toEqual({ service: 'match' });
  });
  it('ignores unknown values', () => {
    expect(readPrefill('#poptavka?sluzba=svatba')).toEqual({});
    expect(readPrefill('#poptavka')).toEqual({});
    expect(readPrefill('')).toEqual({});
  });
  it('reads the English parameters and hours', () => {
    expect(readPrefill('#inquiry?service=event&hours=4')).toEqual({ service: 'event', hours: 4 });
  });
  it('reads add-ons and drops unknown ones and out-of-range hours', () => {
    expect(readPrefill('#poptavka?sluzba=match&doplnky=video,foo,video&hodiny=40')).toEqual({
      service: 'match',
      addons: ['video'],
    });
  });
});
