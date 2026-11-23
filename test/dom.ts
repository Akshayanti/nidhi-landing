/**
 * A browser for component tests: jsdom's window, installed as the globals
 * React and Testing Library expect. Import it first in a `*.dom.test.tsx`,
 * before anything that touches `document`.
 */
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html lang="en"><body></body></html>', {
  url: 'https://nidhi.today/free/',
  pretendToBeVisual: true,
});
const { window } = dom;

const g = globalThis as unknown as Record<string, unknown>;
for (const key of Object.getOwnPropertyNames(window)) {
  if (key in g) continue;
  g[key] = (window as unknown as Record<string, unknown>)[key];
}
for (const key of ['window', 'document', 'navigator', 'location', 'localStorage', 'sessionStorage', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) {
  Object.defineProperty(g, key, { value: (window as unknown as Record<string, unknown>)[key], configurable: true, writable: true });
}
g.IS_REACT_ACT_ENVIRONMENT = true;

// What jsdom does not lay out: no element has a size, and nothing is observed.
class NoObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
for (const name of ['ResizeObserver', 'IntersectionObserver']) {
  g[name] = NoObserver;
  (window as unknown as Record<string, unknown>)[name] = NoObserver;
}
window.matchMedia ??= ((query: string) => ({
  matches: false, media: query, onchange: null,
  addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
})) as typeof window.matchMedia;
g.matchMedia = window.matchMedia;

export { window };
