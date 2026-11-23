/**
 * Whether these tests run under Stryker (#790). A test that reads a source
 * file as text would read Stryker's instrumented copy, where the text it
 * checks is rewritten, so it skips there: it judges wording, not behaviour,
 * and `npm test` runs it on every pull request. stryker.config.mjs sets the
 * variable for the runs it starts.
 */
export const MUTATION_RUN = process.env.NIDHI_MUTATION_RUN === '1';

/** The `skip` option for a test that reads source as text. */
export const readsSource = MUTATION_RUN ? 'reads source as text, which Stryker instruments' : false;
