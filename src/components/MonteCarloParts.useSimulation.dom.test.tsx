/**
 * The Monte Carlo simulator's runner (#790): `useSimulation` shows the page's
 * own starting result, runs a small plan at once, sends a large one to a
 * worker, and finishes it on the page when the worker cannot.
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { act, cleanup, renderHook } from '@testing-library/react';
import { simulate, type SimulationResult } from '../utils/monte-carlo/math.ts';
import { DEFAULTS, type ToolState } from '../utils/monte-carlo/url.ts';
import { useSimulation } from './MonteCarloSimulator.tsx';

const g = globalThis as unknown as Record<string, unknown>;
const w = window as unknown as Record<string, unknown>;

/** A short plan, so a run of any size is quick. */
const plan = (change: Partial<ToolState>): ToolState => ({ ...DEFAULTS, saveYears: 1, withdrawYears: 0, withdrawal: 0, ...change });
/** A result no plan below gives, so it shows which result is on screen. */
const GIVEN = simulate(plan({ start: 123_456, paths: 100 }));

/** A stand-in for the browser's worker: it answers when the test says. */
class FakeWorker {
  static made: FakeWorker[] = [];
  static refuses = false;
  url: string;
  options: unknown;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  requests: Array<{ id: number; inputs: ToolState }> = [];
  terminated = 0;
  constructor(url: URL, options: unknown) {
    if (FakeWorker.refuses) throw new Error('no workers here');
    this.url = String(url);
    this.options = options;
    FakeWorker.made.push(this);
  }
  postMessage(request: { id: number; inputs: ToolState }) { this.requests.push(request); }
  terminate() { this.terminated++; }
  /** Answers request `i` with `result`. */
  answer(i: number, result: SimulationResult) {
    act(() => this.onmessage?.({ data: { id: this.requests[i].id, result } }));
  }
}

// The window's timers, held until the test runs them.
const realSetTimeout = window.setTimeout;
let timers: Array<{ ms: number; run: () => void }> = [];
const runTimer = (i: number) => act(() => timers[i].run());

beforeEach(() => {
  FakeWorker.made = [];
  FakeWorker.refuses = false;
  g.Worker = FakeWorker;
  w.Worker = FakeWorker;
  timers = [];
  window.setTimeout = ((run: () => void, ms = 0) => timers.push({ ms, run })) as unknown as typeof window.setTimeout;
});
afterEach(() => {
  cleanup();
  delete g.Worker;
  delete w.Worker;
  window.setTimeout = realSetTimeout;
});

const mount = (first: ToolState) => renderHook(({ state }) => useSimulation(state, GIVEN), { initialProps: { state: first } });

