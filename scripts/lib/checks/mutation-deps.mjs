// What each test file's mutation results depend on (#891).
//
// A shard reuses its earlier results through Stryker's incremental mode, and
// Stryker compares only two things: the code around a mutant, and the test
// files themselves (the tap runner reports one test per file, so a test file
// whose stored source differs from today's is a changed test). Everything a
// test reaches beyond its own text (the code it imports, the data it reads,
// the helpers in test/) is invisible to Stryker. Before #891 one fingerprint
// over every tracked file stood in for all of it, so any change anywhere
// started every shard afresh. Now each test file gets a fingerprint of its
// own: its content and everything it can reach. A test file whose
// fingerprint changed is made to look changed to Stryker
// (mutation-stale-results.mjs), and the rest keep their results. What
// affects every result (the lockfile, Node, Stryker's settings, the runner)
// stays in the one global fingerprint of the cache key
// (mutation-fingerprint.mjs).
//
// What a file reaches, found from its syntax tree (@babel/parser), and taken
// on transitively:
// - static imports and re-exports, dynamic import() and require() with a
//   path that can be worked out, resolved the way tsx does (.js to .ts, the
//   extensions, index files; the project has no path aliases);
// - every path given to a file-system read (readFileSync, readdirSync,
//   globSync, existsSync, astro's glob loader and the rest), worked out from
//   literals, constants, join/resolve, new URL(..., import.meta.url),
//   import.meta.dirname, process.cwd() and template literals. A path is a
//   file or a folder: a folder counts with every tracked file in it, so a
//   file added to or taken from a listed folder changes the fingerprint. A
//   path with an unknown tail (join(SRC, name)) counts as every file under
//   its known head;
// - any `new URL('...', import.meta.url)`, wherever it appears.
//
// Anything that cannot be worked out WIDENS: the file then depends on every
// tracked file the mutation run can read. That is: an import or read whose
// path is unknown from its start, an import that resolves to no file, a
// file-system function passed on as a value, a file that cannot be parsed,
// and a file that starts other processes or loads code by other means
// (child_process, worker_threads, node:module).

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, normalize, posix, relative, resolve } from 'node:path';
import { parse } from '@babel/parser';
import { isInput, WORKFLOWS } from './check-inputs.mjs';

/** Raised when the rule changes, so no fingerprint made under an older rule matches. */
export const DEPS_SCHEMA = 1;

/** What a file depending on everything is recorded as. */
export const EVERYTHING = '*';

/** Modules whose functions read the file system. */
const FS_MODULES = new Set(['fs', 'node:fs', 'fs/promises', 'node:fs/promises', 'astro/loaders', 'glob', 'fast-glob', 'tinyglobby']);
/** Modules that run code or processes this analysis cannot follow. */
const OPAQUE_MODULES = new Set(['child_process', 'node:child_process', 'worker_threads', 'node:worker_threads', 'module', 'node:module', 'cluster', 'node:cluster']);
/** File-system functions whose first argument (or `base`/`cwd`) is a path that is read. */
const FS_FUNCTIONS = new Set([
  'readFileSync', 'readFile', 'readdirSync', 'readdir', 'statSync', 'stat', 'lstatSync', 'lstat', 'existsSync', 'exists',
  'opendirSync', 'opendir', 'createReadStream', 'globSync', 'glob', 'accessSync', 'access', 'realpathSync', 'realpath',
  'readlinkSync', 'readlink', 'openSync', 'open', 'watch', 'watchFile', 'cpSync', 'cp', 'copyFileSync', 'copyFile',
]);
const PARSEABLE = /\.(ts|tsx|mts|cts|js|mjs|cjs|jsx)$/;
const EXTENSIONS = ['.ts', '.tsx', '.mts', '.js', '.mjs', '.cjs', '.jsx', '.json'];

/**
 * The tracked files a mutation run can read, for "everything": every
 * tracked path outside what no mutation run reads (check-inputs.mjs).
 */
export function readablePaths(tracked) {
  return tracked.filter((p) => isInput(p, WORKFLOWS[0]));
}

const known = (s) => ({ s, exact: true });
const partial = (s) => ({ s, exact: false });

/**
 * The static analysis of one file's text. Returns `{ imports, reads, opaque }`:
 * `imports` are { spec, value } for each import (value: an evaluated path,
 * or null when unknown), `reads` are evaluated paths read through the file
 * system (null when unknown), `opaque` lists reasons the file depends on
 * everything. `file` is the file's absolute path, `root` the project root.
 */
