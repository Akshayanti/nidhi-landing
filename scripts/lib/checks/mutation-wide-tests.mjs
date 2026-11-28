// The test files that depend on everything (#904): their names, and what a
// run's reports say they cover. mutation-wide-tests.test.mjs holds the lists
// to the dependency graph; scripts/mutation-wide-coverage.mjs prints the
// count after every run.

/** The test files that depend on everything and run no mutated code. */
export const READ_THE_SOURCE = [
  'src/content.config.test.ts', 'src/i18n/plural.test.ts', 'src/i18n/routeParity.test.ts', 'src/i18n/strings/catalog.used.test.ts',
  'src/styles/cssTokens.test.ts', 'src/styles/palette.test.ts', 'src/styles/sheets.test.ts',
  'src/utils/glossaryLinks.test.ts', 'src/utils/guides.test.ts', 'src/utils/learnPosts.test.ts', 'src/utils/lessonDates.test.ts',
  'src/utils/lessonLinks.test.ts', 'src/utils/lessonRules.test.ts', 'src/utils/levelHelper.test.ts', 'src/utils/longDate.test.ts',
  'src/utils/newsletterIds.test.ts', 'src/utils/privacyNoticeGuard.test.ts', 'src/utils/qr/destinations.test.ts', 'src/utils/qr/encode.test.ts',
  // Reads the drawn share cards under public/ (#743); reaches no tool code.
  'src/utils/shareCard.test.ts',
  'src/utils/shared/cleanElements.registry.test.ts', 'src/utils/shared/devanagariHeadings.test.ts', 'src/utils/shared/jsonForScript.pages.test.ts',
  'src/utils/shared/toolPrivacy.test.ts', 'src/utils/sitemap.test.ts', 'src/utils/situationFiles.test.ts', 'src/utils/spelling.test.ts',
  'src/utils/styleRules.test.ts', 'src/utils/tags.test.ts', 'src/utils/thirdPartyNotices.test.ts',
];

/** The ones that do reach mutated code, each with why it is still tied to everything. */
export const STILL_COSTLY = {
  'src/components/nav.test.ts': 'loads nav.ts through a module hook (utils/testing/astroContentStub.ts registers one), which the analysis cannot follow',
  'src/utils/shared/cleanUrls.test.ts': 'hands the URL class to the script it runs; the analysis takes URL used as a value for a read it cannot follow',
  'src/utils/shared/headerKeyboard.test.ts': 'reads a component by a name it builds, and themeToggle.js by its text; it covered no mutant when #904 was measured',
};

/**
 * What `tests` (paths) cover in `reports` (the shards' Stryker reports):
 * the mutants one of them covers or killed, each counted once, of all that
 * are not ignored. A test numbered afresh in each report is found through
 * that report's own list. `{ total, covered, byTest: { path: n } }`.
 */
export function coveredBy(reports, tests) {
  const byTest = Object.fromEntries(tests.map((test) => [test, 0]));
  let total = 0;
  let covered = 0;
  for (const report of reports) {
    const fileOf = new Map();
    for (const [path, file] of Object.entries(report.testFiles ?? {})) {
      if (Object.hasOwn(byTest, path)) for (const test of file.tests ?? []) fileOf.set(test.id, path);
    }
    for (const file of Object.values(report.files ?? {})) {
      for (const mutant of file.mutants ?? []) {
        if (mutant.status === 'Ignored') continue;
        total += 1;
        const by = new Set([...(mutant.coveredBy ?? []), ...(mutant.killedBy ?? [])].map((id) => fileOf.get(id)).filter(Boolean));
        if (by.size > 0) covered += 1;
        for (const path of by) byTest[path] += 1;
      }
    }
  }
  return { total, covered, byTest };
}
