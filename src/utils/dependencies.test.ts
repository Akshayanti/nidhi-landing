/**
 * Dependency-change guard.
 *
 * This test snapshots the exact set of declared dependencies and
 * devDependencies for the project. Any add, remove, or version-spec change
 * fails the test until the EXPECTED_* maps below are updated in the same
 * commit/PR.
 *
 * Why it exists
 * -------------
 * The site is shipped via GitHub Pages and runs no server code, but it
 * pulls a non-trivial dependency tree at build time. Letting unreviewed
 * packages slip in (or letting a Renovate-style bump merge silently) is a
 * supply-chain risk and a build-output risk. Forcing the snapshot to be
 * updated alongside any package.json edit makes dependency changes a
 * first-class, code-reviewable event.
 *
 * If you intentionally added/removed/upgraded a dependency:
 *   1. update EXPECTED_DEPENDENCIES / EXPECTED_DEV_DEPENDENCIES below
 *   2. run `npm test` locally to confirm
 *   3. commit both changes together
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const pkgPath = resolve(here, '..', '..', 'package.json');
const lockPath = resolve(here, '..', '..', 'package-lock.json');

interface PackageJson {
  name: string;
  version: string;
  type?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  engines?: Record<string, string>;
  scripts?: Record<string, string>;
  allowScripts?: Record<string, boolean>;
  overrides?: Record<string, Record<string, string>>;
}

interface Lockfile {
  name: string;
  lockfileVersion: number;
}

const pkg: PackageJson = JSON.parse(readFileSync(pkgPath, 'utf8'));
// The reel renderer: its own package.json and lockfile.
const remotionPkg: PackageJson = JSON.parse(readFileSync(resolve(here, '..', '..', 'remotion', 'package.json'), 'utf8'));
const lock: Lockfile = JSON.parse(readFileSync(lockPath, 'utf8'));

// -----------------------------------------------------------------------------
// EXPECTED dependency snapshot.
// Update these maps in the same PR as any package.json change.
// -----------------------------------------------------------------------------
// `dependencies` is what the build puts on the site; everything a script, a
// test or the build's own tooling needs is a devDependency. The pull request
// audit (`npm audit --omit=dev`) reads this split: it covers these packages
// and not the ones below.
const EXPECTED_DEPENDENCIES: Record<string, string> = {
  '@astrojs/react': '^7.1.9',
  '@astrojs/rss': '^4.0.18',
  '@astrojs/sitemap': '^3.7.5',
  astro: '^7.4.12',
  react: '^19.3.1',
  'react-dom': '^19.3.1',
};

const EXPECTED_DEV_DEPENDENCIES: Record<string, string> = {
  // Used by one offline script, the reel script writer
  // (scripts/lib/media/llm-script-writer.mjs). Nothing under src/ imports it.
  '@anthropic-ai/sdk': '^1.10.0',
  // Mutation testing (#790): run in CI on every pull request, so pinned
  // exactly, like tsx. Nothing under src/ imports them.
  // Reads the tools' top-level statements to cut the mutation shards
  // (scripts/lib/checks/mutation-shards.mjs, #846), as Stryker reads them.
  '@babel/parser': '7.29.9',
  '@stryker-mutator/core': '10.1.1',
  '@stryker-mutator/tap-runner': '10.1.1',
  // Component tests (*.dom.test.tsx): the five tools mounted in a test
  // browser. Pinned exactly, as test gates.
  '@testing-library/dom': '10.4.2',
  '@testing-library/react': '16.3.3',
  '@testing-library/user-event': '14.6.8',
  // Types for test/dom.ts, which `astro check` and `tsc` read.
  '@types/jsdom': '30.0.0',
  '@types/react': '^19.3.0',
  '@types/react-dom': '^19.3.0',
  // The accessibility pass of scripts/smoke-pages.mjs: injected into the
  // test browser, never into a page a visitor is served. Pinned exactly: it
  // gates the Build job, and a new axe version can add failures on its own.
  'axe-core': '4.14.0',
  // Imported by src/utils/lessonRules.test.ts, to give headings the ids the
  // build gives them. Astro brings it too; named here so the test does not
  // depend on that.
  'github-slugger': '^2.0.0',
  // The test browser of the component tests (test/dom.ts). Pinned exactly.
  jsdom: '31.0.0',
  puppeteer: '^25.18.1',
  // Imported by scripts/render-logo-with-url.mjs. It was there only because
  // astro lists it as optional, so an astro update could have removed it.
  sharp: '^0.35.5',
  // Pinned exactly: it runs the test suite in CI, so a new version should
  // arrive as a reviewed bump, not be downloaded fresh on every run.
  tsx: '4.23.15',
  // Pinned exactly: `npm run typecheck` gates CI, and a compiler minor can add
  // errors on its own.
  typescript: '7.0.2',
  // Imported by src/utils/lessonRules.test.ts, to read frontmatter the way
  // the content collections do. Astro brings it too.
  yaml: '^2.9.1',
};

const EXPECTED_NODE_ENGINE = '>=24.0.0';

// The install scripts npm may run (README, "Install scripts"). This list is
// the control: flipping a `false` to `true`, or approving a package without
// pinning the version whose script was read, has to be changed here too.
const EXPECTED_ALLOW_SCRIPTS: Record<string, boolean> = {
  'puppeteer@25.18.1': true,
  esbuild: false,
  fsevents: false,
};
const EXPECTED_REMOTION_ALLOW_SCRIPTS: Record<string, boolean> = {
  esbuild: false,
  fsevents: false,
};
const EXPECTED_LOCKFILE_VERSION = 3;

// -----------------------------------------------------------------------------

describe('package.json: dependencies snapshot', () => {
  it('declares exactly the expected runtime dependencies', () => {
    assert.deepEqual(
      pkg.dependencies ?? {},
      EXPECTED_DEPENDENCIES,
      buildHint('dependencies', pkg.dependencies ?? {}, EXPECTED_DEPENDENCIES),
    );
  });

  it('declares exactly the expected devDependencies', () => {
    assert.deepEqual(
      pkg.devDependencies ?? {},
      EXPECTED_DEV_DEPENDENCIES,
      buildHint(
        'devDependencies',
        pkg.devDependencies ?? {},
        EXPECTED_DEV_DEPENDENCIES,
      ),
    );
  });

  it('pins the Node engine range', () => {
    assert.equal(
      pkg.engines?.node,
      EXPECTED_NODE_ENGINE,
      `package.json "engines.node" changed (got "${pkg.engines?.node}", expected "${EXPECTED_NODE_ENGINE}"). If this is intentional, update EXPECTED_NODE_ENGINE in src/utils/dependencies.test.ts.`,
    );
  });

  it('overrides exactly the expected packages, each to one exact version', () => {
    // Stryker 10.1.1, the latest, pins versions of these three that have
    // security advisories (moderate, development only: neither reaches the
    // site). Each override forces the patched release, and only inside Stryker's own
    // tree, so a future dependency that pulls these in is not touched. Drop an
    // override once Stryker's own dependencies reach the patched version
    // (npm ls qs minimatch), and never add one without a reason here.
    //   qs 6.16.1: typed-rest-client 2.3 pins 6.15.1 (GHSA advisories on
    //     qs.stringify crashes).
    //   minimatch 11.0.9: Stryker pins ~10.2.4, and only 11.0.1 and later
    //     fix the pattern-expansion denial of service.
    //   glob 14.0.6: the tap runner pins 13, and only 14.0.2 and later fix
    //     the AbortSignal cancellation bypass (GHSA-3g3m-2fjr-6pw4).
    const pins = { qs: '6.16.1', minimatch: '11.0.9', glob: '14.0.6' };
    assert.deepEqual(pkg.overrides ?? {}, { '@stryker-mutator/core': pins, '@stryker-mutator/tap-runner': pins });
  });

  it('does not declare optionalDependencies, peerDependencies, or bundleDependencies', () => {
    // These would change the install graph in ways the snapshot above does
    // not cover, so they're forbidden by default. Unblock by extending the
    // snapshot if a real need arises.
    const extra = pkg as unknown as Record<string, unknown>;
    assert.equal(
      extra.optionalDependencies,
      undefined,
      'optionalDependencies are not allowed; extend the snapshot test if needed.',
    );
    assert.equal(
      extra.peerDependencies,
      undefined,
      'peerDependencies are not allowed; extend the snapshot test if needed.',
    );
    assert.equal(
      extra.bundleDependencies,
      undefined,
      'bundleDependencies are not allowed; extend the snapshot test if needed.',
    );
    assert.equal(
      extra.bundledDependencies,
      undefined,
      'bundledDependencies are not allowed; extend the snapshot test if needed.',
    );
  });
});

describe('package.json: install scripts', () => {
  it('approves and denies exactly the expected install scripts', () => {
    assert.deepEqual(
      pkg.allowScripts ?? {},
      EXPECTED_ALLOW_SCRIPTS,
      'package.json "allowScripts" changed. Read what the script does first (README, "Install scripts"), then update EXPECTED_ALLOW_SCRIPTS in src/utils/dependencies.test.ts.',
    );
    assert.deepEqual(
      remotionPkg.allowScripts ?? {},
      EXPECTED_REMOTION_ALLOW_SCRIPTS,
      'remotion/package.json "allowScripts" changed; update EXPECTED_REMOTION_ALLOW_SCRIPTS in src/utils/dependencies.test.ts.',
    );
  });

  it('every approval names one exact version, the same one the lockfile installs', () => {
    const packages = (lock as unknown as { packages: Record<string, { version: string }> }).packages;
    for (const [entry, allowed] of Object.entries(pkg.allowScripts ?? {})) {
      if (!allowed) continue;
      const pinned = /^(.+)@(\d+\.\d+\.\d+)$/.exec(entry);
      assert.ok(pinned, `allowScripts approves "${entry}" without an exact version`);
      assert.equal(
        packages[`node_modules/${pinned[1]}`]?.version,
        pinned[2],
        `allowScripts approves ${entry}, but the lockfile installs another version`,
      );
    }
  });
});

describe('remotion/package.json: the same pins as the site', () => {
  const dev = remotionPkg.devDependencies ?? {};
  const all = { ...remotionPkg.dependencies, ...dev };

  it('runs the same exact tsx and typescript', () => {
    // The Remotion job type-checks with them, so the reasons above apply.
    assert.equal(dev.tsx, EXPECTED_DEV_DEPENDENCIES.tsx);
    assert.equal(dev.typescript, EXPECTED_DEV_DEPENDENCIES.typescript);
  });

  it('keeps every Remotion package on one version range', () => {
    // Remotion requires all its packages on the same version; one lower
    // range allows a mismatch when the lockfile is rebuilt.
    const ranges = Object.entries(all).filter(([name]) => name === 'remotion' || name.startsWith('@remotion/'));
    assert.ok(ranges.length >= 5, 'the Remotion packages were not found');
    assert.deepEqual([...new Set(ranges.map(([, range]) => range))], [all.remotion], JSON.stringify(ranges));
  });

  it('asks for the same Node', () => {
    assert.equal(remotionPkg.engines?.node, EXPECTED_NODE_ENGINE);
  });
});

describe('package-lock.json: present and matches package.json', () => {
  it('exists and is lockfile v3', () => {
    assert.equal(
      lock.lockfileVersion,
      EXPECTED_LOCKFILE_VERSION,
      `Unexpected lockfileVersion ${lock.lockfileVersion}; expected ${EXPECTED_LOCKFILE_VERSION}. Did npm change major versions, or was the file regenerated with a different npm?`,
    );
  });

  it('lockfile project name matches package.json', () => {
    assert.equal(lock.name, pkg.name);
  });

  it('every declared dependency appears in the lockfile (no drift)', () => {
    // The lockfile root has a "packages" map; the empty-string key is the
    // root project and lists `dependencies` + `devDependencies` it locks.
    const lockAny = lock as unknown as {
      packages?: Record<
        string,
        { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
      >;
    };
    const root = lockAny.packages?.[''];
    assert.ok(root, 'package-lock.json is missing a root packages[""] entry');

    const lockedRuntime = root.dependencies ?? {};
    const lockedDev = root.devDependencies ?? {};

    for (const name of Object.keys(EXPECTED_DEPENDENCIES)) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(lockedRuntime, name),
        `${name} is in package.json but missing from package-lock.json. Run \`npm install\` to refresh the lockfile.`,
      );
    }
    for (const name of Object.keys(EXPECTED_DEV_DEPENDENCIES)) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(lockedDev, name),
        `${name} is in package.json (dev) but missing from package-lock.json. Run \`npm install\` to refresh the lockfile.`,
      );
    }
  });
});

// -----------------------------------------------------------------------------

/** Build a clear failure message that diffs actual vs expected dep maps. */
function buildHint(
  label: string,
  actual: Record<string, string>,
  expected: Record<string, string>,
): string {
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  for (const [k, v] of Object.entries(actual)) {
    if (!(k in expected)) added.push(`${k}@${v}`);
    else if (expected[k] !== v) changed.push(`${k}: ${expected[k]} → ${v}`);
  }
  for (const k of Object.keys(expected)) {
    if (!(k in actual)) removed.push(k);
  }

  const parts: string[] = [];
  if (added.length) parts.push(`Added: ${added.join(', ')}`);
  if (removed.length) parts.push(`Removed: ${removed.join(', ')}`);
  if (changed.length) parts.push(`Changed: ${changed.join(', ')}`);

  return [
    `${label} snapshot mismatch.`,
    ...parts,
    `If intentional, update EXPECTED_${label === 'dependencies' ? 'DEPENDENCIES' : 'DEV_DEPENDENCIES'} in src/utils/dependencies.test.ts.`,
  ].join('\n  ');
}
