/**
 * The inflation calculator as its page mounts it (#790): the form and its
 * four questions, when a typed figure becomes an answer, what a wrong box
 * withholds, a country's history loading, failing and arriving, the reset,
 * what Copy puts on the clipboard, what the page keeps for the language
 * switch, a shared link arriving, and the exports.
 *
 * Throughout: the address is never written, a link carries state after the
 * `#` only, and analytics get choices, never a typed value (CLAUDE.md, "Free
 * Tools Keep Inputs Out of URLs").
 */
import {
  t, island, fill, COUNTRIES, events, eventNames, published, shared, copied, printed, downloads, asked, answerFetch, waitingRequests, historyArrives, arriveWith, clipboard,
  page, mount, turn, settle, all, text, one, none, tab, selectedTab, box, choice, type, choose, headline, sentences, question, example, withheld, reason, said,
  shareButton, xlsxButton, pdfButton, copyLabel, disabled, errorOf, reportLines, reportEntered, reportMethod, fileText,
} from '../../test/inflationParts.page.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { boxErrors, formFromLink } from '../utils/inflation/form.ts';

const f = island.fields;
const ADDRESS = 'https://nidhi.today/free/';
const SHARE = `${ADDRESS}?utm_source=share&utm_medium=referral&utm_campaign=free_tools&utm_content=inflation_calculator`;
const tablist = () => screen.getByRole('tablist');
const key = (name: string) => fireEvent.keyDown(document.activeElement && tablist().contains(document.activeElement) ? document.activeElement : tablist(), { key: name });
const fold = () => document.querySelector('details.ifc-history') as HTMLDetailsElement | null;
const notes = () => text('.tool-exportNote');
const inputs = () => all('.ifc-grid input').map((i) => (i as HTMLInputElement).value);
const labels = () => text('.ifc-grid label');
const historyNotes = () => all('.ifc-history .ifc-note').map((p) => [p.className, p.textContent]);

