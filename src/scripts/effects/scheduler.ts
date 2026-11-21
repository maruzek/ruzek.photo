// One frame loop for every canvas effect (concept.md §7). An effect is ticked only while its element is in the
// viewport; when nothing is visible the loop unsubscribes from the ticker and costs nothing.

export interface Effect {
  el: Element;
  /** Draws one frame. `progress` comes from the effect itself (a ScrollTrigger), never from layout reads. */
  tick(progress: number, time: number): void;
  progress(): number;
}

export interface Scheduler {
  /** Registers an effect; the returned function removes it. */
  add(e: Effect): () => void;
  running(): boolean;
}

interface Slot {
  visible: boolean;
  unobserve: () => void;
}

export function createScheduler(opts: {
  ticker: (cb: (t: number) => void) => () => void;
  observe: (el: Element, cb: (visible: boolean) => void) => () => void;
}): Scheduler {
  const effects = new Map<Effect, Slot>();
  let unsubscribe: (() => void) | null = null;

  const tick = (time: number): void => {
    for (const [effect, slot] of effects) if (slot.visible) effect.tick(effect.progress(), time);
  };

  const sync = (): void => {
    const anyVisible = [...effects.values()].some((slot) => slot.visible);
    if (anyVisible && !unsubscribe) unsubscribe = opts.ticker(tick);
    else if (!anyVisible && unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };

  return {
    add(effect) {
      const slot: Slot = { visible: false, unobserve: () => undefined };
      effects.set(effect, slot);
      slot.unobserve = opts.observe(effect.el, (visible) => {
        slot.visible = visible;
        sync();
      });
      return () => {
        slot.unobserve();
        effects.delete(effect);
        sync();
      };
    },
    running: () => unsubscribe !== null,
  };
}

/** Browser adapter: IntersectionObserver for visibility, paused while the tab is hidden. */
export function viewportObserver(
  margin = '100px',
): (el: Element, cb: (visible: boolean) => void) => () => void {
  return (el, cb) => {
    let inView = false;
    const report = (): void => cb(inView && document.visibilityState === 'visible');
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) inView = entry.isIntersecting;
        report();
      },
      { rootMargin: margin },
    );
    io.observe(el);
    document.addEventListener('visibilitychange', report);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', report);
    };
  };
}
