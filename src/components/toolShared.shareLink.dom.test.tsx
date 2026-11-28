/**
 * useShareLink and ShareUrlBar: a copied share link kept under a tool's
 * buttons (#711), and an answer from the clipboard that comes after the form
 * has changed is dropped.
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { act, cleanup, render } from '@testing-library/react';
import { ShareUrlBar, useShareLink } from './toolShared.tsx';

const WORDS = { status: 'Copied.', prompt: 'Copy this link:' };
const LINK = 'https://nidhi.today/free/x/?utm_source=share#a=1';

type Share = ReturnType<typeof useShareLink>;
let share: Share;
function Tool({ form }: { form: string }) {
  share = useShareLink(form, WORDS);
  return <ShareUrlBar url={share.url} failed={share.failed} label="Copied:" failedLabel={WORDS.prompt} aria="Link" count={share.notice.n} />;
}
const field = () => document.querySelector<HTMLInputElement>('.lc-shareUrlInput');

afterEach(() => cleanup());

describe('useShareLink', () => {
  it('shows a copied link and says it once, and clears it when the form changes', () => {
    const view = render(<Tool form="a" />);
    act(() => share.start().copied(LINK));
    assert.ok(field()?.value === LINK);
    assert.deepEqual(share.notice, { text: WORDS.status, n: 1 });
    assert.ok(document.activeElement !== field(), 'a copy that worked leaves focus alone');
    view.rerender(<Tool form="b" />);
    assert.ok(field() === null);
  });

  it('takes focus to the link when the copy is refused, again on each refusal', () => {
    render(<Tool form="a" />);
    act(() => share.start().refused(LINK));
    assert.equal(document.querySelector('.lc-shareUrlLabel')?.textContent, WORDS.prompt);
    assert.ok(document.activeElement === field());
    (document.activeElement as HTMLElement).blur();
    act(() => share.start().refused(LINK));
    assert.ok(document.activeElement === field());
  });

  it('drops an answer that comes after the form has changed', () => {
    const view = render(<Tool form="a" />);
    const late = share.start();
    view.rerender(<Tool form="b" />);
    act(() => late.copied(LINK));
    act(() => late.refused(LINK));
    assert.ok(field() === null);
    assert.equal(share.notice.n, 0);
    // Nothing is said for it either.
    assert.ok(document.querySelector('.lc-shareUrlLabel') === null);
    // A copy started after the change still counts.
    act(() => share.start().copied(LINK));
    assert.ok(field()?.value === LINK);
  });
});
