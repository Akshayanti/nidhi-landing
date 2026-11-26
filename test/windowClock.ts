/**
 * The window's timers, run by hand, for component tests that wait: an
 * announcement said after a pause, a status cleared after a few seconds.
 * `install()` before each test and `restore()` after; `pass(ms)` runs what
 * falls due, in order, each inside React's `act`.
 */
import { act } from '@testing-library/react';
import { window } from './dom.ts';

const real = { set: window.setTimeout, clear: window.clearTimeout };

export const clock = {
  now: 0,
  next: 1,
  timers: new Map<number, { at: number; run: () => void }>(),
  install() {
    clock.now = 0;
    clock.timers.clear();
    window.setTimeout = ((run: () => void, ms = 0) => {
      clock.timers.set(clock.next, { at: clock.now + ms, run });
      return clock.next++;
    }) as typeof window.setTimeout;
    window.clearTimeout = ((id: number) => { clock.timers.delete(id); }) as typeof window.clearTimeout;
  },
  restore() {
    window.setTimeout = real.set;
    window.clearTimeout = real.clear;
    clock.timers.clear();
  },
  /** How many timers are waiting. */
  get waiting() { return clock.timers.size; },
  pass(ms: number) {
    const until = clock.now + ms;
    for (;;) {
      const due = [...clock.timers].filter(([, t]) => t.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      clock.timers.delete(due[0]);
      clock.now = due[1].at;
      act(() => due[1].run());
    }
    clock.now = until;
  },
};
