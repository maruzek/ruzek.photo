import { describe, it, expect } from 'vitest';
import { estimate } from '@/lib/pricing/estimate';
import { formatRange, formatPercentRange } from '@/lib/pricing/format';
import { services, addons, terms, SERVICE_IDS, ADDON_IDS } from '@/config/pricing';

describe('estimate', () => {
  it('event 3 h', () =>
    expect(estimate({ service: 'event', hours: 3, addons: [] })).toEqual({ from: 3500, to: 3900 }));
  it('event 3 h + same day applies percent', () =>
    expect(estimate({ service: 'event', hours: 3, addons: ['sameDay'] })).toEqual({
      from: 4200,
      to: 5070,
    }));
  it('match + video adds fixed range', () =>
    expect(estimate({ service: 'match', addons: ['video'] })).toEqual({ from: 2500, to: 4500 }));
  it('percent before fixed', () =>
    expect(estimate({ service: 'portrait', addons: ['video', 'sameDay'] })).toEqual({
      from: 2800,
      to: 3950,
    }));
  it('portrait flat', () =>
    expect(estimate({ service: 'portrait', addons: [] })).toEqual({ from: 1500, to: 1500 }));
  it('short shoot is flat', () =>
    expect(estimate({ service: 'short', addons: [] })).toEqual({ from: 1500, to: 1500 }));
  it('clamps hours', () => {
    expect(estimate({ service: 'event', hours: 0, addons: [] })).toEqual({ from: 1500, to: 1500 });
    expect(estimate({ service: 'event', hours: 99, addons: [] })).toEqual({
      from: 12500,
      to: 14700,
    });
    expect(estimate({ service: 'event', hours: Number.NaN, addons: [] })).toEqual({
      from: 1500,
      to: 1500,
    });
  });
  it('treats missing hours as one hour', () =>
    expect(estimate({ service: 'event', addons: [] })).toEqual({ from: 1500, to: 1500 }));
  it('truncates fractional hours', () =>
    expect(estimate({ service: 'event', hours: 2.9, addons: [] })).toEqual({
      from: 2500,
      to: 2700,
    }));
  it('ignores hours for flat services', () =>
    expect(estimate({ service: 'match', hours: 5, addons: [] })).toEqual({ from: 1500, to: 2500 }));
  it('ignores duplicate addons', () =>
    expect(estimate({ service: 'portrait', addons: ['video', 'video'] })).toEqual({
      from: 2500,
      to: 3500,
    }));
  it('does not mutate the config', () => {
    const before = JSON.stringify(services);
    estimate({ service: 'match', addons: ['sameDay', 'video'] });
    expect(JSON.stringify(services)).toBe(before);
  });
  it('throws on an unknown service', () =>
    // @ts-expect-error deliberately invalid id: the runtime guard is what is under test
    expect(() => estimate({ service: 'nope', addons: [] })).toThrow(/nope/));
});

describe('config matches docs/brief.md', () => {
  it('prices', () => {
    expect(services.find((s) => s.id === 'event')?.pricing).toEqual({
      kind: 'hourly',
      firstHour: 1500,
      nextHour: { from: 1000, to: 1200 },
      minHours: 1,
      maxHours: 12,
    });
    expect(addons).toEqual([
      { id: 'sameDay', kind: 'percent', value: { from: 20, to: 30 } },
      { id: 'video', kind: 'fixed', value: { from: 1000, to: 2000 } },
    ]);
  });
  it('flat services', () => {
    const flat = (id: string) => services.find((s) => s.id === id)?.pricing;
    expect(flat('short')).toEqual({ kind: 'flat', price: { from: 1500, to: 1500 }, unit: 'session' });
    expect(flat('match')).toEqual({ kind: 'flat', price: { from: 1500, to: 2500 }, unit: 'match' });
    expect(flat('portrait')).toEqual({
      kind: 'flat',
      price: { from: 1500, to: 1500 },
      unit: 'session',
    });
  });
  it('deliverables', () => {
    const d = (id: string) => services.find((s) => s.id === id)?.deliverables;
    expect(d('event')).toEqual({
      photos: { from: 30, to: 50 },
      perHour: true,
      turnaround: { value: { from: 3, to: 5 }, unit: 'days' },
    });
    expect(d('short')).toEqual({
      photos: { from: 15, to: 25 },
      turnaround: { value: { from: 2, to: 3 }, unit: 'days' },
    });
    expect(d('match')).toEqual({
      photos: { from: 30, to: 50 },
      turnaround: { value: { from: 24, to: 24 }, unit: 'hours' },
    });
    expect(d('portrait')).toEqual({
      photos: { from: 8, to: 10 },
      // brief.md gives no delivery time for portraits: left out until Martin supplies one
      durationMin: { from: 45, to: 60 },
    });
  });
  it('terms', () =>
    expect(terms).toEqual({
      travel: { freeIn: 'Praha', perKm: { from: 5, to: 6 } },
      depositPercent: { from: 30, to: 50 },
      vatPayer: false,
    }));
  it('id lists match the configs', () => {
    expect(SERVICE_IDS).toEqual(services.map((s) => s.id));
    expect(ADDON_IDS).toEqual(addons.map((a) => a.id));
  });
});

describe('formatRange', () => {
  it('cs uses nbsp and en dash', () =>
    expect(formatRange({ from: 3500, to: 3900 }, 'cs')).toBe('3\u00A0500–3\u00A0900\u00A0Kč'));
  it('cs single', () =>
    expect(formatRange({ from: 1500, to: 1500 }, 'cs')).toBe('1\u00A0500\u00A0Kč'));
  it('cs below a thousand', () => expect(formatRange({ from: 900, to: 900 }, 'cs')).toBe('900\u00A0Kč'));
  it('en', () =>
    expect(formatRange({ from: 1500, to: 2500 }, 'en')).toBe('CZK\u00A01,500–2,500'));
  it('en single', () => expect(formatRange({ from: 1500, to: 1500 }, 'en')).toBe('CZK\u00A01,500'));
  it('never leaves an ordinary space or a narrow nbsp', () => {
    for (const locale of ['cs', 'en'] as const)
      expect(formatRange({ from: 12500, to: 14700 }, locale)).not.toMatch(/[ \u202F\u2009]/);
  });
});

describe('formatPercentRange', () => {
  it('cs', () => expect(formatPercentRange({ from: 20, to: 30 }, 'cs')).toBe('20–30\u00A0%'));
  it('cs single', () => expect(formatPercentRange({ from: 50, to: 50 }, 'cs')).toBe('50\u00A0%'));
  it('en', () => expect(formatPercentRange({ from: 20, to: 30 }, 'en')).toBe('20–30%'));
});
