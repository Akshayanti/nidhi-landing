/**
 * The privacy changelog as the pages show it: the hand-written entries with
 * the launch entries of the tools that are live, merged into one entry per
 * date, newest first (#722).
 *
 * The notice and the changelog pages all read it from here, so the launch
 * entries are resolved the same way everywhere and the dates are merged
 * before the notice takes its latest few. The entries themselves are in
 * `src/utils/privacyChangelogEntries.ts`.
 */
import { launchChangelog, writtenChangelog } from './privacyChangelogEntries.ts';
import { isMonteCarloReleased, monteCarloReleaseDate } from './monte-carlo/release.ts';
import { investOrPayOffReleaseDate, isInvestOrPayOffReleased } from './invest-or-pay-off/release.ts';
import { mergeByDate, type ChangelogEntry } from './privacyChangelog.ts';

export async function privacyChangelog(): Promise<ChangelogEntry[]> {
  // A tool's entry appears once the tool itself is live, dated with the
  // launch, not with the day the code was written.
  const [showMonteCarlo, monteCarloLaunch, showInvestOrPayOff, investOrPayOffLaunch] = await Promise.all([
    isMonteCarloReleased(),
    monteCarloReleaseDate(),
    isInvestOrPayOffReleased(),
    investOrPayOffReleaseDate(),
  ]);
  const launches = launchChangelog({
    monteCarloLaunch: showMonteCarlo ? monteCarloLaunch : null,
    investOrPayOffLaunch: showInvestOrPayOff ? investOrPayOffLaunch : null,
  });
  return mergeByDate([...launches, ...writtenChangelog]);
}
