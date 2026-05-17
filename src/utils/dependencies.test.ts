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
}

interface Lockfile {
  name: string;
  lockfileVersion: number;
}

const pkg: PackageJson = JSON.parse(readFileSync(pkgPath, 'utf8'));
const lock: Lockfile = JSON.parse(readFileSync(lockPath, 'utf8'));

// -----------------------------------------------------------------------------
// EXPECTED dependency snapshot.
// Update these maps in the same PR as any package.json change.
// -----------------------------------------------------------------------------
const EXPECTED_DEPENDENCIES: Record<string, string> = {
  '@astrojs/react': '^5.0.0',
  '@astrojs/rss': '^4.0.18',
  '@astrojs/sitemap': '^3.7.2',
  astro: '^6.1.10',
  react: '^19.2.5',
  'react-dom': '^19.2.5',
};

const EXPECTED_DEV_DEPENDENCIES: Record<string, string> = {
  '@types/react': '^19.2.14',
  '@types/react-dom': '^19.2.3',
  puppeteer: '^24.41.0',
};

const EXPECTED_NODE_ENGINE = '>=22.12.0';
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
