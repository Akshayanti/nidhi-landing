/**
 * A field error's lead-in ("Error: {message}"), handed down by each island,
 * and the unreadable-value line beside it: what a page says before and after
 * they arrive. Drawn to markup, so it needs no browser; the rest of
 * toolShared is in toolShared.dom.test.tsx.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { useContext } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ErrorLeadContext, ErrorText, UnreadableContext, useErrorText } from './toolShared.tsx';

describe('a field error', () => {
  const Said = () => <p>{`${useContext(ErrorLeadContext)}|${useContext(UnreadableContext)}`}</p>;
  const Message = ({ text }: { text: string }) => <p>{useErrorText(text)}</p>;

  it('has no lead-in and no unreadable line until the island hands them down', () => {
    assert.equal(renderToStaticMarkup(<Said />), '<p>|</p>');
    assert.equal(renderToStaticMarkup(<Message text="Enter a rate" />), '<p>Enter a rate</p>');
  });

  it('puts the translated lead-in in front of the message', () => {
    const html = renderToStaticMarkup(
      <ErrorLeadContext.Provider value="Chyba: {message}">
        <p><ErrorText>Zadejte sazbu</ErrorText></p>
      </ErrorLeadContext.Provider>,
    );
    assert.equal(html, '<p>Chyba: Zadejte sazbu</p>');
  });
});
