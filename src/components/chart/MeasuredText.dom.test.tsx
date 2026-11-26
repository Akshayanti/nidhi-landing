/**
 * The widths of chart labels as the browser draws them (#676):
 * `useMeasuredText` draws each label unseen through `<MeasureSamples>`,
 * measures it, and stands an estimate in until then. jsdom measures nothing,
 * so `getBBox` and the fonts are stand-ins the tests set.
 */
import '../../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { useRef, type RefObject } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { MeasureSamples, useMeasuredText, type Sample } from './MeasuredText.tsx';

/** What the stand-in browser measures each label as, by its words; a label not listed cannot be measured. */
let drawnWidth: Record<string, number> = {};
let asked: string[] = [];

type WithBBox = { getBBox?: () => { width: number } };
beforeEach(() => {
  drawnWidth = {};
  asked = [];
  (SVGElement.prototype as WithBBox).getBBox = function (this: SVGElement) {
    const words = this.textContent ?? '';
    asked.push(words);
    if (!(words in drawnWidth)) throw new Error('not rendered');
    return { width: drawnWidth[words] };
  };
});
afterEach(() => {
  cleanup();
  delete (SVGElement.prototype as WithBBox).getBBox;
  delete (document as unknown as Record<string, unknown>).fonts;
});

function fontsArriveLater(): () => Promise<void> {
  let arrive = () => {};
  const ready = new Promise<void>((resolve) => { arrive = resolve; });
  Object.defineProperty(document, 'fonts', { value: { ready }, configurable: true });
  return async () => {
    await act(async () => {
      arrive();
      await ready;
    });
  };
}

let seen: ReturnType<typeof useMeasuredText> = { width: () => Number.NaN, list: [] };

/** A chart that measures `samples`; `stale` adds an unseen copy left over from a longer list. */
function Chart({ samples, drawn = true, stale = false, outside }: { samples: Sample[]; drawn?: boolean; stale?: boolean; outside?: RefObject<SVGSVGElement | null> }) {
  const own = useRef<SVGSVGElement | null>(null);
  seen = useMeasuredText(outside ?? own, samples);
  if (outside || !drawn) return null;
  return (
    <svg ref={own}>
      <MeasureSamples list={seen.list} />
      {stale && <text data-sample={7}>left over</text>}
    </svg>
  );
}

