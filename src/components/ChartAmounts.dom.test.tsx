/**
 * ChartAmounts: how a page's charts write amounts (an axis that names its
 * unit once, a label that carries its own), and the room a chart keeps for
 * its axis labels, measured from the labels as drawn. jsdom lays nothing
 * out, so the labels' widths and the resize observer are stand-ins here.
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { useRef, type ReactNode, type RefObject } from 'react';
import { act, cleanup, render, renderHook } from '@testing-library/react';
import { exportEn } from '../i18n/strings/tools/export.ts';
import { ChartUnit, ChartWordsContext, useAxisMargin, useChartAmounts } from './ChartAmounts.tsx';
import { NumberLocaleContext } from './LocaleNumberInput.tsx';
import { AmountLocaleContext } from './useMoney.ts';

// This tool's own strings, from the modules that define them: not the whole catalog,
// which would tie this file to every tool's strings (#904).
const TOOL_STRINGS = {
  en: { export: exportEn },
};

const words = TOOL_STRINGS.en.export.chart;
const g = globalThis as unknown as Record<string, unknown>;

describe('how a chart writes amounts', () => {
  afterEach(cleanup);

  const inPage = ({ chartWords = words, amountLocale = null, numberLocale = 'en' }: { chartWords?: typeof words | null; amountLocale?: string | null; numberLocale?: string }) =>
    renderHook(() => useChartAmounts(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <ChartWordsContext.Provider value={chartWords}>
          <AmountLocaleContext.Provider value={amountLocale}>
            <NumberLocaleContext.Provider value={numberLocale}>{children}</NumberLocaleContext.Provider>
          </AmountLocaleContext.Provider>
        </ChartWordsContext.Provider>
      ),
    }).result.current;

  it('names the unit once above an axis and puts bare numbers on its gridlines', () => {
    const axis = inPage({}).axis(900_000, 'EUR');
    assert.equal(axis.scale, 'thousand');
    assert.equal(axis.heading, 'Amounts in thousands of €');
    assert.equal(axis.tick(250_000), '250');
    const millions = inPage({}).axis(2_500_000, 'EUR');
    assert.equal(millions.scale, 'million');
    assert.equal(millions.tick(500_000), '0.5');
  });

  it('gives a label that stands alone its own unit', () => {
    assert.equal(inPage({}).label(2_160_000, 'EUR'), '€2.16M');
  });

  it('counts in lakhs on a page whose own numbers are grouped the Indian way', () => {
    const page = inPage({ numberLocale: 'en-IN' });
    const axis = page.axis(900_000, 'EUR');
    assert.equal(axis.scale, 'lakh');
    assert.equal(axis.heading, 'Amounts in lakhs of €');
    assert.equal(axis.tick(250_000), '2.5');
    assert.equal(page.label(1_870_000, 'EUR'), '€18.7L');
  });

  it('writes in the page own amount style where it has one', () => {
    const page = inPage({ amountLocale: 'es', numberLocale: 'en-IN' });
    const axis = page.axis(2_500_000, 'EUR');
    assert.equal(axis.scale, 'million');
    assert.equal(axis.tick(1_250_000), '1,25');
    assert.equal(axis.heading, 'Amounts in millions of €');
    assert.match(page.label(1_500_000, 'EUR'), /^1,5M\s€$/);
  });

  it('keeps full amounts and no heading on a chart drawn outside a tool', () => {
    const page = renderHook(() => useChartAmounts()).result.current;
    const axis = page.axis(900_000, 'EUR');
    assert.equal(axis.scale, 'thousand');
    assert.equal(axis.heading, '');
    assert.equal(axis.tick(250_000), '€250,000');
    assert.equal(page.label(2_160_000, 'EUR'), '€2.16M');
    assert.equal(page.label(1_234, 'EUR'), '€1.23K');
  });

  it('draws the line that names the unit only when there is one', () => {
    const { container } = render(<ChartUnit>Amounts in thousands of €</ChartUnit>);
    const line = container.querySelector('p') as HTMLElement;
    assert.equal(line.className, 'tool-chartUnit');
    assert.equal(line.textContent, 'Amounts in thousands of €');
    cleanup();
    assert.equal(render(<ChartUnit>{''}</ChartUnit>).container.innerHTML, '');
  });
});

// ---------------------------------------------------------------------------
// The room for the axis labels
// ---------------------------------------------------------------------------

/** A resize observer that records what it watches and can be made to report. */
class Watcher {
  static all: Watcher[] = [];
  watching: Element[] = [];
  disconnects = 0;
  constructor(public report: () => void) { Watcher.all.push(this); }
  observe(el: Element) {
    if (!el) throw new TypeError('nothing to observe');
    this.watching.push(el);
  }
  disconnect() { this.disconnects += 1; this.watching = []; }
  static get live() { return Watcher.all.filter((w) => w.watching.length > 0); }
}

