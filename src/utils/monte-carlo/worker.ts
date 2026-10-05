/**
 * Runs large simulations off the main thread, so the page stays responsive
 * while 100,000 paths are computed. Each request carries an id; the
 * component ignores replies to requests it has since replaced.
 */
import { simulate, type SimulationInputs, type SimulationResult } from './math.ts';

export interface WorkerRequest {
  id: number;
  inputs: SimulationInputs;
}

export interface WorkerReply {
  id: number;
  result: SimulationResult;
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, inputs } = event.data;
  const reply: WorkerReply = { id, result: simulate(inputs) };
  self.postMessage(reply);
};
