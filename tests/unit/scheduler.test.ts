import { describe, expect, it, vi } from 'vitest';
import { createScheduler, type Effect } from '@/scripts/effects/scheduler';

function setup() {
  let tickCb: ((t: number) => void) | null = null;
  const unsubscribe = vi.fn(() => {
    tickCb = null;
  });
  const ticker = vi.fn((cb: (t: number) => void) => {
    tickCb = cb;
    return unsubscribe;
  });
  const observers = new Map<Element, (visible: boolean) => void>();
  const observe = (el: Element, cb: (visible: boolean) => void) => {
    observers.set(el, cb);
    return () => observers.delete(el);
  };
  const scheduler = createScheduler({ ticker, observe });
  const effect = () => {
    const tick = vi.fn<Effect['tick']>();
    const e: Effect = { el: {} as Element, tick, progress: () => 0.5 };
    return Object.assign(e, { tick });
  };
  return { scheduler, ticker, unsubscribe, observers, effect, frame: (t: number) => tickCb?.(t) };
}

describe('createScheduler', () => {
  it('does not tick an effect outside the viewport', () => {
    const { scheduler, effect, frame, ticker } = setup();
    const e = effect();
    scheduler.add(e);
    frame(1);
    expect(e.tick).not.toHaveBeenCalled();
    expect(ticker).not.toHaveBeenCalled();
    expect(scheduler.running()).toBe(false);
  });

  it('ticks an effect once it becomes visible, with its progress', () => {
    const { scheduler, effect, frame, observers } = setup();
    const e = effect();
    scheduler.add(e);
    observers.get(e.el)?.(true);
    frame(16);
    expect(e.tick).toHaveBeenCalledWith(0.5, 16);
    expect(scheduler.running()).toBe(true);
  });

  it('stops the ticker when nothing is visible and when the last effect is removed', () => {
    const { scheduler, effect, observers, unsubscribe } = setup();
    const a = effect();
    const b = effect();
    scheduler.add(a);
    const removeB = scheduler.add(b);
    observers.get(a.el)?.(true);
    observers.get(b.el)?.(true);
    observers.get(a.el)?.(false);
    expect(scheduler.running()).toBe(true);
    removeB();
    expect(scheduler.running()).toBe(false);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('only ticks visible effects', () => {
    const { scheduler, effect, observers, frame } = setup();
    const a = effect();
    const b = effect();
    scheduler.add(a);
    scheduler.add(b);
    observers.get(a.el)?.(true);
    frame(1);
    expect(a.tick).toHaveBeenCalledTimes(1);
    expect(b.tick).not.toHaveBeenCalled();
  });
});
