/**
 * The net worth calculator as its page mounts it, continued (#790): a shared
 * link or a switched list arriving through the window property the page head
 * fills (never the address), rows that cannot be read, the CSV import and its
 * confirmation, the example, the reset, the share dialog and the exports.
 * The form, the rows and the exchange rates are in NetWorthParts.page.dom.test.tsx,
 * and a list of five hundred rows in NetWorthParts.page.share.rows.dom.test.tsx.
 *
 * Throughout: the address is never written, a link carries state after the
 * `#` only, and analytics get choices and counts, never a typed name or
 * amount (CLAUDE.md, "Free Tools Keep Inputs Out of URLs").
 *
 * The page keeps no cache across mounts (every mount asks for its own
 * rates), so the tests below do not depend on their order.
 */
import {
  island, fill, events, eventNames, published, shared, askedFor, ratesBody, turn, answer, failRequest, frame, arriveWith, cameFrom, mount, all, text,
  one, none, has, nameBox, valueBox, formRows, fillRow, chooseSpending, button, addButton, resetButton, shareButton, xlsxButton, pdfButton,
  csvDownload, removeButtons, exampleButton, clearExampleButton, ariaDisabled, total, banners, itemCount, csvAlerts, fold, fileInput, upload,
  sentText, clock,
} from '../../test/netWorthParts.page.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fireEvent, screen } from '@testing-library/react';
import { multiCurrencyNetWorthEs } from '../i18n/strings/tools/multiCurrencyNetWorth.ts';
import { aggregate, type AssetRow } from '../utils/multi-currency-net-worth/math.ts';
import { decodeFromQueryString, encodeShared } from '../utils/multi-currency-net-worth/url.ts';

// This tool's own strings, from the modules that define them: not the whole catalog,
// which would tie this file to every tool's strings (#904).
const TOOL_STRINGS = {
  es: { multiCurrencyNetWorth: multiCurrencyNetWorthEs },
};

const ADDRESS = 'https://nidhi.today/free/';
const SHARE = `${ADDRESS}?utm_source=share&utm_medium=referral&utm_campaign=free_tools&utm_content=multi_currency_net_worth#`;
const RATES = 'https://api.frankfurter.dev/v2/rates?base=';
const EUR_RATES = ratesBody('EUR', { USD: 2, GBP: 0.5 });
const rowsOf = (...list: Array<[string, string, string, 'asset' | 'liability']>): AssetRow[] =>
  list.map(([name, value, currency, type]) => ({ name, value, currency, type }));
const tb = island.table;

/** Two holdings: 2,000 EUR and 1,000 USD, which at two dollars to the euro is 500 EUR: 2,500 EUR in all, 80% and 20%. */
const HOLDINGS = rowsOf(['Home Alpha', '2000', 'EUR', 'asset'], ['Brokerage Beta', '1000', 'USD', 'asset']);
const link = (mode: 'full' | 'redacted', rows = HOLDINGS) => encodeShared(rows, aggregate(rows, 'EUR', { EUR: 1, USD: 2 }).positions, 'EUR', mode);
const readOnly = ['mcnw-banner mcnw-bannerInfo', null, island.shared.readOnly];
const readOnlyLeft = ['mcnw-banner mcnw-bannerInfo mcnw-banner--left', null, island.shared.readOnly];
const reason = () => text('.mcnw-results .tool-resultReason');
const opened = () => events.filter(([name]) => name === 'free_multi_currency_net_worth_shared_view_opened').map(([, p]) => p);
const csvLines = (n: number, from = 1) => Array.from({ length: n }, (_, i) => `Item ${from + i},${10 + i},EUR,Asset`).join('\n');

