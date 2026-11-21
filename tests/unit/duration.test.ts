import { describe, expect, it } from 'vitest';
import { hoursBetween } from '@/lib/inquiry/duration';

describe('hoursBetween', () => {
  it('counts whole hours, rounded up', () => {
    expect(hoursBetween('18:00', '23:00')).toBe(5);
    expect(hoursBetween('18:00', '23:30')).toBe(6);
    expect(hoursBetween('09:15', '09:45')).toBe(1);
  });
  it('runs past midnight when the end is before the start', () => {
    expect(hoursBetween('22:00', '02:00')).toBe(4);
  });
  it('gives nothing for equal, missing or invalid times', () => {
    expect(hoursBetween('18:00', '18:00')).toBeUndefined();
    expect(hoursBetween('', '18:00')).toBeUndefined();
    expect(hoursBetween('18:00', '')).toBeUndefined();
    expect(hoursBetween('24:00', '02:00')).toBeUndefined();
  });
});
