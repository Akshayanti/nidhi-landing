/**
 * Unit tests for scripts/lib/media/render-platform-caption.mjs: the caption an
 * operator pastes into Instagram and TikTok. The plan is the fixture
 * scripts/lib/media/fixtures/caption-plan.json; captions are written to a temporary
 * folder and read back.
 *
 * Run with:  npm test
 */
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { writePlatformCaptions } from './render-platform-caption.mjs';

const PLAN = JSON.parse(fs.readFileSync('scripts/lib/media/fixtures/caption-plan.json', 'utf8'));
const DISCLOSURE = 'Voice: AI narrated. Script: AI drafted, human edited. Research and editorial direction: human.';
const TOOL = { url: '/free/loan-comparison/', label: 'Loan comparison', cta: 'Compare two loan offers' };
const PROMISE = 'A worked example for three incomes';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nidhi-captions-'));
after(() => fs.rmSync(tmp, { recursive: true, force: true }));
let run = 0;

/** Writes the captions for a plan (the fixture, with `change` applied) and reads all three files back. */
async function captions({ change = () => {}, ...args } = {}) {
  const plan = structuredClone(PLAN);
  change(plan);
  const captionsDir = path.join(tmp, String(++run));
  const paths = await writePlatformCaptions({ plan, captionsDir, ...args });
  const ig = fs.readFileSync(paths.igPath, 'utf8');
  const tt = fs.readFileSync(paths.ttPath, 'utf8');
  return { paths, ig, tt, json: JSON.parse(fs.readFileSync(paths.jsonPath, 'utf8')), igBlocks: ig.trimEnd().split('\n\n'), ttBlocks: tt.trimEnd().split('\n\n') };
}