type Options = Parameters<typeof useAxisMargin>[2];
const ROOM: Options = { estimate: 40, gap: 8, least: 20, width: 600 };
/** Label widths as "drawn": a number, or 'x' for a label the browser cannot measure. */
type Labels = (number | 'x')[];

let measured = 0;
const realObserver = g.ResizeObserver;
const proto = window.SVGElement.prototype as unknown as { getBBox?: () => { width: number } };

beforeEach(() => {
  Watcher.all = [];
  measured = 0;
  g.ResizeObserver = Watcher;
  proto.getBBox = function getBBox(this: SVGElement) {
    measured += 1;
    const w = this.getAttribute('data-w');
    if (w === 'x') throw new Error('not rendered');
    return { width: Number(w) };
  };
});
afterEach(() => {
  cleanup();
  g.ResizeObserver = realObserver;
  delete proto.getBBox;
  delete (document as unknown as { fonts?: unknown }).fonts;
});

function Chart({ labels, drawn = true, id = 'a', room = ROOM }: { labels: Labels; drawn?: boolean; id?: string; room?: Options }) {
  const svg = useRef<SVGSVGElement>(null);
  const { left, inside } = useAxisMargin(svg, 'text.tick', room);
  return (
    <div data-testid="chart" data-left={left} data-inside={String(inside)}>
      {drawn && (
        <svg ref={svg} key={id}>
          {labels.map((w, i) => <text key={i} className="tick" data-w={w}>label</text>)}
          <text className="title" data-w={500}>not an axis label</text>
        </svg>
      )}
    </div>
  );
}

const margin = (container: HTMLElement) => {
  const el = container.querySelector('[data-testid="chart"]') as HTMLElement;
  return { left: Number(el.dataset.left), inside: el.dataset.inside === 'true' };
};

describe('the room a chart keeps for its axis labels', () => {
  it('is the estimate plus the gap before anything is drawn', () => {
    const { container } = render(<Chart labels={[]} drawn={false} />);
    assert.deepEqual(margin(container), { left: 48, inside: false });
    assert.equal(Watcher.all.length, 0, 'nothing to watch yet');
  });

  it('is the widest label as drawn plus the gap, rounded up', () => {
    const { container } = render(<Chart labels={[30, 70.2, 12]} />);
    assert.deepEqual(margin(container), { left: 79, inside: false });
  });

  it('is never less than the least the chart asks for', () => {
    assert.deepEqual(margin(render(<Chart labels={[3]} />).container), { left: 20, inside: false });
    cleanup();
    assert.deepEqual(margin(render(<Chart labels={[]} drawn={false} room={{ ...ROOM, least: 90 }} />).container), { left: 90, inside: false });
  });

  it('takes a label under half a unit wide as measured', () => {
    assert.deepEqual(margin(render(<Chart labels={[0.25]} room={{ ...ROOM, least: 2 }} />).container), { left: 9, inside: false });
  });

  it('skips a label the browser cannot measure and keeps the rest', () => {
    assert.deepEqual(margin(render(<Chart labels={['x', 70.2, 'x']} />).container), { left: 79, inside: false });
  });

  it('keeps the estimate while the chart measures as nothing: in a closed fold, or unmeasurable', () => {
    assert.deepEqual(margin(render(<Chart labels={[0, 0]} room={{ ...ROOM, least: 2 }} />).container), { left: 48, inside: false });
    cleanup();
    assert.deepEqual(margin(render(<Chart labels={['x']} room={{ ...ROOM, least: 2 }} />).container), { left: 48, inside: false });
  });

  it('follows the labels when they are drawn again, but not a change under half a unit', () => {
    const view = render(<Chart labels={[70.75]} />);
    assert.equal(margin(view.container).left, 79);
    view.rerender(<Chart labels={[71.125]} />);
    assert.equal(margin(view.container).left, 79, 'under half a unit: unchanged');
    view.rerender(<Chart labels={[71.25]} />);
    assert.equal(margin(view.container).left, 80, 'half a unit: followed');
    view.rerender(<Chart labels={[40]} />);
    assert.equal(margin(view.container).left, 48, 'narrower labels give room back');
  });

  it('measures again when the chart is shown or resized', () => {
    const view = render(<Chart labels={[0]} />);
    assert.equal(margin(view.container).left, 48);
    assert.equal(Watcher.all.length, 1);
    const svg = view.container.querySelector('svg')!;
    assert.deepEqual(Watcher.all[0].watching, [svg]);
    // The fold opens: the labels now have a width, and nothing is drawn again.
    svg.querySelector('text.tick')!.setAttribute('data-w', '100');
    act(() => Watcher.all[0].report());
    assert.equal(margin(view.container).left, 108);
  });

  it('watches a chart once, however often it is drawn', () => {
    const view = render(<Chart labels={[10]} />);
    view.rerender(<Chart labels={[20]} />);
    view.rerender(<Chart labels={[30]} />);
    assert.equal(Watcher.all.length, 1);
    assert.equal(Watcher.all[0].disconnects, 0);
  });

  it('starts watching a chart that arrives after the first drawing', () => {
    const view = render(<Chart labels={[90]} drawn={false} />);
    view.rerender(<Chart labels={[90]} drawn={false} />);
    assert.equal(Watcher.all.length, 0);
    view.rerender(<Chart labels={[90]} />);
    assert.equal(Watcher.all.length, 1);
    assert.deepEqual(Watcher.all[0].watching, [view.container.querySelector('svg')]);
    assert.equal(margin(view.container).left, 98);
  });

  it('lets go of a chart that is replaced or removed, and watches the new one', () => {
    const view = render(<Chart labels={[10]} id="a" />);
    view.rerender(<Chart labels={[10]} id="b" />);
    assert.equal(Watcher.all.length, 2);
    assert.equal(Watcher.all[0].disconnects, 1);
    assert.deepEqual(Watcher.all[1].watching, [view.container.querySelector('svg')]);
    view.rerender(<Chart labels={[10]} drawn={false} />);
    assert.equal(Watcher.all[1].disconnects, 1);
    assert.equal(Watcher.live.length, 0);
    view.rerender(<Chart labels={[10]} id="c" />);
    assert.equal(Watcher.all.length, 3);
    assert.equal(Watcher.live.length, 1);
  });

  it('stops watching when it leaves the page', () => {
    const view = render(<Chart labels={[10]} />);
    view.unmount();
    assert.equal(Watcher.all[0].disconnects, 1);
    assert.equal(Watcher.live.length, 0);
  });

  it('leaves the page cleanly when no chart was ever drawn', () => {
    const view = render(<Chart labels={[]} drawn={false} />);
    assert.doesNotThrow(() => view.unmount());
  });

  it('still measures in a browser with no resize observer', () => {
    delete g.ResizeObserver;
    const view = render(<Chart labels={[70.2]} />);
    assert.equal(margin(view.container).left, 79);
    assert.doesNotThrow(() => view.unmount());
  });

  it('measures again when the web font arrives, and not after the chart is gone', async () => {
    let arrive = () => {};
    const ready = new Promise<void>((resolve) => { arrive = resolve; });
    (document as unknown as { fonts?: unknown }).fonts = { ready };
    // A ref the page keeps hold of, so a late measurement would still find the labels.
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
    el.innerHTML = '<text class="tick" data-w="50">label</text>';
    document.body.append(el);
    const kept: RefObject<SVGSVGElement | null> = { current: el };
    const first = renderHook(() => useAxisMargin(kept, 'text.tick', ROOM));
    assert.equal(first.result.current.left, 58);
    first.unmount();
    const second = renderHook(() => useAxisMargin(kept, 'text.tick', ROOM));
    el.querySelector('text')!.setAttribute('data-w', '64');
    const before = measured;
    await act(async () => { arrive(); await ready; });
    assert.equal(second.result.current.left, 72, 'the wider font is measured');
    // One chart is on the page: the one that left does not measure.
    assert.equal(measured - before, 2, 'one measurement for the font, one for the drawing it caused');
    second.unmount();
    el.remove();
  });
});

