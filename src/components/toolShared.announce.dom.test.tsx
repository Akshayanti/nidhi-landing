/**
 * toolShared's announcements: what a screen reader is told, and when. The
 * settled result once typing has paused, a second result from a part that is
 * not always open, and a notice said at once. The clock is a stand-in, so
 * each wait is exact.
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, render } from '@testing-library/react';
import { clock } from '../../test/windowClock.ts';
import { NoticeRegion, ResultAnnouncement } from './toolShared.tsx';

beforeEach(() => clock.install());
afterEach(() => {
  cleanup();
  clock.restore();
});

const live = (container: HTMLElement) => container.querySelector('[aria-live]') as HTMLElement;

describe('the result announcement', () => {
  it('is one polite, atomic, hidden region, in the page before it has anything to say', () => {
    const html = renderToStaticMarkup(<ResultAnnouncement text="You would have €120" />);
    assert.equal(html, '<span class="chart-srOnly" aria-live="polite" aria-atomic="true"></span>');
  });

  it('says nothing for the text the page loads with', () => {
    const { container } = render(<ResultAnnouncement text="You would have €120" also="Refinancing saves €5" />);
    clock.pass(5000);
    assert.equal(live(container).textContent, '');
  });

  it('while quiet, says nothing, and takes the text it ends on as the one the page loaded with (#880)', () => {
    const view = render(<ResultAnnouncement quiet text="The example's result" />);
    view.rerender(<ResultAnnouncement quiet text="Still arriving" />);
    clock.pass(5000);
    assert.equal(live(view.container).textContent, '');
    view.rerender(<ResultAnnouncement quiet={false} text="The link's result" />);
    clock.pass(5000);
    assert.equal(live(view.container).textContent, '', 'the text it arrived on was said');
    // From then on, a change is said as usual.
    view.rerender(<ResultAnnouncement quiet={false} text="A new result" />);
    clock.pass(599);
    assert.equal(live(view.container).textContent, '');
    clock.pass(1);
    assert.equal(live(view.container).textContent, 'A new result');
  });

  it('says a new result once it has stayed the same for the delay, and not before', () => {
    const view = render(<ResultAnnouncement text="A" />);
    view.rerender(<ResultAnnouncement text="B" />);
    clock.pass(599);
    assert.equal(live(view.container).textContent, '');
    clock.pass(1);
    assert.equal(live(view.container).textContent, 'B');
  });

  it('waits out typing: only the result that settled is said', () => {
    const view = render(<ResultAnnouncement text="A" />);
    view.rerender(<ResultAnnouncement text="B" />);
    clock.pass(300);
    view.rerender(<ResultAnnouncement text="C" />);
    clock.pass(300);
    assert.equal(live(view.container).textContent, '');
    clock.pass(300);
    assert.equal(live(view.container).textContent, 'C');
    assert.equal(clock.waiting, 0);
  });

  it('says nothing when typing comes back to the result already heard', () => {
    const view = render(<ResultAnnouncement text="A" />);
    view.rerender(<ResultAnnouncement text="B" />);
    clock.pass(100);
    view.rerender(<ResultAnnouncement text="A" />);
    clock.pass(600);
    assert.equal(live(view.container).textContent, '');
  });

  it('takes the delay it is given, and a new delay starts the wait again', () => {
    const view = render(<ResultAnnouncement text="A" delay={50} />);
    view.rerender(<ResultAnnouncement text="B" delay={50} />);
    clock.pass(49);
    view.rerender(<ResultAnnouncement text="B" delay={200} />);
    clock.pass(199);
    assert.equal(live(view.container).textContent, '');
    clock.pass(1);
    assert.equal(live(view.container).textContent, 'B');
  });

  it('does not say the second result when its part opens or closes, and keeps what was said', () => {
    const view = render(<ResultAnnouncement text="A" />);
    view.rerender(<ResultAnnouncement text="B" />);
    clock.pass(600);
    assert.equal(live(view.container).textContent, 'B');
    view.rerender(<ResultAnnouncement text="B" also="X" />);
    clock.pass(600);
    assert.equal(live(view.container).textContent, 'B');
    view.rerender(<ResultAnnouncement text="B" />);
    clock.pass(600);
    assert.equal(live(view.container).textContent, 'B');
    // Opened again with another figure: still an opening, not a change.
    view.rerender(<ResultAnnouncement text="B" also="Y" />);
    clock.pass(600);
    assert.equal(live(view.container).textContent, 'B');
  });

  it('says the second result alone when it changes while its part is open', () => {
    const view = render(<ResultAnnouncement text="A" also="X" />);
    view.rerender(<ResultAnnouncement text="A" also="Y" />);
    clock.pass(600);
    assert.equal(live(view.container).textContent, 'Y');
  });

  it('says the first result alone when only it changes while the part is open', () => {
    const view = render(<ResultAnnouncement text="A" also="X" />);
    view.rerender(<ResultAnnouncement text="B" also="X" />);
    clock.pass(600);
    assert.equal(live(view.container).textContent, 'B');
  });

  it('says both together when one keystroke changed both', () => {
    const view = render(<ResultAnnouncement text="A" also="X" />);
    view.rerender(<ResultAnnouncement text="B" also="Y" />);
    clock.pass(600);
    assert.equal(live(view.container).textContent, 'B Y');
  });

  it('hears an edit made just after the part opened as a change', () => {
    const view = render(<ResultAnnouncement text="A" />);
    view.rerender(<ResultAnnouncement text="A" also="X" />);
    clock.pass(100);
    view.rerender(<ResultAnnouncement text="A" also="Y" />);
    clock.pass(600);
    assert.equal(live(view.container).textContent, 'Y');
  });

  it('still says the first result when it changed as the part opened or closed', () => {
    const view = render(<ResultAnnouncement text="A" />);
    view.rerender(<ResultAnnouncement text="B" also="X" />);
    clock.pass(600);
    assert.equal(live(view.container).textContent, 'B');
    view.rerender(<ResultAnnouncement text="C" />);
    clock.pass(600);
    assert.equal(live(view.container).textContent, 'C');
  });

  it('does not say the second result when its part is closed and opened again at once', () => {
    const view = render(<ResultAnnouncement text="A" also="X" />);
    view.rerender(<ResultAnnouncement text="A" />);
    clock.pass(100);
    view.rerender(<ResultAnnouncement text="A" also="Y" />);
    clock.pass(600);
    assert.equal(live(view.container).textContent, '');
  });

  it('says each result once: what was said is not said again with the next change', () => {
    const view = render(<ResultAnnouncement text="A" also="X" />);
    view.rerender(<ResultAnnouncement text="B" also="X" />);
    clock.pass(600);
    assert.equal(live(view.container).textContent, 'B');
    view.rerender(<ResultAnnouncement text="B" also="Y" />);
    clock.pass(600);
    assert.equal(live(view.container).textContent, 'Y');
    view.rerender(<ResultAnnouncement text="C" also="Y" />);
    clock.pass(600);
    assert.equal(live(view.container).textContent, 'C');
  });

  it('stops waiting when it leaves the page', () => {
    const view = render(<ResultAnnouncement text="A" notice={{ text: 'Link copied', n: 1 }} />);
    view.rerender(<ResultAnnouncement text="B" notice={{ text: 'Link copied', n: 2 }} />);
    assert.equal(clock.waiting, 2);
    view.unmount();
    assert.equal(clock.waiting, 0);
  });
});

describe('a notice', () => {
  it('is said at once, through the tool own region, each time its count rises', () => {
    const view = render(<ResultAnnouncement text="A" />);
    assert.equal(clock.waiting, 0, 'no notice, nothing waiting');
    view.rerender(<ResultAnnouncement text="A" notice={{ text: 'Link copied', n: 1 }} />);
    clock.pass(59);
    assert.equal(live(view.container).textContent, '');
    clock.pass(1);
    assert.equal(live(view.container).textContent, 'Link copied');
    // The same words again: the region is emptied first, so the repeat is a change.
    view.rerender(<ResultAnnouncement text="A" notice={{ text: 'Link copied', n: 2 }} />);
    assert.equal(live(view.container).textContent, '');
    clock.pass(60);
    assert.equal(live(view.container).textContent, 'Link copied');
    // Drawn again with the same count: nothing is emptied or said again.
    view.rerender(<ResultAnnouncement text="A" notice={{ text: 'Link copied', n: 2 }} />);
    assert.equal(live(view.container).textContent, 'Link copied');
    assert.equal(clock.waiting, 0);
  });

  it('empties the region when it is taken back', () => {
    const view = render(<ResultAnnouncement text="A" notice={{ text: 'Link copied', n: 1 }} />);
    clock.pass(60);
    assert.equal(live(view.container).textContent, 'Link copied');
    view.rerender(<ResultAnnouncement text="A" notice={{ text: 'Link copied', n: 0 }} />);
    assert.equal(live(view.container).textContent, '');
    clock.pass(1000);
    assert.equal(live(view.container).textContent, '');
    view.rerender(<ResultAnnouncement text="A" notice={{ text: 'Link copied', n: 3 }} />);
    clock.pass(60);
    view.rerender(<ResultAnnouncement text="A" />);
    assert.equal(live(view.container).textContent, '');
    clock.pass(1000);
    assert.equal(live(view.container).textContent, '');
  });

  it('has a region of its own in a dialog: a status, mounted empty', () => {
    assert.equal(
      renderToStaticMarkup(<NoticeRegion notice={{ text: 'Link copied', n: 0 }} />),
      '<span class="chart-srOnly" role="status" aria-atomic="true"></span>',
    );
    const view = render(<NoticeRegion notice={{ text: 'Link copied', n: 0 }} />);
    const region = view.container.querySelector('[role="status"]') as HTMLElement;
    clock.pass(1000);
    assert.equal(region.textContent, '');
    view.rerender(<NoticeRegion notice={{ text: 'Link copied', n: 1 }} />);
    clock.pass(59);
    assert.equal(region.textContent, '');
    clock.pass(1);
    assert.equal(region.textContent, 'Link copied');
    view.rerender(<NoticeRegion notice={{ text: 'Link copied', n: 2 }} />);
    assert.equal(region.textContent, '');
    clock.pass(30);
    view.unmount();
    assert.equal(clock.waiting, 0);
  });
});