const tick = (text: string, size = 14, cls = 'chart-tick'): Sample => ({ cls, text, size });
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} is not ${b}`);

describe('the samples a chart measures', () => {
  it('are each drawn once, in the order they were asked for', () => {
    render(<Chart samples={[tick('2030'), tick('2040'), tick('2030'), tick('2040')]} />);
    assert.deepEqual(seen.list, [tick('2030'), tick('2040')]);
  });

  it('are different when the class, the words or the size differ', () => {
    const samples = [tick('2030'), tick('2030', 14, 'chart-endLabel'), tick('2031'), tick('2030', 14.2)];
    render(<Chart samples={samples} />);
    assert.deepEqual(seen.list, samples);
  });

  it('are the same when their sizes differ by less than a tenth of a unit', () => {
    render(<Chart samples={[tick('2030', 14), tick('2030', 14.04)]} />);
    assert.deepEqual(seen.list, [tick('2030', 14)]);
  });

  it('are drawn unseen, in their own class and size, with their words as text only', () => {
    const { container } = render(<Chart samples={[tick('€ 73,191', 14), tick('Years', 12.5, 'chart-axisTitle')]} />);
    const group = container.querySelector('svg > g');
    assert.ok(group);
    assert.equal(group.getAttribute('aria-hidden'), 'true');
    assert.equal(group.getAttribute('visibility'), 'hidden');
    assert.equal(group.getAttribute('class'), 'chart-measure');
    const texts = [...group.querySelectorAll('text')];
    assert.deepEqual(texts.map((t) => t.textContent), ['€ 73,191', 'Years']);
    assert.deepEqual(texts.map((t) => t.getAttribute('class')), ['chart-tick', 'chart-axisTitle']);
    assert.deepEqual(texts.map((t) => t.style.fontSize), ['14px', '12.5px']);
    assert.deepEqual(texts.map((t) => `${t.getAttribute('x')},${t.getAttribute('y')}`), ['0,0', '0,0']);
    // A label can hold an amount the reader typed: an attribute never does (CLAUDE.md, free tools, rule 4).
    assert.deepEqual(texts.map((t) => t.getAttribute('data-sample')), ['0', '1']);
    for (const t of texts) {
      for (const a of t.attributes) assert.ok(!a.value.includes('73,191'), a.name);
    }
  });
});

describe('the width of a label', () => {
  it('is an estimate from its length until it can be measured', () => {
    render(<Chart samples={[tick('2030', 10)]} />);
    near(seen.width(tick('2030', 10)), 24);
    // A label that was never drawn is estimated too.
    near(seen.width(tick('1,250', 14, 'chart-endLabel')), 42);
  });

  it('is estimated a fifth wider for Devanagari', () => {
    render(<Chart samples={[tick('वर्ष', 10)]} />);
    near(seen.width(tick('वर्ष', 10)), 4 * 10 * 0.6 * 1.2);
    near(seen.width(tick('2030 वर्ष', 10)), 9 * 10 * 0.6 * 1.2);
  });

  it('is what the browser measures, once the label is drawn', () => {
    drawnWidth = { 2030: 31.5, Years: 9.2 };
    render(<Chart samples={[tick('2030'), tick('Years')]} />);
    assert.equal(seen.width(tick('2030')), 31.5);
    assert.equal(seen.width(tick('Years')), 9.2);
    // Measured for one class and size, estimated for another.
    near(seen.width(tick('2030', 20)), 48);
    near(seen.width(tick('2030', 14, 'chart-endLabel')), 33.6);
  });

  it('is taken from the first measurement, whatever it comes to', () => {
    for (const width of [9.2, 0.3, 400]) {
      drawnWidth = { Years: width };
      render(<Chart samples={[tick('Years')]} />);
      assert.equal(seen.width(tick('Years')), width);
      cleanup();
    }
  });

  it('stays an estimate for a label the browser cannot measure or measures as nothing', () => {
    drawnWidth = { 2030: 31.5, 2040: 0 };
    render(<Chart samples={[tick('2020'), tick('2030'), tick('2040')]} />);
    near(seen.width(tick('2020')), 33.6);
    assert.equal(seen.width(tick('2030')), 31.5);
    near(seen.width(tick('2040')), 33.6);
    assert.deepEqual(asked.slice(0, 3), ['2020', '2030', '2040']);
  });

  it('stays an estimate while nothing can be measured at all', () => {
    drawnWidth = { 2030: 0 };
    render(<Chart samples={[tick('2030')]} />);
    near(seen.width(tick('2030')), 33.6);
  });

  it('is an estimate, without complaint, before there is a drawing', () => {
    render(<Chart samples={[tick('2030')]} drawn={false} />);
    near(seen.width(tick('2030')), 33.6);
    assert.deepEqual(asked, []);
  });

  it('does not measure an unseen copy left over from a longer list', () => {
    drawnWidth = { 2030: 31.5, 'left over': 50 };
    render(<Chart samples={[tick('2030')]} stale />);
    assert.equal(seen.width(tick('2030')), 31.5);
    assert.ok(!asked.includes('left over'));
  });
});

let insideRef: RefObject<SVGSVGElement | null> = { current: null };
/** The measuring part drawn inside its own SVG, like the net worth donut's centre (#876). */
function Inside({ samples }: { samples: Sample[] }) {
  seen = useMeasuredText(insideRef, samples);
  return <MeasureSamples list={seen.list} />;
}
function Framed({ samples }: { samples: Sample[] }) {
  insideRef = useRef<SVGSVGElement | null>(null);
  return <svg ref={insideRef}><Inside samples={samples} /></svg>;
}

describe('a label measured from inside its own drawing (#876)', () => {
  it('is measured on the first draw, once the drawing is there', async () => {
    drawnWidth = { 2030: 31.5 };
    render(<Framed samples={[tick('2030')]} />);
    await act(async () => {});
    assert.equal(seen.width(tick('2030')), 31.5);
  });
});

describe('a label measured again', () => {
  it('keeps its width when it comes out less than half a unit different', () => {
    drawnWidth = { 2030: 31.5, 2040: 30 };
    const samples = [tick('2030'), tick('2040')];
    const { rerender } = render(<Chart samples={samples} />);
    drawnWidth = { 2030: 31.9, 2040: 29.6 };
    rerender(<Chart samples={samples} />);
    assert.equal(seen.width(tick('2030')), 31.5);
    assert.equal(seen.width(tick('2040')), 30);
  });

  it('takes the new widths when any label is half a unit different or more', () => {
    drawnWidth = { 2030: 31.5, 2040: 30 };
    const samples = [tick('2030'), tick('2040')];
    const { rerender } = render(<Chart samples={samples} />);
    drawnWidth = { 2030: 31.5, 2040: 30.5 };
    rerender(<Chart samples={samples} />);
    assert.equal(seen.width(tick('2040')), 30.5);
    drawnWidth = { 2030: 12, 2040: 30.5 };
    rerender(<Chart samples={samples} />);
    assert.equal(seen.width(tick('2030')), 12);
    assert.equal(seen.width(tick('2040')), 30.5);
  });

  it('keeps what it measured for a label that is gone or can no longer be measured', () => {
    drawnWidth = { 2030: 31.5, 2040: 30 };
    const { rerender } = render(<Chart samples={[tick('2030'), tick('2040')]} />);
    drawnWidth = { 2050: 28 };
    rerender(<Chart samples={[tick('2040'), tick('2050')]} />);
    assert.equal(seen.width(tick('2030')), 31.5);
    assert.equal(seen.width(tick('2040')), 30);
    assert.equal(seen.width(tick('2050')), 28);
  });

  it('keeps every width while the chart is hidden and measures as nothing', () => {
    drawnWidth = { 2030: 31.5 };
    const { rerender } = render(<Chart samples={[tick('2030')]} />);
    drawnWidth = { 2030: 0 };
    rerender(<Chart samples={[tick('2030')]} />);
    assert.equal(seen.width(tick('2030')), 31.5);
  });

  it('is measured when the fonts arrive', async () => {
    const arrive = fontsArriveLater();
    drawnWidth = { 2030: 31.5 };
    render(<Chart samples={[tick('2030')]} />);
    assert.equal(seen.width(tick('2030')), 31.5);
    drawnWidth = { 2030: 36 };
    await arrive();
    assert.equal(seen.width(tick('2030')), 36);
  });

  it('is not measured when the fonts arrive after the chart has gone', async () => {
    const arrive = fontsArriveLater();
    // A drawing the chart does not own, so it is still there afterwards.
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const copy = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    copy.setAttribute('data-sample', '0');
    copy.textContent = '2030';
    svg.append(copy);
    drawnWidth = { 2030: 31.5 };
    const { unmount } = render(<Chart samples={[tick('2030')]} outside={{ current: svg }} />);
    assert.equal(seen.width(tick('2030')), 31.5);
    unmount();
    asked = [];
    await arrive();
    assert.deepEqual(asked, []);
  });
});
