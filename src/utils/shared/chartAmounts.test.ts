import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { amountScale, axisHeading, axisTick, chartLabel, currencyMark, readsAsZero } from './chartAmounts.ts';
import { exportCs, exportEn, exportEs, exportHi, exportMr } from '../../i18n/strings/tools/export.ts';

const NBSP = '\u00a0';

describe('the scale follows the number style the page uses for the amount', () => {
  it('counts rupees in thousands, lakhs and crores where the page writes them the Indian way', () => {
    assert.equal(amountScale(999, 'INR'), 'none');
    assert.equal(amountScale(54_700, 'INR'), 'thousand');
    assert.equal(amountScale(1_870_000, 'INR'), 'lakh');
    assert.equal(amountScale(10_900_000, 'INR'), 'crore');
  });

  it('counts every other currency in thousands, millions and thousand millions', () => {
    assert.equal(amountScale(547_000, 'EUR'), 'thousand');
    assert.equal(amountScale(2_160_000, 'EUR'), 'million');
    assert.equal(amountScale(3e9, 'CZK'), 'billion');
    assert.equal(amountScale(-2_160_000, 'USD'), 'million', 'by size, whatever the sign');
  });

  it('counts rupees the western way on a page with its own amount style', () => {
    assert.equal(amountScale(1_870_000, 'INR', 'es'), 'million');
    assert.equal(amountScale(1_870_000, 'INR', 'cs'), 'million');
  });

  it('counts every currency in lakhs and crores on a page that groups its own numbers that way (#678)', () => {
    assert.equal(amountScale(547_000, 'EUR', null, 'en-IN'), 'lakh');
    assert.equal(amountScale(2_160_000, 'EUR', null, 'en-IN'), 'lakh');
    assert.equal(amountScale(3e9, 'USD', null, 'en-IN'), 'crore');
    assert.equal(amountScale(54_700, 'GBP', null, 'en-IN'), 'thousand');
    assert.equal(amountScale(2_160_000, 'EUR', null, 'en'), 'million', 'English keeps millions');
    assert.equal(amountScale(1_870_000, 'INR', 'es', 'es'), 'million', 'a page with its own amount style keeps its own');
  });

  it('has no scale for what is not a number', () => {
    assert.equal(amountScale(NaN, 'EUR'), 'none');
    assert.equal(amountScale(Infinity, 'EUR'), 'none');
  });
});

describe('the heading over a chart', () => {
  it('names the scale and the currency once, in each language', () => {
    assert.equal(axisHeading(exportEn.chart, 'thousand', 'EUR'), 'Amounts in thousands of €');
    assert.equal(axisHeading(exportEn.chart, 'lakh', 'INR'), 'Amounts in lakhs of ₹');
    assert.equal(axisHeading(exportEn.chart, 'billion', 'USD'), 'Amounts in billions of $');
    assert.equal(axisHeading(exportHi.chart, 'lakh', 'INR'), `राशियाँ (लाख ₹${NBSP}में)`);
    assert.equal(axisHeading(exportHi.chart, 'million', 'EUR'), `राशियाँ (दस लाख €${NBSP}में)`);
    assert.equal(axisHeading(exportMr.chart, 'crore', 'INR'), `रकमा (कोटी ₹${NBSP}मध्ये)`);
    assert.equal(axisHeading(exportEs.chart, 'billion', 'EUR', 'es'), 'Cantidades en miles de millones de €');
    assert.equal(axisHeading(exportCs.chart, 'million', 'CZK', 'cs'), `Částky v${NBSP}milionech Kč`);
  });

  it('names only the currency below a thousand', () => {
    assert.equal(axisHeading(exportEn.chart, 'none', 'EUR'), 'Amounts in €');
    assert.equal(axisHeading(exportCs.chart, 'none', 'CZK', 'cs'), `Částky v${NBSP}Kč`);
  });

  it('writes the currency as the page writes it beside a figure', () => {
    assert.equal(currencyMark('CZK', 'cs'), 'Kč');
    assert.equal(currencyMark('INR'), '₹');
    assert.equal(currencyMark('EUR', 'es'), '€');
  });
});

describe('a gridline carries a bare number', () => {
  it('divides by the heading\'s scale and keeps the page\'s separators', () => {
    assert.equal(axisTick(500_000, 'thousand', 'EUR'), '500');
    assert.equal(axisTick(1_500_000, 'million', 'CZK', 'cs'), '1,5');
    assert.equal(axisTick(2_500_000, 'lakh', 'INR'), '25');
    assert.equal(axisTick(250_000, 'million', 'EUR'), '0.25');
    assert.equal(axisTick(0, 'million', 'EUR'), '0');
    assert.equal(axisTick(750, 'none', 'EUR'), '750');
  });
});

