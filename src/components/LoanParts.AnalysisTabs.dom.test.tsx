/**
 * The loan comparison's analysis views (`AnalysisTabs` and `HowItWorksPanel`
 * in LoanCompare.tsx), each mounted by itself. The charts panel behind the
 * first tab has its own file, LoanParts.ChartsPanel.dom.test.tsx.
 *
 * The tab list: that it is a real set of tabs (roles, which one is selected,
 * the one panel in the page and its name), what the arrow keys, Home and End
 * do and where focus goes, what choosing a tab tells the page and analytics,
 * and that each tab keeps its analytics label. The views behind the tabs are
 * read only far enough to say which one is open.
 *
 * The how-it-works panel: its words, from the page's own strings.
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { useState } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { loanComparisonEn, loanComparisonHi } from '../i18n/strings/tools/loanComparison.ts';
import { exportEn, exportHi } from '../i18n/strings/tools/export.ts';
import { computeFromInput } from '../utils/loan/inputs.ts';
import type { LoanResult } from '../utils/loan/math.ts';
import { DEFAULT_GLOBAL_STATE, makeAddedVendor, type AnalysisTab, type GlobalState, type VendorInput } from '../utils/loan/url.ts';
import { ChartWordsContext } from './ChartAmounts.tsx';
import { AnalysisTabs, HowItWorksPanel } from './LoanCompare.tsx';

// This tool's own strings, from the modules that define them: not the whole catalog,
// which would tie this file to every tool's strings (#904).
const TOOL_STRINGS = {
  en: { loanComparison: loanComparisonEn, export: exportEn },
  hi: { loanComparison: loanComparisonHi, export: exportHi },
};

const tools = TOOL_STRINGS.en;
const island = tools.loanComparison.island;
const g = globalThis as unknown as Record<string, unknown>;
const win = window as unknown as { posthog?: unknown };

// The offers, as the reader would have typed them, in euros.

const offer = (slot: number, typed: Partial<VendorInput>): VendorInput => ({ ...makeAddedVendor(slot), ...typed });
const worked = (offers: VendorInput[]) => offers.map((v) => computeFromInput(v, 'EUR'));

/** €1,200 over a year at 0%: €100 a month, all of it principal; €1,200.00 in all. */
const UNION = offer(0, { name: 'Credit union', principal: '1200', annualRatePct: '0', termMonths: '12' });
/**
 * €1,000 over six months at 12% a year, 1% a month, under the name the tool
 * gave the second slot. The payment is 1000 × 0.01 / (1 − 1.01^−6) = €172.55,
 * the first month's interest €10.00 and its principal €162.55. Six payments
 * come to about €1,035, less than the credit union's €1,200.
 */
const SECOND = offer(1, { principal: '1000', annualRatePct: '12', termMonths: '6' });
/** An offer the engine refuses: no loan amount. Two of them make the quickest views to draw. */
const NO_AMOUNT = offer(2, { name: 'Online lender', principal: '0' });

// What the tests listen to.

/** What the page was told: the part of the view state that changed. */
let told: unknown[] = [];
/** What analytics was sent. */
let sent: unknown[][] = [];
/** The frames the browser has been asked for and has not drawn yet. */
let frames: (() => void)[] = [];
let keptFrame: unknown;

beforeEach(() => {
  told = [];
  sent = [];
  frames = [];
  keptFrame = g.requestAnimationFrame;
  g.requestAnimationFrame = (draw: () => void) => frames.push(draw);
  win.posthog = { capture: (...event: unknown[]) => { sent.push(event); } };
});
afterEach(() => {
  cleanup();
  g.requestAnimationFrame = keptFrame;
  delete win.posthog;
});

/** The browser draws its next frame. */
function nextFrame() {
  act(() => {
    for (const draw of frames.splice(0)) draw();
  });
}

const all = (root: ParentNode, selector: string) => [...root.querySelectorAll(selector)];
const one = (root: ParentNode, selector: string) => {
  const found = all(root, selector);
  assert.equal(found.length, 1, `one ${selector}`);
  return found[0] as HTMLElement;
};
const texts = (root: ParentNode, selector: string) => all(root, selector).map((el) => el.textContent);
const attrs = (root: ParentNode, selector: string, name: string) => all(root, selector).map((el) => el.getAttribute(name));

// ---- The tabs -----------------------------------------------------------------

