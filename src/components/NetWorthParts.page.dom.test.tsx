/**
 * The net worth calculator as its page mounts it (#790): the form and its
 * rows, the spending currency, the exchange rates loading, failing and
 * arriving, the share dialog and the exports. Links, files, the example and
 * the reset are in NetWorthParts.page.share.dom.test.tsx.
 *
 * Throughout: the address is never written, a link carries state after the
 * `#` only, and analytics get choices and counts, never a typed name or
 * amount (CLAUDE.md, "Free Tools Keep Inputs Out of URLs").
 *
 * The page keeps no cache across mounts (every mount asks for its own
 * rates), so the tests below do not depend on their order.
 */
import {
  island, fill, events, eventNames, published, shared, copied, printed, downloads, requests, askedFor, ratesBody, turn, answer, answerHeadersOnly,
  failRequest, timeLimitPasses, frame, arriveWith, clipboard, page, mount, all, text, one, none, has, valueBox, spending, formRows, fillRow,
  chooseSpending, button, addButton, resetButton, shareButton, xlsxButton, pdfButton, csvDownload, removeButtons, exampleButton, ariaDisabled, total,
  banners, itemCount, fold, fileInput, upload, fileText, sentText, clock,
} from '../../test/netWorthParts.page.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fireEvent, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { CURRENCIES } from '../utils/shared/money.ts';
import { aggregate, type AssetRow } from '../utils/multi-currency-net-worth/math.ts';
import { decodeFromQueryString, encodeShared } from '../utils/multi-currency-net-worth/url.ts';

const ADDRESS = 'https://nidhi.today/free/';
const SHARE = `${ADDRESS}?utm_source=share&utm_medium=referral&utm_campaign=free_tools&utm_content=multi_currency_net_worth`;
const RATES = 'https://api.frankfurter.dev/v2/rates?base=';
/** Round rates: two dollars or half a pound to the euro. */
const EUR_RATES = ratesBody('EUR', { USD: 2, GBP: 0.5 });
const rowsOf = (...list: Array<[string, string, string, 'asset' | 'liability']>): AssetRow[] =>
  list.map(([name, value, currency, type]) => ({ name, value, currency, type }));
const tb = island.table;
const rb = island.results;
const reason = () => text('.mcnw-results .tool-resultReason');