export function analyse(text, file, root) {
  const plugins = /\.(tsx|jsx)$/.test(file) ? ['typescript', 'jsx'] : /\.(ts|mts|cts)$/.test(file) ? ['typescript'] : ['jsx'];
  let ast;
  try {
    ast = parse(text, {
      sourceType: 'module', plugins, allowAwaitOutsideFunction: true, allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true, allowUndeclaredExports: true, errorRecovery: false,
    });
  } catch (error) {
    return { imports: [], reads: [], opaque: [`cannot be parsed: ${error.message}`] };
  }
  const dir = dirname(file);
  const fileUrl = `file://${file}`;
  const opaque = [];
  const imports = [];
  const reads = [];

  const visit = (node, fn, parent = null, key = null) => {
    if (!node || typeof node.type !== 'string') return;
    fn(node, parent, key);
    for (const k of Object.keys(node)) {
      if (k === 'loc' || k === 'start' || k === 'end' || k === 'extra' || k === 'leadingComments' || k === 'trailingComments' || k === 'innerComments') continue;
      const child = node[k];
      if (Array.isArray(child)) for (const c of child) visit(c, fn, node, k);
      else if (child && typeof child.type === 'string') visit(child, fn, node, k);
    }
  };

  // The identifiers a pattern declares (a parameter, a destructuring, a
  // catch clause), and nothing else: keys, defaults and computed parts are
  // expressions.
  const bindings = new Set();
  const patternNames = (pattern, out = []) => {
    if (!pattern) return out;
    switch (pattern.type) {
      case 'Identifier': out.push(pattern); break;
      case 'ObjectPattern':
        for (const prop of pattern.properties) patternNames(prop.type === 'RestElement' ? prop.argument : prop.value, out);
        break;
      case 'ArrayPattern': for (const el of pattern.elements) patternNames(el, out); break;
      case 'AssignmentPattern': patternNames(pattern.left, out); break;
      case 'RestElement': patternNames(pattern.argument, out); break;
      case 'TSParameterProperty': patternNames(pattern.parameter, out); break;
      default: break;
    }
    return out;
  };

  // Constants by name. A name counts as a constant only when it is declared
  // once in the whole file, as `const NAME = value`. Every other declaration
  // of a name (a parameter, a destructured name, let or var, an import, a
  // function or class) is recorded with no value, so a name declared twice
  // anywhere, in any scope, is unknown: no shadowed name is ever read as
  // another one's value.
  const declared = new Map();
  const declare = (name, init) => {
    const entry = declared.get(name) ?? [];
    entry.push(init);
    declared.set(name, entry);
  };
  visit(ast.program, (node, parent) => {
    if (node.type === 'VariableDeclarator') {
      if (node.id.type === 'Identifier') {
        bindings.add(node.id);
        declare(node.id.name, parent?.kind === 'const' ? node.init : undefined);
      } else {
        for (const id of patternNames(node.id)) { bindings.add(id); declare(id.name, undefined); }
      }
    } else if (node.type === 'CatchClause' && node.param) {
      for (const id of patternNames(node.param)) { bindings.add(id); declare(id.name, undefined); }
    } else if (Array.isArray(node.params) && /Function|Method/.test(node.type)) {
      for (const param of node.params) for (const id of patternNames(param)) { bindings.add(id); declare(id.name, undefined); }
      if (node.id && node.type !== 'FunctionDeclaration') declare(node.id.name, undefined);
    }
    if ((node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration' || node.type === 'ClassExpression') && node.id) {
      declare(node.id.name, undefined);
    } else if (node.type === 'ImportSpecifier' || node.type === 'ImportDefaultSpecifier' || node.type === 'ImportNamespaceSpecifier') {
      declare(node.local.name, undefined);
    } else if (node.type === 'TSImportEqualsDeclaration' || node.type === 'TSEnumDeclaration' || node.type === 'TSModuleDeclaration') {
      if (node.id?.type === 'Identifier') declare(node.id.name, undefined);
    }
  });

  // The local names of the path and url functions this analysis knows. A
  // function called `join` or `resolve` that does not come from node:path
  // (a Promise's resolve, an array helper) is not a path at all.
  const PATH_MODULES = new Set(['path', 'node:path', 'path/posix', 'node:path/posix']);
  const URL_MODULES = new Set(['url', 'node:url']);
  const pathFunctions = new Map(); // local name -> join | resolve | dirname
  const pathSpaces = new Set(); // local names of the module, or of its posix/win32
  const urlFunctions = new Set(); // local names of fileURLToPath
  visit(ast.program, (node) => {
    if (node.type !== 'ImportDeclaration') return;
    const from = node.source.value;
    if (PATH_MODULES.has(from)) {
      for (const sp of node.specifiers) {
        if (sp.type !== 'ImportSpecifier') { pathSpaces.add(sp.local.name); continue; }
        const name = sp.imported.name ?? sp.imported.value;
        if (name === 'posix' || name === 'win32' || name === 'default') pathSpaces.add(sp.local.name);
        else if (name === 'join' || name === 'resolve' || name === 'dirname') pathFunctions.set(sp.local.name, name);
      }
    } else if (URL_MODULES.has(from)) {
      for (const sp of node.specifiers) {
        if (sp.type === 'ImportSpecifier' && (sp.imported.name ?? sp.imported.value) === 'fileURLToPath') urlFunctions.add(sp.local.name);
      }
    }
  });
  /** join | resolve | dirname | fileURLToPath for a call to one of them from its module, else null. */
  const knownFunction = (callee) => {
    if (callee.type === 'Identifier') {
      if (urlFunctions.has(callee.name)) return 'fileURLToPath';
      return pathFunctions.get(callee.name) ?? null;
    }
    if (callee.type !== 'MemberExpression' || callee.computed || callee.property.type !== 'Identifier') return null;
    let obj = callee.object;
    // path.posix.join and the like.
    if (obj.type === 'MemberExpression' && !obj.computed && ['posix', 'win32'].includes(obj.property.name)) obj = obj.object;
    if (obj.type !== 'Identifier' || !pathSpaces.has(obj.name)) return null;
    return ['join', 'resolve', 'dirname'].includes(callee.property.name) ? callee.property.name : null;
  };

  const evaluating = new Set();

  /** A string value, maybe with an unknown tail; null when unknown from its start. */
  const evaluate = (node) => {
    if (!node) return null;
    switch (node.type) {
      case 'StringLiteral': return known(node.value);
      case 'TemplateLiteral': {
        let s = node.quasis[0].value.cooked ?? '';
        for (let i = 0; i < node.expressions.length; i += 1) {
          const v = evaluate(node.expressions[i]);
          if (!v) return s === '' ? null : partial(s);
          s += v.s;
          if (!v.exact) return partial(s);
          s += node.quasis[i + 1].value.cooked ?? '';
        }
        return known(s);
      }
      case 'BinaryExpression': {
        if (node.operator !== '+') return null;
        const a = evaluate(node.left);
        if (!a) return null;
        if (!a.exact) return a;
        const b = evaluate(node.right);
        if (!b) return a.s === '' ? null : partial(a.s);
        return { s: a.s + b.s, exact: b.exact };
      }
      case 'TSAsExpression': case 'TSSatisfiesExpression': case 'TSNonNullExpression': case 'ParenthesizedExpression': case 'TypeCastExpression':
        return evaluate(node.expression);
      case 'Identifier': {
        if (node.name === '__dirname') return known(dir);
        if (node.name === '__filename') return known(file);
        const inits = declared.get(node.name);
        if (!inits || inits.length !== 1 || !inits[0] || evaluating.has(node.name)) return null;
        evaluating.add(node.name);
        try { return evaluate(inits[0]); } finally { evaluating.delete(node.name); }
      }
      case 'MemberExpression': {
        if (node.object.type === 'MetaProperty' && !node.computed) {
          if (node.property.name === 'dirname') return known(dir);
          if (node.property.name === 'filename') return known(file);
          if (node.property.name === 'url') return known(fileUrl);
          return null;
        }
        if (!node.computed && node.property.name === 'pathname') {
          const v = evaluate(node.object);
          return v && v.s.startsWith('file://') ? { s: v.s.slice(7), exact: v.exact } : null;
        }
        return null;
      }
      case 'NewExpression': {
        if (node.callee.type !== 'Identifier' || node.callee.name !== 'URL') return null;
        const [a, b] = node.arguments;
        const spec = evaluate(a);
        if (!spec) return null;
        if (!b) return spec.s.startsWith('file://') ? spec : null;
        const base = evaluate(b);
        if (!base || !base.exact || !base.s.startsWith('file://')) return null;
        if (spec.s.startsWith('file://')) return spec;
        const from = spec.s.startsWith('/') ? '' : posix.dirname(base.s.slice(7));
        const joined = spec.s.startsWith('/') ? spec.s : `${from}/${spec.s}`;
        return { s: `file://${spec.exact ? posix.normalize(joined) : joined}`, exact: spec.exact };
      }
      case 'CallExpression': {
        const args = node.arguments;
        const callee = node.callee;
        if (callee.type === 'MemberExpression' && !callee.computed && callee.object.type === 'Identifier' && callee.object.name === 'process'
          && callee.property.name === 'cwd' && !declared.has('process')) return known(root);
        const name = knownFunction(callee);
        if (name === 'fileURLToPath') {
          const v = evaluate(args[0]);
          return v && v.s.startsWith('file://') ? { s: v.s.slice(7), exact: v.exact } : null;
        }
        if (name === 'dirname') {
          const v = evaluate(args[0]);
          return v && v.exact ? known(posix.dirname(v.s.startsWith('file://') ? v.s.slice(7) : v.s)) : null;
        }
        if (name === 'join' || name === 'resolve') {
          // The parts known from the start, and an unknown tail after them.
          let s = null;
          for (const arg of args) {
            const v = evaluate(arg);
            if (!v) return s === null ? null : partial(`${s}/`);
            const part = v.s;
            s = s === null || (name === 'resolve' && part.startsWith('/')) ? part : `${s}/${part}`;
            if (!v.exact) return partial(s);
          }
          return s === null ? null : known(s);
        }
        return null;
      }
      default: return null;
    }
  };

  const importOf = (v) => {
    imports.push({ spec: v?.s ?? null, value: v });
    if (v?.exact && OPAQUE_MODULES.has(v.s)) opaque.push(`uses ${v.s}`);
  };
  visit(ast.program, (node) => {
    if (node.type === 'ImportDeclaration' || node.type === 'ExportAllDeclaration' || (node.type === 'ExportNamedDeclaration' && node.source)) {
      // `import type` and `export type ... from` are erased whole before
      // anything runs (tsx compiles with esbuild, which keeps no trace of
      // them), so they load nothing. An inline `{ type X }` is kept: under
      // some settings the import itself stays, for its side effects.
      if (node.importKind === 'type' || node.exportKind === 'type') return;
      importOf(known(node.source.value));
    } else if (node.type === 'TSImportEqualsDeclaration' && node.moduleReference?.type === 'TSExternalModuleReference') {
      importOf(known(node.moduleReference.expression.value));
    } else if (node.type === 'CallExpression' && (node.callee.type === 'Import' || (node.callee.type === 'Identifier' && node.callee.name === 'require'))) {
      importOf(evaluate(node.arguments[0]));
    } else if (node.type === 'ImportExpression') {
      importOf(evaluate(node.source));
    } else if (node.type === 'NewExpression' && node.callee.type === 'Identifier' && node.callee.name === 'URL' && node.arguments.length === 2) {
      // Any file named relative to this one counts, whatever it is used for.
      const v = evaluate(node);
      if (v) reads.push(v);
    } else if (node.type === 'MemberExpression' && !node.computed && node.object.type === 'Identifier' && node.object.name === 'require' && node.property.name === 'resolve') {
      opaque.push('uses require.resolve');
    }
  });

  // How the file reaches the file system: the local names bound to its
  // functions, and the names of whole modules (`import * as fs`, `const fs =
  // await import('node:fs')`). A module bound any other way widens.
  const fsNames = new Map();
  const fsSpaces = new Set();
  const isFsLoad = (node) => {
    let n = node;
    while (n && (n.type === 'AwaitExpression' || n.type === 'TSAsExpression' || n.type === 'ParenthesizedExpression')) n = n.argument ?? n.expression;
    if (!n || n.type !== 'CallExpression') return false;
    if (n.callee.type !== 'Import' && !(n.callee.type === 'Identifier' && n.callee.name === 'require')) return false;
    const v = evaluate(n.arguments[0]);
    return Boolean(v?.exact && FS_MODULES.has(v.s));
  };
  const bindPattern = (pattern) => {
    if (pattern.type === 'Identifier') { fsSpaces.add(pattern.name); return; }
    if (pattern.type !== 'ObjectPattern') { opaque.push('binds a file-system module in a way this analysis does not follow'); return; }
    for (const prop of pattern.properties) {
      if (prop.type !== 'ObjectProperty' || prop.computed) { opaque.push('binds a file-system module in a way this analysis does not follow'); continue; }
      const name = prop.key.name ?? prop.key.value;
      const local = prop.value.type === 'AssignmentPattern' ? prop.value.left : prop.value;
      if (name === 'promises') bindPattern(local);
      else if (local.type === 'Identifier') fsNames.set(local.name, name);
      else opaque.push('binds a file-system module in a way this analysis does not follow');
    }
  };
  const fsLoads = new Set();
  visit(ast.program, (node) => {
    if (node.type === 'ImportDeclaration' && FS_MODULES.has(node.source.value)) {
      for (const sp of node.specifiers) {
        const imported = sp.type === 'ImportSpecifier' ? (sp.imported.name ?? sp.imported.value) : null;
        // `import { promises as fsp }` is the whole module again, by another name.
        if (imported === null || imported === 'promises' || imported === 'default') fsSpaces.add(sp.local.name);
        else fsNames.set(sp.local.name, imported);
      }
    } else if (node.type === 'VariableDeclarator' && node.init && isFsLoad(node.init)) {
      bindPattern(node.id);
      fsLoads.add(node.init.type === 'AwaitExpression' ? node.init.argument : node.init);
    } else if (node.type === 'ExportAllDeclaration' || node.type === 'ExportNamedDeclaration') {
      if (node.source && FS_MODULES.has(node.source.value)) opaque.push('re-exports a file-system module');
    }
  });
  visit(ast.program, (node) => {
    if (node.type === 'CallExpression' && isFsLoad(node) && !fsLoads.has(node)) opaque.push('loads a file-system module in a way this analysis does not follow');
  });

  /** The fs function a call reaches, or null. */
  const fsFunction = (callee) => {
    if (callee.type === 'Identifier') return fsNames.get(callee.name) ?? null;
    if (callee.type !== 'MemberExpression' || callee.computed) return null;
    let obj = callee.object;
    if (obj.type === 'MemberExpression' && !obj.computed && obj.property.name === 'promises') obj = obj.object;
    return obj.type === 'Identifier' && fsSpaces.has(obj.name) ? callee.property.name : null;
  };

  if (fsNames.size > 0 || fsSpaces.size > 0) {
    visit(ast.program, (node, parent, key) => {
      if (node.type === 'CallExpression') {
        const name = fsFunction(node.callee);
        if (name === null || !FS_FUNCTIONS.has(name)) return;
        const [first, second] = node.arguments;
        const paths = [];
        const option = (obj, prop) => obj?.type === 'ObjectExpression'
          ? obj.properties.find((p) => p.type === 'ObjectProperty' && !p.computed && (p.key.name ?? p.key.value) === prop)?.value
          : undefined;
        if (second?.type === 'ObjectExpression' && second.properties.some((p) => p.type === 'SpreadElement')) opaque.push(`${name} with options this analysis does not follow`);
        const cwdNode = option(second, 'cwd');
        const cwd = cwdNode === undefined ? known(root) : evaluate(cwdNode);
        if (first?.type === 'ObjectExpression') {
          // astro's glob({ pattern, base }): everything under base.
          const base = option(first, 'base');
          const v = base === undefined ? null : evaluate(base);
          paths.push(v ? (v.exact ? partial(withTrailingSlash(v.s)) : v) : null);
        } else if (first?.type === 'ArrayExpression') {
          for (const el of first.elements) paths.push(globHead(evaluate(el), cwd));
        } else if (name === 'globSync' || name === 'glob') {
          paths.push(globHead(evaluate(first), cwd));
        } else {
          paths.push(evaluate(first));
        }
        for (const v of paths) reads.push(v);
        return;
      }
      if (node.type !== 'Identifier' || bindings.has(node) || !isValueUse(node, parent, key)) return;
      // A file-system function, or the whole module, handed on as a value:
      // what is read through it is unknown.
      if (fsNames.has(node.name) && FS_FUNCTIONS.has(fsNames.get(node.name))) opaque.push(`hands on ${node.name} as a value`);
      if (fsSpaces.has(node.name) && !(parent.type === 'MemberExpression' && key === 'object')) opaque.push(`hands on the module ${node.name} as a value`);
    });
  }
  return { imports, reads, opaque };
}

function withTrailingSlash(s) {
  return s.endsWith('/') ? s : `${s}/`;
}

/** A glob pattern as the folder its fixed part names. */
function globHead(v, cwd) {
  if (!v || !cwd) return null;
  const at = v.s.search(/[*?{[!(]/);
  const head = at === -1 ? v.s : v.s.slice(0, at);
  const exact = at === -1 && v.exact;
  const base = head.startsWith('/') ? head : `${cwd.s}/${head}`;
  if (!cwd.exact) return partial(cwd.s);
  if (exact) return known(base);
  // Up to the last full folder of the fixed part.
  return partial(base.slice(0, base.lastIndexOf('/') + 1));
}

function isValueUse(node, parent, key) {
  if (!parent) return false;
  if (parent.type === 'CallExpression' && key === 'callee') return false;
  if (parent.type === 'MemberExpression' && key === 'property' && !parent.computed) return false;
  if (parent.type === 'OptionalMemberExpression' && key === 'property' && !parent.computed) return false;
  if (parent.type === 'ImportSpecifier' || parent.type === 'ImportDefaultSpecifier' || parent.type === 'ImportNamespaceSpecifier') return false;
  if (parent.type === 'ExportSpecifier') return true;
  // A key names a property, never a value (babel gives a shorthand `{ a }`
  // a key node and a value node of its own). The value is a use: in a
  // pattern (`const { readFileSync } = ...`) it is a binding, which the
  // caller has already left out; in an object literal it hands the value on.
  if (parent.type === 'ObjectProperty' && key === 'key' && !parent.computed) return false;
  if (parent.type === 'ObjectProperty' && key === 'value') return true;
  if (parent.type === 'VariableDeclarator' && key === 'id') return false;
  if (parent.type === 'FunctionDeclaration' || parent.type === 'ClassMethod' || parent.type === 'ObjectMethod' || parent.type === 'TSDeclareFunction') return false;
  if (parent.type === 'ClassProperty' && key === 'key') return false;
  if (parent.type?.startsWith('TS')) return false;
  return true;
}

/**
 * The dependency graph of a checkout. `tracked` is every tracked path
 * (relative to `root`); `read(path)` gives a tracked file's text. Files
 * that exist on disk but are not tracked (made by a build step) are read
 * from disk when something reaches them.
 */
export function createGraph({ root, tracked, read = (p) => readFileSync(join(root, p), 'utf8') }) {
  const trackedSet = new Set(tracked);
  const sortedTracked = [...tracked].sort();
  const readable = readablePaths(sortedTracked);
  const cache = new Map();
  const exists = (rel) => trackedSet.has(rel) || (!rel.startsWith('..') && existsSync(join(root, rel)) && statSync(join(root, rel)).isFile());
  const toRel = (abs) => normalize(relative(root, abs)).split('\\').join('/');

  const resolveImport = (fromRel, spec) => {
    // package.json subpath imports (#name): the project has none, and one
    // added later is not followed, so it resolves to nothing and widens.
    // (Before the query and hash are cut off, which would leave nothing.)
    if (spec.startsWith('#')) return null;
    const clean = spec.replace(/[?#].*$/, '');
    if (clean.startsWith('file://')) return resolveImport(fromRel, clean.slice(7));
    if (!clean.startsWith('.') && !clean.startsWith('/')) return undefined; // a package or a built-in: the lockfile and Node, in the global fingerprint
    const base = toRel(isAbsolute(clean) ? clean : join(root, dirname(fromRel), clean));
    const stems = [base];
    const m = /\.(m|c)?jsx?$/.exec(base);
    if (m) stems.push(base.slice(0, -m[0].length));
    const candidates = [];
    for (const stem of stems) {
      candidates.push(stem, ...EXTENSIONS.map((e) => `${stem}${e}`), ...EXTENSIONS.map((e) => `${stem}/index${e}`));
    }
    const at = candidates.findIndex(exists);
    if (at === -1) return null;
    // The names tried before the one found: a file added at one of them
    // would be loaded instead, so each counts by whether it is there.
    tried.set(`${fromRel}\0${spec}`, [...new Set(candidates.slice(0, at))].filter((c) => c !== candidates[at]));
    return candidates[at];
  };
  const tried = new Map();

  /** Every tracked (or on-disk) path a read of `v` (an evaluated path) can touch. */
  const touched = (v) => {
    let s = v.s.startsWith('file://') ? v.s.slice(7) : v.s;
    if (!s.startsWith('/')) s = `${root}/${s}`;
    if (v.exact) {
      const rel = toRel(s);
      if (rel.startsWith('..')) return null;
      if (rel === '' || rel === '.') return { prefix: '' };
      return { exact: rel, prefix: `${rel}/` };
    }
    // An unknown tail: normalise the folders, keep the partial name.
    const cut = s.lastIndexOf('/');
    const folder = toRel(s.slice(0, cut + 1) || '/');
    if (folder.startsWith('..')) return null;
    const rest = s.slice(cut + 1);
    const prefix = folder === '' || folder === '.' ? rest : `${folder}/${rest}`;
    return { prefix };
  };

  /** One file's direct dependencies: { files: Set, all: reasons[] }. */
  const direct = (rel) => {
    if (cache.has(rel)) return cache.get(rel);
    const result = { files: new Set(), next: new Set(), all: [] };
    cache.set(rel, result);
    if (!PARSEABLE.test(rel)) return result;
    let text;
    try {
      text = trackedSet.has(rel) ? read(rel) : readFileSync(join(root, rel), 'utf8');
    } catch (error) {
      result.all.push(`cannot be read: ${error.message}`);
      return result;
    }
    const { imports, reads, opaque } = analyse(String(text), join(root, rel), root);
    result.all.push(...opaque);
    for (const { spec, value } of imports) {
      if (!value) { result.all.push('an import whose path is not known'); continue; }
      if (!value.exact) {
        // A relative import is relative to this file, not to the project;
        // a package whose name is only partly known widens.
        const s = value.s;
        let from;
        if (s.startsWith('./') || s.startsWith('../') || s === '.' || s === '..') {
          const joined = posix.join(posix.dirname(rel), s);
          from = { s: `${root}/${joined}${s.endsWith('/') && !joined.endsWith('/') ? '/' : ''}`, exact: false };
        } else if (s.startsWith('/') || s.startsWith('file://')) {
          from = value;
        } else {
          result.all.push(`an import whose package is not known: ${s}`);
          continue;
        }
        const t = touched(from);
        if (!t) { result.all.push(`an import outside the project: ${value.s}`); continue; }
        if (t.prefix === '') { result.all.push('an import that may load any file of the project'); continue; }
        // Any file under the prefix may be loaded: every one counts, and is followed.
        for (const p of sortedTracked) if (p.startsWith(t.prefix)) { result.files.add(p); result.next.add(p); }
        continue;
      }
      const target = resolveImport(rel, spec);
      if (target === undefined) continue;
      if (target === null) { result.all.push(`an import that resolves to no file: ${spec}`); continue; }
      result.files.add(target);
      result.next.add(target);
      for (const c of tried.get(`${rel}\0${spec}`) ?? []) result.files.add(`?${c}`);
    }
    for (const v of reads) {
      if (!v) { result.all.push('a file-system read whose path is not known'); continue; }
      const t = touched(v);
      if (!t) { result.all.push(`a read outside the project: ${v.s}`); continue; }
      if (t.prefix === '') { result.all.push('a read of the whole project'); continue; }
      if (t.exact !== undefined) {
        // The file itself, by its contents (when it is one), and whether it is there.
        result.files.add(`?${t.exact}`);
        if (exists(t.exact)) result.files.add(t.exact);
      }
      for (const p of sortedTracked) if (p.startsWith(t.prefix)) result.files.add(p);
      // A listing names files that are not there yet: the prefix itself counts.
      result.files.add(`>${t.prefix}`);
    }
    return result;
  };

  /**
   * What `rel` depends on, transitively: `{ all: reasons[], files: string[] }`
   * where `files` holds paths, `?path` (a path read that may not exist) and
   * `>prefix` (a folder or name prefix that was listed or globbed).
   */
  const dependencies = (rel) => {
    const seen = new Set([rel]);
    const files = new Set([rel]);
    const all = [];
    const queue = [rel];
    while (queue.length > 0) {
      const at = queue.shift();
      const d = direct(at);
      for (const reason of d.all) all.push(`${at}: ${reason}`);
      for (const f of d.files) files.add(f);
      for (const n of d.next) if (!seen.has(n)) { seen.add(n); queue.push(n); }
    }
    return { all, files: [...files].sort() };
  };

  const hashes = new Map();
  const contentHash = (p) => {
    if (!hashes.has(p)) {
      let bytes;
      try {
        bytes = trackedSet.has(p) ? read(p) : readFileSync(join(root, p));
      } catch {
        bytes = null;
      }
      hashes.set(p, bytes === null ? 'missing' : createHash('sha256').update(bytes).digest('hex'));
    }
    return hashes.get(p);
  };
  let everything = null;
  const everythingHash = () => {
    if (everything === null) {
      const h = createHash('sha256').update(`deps ${DEPS_SCHEMA} everything\0`);
      for (const p of readable) h.update(`${p}\0${contentHash(p)}\0`);
      everything = h.digest('hex');
    }
    return everything;
  };

  /** The fingerprint of `rel` and all it reaches. */
  const fingerprintOf = (rel) => {
    const { all, files } = dependencies(rel);
    const h = createHash('sha256').update(`deps ${DEPS_SCHEMA}\0${rel}\0`);
    if (all.length > 0) return { fingerprint: h.update(`${EVERYTHING}\0${everythingHash()}`).digest('hex'), all, files };
    for (const entry of files) {
      if (entry.startsWith('>')) {
        // Which files are under the prefix is already in the list; the
        // prefix itself says what was listed.
        h.update(`${entry}\0`);
      } else if (entry.startsWith('?')) {
        const p = entry.slice(1);
        h.update(`${entry}\0${exists(p) ? 'there' : 'not there'}\0`);
      } else {
        h.update(`${entry}\0${contentHash(entry)}\0`);
      }
    }
    return { fingerprint: h.digest('hex'), all, files };
  };

  return { dependencies, fingerprintOf };
}

/**
 * The fingerprints a shard's results are saved with: one for each test file
 * the run starts, and one for each mutated file (for the mutants no test is
 * mapped to). `{ schema, tests: { path: hex }, sources: { path: hex } }`.
 */
export function dependencyFingerprints({ root, tracked, tests, sources, read }) {
  const graph = createGraph({ root, tracked, read });
  const tests_ = {};
  const sources_ = {};
  for (const t of [...new Set(tests)].sort()) tests_[t] = graph.fingerprintOf(t).fingerprint;
  for (const s of [...new Set(sources)].sort()) sources_[s] = graph.fingerprintOf(s).fingerprint;
  return { schema: DEPS_SCHEMA, tests: tests_, sources: sources_ };
}

/**
 * A shard's fingerprints, as mutation-stale-results.mjs saves them: every
 * test file a mutation run can start (`isTest` picks them from `tracked`),
 * and every file the shard mutates (`mutate`, Stryker's patterns, ranges cut
 * off) or holds results for (`report`'s files).
 */
export function shardFingerprints({ root, tracked, isTest, mutate, report }) {
  const rel = (key) => (isAbsolute(key) ? relative(root, key).split('\\').join('/') : key);
  return dependencyFingerprints({
    root,
    tracked,
    tests: tracked.filter(isTest),
    sources: [...mutate.map((m) => m.replace(/:\d+(:\d+)?-\d+(:\d+)?$/, '')), ...Object.keys(report?.files ?? {}).map(rel)],
  });
}

/** Where a shard's dependency fingerprints are kept: beside its results, and saved with them. */
export function depsPath(incrementalFile) {
  return `${incrementalFile.replace(/\.json$/, '')}.deps.json`;
}

/** The stored fingerprints, or null when they are missing, unreadable or from another rule. */
export function readStored(json) {
  if (!json || typeof json !== 'object' || json.schema !== DEPS_SCHEMA) return null;
  if (!json.tests || typeof json.tests !== 'object' || !json.sources || typeof json.sources !== 'object') return null;
  return json;
}

/** What a test file's stored source is prefixed with, so Stryker sees it as changed. */
export const CHANGED_MARK = '/* nidhi: what this test reaches has changed (mutation-deps.mjs) */\n';

const relativeKey = (root, key) => (isAbsolute(key) ? relative(root, key).split('\\').join('/') : key);

/**
 * Makes Stryker treat as changed every test file in `report` (a restored
 * incremental file, changed in place) whose dependency fingerprint changed
 * since `stored` (null: nothing is known, so every one), and takes out the
 * static mutants and the mutants mapped to no test in a file whose own
 * fingerprint changed. Returns `{ tests: [paths marked], mutants: n }`.
 *
 * How the mark works, on Stryker 10.1.1 (incremental-differ.js): a test is
 * keyed by file and name, and the tap runner's one test per file has no
 * location, so it spans the whole file. Stryker diffs the stored source of
 * each test file against today's; any difference covering a test's span
 * drops that test from the earlier run. A Killed result is then reused only
 * if another killing test is the same (none is), so it is tested again; a
 * survivor that today's coverage maps to the test sees it as added, so it
 * is tested again too. The recheck after the run (mutation-recheck.mjs)
 * compares the stored sources with today's, so it sees the marked files as
 * edited and rechecks the kills they cover. A static mutant has no per-test
 * coverage, so a survivor would be kept: those, and mutants with no
 * coverage on record, are taken out when their file's fingerprint changed.
 *
 * A test file is also marked when the stored coverage says it ran a mutant
 * in a file whose fingerprint changed: that catches a test that reaches the
 * file in a way the syntax tree does not show. A test that newly reaches a
 * mutant is new coverage, which Stryker itself treats as an added test.
 */
export function invalidate(report, stored, current, root = process.cwd()) {
  const same = (now, was) => typeof now === 'string' && typeof was === 'string' && now === was;
  // The mutated files whose fingerprint changed.
  const changedSources = new Set();
  for (const key of Object.keys(report.files ?? {})) {
    const path = relativeKey(root, key);
    if (!same(current.sources[path], stored?.sources?.[path])) changedSources.add(key);
  }
  // What each test file covered last time, from the stored coverage: a test
  // that ran a mutant in a changed file reaches it at run time, whether or
  // not the syntax tree shows how (condition 1 of #891: static analysis and
  // run-time coverage together).
  const fileOfTest = new Map();
  for (const [key, file] of Object.entries(report.testFiles ?? {})) {
    for (const test of file?.tests ?? []) fileOfTest.set(test.id, key);
  }
  const reachesChanged = new Set();
  for (const key of changedSources) {
    for (const m of report.files[key].mutants ?? []) {
      for (const id of [...(m.coveredBy ?? []), ...(m.killedBy ?? [])]) {
        if (fileOfTest.has(id)) reachesChanged.add(fileOfTest.get(id));
      }
    }
  }
  const marked = [];
  for (const [key, file] of Object.entries(report.testFiles ?? {})) {
    const path = relativeKey(root, key);
    if (same(current.tests[path], stored?.tests?.[path]) && !reachesChanged.has(key)) continue;
    if (!file || typeof file !== 'object') continue;
    if (typeof file.source !== 'string' || !file.source.startsWith(CHANGED_MARK)) {
      file.source = `${CHANGED_MARK}${typeof file.source === 'string' ? file.source : ''}`;
    }
    marked.push(path);
  }
  let mutants = 0;
  for (const key of changedSources) {
    const file = report.files[key];
    const kept = file.mutants.filter((m) => m.status === 'Ignored' || (m.static !== true && Array.isArray(m.coveredBy) && m.coveredBy.length > 0));
    mutants += file.mutants.length - kept.length;
    file.mutants = kept;
  }
  return { tests: marked.sort(), mutants };
}