describe('render-platform-caption: links', () => {
  it('prints no address in the Instagram caption: it points to the bio', async () => {
    const { ig } = await captions({ relatedTool: TOOL, reelPromise: PROMISE });
    assert.doesNotMatch(ig, /nidhi\.today|https?:|\/blog\/|\/free\//);
    assert.match(ig, /^Free tool · Compare two loan offers\. Link in bio\.\nRead the full lesson · A worked example for three incomes\. Link in bio\.$/m);
  });

  it('prints the full address of the tool and of the lesson in the TikTok caption', async () => {
    const { tt } = await captions({ relatedTool: TOOL, reelPromise: PROMISE });
    assert.match(tt, /^Free tool · Compare two loan offers: nidhi\.today\/free\/loan-comparison\/\nRead the full lesson · A worked example for three incomes: nidhi\.today\/blog\/emergency-fund-basics\/$/m);
    assert.doesNotMatch(tt, /Link in bio/);
  });

  it('always links the lesson, with or without a promise and a tool', async () => {
    const { ig, tt } = await captions();
    assert.match(ig, /^Read the full lesson\. Link in bio\.$/m);
    assert.match(tt, /^Read the full lesson: nidhi\.today\/blog\/emergency-fund-basics\/$/m);
    assert.doesNotMatch(ig + tt, /Free tool/);
  });

  it('adds the leading slash a tool address lacks', async () => {
    const { tt } = await captions({ relatedTool: { ...TOOL, url: 'free/monte-carlo/' } });
    assert.match(tt, /: nidhi\.today\/free\/monte-carlo\/$/m);
  });

  it('leaves the tool line out when the tool has no call to action or no address', async () => {
    for (const relatedTool of [{ url: '/free/loan-comparison/', label: 'Loan comparison' }, { label: 'Loan comparison', cta: 'Compare' }]) {
      const { ig, tt } = await captions({ relatedTool });
      assert.doesNotMatch(ig + tt, /Free tool/);
    }
  });
});

describe('render-platform-caption: limits', () => {
  it('keeps five hashtags on Instagram, each with one leading #', async () => {
    const { igBlocks } = await captions();
    assert.equal(igBlocks.at(-2), '#emergencyfund #savings #moneybasics #personalfinance #budgeting');
  });

  it('adds TikTok\'s extra tags after those five, without repeating one', async () => {
    const { ttBlocks } = await captions();
    assert.equal(ttBlocks.at(-1), '#emergencyfund #savings #moneybasics #personalfinance #budgeting #moneytok #fintok');
  });

  it('wraps the Instagram keyword block at 60 characters a line, inside one pair of brackets', async () => {
    const { igBlocks } = await captions();
    const block = igBlocks.at(-1);
    assert.equal(block, [
      '[ emergency fund, fondo de emergencia, आपातकालीन निधि,',
      'nouzový fond, how much to save, rainy day savings,',
      'three months of expenses, savings buffer ]',
    ].join('\n'));
    for (const line of block.slice(2, -2).split('\n')) assert.ok(line.length <= 60, line);
  });

  it('gives a keyword longer than a line a line of its own, whole', async () => {
    const long = 'k'.repeat(70);
    const { igBlocks } = await captions({ change: (p) => { p.caption.instagramKeywords = ['short', long, 'tail']; } });
    assert.equal(igBlocks.at(-1), `[ short,\n${long},\ntail ]`);
  });

  it('has no hyphen in the disclosure line, as captions allow none', () => {
    assert.doesNotMatch(DISCLOSURE, /-/);
  });
});

describe('render-platform-caption: layout', () => {
  it('orders the Instagram caption: body, links, disclosure, hashtags, keywords, a blank line between each', async () => {
    const { ig, igBlocks } = await captions({ relatedTool: TOOL });
    assert.equal(igBlocks.length, 5);
    assert.match(igBlocks[0], /Here is what the number is made of\.\nStay till the end for the worked example\.$/);
    assert.match(igBlocks[1], /^Free tool · /);
    assert.equal(igBlocks[2], DISCLOSURE);
    assert.match(igBlocks[3], /^#emergencyfund /);
    assert.match(igBlocks[4], /^\[ .* \]$/s);
    assert.equal(ig.endsWith(']\n'), true);
    assert.equal(ig.endsWith('\n\n'), false);
  });

  it('orders the TikTok caption: body, links, disclosure, topics, hashtags, and no keyword block', async () => {
    const { tt, ttBlocks } = await captions();
    assert.equal(ttBlocks.length, 5);
    assert.equal(ttBlocks[2], DISCLOSURE);
    assert.equal(ttBlocks[3], 'Topics: how big should an emergency fund be, emergency fund explained, where to keep emergency savings');
    assert.match(ttBlocks[4], /^#emergencyfund /);
    assert.doesNotMatch(tt, /^\[ /m);
  });

  it('drops a block that has nothing in it instead of leaving a gap', async () => {
    const { ig, tt, igBlocks, ttBlocks } = await captions({
      change: (p) => { p.hashtags = []; p.caption.instagramKeywords = []; p.caption.tiktokTopics = []; p.caption.tiktokExtraTags = []; },
    });
    assert.equal(igBlocks.at(-1), DISCLOSURE);
    assert.equal(ttBlocks.at(-1), DISCLOSURE);
    assert.doesNotMatch(ig + tt, /\n\n\n|Topics:|#/);
  });

  it('carries the same disclosure on both platforms', async () => {
    const { ig, tt, json } = await captions();
    assert.equal(json.aiDisclosure, DISCLOSURE);
    assert.equal(ig.split(DISCLOSURE).length, 2);
    assert.equal(tt.split(DISCLOSURE).length, 2);
  });
});

describe('render-platform-caption: the opening line', () => {
  it('opens both captions with the hook variant in use, and keeps the rest of the body', async () => {
    const { igBlocks, ttBlocks } = await captions();
    assert.equal(igBlocks[0], 'Three months of what, exactly?\nHere is what the number is made of.\nStay till the end for the worked example.');
    assert.equal(ttBlocks[0], 'Three months of what, exactly?\nThe number has three parts.');
  });

  it('leaves the body as written when its first line is already the hook, and when the plan has no variants', async () => {
    const written = 'Most people guess their emergency fund.\nThe number has three parts.';
    assert.equal((await captions({ change: (p) => { p.useHookVariant = 0; } })).ttBlocks[0], written);
    assert.equal((await captions({ change: (p) => { delete p.hookVariants; } })).ttBlocks[0], written);
  });

  it('falls back to the first variant when none is chosen or the choice does not exist', async () => {
    for (const choice of [undefined, 7, '1']) {
      const { ttBlocks } = await captions({ change: (p) => { p.useHookVariant = choice; p.hookVariants[0].narration = 'A first hook.'; } });
      assert.equal(ttBlocks[0].split('\n')[0], 'A first hook.', String(choice));
    }
  });
});

describe('render-platform-caption: the files', () => {
  it('writes three files named after the slug, or after the name it is given', async () => {
    const bySlug = await captions();
    assert.deepEqual(Object.values(bySlug.paths).map((p) => path.basename(p)), ['emergency-fund-basics.ig.txt', 'emergency-fund-basics.tiktok.txt', 'emergency-fund-basics.json']);
    const named = await captions({ fileBase: '07-emergency-fund-basics' });
    assert.deepEqual(Object.values(named.paths).map((p) => path.basename(p)), ['07-emergency-fund-basics.ig.txt', '07-emergency-fund-basics.tiktok.txt', '07-emergency-fund-basics.json']);
  });

  it('writes the same two captions into the JSON, with what they were built from', async () => {
    const { ig, tt, json } = await captions({ relatedTool: TOOL, reelPromise: PROMISE });
    assert.equal(json.instagram, ig);
    assert.equal(json.tiktok, tt);
    assert.equal(json.slug, 'emergency-fund-basics');
    assert.deepEqual(json.relatedTool, TOOL);
    assert.equal(json.reelPromise, PROMISE);
    // All seven: the cap is applied to the caption, not to the record.
    assert.equal(json.hashtags.length, 7);
  });

  it('records that neither platform\'s AI toggle is switched on, and null for what was not given', async () => {
    const { json } = await captions({ change: (p) => { delete p.caption.tiktokTopics; } });
    assert.deepEqual(json.aiPlatformToggle, { instagram: false, tiktok: false });
    assert.equal(json.relatedTool, null);
    assert.equal(json.reelPromise, null);
    assert.equal(json.tiktokTopics, null);
  });

  it('warns about a dash or hyphen in the promise, and still writes the caption', async (t) => {
    const warn = t.mock.method(console, 'warn', () => {});
    const { tt } = await captions({ reelPromise: 'A step-by-step table' });
    assert.equal(warn.mock.callCount(), 1);
    assert.match(warn.mock.calls[0].arguments[0], /reelPromise has a dash or hyphen/);
    assert.match(tt, /Read the full lesson · A step-by-step table: nidhi\.today/);

    await captions({ reelPromise: PROMISE });
    assert.equal(warn.mock.callCount(), 1);
  });
});
