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
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { join } from 'node:path';

import { scanLabels } from '../analyticsLabels.ts';

type Props = Record<string, unknown>;
const context: { nidhiCleanElements?: (props: Props, labels: { exact: string[]; prefixes: string[] }) => void } = {};
runInNewContext(readFileSync(new URL('./cleanElements.js', import.meta.url), 'utf8'), { window: context });
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

  it('keeps no description at all when the chain cannot be read', () => {
    for (const broken of ['button:attr__data-attr="lc-share-copy', 'button attr="x"', 'button:k=x', ':"', 'div:a="1"b']) {
      const props: Props = { $elements_chain: broken };
      clean(props, labels);
      assert.equal(props.$elements_chain, '', broken);
    }
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

  it('leaves events without element data alone', () => {
    const props: Props = { $current_url: 'https://nidhi.today/', count: 2 };
    clean(props, labels);
    assert.deepEqual(props, { $current_url: 'https://nidhi.today/', count: 2 });
  });
});

describe('the label registry', () => {
  const scan = scanLabels(join(process.cwd(), 'src'));

  it('resolves every data-attr in the source', () => {
    assert.deepEqual(scan.unresolved, []);
  });

  it('knows the labels the notice and the dashboards rely on', () => {
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
