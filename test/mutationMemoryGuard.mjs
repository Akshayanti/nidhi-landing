// Stops a mutation test process that takes more than a gigabyte (#790).
//
// A few mutants make a test allocate without end, at more than a gigabyte a
// second: an observer made again on every drawing, a loop of a few steps
// become thousands of millions. Node's own heap limit does not stop them
// (--max-old-space-size was tried), and four such processes at once took all
// of a runner's memory, three runs in a row: GitHub gave the runner up for
// lost. An operating-system limit (ulimit -v) was tried as well and stops
// ordinary tests from starting on the runner's Node.
//
// So each test process Stryker starts watches itself. The loop that runs
// away holds the main thread, so the watch is a worker thread: ten times a
// second it reads the whole process's memory in use, and past the limit it
// says so on the error output and ends the process. Stryker records that
// mutant as an error and keeps the note with it, and the floors count a
// mutant so ended as not caught (scripts/lib/checks/mutation-floors.mjs). A
// test needs a tenth of the limit.
//
// Loaded only by stryker.config.mjs (tap.nodeArgs); `npm test` never sees it.
import { Worker } from 'node:worker_threads';
import { GUARD_NOTE } from '../scripts/lib/checks/mutation-floors.mjs';

/** Bytes of memory in use (resident set) past which the process is ended. */
export const LIMIT = 1024 ** 3;

const watch = new Worker(
  `setInterval(() => {
    if (process.memoryUsage.rss() <= ${LIMIT}) return;
    try { require('node:fs').writeSync(2, ${JSON.stringify(`${GUARD_NOTE}\n`)}); } catch {}
    process.kill(process.pid, 'SIGKILL');
  }, 100);`,
  // None of the test process's own flags: this file would load itself again.
  { eval: true, execArgv: [] },
);
// The watch never keeps a finished test process alive.
watch.unref();