describe('where the labels go when they would squeeze the plot', () => {
  const at = (room: Partial<Options>, labels: Labels = [100]) => margin(render(<Chart labels={labels} room={{ ...ROOM, ...room }} />).container);
  afterEach(cleanup);

  it('puts them inside the plot, at the least margin, when the plot would get under its share', () => {
    // Labels 100 wide and a gap of 8 leave 192 of 300, over six tenths (180).
    assert.deepEqual(at({ width: 300 }), { left: 108, inside: false });
    // Of 260 they leave 152, under six tenths (156).
    assert.deepEqual(at({ width: 260 }), { left: 20, inside: true });
  });

  it('keeps them outside when the plot gets exactly its share', () => {
    // 270 - 108 = 162 = 0.6 * 270.
    assert.deepEqual(at({ width: 270 }), { left: 108, inside: false });
    assert.deepEqual(at({ width: 269 }), { left: 20, inside: true });
  });

  it('counts what the chart keeps on its other side', () => {
    assert.deepEqual(at({ width: 300, right: 12 }), { left: 108, inside: false });
    assert.deepEqual(at({ width: 300, right: 13 }), { left: 20, inside: true });
  });

  it('takes the share of the plot it is given', () => {
    assert.deepEqual(at({ width: 300, plot: 0.5 }), { left: 108, inside: false });
    assert.deepEqual(at({ width: 300, plot: 0.7 }), { left: 20, inside: true });
    assert.deepEqual(at({ width: 216, plot: 0.5 }), { left: 108, inside: false });
    assert.deepEqual(at({ width: 215, plot: 0.5 }), { left: 20, inside: true });
  });

  it('uses the estimate the same way before anything is measured', () => {
    assert.deepEqual(at({ width: 100 }, [0]), { left: 20, inside: true });
    assert.deepEqual(at({ width: 200, gap: 0, estimate: 80 }, [0]), { left: 80, inside: false });
  });
});
