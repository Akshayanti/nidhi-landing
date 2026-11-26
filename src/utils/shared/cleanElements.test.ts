/**
 * Unit tests for src/utils/shared/cleanElements.js, the click-data filter that
 * Analytics.astro inlines before PostHog starts.
 *
 * The file is a classic script, so it is run here the way the page runs it, in
 * a context of its own. The chains are written with PostHog's own serialiser
 * (posthog-js 1.441: values escaped with `.replace(/"|\\"/g, '\\"')`, keys in
 * alphabetical order), so the filter is tested against the string the live
 * project sends.
 *
 * Run with:  npm test
 */
import { readsSource } from '../../../test/mutationRun.ts';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runClassicScript } from '../../../test/classicScript.ts';
import { join } from 'node:path';

import { scanLabels } from '../analyticsLabels.ts';

type Props = Record<string, unknown>;
type Labels = { exact: string[]; prefixes: string[] };
type Clean = (props: Props, labels: Labels) => void;
const SOURCE = readFileSync(new URL('./cleanElements.js', import.meta.url), 'utf8');
const context: { nidhiCleanElements?: Clean } = {};
runClassicScript(SOURCE, { window: context });
const clean = context.nidhiCleanElements!;

const labels = { exact: ['lc-vendor-remove', 'lc-share-copy', 'volunteers-form'], prefixes: ['related-', 'lc-tab-'] };

interface El {
  tag_name: string;
  classes?: string[];
  attrs?: Record<string, string>;
  nth_child?: number;
  nth_of_type?: number;
}

// posthog-js's chain serialiser, as shipped.
const escape = (v: string) => v.replace(/"|\\"/g, '\\"');
function chainOf(elements: El[]): string {
  return elements
    .map((e) => {
      let s = e.tag_name;
      for (const c of [...(e.classes ?? [])].sort()) s += `.${c.replace(/"/g, '')}`;
      const fields: Record<string, string> = { 'nth-child': String(e.nth_child ?? 0), 'nth-of-type': String(e.nth_of_type ?? 0), ...(e.attrs ?? {}) };
      return `${s}:${Object.keys(fields).sort().map((k) => `${escape(k)}="${escape(fields[k])}"`).join('')}`;
    })
    .join(';');
}

function cleaned(elements: El[]): string {
  const props: Props = { $elements_chain: chainOf(elements) };
  clean(props, labels);
  return props.$elements_chain as string;
}

/** A chain as it is written here, cleaned. */
function cleanedChain(chain: unknown, known: Labels = labels): unknown {
  const props: Props = { $elements_chain: chain };
  clean(props, known);
  return props.$elements_chain;
}

/** An $elements list, cleaned, as plain data (the script runs in a context of its own). */
function cleanedList(list: unknown): unknown {
  const props: Props = { $elements: list };
  clean(props, labels);
  assert.deepEqual(Object.keys(props), ['$elements']);
  return JSON.parse(JSON.stringify(props.$elements));
}

/** An event whose deleted properties are noted, by name. */
function watched(props: Props): { props: Props; deleted: string[] } {
  const deleted: string[] = [];
  const proxy = new Proxy(props, {
    deleteProperty(target, key) {
      deleted.push(String(key));
      return Reflect.deleteProperty(target, key);
    },
  });
  return { props: proxy, deleted };
}

// Every tag a click on the site can land on or pass through: the closed list.
const TAGS = [
  'a', 'abbr', 'article', 'aside', 'b', 'blockquote', 'body', 'button', 'caption', 'circle', 'code', 'dd', 'details', 'dialog', 'div', 'dl', 'dt',
  'em', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'g', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'html', 'i', 'img', 'input', 'ins', 'kbd',
  'label', 'legend', 'li', 'line', 'main', 'mark', 'nav', 'ol', 'optgroup', 'option', 'output', 'p', 'path', 'picture', 'polygon', 'polyline', 'pre',
  'rect', 's', 'section', 'select', 'small', 'source', 'span', 'strong', 'sub', 'summary', 'sup', 'svg', 'table', 'tbody', 'td', 'text', 'textarea',
  'tfoot', 'th', 'thead', 'time', 'tr', 'tspan', 'u', 'ul', 'video',
];

// What a reader might type into a loan offer's name, and what a chart says.
const TYPED = ['Acme "Bank" \\ <&> ; : =', 'Trailing\\', 'x"attr__data-attr="lc-share-copy', '250000', '€1,234,567.89'];

