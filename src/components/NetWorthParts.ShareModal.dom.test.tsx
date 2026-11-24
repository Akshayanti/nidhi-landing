/**
 * The net worth calculator's share dialog (`ShareModal`, #790): the two kinds
 * of link and what the recipient's preview shows for each (the redacted one
 * shows no amount and no name), why a redacted link is refused and the way
 * to the row to fix, the copy button and the copied address, what the dialog
 * says to a screen reader, and keyboard focus: where it starts, that it stays
 * inside, and where it goes back to.
 *
 * The rates are round: one euro buys 2 US dollars, 200 yen and 25 koruna.
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { StrictMode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { clock } from '../../test/windowClock.ts';
import { all, czech, draw, framed, island, laidOut, one, own, owe, worked, type Strings } from '../../test/netWorthParts.charts.tsx';
import type { AssetRow } from '../utils/multi-currency-net-worth/math.ts';
import { encodeShared, type ShareMode } from '../utils/multi-currency-net-worth/url.ts';
import type { Notice } from './toolShared.tsx';
import { ShareModal } from './MultiCurrencyNetWorth.tsx';

beforeEach(() => clock.install());
afterEach(() => clock.restore());

// 1,500 euros, 400 dollars (200 euros) and a car loan of 50,000 yen (250
// euros) are a net worth of 1,450 euros.
const ROWS: AssetRow[] = [
  own('1500', 'EUR', 'Flat deposit'),
  own('400', 'USD', 'Brokerage'),
  own('', 'EUR', 'Not filled in'),
  owe('50000', 'JPY', 'Car loan'),
  own('   ', 'CZK', ''),
];
const TYPED = ['Flat deposit', 'Brokerage', 'Car loan', '1500', '1,500', '400', '50000', '50,000', '1,450', '200', '250'];

interface Props {
  rows: AssetRow[];
  rates: Record<string, number> | null;
  shareMode: ShareMode;
  notice: Notice;
  copied: boolean;
  copyFailed: boolean;
  shareUrl: string;
  goToRow: boolean;
  onClose: () => void;
  strings: Strings;
  locale: string;
}

/** Opens the dialog; `update` gives it new props as the page would. */
function open(change: Partial<Props> = {}) {
  const calls = { modes: [] as ShareMode[], rows: [] as number[], copies: 0, closes: 0 };
  let props: Props = {
    rows: ROWS, rates: { EUR: 1, USD: 2, JPY: 200, CZK: 25 }, shareMode: 'full', notice: { text: '', n: 0 },
    copied: false, copyFailed: false, shareUrl: '', goToRow: true, onClose: () => { calls.closes++; },
    strings: island, locale: 'en', ...change,
  };
  const element = (p: Props) => (
    <ShareModal
      rows={p.rows}
      withheld={null}
      onGoToRow={p.goToRow ? (i) => { calls.rows.push(i); } : undefined}
      result={worked(p.rows, 'EUR', p.rates)}
      functionalCurrency="EUR"
      shareMode={p.shareMode}
      onChangeMode={(m) => { calls.modes.push(m); }}
      notice={p.notice}
      copied={p.copied}
      copyFailed={p.copyFailed}
      shareUrl={p.shareUrl}
      onCopy={() => { calls.copies++; }}
      onClose={p.onClose}
      strings={p.strings}
    />
  );
  const view = draw(element(props), props.locale);
  const update = (next: Partial<Props>) => {
    props = { ...props, ...next };
    view.rerender(framed(element(props), props.locale));
  };
  return { calls, view, update };
}

const dialog = () => screen.getByRole('dialog');
const radio = (value: string) => one(`input[type="radio"][value="${value}"]`) as HTMLInputElement;
const copyButton = () => one('.mcnw-modalCopyBtn');
const status = () => one('[role="status"]').textContent;
const urlBox = () => document.querySelector<HTMLInputElement>('.mcnw-shareUrlInput');
/** Presses a key where focus is (in the dialog); true when the dialog left it to the browser. */
const press = (key: string, shiftKey = false) => {
  const at = document.activeElement;
  return fireEvent.keyDown(at && dialog().contains(at) ? at : dialog(), { key, shiftKey });
};
/** The preview's chart legend, the dialog's last stops while the preview is shown. */
const legend = () => all('.mcnw-legendItem') as HTMLElement[];
/** As on a screen where the preview pane is hidden by a style. */
const previewHidden = (el: HTMLElement) => el.closest('.mcnw-modalPreview') !== null;
const focused = () => document.activeElement;
/** The errors the page reports while `run` runs. */
function caught(run: () => void) {
  const errors: string[] = [];
  const onError = (e: ErrorEvent) => { errors.push(e.message); e.preventDefault(); };
  window.addEventListener('error', onError);
  try {
    run();
  } finally {
    window.removeEventListener('error', onError);
  }
  return errors;
}