describe('the inflation calculator on its page', () => {
  it('as the page loads: the form, its names and its analytics labels, an example answer, and nothing sent or kept', () => {
    const before = window.history.length;
    // A catalog with no name of its own for one currency.
    const { INR: _none, ...named } = island.currencies;
    mount({ strings: { ...island, currencies: named as typeof island.currencies } });
    {
      // the tool can be used once it runs, and its form never submits
      const root = one('.ifc-root');
      assert.equal(root.hasAttribute('inert'), false);
      assert.equal(root.hasAttribute('aria-busy'), false);
      const form = one('form.ifc-form');
      assert.equal(form.getAttribute('aria-label'), island.formLabel);
      assert.equal(fireEvent.submit(form), false);
      assert.equal(example(), island.example);
      assert.equal(one('.ifc-formHead > p').className, 'ifc-example');
    }
    {
      // four questions as tabs: the first chosen, each tied to the one panel, which is named by the chosen tab
      assert.equal(tablist().getAttribute('aria-label'), island.tabsLabel);
      assert.equal(tablist().className, 'ifc-tabs');
      const tabs = screen.getAllByRole('tab');
      assert.deepEqual(tabs.map((el) => el.textContent), [island.tabs.buy, island.tabs.cost, island.tabs.past, island.tabs.keep]);
      assert.deepEqual(tabs.map((el) => el.getAttribute('aria-selected')), ['true', 'false', 'false', 'false']);
      assert.deepEqual(tabs.map((el) => el.getAttribute('tabindex')), ['0', '-1', '-1', '-1']);
      assert.deepEqual(tabs.map((el) => [el.className, el.getAttribute('type')]), Array(4).fill(['ifc-tab', 'button']));
      const panel = screen.getByRole('tabpanel');
      assert.equal(panel.className, 'ifc-panel');
      assert.ok(panel.id.length > 1);
      assert.deepEqual(tabs.map((el) => el.getAttribute('aria-controls')), Array(4).fill(panel.id));
      const ids = tabs.map((el) => el.id);
      assert.equal(new Set([...ids, panel.id]).size, 5);
      assert.ok(ids.every((id) => id.length > 1));
      assert.deepEqual(ids.map((id) => id.split('-').slice(-2).join('-')), ['tab-buy', 'tab-cost', 'tab-past', 'tab-keep']);
      assert.equal(panel.getAttribute('aria-labelledby'), ids[0]);
      assert.equal(question(), island.questions.buy);
    }
    {
      // every box has its label; the currencies are named by the catalog, or by their own label where it has none
      assert.deepEqual(labels(), [f.currency, f.amount.buy, f.rate, f.years.buy]);
      assert.equal(one('.ifc-grid > div').className, 'ifc-field ifc-field--currency');
      const currency = choice(f.currency);
      assert.equal(currency.value, 'EUR');
      assert.equal(currency.className, 'ifc-input');
      const options = Object.fromEntries([...currency.options].map((o) => [o.value, o.textContent]));
      assert.equal(options.EUR, island.currencies.EUR);
      assert.equal(options.USD, island.currencies.USD);
      assert.equal(options.INR, 'Indian Rupee (INR)');
      assert.equal(Object.keys(options).length, Object.keys(island.currencies).length);
      assert.equal(box(f.amount.buy).value, '10000');
      assert.equal(box(f.amount.buy).getAttribute('inputmode'), 'decimal');
      assert.equal(box(f.amount.buy).hasAttribute('aria-describedby'), false);
      assert.equal(box(f.rate).value, '3');
      assert.equal(box(f.rate).getAttribute('inputmode'), 'decimal');
      assert.equal(one(`#${CSS.escape(box(f.rate).getAttribute('aria-describedby') ?? '')}`).textContent, '0 to 10,000, up to two decimal places');
      assert.equal(box(f.rate).parentElement?.querySelector('.ifc-unit')?.textContent, '%');
      assert.equal(box(f.years.buy).value, '10');
      assert.equal(box(f.years.buy).getAttribute('inputmode'), 'numeric');
      assert.equal(one(`#${CSS.escape(box(f.years.buy).getAttribute('aria-describedby') ?? '')}`).textContent, '1 to 100');
      assert.equal(box(f.years.buy).parentElement?.querySelector('.ifc-unit'), null);
      assert.equal(new Set(all('.ifc-grid input, .ifc-grid select').map((el) => el.id)).size, 4);
      none('.ifc-error');
    }
    {
      // the country history is folded away, with no country chosen
      assert.equal(fold()?.open, false);
      assert.equal(one('.ifc-historyStatus').textContent, island.history.none);
      assert.equal(choice(island.history.label).value, '');
      assert.deepEqual([...choice(island.history.label).options].map((o) => o.value), ['', 'EMU', 'NOD', 'OTH', 'TST']);
    }
    {
      // the example's answer is there (10,000 / 1.03^10 = 7,441), with its report for paper, and can be shared and saved
      assert.equal(headline(), 'about €7,440');
      assert.equal(withheld(), false);
      assert.equal(said(), '');
      assert.deepEqual(reportLines(), ['about €7,440', 'If inflation averages 3% a year, €10,000 in 10 years buys what about €7,440 buys today.', 'One point either side: At 2%: about €8,200 · At 4%: about €6,760']);
      assert.deepEqual(reportEntered(), [['Question', island.tabs.buy], [f.amount.buy, '10,000.00'], [f.rate, '3.00'], [f.years.buy, '10']]);
      assert.deepEqual(reportMethod(), [island.results.method]);
      assert.deepEqual([shareButton(), xlsxButton(), pdfButton()].map(disabled), [false, false, false]);
      assert.equal(shareButton().hasAttribute('aria-disabled'), false);
      assert.equal(shareButton().className, 'btn btn--outline');
      assert.equal(shareButton().getAttribute('type'), 'button');
      assert.equal(copyLabel(), island.actions.copy);
      assert.deepEqual(notes(), [t.export.note]);
    }
    {
      // the labels analytics may see, and no others
      assert.deepEqual(all('[data-attr]').map((el) => el.getAttribute('data-attr')), [
        'free-inflation-reset', 'free-inflation-tab-buy', 'free-inflation-tab-cost', 'free-inflation-tab-past', 'free-inflation-tab-keep',
        'free-inflation-share', 'free-inflation-export-xlsx', 'free-inflation-export-pdf',
      ]);
      assert.equal(one('[data-attr="free-inflation-reset"]').textContent, island.actions.reset);
      assert.equal(one('[data-attr="free-inflation-reset"]').className, 'btn btn--quiet ifc-reset');
      assert.equal(one('[data-attr="free-inflation-reset"]').getAttribute('type'), 'button');
    }
    {
      // an untouched page carries nothing to another language, sends nothing, asks the network for nothing, and leaves the address alone
      assert.deepEqual(published, ['']);
      assert.deepEqual(events, []);
      assert.equal(asked.length, 0);
      assert.equal(window.location.href, ADDRESS);
      assert.equal(window.history.length, before);
    }
  });

  it('the four questions: arrow keys, Home and End move between them, and each has its own boxes', () => {
    mount();
    tab('buy').focus();
    const steps: Array<[string, keyof typeof island.tabs]> = [
      ['ArrowRight', 'cost'], ['ArrowDown', 'past'], ['ArrowLeft', 'cost'], ['ArrowUp', 'buy'],
      // Round the ends.
      ['ArrowLeft', 'keep'], ['ArrowRight', 'buy'], ['End', 'keep'], ['Home', 'buy'],
    ];
    for (const [name, mode] of steps) {
      // The key is the tabs' own: the page does not scroll with it.
      assert.equal(key(name), false, name);
      assert.deepEqual(selectedTab(), [island.tabs[mode]], name);
      assert.ok(document.activeElement === tab(mode), `${name} moves the focus`);
      assert.equal(tab(mode).getAttribute('tabindex'), '0');
      assert.equal(screen.getByRole('tabpanel').getAttribute('aria-labelledby'), tab(mode).id);
      assert.equal(question(), island.questions[mode]);
      assert.deepEqual(labels(), [f.currency, f.amount[mode], f.rate, f.years[mode], ...(mode === 'keep' ? [f.growth] : [])]);
      // The history is folded behind one row, except for "Past to today", which needs it.
      assert.equal(one('.ifc-history').tagName, mode === 'past' ? 'DIV' : 'DETAILS');
    }
    assert.deepEqual(events, steps.map(([, mode]) => ['free_inflation_mode_changed', { mode }]));
    {
      // Home on the first question stays there, and is not counted as a change
      assert.equal(key('Home'), false);
      assert.deepEqual(selectedTab(), [island.tabs.buy]);
      // Any other key is left to the page.
      for (const other of ['a', 'Enter', 'Tab', 'PageDown']) assert.equal(key(other), true, other);
      assert.deepEqual(selectedTab(), [island.tabs.buy]);
      // Choosing the question already chosen is not a change either.
      fireEvent.click(tab('buy'));
      assert.equal(events.length, steps.length);
    }
    {
      // "Keeping up" adds the raise or return, with its hint; the others do not have it
      fireEvent.click(tab('keep'));
      assert.deepEqual(events.at(-1), ['free_inflation_mode_changed', { mode: 'keep' }]);
      assert.equal(box(f.growth).value, '5');
      assert.equal(box(f.growth).getAttribute('inputmode'), 'text');
      assert.equal(one(`#${CSS.escape(box(f.growth).getAttribute('aria-describedby') ?? '')}`).textContent, f.growthHint);
      assert.equal(box(f.growth).parentElement?.querySelector('.ifc-unit')?.textContent, '%');
      assert.equal(new Set(all('.ifc-grid input, .ifc-grid select').map((el) => el.id)).size, 5);
      // The answer follows once the choice has settled: (1.05 / 1.03 - 1) = 1.94% a year.
      assert.equal(headline(), 'about €7,440');
      settle();
      assert.equal(headline(), '+1.94% a year');
      assert.equal(shared(), 'm=k');
      assert.equal(example(), '');
      fireEvent.click(tab('cost'));
      settle();
      // 10,000 x 1.343916 = 13,439.
      assert.equal(headline(), 'about €13,400');
      assert.deepEqual(reportEntered()[0], ['Question', island.tabs.cost]);
    }
  });

  it('a typed figure becomes the answer a quarter of a second after typing stops; until then nothing can be copied or saved', async () => {
    const before = window.history.length;
    clipboard();
    mount();
    type(f.amount.buy, '73191');
    {
      // at once: kept for the language switch, no longer an example, the old answer still showing
      assert.equal(shared(), 'a=73191');
      assert.equal(example(), '');
      assert.equal(headline(), 'about €7,440');
      assert.equal(withheld(), false);
      assert.deepEqual(reason(), []);
      // Copy and the exports wait, without a note that would come and go with every key.
      assert.deepEqual([shareButton(), xlsxButton(), pdfButton()].map(disabled), [true, true, true]);
      assert.deepEqual(notes(), [t.export.note]);
      fireEvent.click(shareButton());
      fireEvent.click(xlsxButton());
      fireEvent.click(pdfButton());
      await turn();
      assert.deepEqual([copied.length, downloads.length, printed.length], [0, 0, 0]);
      assert.deepEqual(events, []);
    }
    {
      // 73,191 / 1.343916 = 54,461
      settle(249);
      assert.equal(headline(), 'about €7,440');
      settle(1);
      assert.equal(headline(), 'about €54,500');
      assert.equal(said(), 'Updated answer: about €54,500. If inflation averages 3% a year, €73,191 in 10 years buys what about €54,500 buys today.');
      assert.deepEqual([shareButton(), xlsxButton(), pdfButton()].map(disabled), [false, false, false]);
      assert.equal(shareButton().hasAttribute('aria-disabled'), false);
    }
    {
      // typing on within the quarter second starts the wait again: the figure half typed is never an answer
      type(f.amount.buy, '5000');
      settle(200);
      type(f.amount.buy, '6000');
      settle(60);
      assert.equal(headline(), 'about €54,500');
      settle(190);
      // 6,000 / 1.343916 = 4,465.
      assert.equal(headline(), 'about €4,460');
      type(f.rate, '7');
      type(f.years.buy, '20');
      assert.equal(shared(), 'a=6000&r=7&y=20');
      settle();
      // 6,000 / 1.07^20 = 6,000 / 3.869684 = 1,551.
      assert.deepEqual(sentences(), ['If inflation averages 7% a year, €6,000 in 20 years buys what about €1,550 buys today.']);
    }
    {
      // Copy: the link carries the figures after the #, never in the query string, and says so for two and a half seconds
      fireEvent.click(shareButton());
      assert.deepEqual(copied, [`${SHARE}#a=6000&r=7&y=20`]);
      assert.equal(new URL(copied[0]).search, '?utm_source=share&utm_medium=referral&utm_campaign=free_tools&utm_content=inflation_calculator');
      assert.equal(new URL(copied[0]).hash, '#a=6000&r=7&y=20');
      assert.deepEqual(events, [['free_inflation_share_copied', undefined]]);
      assert.equal(copyLabel(), island.actions.copy);
      await turn();
      assert.equal(copyLabel(), island.actions.copied);
      settle(2499);
      assert.equal(copyLabel(), island.actions.copied);
      settle(1);
      assert.equal(copyLabel(), island.actions.copy);
    }
    {
      // the spreadsheet: named for the tool and the day, holding the answer and the page's address without the figures
      fireEvent.click(xlsxButton());
      assert.equal(downloads.length, 1);
      assert.match(downloads[0].name, /^nidhi-inflation-\d{4}-\d{2}-\d{2}\.xlsx$/);
      const file = await fileText(downloads[0].blob);
      assert.ok(file.includes(`>${ADDRESS}</t>`));
      assert.ok(!file.includes('utm_') && !file.includes('a=6000') && !file.includes(`${ADDRESS}#`) && !file.includes(`${ADDRESS}?`));
      assert.ok(file.includes('>If inflation averages 7% a year, €6,000 in 20 years buys what about €1,550 buys today.</t>'));
      assert.ok(file.includes(`>${island.questions.buy.replace("'", '&apos;')}</t>`) || file.includes(`>${island.questions.buy}</t>`));
      assert.ok(!file.includes(island.export.country));
      assert.deepEqual(events.at(-1), ['free_inflation_exported', { format: 'xlsx' }]);
      // the report for paper
      fireEvent.click(pdfButton());
      assert.equal(printed.length, 1);
      assert.deepEqual(events.at(-1), ['free_inflation_exported', { format: 'pdf' }]);
      assert.equal(events.length, 3);
    }
    {
      // a currency is a choice, and is counted as one; yen have no cents
      choose(f.currency, 'JPY');
      assert.deepEqual(events.at(-1), ['free_inflation_currency_changed', { currency: 'JPY' }]);
      settle();
      assert.equal(headline(), 'about ￥1,550');
      assert.deepEqual(reportEntered()[1], [f.amount.buy, '6,000']);
      assert.equal(shared(), 'c=JPY&a=6000&r=7&y=20');
    }
    {
      // nothing typed reached analytics or the address
      const sent = JSON.stringify(events);
      for (const typed of ['73191', '6000', '5000', '20']) assert.ok(!sent.includes(typed), typed);
      assert.deepEqual(eventNames(), ['free_inflation_share_copied', 'free_inflation_exported', 'free_inflation_exported', 'free_inflation_currency_changed']);
      assert.equal(window.location.href, ADDRESS);
      assert.equal(window.history.length, before);
      assert.equal(asked.length, 0);
    }
  });

  it('a wrong box says what it takes, withholds the answer and everything made from it, and counts only where its box is shown', async () => {
    clipboard();
    mount();
    type(f.amount.buy, 'abc');
    {
      assert.equal(errorOf(f.amount.buy), 'Error: Enter an amount from 0 to 1,000,000,000,000, with up to two decimal places.');
      assert.equal(box(f.amount.buy).getAttribute('aria-invalid'), 'true');
      assert.equal(withheld(), true);
      assert.deepEqual(reason(), [island.results.fix]);
      // The figures are no longer an example, and the report for paper is gone with the answer.
      assert.equal(example(), '');
      assert.equal(reportLines(), null);
      // Copy and the exports say why they wait.
      assert.deepEqual([shareButton(), xlsxButton(), pdfButton()].map(disabled), [true, true, true]);
      assert.deepEqual(notes(), [t.export.note, t.export.notReady]);
      assert.equal(xlsxButton().getAttribute('aria-describedby'), all('.tool-exportNote')[1].id);
      fireEvent.click(shareButton());
      fireEvent.click(xlsxButton());
      fireEvent.click(pdfButton());
      await turn();
      assert.deepEqual([copied.length, downloads.length, printed.length, events.length], [0, 0, 0, 0]);
      // What the language switch carries still holds the box as wrong.
      const carried = formFromLink(shared() as string, 'en');
      assert.ok(carried && boxErrors(carried, 'en').amount);
    }
    {
      // no answer is worked out from a form with a wrong box, however long it stands, even behind what is withheld
      type(f.rate, '7');
      settle(5000);
      assert.equal(headline(), 'about €7,440');
      assert.equal(withheld(), true);
      type(f.rate, '3');
    }
    {
      // corrected: nothing left to fix, and the answer returns once it has been worked out
      type(f.amount.buy, '10000');
      assert.equal(errorOf(f.amount.buy), null);
      assert.equal(box(f.amount.buy).hasAttribute('aria-invalid'), false);
      assert.equal(withheld(), true);
      assert.deepEqual(reason(), []);
      assert.deepEqual(notes(), [t.export.note]);
      settle();
      assert.equal(withheld(), false);
      assert.equal(headline(), 'about €7,440');
      assert.deepEqual(reportLines()?.[0], 'about €7,440');
      // The starting figures again: an example.
      assert.equal(example(), island.example);
    }
    {
      // each box says its own range
      type(f.rate, '10001');
      type(f.years.buy, '0');
      assert.equal(errorOf(f.amount.buy), null);
      assert.equal(errorOf(f.rate), 'Error: Enter a rate from 0 to 10,000, with up to two decimal places.');
      assert.equal(errorOf(f.years.buy), 'Error: Enter a whole number of years from 1 to 100.');
      assert.equal(withheld(), true);
      fireEvent.click(tab('keep'));
      assert.equal(errorOf(f.growth), null);
      type(f.growth, '-100');
      assert.equal(errorOf(f.growth), 'Error: Enter a rate from -99.99 to 10,000, with up to two decimal places.');
      assert.equal(text('.ifc-error').length, 3);
      type(f.rate, '3');
      type(f.years.keep, '10');
      assert.equal(text('.ifc-error').length, 1);
      assert.equal(withheld(), true);
    }
    {
      // a wrong raise holds back only the question that shows its box
      fireEvent.click(tab('buy'));
      assert.equal(text('.ifc-error').length, 0);
      assert.deepEqual(reason(), []);
      settle();
      assert.equal(withheld(), false);
      assert.equal(headline(), 'about €7,440');
      assert.deepEqual([shareButton(), xlsxButton(), pdfButton()].map(disabled), [false, false, false]);
      fireEvent.click(tab('keep'));
      assert.equal(withheld(), true);
      assert.deepEqual(reason(), [island.results.fix]);
    }
  });

  it('Reset puts the page’s own starting figures back at once', () => {
    mount();
    fireEvent.click(tab('keep'));
    choose(f.currency, 'USD');
    type(f.amount.keep, '250');
    // The history, opened by hand, stays open as the form changes.
    const history = fold()!;
    history.open = true;
    fireEvent(history, new window.Event('toggle'));
    type(f.rate, '4');
    assert.equal(fold()?.open, true);
    settle();
    assert.equal(shared(), 'm=k&c=USD&a=250&r=4');
    type(f.rate, '4.5');
    events.length = 0;
    fireEvent.click(one('[data-attr="free-inflation-reset"]'));
    assert.deepEqual(events, [['free_inflation_reset', undefined]]);
    assert.deepEqual(selectedTab(), [island.tabs.buy]);
    assert.equal(choice(f.currency).value, 'EUR');
    assert.deepEqual(all('.ifc-grid input').map((i) => (i as HTMLInputElement).value), ['10000', '3', '10']);
    assert.equal(example(), island.example);
    assert.equal(fold()?.open, false);
    // The answer is the example's, with no wait, and can be copied at once.
    assert.equal(headline(), 'about €7,440');
    assert.equal(withheld(), false);
    assert.deepEqual([shareButton(), xlsxButton(), pdfButton()].map(disabled), [false, false, false]);
    assert.equal(shared(), '');
    settle();
    assert.equal(headline(), 'about €7,440');
  });

  it('Copy on an untouched page gives the plain address; a clipboard that refuses, or is missing, is not an error', async () => {
    mount();
    {
      // no clipboard at all: nothing happens, and the click is still counted
      assert.equal(navigator.clipboard, undefined);
      fireEvent.click(shareButton());
      await turn();
      assert.equal(copyLabel(), island.actions.copy);
      assert.deepEqual(events, [['free_inflation_share_copied', undefined]]);
    }
    {
      clipboard();
      fireEvent.click(shareButton());
      await turn();
      assert.deepEqual(copied, [SHARE]);
      assert.equal(copyLabel(), island.actions.copied);
    }
    {
      // a clipboard that refuses: the link is offered to copy by hand
      const prompts: unknown[][] = [];
      window.prompt = ((...said: unknown[]) => { prompts.push(said); return null; }) as typeof window.prompt;
      clipboard(false);
      settle(2500);
      type(f.amount.buy, '250');
      settle();
      fireEvent.click(shareButton());
      await turn();
      assert.deepEqual(prompts, [[island.actions.copyPrompt, `${SHARE}#a=250`]]);
      assert.equal(copyLabel(), island.actions.copy);
      assert.equal(events.length, 3);
    }
  });

  // Before any test that lets the history arrive: once it has, the page holds it and never asks again.
  it('a request that fails after the reader has moved to a country the page holds is not reported as a failure', async () => {
    mount({ defaultCountry: 'TST', initialHistory: { code: 'TST', series: [2018, [0, 50]] } });
    fireEvent.click(tab('past'));
    choose(island.history.label, 'EMU');
    settle();
    assert.deepEqual(text('.ifc-results .ifc-note'), [island.history.loading]);
    // Back to the page's own country before the file comes, and then it fails.
    choose(island.history.label, 'TST');
    await answerFetch('offline');
    assert.deepEqual(text('.ifc-results .ifc-note'), [island.history.loading]);
    none('.ifc-results .ifc-headline');
    none('.ifc-note--warn');
    settle();
    // 10,000 x 1.5.
    assert.equal(sentences()[0], 'In Testland, $10,000 in 2018 bought what about $15,000 bought in 2019.');
  });

  it('a country’s history: asked for once chosen, said to be loading, said to have failed, asked for again, and then used', async () => {
    mount();
    {
      // choosing a country takes its currency where the tool has it, and asks this site for the history at once
      choose(island.history.label, 'TST');
      assert.deepEqual(events, [['free_inflation_country_changed', { country: 'TST' }]]);
      assert.equal(choice(f.currency).value, 'USD');
      assert.deepEqual(asked, [{ url: '/data/inflation-history.json', options: { credentials: 'omit' } }]);
      assert.equal(one('.ifc-historyStatus').textContent, 'Testland');
      assert.deepEqual(historyNotes(), [['ifc-note', island.history.loading]]);
      assert.equal(fold()?.open, false);
      // The other questions do not wait for it: 10,000 dollars at the typed rate.
      settle();
      assert.equal(headline(), 'about $7,440');
      assert.equal(shared(), 'c=USD&n=TST');
    }
    {
      // the server refuses: the fold opens on the reason
      await answerFetch('refused');
      assert.deepEqual(historyNotes(), [['ifc-note ifc-note--warn', island.history.error]]);
      assert.equal(fold()?.open, true);
      assert.equal(headline(), 'about $7,440');
    }
    {
      // another country: asked for again, and loading, not failed; a country whose money the tool lacks keeps the currency
      choose(island.history.label, 'OTH');
      assert.deepEqual(events.at(-1), ['free_inflation_country_changed', { country: 'OTH' }]);
      assert.equal(choice(f.currency).value, 'USD');
      assert.equal(asked.length, 2);
      assert.deepEqual(historyNotes(), [['ifc-note', island.history.loading]]);
      // Opened on the reason, the fold stays open, as one a reader opened does.
      assert.equal(fold()?.open, true);
    }
    {
      // "Past to today" while it loads: the country's question, no rate or years to type, and no answer yet to save
      fireEvent.click(tab('past'));
      assert.equal(question(), fill(island.questions.pastCountry, { country: 'Otherland' }));
      assert.deepEqual(labels(), [f.currency, f.amount.past]);
      settle();
      assert.deepEqual(text('.ifc-results .ifc-note'), [island.history.loading]);
      none('.ifc-headline');
      assert.equal(reportLines(), null);
      assert.deepEqual([shareButton(), xlsxButton(), pdfButton()].map(disabled), [false, true, true]);
      assert.deepEqual(notes(), [t.export.note, t.export.notReady]);
      fireEvent.click(xlsxButton());
      assert.equal(downloads.length, 0);
      // Typing meanwhile does not take the note away: there is no answer for a keystroke to settle into.
      type(f.amount.past, '250');
      assert.deepEqual([shareButton(), xlsxButton(), pdfButton()].map(disabled), [true, true, true]);
      assert.deepEqual(notes(), [t.export.note, t.export.notReady]);
      type(f.amount.past, '10000');
      settle();
    }
    {
      // no connection this time: the typed rate is used after all
      await answerFetch('offline');
      assert.deepEqual(historyNotes(), [['ifc-note ifc-note--warn', island.history.error]]);
      assert.equal(question(), island.questions.past);
      assert.deepEqual(labels(), [f.currency, f.amount.past, f.rate, f.years.past]);
      // 10,000 x 1.343916 = 13,439.
      assert.equal(headline(), 'about $13,400');
      assert.deepEqual(notes(), [t.export.note]);
    }
    {
      // a third try, and it arrives. Otherland has no unbroken run of years, so "Past to today" keeps the typed rate
      choose(island.history.label, 'TST');
      choose(island.history.label, 'OTH');
      assert.equal(asked.length, 3);
      await answerFetch('history');
      assert.deepEqual(historyNotes(), [['ifc-note', fill(island.history.currencyOther, { currency: 'USD', country: 'Otherland' })]]);
      assert.equal(question(), island.questions.past);
      assert.deepEqual(labels(), [f.currency, f.amount.past, f.rate, f.years.past]);
      assert.equal(one('.ifc-historyAvg strong').textContent, 'Otherland, the 2 most recent years with a figure (2019 to 2021): about 10% a year on average.');
      assert.equal(one('.ifc-barsSvg').getAttribute('viewBox')?.split(' ')[2], '760');
      // Its average can be used as the rate: the root of 1.21, less one.
      fireEvent.click(screen.getByRole('button', { name: island.history.use }));
      assert.deepEqual(events.at(-1), ['free_inflation_average_used', undefined]);
      assert.equal(box(f.rate).value, '10');
      settle();
      // 10,000 x 1.1^10 = 25,937.
      assert.equal(headline(), 'about $25,900');
      assert.deepEqual(reportEntered().map((r) => r[0]), ['Question', f.amount.past, f.rate, f.years.past]);
    }
    {
      // Testland has every year: the starting year takes the place of the rate and the years, and nothing is asked for again
      choose(island.history.label, 'TST');
      assert.equal(asked.length, 3);
      assert.equal(waitingRequests(), 0);
      assert.equal(question(), fill(island.questions.pastCountry, { country: 'Testland' }));
      assert.deepEqual(labels(), [f.currency, f.amount.past, f.from]);
      const from = choice(f.from);
      assert.equal(from.className, 'ifc-input');
      assert.deepEqual([...from.options].map((o) => [o.value, o.textContent]), [['2015', '2015'], ['2016', '2016'], ['2017', '2017'], ['2018', '2018'], ['2019', '2019']]);
      // Ten years back, or as far as the figures go.
      assert.equal(from.value, '2015');
      const hint = one(`#${CSS.escape(from.getAttribute('aria-describedby') ?? '')}`);
      assert.equal(hint.textContent, 'Up to 2020, the latest year with a figure.');
      assert.equal(hint.className, 'ifc-hint');
      assert.ok(from.id.length > 1 && hint.id === `${from.id}-hint`);
      // With the starting year in use there is no rate box to put the average in.
      none('.ifc-linkBtn');
      none('.ifc-history .ifc-note');
      settle();
      // 10,000 x 1.1^5 = 16,105.
      assert.deepEqual(sentences(), ['In Testland, $10,000 in 2015 bought what about $16,100 bought in 2020.', 'Prices rose about 61% in total over those 5 years, an average of 10% a year.']);
      choose(f.from, '2018');
      assert.equal(choice(f.from).value, '2018');
      settle();
      // 10,000 x 1.21.
      assert.equal(headline(), 'about $12,100');
      assert.equal(shared(), 'm=p&c=USD&r=10&n=TST&f=2018');
    }
    {
      // the report and the spreadsheet say which history and which years were used
      assert.deepEqual(reportLines(), ['about $12,100', 'In Testland, $10,000 in 2018 bought what about $12,100 bought in 2020.', 'Prices rose about 21% in total over those 2 years, an average of 10% a year.']);
      assert.deepEqual(reportEntered(), [['Question', island.tabs.past], [f.amount.past, '10,000.00'], [island.export.country, 'Testland'], [f.from, '2018']]);
      assert.deepEqual(reportMethod(), [island.results.methodHistory]);
      fireEvent.click(xlsxButton());
      const file = await fileText(downloads[0].blob);
      assert.ok(file.includes('>What is an amount from the past worth today in Testland, using its actual yearly inflation?</t>'));
      assert.ok(file.includes('>Testland</t>'));
      assert.ok(file.includes('>2018 to 2020</t>'));
      assert.ok(!file.includes(`>${island.questions.past}</t>`));
    }
    {
      // the euro area is not a country, and a new country starts from its own default year
      choose(island.history.label, 'EMU');
      assert.equal(choice(f.currency).value, 'EUR');
      assert.equal(question(), island.questions.pastEuroArea);
      assert.deepEqual([...choice(f.from).options].map((o) => o.value), ['1998', '1999']);
      assert.equal(choice(f.from).value, '1998');
      assert.equal(shared(), 'm=p&r=10&n=EMU');
    }
    {
      // a country the history file does not have: said once, with no further request, and the typed rate is used
      choose(island.history.label, 'NOD');
      assert.equal(asked.length, 3);
      assert.deepEqual(historyNotes(), [['ifc-note ifc-note--warn', island.history.error]]);
      assert.equal(question(), island.questions.past);
      assert.deepEqual(labels(), [f.currency, f.amount.past, f.rate, f.years.past]);
      fireEvent.click(tab('buy'));
      assert.equal(fold()?.open, true);
    }
    {
      // no country again: counted as that, and the currency stays
      choose(island.history.label, '');
      assert.deepEqual(events.at(-1), ['free_inflation_country_changed', { country: 'none' }]);
      assert.equal(choice(f.currency).value, 'EUR');
      assert.equal(fold()?.open, true);
      assert.equal(one('.ifc-historyStatus').textContent, island.history.none);
      // On a question that types its rate, a country with every year still offers its average.
      choose(island.history.label, 'TST');
      assert.equal(screen.getAllByRole('button', { name: island.history.use }).length, 1);
      assert.deepEqual(labels(), [f.currency, f.amount.buy, f.rate, f.years.buy]);
      // Its history is context there, not part of the answer: the report and the spreadsheet do not claim it.
      settle();
      assert.deepEqual(reportEntered().map((r) => r[0]), ['Question', f.amount.buy, f.rate, f.years.buy]);
      fireEvent.click(xlsxButton());
      const file = await fileText(downloads[1].blob);
      assert.ok(file.includes('>What could an amount buy after some years of inflation, in today&apos;s money?</t>') || file.includes(`>${island.questions.buy}</t>`));
      assert.ok(!file.includes('Testland') && !file.includes(`>${island.export.country}</t>`) && !file.includes(`>${island.export.source}</t>`));
      events.pop();
    }
    {
      // every event was a choice
      assert.deepEqual(events.map(([name, sent]) => [name, sent && Object.keys(sent).join()]), [
        ['free_inflation_country_changed', 'country'], ['free_inflation_country_changed', 'country'], ['free_inflation_mode_changed', 'mode'],
        ['free_inflation_country_changed', 'country'], ['free_inflation_country_changed', 'country'], ['free_inflation_average_used', undefined],
        ['free_inflation_country_changed', 'country'], ['free_inflation_exported', 'format'], ['free_inflation_country_changed', 'country'],
        ['free_inflation_country_changed', 'country'], ['free_inflation_mode_changed', 'mode'], ['free_inflation_country_changed', 'country'], ['free_inflation_country_changed', 'country'],
      ]);
      assert.equal(window.location.href, ADDRESS);
    }
  });

  it('a page that starts with a country shows it from its own figures, keeps them when the rest arrives, and resets to them', async () => {
    // As the Hindi page does: rupees and one country, whose figures come with the page (0% in 2018, 50% in 2019).
    const view = mount({ defaultCurrency: 'INR', defaultCountry: 'TST', initialHistory: { code: 'TST', series: [2018, [0, 50]] } });
    assert.equal(asked.length, 0);
    assert.equal(choice(f.currency).value, 'INR');
    assert.equal(choice(island.history.label).value, 'TST');
    assert.equal(one('.ifc-historyStatus').textContent, 'Testland');
    assert.equal(fold()?.open, false);
    assert.equal(example(), island.example);
    assert.deepEqual(published, ['']);
    assert.equal(one('.ifc-historyAvg strong').textContent, 'Testland, 2018 to 2019: about 22.5% a year on average.');
    fireEvent.click(tab('past'));
    settle();
    // 10,000 x 1.5.
    assert.equal(sentences()[0], 'In Testland, ₹10,000 in 2018 bought what about ₹15,000 bought in 2019.');
    assert.equal(shared(), 'm=p&c=INR&n=TST');
    {
      // the other countries arrive, and the page's own figures for its country stand
      choose(island.history.label, 'EMU');
      await historyArrives();
      assert.deepEqual([...choice(f.from).options].map((o) => o.value), ['1998', '1999']);
      choose(island.history.label, 'TST');
      assert.deepEqual([...choice(f.from).options].map((o) => o.value), ['2018']);
    }
    {
      // the euros picked on this page are named for the page they are carried to
      choose(island.history.label, '');
      fireEvent.click(tab('buy'));
      assert.equal(shared(), 'c=USD');
      choose(f.currency, 'EUR');
      assert.equal(shared(), 'c=EUR');
    }
    {
      fireEvent.click(one('[data-attr="free-inflation-reset"]'));
      assert.equal(choice(f.currency).value, 'INR');
      assert.equal(choice(island.history.label).value, 'TST');
      assert.equal(example(), island.example);
      assert.equal(headline(), 'about ₹7,440');
      assert.equal(shared(), '');
    }
    {
      // a page given other countries knows them from then on
      view.rerender(page({ defaultCurrency: 'INR', defaultCountry: 'TST', countries: [...COUNTRIES.slice(0, 3), { code: 'TST', name: 'Testland', currency: 'GBP' }] }));
      choose(island.history.label, 'EMU');
      choose(island.history.label, 'TST');
      assert.equal(choice(f.currency).value, 'GBP');
    }
  });

  it('a shared link opens as it was shared, is counted once, and is kept for the language switch as it arrived', async () => {
    const referrer = Object.getOwnPropertyDescriptor(window.Document.prototype, 'referrer');
    try {
      {
        arriveWith('m=c&a=5000&r=7');
        mount();
        assert.deepEqual(selectedTab(), [island.tabs.cost]);
        assert.deepEqual(all('.ifc-grid input').map((i) => (i as HTMLInputElement).value), ['5000', '7', '10']);
        // The answer is there at once (5,000 x 1.967151 = 9,836), and can be copied on.
        assert.equal(headline(), 'about €9,840');
        assert.equal(withheld(), false);
        assert.deepEqual([shareButton(), xlsxButton(), pdfButton()].map(disabled), [false, false, false]);
        assert.equal(example(), '');
        assert.equal(fold()?.open, false);
        assert.deepEqual(events, [['free_inflation_shared_view_opened', { utm_source: null }]]);
        // Read before anything is kept: the link's own state is never replaced by an empty one.
        assert.deepEqual(published, ['m=c&a=5000&r=7']);
        assert.equal(window.location.href, ADDRESS);
        cleanup();
      }
      {
        // where the link came from is the one thing read from the address
        window.history.replaceState(null, '', '/free/?utm_source=share&utm_medium=referral');
        arriveWith('#a=5000');
        events.length = 0;
        mount();
        assert.equal(box(f.amount.buy).value, '5000');
        assert.deepEqual(events, [['free_inflation_shared_view_opened', { utm_source: 'share' }]]);
        window.history.replaceState(null, '', '/free/');
        cleanup();
      }
      {
        // a box the link could not carry arrives marked, in error, and is kept so
        arriveWith('a=?&y=20');
        published.length = 0;
        mount();
        assert.equal(box(f.amount.buy).value, '?');
        assert.equal(box(f.years.buy).value, '20');
        assert.equal(errorOf(f.amount.buy), `Error: ${t.export.fieldUnreadable}`);
        assert.equal(withheld(), true);
        assert.deepEqual(reason(), [island.results.fix]);
        assert.equal(reportLines(), null);
        const kept = formFromLink(shared() as string, 'en');
        assert.ok(kept && kept.amount === '?' && kept.years === '20');
        assert.equal(published.length, 1);
        cleanup();
      }
      {
        // a link naming a country opens its history; one naming a country the page does not know opens without it
        arriveWith('m=p&n=TST&f=2018');
        events.length = 0;
        mount();
        await historyArrives();
        assert.equal(fold(), null);
        assert.equal(choice(island.history.label).value, 'TST');
        assert.equal(choice(f.from).value, '2018');
        assert.equal(headline(), 'about €12,100');
        cleanup();
        arriveWith('n=TST');
        mount();
        await historyArrives();
        assert.equal(fold()?.open, true);
        cleanup();
        arriveWith('m=p&n=ZZZ&a=250');
        published.length = 0;
        mount();
        assert.equal(choice(island.history.label).value, '');
        assert.equal(box(f.amount.past).value, '250');
        assert.equal(question(), island.questions.past);
        assert.deepEqual(published, ['m=p&a=250']);
        cleanup();
        // The page's own country is no reason to open the fold.
        arriveWith('n=TST&a=250');
        mount({ defaultCountry: 'TST', initialHistory: { code: 'TST', series: [2018, [0, 50]] } });
        assert.equal(choice(island.history.label).value, 'TST');
        assert.equal(fold()?.open, false);
        cleanup();
      }
      {
        // what is not a link's state is left alone: the page opens as itself, and nothing is counted
        for (const left of [{ a: '5000' }, 42, 'utm_source=share', '']) {
          arriveWith(left);
          events.length = 0;
          published.length = 0;
          mount();
          assert.equal(box(f.amount.buy).value, '10000');
          assert.equal(example(), island.example);
          assert.deepEqual(events, []);
          assert.deepEqual(published, ['']);
          cleanup();
        }
      }
      {
        // arriving by the language switch from this page in another language: opened as shared, not counted again
        Object.defineProperty(document, 'referrer', { configurable: true, get: () => 'https://nidhi.today/hi/free/' });
        arriveWith('a=5000');
        events.length = 0;
        mount();
        assert.equal(box(f.amount.buy).value, '5000');
        assert.equal(headline(), 'about €3,720');
        assert.deepEqual(events, []);
      }
    } finally {
      if (referrer) Object.defineProperty(window.Document.prototype, 'referrer', referrer);
      delete (document as unknown as Record<string, unknown>).referrer;
      window.history.replaceState(null, '', '/free/');
    }
  });

  it('drawn on the server, a page whose country is still to come says it is loading, not that it failed', () => {
    const html = renderToString(page({ defaultCountry: 'TST' }));
    assert.ok(html.includes(island.history.loading));
    assert.ok(!html.includes(island.history.error));
  });

  it('a shared link is read again in the number style the page is given later', () => {
    arriveWith('r=2.5');
    const view = mount();
    assert.equal(box(f.rate).value, '2.5');
    view.rerender(page({ numberLocale: 'cs' }));
    assert.equal(box(f.rate).value, '2,5');
  });

  it('with no starting year chosen, the history starts ten years before its latest, even for figures that begin in year 0', () => {
    // Twelve years of 10%, years 0 to 11: the starting years are 0 to 10, and ten years back from 11 is 1.
    mount({ defaultCountry: 'TST', initialHistory: { code: 'TST', series: [0, Array(12).fill(10)] } });
    fireEvent.click(tab('past'));
    assert.equal(choice(f.from).options[0].value, '0');
    assert.equal(choice(f.from).value, '1');
  });

  it('a page whose own currency the tool does not list still answers, its report to two decimal places', () => {
    // The Kuwaiti dinar is not one of the tool's currencies: the report falls back to cents.
    mount({ defaultCurrency: 'KWD' });
    assert.equal(headline()?.replace(/\s/g, ' '), 'about KWD 7,440');
    assert.deepEqual(reportEntered()[1], [f.amount.buy, '10,000.00']);
  });

  it('a page with its own number style reads and writes figures that way, and its amounts in its amount style', async () => {
    const czech = (n: number) => n.toLocaleString('cs');
    assert.notEqual(czech(10_000), '10,000');
    mount({ numberLocale: 'cs', amountLocale: 'es' });
    assert.equal(headline(), 'about 7440 €');
    assert.equal(text('.ifc-hint')[0], `${czech(0)} to ${czech(10_000)}, up to two decimal places`);
    // The report for paper follows the amounts' style.
    assert.deepEqual(reportEntered()[1], [f.amount.buy, '10.000,00']);
    type(f.rate, '2,5');
    assert.equal(errorOf(f.rate), null);
    settle();
    // 10,000 / 1.025^10 = 7,812.
    assert.equal(headline(), 'about 7810 €');
    assert.equal(shared(), 'r=2.5');
    type(f.amount.buy, 'x');
    type(f.rate, '2.5.1');
    assert.equal(errorOf(f.amount.buy), `Error: Enter an amount from ${czech(0)} to ${czech(1e12)}, with up to two decimal places.`);
    assert.equal(errorOf(f.rate), `Error: Enter a rate from ${czech(0)} to ${czech(10_000)}, with up to two decimal places.`);
    fireEvent.click(tab('keep'));
    type(f.growth, 'x');
    assert.equal(errorOf(f.growth), `Error: Enter a rate from ${czech(-99.99)} to ${czech(10_000)}, with up to two decimal places.`);
    // An average put in the rate box is written the page's way: the cube root of 1.1, less one, is 3.23%.
    fireEvent.click(tab('buy'));
    choose(island.history.label, 'EMU');
    await historyArrives();
    fireEvent.click(screen.getByRole('button', { name: island.history.use }));
    assert.equal(box(f.rate).value, '3,23');
    assert.equal(errorOf(f.rate), null);
  });
});

describe('a history that arrives after the reader has moved on (#867)', () => {
  it('is not taken for a failure: going back to the country uses it', async () => {
    mount();
    // A country, then "No country" before its history comes.
    choose(island.history.label, 'TST');
    choose(island.history.label, '');
    await historyArrives();
    choose(island.history.label, 'TST');
    await historyArrives();
    none('.ifc-note--warn');
    assert.ok(!historyNotes().some(([, said]) => said === island.history.error), 'said to have failed');
    assert.equal(one('.ifc-historyStatus').textContent, 'Testland');
    assert.ok(document.querySelector('.ifc-historyAvg strong'), 'the history is not shown');
  });
});
