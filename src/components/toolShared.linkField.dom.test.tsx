/**
 * LinkField: the read-only box a share link is shown in. The link is the
 * field's value property only, never an attribute of the page's markup.
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { createRef } from 'react';
import { cleanup, render } from '@testing-library/react';
import { LinkField } from './toolShared.tsx';

const LINK = 'https://nidhi.today/free/loan-comparison/?utm_source=share#v1_n=SECRETNAME&v1_a=98765';
const field = () => document.querySelector('input')!;

afterEach(() => cleanup());

describe('LinkField', () => {
  it('holds the link as its value, read-only, with no value attribute', () => {
    render(<LinkField link={LINK} className="box" aria-label="Link" />);
    assert.equal(field().value, LINK);
    assert.equal(field().readOnly, true);
    assert.ok(field().getAttribute('value') === null);
    assert.ok(!document.body.innerHTML.includes('SECRETNAME'));
    assert.equal(field().className, 'box');
    assert.equal(field().getAttribute('aria-label'), 'Link');
  });

  it('follows a new link, still without the attribute', () => {
    const view = render(<LinkField link={LINK} />);
    const next = `${LINK}&v2_n=OTHER`;
    view.rerender(<LinkField link={next} />);
    assert.equal(field().value, next);
    assert.ok(field().getAttribute('value') === null);
  });

  it('gives its field to a ref object and to a ref function', () => {
    const object = createRef<HTMLInputElement>();
    const view = render(<LinkField link={LINK} ref={object} />);
    assert.ok(object.current === field());
    view.unmount();
    let given: HTMLInputElement | null = null;
    render(<LinkField link={LINK} ref={(el) => { given = el; }} />);
    assert.ok(given === field());
  });
});