/** The tabs as the page holds them: it keeps the view state and hands it back. */
function Tabs({ start, offers, results }: { start: AnalysisTab; offers: VendorInput[]; results: LoanResult[] }) {
  const [view, setView] = useState<GlobalState>({ ...DEFAULT_GLOBAL_STATE, currency: 'EUR', activeTab: start });
  return (
    <ChartWordsContext.Provider value={tools.export.chart}>
      <AnalysisTabs
        vendors={offers}
        results={results}
        currency="EUR"
        cheapestByTotal={1}
        splitVendorIdx={null}
        onSplitVendorChange={() => {}}
        globalState={view}
        onGlobalChange={(patch) => {
          told.push(patch);
          setView((was) => ({ ...was, ...patch }));
        }}
        onRefiSaid={() => {}}
        strings={island}
      />
    </ChartWordsContext.Provider>
  );
}

function openTabs(start: AnalysisTab = 'charts', offers: VendorInput[] = [NO_AMOUNT, NO_AMOUNT]) {
  const { container, unmount } = render(<Tabs start={start} offers={offers} results={worked(offers)} />);
  const tabs = all(container, '[role="tab"]') as HTMLElement[];
  return { container, unmount, tabs, tab: (name: string) => tabs.find((t) => t.textContent === name)! };
}

/** The name of the selected tab, after checking it is the only one selected and the only one in the tab order. */
function selected(container: Element) {
  const tabs = all(container, '[role="tab"]');
  const on = tabs.filter((t) => t.getAttribute('aria-selected') === 'true');
  assert.equal(on.length, 1, 'one tab is selected');
  assert.deepEqual(tabs.filter((t) => t !== on[0]).map((t) => t.getAttribute('aria-selected')), ['false', 'false', 'false']);
  assert.deepEqual(tabs.map((t) => t.getAttribute('tabindex')), tabs.map((t) => (t === on[0] ? '0' : '-1')), 'only the selected tab is in the tab order');
  return on[0].textContent;
}

/** A key pressed on the focused tab: whether the browser's own handling was stopped. */
function press(key: string) {
  const from = document.activeElement as HTMLElement;
  assert.equal(from.getAttribute('role'), 'tab', 'a tab has focus');
  const stopped = !fireEvent.keyDown(from, { key });
  nextFrame();
  return stopped;
}

/** Which tab has focus. */
const focused = () => (document.activeElement?.getAttribute('role') === 'tab' ? document.activeElement.textContent : null);

