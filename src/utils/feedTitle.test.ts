/**
 * Unit tests for src/utils/feedTitle.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { CHANGE_DAYS } from '../i18n/strings/changes.ts';
import { LOCALES } from '../i18n/config.ts';
import { TITLE_MAX, feedTitle, firstSentence } from './feedTitle.ts';

describe('firstSentence', () => {
  it('stops at the first full stop, question mark or exclamation mark', () => {
    assert.equal(firstSentence('The glossary has a new entry. It explains compounding.'), 'The glossary has a new entry.');
    assert.equal(firstSentence('Not sure where to start? Two questions help.'), 'Not sure where to start?');
    assert.equal(firstSentence('¡Hay una herramienta nueva! Compara dos préstamos.'), '¡Hay una herramienta nueva!');
  });

  it('stops at a danda in Hindi and at a full stop in Marathi', () => {
    assert.equal(firstSentence('मुफ़्त टूल में दो छोटे बदलाव। पहला चार्ट में है।'), 'मुफ़्त टूल में दो छोटे बदलाव।');
    assert.equal(firstSentence('मोफत साधनांमध्ये दोन छोटे बदल. पहिला आलेखात आहे.'), 'मोफत साधनांमध्ये दोन छोटे बदल.');
  });

  it('keeps a closing quote or bracket with the sentence it closes', () => {
    assert.equal(firstSentence('The button now says “Compare.” It used to say “Go.”'), 'The button now says “Compare.”');
    assert.equal(firstSentence('The page is shorter (by a third). Nothing was lost.'), 'The page is shorter (by a third).');
  });

  it('does not stop at a decimal point, an abbreviation or a Czech date', () => {
    assert.equal(firstSentence('A label that read €1.87M is now shorter. Others are unchanged.'), 'A label that read €1.87M is now shorter.');
    assert.equal(firstSentence('Some tools, e.g. the loan comparison, are faster. The rest follow.'), 'Some tools, e.g. the loan comparison, are faster.');
    assert.equal(firstSentence('Od 10. listopadu je tu nová stránka. Najdete ji v menu.'), 'Od 10. listopadu je tu nová stránka.');
  });

  it('returns text with one sentence, or no closing mark, whole', () => {
    assert.equal(firstSentence('Two small things in the free tools.'), 'Two small things in the free tools.');
    assert.equal(firstSentence('  No closing mark here '), 'No closing mark here');
  });
});

describe('feedTitle', () => {
  it('is the first sentence when that is short enough', () => {
    assert.equal(feedTitle('Short and whole. And then a second sentence.'), 'Short and whole.');
  });

  it('cuts a long sentence at the end of a clause, with an ellipsis', () => {
    const text = 'On Hindi and Marathi pages, chart labels now show every currency in lakhs and crores, not only rupees: a label that read one thing now reads another, and the rest of the page is as it was before.';
    assert.equal(feedTitle(text, 100), 'On Hindi and Marathi pages, chart labels now show every currency in lakhs and crores…');
  });

  it('cuts at a space, never inside a word, when no clause ends in reach', () => {
    const text = 'Las etiquetas y los títulos de los gráficos de las herramientas gratuitas ahora muestran todas las monedas en lakhs y crores.';
    const title = feedTitle(text, 60);
    assert.equal(title, 'Las etiquetas y los títulos de los gráficos de las…');
    assert.ok(text.startsWith(title.slice(0, -1) + ' '));
  });

  it('does not strand a Czech one-letter word before a no-break space', () => {
    const text = 'Na stránkách v hindštině teď popisky grafů zobrazují každou měnu v jednotkách lakh a crore místo zkratek.';
    // Whatever the limit, the cut never falls between "v" or "a" and its word.
    for (let max = 20; max < text.length; max += 1) {
      const title = feedTitle(text, max);
      assert.doesNotMatch(title, /(?:^| )[va]…$/u, `max ${max}: ${title}`);
      assert.ok(text.startsWith(`${title.slice(0, -1)} `), `max ${max}: ${title}`);
    }
    assert.equal(feedTitle(text, 70), 'Na stránkách v\u00a0hindštině teď popisky grafů zobrazují každou měnu…');
  });

  it('returns a single unbroken word whole rather than cutting it', () => {
    const word = 'a'.repeat(200);
    assert.equal(feedTitle(word, 50), word);
  });
});

describe('the titles of the real feed', () => {
  const items = CHANGE_DAYS.flatMap((d) => d.items);

  for (const locale of LOCALES) {
    it(`${locale}: every title is short, starts its item and ends at a word`, () => {
      for (const item of items) {
        const text = item.text[locale];
        const title = feedTitle(text);
        assert.ok(title.length > 0, item.id);
        assert.ok([...title].length <= TITLE_MAX, `${item.id}: ${[...title].length} characters`);
        if (title.endsWith('…') && !text.startsWith(title)) {
          const kept = title.slice(0, -1);
          assert.ok(text.startsWith(kept), `${item.id}: the title is not the start of the item`);
          // What follows the cut is a space or a clause mark, so no word was split.
          assert.match(text.slice(kept.length, kept.length + 2), /^[:;,]? /u, `${item.id}: cut inside a word`);
        } else {
          assert.ok(text.startsWith(title), `${item.id}: the title is not the start of the item`);
        }
      }
    });
  }
});
