/**
 * The Monte Carlo simulator as it starts (#790): what the untouched page
 * says and offers, what it publishes once something is typed, and the
 * starting result the page hands it.
 */
import {
  island, w, shared, STARTING_RESULT, settle, events, mountWith, mount, openPlan, heading,
  text, one, money, describedBy, reader, typeStart,
} from '../../test/monteCarloPage.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fireEvent, screen } from '@testing-library/react';
import { DEFAULTS, SHARED_STATE_GLOBAL, decodeState, defaultState } from '../utils/monte-carlo/url.ts';
import { roundedResult, simulate, type SimulationResult } from '../utils/monte-carlo/math.ts';
import { formErrors, formFromLink } from '../utils/monte-carlo/form.ts';

describe('the Monte Carlo simulator, mounted', () => {
  it('publishes what is typed, readable or not, and marks what cannot be read', async () => {
    mount();
    {
      // publishes a typed starting amount for the language switch
      await typeStart('73191');
      const raw = shared();
      assert.equal(typeof raw, 'string');
      assert.notEqual(raw, '');
      assert.equal(decodeState(raw as string)?.start, 73191);
    }
    {
      // publishes an unreadable starting amount as still in error
      await typeStart('7x');
      const raw = shared();
      assert.equal(typeof raw, 'string');
      assert.notEqual(raw, '');
      const form = formFromLink(raw as string);
      assert.ok(form, 'the published state decodes');
      assert.equal(form.start, 'NaN');
      assert.equal(formErrors(form).start, true);
    }
    {
      // marks an unreadable starting amount invalid and withholds the results
      const box = screen.getByLabelText(island.fields.start);
      assert.equal(box.getAttribute('aria-invalid'), 'true');
      assert.ok(screen.getByText(island.actions.fix, { selector: '.tool-resultReason' }));
    }
  });
});

describe('the page as it starts', () => {
  it('says, offers and describes what it should, and counts nothing', async () => {
    const { container } = mountWith({ netWorthHref: '/hi/free/multi-currency-net-worth/' });
    await settle(20);
    {
      // an untouched page counts nothing and publishes nothing to carry
      assert.deepEqual(events, []);
      assert.equal(w[SHARED_STATE_GLOBAL], '');
      assert.equal(heading().textContent, 'After 30 years of saving');
      assert.equal(one('.ifc-example').textContent, island.example);
    }
    {
      // describes each setting with the rates it runs at
      assert.deepEqual(text('.mcs-tip').map((s) => s.match(/[\d.]+%/g)), [['4%', '1%'], ['5.3%', '1.7%'], ['6%', '3%']]);
    }
    {
      // ten thousand runs or more carry no warning
      assert.ok(!one('.mcs-caveat').textContent?.includes('With only'));
      assert.ok(one('.mcs-caveat').textContent?.includes('shares of 10,000 simulated paths'));
    }
    {
      // a valid box points only at its hint, and a box without one at nothing
      assert.deepEqual(describedBy(screen.getByLabelText(island.fields.start)), [island.fields.startHint]);
      assert.equal(screen.getByLabelText(island.fields.monthly).getAttribute('aria-describedby'), null);
      assert.equal(screen.getByLabelText(island.fields.monthly).getAttribute('aria-invalid'), null);
    }
    {
      // a box of years asks for whole numbers, an amount box for decimals
      assert.equal(screen.getByLabelText(island.fields.saveYears).getAttribute('inputmode'), 'numeric');
      assert.equal(screen.getByLabelText(island.fields.start).getAttribute('inputmode'), 'decimal');
      assert.equal(screen.getByLabelText(island.fields.start).getAttribute('autocomplete'), 'off');
    }
    {
      // the fee box says its range in its hint
      const box = screen.getByLabelText(island.settings.feeLabel);
      assert.equal(document.getElementById(box.getAttribute('aria-describedby') ?? '')?.textContent, "Fund and platform fees, taken off every year's return. 0 to 5.");
      assert.equal(screen.getByLabelText(island.settings.pathsLabel).getAttribute('aria-describedby'), `${screen.getByLabelText(island.settings.pathsLabel).id}-hint`);
      assert.equal(document.getElementById(`${screen.getByLabelText(island.settings.pathsLabel).id}-hint`)?.textContent, island.settings.pathsHint);
    }
    {
      // each return setting is described by its own tooltip
      for (const r of screen.getAllByRole('radio')) {
        const tip = document.getElementById(r.getAttribute('aria-describedby') ?? '');
        assert.equal(tip?.getAttribute('role'), 'tooltip');
        assert.ok(tip?.textContent);
      }
      const names = new Set(screen.getAllByRole('radio').map((r) => r.getAttribute('name')));
      assert.equal(names.size, 1, 'one group');
    }
    {
      // submitting the form does not leave the page
      const submitted = fireEvent.submit(screen.getByRole('form', { name: island.formLabel }));
      assert.equal(submitted, false);
    }
    {
      // the tool cannot be used until it has started, then can
      assert.equal(one('.mcs-root').getAttribute('aria-busy'), null);
      assert.ok(container.querySelector('form[aria-label="Your plan"]'));
    }
    {
      // links to the net worth calculator the page names
      assert.equal(screen.getByRole('link', { name: island.fields.crossLink.link }).getAttribute('href'), '/hi/free/multi-currency-net-worth/');
    }
    {
      // the jump button takes the reader to the full result
      const h = heading();
      let scrolled: unknown = null;
      (h as unknown as Record<string, unknown>).scrollIntoView = (o: unknown) => { scrolled = o; };
      const user = reader();
      await user.click(screen.getByRole('button', { name: island.quick.jump }));
      assert.deepEqual(scrolled, { block: 'start' });
      assert.equal(document.activeElement, h);
    }
  });

});

describe('the starting result', () => {
  // A result the starting plan would never give, so it shows which was drawn.
  const given = simulate({ ...defaultState('EUR'), start: 123_456 });
  const median = (r: SimulationResult) => money(roundedResult(r).atRetirement.p50);

  it('an ordinary load draws the one the page worked out, and does not work it out again', async () => {
    mountWith({ initialResult: given });
    await settle();
    assert.notEqual(median(given), median(STARTING_RESULT));
    assert.equal(one('.mcs-quickValue').textContent, median(given));
    assert.equal(heading().textContent, 'After 30 years of saving');
  });

  it('a shared plan replaces it with its own', async () => {
    const { plan } = openPlan({ saveYears: 5, paths: 100 }, { initialResult: given });
    await settle(20);
    assert.equal(one('.mcs-quickValue').textContent, median(simulate(plan)));
  });

  it('a shared plan whose boxes read differently shows what the boxes say', async () => {
    w[SHARED_STATE_GLOBAL] = 's=0000000000000001&n=100';
    mountWith({ initialResult: given });
    await settle();
    assert.equal(one('.mcs-quickValue').textContent, median(simulate({ ...DEFAULTS, start: 1, paths: 100 })));
  });
});