describe('nidhiCleanElements', () => {
  it('keeps the tag, a known label and the position, and nothing else', () => {
    const out = cleaned([
      { tag_name: 'button', classes: ['lc-removeBtn'], attrs: { 'attr__data-attr': 'lc-vendor-remove', 'attr__aria-label': 'Remove Acme Bank', attr__title: 'Remove', attr__type: 'button' }, nth_child: 3, nth_of_type: 2 },
      { tag_name: 'div', classes: ['lc-card'], attrs: { attr__id: 'offer-Acme', attr__style: 'width: 63%' }, nth_child: 1, nth_of_type: 1 },
    ]);
    assert.equal(out, 'button:attr__data-attr="lc-vendor-remove"nth-child="3"nth-of-type="2";div:nth-child="1"nth-of-type="1"');
  });

  it('never passes on typed text, however it is written', () => {
    for (const typed of TYPED) {
      const out = cleaned([
        { tag_name: 'button', attrs: { 'attr__aria-label': `Remove ${typed}`, 'attr__data-attr': 'lc-vendor-remove' }, nth_child: 1, nth_of_type: 1 },
        { tag_name: 'svg', attrs: { 'attr__aria-label': `Balance ${typed}`, attr__title: typed }, nth_child: 2, nth_of_type: 1 },
        { tag_name: 'a', attrs: { attr__href: `/free/loan-comparison/?utm_source=share#v=${encodeURIComponent(typed)}` }, nth_child: 1, nth_of_type: 1 },
      ]);
      for (const part of ['Acme', 'Bank', 'Trailing', '250000', '1,234', 'utm_source', '#v=', 'href', 'aria-label', 'title']) {
        assert.ok(!out.includes(part), `${JSON.stringify(typed)} leaked ${part}: ${out}`);
      }
    }
  });

  it('drops a label the registry does not know, and anything that is not a slug', () => {
    const out = cleaned([
      { tag_name: 'button', attrs: { 'attr__data-attr': 'acme-bank' }, nth_child: 1, nth_of_type: 1 },
      { tag_name: 'a', attrs: { 'attr__data-attr': 'related-Acme Bank' }, nth_child: 1, nth_of_type: 1 },
      { tag_name: 'a', attrs: { 'attr__data-attr': 'related-' }, nth_child: 1, nth_of_type: 1 },
      { tag_name: 'a', attrs: { 'attr__data-attr': 'related-emergency-fund' }, nth_child: 1, nth_of_type: 1 },
    ]);
    assert.equal(out, 'button:nth-child="1"nth-of-type="1";a:nth-child="1"nth-of-type="1";a:nth-child="1"nth-of-type="1";a:attr__data-attr="related-emergency-fund"nth-child="1"nth-of-type="1"');
  });

  it('drops unknown tags and positions that are not small whole numbers', () => {
    const out = cleaned([
      { tag_name: 'acme-widget', nth_child: 1, nth_of_type: 1 },
      { tag_name: 'span', nth_child: 250000, nth_of_type: 1 },
    ]);
    assert.equal(out, 'span:nth-of-type="1"');
  });

  it('keeps every tag on the site’s list, and no other', () => {
    assert.equal(cleanedChain(TAGS.map((t) => `${t}:`).join(';')), TAGS.map((t) => `${t}:`).join(';'));
    assert.equal(cleanedChain(['script', 'iframe', 'canvas', 'object', 'acme-widget', 'x'].map((t) => `${t}:`).join(';')), '');
    assert.deepEqual(cleanedList(TAGS.map((t) => ({ tag_name: t }))), TAGS.map((t) => ({ tag_name: t })));
  });

  it('keeps a label up to 80 characters long, and drops a longer one', () => {
    const fits = `related-${'a'.repeat(72)}`;
    assert.equal(fits.length, 80);
    assert.equal(cleanedChain(`a:attr__data-attr="${fits}"`), `a:attr__data-attr="${fits}"`);
    assert.equal(cleanedChain(`a:attr__data-attr="${fits}a"`), 'a:');
  });

  it('does not take a prefix on its own for a label', () => {
    const known = { exact: ['faq-open'], prefixes: ['faq'] };
    assert.equal(cleanedChain('a:attr__data-attr="faq"', known), 'a:');
    assert.equal(cleanedChain('a:attr__data-attr="faq2"', known), 'a:attr__data-attr="faq2"');
    assert.equal(cleanedChain('a:attr__data-attr="faq-open"', known), 'a:attr__data-attr="faq-open"');
    assert.equal(cleanedChain('a:attr__data-attr="my-faq2"', known), 'a:');
  });

  it('keeps a position from 1 to 999 and drops anything else, in a chain', () => {
    for (const good of ['1', '12', '250', '999']) {
      assert.equal(cleanedChain(`li:nth-child="${good}"nth-of-type="${good}"`), `li:nth-child="${good}"nth-of-type="${good}"`, good);
    }
    for (const bad of ['0', '000', '1000', '250000', '0x12', '1e2', '5 ', ' 5', '+5', '-5', '5.0', '2.5', '5px', 'x5', '']) {
      assert.equal(cleanedChain(`li:nth-child="${bad}"nth-of-type="${bad}"`), 'li:', JSON.stringify(bad));
    }
    assert.equal(cleanedChain('li:nth-child="4"nth-of-type="250000"'), 'li:nth-child="4"');
  });

  it('keeps a position from 1 to 999 and drops anything else, in a list', () => {
    for (const good of [1, 12, 999]) {
      assert.deepEqual(cleanedList([{ tag_name: 'li', nth_child: good, nth_of_type: good }]), [{ tag_name: 'li', nth_child: good, nth_of_type: good }], String(good));
    }
    for (const bad of [0, -3, 1000, 250000, 2.5, Number.NaN, Number.POSITIVE_INFINITY, '0x12', '5 ', '2.5', true, null, { valueOf: () => 7 }]) {
      assert.deepEqual(cleanedList([{ tag_name: 'li', nth_child: bad, nth_of_type: bad }]), [{ tag_name: 'li' }], String(bad));
    }
  });

  it('reads a value with quotes in it to its end, and keeps what follows', () => {
    const out = cleaned([
      { tag_name: 'button', attrs: { 'attr__aria-label': 'Remove "Acme" Bank', 'attr__data-attr': 'lc-vendor-remove' }, nth_child: 3, nth_of_type: 2 },
      { tag_name: 'div', attrs: { attr__title: 'say "hi"' }, nth_child: 1, nth_of_type: 1 },
    ]);
    assert.equal(out, 'button:attr__data-attr="lc-vendor-remove"nth-child="3"nth-of-type="2";div:nth-child="1"nth-of-type="1"');
  });

  it('does not take a label or a position with a quote in it for a known one', () => {
    const out = cleaned([{ tag_name: 'a', attrs: { 'attr__data-attr': 'lc-share"-copy', 'nth-child': '1"2' }, nth_of_type: 1 }]);
    assert.equal(out, 'a:nth-of-type="1"');
  });

  it('keeps no description at all when the chain cannot be read', () => {
    for (const broken of [
      'button:attr__data-attr="lc-share-copy', 'button attr="x"', 'button:k=x', ':"', 'div:a="1"b',
      'button', 'div.card', 'div.card;span:nth-child="1"', 'div:a"b="1"', 'div:a;b="1"', 'div:k=xv"', 'div:k""v"',
    ]) {
      const props: Props = { $elements_chain: broken };
      clean(props, labels);
      assert.equal(props.$elements_chain, '', broken);
    }
  });

  it('keeps no description when the chain is not text', () => {
    for (const odd of [null, undefined, 42, true, '', {}, ['button:']]) {
      assert.equal(cleanedChain(odd), '', String(odd));
    }
  });

  it('keeps no elements when the list is not a list', () => {
    for (const odd of [null, undefined, 'button', 42, { length: 1, 0: { tag_name: 'button', 'attr__aria-label': 'Remove Acme' } }]) {
      assert.deepEqual(cleanedList(odd), [], String(odd));
    }
  });

  it('skips a list entry it cannot name, and keeps only what the others have', () => {
    const list = [
      { tag_name: 'acme-widget', 'attr__data-attr': 'lc-share-copy', nth_child: 1 },
      null,
      {},
      { tag_name: 5 },
      { tag_name: 'BUTTON', 'attr__data-attr': 'acme-bank' },
      { tag_name: 'span', nth_child: 2 },
      { tag_name: 'p', nth_of_type: 3 },
    ];
    assert.deepEqual(cleanedList(list), [{ tag_name: 'button' }, { tag_name: 'span', nth_child: 2 }, { tag_name: 'p', nth_of_type: 3 }]);
  });

  it('rebuilds an $elements list the same way', () => {
    const props: Props = {
      $elements: [
        { tag_name: 'button', 'attr__data-attr': 'lc-share-copy', 'attr__aria-label': 'Copy Acme', classes: ['x'], attr__id: 'Acme', $el_text: 'Acme', nth_child: 2, nth_of_type: 1 },
        { tag_name: 'body', nth_child: 2, nth_of_type: 1 },
      ],
    };
    clean(props, labels);
    // The script runs in a context of its own, so compare as plain data.
    assert.deepEqual(JSON.parse(JSON.stringify(props.$elements)), [
      { tag_name: 'button', 'attr__data-attr': 'lc-share-copy', nth_child: 2, nth_of_type: 1 },
      { tag_name: 'body', nth_child: 2, nth_of_type: 1 },
    ]);
  });

  it('removes the other properties that describe a clicked element', () => {
    const props: Props = { $elements_chain: 'a:nth-child="1"', $el_text: 'Acme', $external_click_url: 'https://acme.example/?q=1', $element_selectors: ['#Acme'], $selected_content: 'Acme', $event_type: 'click' };
    clean(props, labels);
    assert.deepEqual(Object.keys(props).sort(), ['$elements_chain', '$event_type']);
  });

  it('removes those four properties and no other', () => {
    const event = watched({ $elements_chain: 'a:nth-child="1"', $el_text: 'Acme', $event_type: 'click' });
    clean(event.props, labels);
    assert.deepEqual(event.deleted.sort(), ['$el_text', '$element_selectors', '$external_click_url', '$selected_content']);
  });

  it('leaves the rest of an event without element data alone, and adds no element data to it', () => {
    const props: Props = { $current_url: 'https://nidhi.today/', count: 2 };
    clean(props, labels);
    assert.deepEqual(props, { $current_url: 'https://nidhi.today/', count: 2 });
    // The four text properties are dropped from every event, element data or not.
    const event = watched({ $current_url: 'https://nidhi.today/', count: 2 });
    clean(event.props, labels);
    assert.deepEqual(event.deleted.sort(), ['$el_text', '$element_selectors', '$external_click_url', '$selected_content']);
  });

  it('accepts a missing event, and touches nothing that is not an object', () => {
    assert.doesNotThrow(() => {
      clean(null as unknown as Props, labels);
      clean(undefined as unknown as Props, labels);
      clean('button:' as unknown as Props, labels);
    });
    const notAnEvent = Object.assign(() => {}, { $elements_chain: 'button.x:nth-child="1"' });
    clean(notAnEvent as unknown as Props, labels);
    assert.equal(notAnEvent.$elements_chain, 'button.x:nth-child="1"');
  });
});