describe('the net worth calculator on its page', () => {
  it('as the server sends it: one blank row in the page currency, held until the island runs, rates said to be loading', () => {
    const html = renderToString(page({ defaultCurrency: 'GBP' }));
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const root = doc.querySelector('.mcnw-root');
    assert.ok(root);
    assert.equal(root.hasAttribute('inert'), true);
    assert.equal(root.getAttribute('aria-busy'), 'true');
    assert.equal(doc.querySelectorAll('.mcnw-tableBody .mcnw-tableRow').length, 1);
    const [spend, rowCurrency] = [...doc.querySelectorAll('select')].map((s) => s.querySelector('option[selected]')?.getAttribute('value'));
    assert.deepEqual([spend, rowCurrency], ['GBP', 'GBP']);
    assert.deepEqual([...doc.querySelectorAll('.mcnw-banner')].map((b) => [b.className, b.textContent]), [['mcnw-banner mcnw-bannerInfo', island.rates.loading]]);
    assert.equal(doc.querySelector('.mcnw-csvFold')?.hasAttribute('open'), false);
    assert.ok(doc.querySelector('.mcnw-modalDialog') === null);
    assert.ok(doc.querySelector('.mcnw-csvConfirm') === null);
  });

  it('as the page loads: its parts, their names and analytics labels, one request for the rates, and nothing sent or kept', async () => {
    const before = window.history.length;
    // A catalog with no name of its own for one currency.
    const { INR: _none, ...named } = island.currencies;
    mount({ strings: { ...island, currencies: named as typeof island.currencies } });
    {
      // the tool can be used, and its toolbar names the spending currency
      const root = one('.mcnw-root');
      assert.equal(root.hasAttribute('inert'), false);
      assert.equal(root.hasAttribute('aria-busy'), false);
      const toolbar = one('.mcnw-tableSection > .mcnw-toolbar');
      assert.equal(toolbar.getAttribute('role'), 'toolbar');
      assert.equal(toolbar.getAttribute('aria-label'), island.toolbar.aria);
      const field = one('.mcnw-toolbar > .mcnw-funcCurrencyField');
      const label = field.querySelector('label');
      assert.equal(label?.className, 'mcnw-fieldLabel');
      assert.equal(label?.textContent, island.toolbar.currencyLabel);
      assert.equal(spending().className, 'mcnw-select');
      assert.equal(spending().value, 'EUR');
      assert.ok(spending().id.length > 1);
      assert.equal(field.querySelector('p')?.className, 'mcnw-fieldHelp');
      assert.equal(field.querySelector('p')?.textContent, island.toolbar.currencyHelp);
      const options = Object.fromEntries([...spending().options].map((o) => [o.value, o.textContent]));
      assert.equal(options.EUR, island.currencies.EUR);
      assert.equal(options.USD, island.currencies.USD);
      assert.equal(options.INR, CURRENCIES.find((c) => c.code === 'INR')?.label);
      assert.equal(Object.keys(options).length, Object.keys(island.currencies).length);
      const reset = resetButton();
      assert.equal(reset.parentElement?.className, 'mcnw-toolbarActions');
      assert.deepEqual([reset.type, reset.className, reset.title, reset.textContent], ['button', 'btn btn--quiet mcnw-resetBtn', island.toolbar.resetTitle, island.toolbar.reset]);
    }
    {
      // the table: its heading and count, named columns, and one blank row
      assert.equal(one('.mcnw-tableHeader > h2').className, 'mcnw-sectionTitle');
      assert.equal(one('.mcnw-tableHeader > h2').textContent, tb.heading);
      assert.equal(itemCount(), '0 items');
      const table = one('.mcnw-tableSection > .mcnw-table');
      assert.equal(table.getAttribute('role'), 'table');
      assert.equal(table.getAttribute('aria-label'), tb.aria);
      assert.deepEqual(all('.mcnw-table > div').map((el) => [el.className, el.getAttribute('role')]), [['mcnw-tableHead', 'rowgroup'], ['mcnw-tableBody', 'rowgroup']]);
      const head = one('.mcnw-tableHead > div');
      assert.deepEqual([head.className, head.getAttribute('role')], ['mcnw-tableRow mcnw-tableRowHead', 'row']);
      assert.deepEqual([...head.children].map((c) => [c.className, c.getAttribute('role'), c.textContent]), [
        ['mcnw-tableCell mcnw-cellName', 'columnheader', tb.colName],
        ['mcnw-tableCell mcnw-cellValue', 'columnheader', tb.colValue],
        ['mcnw-tableCell mcnw-cellCurrency', 'columnheader', tb.colCurrency],
        ['mcnw-tableCell mcnw-cellType', 'columnheader', tb.colType],
        ['mcnw-tableCell mcnw-cellActions', 'columnheader', tb.colActions],
      ]);
      assert.equal(one('.mcnw-cellActions[role="columnheader"] > span').className, 'mcnw-srOnly');
      assert.deepEqual(formRows(), [['', '', 'EUR', 'asset']]);
      assert.equal(removeButtons().length, 0);
    }
    {
      // adding a row, with its limit said in a status that is always there and empty for now
      const add = addButton();
      assert.equal(add.parentElement?.className, 'mcnw-tableFooter');
      assert.deepEqual([add.type, add.className, add.textContent], ['button', 'btn btn--outline mcnw-addBtn', tb.addAsset]);
      assert.equal(add.hasAttribute('aria-disabled'), false);
      assert.equal(add.hasAttribute('aria-describedby'), false);
      const limit = one('.mcnw-tableFooter > p');
      assert.deepEqual([limit.className, limit.getAttribute('role'), limit.textContent], ['mcnw-limit', 'status', '']);
      assert.ok(limit.id.length > 1);
    }
    {
      // the CSV actions, folded, with nothing to save yet
      assert.equal(fold().open, false);
      assert.equal(one('.mcnw-csvFold > summary').className, 'mcnw-csvFoldSummary disclosure');
      assert.equal(one('.mcnw-csvFold > summary').textContent, tb.csvFold);
      const uploadButton = button('mcnw-csv-upload');
      assert.equal(uploadButton.parentElement?.className, 'mcnw-csvFoldBody');
      assert.deepEqual([uploadButton.type, uploadButton.className, uploadButton.textContent], ['button', 'btn btn--outline mcnw-csvBtn', tb.uploadCsv]);
      const save = csvDownload();
      assert.deepEqual([save.type, save.className, save.title, save.textContent, save.disabled], ['button', 'btn btn--outline mcnw-downloadBtn', tb.downloadTitle, tb.downloadCsv, true]);
      const input = fileInput();
      assert.deepEqual([input.accept, input.className, input.getAttribute('aria-label'), input.tabIndex], ['.csv', 'mcnw-srOnly', tb.uploadCsvAria, -1]);
      // the upload button opens the file picker
      let picked = 0;
      input.addEventListener('click', (e) => { picked++; e.preventDefault(); });
      fireEvent.click(uploadButton);
      assert.equal(picked, 1);
    }
    {
      // nothing entered: the empty state offers the example, and the disclaimer is there
      assert.equal(one('.mcnw-emptyLead').textContent, rb.empty);
      assert.equal(exampleButton()?.textContent, island.example.show);
      assert.equal(one('.mcnw-root > p.mcnw-disclaimer').textContent, rb.disclaimer);
      none('.mcnw-exampleNote');
      none('.mcnw-csvErrors');
      none('.mcnw-csvConfirm');
      none('.mcnw-modalDialog');
    }
    {
      // the rates are asked for in the spending currency, once; meanwhile that is said
      assert.deepEqual(askedFor(), [`${RATES}EUR`]);
      assert.deepEqual(banners(), [['mcnw-banner mcnw-bannerInfo', 'status', island.rates.loading]]);
      await answer(EUR_RATES);
      assert.deepEqual(banners(), []);
    }
    {
      // the labels analytics may see, and no others
      assert.deepEqual(all('[data-attr]').map((el) => el.getAttribute('data-attr')), ['mcnw-reset', 'mcnw-asset-add', 'mcnw-csv-upload', 'mcnw-csv-download']);
    }
    {
      // an untouched page carries nothing to another language, sends nothing, and leaves the address alone
      assert.deepEqual(published, ['']);
      assert.deepEqual(events, []);
      assert.equal(window.location.href, ADDRESS);
      assert.equal(window.history.length, before);
    }
  });

  it('rows: added in the page currency, typed in one at a time, removed, counted, and never sent', async () => {
    mount();
    await answer(EUR_RATES);
    // The spending currency is not the page's: a new row still starts in the page's.
    chooseSpending('USD');
    await answer(ratesBody('USD', { EUR: 0.5, GBP: 0.25 }));
    fireEvent.click(addButton());
    assert.deepEqual(formRows(), [['', '', 'EUR', 'asset'], ['', '', 'EUR', 'asset']]);
    assert.equal(removeButtons().length, 2);
    fillRow(2, { name: 'Pension Zeta', value: '4321', currency: 'GBP', type: 'liability' });
    assert.deepEqual(formRows(), [['', '', 'EUR', 'asset'], ['Pension Zeta', '4321', 'GBP', 'liability']]);
    assert.equal(itemCount(), '1 item');
    fillRow(1, { value: '77' });
    assert.equal(itemCount(), '2 items');
    fireEvent.click(addButton());
    assert.equal(formRows().length, 3);
    fireEvent.click(removeButtons()[0]);
    assert.deepEqual(formRows(), [['Pension Zeta', '4321', 'GBP', 'liability'], ['', '', 'EUR', 'asset']]);
    fireEvent.click(removeButtons()[1]);
    assert.deepEqual(formRows(), [['Pension Zeta', '4321', 'GBP', 'liability']]);
    assert.equal(removeButtons().length, 0);
    assert.deepEqual(events, [
      ['free_multi_currency_net_worth_func_currency_changed', { currency: 'USD' }],
      ['free_multi_currency_net_worth_asset_added', { count: 2 }],
      ['free_multi_currency_net_worth_asset_added', { count: 3 }],
      ['free_multi_currency_net_worth_asset_removed', { count: 2 }],
      ['free_multi_currency_net_worth_asset_removed', { count: 1 }],
    ]);
    // What the language switch carries is the form, after the # only; the address never changes.
    assert.deepEqual(decodeFromQueryString(shared() as string).rows[0], rowsOf(['Pension Zeta', '4321', 'GBP', 'liability'])[0]);
    assert.equal(decodeFromQueryString(shared() as string).functionalCurrency, 'USD');
    assert.equal(window.location.href, ADDRESS);
    assert.ok(!sentText().includes('4321') && !sentText().includes('Pension'));
  });

  it('the total: other currencies converted at the rates that arrived, and only sound rates kept', async () => {
    mount();
    fillRow(1, { name: 'Flat', value: '1000' });
    fireEvent.click(addButton());
    fillRow(2, { value: '1000', currency: 'USD' });
    fireEvent.click(addButton());
    fillRow(3, { value: '200', currency: 'GBP', type: 'liability' });
    // Before the rates there is no total, and the loading notice stays.
    assert.equal(total(), null);
    assert.deepEqual(banners(), [['mcnw-banner mcnw-bannerInfo', 'status', island.rates.loading]]);
    await answer([
      ...EUR_RATES,
      { quote: 'JPY', rate: 0 },
      { quote: 'CHF', rate: -1 },
      { quote: 'CAD', rate: '1.5' },
      { quote: 7, rate: 1 },
      { rate: 3 },
      null,
      { quote: 'XYZ', rate: 4 },
    ]);
    // 1,000 EUR + 1,000 USD / 2 - 200 GBP / 0.5 = 1,000 + 500 - 400 = 1,100 EUR.
    assert.equal(total(), '€1,100.00');
    assert.deepEqual(banners(), []);
    // A currency whose rate was zero, negative or not a number has no rate.
    for (const code of ['JPY', 'CHF', 'CAD']) {
      fillRow(3, { currency: code });
      assert.equal(total(), '€1,500.00', code);
      assert.deepEqual(banners(), [['mcnw-banner mcnw-bannerWarn', 'status', island.rates.partial]], code);
    }
  });

  it('the spending currency: changed, its rates asked for afresh, and an answer for the old one ignored', async () => {
    mount();
    fillRow(1, { value: '1000' });
    fireEvent.click(addButton());
    fillRow(2, { value: '1000', currency: 'USD' });
    await answer(EUR_RATES);
    assert.equal(total(), '€1,500.00');
    {
      // the old rates' body arrives after the change: nothing of it is used, and the loading notice stays
      chooseSpending('GBP');
      const first = await answerHeadersOnly();
      chooseSpending('USD');
      await first(EUR_RATES);
      assert.equal(total(), null);
      assert.deepEqual(banners(), [['mcnw-banner mcnw-bannerInfo', 'status', island.rates.loading]]);
    }
    {
      // a request for a currency no longer chosen is given up, and its failure is not reported
      assert.equal(requests[1].signal.aborted, true);
      assert.equal(requests[2].signal.aborted, false);
      chooseSpending('EUR');
      assert.equal(requests[2].signal.aborted, true);
      assert.deepEqual(banners(), [['mcnw-banner mcnw-bannerInfo', 'status', island.rates.loading]]);
      await answer(EUR_RATES);
      assert.equal(total(), '€1,500.00');
    }
    assert.deepEqual(askedFor(), [`${RATES}EUR`, `${RATES}GBP`, `${RATES}USD`, `${RATES}EUR`]);
    assert.deepEqual(events, [
      ['free_multi_currency_net_worth_asset_added', { count: 2 }],
      ['free_multi_currency_net_worth_func_currency_changed', { currency: 'GBP' }],
      ['free_multi_currency_net_worth_func_currency_changed', { currency: 'USD' }],
      ['free_multi_currency_net_worth_func_currency_changed', { currency: 'EUR' }],
    ]);
  });

  it('rates that fail: said with a retry, reported by kind and never by message, and retried', async () => {
    mount();
    fillRow(1, { value: '1000' });
    fireEvent.click(addButton());
    fillRow(2, { value: '500', currency: 'USD' });
    const failure = () => ['mcnw-banner mcnw-bannerWarn', 'alert', `${island.rates.errorBefore} ${island.rates.retry}`];
    const retry = () => button('mcnw-rates-retry');
    await failRequest('offline');
    assert.deepEqual(banners()[0], failure());
    assert.deepEqual([retry().type, retry().className], ['button', 'btn btn--outline mcnw-retryBtn']);
    // Without rates the amounts are shown as they are, each in its own currency.
    assert.equal(total(), null);
    const tries: Array<[() => Promise<void>, string]> = [
      [() => answer(null, { status: 503 }), 'http_5xx'],
      [() => answer(null, { status: 404 }), 'http_4xx'],
      [() => answer(null, { status: 302 }), 'http_other'],
      [() => failRequest('garbled'), 'parse'],
      [() => answer({ rates: { USD: 2 } }), 'parse'],
      [() => timeLimitPasses(), 'network'],
    ];
    for (const [fail, reason] of tries) {
      fireEvent.click(retry());
      assert.equal(has('[data-attr="mcnw-rates-retry"]'), false, reason);
      assert.deepEqual(banners(), [['mcnw-banner mcnw-bannerInfo', 'status', island.rates.loading]], reason);
      await fail();
      assert.deepEqual(banners()[0], failure(), reason);
    }
    fireEvent.click(retry());
    await answer(EUR_RATES);
    assert.equal(total(), '€1,250.00');
    assert.deepEqual(banners(), []);
    const errors = events.filter(([name]) => name === 'free_multi_currency_net_worth_rates_error').map(([, p]) => p);
    assert.deepEqual(errors, ['network', 'http_5xx', 'http_4xx', 'http_other', 'parse', 'parse', 'network'].map((reason) => ({ functionalCurrency: 'EUR', reason })));
    assert.equal(eventNames().filter((n) => n === 'free_multi_currency_net_worth_rates_retry').length, 7);
    assert.equal(askedFor().length, 8);
    assert.ok(!sentText().includes('secret') && !sentText().includes('Unexpected'));
  });

  it('a page whose currency the tools do not know asks for nothing and says the rates are unavailable', async () => {
    mount({ defaultCurrency: 'ZZZ' });
    await turn();
    assert.deepEqual(askedFor(), []);
    assert.deepEqual(events, [['free_multi_currency_net_worth_rates_error', { functionalCurrency: 'ZZZ', reason: 'unknown_currency' }]]);
  });

  it('a currency with no rate: left out of the total, or with no rate at all, the amounts shown as they are', async () => {
    mount();
    fillRow(1, { value: '1000' });
    fireEvent.click(addButton());
    fillRow(2, { value: '300', currency: 'CHF' });
    await answer(EUR_RATES);
    // The only other currency has no rate: there is no total to be left out of.
    assert.deepEqual(banners(), [['mcnw-banner mcnw-bannerWarn', 'status', island.rates.errorBefore]]);
    assert.equal(one('.mcnw-root > .mcnw-banner').getAttribute('aria-live'), 'polite');
    fireEvent.click(addButton());
    fillRow(3, { value: '50', currency: 'USD' });
    // USD has a rate and CHF does not: CHF is left out of the total.
    assert.deepEqual(banners(), [['mcnw-banner mcnw-bannerWarn', 'status', island.rates.partial]]);
    assert.equal(total(), '€1,025.00');
    // Asked for again, the rates held say nothing until the answer: it may change them.
    chooseSpending('USD');
    chooseSpending('EUR');
    assert.deepEqual(banners(), [['mcnw-banner mcnw-bannerInfo', 'status', island.rates.loading]]);
    await answer(EUR_RATES, { index: requests.length - 1 });
    assert.deepEqual(banners(), [['mcnw-banner mcnw-bannerWarn', 'status', island.rates.partial]]);
    // Rates for another currency fail, then a second request for these fails too:
    // the rates already held still count, and so does what they leave out.
    chooseSpending('USD');
    await failRequest('offline');
    chooseSpending('EUR');
    await failRequest('offline');
    assert.deepEqual(banners(), [['mcnw-banner mcnw-bannerWarn', 'status', island.rates.partial]]);
    assert.equal(total(), '€1,025.00');
  });

  it('sharing: the dialog, a link copied with its state after the # only, the other kind of link, a refused copy, and only the kind sent', async () => {
    clipboard(true);
    mount();
    fillRow(1, { name: 'Home Alpha', value: '2000' });
    fireEvent.click(addButton());
    fillRow(2, { name: 'Brokerage Beta', value: '1000', currency: 'USD' });
    await answer(EUR_RATES);
    const open = shareButton();
    assert.deepEqual([open.type, open.className, open.title, open.textContent, open.disabled], ['button', 'btn btn--outline mcnw-shareBtn', island.toolbar.shareTitle, island.toolbar.share, false]);
    const copyButton = () => button('mcnw-share-copy');
    const copyLabel = () => one('[data-attr="mcnw-share-copy"] .tool-swapLabel > span:first-child').textContent;
    const notice = () => one('.mcnw-modalOptions > span[role="status"]').textContent;
    const bar = () => document.querySelector('.mcnw-shareUrlBar');
    const holdings = rowsOf(['Home Alpha', '2000', 'EUR', 'asset'], ['Brokerage Beta', '1000', 'USD', 'asset']);
    const positions = aggregate(holdings, 'EUR', { EUR: 1, USD: 2, GBP: 0.5 }).positions;
    {
      // a full link: the address of this page, the campaign in the query, the rows after the #
      fireEvent.click(open);
      assert.equal(has('.mcnw-modalDialog'), true);
      assert.ok(bar() === null);
      // A full link is what the dialog offers first.
      assert.equal((screen.getByRole('radio', { name: new RegExp(island.shareModal.fullName) }) as HTMLInputElement).checked, true);
      assert.equal(notice(), '');
      fireEvent.click(copyButton());
      await turn();
      const qs = encodeShared(holdings, positions, 'EUR', 'full');
      assert.deepEqual(copied, [`${SHARE}#${qs}`]);
      const [query, fragment] = copied[0].split('#');
      assert.ok(!query.includes('Alpha') && !query.includes('2000'));
      assert.equal(decodeFromQueryString(fragment).rows[0].name, 'Home Alpha');
      assert.equal(copyLabel(), island.shareModal.copied);
      assert.equal(bar()?.querySelector('.mcnw-shareUrlLabel')?.textContent, island.toolbar.copiedLabel);
      assert.equal((bar()?.querySelector('input') as HTMLInputElement).value, copied[0]);
      clock.pass(60);
      assert.equal(notice(), island.toolbar.copiedLabel);
      // a second copy starts the "Copied" over
      clock.pass(2000);
      fireEvent.click(copyButton());
      await turn();
      clock.pass(600);
      assert.equal(copyLabel(), island.shareModal.copied);
      clock.pass(1900);
      assert.equal(copyLabel(), island.shareModal.copy);
    }
    {
      // the other kind of link is another address: the copied one goes
      fireEvent.click(copyButton());
      await turn();
      assert.equal(copyLabel(), island.shareModal.copied);
      fireEvent.click(screen.getByRole('radio', { name: new RegExp(island.shareModal.redactedName) }));
      assert.equal(copyLabel(), island.shareModal.copy);
      assert.ok(bar() === null);
      assert.equal(notice(), '');
      fireEvent.click(copyButton());
      await turn();
      assert.equal(copied[3], `${SHARE}#${encodeShared(holdings, positions, 'EUR', 'redacted')}`);
      assert.ok(!copied[3].includes('Alpha') && !copied[3].includes('2000'));
    }
    {
      // closed and opened again: nothing of the last copy is left
      fireEvent.click(button('mcnw-share-cancel'));
      assert.equal(has('.mcnw-modalDialog'), false);
      fireEvent.click(open);
      clock.pass(60);
      assert.equal(notice(), '');
      assert.ok(bar() === null);
      assert.equal(copyLabel(), island.shareModal.copy);
    }
    {
      // a browser that will not copy: the address is shown to copy by hand
      clipboard(false);
      fireEvent.click(copyButton());
      await turn();
      assert.equal(bar()?.querySelector('.mcnw-shareUrlLabel')?.textContent, island.toolbar.copyPrompt);
      assert.equal(copyLabel(), island.shareModal.copy);
      clock.pass(60);
      assert.equal(notice(), island.toolbar.copyPrompt);
    }
    assert.deepEqual(events.filter(([name]) => name.includes('share')), [
      ['free_multi_currency_net_worth_share_modal_opened', undefined],
      ['free_multi_currency_net_worth_share_copied', { mode: 'full' }],
      ['free_multi_currency_net_worth_share_copied', { mode: 'full' }],
      ['free_multi_currency_net_worth_share_copied', { mode: 'full' }],
      ['free_multi_currency_net_worth_share_copied', { mode: 'redacted' }],
      ['free_multi_currency_net_worth_share_modal_opened', undefined],
    ]);
    assert.ok(!sentText().includes('Alpha') && !sentText().includes('2000'));
    assert.equal(window.location.href, ADDRESS);
  });

  it('sharing with a row that cannot be read: a redacted link is refused, and "Go to the row" closes the dialog onto it', async () => {
    clipboard(true);
    mount();
    // Nothing typed: nothing to share.
    assert.equal(has('[data-attr="mcnw-share-open"]'), false);
    fillRow(1, { value: '1000' });
    await answer(EUR_RATES);
    fireEvent.click(addButton());
    fillRow(2, { value: '7x' });
    fireEvent.click(shareButton());
    // A full link carries the row as it is: it can be copied.
    fireEvent.click(button('mcnw-share-copy'));
    await turn();
    assert.equal(copied.length, 1);
    assert.equal(decodeFromQueryString(copied[0].split('#')[1]).rows[1].value, 'NaN');
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(island.shareModal.redactedName) }));
    fireEvent.click(one('.mcnw-modalRefusal button'));
    assert.equal(has('.mcnw-modalDialog'), false);
    await frame();
    assert.ok(document.activeElement === valueBox(2));
    // The share button stays where it was: the reader can come back to it.
    assert.equal(shareButton().disabled, false);
    // Only rows that cannot be read: there are no results, but the link can still carry them.
    fireEvent.click(removeButtons()[0]);
    assert.deepEqual(reason(), [fill(tb.withheldOne, { count: 1 })]);
    assert.equal(shareButton().disabled, false);
  });

  it('nothing to share: amounts in other currencies with no rates at all', async () => {
    mount();
    fillRow(1, { value: '1000', currency: 'USD' });
    await failRequest('offline');
    assert.equal(shareButton().disabled, true);
    fireEvent.click(shareButton());
    assert.equal(has('.mcnw-modalDialog'), false);
  });

  it('exports: held while the rates load, then a spreadsheet of what is shown, a printed report, and the rows saved as a CSV to load again', async () => {
    mount();
    fillRow(1, { name: 'Home Alpha', value: '2000' });
    fireEvent.click(addButton());
    fillRow(2, { name: 'Brokerage Beta', value: '1000', currency: 'USD' });
    fireEvent.click(addButton());
    // Rates on the way: nothing to save or print yet.
    assert.deepEqual([xlsxButton(), pdfButton()].map(ariaDisabled), [true, true]);
    none('.tool-report');
    fireEvent.click(xlsxButton());
    assert.equal(downloads.length, 0);
    await answer(EUR_RATES);
    assert.deepEqual([xlsxButton(), pdfButton()].map(ariaDisabled), [false, false]);
    // The printed report holds the rows typed, and the rates used.
    assert.ok(one('.tool-report').textContent?.includes('Brokerage Beta'));
    assert.ok(one('.tool-report').textContent?.includes(island.export.ratePer.replace('{currency}', 'EUR')));
    {
      fireEvent.click(xlsxButton());
      assert.equal(downloads.length, 1);
      const today = new Date();
      const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      assert.equal(downloads[0].name, `nidhi-net-worth-${iso}.xlsx`);
      const sheet = await fileText(downloads[0].blob);
      for (const want of ['Home Alpha', 'Brokerage Beta', ADDRESS, iso, island.results.labelModerate, island.export.ratePer.replace('{currency}', 'EUR')]) {
        assert.ok(sheet.includes(want), want);
      }
    }
    {
      fireEvent.click(pdfButton());
      assert.equal(printed.length, 1);
    }
    {
      // the CSV holds the rows with an amount, in the tool's own spelling, and nothing else
      fireEvent.click(csvDownload());
      assert.equal(downloads[1].name, 'asset-details.csv');
      assert.equal(await fileText(downloads[1].blob), 'Name,Value,Currency,Type\nHome Alpha,2000,EUR,Asset\nBrokerage Beta,1000,USD,Asset');
    }
    assert.deepEqual(events.filter(([name]) => !name.endsWith('asset_added')), [
      ['free_multi_currency_net_worth_exported', { format: 'xlsx' }],
      ['free_multi_currency_net_worth_exported', { format: 'pdf' }],
      ['free_multi_currency_net_worth_csv_downloaded', { count: 2 }],
    ]);
    assert.ok(!sentText().includes('Alpha') && !sentText().includes('2000'));
  });

  it('exports of a shared view: its rows are not in the spreadsheet, and a redacted one holds no amounts', async () => {
    const holdings = rowsOf(['Home Alpha', '2000', 'EUR', 'asset'], ['Brokerage Beta', '1000', 'USD', 'asset']);
    const positions = aggregate(holdings, 'EUR', { EUR: 1, USD: 2 }).positions;
    for (const mode of ['full', 'redacted'] as const) {
      arriveWith(encodeShared(holdings, positions, 'EUR', mode));
      const { unmount } = mount();
      await answer(EUR_RATES);
      fireEvent.click(xlsxButton());
      const sheet = await fileText(downloads.at(-1)!.blob);
      assert.ok(!sheet.includes('Home Alpha'), mode);
      assert.ok(sheet.includes(island.results.labelModerate), mode);
      assert.equal(sheet.includes('2500'), mode === 'full', mode);
      assert.equal(sheet.includes(island.export.ratePer.replace('{currency}', 'EUR')), false, mode);
      const report = one('.tool-report').textContent ?? '';
      assert.ok(!report.includes('Home Alpha'), mode);
      assert.ok(!report.includes(island.export.ratePer.replace('{currency}', 'EUR')), mode);
      assert.equal(report.includes('2,500'), mode === 'full', mode);
      // Without amounts, both say what was left out.
      assert.equal(sheet.includes(island.export.hiddenText), mode === 'redacted', mode);
      unmount();
    }
  });

  it('which rate notices apply: none for amounts all in the spending currency, and none over results held back', async () => {
    mount();
    fillRow(1, { value: '1000' });
    // Everything in euros needs no rates: nothing is said to be loading.
    assert.deepEqual(banners(), []);
    fireEvent.click(addButton());
    fillRow(2, { value: '7x', currency: 'USD' });
    await failRequest('offline');
    // A row that cannot be read holds every result back: there are no raw amounts to warn about.
    assert.deepEqual(banners(), []);
    fillRow(2, { value: '50' });
    assert.deepEqual(banners()[0][2], `${island.rates.errorBefore} ${island.rates.retry}`);
    fireEvent.click(button('mcnw-rates-retry'));
    await answer(EUR_RATES);
    fireEvent.click(addButton());
    fillRow(3, { value: '5', currency: 'CHF' });
    assert.deepEqual(banners(), [['mcnw-banner mcnw-bannerWarn', 'status', island.rates.partial]]);
    fireEvent.click(addButton());
    fillRow(4, { value: '9z' });
    assert.deepEqual(banners(), []);
  });

  it('the total is said once typing settles; nothing typed, no failure kept back, and the example offered only to an empty form', async () => {
    mount();
    const said = () => one('.mcnw-root > span[aria-live="polite"]').textContent;
    await failRequest('offline');
    // A blank form whose rates failed says so: the example's other currency would need them.
    assert.deepEqual(banners()[0][2], `${island.rates.errorBefore} ${island.rates.retry}`);
    // Spaces are not a name.
    fillRow(1, { name: '  ' });
    assert.equal(exampleButton()?.textContent, island.example.show);
    fillRow(1, { name: 'Flat' });
    assert.ok(exampleButton() === null);
    fireEvent.click(addButton());
    assert.ok(exampleButton() === null);
    fillRow(1, { name: '' });
    assert.equal(exampleButton()?.textContent, island.example.show);
    // An amount of nothing adds nothing to show, but it is typed: the example would replace it.
    fillRow(1, { value: '0' });
    assert.equal(one('.mcnw-emptyLead').textContent, rb.empty);
    assert.ok(exampleButton() === null);
    assert.equal(said(), '');
    fillRow(1, { value: '1000' });
    clock.pass(600);
    assert.equal(said(), fill(rb.announce, { total: '€1,000.00' }));
  });
});