describe('the net worth calculator on its page: links, files, sharing and exports', () => {
  it('a full shared link: read only, its sender\'s total, counted once with its source, and the reader\'s own from the first edit', async () => {
    window.history.replaceState(null, '', '/free/?utm_source=share&utm_medium=referral');
    const address = window.location.href;
    arriveWith(link('full'));
    mount();
    assert.deepEqual(banners(), [readOnly, ['mcnw-banner mcnw-bannerInfo', 'status', island.rates.loading]]);
    assert.deepEqual(formRows(), [['Home Alpha', '2000', 'EUR', 'asset'], ['Brokerage Beta', '1000', 'USD', 'asset']]);
    // The sender's total, before any rate of this page's arrives.
    assert.equal(total(), '€2,500.00');
    assert.deepEqual(askedFor(), [`${RATES}EUR`]);
    await failRequest('offline');
    // This page's own request does not matter to a view of someone else's rates.
    assert.deepEqual(banners(), [readOnly]);
    assert.deepEqual(opened(), [{ mode: 'full', positions: 2, utm_source: 'share' }]);
    // A shared view keeps the link's own state for a language switch: nothing is written.
    assert.deepEqual(published, []);
    assert.equal(shared(), link('full'));
    // Sharing is the sender's to do again from the form, not from a view of it with no amounts (below).
    assert.equal(shareButton().disabled, false);
    // Saving the rows as a file is for the reader's own rows.
    assert.equal(csvDownload().disabled, true);
    // The first edit makes it the reader's own form: the banner leaves, its space stays.
    fillRow(1, { name: 'Home Alpha 2' });
    assert.deepEqual(banners()[0], readOnlyLeft);
    assert.equal(csvDownload().disabled, false);
    assert.equal(decodeFromQueryString(String(published.at(-1))).isReadOnly, false);
    assert.equal(decodeFromQueryString(String(published.at(-1))).rows[0].name, 'Home Alpha 2');
    assert.equal(window.location.href, address);
    assert.ok(!sentText().includes('Alpha') && !sentText().includes('2000'));
  });

  it('a redacted shared link: shares without amounts, kept by edits that change nothing shared, left at a typed amount', async () => {
    arriveWith(link('redacted'));
    mount();
    await answer(EUR_RATES);
    assert.deepEqual(banners(), [readOnly]);
    assert.equal(one('.mcnw-results .mcnw-totalValue').textContent, island.results.hidden);
    assert.deepEqual(opened(), [{ mode: 'redacted', positions: 2, utm_source: null }]);
    // No amounts of its own to share.
    assert.equal(shareButton().disabled, true);
    // Blank rows given a currency or a type, added or removed, change nothing that was shared.
    fillRow(1, { currency: 'USD', type: 'liability' });
    fireEvent.click(addButton());
    fireEvent.click(removeButtons()[2]);
    assert.deepEqual(banners(), [readOnly]);
    assert.deepEqual(published, []);
    fillRow(1, { value: '10' });
    assert.deepEqual(banners(), [readOnlyLeft]);
    // 10 USD owed, at two to the euro.
    assert.equal(total(), '\u2212€5.00');
  });

  it('a shared link with a rate missing says so at once; one all in one currency has no owned and owed of its own', async () => {
    const withGap = rowsOf(['', '2000', 'EUR', 'asset'], ['', '1000', 'USD', 'asset'], ['', '300', 'CHF', 'asset']);
    arriveWith(link('full', withGap));
    const first = mount();
    // The sender's rates, not this page's request, decide it.
    assert.deepEqual(banners(), [readOnly, ['mcnw-banner mcnw-bannerInfo', 'status', island.rates.loading], ['mcnw-banner mcnw-bannerWarn', 'status', island.rates.partial]]);
    first.unmount();
    arriveWith(link('full', rowsOf(['', '2000', 'EUR', 'asset'])));
    mount();
    assert.equal(total(), '€2,000.00');
    none('.mcnw-split');
  });

  it('a shared view with a row that cannot be read: a redacted link is refused, with no row of the reader\'s to go to', () => {
    const unreadable = rowsOf(['', 'NaN', 'EUR', 'asset'], ...HOLDINGS.map((r) => [r.name, r.value, r.currency, r.type] as [string, string, string, 'asset']));
    arriveWith(link('full', unreadable));
    mount();
    fireEvent.click(shareButton());
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(island.shareModal.redactedName) }));
    assert.equal(has('.mcnw-modalRefusal'), true);
    assert.equal(has('.mcnw-modalRefusal button'), false);
  });

  it('a full shared view becomes the reader\'s own when a row is added or removed, the spending currency changed, or a CSV replaces its rows', async () => {
    for (const edit of ['add', 'remove', 'currency', 'csv'] as const) {
      arriveWith(link('full'));
      const { unmount } = mount();
      if (edit === 'add') fireEvent.click(addButton());
      else if (edit === 'currency') chooseSpending('USD');
      else if (edit === 'remove') fireEvent.click(removeButtons()[1]);
      else {
        await upload('Cash Gamma,500,USD,Asset\n');
        fireEvent.click(button('mcnw-csv-overwrite-confirm'));
      }
      assert.deepEqual(banners()[0], readOnlyLeft, edit);
      assert.equal(csvDownload().disabled, false, edit);
      unmount();
    }
  });

  it('a shared view\'s total is said as it arrives; one without amounts says none', () => {
    const said = () => one('.mcnw-root > span[aria-live="polite"]').textContent;
    arriveWith(link('full'));
    const first = mount();
    clock.pass(600);
    assert.equal(said(), fill(island.results.announce, { total: '€2,500.00' }));
    first.unmount();
    const euros = rowsOf(['', '2000', 'EUR', 'asset']);
    arriveWith(encodeShared(euros, aggregate(euros, 'EUR', { EUR: 1 }).positions, 'EUR', 'redacted'));
    mount();
    clock.pass(600);
    assert.equal(said(), '');
  });

  it('a shared link opened by a language switch is not counted again', () => {
    cameFrom('https://nidhi.today/hi/free/');
    arriveWith(link('full'));
    mount();
    assert.deepEqual(banners()[0], readOnly);
    assert.deepEqual(opened(), []);
  });

  it('a list switched from another language: its rows and currency, asked for in that currency only, and carried on as it is', async () => {
    const state = 'f=USD&n=1&a1=Car+Epsilon~300~GBP';
    arriveWith(state);
    mount();
    assert.deepEqual(formRows(), [['Car Epsilon', '300', 'GBP', 'asset'], ['', '', 'EUR', 'asset']]);
    assert.equal(one('.mcnw-toolbar select').getAttribute('value') ?? (one('.mcnw-toolbar select') as HTMLSelectElement).value, 'USD');
    assert.deepEqual(askedFor(), [`${RATES}USD`]);
    assert.deepEqual(banners(), [['mcnw-banner mcnw-bannerInfo', 'status', island.rates.loading]]);
    assert.equal(published.length, 1);
    assert.deepEqual(decodeFromQueryString(published[0] as string).rows[0], rowsOf(['Car Epsilon', '300', 'GBP', 'asset'])[0]);
    assert.deepEqual(events, []);
  });

  it('nothing usable on the window: a blank form in the page currency', () => {
    for (const state of [42, '']) {
      arriveWith(state);
      const { unmount } = mount({ defaultCurrency: 'GBP' });
      assert.deepEqual(formRows(), [['', '', 'GBP', 'asset']], String(state));
      assert.deepEqual(banners(), [['mcnw-banner mcnw-bannerInfo', 'status', island.rates.loading]], String(state));
      assert.deepEqual(askedFor().at(-1), `${RATES}GBP`);
      unmount();
    }
    assert.deepEqual(events, []);
  });

  it('a link from the first version (May 2026): refused as an old link, nothing of it loaded, its figures nowhere on the page', async () => {
    arriveWith('mode=full&func=USD&n=1&a0_name=Boat+Eta&a0_value=987654&a0_currency=USD');
    mount();
    assert.deepEqual(banners(), [['mcnw-banner mcnw-bannerWarn', 'alert', tb.refusedOld], ['mcnw-banner mcnw-bannerInfo', 'status', island.rates.loading]]);
    assert.deepEqual(formRows(), [['', '', 'EUR', 'asset']]);
    assert.ok(!document.body.innerHTML.includes('987654') && !document.body.innerHTML.includes('Boat'));
    await failRequest('offline');
    assert.deepEqual(published, []);
    assert.deepEqual(events.map(([name]) => name), ['free_multi_currency_net_worth_rates_error']);
  });

  it('a link that is not whole: nothing of it loaded, said until the first edit, and carried on refused until then', async () => {
    arriveWith('m=f&f=USD&n=3&a1=Boat+Eta~5');
    mount();
    const refusal = fill(tb.refusedLink, { max: 500 });
    assert.deepEqual(banners(), [['mcnw-banner mcnw-bannerWarn', 'alert', refusal], ['mcnw-banner mcnw-bannerInfo', 'status', island.rates.loading]]);
    assert.deepEqual(formRows(), [['', '', 'EUR', 'asset']]);
    assert.deepEqual(askedFor(), [`${RATES}EUR`]);
    await failRequest('offline');
    // A failed request is not said over a refusal: there is nothing to show raw.
    assert.deepEqual(banners(), [['mcnw-banner mcnw-bannerWarn', 'alert', refusal]]);
    assert.deepEqual(published, []);
    assert.deepEqual(events.map(([name]) => name), ['free_multi_currency_net_worth_rates_error']);
    // The example fills the form, so the refusal is over; cleared, an empty form is carried.
    fireEvent.click(exampleButton()!);
    assert.deepEqual(banners()[0], ['mcnw-banner mcnw-bannerWarn mcnw-banner--left', 'alert', refusal]);
    fireEvent.click(clearExampleButton()!);
    assert.equal(published.at(-1), '');
  });

  it('a switched list that is not whole says so in its own words, and leaves at the first typed value', () => {
    arriveWith('n=3&a1=Boat+Eta~5');
    mount();
    const refusal = fill(tb.refusedTransfer, { max: 500 });
    assert.deepEqual(banners()[0], ['mcnw-banner mcnw-bannerWarn', 'alert', refusal]);
    // Any edit makes the form the reader's own, a row's currency too.
    fillRow(1, { currency: 'USD' });
    assert.deepEqual(banners()[0], ['mcnw-banner mcnw-bannerWarn mcnw-banner--left', 'alert', refusal]);
    fillRow(1, { value: '5' });
    assert.deepEqual(banners()[0], ['mcnw-banner mcnw-bannerWarn mcnw-banner--left', 'alert', refusal]);
    assert.equal(decodeFromQueryString(String(published.at(-1))).rows[0].value, '5');
  });

  it('rows that cannot be read: every result held back with the reason, sharing still open, the file save closed', async () => {
    mount();
    await answer(EUR_RATES);
    fillRow(1, { value: '1000' });
    fireEvent.click(addButton());
    fillRow(2, { value: '7x' });
    assert.deepEqual(reason(), [fill(tb.withheldOne, { count: 1 })]);
    assert.equal(itemCount(), '1 item');
    fireEvent.click(addButton());
    fillRow(3, { value: '8y' });
    assert.deepEqual(reason(), [fill(tb.withheldMany, { count: 2 })]);
    assert.equal(shareButton().disabled, false);
    assert.equal(csvDownload().disabled, true);
    assert.equal(ariaDisabled(xlsxButton()), true);
    assert.equal(ariaDisabled(pdfButton()), true);
    none('.tool-report');
    // An older link that cannot say whether every rate was known holds its results back too.
  });

  it('an older shared link that cannot say whether every rate was known holds its results back, and so does one with an unreadable row', () => {
    const old = encodeShared(HOLDINGS, aggregate(HOLDINGS, 'EUR', { EUR: 1 }).positions, 'EUR', 'full').replace(/~[kx](?=&|$)/g, '');
    arriveWith(old);
    const first = mount();
    assert.deepEqual(reason(), [island.results.olderLink]);
    assert.equal(shareButton().disabled, false);
    first.unmount();
    const unreadable = rowsOf(['', 'NaN', 'EUR', 'asset'], ...HOLDINGS.map((r) => [r.name, r.value, r.currency, r.type] as [string, string, string, 'asset']));
    arriveWith(link('full', unreadable));
    mount();
    assert.deepEqual(reason(), [fill(tb.withheldOne, { count: 1 })]);
  });

  it('a CSV into an empty form: loaded at once, the file box emptied for the next, and only the count sent', async () => {
    mount();
    // A name with no amount is nothing to lose: no question is asked.
    fillRow(1, { name: 'Draft' });
    await upload('Name,Value,Currency,Type\nCash Gamma,500,USD,Asset\nCard Delta,80,EUR,Liability\n');
    assert.deepEqual(formRows(), [['Cash Gamma', '500', 'USD', 'asset'], ['Card Delta', '80', 'EUR', 'liability']]);
    none('.mcnw-csvConfirm');
    assert.equal(fileInput().files?.length, 0);
    assert.deepEqual(events, [['free_multi_currency_net_worth_csv_uploaded', { count: 2 }]]);
    assert.ok(!sentText().includes('Gamma') && !sentText().includes('500'));
    // A file with no row that reads leaves even a form with only names as it is.
    fireEvent.click(resetButton());
    fillRow(1, { name: 'Draft' });
    await upload('Bad,abc,EUR,Asset\n');
    assert.deepEqual(formRows(), [['Draft', '', 'EUR', 'asset']]);
    const sentSoFar = events.length;
    // The file picker closed without a file: nothing happens.
    fireEvent.change(fileInput());
    for (let i = 0; i < 6; i++) await turn();
    assert.deepEqual(formRows(), [['Draft', '', 'EUR', 'asset']]);
    assert.equal(events.length, sentSoFar);
  });

  it('a CSV over rows with amounts: asked first, then replaced or kept', async () => {
    mount();
    fillRow(1, { name: 'Mine', value: '900' });
    // A blank row beside it changes nothing: there are amounts to lose.
    fireEvent.click(addButton());
    await upload('Cash Gamma,500,USD,Asset\nCard Delta,80,EUR,Liability\n');
    assert.equal(fold().open, true);
    assert.equal(one('.mcnw-csvConfirm').textContent?.includes(fill(island.csv.confirmOne, { current: 1, pending: 2 })), true);
    // Kept: the dialog goes, the rows stay.
    fireEvent.click(button('mcnw-csv-overwrite-cancel'));
    none('.mcnw-csvConfirm');
    assert.deepEqual(formRows(), [['Mine', '900', 'EUR', 'asset'], ['', '', 'EUR', 'asset']]);
    // A file with no row that reads asks nothing and replaces nothing.
    await upload('Bad,abc,EUR,Asset\n');
    none('.mcnw-csvConfirm');
    assert.equal(formRows().length, 2);
    // Replaced.
    await upload('Cash Gamma,500,USD,Asset\nCard Delta,80,EUR,Liability\nBad,abc,EUR,Asset\n');
    assert.equal(csvAlerts().length, 1);
    fireEvent.click(button('mcnw-csv-overwrite-cancel'));
    // Kept, and the lines that could not be read go with the question.
    assert.deepEqual(csvAlerts(), []);
    await upload('Cash Gamma,500,USD,Asset\nCard Delta,80,EUR,Liability\n');
    fireEvent.click(button('mcnw-csv-overwrite-confirm'));
    none('.mcnw-csvConfirm');
    assert.deepEqual(formRows(), [['Cash Gamma', '500', 'USD', 'asset'], ['Card Delta', '80', 'EUR', 'liability']]);
    assert.deepEqual(events.filter(([name]) => !name.endsWith('parse_errors')), [
      ['free_multi_currency_net_worth_asset_added', { count: 2 }],
      ['free_multi_currency_net_worth_csv_overwrite_cancelled', undefined],
      ['free_multi_currency_net_worth_csv_overwrite_cancelled', undefined],
      ['free_multi_currency_net_worth_csv_uploaded', { count: 2 }],
      ['free_multi_currency_net_worth_csv_overwrite_confirmed', { count: 2 }],
    ]);
  });

  it('a CSV with lines that cannot be read: each listed in the page\'s words, the rest loaded, and only the first kind sent', async () => {
    mount();
    const file = [
      'Name,Value,Currency,Type',
      'Alpha,abc,EUR,Asset',
      'Beta,10,,Asset',
      'Gamma,10,XYZ,Asset',
      'Delta,10,EUR,Gift',
      'Epsilon',
      'Zeta,20,EUR,Asset',
    ].join('\n');
    await upload(file);
    const supported = [...one('.mcnw-cellCurrency select').querySelectorAll('option')].map((o) => o.value).join(', ');
    assert.deepEqual(csvAlerts(), [[
      'alert',
      fill(tb.errorTitleMany, { count: 5 }),
      'Line 2: “abc” is not a valid positive number.',
      'Line 3: Currency code is empty.',
      `Line 4: “XYZ” is not a supported currency. Supported: ${supported}.`,
      'Line 5: “gift” is not a type the tool knows. Use Asset or Liability.',
      'Line 6: Expected at least value and currency columns.',
    ]]);
    assert.equal(fold().open, true);
    assert.deepEqual(formRows(), [['Zeta', '20', 'EUR', 'asset']]);
    const firsts: Array<[string, string]> = [
      ['Beta,10,,Asset', 'empty'],
      ['Gamma,10,XYZ,Asset', 'unsupported_currency'],
      ['Delta,10,EUR,Gift', 'other'],
      ['Epsilon', 'columns'],
      ['', 'empty'],
    ];
    for (const [line, _] of firsts) {
      fireEvent.click(resetButton());
      await upload(line === '' ? '' : `${line}\nZeta,20,EUR,Asset`);
    }
    assert.deepEqual(csvAlerts(), [['alert', fill(tb.errorTitleOne, { count: 1 }), 'Line 0: CSV is empty.']]);
    const sent = events.filter(([name]) => name === 'free_multi_currency_net_worth_csv_parse_errors').map(([, p]) => p);
    assert.deepEqual(sent, [
      { errorCount: 5, validRowCount: 1, firstReason: 'invalid_value' },
      ...firsts.map(([line, firstReason]) => ({ errorCount: 1, validRowCount: line === '' ? 0 : 1, firstReason })),
    ]);
    assert.ok(!sentText().includes('Alpha') && !sentText().includes('XYZ') && !sentText().includes('gift'));
  });

  it('a CSV in the page\'s own words for the two kinds is read in them', async () => {
    const es = TOOL_STRINGS.es.multiCurrencyNetWorth.island;
    mount({ strings: es, numberLocale: 'es' });
    await upload(`Casa;100;EUR;${es.row.asset}\nPrestamo;40;EUR;${es.row.liability}\n`);
    assert.deepEqual(formRows().map((r) => r[3]), ['asset', 'liability']);
  });

  it('a CSV over the row limit: nothing imported, said, and what was there before kept', async () => {
    mount();
    fillRow(1, { value: '900' });
    await upload('Bad,abc,EUR,Asset\nGood,5,EUR,Asset\n');
    assert.equal(csvAlerts().length, 1);
    assert.equal(has('.mcnw-csvConfirm'), true);
    // 500 rows that read and one that does not: 501 lines.
    await upload(`${csvLines(500)}\nBad,abc,EUR,Asset`);
    assert.deepEqual(csvAlerts(), [['alert', fill(tb.csvLimit, { max: 500 })]]);
    none('.mcnw-csvConfirm');
    assert.equal(fold().open, true);
    assert.deepEqual(formRows(), [['', '900', 'EUR', 'asset']]);
    await upload(csvLines(501));
    assert.deepEqual(csvAlerts(), [['alert', fill(tb.csvLimit, { max: 500 })]]);
    assert.deepEqual(eventNames(), ['free_multi_currency_net_worth_csv_parse_errors']);
  });

  it('the example: the page\'s own words and fixed amounts, in the page currency and one other, then cleared, keeping what was changed', async () => {
    const pages: Array<[string, string[][]]> = [
      ['EUR', [['12000', 'EUR'], ['30000', 'EUR'], ['8000', 'USD'], ['9000', 'EUR']]],
      ['USD', [['12000', 'USD'], ['30000', 'USD'], ['8000', 'EUR'], ['9000', 'USD']]],
      ['INR', [['600000', 'INR'], ['1500000', 'INR'], ['8000', 'USD'], ['450000', 'INR']]],
    ];
    const e = island.example;
    for (const [code, rows] of pages) {
      // Each page opens fresh: what the one before kept for a language switch is not carried.
      arriveWith(undefined);
      const { unmount } = mount({ defaultCurrency: code });
      fireEvent.click(exampleButton()!);
      assert.deepEqual(formRows(), [
        [e.savings, ...rows[0], 'asset'], [e.investments, ...rows[1], 'asset'], [e.abroad, ...rows[2], 'asset'], [e.loan, ...rows[3], 'liability'],
      ], code);
      assert.ok(exampleButton() === null);
      assert.equal(one('.mcnw-exampleNote > span').textContent, e.note);
      assert.equal(clearExampleButton()?.className, 'mcnw-linkBtn');
      assert.equal(clearExampleButton()?.textContent, e.clear);
      // Focus goes to the first row's name, not to the top of the page.
      await frame();
      assert.ok(document.activeElement === nameBox(1, 4));
      unmount();
    }
    {
      // cleared with one field changed in each of three rows: those three stay
      arriveWith(undefined);
      mount();
      fireEvent.click(exampleButton()!);
      fillRow(1, { name: 'My savings' });
      fillRow(2, { value: '31000' });
      fillRow(3, { currency: 'GBP' });
      fireEvent.click(clearExampleButton()!);
      assert.deepEqual(formRows(), [['My savings', '12000', 'EUR', 'asset'], [e.investments, '31000', 'EUR', 'asset'], [e.abroad, '8000', 'GBP', 'asset']]);
      none('.mcnw-exampleNote');
      fireEvent.click(resetButton());
      fireEvent.click(exampleButton()!);
      fillRow(4, { type: 'asset' });
      fireEvent.click(clearExampleButton()!);
      assert.deepEqual(formRows(), [[e.loan, '9000', 'EUR', 'asset']]);
      fireEvent.click(resetButton());
      // cleared untouched: one blank row, and focus on it
      fireEvent.click(exampleButton()!);
      await frame();
      valueBox(2).focus();
      fireEvent.click(clearExampleButton()!);
      assert.deepEqual(formRows(), [['', '', 'EUR', 'asset']]);
      await frame();
      assert.ok(document.activeElement === nameBox(1, 1));
    }
    // The example is never sent.
    assert.deepEqual(eventNames(), ['free_multi_currency_net_worth_reset', 'free_multi_currency_net_worth_reset']);
  });

  it('the reset: every row, the currency, the banners, the file\'s errors and the example go', async () => {
    arriveWith('m=f&f=USD&n=3&a1=Boat+Eta~5');
    const first = mount({ defaultCurrency: 'GBP' });
    chooseSpending('USD');
    fireEvent.click(exampleButton()!);
    fireEvent.click(addButton());
    fillRow(5, { value: '5' });
    await upload('Bad,abc,EUR,Asset\n');
    assert.equal(csvAlerts().length, 1);
    fireEvent.click(resetButton());
    assert.deepEqual(formRows(), [['', '', 'GBP', 'asset']]);
    assert.equal((one('.mcnw-toolbar select') as HTMLSelectElement).value, 'GBP');
    assert.deepEqual(banners().filter(([cls]) => (cls as string).includes('Warn')), []);
    assert.deepEqual(csvAlerts(), []);
    assert.equal(fold().open, false);
    none('.mcnw-exampleNote');
    assert.equal(exampleButton()?.textContent, island.example.show);
    assert.equal(eventNames().at(-1), 'free_multi_currency_net_worth_reset');
    assert.equal(events.at(-1)?.[1], undefined);
    // A question about a file goes with the reset.
    fillRow(1, { value: '3' });
    await upload('Cash Gamma,500,USD,Asset\n');
    assert.equal(has('.mcnw-csvConfirm'), true);
    fireEvent.click(resetButton());
    none('.mcnw-csvConfirm');
    // A fold the reader opened stays open while they type, and the reset folds it.
    fold().open = true;
    fireEvent(fold(), new window.Event('toggle'));
    fillRow(1, { name: 'Kept open' });
    assert.equal(fold().open, true);
    fireEvent.click(resetButton());
    assert.equal(fold().open, false);
    // Too long a file is forgotten too.
    await upload(csvLines(501));
    fireEvent.click(resetButton());
    assert.deepEqual(csvAlerts(), []);
    // A shared view's banner goes with it.
    first.unmount();
    arriveWith(link('full'));
    mount();
    fireEvent.click(resetButton());
    assert.equal(all('.mcnw-banner.mcnw-bannerInfo').filter((b) => b.textContent === island.shared.readOnly).length, 0);
    // The form is the reader's own again: the example is offered.
    assert.equal(exampleButton()?.textContent, island.example.show);
  });
});
