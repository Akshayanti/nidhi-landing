/**
 * ToolExport: the free tools' "Save or share these results" block. Its two
 * buttons act only when there are results, stay focusable and say why when
 * there are none, and carry nothing for analytics but their fixed label.
 * The printed report has its own files (ToolExport.report.dom.test.tsx and
 * ToolExport.chart.dom.test.tsx).
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { clock } from '../../test/windowClock.ts';
import { dict } from '../i18n/index.ts';
import { SwapLabel, ToolExport } from './ToolExport.tsx';

const strings = dict('en').tools.export;
const realAgent = window.navigator.userAgent;
const browseWith = (userAgent: string) => Object.defineProperty(window.navigator, 'userAgent', { value: userAgent, configurable: true });

beforeEach(() => clock.install());
afterEach(() => {
  cleanup();
  clock.restore();
  browseWith(realAgent);
});

describe('a button label that changes for a moment', () => {
  it('shows the label and keeps room for the other one, hidden', () => {
    assert.equal(
      renderToStaticMarkup(<SwapLabel label="Copy link" alternate="Copied" swapped={false} />),
      '<span class="tool-swapLabel"><span>Copy link</span><span class="tool-swapLabel__ghost" aria-hidden="true">Copied</span></span>',
    );
  });

  it('shows the other label once swapped, as the button name', () => {
    assert.equal(
      renderToStaticMarkup(<SwapLabel label="Copy link" alternate="Copied" swapped />),
      '<span class="tool-swapLabel"><span>Copied</span><span class="tool-swapLabel__ghost" aria-hidden="true">Copy link</span></span>',
    );
  });

  it('keeps the button name for a screen reader when the tool announces the change itself', () => {
    assert.equal(
      renderToStaticMarkup(<SwapLabel label="Copy link" alternate="Copied" swapped steady />),
      '<span class="tool-swapLabel"><span aria-hidden="true">Copied</span><span class="tool-swapLabel__ghost" aria-hidden="true">Copy link</span><span class="chart-srOnly">Copy link</span></span>',
    );
    assert.equal(
      renderToStaticMarkup(<SwapLabel label="Copy link" alternate="Copied" swapped={false} steady />),
      '<span class="tool-swapLabel"><span>Copy link</span><span class="tool-swapLabel__ghost" aria-hidden="true">Copied</span></span>',
    );
  });
});

function mount(props: Partial<Parameters<typeof ToolExport>[0]> = {}) {
  const calls = { spreadsheet: 0, print: 0 };
  const view = render(
    <ToolExport
      strings={strings}
      xlsxAttr="tool-test-xlsx"
      pdfAttr="tool-test-pdf"
      ready
      onSpreadsheet={() => { calls.spreadsheet += 1; }}
      onPrint={() => { calls.print += 1; }}
      {...props}
    />,
  );
  const section = view.container.querySelector('section') as HTMLElement;
  return {
    view,
    calls,
    section,
    spreadsheet: screen.getByRole('button', { name: strings.spreadsheet }),
    print: screen.getByRole('button', { name: strings.print }),
    status: screen.getByRole('status'),
    notes: () => [...section.querySelectorAll('p.tool-exportNote')].map((p) => p.textContent),
  };
}

describe('the save or share block', () => {
  it('is a section named by its heading, with the share button first and what a copy leaves after the buttons', () => {
    const { section } = mount({ share: <button type="button">Copy link</button>, shareResult: <span>nidhi.today/free/</span> });
    assert.equal(section.className, 'tool-export');
    const heading = section.querySelector('h3') as HTMLElement;
    assert.equal(heading.textContent, strings.heading);
    assert.equal(heading.className, 'tool-exportHeading');
    assert.ok(heading.id);
    assert.equal(section.getAttribute('aria-labelledby'), heading.id);
    const row = section.querySelector('.tool-exportButtons') as HTMLElement;
    assert.deepEqual([...row.children].map((el) => el.textContent), ['Copy link', strings.spreadsheet, strings.print, 'nidhi.today/free/']);
  });

  it('gives each button its fixed analytics label and nothing else to read', () => {
    const { spreadsheet, print } = mount();
    for (const [button, label] of [[spreadsheet, 'tool-test-xlsx'], [print, 'tool-test-pdf']] as const) {
      assert.equal(button.getAttribute('data-attr'), label);
      assert.deepEqual(button.getAttributeNames().sort(), ['class', 'data-attr', 'type']);
      assert.equal(button.getAttribute('type'), 'button');
      assert.equal(button.className, 'btn btn--outline tool-exportBtn');
    }
  });

  it('says the files are made on the device, and nothing more while the results are showing', () => {
    const { notes, status } = mount();
    assert.deepEqual(notes(), [strings.note]);
    assert.equal(status.textContent, '');
    assert.equal(status.className, 'tool-exportStatus');
  });

  it('makes the spreadsheet and says so, since some phones save without a sign', () => {
    const { spreadsheet, status, calls } = mount();
    fireEvent.click(spreadsheet);
    assert.deepEqual(calls, { spreadsheet: 1, print: 0 });
    assert.equal(status.textContent, strings.downloaded);
    clock.pass(5999);
    assert.equal(status.textContent, strings.downloaded);
    clock.pass(1);
    assert.equal(status.textContent, '');
    assert.equal(clock.waiting, 0);
    // A second download is said again.
    fireEvent.click(spreadsheet);
    assert.equal(status.textContent, strings.downloaded);
    assert.equal(calls.spreadsheet, 2);
  });

  it('stops its timer when it leaves the page', () => {
    const { spreadsheet, view } = mount();
    assert.equal(clock.waiting, 0);
    fireEvent.click(spreadsheet);
    assert.equal(clock.waiting, 1);
    view.unmount();
    assert.equal(clock.waiting, 0);
  });

  it('opens the print dialog and announces nothing', () => {
    const { print, status, calls } = mount();
    fireEvent.click(print);
    assert.deepEqual(calls, { spreadsheet: 0, print: 1 });
    assert.equal(status.textContent, '');
    assert.equal(clock.waiting, 0);
  });

  it('does nothing while there are no results, and says why, with the buttons still focusable', () => {
    const { spreadsheet, print, status, calls, notes, section } = mount({ ready: false });
    assert.deepEqual(notes(), [strings.note, strings.notReady]);
    const reason = [...section.querySelectorAll('p')].find((p) => p.textContent === strings.notReady) as HTMLElement;
    assert.ok(reason.id);
    for (const button of [spreadsheet, print]) {
      assert.equal(button.getAttribute('aria-disabled'), 'true');
      assert.equal(button.hasAttribute('disabled'), false);
      assert.equal(button.getAttribute('aria-describedby'), reason.id);
      fireEvent.click(button);
    }
    assert.deepEqual(calls, { spreadsheet: 0, print: 0 });
    assert.equal(status.textContent, '');
    assert.notEqual(reason.id, section.querySelector('h3')!.id);
  });

  it('says nothing for the moment a keystroke takes to settle, and still does nothing', () => {
    const { spreadsheet, print, status, calls, notes } = mount({ ready: false, settling: true });
    assert.deepEqual(notes(), [strings.note]);
    for (const button of [spreadsheet, print]) {
      assert.equal(button.getAttribute('aria-disabled'), 'true');
      assert.equal(button.hasAttribute('aria-describedby'), false);
      fireEvent.click(button);
    }
    assert.deepEqual(calls, { spreadsheet: 0, print: 0 });
    assert.equal(status.textContent, '');
  });

  it('works as usual when results are showing, whatever is settling', () => {
    const { spreadsheet, calls, notes } = mount({ ready: true, settling: true });
    assert.deepEqual(notes(), [strings.note]);
    assert.equal(spreadsheet.hasAttribute('aria-disabled'), false);
    fireEvent.click(spreadsheet);
    assert.equal(calls.spreadsheet, 1);
  });

  it('does not carry the in-app line in the page as it is built', () => {
    const html = renderToStaticMarkup(
      <ToolExport strings={strings} xlsxAttr="tool-test-xlsx" pdfAttr="tool-test-pdf" ready onSpreadsheet={() => {}} onPrint={() => {}} />,
    );
    assert.equal(html.includes('tool-exportNote--app'), false);
    assert.equal(html.includes('tool-exportNote'), true);
  });

  it('tells a reader inside Instagram or Facebook to open the page in a browser first', () => {
    for (const app of ['Instagram 300.0', 'FBAN/FBIOS', '[FBAV/400.0]', 'FB_IAB/FB4A', 'x FBIOS x']) {
      browseWith(`Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 ${app}`);
      const { notes, section } = mount();
      assert.deepEqual(notes(), [strings.note, strings.inApp], app);
      assert.equal(section.querySelector('.tool-exportNote--app')!.textContent, strings.inApp);
      cleanup();
    }
  });
});
