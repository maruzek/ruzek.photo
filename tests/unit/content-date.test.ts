import { describe, expect, it } from 'vitest';
import { contentDate } from '@/lib/content-date';

describe('contentDate', () => {
  it('accepts a Date and a date string', () => {
    expect(contentDate.parse(new Date('2026-11-20')).toISOString()).toBe(
      '2026-11-20T00:00:00.000Z',
    );
    expect(contentDate.parse('2026-11-20').toISOString()).toBe('2026-11-20T00:00:00.000Z');
  });
  it.each([null, undefined, '', '  ', 0, 'not a date'])(
    'rejects %j instead of making it 1970-01-01',
    (value) => expect(contentDate.safeParse(value).success).toBe(false),
  );
});