describe('nidhiCleanElements: where it is defined', () => {
  it('on the window when there is one, as on the page', () => {
    const window: { nidhiCleanElements?: Clean } = {};
    const other: { nidhiCleanElements?: Clean } = {};
    runClassicScript(SOURCE, { window, globalThis: other });
    assert.equal(typeof window.nidhiCleanElements, 'function');
    assert.equal(other.nidhiCleanElements, undefined);
  });

  it('on the global object where there is no window', () => {
    const global: { nidhiCleanElements?: Clean } = {};
    runClassicScript(SOURCE, { globalThis: global });
    assert.equal(typeof global.nidhiCleanElements, 'function');
  });
});

describe('the label registry', () => {
  // From this file's own place, not the directory the runner starts in (#366).
  const scan = scanLabels(join(import.meta.dirname, '..', '..'));

  it('resolves every data-attr in the source', () => {
    assert.deepEqual(scan.unresolved, []);
  });

  it('knows the labels the notice and the dashboards rely on', { skip: readsSource }, () => {
    for (const label of ['volunteers-form', 'lc-share-copy', 'mcnw-csv-download', 'free-monte-carlo-share', 'waitlist-confirm-yes', 'post-inline-tool-loan-comparison']) {
      assert.ok(scan.exact.includes(label), label);
    }
    for (const prefix of ['related-', 'lc-tab-', 'nav-menu-']) assert.ok(scan.prefixes.includes(prefix), prefix);
  });

  it('holds only slugs', () => {
    for (const label of [...scan.exact, ...scan.prefixes.map((p) => p.replace(/-$/, ''))]) {
      assert.match(label, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });
});

describe('cleanElements: words an empty object would know', () => {
  it('keeps no tag named after an object property, in a chain or a list', () => {
    for (const word of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf']) {
      assert.equal(cleanedChain(`${word}:nth-child="1"`), '', word);
      assert.deepEqual(cleanedList([{ tag_name: word }]), [], word);
    }
  });
});

describe('cleanElements: text about a click, without element data', () => {
  it('is dropped from an event that carries no element data at all', () => {
    const props: Props = {
      $el_text: 'TYPED-12345', $external_click_url: 'https://example.com/#s=1',
      $element_selectors: ['#a'], $selected_content: 'TYPED', $current_url: 'https://nidhi.today/',
    };
    clean(props, labels);
    assert.deepEqual(props, { $current_url: 'https://nidhi.today/' });
  });
});
