// Stryker's tap runner, made to run the test files in the order the
// configuration lists them (#854).
//
// The order matters twice. For each mutant Stryker runs the covering test
// files one after the other and stops at the first that fails or cannot run,
// so the order decides how long a mutant takes to die
// (mutation-test-order.mjs: cheapest first) and, where one covering file
// fails and another cannot run at all, what the mutant is called (Killed or
// RuntimeError). Earlier results are reused on the footing that a fresh run
// would go the same way (mutation-recheck.mjs), which needs one order, the
// same on every run.
//
// The tap runner alone does not give one. It hands `tap.testFiles` to glob
// (tap-helper.js, findTestyLookingFiles, 10.1.1), and glob looks for several
// patterns at once and returns the files as they are found: of 40 listings
// of this project's 133 test files, 34 were not in the configured order,
// and no two runs need agree.
//
// So this runner is the tap runner with one thing added: after it has listed
// the files, they are put back in the configured order. Everything after
// follows from that list (checked in the 10.1.1 source):
//
// - The first test run goes through the list in order (tap-test-runner.js,
//   run), and records the coverage of each file as it goes.
// - Stryker keeps each mutant's covering tests in the order that coverage
//   was recorded (test-coverage.js, a Set filled from `perTest` in order),
//   and gives them to the mutant's run as its filter in that order
//   (mutant-test-planner.js); the runner runs the filter as given.
// - A mutant run with no filter goes through the list itself. Every test
//   runner process Stryker starts makes its own list, here, the same way.
//
// The configured list must be the files themselves, not patterns: a file
// listed and not found, or found and not listed, is an error, so nothing is
// dropped or added without a word.
import { INSTRUMENTER_CONSTANTS } from '@stryker-mutator/api/core';
import { PluginKind, commonTokens, declareFactoryPlugin, tokens } from '@stryker-mutator/api/plugin';
import { TapTestRunner } from '@stryker-mutator/tap-runner';

/** The name stryker.config.mjs gives as its `testRunner`. */
export const NAME = 'tap-ordered';

/**
 * `found` (the files the tap runner listed, in any order) in the order of
 * `configured` (the list in the configuration). Throws unless the two hold
 * exactly the same files, each once.
 */
export function inConfiguredOrder(found, configured) {
  const twice = configured.filter((file, i) => configured.indexOf(file) !== i);
  if (twice.length > 0) throw new Error(`${NAME}: tap.testFiles lists a file twice: ${[...new Set(twice)].join(', ')}`);
  const missing = configured.filter((file) => !found.includes(file));
  if (missing.length > 0) throw new Error(`${NAME}: tap.testFiles lists a file that was not found (it must name files, not patterns): ${missing.join(', ')}`);
  const extra = found.filter((file) => !configured.includes(file));
  if (extra.length > 0) throw new Error(`${NAME}: a test file was found that tap.testFiles does not list: ${extra.join(', ')}`);
  if (found.length !== configured.length) throw new Error(`${NAME}: ${found.length} test files were found for the ${configured.length} listed`);
  return [...configured];
}

/** The tap runner, with its list of test files in the configured order. */
export class OrderedTapTestRunner extends TapTestRunner {
  async init() {
    await super.init();
    this.testFiles = inConfiguredOrder(this.testFiles, this.options.tap.testFiles);
  }
}

// As the tap runner makes itself (createTapTestRunnerFactory): the same
// three things handed to the class, which takes them as its parent does
// (`static inject` is inherited).
function createOrderedTapTestRunner(injector) {
  return injector.provideValue('globalNamespace', INSTRUMENTER_CONSTANTS.NAMESPACE).injectClass(OrderedTapTestRunner);
}
createOrderedTapTestRunner.inject = tokens(commonTokens.injector);

export const strykerPlugins = [declareFactoryPlugin(PluginKind.TestRunner, NAME, createOrderedTapTestRunner)];