/** A link as the page writes one, the state after the `#`. */
const linkFor = (rows: AssetRow[], mode: ShareMode) =>
  `https://nidhi.today/free/multi-currency-net-worth/?utm_source=share&utm_medium=referral&utm_campaign=free_tools&utm_content=multi_currency_net_worth#${encodeShared(rows, worked(rows).positions, 'EUR', mode)}`;

describe('the share dialog', () => {
  it('is a modal dialog named by its title, offering the two kinds of link', () => {
    open();
    assert.equal(dialog().getAttribute('aria-modal'), 'true');
    assert.equal(document.getElementById(dialog().getAttribute('aria-labelledby') ?? '')?.textContent, 'Share your analysis');
    assert.equal(one('legend').textContent, 'Choose what to share:');
    assert.equal(radio('full').checked, true);
    assert.equal(radio('redacted').checked, false);
    assert.equal(radio('full').closest('label')?.textContent, 'Full versionAll asset details, values, and net worth');
    assert.equal(radio('redacted').closest('label')?.textContent, 'Redacted versionOnly currency split % and share bands. No amounts or names.');
  });

  it('passes each choice of link to the page', () => {
    const { calls, update } = open();
    fireEvent.click(radio('redacted'));
    update({ shareMode: 'redacted' });
    assert.equal(radio('redacted').checked, true);
    assert.equal(radio('full').checked, false);
    fireEvent.click(radio('full'));
    assert.deepEqual(calls.modes, ['redacted', 'full']);
  });

  it('the full preview counts the filled rows and lists each with its amount, currency and type', () => {
    open();
    assert.equal(one('.mcnw-modalPreviewTitle').textContent, 'Recipient preview3 items');
    assert.deepEqual(all('.mcnw-modalAssetTable th').map((th) => th.textContent), ['Name', 'Value', 'Currency', 'Type']);
    assert.deepEqual(all('.mcnw-modalAssetTable tbody tr').map((tr) => [...tr.children].map((td) => td.textContent)), [
      ['Flat deposit', '1500', 'EUR', 'Asset'],
      ['Brokerage', '400', 'USD', 'Asset'],
      ['Car loan', '50000', 'JPY', 'Liability'],
    ]);
    // The total the recipient sees: 1,500 + 200 - 250 euros.
    assert.ok(one('.mcnw-modalPreviewBody').textContent?.includes('€1,450'));
  });

  it('a row with no name is listed with a dash, and one row is one item', () => {
    open({ rows: [own('70', 'EUR')] });
    assert.equal(one('.mcnw-modalPreviewBadge').textContent, '1 item');
    assert.deepEqual(all('.mcnw-modalAssetTable tbody td').map((td) => td.textContent), ['-', '70', 'EUR', 'Asset']);
    assert.ok(one('.mcnw-modalAssetTable tbody em').textContent === '-');
  });

  it('counts rows in each of a language’s plural forms (Czech: one, few, many)', () => {
    const cases: Array<[AssetRow[], string]> = [
      [[own('1')], '1 položka'],
      [[own('1'), own('2'), own('3')], '3 položky'],
      [[own('1'), own('2'), own('3'), own('4'), own('5')], '5 položek'],
    ];
    for (const [rows, said] of cases) {
      const { view } = open({ rows, strings: czech, locale: 'cs' });
      assert.equal(one('.mcnw-modalPreviewBadge').textContent, said);
      view.unmount();
    }
  });

  it('with nothing filled in, the full preview lists no rows', () => {
    open({ rows: [own(''), own(' ', 'USD')] });
    assert.equal(one('.mcnw-modalPreviewBadge').textContent, '0 items');
    assert.ok(document.querySelector('.mcnw-modalAssetTable') === null);
  });

  it('the redacted preview shows no amount and no name anywhere, only the shares', () => {
    open({ shareMode: 'redacted' });
    assert.ok(document.querySelector('.mcnw-modalAssetTable') === null);
    assert.ok(document.querySelector('.mcnw-modalPreviewBadge') === null);
    const preview = one('.mcnw-modalPreview').textContent ?? '';
    for (const typed of TYPED) assert.ok(!preview.includes(typed), `the redacted preview shows ${typed}`);
    assert.ok(!preview.includes('€'), 'the redacted preview shows an amount in euros');
    // The shares are there: 1,500 of 1,450 euros is 103.4%.
    assert.equal(all('.mcnw-riskCurrency')[0].textContent, 'Euro (EUR) · 103.4% of net worth');
    assert.equal(one('.mcnw-modalPreviewTitle').textContent, 'Recipient preview');
  });

  it('the full preview shows each currency’s share and amount', () => {
    open();
    assert.equal(all('.mcnw-riskCurrency')[0].textContent, 'Euro (EUR) · 103.4% of net worth · €1,500.00');
  });

  it('the preview says which currency has no rate, as the recipient will see it, not as still loading', () => {
    open({ rates: { EUR: 1, USD: 2 } });
    const yen = all('.mcnw-riskCurrency').find((c) => c.textContent?.startsWith('Japanese Yen'));
    assert.ok(yen?.textContent?.includes('Rate unavailable'), yen?.textContent ?? 'no yen card');
  });

  it('the preview follows the rows and the kind of link as they change', () => {
    const { update } = open();
    assert.equal(all('.mcnw-riskCurrency')[0].textContent, 'Euro (EUR) · 103.4% of net worth · €1,500.00');
    // 1,450 euros and 400 dollars (200 euros) less 250 euros: 1,400 of 1,400.
    update({ rows: [own('1450', 'EUR', 'Flat deposit'), own('400', 'USD', 'Brokerage'), owe('50000', 'JPY', 'Car loan')] });
    assert.equal(all('.mcnw-riskCurrency')[0].textContent, 'Euro (EUR) · 103.6% of net worth · €1,450.00');
    update({ shareMode: 'redacted' });
    assert.equal(all('.mcnw-riskCurrency')[0].textContent, 'Euro (EUR) · 103.6% of net worth');
  });

  it('the redacted preview of a net worth of zero or less shows the concentration, as the link carries it', () => {
    // 100 euros held, 300 dollars (150 euros) owed: net worth is -50 euros.
    // Concentration: 100 of 250 is 40%, 150 of 250 is 60%.
    open({ rows: [own('100', 'EUR', 'Cash'), owe('300', 'USD', 'Card')], shareMode: 'redacted' });
    const preview = one('.mcnw-modalPreview').textContent ?? '';
    assert.ok(preview.includes('40.0%') && preview.includes('60.0%'), preview);
    for (const typed of ['Cash', 'Card', '100', '300', '150']) assert.ok(!preview.includes(typed), `shows ${typed}`);
  });

  it('puts no typed name or amount in any attribute, whichever link is chosen', () => {
    for (const shareMode of ['full', 'redacted'] as const) {
      const { view } = open({ shareMode });
      for (const el of all('*')) {
        for (const { name, value } of [...el.attributes]) {
          for (const typed of TYPED.slice(0, 3)) assert.ok(!value.includes(typed), `${shareMode}: ${name} holds ${typed}`);
        }
      }
      view.unmount();
    }
  });

  it('shows the copied link whole, with the reader’s state after the #, and selects it when it gets focus', () => {
    const link = linkFor(ROWS, 'redacted');
    open({ shareMode: 'redacted', shareUrl: link, copied: true });
    const box = urlBox();
    assert.ok(box !== null);
    assert.equal(box.value, link);
    assert.equal(box.readOnly, true);
    assert.equal(box.getAttribute('aria-label'), 'Shareable link URL');
    assert.equal(one('.mcnw-shareUrlLabel').textContent, 'Link copied to clipboard');
    const address = new URL(box.value);
    assert.deepEqual([...address.searchParams.keys()], ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']);
    assert.ok(address.hash.length > 1);
    box.scrollLeft = 40;
    box.setSelectionRange(0, 0);
    fireEvent.focus(box);
    assert.equal([box.selectionStart, box.selectionEnd].join(), `0,${link.length}`);
    assert.equal(box.scrollLeft, 0);
  });

  it('before a copy there is no link to show', () => {
    open();
    assert.ok(urlBox() === null);
    assert.ok(document.querySelector('.mcnw-shareUrlBar') === null);
  });

  it('copies on the button, which says when it has', () => {
    const { calls, update } = open();
    fireEvent.click(copyButton());
    assert.equal(calls.copies, 1);
    assert.equal(copyButton().getAttribute('aria-disabled'), null);
    assert.equal(copyButton().getAttribute('aria-describedby'), null);
    assert.equal(copyButton().querySelector('[aria-hidden="true"]')?.textContent, 'Copied!');
    update({ copied: true });
    assert.equal(copyButton().querySelector('span span')?.textContent, 'Copied!');
  });

  it('a refused copy leaves the address to copy by hand, and focus goes to it, again on each refusal', () => {
    laidOut();
    const link = linkFor(ROWS, 'full');
    const { update } = open();
    assert.ok(focused() === radio('full'));
    update({ shareUrl: link, copyFailed: true, notice: { text: island.toolbar.copyPrompt, n: 1 } });
    assert.equal(one('.mcnw-shareUrlLabel').textContent, 'Copy this link:');
    assert.ok(focused() === urlBox());
    radio('full').focus();
    update({ notice: { text: island.toolbar.copyPrompt, n: 2 } });
    assert.ok(focused() === urlBox());
    // A copy that worked leaves focus where it is.
    radio('full').focus();
    update({ copyFailed: false, notice: { text: island.toolbar.copiedLabel, n: 3 } });
    assert.ok(focused() === radio('full'));
  });

  it('a refused copy with no address yet moves focus nowhere', () => {
    laidOut();
    const { update } = open();
    update({ copyFailed: true, notice: { text: island.toolbar.copyPrompt, n: 1 } });
    assert.ok(focused() === radio('full'));
  });

  it('says each copy through its one status region, after a moment', () => {
    const { update } = open();
    assert.equal(status(), '');
    update({ copied: true, notice: { text: 'Link copied to clipboard', n: 1 } });
    clock.pass(60);
    assert.equal(status(), 'Link copied to clipboard');
  });

  it('refuses a redacted link while an amount cannot be read, says why, and goes to the row', () => {
    const rows = [own('1500', 'EUR', 'Flat deposit'), own('12k', 'USD', 'Brokerage'), owe('5O0', 'JPY', 'Car loan')];
    const { calls } = open({ rows, shareMode: 'redacted' });
    const why = 'Cannot create a redacted link: 2 rows have amounts that could not be read.';
    assert.equal(one('.mcnw-modalRefusal p').textContent, why);
    const refusalId = one('.mcnw-modalRefusal p').id;
    assert.equal(copyButton().getAttribute('aria-disabled'), 'true');
    assert.equal(copyButton().getAttribute('aria-describedby'), refusalId);
    fireEvent.click(copyButton());
    assert.equal(calls.copies, 0);
    const go = screen.getByRole('button', { name: 'Go to the row' });
    assert.equal(go.getAttribute('aria-describedby'), refusalId);
    fireEvent.click(go);
    assert.deepEqual(calls.rows, [1]);
    clock.pass(60);
    assert.equal(status(), why);
  });

  it('one unreadable row is said in the singular', () => {
    open({ rows: [own('1500'), own('abc', 'USD')], shareMode: 'redacted' });
    assert.equal(one('.mcnw-modalRefusal p').textContent, 'Cannot create a redacted link: 1 row has an amount that could not be read.');
  });

  it('a refusal is said in each of a language’s plural forms (Czech: one, few, many)', () => {
    const bad = (n: number) => Array.from({ length: n }, () => own('x'));
    const cases: Array<[number, string]> = [[1, czech.shareModal.refusedRowsOne], [3, czech.shareModal.refusedRowsFew], [5, czech.shareModal.refusedRowsMany]];
    for (const [count, template] of cases) {
      const { view } = open({ rows: bad(count), shareMode: 'redacted', strings: czech, locale: 'cs' });
      assert.equal(one('.mcnw-modalRefusal p').textContent, template.replace('{count}', String(count)));
      view.unmount();
    }
  });

  it('refuses a redacted link while an exchange rate is missing, and goes to the first row in that currency', () => {
    const rows = [own('1500', 'EUR'), own('', 'JPY'), own('3000', 'JPY'), own('400', 'USD')];
    const { calls } = open({ rows, rates: { EUR: 1, USD: 2 }, shareMode: 'redacted' });
    const why = 'Cannot create a redacted link: a current exchange rate is missing for at least one currency.';
    assert.equal(one('.mcnw-modalRefusal p').textContent, why);
    fireEvent.click(screen.getByRole('button', { name: 'Go to the row' }));
    assert.deepEqual(calls.rows, [2]);
    clock.pass(60);
    assert.equal(status(), why);
  });

  it('says a change in the reason for a refusal, and nothing once the full link is chosen', () => {
    const { update } = open({ rows: [own('1500'), own('x', 'USD')], shareMode: 'redacted' });
    clock.pass(60);
    assert.equal(status(), 'Cannot create a redacted link: 1 row has an amount that could not be read.');
    update({ rows: [own('1500'), own('400', 'USD')], rates: { EUR: 1 } });
    clock.pass(60);
    assert.equal(status(), 'Cannot create a redacted link: a current exchange rate is missing for at least one currency.');
    update({ shareMode: 'full' });
    clock.pass(60);
    assert.equal(status(), '');
    assert.ok(document.querySelector('.mcnw-modalRefusal') === null);
  });

  it('says a refusal that follows a copy, whatever the copy’s count', () => {
    // A copy said as notice 1, then a missing rate refuses the redacted link.
    const rates = { update: open({ notice: { text: 'Link copied to clipboard', n: 1 }, rates: { EUR: 1, USD: 2 } }).update };
    clock.pass(60);
    assert.equal(status(), 'Link copied to clipboard');
    rates.update({ shareMode: 'redacted' });
    clock.pass(60);
    assert.equal(status(), 'Cannot create a redacted link: a current exchange rate is missing for at least one currency.');
  });

  it('says a refusal for an unreadable amount after a second copy too', () => {
    const { update } = open({ rows: [own('1500'), own('x', 'USD')], notice: { text: 'Link copied to clipboard', n: 2 } });
    clock.pass(60);
    assert.equal(status(), 'Link copied to clipboard');
    update({ shareMode: 'redacted' });
    clock.pass(60);
    assert.equal(status(), 'Cannot create a redacted link: 1 row has an amount that could not be read.');
  });

  it('never refuses the full link, and offers no way to a row when the page gives none', () => {
    const { calls, update } = open({ rows: [own('x')], shareMode: 'full' });
    assert.ok(document.querySelector('.mcnw-modalRefusal') === null);
    fireEvent.click(copyButton());
    assert.equal(calls.copies, 1);
    update({ shareMode: 'redacted', goToRow: false });
    assert.ok(document.querySelector('.mcnw-modalRefusal p') !== null);
    assert.ok(screen.queryByRole('button', { name: 'Go to the row' }) === null);
  });

  it('closes on Cancel, on Escape and on a click outside it, never on a click inside', () => {
    laidOut();
    const { calls } = open();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    assert.equal(calls.closes, 1);
    press('Escape');
    assert.equal(calls.closes, 2);
    fireEvent.click(dialog());
    fireEvent.click(one('.mcnw-modalTitle'));
    assert.equal(calls.closes, 2);
    fireEvent.click(one('.mcnw-modalOverlay'));
    assert.equal(calls.closes, 3);
  });

  it('Escape closes with what the page asks for now, after it has changed', () => {
    const later = { closes: 0 };
    const { calls, update } = open();
    update({ onClose: () => { later.closes++; } });
    press('Escape');
    assert.deepEqual([calls.closes, later.closes], [0, 1]);
  });

  it('Escape closes it once, also where React mounts it twice to check it (Strict Mode)', () => {
    let closes = 0;
    const rows = [own('10')];
    render(
      <StrictMode>
        {framed(<ShareModal rows={rows} withheld={null} result={worked(rows)} functionalCurrency="EUR" shareMode="full" onChangeMode={() => {}}
          notice={{ text: '', n: 0 }} copied={false} copyFailed={false} shareUrl="" onCopy={() => {}} onClose={() => { closes++; }} strings={island} />)}
      </StrictMode>,
    );
    press('Escape');
    assert.equal(closes, 1);
  });

  it('Tab when nothing has focus brings focus into the dialog', () => {
    laidOut(previewHidden);
    open();
    Object.defineProperty(document, 'activeElement', { configurable: true, get: () => null });
    const errors = caught(() => {
      try {
        assert.equal(fireEvent.keyDown(dialog(), { key: 'Tab' }), false);
        assert.equal(fireEvent.keyDown(dialog(), { key: 'Tab', shiftKey: true }), false);
      } finally {
        delete (document as unknown as Record<string, unknown>).activeElement;
      }
    });
    assert.deepEqual(errors, []);
    assert.ok(focused() === copyButton());
  });

  it('Tab before anything in the dialog is laid out does nothing, and breaks nothing', () => {
    open();
    const errors = caught(() => {
      fireEvent.keyDown(dialog(), { key: 'Tab' });
      fireEvent.keyDown(dialog(), { key: 'Tab', shiftKey: true });
    });
    assert.deepEqual(errors, []);
  });

  it('starts focus on the chosen kind of link, and other keys are left to the browser', () => {
    laidOut();
    open();
    assert.ok(focused() === radio('full'));
    assert.equal(press('Enter'), true);
    assert.equal(press('ArrowDown', true), true);
  });

  it('keeps Tab inside the dialog, a radio group being one stop entered at its checked option', () => {
    laidOut(previewHidden);
    const { update } = open({ shareMode: 'redacted', shareUrl: linkFor(ROWS, 'redacted') });
    // Opened on the first stop, the first option.
    assert.ok(focused() === radio('full'));
    // From the copied address, the last stop, Tab goes round to the checked option.
    urlBox()?.focus();
    assert.equal(press('Tab'), false);
    assert.ok(focused() === radio('redacted'));
    // From either option, Shift+Tab goes round to the last stop.
    assert.equal(press('Tab', true), false);
    assert.ok(focused() === urlBox());
    radio('full').focus();
    assert.equal(press('Tab', true), false);
    assert.ok(focused() === urlBox());
    // In between, Tab and Shift+Tab are the browser's own.
    copyButton().focus();
    assert.equal(press('Tab', true), true);
    assert.equal(press('Tab'), true);
    radio('redacted').focus();
    assert.equal(press('Tab'), true);
    // The address is the last stop only once it is there: before, the copy button is.
    update({ shareUrl: '' });
    copyButton().focus();
    assert.equal(press('Tab'), false);
    assert.ok(focused() === radio('redacted'));
    assert.equal(press('Tab', true), false);
    assert.ok(focused() === copyButton());
  });

  it('with the preview shown, its last legend entry is the last stop', () => {
    laidOut();
    open({ shareUrl: linkFor(ROWS, 'full') });
    const last = legend()[legend().length - 1];
    assert.equal(legend().length, 3);
    urlBox()?.focus();
    assert.equal(press('Tab'), true);
    last.focus();
    assert.equal(press('Tab'), false);
    assert.ok(focused() === radio('full'));
    assert.equal(press('Tab', true), false);
    assert.ok(focused() === last);
  });

  it('brings focus back inside when it has left the dialog', () => {
    laidOut(previewHidden);
    const outside = document.createElement('button');
    document.body.append(outside);
    open({ shareMode: 'redacted' });
    outside.focus();
    assert.equal(fireEvent.keyDown(dialog(), { key: 'Tab' }), false);
    assert.ok(focused() === radio('redacted'));
    outside.focus();
    assert.equal(fireEvent.keyDown(dialog(), { key: 'Tab', shiftKey: true }), false);
    assert.ok(focused() === copyButton());
    outside.remove();
  });

  it('leaves out of the round what is not shown', () => {
    // The copied address hidden as well as the preview.
    laidOut((el) => previewHidden(el) || el.classList.contains('mcnw-shareUrlInput'));
    open({ shareUrl: linkFor(ROWS, 'full') });
    copyButton().focus();
    assert.equal(press('Tab'), false);
    assert.ok(focused() === radio('full'));
  });

  it('gives focus back to what had it when the dialog closes', () => {
    const before = document.createElement('button');
    document.body.append(before);
    before.focus();
    laidOut();
    const { view } = open();
    assert.ok(focused() === radio('full'));
    view.unmount();
    assert.ok(focused() === before);
    before.remove();
  });

  it('closes cleanly when nothing had focus as it opened', () => {
    Object.defineProperty(document, 'activeElement', { configurable: true, get: () => null });
    let view;
    try {
      view = open().view;
    } finally {
      delete (document as unknown as Record<string, unknown>).activeElement;
    }
    const errors: unknown[] = [];
    const onError = (e: ErrorEvent) => { errors.push(e.message); e.preventDefault(); };
    window.addEventListener('error', onError);
    try {
      view.unmount();
    } catch (e) {
      errors.push(String(e));
    } finally {
      window.removeEventListener('error', onError);
    }
    assert.deepEqual(errors, []);
  });
});
