/**
 * The simulation worker: a request in, the same simulation the page runs
 * out, under the request's id. Run here with a stand-in for the worker's
 * global scope, which Node does not have.
 *
 * Run with:  npm test
 */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { simulate, type SimulationInputs } from './math.ts';
import type { WorkerReply, WorkerRequest } from './worker.ts';

const g = globalThis as unknown as Record<string, unknown>;
const hadSelf = Object.hasOwn(g, 'self');
const previous = g.self;
const replies: WorkerReply[] = [];
const scope: { onmessage?: (e: { data: WorkerRequest }) => void; postMessage: (r: WorkerReply) => void } = {
  postMessage: (r) => replies.push(r),
};

before(async () => {
  g.self = scope;
  await import('./worker.ts');
});
after(() => {
  if (hadSelf) g.self = previous;
  else delete g.self;
});

describe('the simulation worker', () => {
  it('answers a request with its id and the simulated result', () => {
    const inputs: SimulationInputs = { start: 20_000, monthly: 300, saveYears: 4, stockPct: 70, withdrawal: 0, withdrawYears: 0, feePct: 0, returns: 'historical', paths: 100 };
    assert.equal(typeof scope.onmessage, 'function');
    scope.onmessage?.({ data: { id: 17, inputs } });
    assert.equal(replies.length, 1);
    assert.equal(replies[0].id, 17);
    assert.deepEqual(replies[0].result, simulate(inputs));
  });
});
