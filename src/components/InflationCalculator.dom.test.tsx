import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { cleanup, render, screen } from '@testing-library/react';
import { dict } from '../i18n/index.ts';
import InflationCalculator from './InflationCalculator.tsx';

afterEach(cleanup);

describe('the inflation calculator, mounted', () => {
  it('renders its form', () => {
    const t = dict('en').tools;
    render(
      <InflationCalculator
        strings={t.inflation.island}
        exportStrings={t.export}
        defaultCurrency="EUR"
        defaultCountry=""
        countries={[]}
        initialHistory={null}
        historyUrl="/data/inflation/"
        numberLocale="en-US"
        amountLocale={null}
      />,
    );
    assert.ok(screen.getAllByRole('textbox').length > 0);
  });
});