describe('the analysis tabs', () => {
  it('are a named region holding a named list of four tabs, each with its name, its hint and its analytics label', () => {
    const { container } = openTabs();
    const region = one(container, 'section.lc-analysis');
    assert.equal(region.getAttribute('aria-label'), 'Analysis');
    const list = one(region, '[role="tablist"]');
    assert.equal(list.getAttribute('aria-label'), 'Analysis views');
    assert.deepEqual(texts(list, 'button[role="tab"]'), ['Charts', 'Horizon', 'Refinance', 'How it works']);
    assert.deepEqual(attrs(list, '[role="tab"]', 'title'), [
      'Balance over time and how each payment splits',
      'Where you stand if you sell or refinance early',
      'Compare keep vs. refinance with break-even',
      'Formula and methodology',
    ]);
    assert.deepEqual(attrs(list, '[role="tab"]', 'data-attr'), ['lc-tab-charts', 'lc-tab-horizon', 'lc-tab-refi', 'lc-tab-how']);
    assert.deepEqual(attrs(list, '[role="tab"]', 'type'), ['button', 'button', 'button', 'button']);
  });

  it('mark the open tab, and only it, as selected, in the tab order and highlighted', () => {
    const { container } = openTabs('refi');
    assert.equal(selected(container), 'Refinance');
    assert.deepEqual(attrs(container, '[role="tab"]', 'class').map((c) => c?.trim()), ['lc-tab', 'lc-tab', 'lc-tab lc-tabActive', 'lc-tab']);
  });

  it('have one panel, which the open tab controls and which takes its name from that tab', () => {
    for (const [start, name] of [['charts', 'Charts'], ['horizon', 'Horizon'], ['refi', 'Refinance'], ['how', 'How it works']] as const) {
      const { container, tabs, tab, unmount } = openTabs(start);
      const panel = one(container, '[role="tabpanel"]');
      assert.ok(panel.classList.contains('lc-tabPanel'));
      const ids = tabs.map((t) => t.id);
      assert.equal(new Set(ids.filter(Boolean)).size, 4, 'each tab has its own id');
      assert.ok(panel.id !== '' && !ids.includes(panel.id));
      // The panel is named by the open tab.
      const namedBy = document.getElementById(panel.getAttribute('aria-labelledby') ?? '');
      assert.ok(namedBy === tab(name), `the ${name} panel is named by its tab`);
      // The open tab says which panel it controls; the others have no panel in the page and name none.
      assert.ok(document.getElementById(tab(name).getAttribute('aria-controls') ?? '') === panel);
      assert.deepEqual(tabs.filter((t) => t.hasAttribute('aria-controls')).map((t) => t.textContent), [name]);
      unmount();
    }
  });

  it('show the view of the open tab and no other', () => {
    const views: [AnalysisTab, string, string][] = [
      ['charts', '.lc-chartsPanel', 'Balance over time'],
      ['horizon', '.lc-horizonSection', 'If I sell or refinance at...'],
      ['refi', '.lc-refiSection', 'Refinance scenario'],
      ['how', '.lc-howPanel', 'How the comparison works'],
    ];
    for (const [start, view, heading] of views) {
      const { container, unmount } = openTabs(start);
      const panel = one(container, '[role="tabpanel"]');
      assert.equal(panel.children.length, 1, `${start}: one view in the panel`);
      assert.ok(panel.firstElementChild!.matches(view), `${start}: the panel holds ${view}`);
      assert.equal(all(panel, 'h3')[0].textContent, heading);
      unmount();
    }
  });

  it('hand the charts the offers they were given', () => {
    const { container } = openTabs('charts', [UNION, SECOND]);
    assert.equal(one(container, '.lc-balanceLegend').textContent, 'Credit unionpaid off in 1 yrOffer Bpaid off in 6 mo');
    // No offer chosen by hand: the one the page calls lowest in cost, the second.
    assert.equal(one(container, '.lc-splitCaption strong').textContent, 'Offer B');
  });

  it('tell the page which tab was clicked, open it, and send analytics the tab and that it was a click', () => {
    const { container, tab } = openTabs('charts');
    fireEvent.click(tab('How it works'));
    assert.deepEqual(told.at(-1), { activeTab: 'how' });
    assert.equal(selected(container), 'How it works');
    assert.equal(one(container, '[role="tabpanel"] h3').textContent, 'How the comparison works');
    fireEvent.click(tab('Horizon'));
    assert.deepEqual(told.at(-1), { activeTab: 'horizon' });
    assert.deepEqual(sent, [
      ['free_loan_comparison_tab_changed', { tab: 'how', via: 'click' }],
      ['free_loan_comparison_tab_changed', { tab: 'horizon', via: 'click' }],
    ]);
  });

  it('move to the next tab with the right and down arrows, selection and focus together, and wrap at the end', () => {
    const { container, tab } = openTabs('horizon');
    tab('Horizon').focus();
    assert.ok(press('ArrowRight'), 'the arrow does not also scroll the page');
    assert.deepEqual(told.at(-1), { activeTab: 'refi' });
    assert.equal(selected(container), 'Refinance');
    assert.equal(focused(), 'Refinance');
    assert.ok(press('ArrowDown'));
    assert.equal(selected(container), 'How it works');
    assert.equal(focused(), 'How it works');
    assert.ok(press('ArrowRight'));
    assert.deepEqual(told.at(-1), { activeTab: 'charts' });
    assert.equal(selected(container), 'Charts');
    assert.equal(focused(), 'Charts');
    assert.ok(press('ArrowDown'));
    assert.equal(selected(container), 'Horizon');
    assert.equal(focused(), 'Horizon');
  });

  it('move to the tab before with the left and up arrows, and wrap at the start', () => {
    const { container, tab } = openTabs('refi');
    tab('Refinance').focus();
    assert.ok(press('ArrowLeft'));
    assert.deepEqual(told.at(-1), { activeTab: 'horizon' });
    assert.equal(selected(container), 'Horizon');
    assert.equal(focused(), 'Horizon');
    assert.ok(press('ArrowUp'));
    assert.equal(selected(container), 'Charts');
    assert.equal(focused(), 'Charts');
    assert.ok(press('ArrowLeft'));
    assert.deepEqual(told.at(-1), { activeTab: 'how' });
    assert.equal(selected(container), 'How it works');
    assert.equal(focused(), 'How it works');
    assert.ok(press('ArrowUp'));
    assert.equal(selected(container), 'Refinance');
    assert.equal(focused(), 'Refinance');
  });

  it('go to the first tab on Home and the last on End', () => {
    const { container, tab } = openTabs('refi');
    tab('Refinance').focus();
    assert.ok(press('Home'));
    assert.deepEqual(told.at(-1), { activeTab: 'charts' });
    assert.equal(selected(container), 'Charts');
    assert.equal(focused(), 'Charts');
    assert.ok(press('End'));
    assert.deepEqual(told.at(-1), { activeTab: 'how' });
    assert.equal(selected(container), 'How it works');
    assert.equal(focused(), 'How it works');
    // From the middle again, so End is not just "the tab before the first".
    fireEvent.click(tab('Horizon'));
    tab('Horizon').focus();
    assert.ok(press('End'));
    assert.equal(selected(container), 'How it works');
    assert.equal(focused(), 'How it works');
  });

  it('send analytics the tab a key opened, and that it was the keyboard', () => {
    const { tab } = openTabs('charts');
    tab('Charts').focus();
    press('ArrowRight');
    press('End');
    assert.deepEqual(sent, [
      ['free_loan_comparison_tab_changed', { tab: 'horizon', via: 'keyboard' }],
      ['free_loan_comparison_tab_changed', { tab: 'how', via: 'keyboard' }],
    ]);
  });

  it('leave every other key to the browser: nothing is selected, moved or sent', () => {
    const { container, tab } = openTabs('horizon');
    tab('Horizon').focus();
    for (const key of ['Tab', 'Enter', ' ', 'a', 'PageDown', 'Escape', '']) {
      assert.ok(!press(key), `"${key}" is left to the browser`);
    }
    assert.equal(told.length, 0);
    assert.equal(sent.length, 0);
    assert.equal(selected(container), 'Horizon');
    assert.equal(focused(), 'Horizon');
  });

  it('do not fail when the tool goes away between a key and the next frame', () => {
    const { tab, unmount } = openTabs('charts');
    tab('Charts').focus();
    fireEvent.keyDown(tab('Charts'), { key: 'ArrowRight' });
    unmount();
    assert.equal(frames.length, 1, 'the move of focus was still waiting for its frame');
    assert.doesNotThrow(() => frames.forEach((draw) => draw()));
  });

  it('tell the page the horizon the reader chose, as typed and with nothing else', () => {
    const { container } = openTabs('horizon', [UNION, SECOND]);
    const slider = one(container, '.lc-horizonSection input[type="range"]') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '7' } });
    assert.deepEqual(told.at(-1), { horizonMonths: '7' });
    assert.equal(slider.value, '7');
  });
});

