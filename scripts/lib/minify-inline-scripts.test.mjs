/**
 * Unit tests for scripts/lib/minify-inline-scripts.mjs, with the minifier the
 * build passes in (astro.config.mjs), so what is tested is what ships.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { minifySync } from 'vite';

import { isClassicInline, minifyInlineScripts } from './minify-inline-scripts.mjs';

const minify = (code) => {
  const { code: small, errors } = minifySync('inline.js', code, { module: false });
  if (errors.length > 0) throw new Error(errors[0].message);
  return small;
};

describe('isClassicInline', () => {
  it('is a script with no src and no type but JavaScript', () => {
    assert.ok(isClassicInline(''));
    assert.ok(isClassicInline(' data-x="1"'));
    assert.ok(isClassicInline(' type="text/javascript"'));
  });

  it('is not an external script, a module, JSON-LD or a data block', () => {
    assert.ok(!isClassicInline(' src="/a.js"'));
    assert.ok(!isClassicInline(' defer src=/a.js'));
    assert.ok(!isClassicInline(' type="module"'));
    assert.ok(!isClassicInline(' type="application/ld+json"'));
    assert.ok(!isClassicInline(' type="application/json" id="ht-data"'));
  });

  it('is not fooled by an attribute that only ends in src', () => {
    assert.ok(isClassicInline(' data-src="x"'));
  });
});

describe('minifyInlineScripts', () => {
  it('drops comments and indentation, and keeps the tag as written', () => {
    const page = '<p>a</p><script data-x="1">\n  /** A long note. */\n  var answer = 1; // why\n  window.total = answer + 1;\n</script><p>b</p>';
    const small = minifyInlineScripts(page, minify);
    assert.ok(small.startsWith('<p>a</p><script data-x="1">'));
    assert.ok(small.endsWith('</script><p>b</p>'));
    assert.ok(!small.includes('long note') && !small.includes('why'));
    assert.ok(small.length < page.length);
  });

  it('keeps top-level names: other scripts on the page call them', () => {
    const page = '<script>function nidhiHelper(value) { var doubled = value * 2; return doubled; }\nvar nidhiShared = nidhiHelper(21);</script>';
    const small = minifyInlineScripts(page, minify);
    const sandbox = {};
    vm.runInNewContext(/<script>([\s\S]*)<\/script>/.exec(small)[1], sandbox);
    assert.equal(sandbox.nidhiShared, 42);
    assert.equal(typeof sandbox.nidhiHelper, 'function');
  });

  it('leaves JSON-LD, data blocks, modules and external scripts alone', () => {
    const page = [
      '<script type="application/ld+json">{ "a" : 1 }</script>',
      '<script type="application/json" id="d">[ 1, 2 ]</script>',
      '<script type="module">const  a = 1;</script>',
      '<script src="/a.js"></script>',
    ].join('');
    assert.equal(minifyInlineScripts(page, minify), page);
  });

  it('never leaves a closing script tag inside a script', () => {
    const page = '<script>var markup = "<" + "/script>" + "<\\/script>";\nwindow.out = markup;</script>';
    const small = minifyInlineScripts(page, minify);
    assert.equal(small.match(/<\/script/gi).length, 1);
    const sandbox = { window: {} };
    vm.runInNewContext(/<script>([\s\S]*)<\/script>$/.exec(small)[1], sandbox);
    assert.equal(sandbox.window.out, '</script></script>');
  });

  it('fails on a script that does not parse, rather than shipping it', () => {
    assert.throws(() => minifyInlineScripts('<script>var = ;</script>', minify));
  });

  it('minifies a script once however many pages carry it', () => {
    let calls = 0;
    const counting = (code) => { calls += 1; return minify(code); };
    const cache = new Map();
    const page = '<script>var one = 1; /* note */</script>';
    minifyInlineScripts(page, counting, cache);
    minifyInlineScripts(page + page, counting, cache);
    assert.equal(calls, 1);
  });

  it('leaves the shared classic scripts doing what they did', () => {
    // The two analytics backstops and the consent answer are inlined on every
    // page. Each defines globals; the minified copy must define the same ones.
    for (const file of ['cleanElements.js', 'cleanUrls.js', 'consentRuntime.js', 'langSwitch.js', 'toolStateGuard.js', 'tokenGuard.js']) {
      const source = readFileSync(new URL(`../../src/utils/shared/${file}`, import.meta.url), 'utf8');
      const globals = (code) => {
        const sandbox = { document: { cookie: '' }, location: { hostname: 'localhost', search: '', hash: '', pathname: '/' }, history: { replaceState() {} }, navigator: {} };
        sandbox.window = sandbox;
        sandbox.self = sandbox;
        try {
          vm.runInNewContext(code, sandbox);
        } catch {
          // A script that needs a real page still defined what it defines first.
        }
        return Object.keys(sandbox).filter((key) => typeof sandbox[key] === 'function' || /^nidhi/.test(key)).sort();
      };
      const small = /<script>([\s\S]*)<\/script>/.exec(minifyInlineScripts(`<script>${source}</script>`, minify))[1];
      assert.ok(small.length < source.length, file);
      assert.deepEqual(globals(small), globals(source), file);
      assert.ok(globals(small).length > 0, `${file} defines a global`);
    }
  });
});
