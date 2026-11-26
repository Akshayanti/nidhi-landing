/**
 * For tests only: lets a test load a module that imports `astro:content`.
 *
 * `astro:content` exists only inside an Astro build. Modules such as
 * `guides.ts` and `learnPosts.ts` import it for the parts
 * that read the collections, and keep their checks pure beside them. A test
 * imports this file first, then loads the module with `await import(...)`, and
 * tests the pure parts. The stub's `getCollection` answers with an empty list,
 * so nothing here stands in for real content.
 */
import { register } from 'node:module';

const stub = [
  'export const defineCollection = (c) => c;',
  'export const getCollection = async () => [];',
].join('');

const hooks = `
export async function resolve(specifier, context, next) {
  if (specifier === 'astro:content') {
    return { url: 'data:text/javascript,' + encodeURIComponent(${JSON.stringify(stub)}), shortCircuit: true };
  }
  return next(specifier, context);
}`;

register('data:text/javascript,' + encodeURIComponent(hooks));