// ---- How it works ---------------------------------------------------------------

describe('the how-it-works panel', () => {
  it('gives the heading, the formula and what its letters stand for', () => {
    const { container } = render(<HowItWorksPanel strings={island} />);
    const panel = one(container, '.lc-howPanel');
    assert.equal(one(panel, 'h3').textContent, 'How the comparison works');
    assert.equal(all(panel, 'p')[0].textContent, 'For each lender, the calculator builds a full amortization schedule using the standard fully-amortizing formula:');
    assert.equal(one(panel, '.lc-formula code').textContent, 'M = P · r / (1 − (1 + r)−n)');
    assert.equal(one(panel, '.lc-formula sup').textContent, '−n');
    const points = all(panel, 'ul.lc-howList > li');
    assert.equal(points.length, 6);
    assert.equal(points[0].textContent, 'P is the loan principal, r is the monthly interest rate (annual rate ÷ 12), and n is the number of monthly payments.');
    assert.deepEqual(texts(points[0], 'strong'), ['P', 'r', 'n']);
  });

  it('explains the monthly interest, the APR, rate changes, lump sums and penalties, and that nothing is sent', () => {
    const { container } = render(<HowItWorksPanel strings={island} />);
    const panel = one(container, '.lc-howPanel');
    const points = all(panel, 'ul.lc-howList > li');
    assert.equal(points[1].textContent, island.how.monthly);
    assert.ok(island.how.monthly.includes('this calculator charges a twelfth of the yearly rate every month'));
    assert.deepEqual(points.slice(2).map((li) => one(li, 'strong').textContent), ['APR', 'Fixed-then-variable loans', 'Lump-sum prepayments', 'Prepayment penalties']);
    assert.deepEqual(points.slice(2).map((li) => li.textContent), [
      `APR${island.how.apr.rest}`,
      `Fixed-then-variable loans${island.how.hybrid.rest}`,
      `Lump-sum prepayments${island.how.lumps.rest}`,
      `Prepayment penalties${island.how.penalties.rest}`,
    ]);
    assert.ok(island.how.apr.rest.startsWith(' folds the origination/closing fee into the rate'));
    assert.ok(island.how.lumps.rest.includes('applied as principal AFTER the regular monthly payment'));
    assert.equal(one(panel, '.lc-howNote').textContent, 'Everything runs in your browser, and nothing you type is sent anywhere. Use the “Copy shareable link” button to encode every input into a URL you can hand to someone else.');
  });

  it('reads in the language of the page', () => {
    const hindi = TOOL_STRINGS.hi.loanComparison.island;
    const { container } = render(<HowItWorksPanel strings={hindi} />);
    assert.equal(one(container, '.lc-howPanel h3').textContent, hindi.how.heading);
    assert.equal(one(container, '.lc-howNote').textContent, hindi.how.note);
    assert.notEqual(hindi.how.heading, island.how.heading);
  });
});
