/**
 * The Monte Carlo simulator's large runs in a worker (#790): which runs go
 * there, whose answer shows, and what happens when the worker fails.
 */
import { island, w, settle, openPlan, results, text, one, runDone, reader, choosePaths } from '../../test/monteCarloPage.tsx';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { act, screen } from '@testing-library/react';
import type { ToolState } from '../utils/monte-carlo/url.ts';
import { simulate } from '../utils/monte-carlo/math.ts';

describe('large runs, in a worker', () => {
  const g = globalThis as unknown as Record<string, unknown>;

  /** A stand-in for the browser's worker: it answers when the test says, with a small run marked by its path count. */
  class FakeWorker {
    static made: FakeWorker[] = [];
    url: string;
    options: unknown;
    onmessage: ((e: { data: unknown }) => void) | null = null;
    onerror: (() => void) | null = null;
    requests: Array<{ id: number; inputs: ToolState }> = [];
    terminated = 0;
    constructor(url: URL, options: unknown) {
      this.url = String(url);
      this.options = options;
      FakeWorker.made.push(this);
    }
    postMessage(request: { id: number; inputs: ToolState }) { this.requests.push(request); }
    terminate() { this.terminated++; }
    answer(i: number, paths = 100) {
      const { id, inputs } = this.requests[i];
      act(() => this.onmessage?.({ data: { id, result: simulate({ ...inputs, paths }) } }));
    }
  }
  beforeEach(() => { FakeWorker.made = []; });
  afterEach(() => { delete g.Worker; delete w.Worker; });
  const useFake = () => { g.Worker = FakeWorker; w.Worker = FakeWorker; };

  it('with a worker: only large runs go there, its answer shows, and one that fails is replaced', async () => {
    useFake();
    const { unmount } = openPlan({ saveYears: 1, paths: 100 });
    await settle(20);
    {
      // a small run never starts a worker
      await choosePaths('10000');
      assert.equal(FakeWorker.made.length, 0);
      assert.equal(results().getAttribute('aria-busy'), 'false');
    }
    await choosePaths('100000');
    const worker = FakeWorker.made[0];
    {
      // a large run goes to the worker, and its answer shows
      assert.equal(FakeWorker.made.length, 1);
      assert.match(worker.url, /monte-carlo\/worker\.ts$/);
      assert.deepEqual(worker.options, { type: 'module' });
      assert.equal(worker.requests.length, 1);
      assert.equal(worker.requests[0].inputs.paths, 100_000);
      assert.equal(results().getAttribute('aria-busy'), 'true');
      worker.answer(0, 100);
      assert.equal(results().getAttribute('aria-busy'), 'false');
      assert.ok(one('.mcs-caveat').textContent?.includes('shares of 100 simulated paths'), 'the worker’s answer is what shows');
    }
    {
      // a worker that fails is dropped, and the run finishes on the page
      await choosePaths('1000');
      await choosePaths('100000');
      assert.equal(FakeWorker.made.length, 1, 'the same worker takes the next large run');
      assert.equal(worker.requests.length, 2);
      act(() => worker.onerror?.());
      assert.equal(worker.terminated, 1);
      await runDone();
      assert.equal(results().getAttribute('aria-busy'), 'false');
      assert.ok(one('.mcs-caveat').textContent?.includes('shares of 100,000 simulated paths'));
      await choosePaths('1000');
      await choosePaths('100000');
      assert.equal(FakeWorker.made.length, 2, 'a new one is started for the next large run');
    }
    unmount();
    assert.equal(FakeWorker.made[1].terminated, 1, 'the worker goes with the page');
  });

  it('keeps one worker, and ignores an answer to a plan since replaced', async () => {
    useFake();
    openPlan({ saveYears: 1, paths: 100_000, currency: 'EUR' });
    await settle(20);
    const user = reader();
    await user.selectOptions(screen.getByLabelText(island.fields.currency), 'INR');
    await settle();
    await user.selectOptions(screen.getByLabelText(island.fields.currency), 'GBP');
    await settle();
    assert.equal(FakeWorker.made.length, 1);
    const worker = FakeWorker.made[0];
    // The shared plan, then each currency.
    assert.equal(worker.requests.length, 3);
    assert.ok(worker.requests[2].id > worker.requests[1].id);
    worker.answer(1, 100);
    assert.equal(results().getAttribute('aria-busy'), 'true', 'the old answer is not shown');
    worker.answer(2, 1_000);
    assert.equal(results().getAttribute('aria-busy'), 'false');
    assert.ok(text('.mcs-cardValue')[1].startsWith('£'));
  });
});
