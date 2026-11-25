/**
 * SwapLabel, the label of a button that changes for a moment ("Copy link",
 * then "Copied"): what is shown, what keeps the button's size, and what a
 * screen reader is given. Drawn to markup, so it needs no browser.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { SwapLabel } from './ToolExport.tsx';

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