describe('a label that stands alone carries its own unit', () => {
  it('keeps the English short forms', () => {
    assert.equal(chartLabel(547_000, 'EUR', exportEn.chart), '€547K');
    assert.equal(chartLabel(2_160_000, 'EUR', exportEn.chart), '€2.16M');
    assert.equal(chartLabel(1_870_000, 'INR', exportEn.chart), '₹18.7L');
    assert.equal(chartLabel(10_900_000, 'INR', exportEn.chart), '₹1.09Cr');
    assert.equal(chartLabel(950, 'EUR', exportEn.chart), '€950');
  });

  it('chooses the unit after rounding, so no label reads a thousand of the unit below', () => {
    assert.equal(chartLabel(999_600, 'EUR', exportEn.chart), '€1M');
    assert.equal(chartLabel(999_400, 'EUR', exportEn.chart), '€999K');
    assert.equal(chartLabel(999_499.6, 'EUR', exportEn.chart), '€999K', 'rounded once, not twice');
    assert.equal(chartLabel(999_600_000, 'EUR', exportEn.chart), '€1B');
    assert.equal(chartLabel(9_996_000, 'INR', exportHi.chart), `₹1${NBSP}करोड़`);
    assert.equal(chartLabel(99_960, 'INR', exportEn.chart), '₹1L');
    assert.equal(chartLabel(999.6, 'EUR', exportEn.chart), '€1K');
    assert.equal(chartLabel(999_600, 'CZK', exportCs.chart, 'cs'), `1${NBSP}mil.${NBSP}Kč`);
  });

  it('writes lakh and crore in Hindi and Marathi words (#621)', () => {
    assert.equal(chartLabel(1_870_000, 'INR', exportHi.chart), `₹18.7${NBSP}लाख`);
    assert.equal(chartLabel(10_900_000, 'INR', exportHi.chart), `₹1.09${NBSP}करोड़`);
    assert.equal(chartLabel(10_900_000, 'INR', exportMr.chart), `₹1.09${NBSP}कोटी`);
    assert.equal(chartLabel(54_700, 'INR', exportMr.chart), `₹54.7${NBSP}हजार`);
  });

  it('writes every other currency in lakh and crore too in Hindi and Marathi (#678)', () => {
    assert.equal(chartLabel(1_870_000, 'EUR', exportHi.chart, null, 'en-IN'), `€18.7${NBSP}लाख`);
    assert.equal(chartLabel(2_160_000_000, 'USD', exportHi.chart, null, 'en-IN'), `$216${NBSP}करोड़`);
    assert.equal(chartLabel(10_900_000, 'EUR', exportMr.chart, null, 'en-IN'), `€1.09${NBSP}कोटी`);
    assert.equal(chartLabel(54_700, 'GBP', exportMr.chart, null, 'en-IN'), `£54.7${NBSP}हजार`);
    assert.equal(chartLabel(999_600, 'EUR', exportHi.chart, null, 'en-IN'), `€10${NBSP}लाख`, 'rounded before its unit is chosen');
    assert.equal(chartLabel(1_870_000, 'EUR', exportEn.chart, null, 'en'), '€1.87M', 'English keeps M');
  });

  it('writes mil and M in Spanish, and a thousand million in millions', () => {
    assert.equal(chartLabel(547_000, 'EUR', exportEs.chart, 'es'), `547${NBSP}mil${NBSP}€`);
    assert.equal(chartLabel(2_160_000, 'EUR', exportEs.chart, 'es'), `2,16${NBSP}M${NBSP}€`);
    assert.equal(chartLabel(2_500_000_000, 'EUR', exportEs.chart, 'es'), `2.500${NBSP}M${NBSP}€`);
  });

  it('keeps the Czech short forms, never K, M or B', () => {
    assert.equal(chartLabel(150_000, 'CZK', exportCs.chart, 'cs'), `150${NBSP}tis.${NBSP}Kč`);
    assert.equal(chartLabel(1_500_000, 'CZK', exportCs.chart, 'cs'), `1,5${NBSP}mil.${NBSP}Kč`);
    assert.equal(chartLabel(2_300_000_000, 'CZK', exportCs.chart, 'cs'), `2,3${NBSP}mld.${NBSP}Kč`);
  });
});

describe('a bar label never says zero for an amount that is not', () => {
  // A loan's last month: about 4 Kč of interest on a payment of 1,250 Kč.
  const inThousands = (v: number) => axisTick(v, 'thousand', 'CZK', 'cs');
  const wholeUnits = (v: number) => axisTick(Math.round(v), 'none', 'CZK', 'cs');

  it('on a chart counted in thousands', () => {
    assert.equal(inThousands(4), '0');
    assert.equal(readsAsZero(4, inThousands), true);
    assert.equal(readsAsZero(1250, inThousands), false);
    assert.equal(readsAsZero(12, inThousands), false, 'written 0,01');
  });

  it('on a chart counted in whole units', () => {
    assert.equal(readsAsZero(0.4, wholeUnits), true);
    assert.equal(readsAsZero(0.6, wholeUnits), false);
    assert.equal(readsAsZero(4, wholeUnits), false);
  });

  it('lets a true zero be written', () => {
    assert.equal(readsAsZero(0, inThousands), false);
    assert.equal(readsAsZero(0, wholeUnits), false);
  });
});