describe('the simulation runner', () => {
  it('starts with the result the page worked out, and does not run the starting plan', () => {
    const first = plan({ paths: 100 });
    const { result, rerender } = mount(first);
    assert.equal(result.current.result, GIVEN);
    assert.equal(result.current.state, first);
    assert.equal(result.current.busy, false);
    rerender({ state: first });
    assert.equal(result.current.result, GIVEN);
    assert.equal(FakeWorker.made.length, 0);
    assert.deepEqual(timers, []);
  });

  it('runs a plan of up to 10,000 paths at once, and pairs the result with its plan', () => {
    const { result, rerender } = mount(plan({ paths: 100 }));
    const small = plan({ start: 50_000, paths: 100 });
    rerender({ state: small });
    assert.deepEqual(result.current.result, simulate(small));
    assert.equal(result.current.state, small);
    assert.equal(result.current.busy, false);
    const edge = plan({ start: 60_000, paths: 10_000 });
    rerender({ state: edge });
    assert.deepEqual(result.current.result, simulate(edge));
    assert.equal(result.current.state, edge);
    assert.equal(result.current.busy, false);
    assert.equal(FakeWorker.made.length, 0, 'no worker is started for a small run');
    assert.deepEqual(timers, []);
  });

  it('sends a larger plan to one worker, stays busy until it answers, and shows its answer', () => {
    const first = plan({ paths: 100 });
    const { result, rerender } = mount(first);
    const large = plan({ paths: 10_001 });
    rerender({ state: large });
    assert.equal(FakeWorker.made.length, 1);
    const worker = FakeWorker.made[0];
    assert.match(worker.url, /^file:.*\/src\/utils\/monte-carlo\/worker\.ts$/);
    assert.deepEqual(worker.options, { type: 'module' });
    assert.equal(worker.requests.length, 1);
    assert.equal(worker.requests[0].inputs, large);
    assert.deepEqual(Object.keys(worker.requests[0]).sort(), ['id', 'inputs']);
    // Until the answer comes, the old result stays with its own plan.
    assert.equal(result.current.busy, true);
    assert.equal(result.current.result, GIVEN);
    assert.equal(result.current.state, first);
    const answer = simulate(plan({ start: 77_000, paths: 100 }));
    worker.answer(0, answer);
    assert.equal(result.current.result, answer);
    assert.equal(result.current.state, large);
    assert.equal(result.current.busy, false);
    assert.deepEqual(timers, [], 'nothing is run on the page');
  });

  it('keeps one worker, and ignores an answer to a plan since replaced', () => {
    const { result, rerender } = mount(plan({ paths: 100 }));
    const one = plan({ start: 1_000, paths: 100_000 });
    const two = plan({ start: 2_000, paths: 100_000 });
    rerender({ state: one });
    rerender({ state: two });
    assert.equal(FakeWorker.made.length, 1);
    const worker = FakeWorker.made[0];
    assert.deepEqual(worker.requests.map((r) => r.inputs), [one, two]);
    assert.ok(worker.requests[1].id > worker.requests[0].id, 'a later plan has a later number');
    worker.answer(0, simulate(plan({ start: 1_000, paths: 100 })));
    assert.equal(result.current.result, GIVEN, 'the old answer is not shown');
    assert.equal(result.current.busy, true);
    const answer = simulate(plan({ start: 2_000, paths: 100 }));
    worker.answer(1, answer);
    assert.equal(result.current.result, answer);
    assert.equal(result.current.state, two);
    assert.equal(result.current.busy, false);
    assert.equal(worker.terminated, 0);
  });

  it('a small plan chosen while a large one runs shows at once, and the late answer is ignored', () => {
    const { result, rerender } = mount(plan({ paths: 100 }));
    rerender({ state: plan({ paths: 100_000 }) });
    assert.equal(result.current.busy, true);
    const small = plan({ start: 9_000, paths: 100 });
    rerender({ state: small });
    assert.equal(result.current.busy, false);
    assert.deepEqual(result.current.result, simulate(small));
    FakeWorker.made[0].answer(0, GIVEN);
    assert.deepEqual(result.current.result, simulate(small));
    assert.equal(result.current.state, small);
  });

  it('where no worker can start, the run finishes on the page after the busy state has shown', () => {
    FakeWorker.refuses = true;
    const first = plan({ paths: 100 });
    const { result, rerender } = mount(first);
    const large = plan({ start: 30_000, paths: 10_001 });
    rerender({ state: large });
    assert.equal(result.current.busy, true);
    assert.equal(result.current.state, first);
    assert.deepEqual(timers.map((timer) => timer.ms), [30]);
    runTimer(0);
    assert.deepEqual(result.current.result, simulate(large));
    assert.equal(result.current.state, large);
    assert.equal(result.current.busy, false);
  });

  it('a run waiting to finish on the page is dropped when the plan has changed again', () => {
    FakeWorker.refuses = true;
    const first = plan({ paths: 100 });
    const { result, rerender } = mount(first);
    rerender({ state: plan({ start: 30_000, paths: 10_001 }) });
    const later = plan({ start: 40_000, paths: 10_001 });
    rerender({ state: later });
    assert.equal(timers.length, 2);
    runTimer(0);
    assert.equal(result.current.result, GIVEN, 'the replaced plan is not run');
    assert.equal(result.current.state, first);
    assert.equal(result.current.busy, true);
    runTimer(1);
    assert.deepEqual(result.current.result, simulate(later));
    assert.equal(result.current.state, later);
    assert.equal(result.current.busy, false);
  });

  it('a worker that fails is stopped and replaced, and its run finishes on the page', () => {
    const { result, rerender } = mount(plan({ paths: 100 }));
    const large = plan({ start: 30_000, paths: 10_001 });
    rerender({ state: large });
    const worker = FakeWorker.made[0];
    act(() => worker.onerror?.());
    assert.equal(worker.terminated, 1);
    assert.equal(result.current.busy, true);
    assert.deepEqual(timers.map((timer) => timer.ms), [30]);
    runTimer(0);
    assert.deepEqual(result.current.result, simulate(large));
    assert.equal(result.current.state, large);
    assert.equal(result.current.busy, false);
    rerender({ state: plan({ start: 31_000, paths: 10_001 }) });
    assert.equal(FakeWorker.made.length, 2, 'a new worker takes the next large run');
    assert.equal(FakeWorker.made[1].requests.length, 1);
    assert.equal(worker.requests.length, 1);
  });

  it('a worker that fails twice is stopped once: the second time there is none to stop', () => {
    const { rerender } = mount(plan({ paths: 100 }));
    rerender({ state: plan({ start: 30_000, paths: 10_001 }) });
    const worker = FakeWorker.made[0];
    act(() => worker.onerror?.());
    act(() => worker.onerror?.());
    assert.equal(worker.terminated, 1);
    assert.deepEqual(timers.map((timer) => timer.ms), [30, 30]);
  });

  it('a failed worker that fails again after its replacement started stops the one in use', () => {
    const { rerender } = mount(plan({ paths: 100 }));
    rerender({ state: plan({ start: 30_000, paths: 10_001 }) });
    const failed = FakeWorker.made[0];
    act(() => failed.onerror?.());
    rerender({ state: plan({ start: 31_000, paths: 10_001 }) });
    const replacement = FakeWorker.made[1];
    act(() => failed.onerror?.());
    assert.deepEqual([failed.terminated, replacement.terminated], [1, 1]);
    rerender({ state: plan({ start: 32_000, paths: 10_001 }) });
    assert.equal(FakeWorker.made.length, 3, 'and the next large run gets a new one');
  });

  it('the worker goes with the page, and a page that never started one leaves cleanly', () => {
    const { rerender, unmount } = mount(plan({ paths: 100 }));
    rerender({ state: plan({ paths: 100_000 }) });
    assert.equal(FakeWorker.made[0].terminated, 0);
    unmount();
    assert.equal(FakeWorker.made[0].terminated, 1);
    const quiet = mount(plan({ paths: 100 }));
    quiet.unmount();
    assert.equal(FakeWorker.made.length, 1);
  });
});
