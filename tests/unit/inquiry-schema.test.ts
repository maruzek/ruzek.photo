import { describe, it, expect } from 'vitest';
import { inquirySchema } from '@/lib/inquiry/schema';

const valid = {
  name: 'Jana Nováková',
  email: 'jana@example.com',
  service: 'event',
  hours: 3,
  addons: ['sameDay'],
  locale: 'cs',
  turnstileToken: 'token',
};

describe('inquirySchema', () => {
  it('accepts a valid inquiry without source and defaults source to {}', () => {
    const r = inquirySchema.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.data?.source).toEqual({});
  });
  it('accepts all optional fields', () => {
    const r = inquirySchema.safeParse({
      ...valid,
      phone: '+420 123 456 789',
      date: '2027-03-14',
      timeFrom: '18:00',
      timeTo: '23:30',
      place: 'Praha',
      guests: 120,
      note: 'Program večera',
      website: '',
      source: { referrer: 'https://www.instagram.com/', landingPath: '/', utmSource: 'ig' },
    });
    expect(r.success).toBe(true);
  });
  it('rejects an incomplete e-mail', () => {
    expect(inquirySchema.safeParse({ ...valid, email: 'jana@' }).success).toBe(false);
  });
  it('rejects a landing path without a leading slash', () => {
    expect(inquirySchema.safeParse({ ...valid, source: { landingPath: 'en/' } }).success).toBe(false);
  });
  it('rejects an unknown service', () => {
    expect(inquirySchema.safeParse({ ...valid, service: 'wedding' }).success).toBe(false);
  });
  it('rejects a note over 4000 characters', () => {
    expect(inquirySchema.safeParse({ ...valid, note: 'a'.repeat(4001) }).success).toBe(false);
    expect(inquirySchema.safeParse({ ...valid, note: 'a'.repeat(4000) }).success).toBe(true);
  });
  it('rejects a filled honeypot', () => {
    expect(inquirySchema.safeParse({ ...valid, website: 'x' }).success).toBe(false);
  });
  it('rejects hours outside 1–12 and malformed date or time', () => {
    expect(inquirySchema.safeParse({ ...valid, hours: 13 }).success).toBe(false);
    expect(inquirySchema.safeParse({ ...valid, date: '14. 3. 2027' }).success).toBe(false);
    expect(inquirySchema.safeParse({ ...valid, timeFrom: '6pm' }).success).toBe(false);
  });
  it('validates single fields through the shape (used on blur)', () => {
    expect(inquirySchema.shape.name.safeParse(' J ').success).toBe(false);
    expect(inquirySchema.shape.email.safeParse('jana@example.com').success).toBe(true);
  });
});

describe('inquirySchema e-mail', () => {
  it('trims spaces around the e-mail', () => {
    expect(inquirySchema.safeParse({ ...valid, email: ' jana@example.com ' }).data?.email).toBe('jana@example.com');
  });
});
