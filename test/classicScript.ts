/**
 * Runs a classic script the way a page runs it: in a context of its own, with
 * only the globals the test hands it.
 *
 * Under Stryker (#790) the script is the instrumented copy, which keeps its
 * coverage and reads the mutant to switch on from a namespace on the global
 * object. A new context has a global object of its own, and no `process` to
 * read the mutant from, so without help every mutant in a classic script
 * would count as never run. The context is therefore handed the test
 * process's namespace, with the mutant already in it. Outside Stryker there
 * is no namespace and the context gets nothing extra.
 */
import { runInNewContext } from 'node:vm';

interface StrykerNamespace { activeMutant?: string }

export function runClassicScript(source: string, globals: Record<string, unknown>): void {
  const name = process.env.STRYKER_NAMESPACE ?? '__stryker__';
  const namespace = (globalThis as Record<string, unknown>)[name] as StrykerNamespace | undefined;
  if (!namespace) {
    runInNewContext(source, globals);
    return;
  }
  const active = process.env.__STRYKER_ACTIVE_MUTANT__;
  if (namespace.activeMutant === undefined && active) namespace.activeMutant = active;
  // On the test's own object, so what the script writes to its globals is
  // still there for the test to read; the script looks the namespace up once,
  // as it starts, so it is taken away again afterwards.
  Object.defineProperty(globals, name, { value: namespace, configurable: true, enumerable: false });
  try {
    runInNewContext(source, globals);
  } finally {
    delete globals[name];
  }
}
