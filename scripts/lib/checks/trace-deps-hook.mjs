// What a test process actually loads and reads, for the check of the static
// dependency analysis (#891; scripts/check-mutation-deps.mjs).
//
//   TRACE_DEPS_OUT=<file> node --import tsx --import ./scripts/lib/checks/trace-deps-hook.mjs --test <test file>
//
// Loaded after tsx, so its resolve hook runs first and sees where tsx sends
// each import (ESM and CommonJS alike). In the main thread it also wraps the
// file-system functions that read a path, sync, callback and promise forms,
// and records each path given to them. Every record is one absolute path per
// line, appended to TRACE_DEPS_OUT; what is outside the project is sorted out
// by the reader.
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { isMainThread } from 'node:worker_threads';

let out = process.env.TRACE_DEPS_OUT;
let unwritten = false;

const record = (path) => {
  if (!out || typeof path !== 'string' || path === '') return;
  try {
    appendFileSync(out, `${path}\n`);
  } catch {
    // A record that cannot be written is a missing record, and the reader
    // would find less than was read. It is told, once, and fails the check
    // (scripts/check-mutation-deps.mjs, UNWRITTEN).
    if (!unwritten) process.stderr.write('trace-deps-hook: a record could not be written\n');
    unwritten = true;
  }
};
const asPath = (p) => {
  if (typeof p === 'string') return p.startsWith('file:') ? fileURLToPath(p) : p;
  if (p instanceof URL) return p.protocol === 'file:' ? fileURLToPath(p) : null;
  if (Buffer.isBuffer(p)) return p.toString();
  return null;
};

/** The hooks thread: data comes from register() below. */
export function initialize(data) {
  out = data?.out ?? out;
}

export async function resolve(specifier, context, next) {
  const result = await next(specifier, context);
  if (result?.url?.startsWith('file:')) record(fileURLToPath(result.url));
  return result;
}

if (isMainThread && process.env.TRACE_DEPS_OUT && !globalThis.__traceDepsInstalled) {
  globalThis.__traceDepsInstalled = true;
  const { register, syncBuiltinESMExports } = await import('node:module');
  register(import.meta.url, { data: { out } });

  const fs = await import('node:fs');
  const READS = [
    'readFileSync', 'readFile', 'readdirSync', 'readdir', 'statSync', 'stat', 'lstatSync', 'lstat', 'existsSync', 'exists',
    'opendirSync', 'opendir', 'createReadStream', 'accessSync', 'access', 'realpathSync', 'realpath', 'readlinkSync',
    'readlink', 'openSync', 'open', 'globSync', 'glob', 'watch', 'watchFile', 'cpSync', 'cp', 'copyFileSync', 'copyFile',
  ];
  const wrap = (target, name) => {
    const original = target[name];
    if (typeof original !== 'function' || original.__traced) return;
    const wrapped = function traced(first, ...rest) {
      if (name === 'globSync' || name === 'glob') {
        const cwd = rest[0]?.cwd ? asPath(rest[0].cwd) : process.cwd();
        for (const pattern of Array.isArray(first) ? first : [first]) {
          if (typeof pattern === 'string') record(`${cwd}/${pattern.replace(/[*?{[].*$/, '')}`);
        }
      } else {
        const p = asPath(first);
        if (p !== null) record(p.startsWith('/') ? p : `${process.cwd()}/${p}`);
      }
      return original.call(this, first, ...rest);
    };
    wrapped.__traced = true;
    Object.defineProperties(wrapped, Object.getOwnPropertyDescriptors(original));
    target[name] = wrapped;
  };
  for (const name of READS) wrap(fs.default, name);
  for (const name of READS) wrap(fs.default.promises, name);
  syncBuiltinESMExports();

  // require() of CommonJS goes through Module._resolveFilename as well.
  const Module = (await import('node:module')).default;
  const original = Module._resolveFilename;
  Module._resolveFilename = function tracedResolve(...args) {
    const file = original.apply(this, args);
    if (typeof file === 'string' && file.startsWith('/')) record(file);
    return file;
  };
}
