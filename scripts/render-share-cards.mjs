/**
 * Renders the share images (the og:image a link preview shows), 1200×630:
 * each How-to guide's, each lesson's and each free tool's, to
 * public/brand/social/{how-to,lessons,tools}/<slug>.png.
 *
 * A card shows what the link is (a guide, a lesson, a tool), its title and a
 * line about it, in the site's fonts, colours and brand mark (#420, #743):
 * what someone sees when a page is sent to them, before they open it. Cards
 * are in English. Lessons are English in every edition, and a translated
 * tool page keeps the English brand card, as docs/brand-identity.md says
 * (owner, Nov 28, 2026, #743). Run after adding a guide, a lesson or a tool,
 * or changing a title:
 *
 *   node scripts/render-share-cards.mjs                  # every card
 *   node scripts/render-share-cards.mjs lessons          # one kind
 *   node scripts/render-share-cards.mjs lessons <slug>   # one card
 *
 * A page uses its card when the file exists and the site's default card
 * otherwise (src/utils/shareCard.ts), so a new page never breaks the build
 * for lack of one.
 */
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer';

const ROOT = join(import.meta.dirname, '..');
const GUIDES = join(ROOT, 'src/content/guides');
const LESSONS = join(ROOT, 'src/content/blog');
const SOCIAL = join(ROOT, 'public/brand/social');
const { en } = await import('../src/i18n/strings/en.ts');
/** The free tools, by the catalog key their hub card uses, and their address. */
const TOOLS = {
  multiCurrencyNetWorth: 'multi-currency-net-worth',
  loanComparison: 'loan-comparison',
  monteCarlo: 'monte-carlo-simulator',
  inflation: 'inflation-calculator',
  investOrPayOff: 'invest-or-pay-off',
};
const GROUPS = {
  month: 'Getting through the month',
  owe: 'I owe money',
  stock: 'Taking stock',
  borders: 'Money across borders',
  safe: 'Is this safe?',
};

function field(block, key) {
  const m = block.match(new RegExp(`^${key}:\\s*"(.*)"\\s*$`, 'm')) ?? block.match(new RegExp(`^${key}:\\s*(\\S.*)$`, 'm'));
  return m ? m[1].replace(/\\"/g, '"') : null;
}

function frontmatter(path) {
  return readFileSync(path, 'utf8').match(/^---\n([\s\S]*?)\n---/)[1];
}

function readGuide(file) {
  const block = frontmatter(join(GUIDES, file));
  const steps = (block.split(/^steps:\s*$/m)[1] ?? '').split(/^\S/m)[0].match(/^ {2}- action:/gm)?.length ?? 0;
  return {
    kind: 'how-to',
    slug: field(block, 'slug'),
    title: field(block, 'title'),
    kicker: 'How-to',
    group: GROUPS[field(block, 'group')] ?? '',
    meta: `${field(block, 'form') === 'example' ? 'A worked example, then how to read your own' : `${steps} short steps`} · answer first · free`,
    where: 'nidhi.today/how-to',
  };
}

function readLesson(path) {
  const block = frontmatter(path);
  return {
    kind: 'lessons',
    slug: field(block, 'slug'),
    title: field(block, 'title'),
    kicker: 'Lesson',
    group: en.learn.levels[field(block, 'level')] ?? '',
    meta: 'Sources cited · free',
    where: 'nidhi.today/blog',
  };
}

function readTools() {
  return Object.entries(TOOLS).map(([key, slug]) => ({
    kind: 'tools',
    slug,
    title: en.freeHub.tools[key].title,
    kicker: 'Free tool',
    group: '',
    meta: 'No sign-up · what you type stays in your browser',
    where: 'nidhi.today/free',
  }));
}

const font = (name) => `data:font/woff2;base64,${readFileSync(join(ROOT, 'public/fonts', name)).toString('base64')}`;
// The brand mark, the same file the site's own share cards are drawn from.
const mark = `data:image/png;base64,${readFileSync(join(ROOT, 'public/brand/logo/icon-only/icon-128.png')).toString('base64')}`;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function html(g) {
  const size = g.title.length > 60 ? 58 : g.title.length > 40 ? 66 : 76;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: Inter; src: url(${font('inter-latin.woff2')}) format('woff2'); font-weight: 100 900; }
    @font-face { font-family: Roboto; src: url(${font('roboto-latin.woff2')}) format('woff2'); font-weight: 100 900; }
    * { box-sizing: border-box; margin: 0; }
    body { width: 1200px; height: 630px; background: #F8F9FA; font-family: Roboto, sans-serif; }
    .card { position: absolute; inset: 0; padding: 64px 80px; display: flex; flex-direction: column; border-left: 18px solid #005B4F; }
    .kicker { font-family: Inter; font-weight: 700; font-size: 26px; letter-spacing: 0.08em; text-transform: uppercase; color: #005B4F; }
    .group { font-size: 26px; color: #4A4A4A; margin-top: 8px; }
    h1 { font-family: Inter; font-weight: 700; font-size: ${size}px; line-height: 1.12; letter-spacing: -0.02em; color: #0A3D8F; margin-top: 40px; max-width: 1000px; }
    .foot { margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; font-size: 26px; color: #4A4A4A; }
    .brand { display: flex; align-items: center; gap: 16px; font-family: Inter; font-weight: 700; font-size: 40px; color: #0A3D8F; }
    .brand img { width: 64px; height: 64px; border-radius: 14px; }
    .brand span { display: block; font-family: Roboto; font-weight: 400; font-size: 22px; color: #005B4F; }
  </style></head><body><div class="card">
    <div class="kicker">${esc(g.kicker)}</div>
    ${g.group ? `<div class="group">${esc(g.group)}</div>` : ''}
    <h1>${esc(g.title)}</h1>
    <div class="foot"><div>${esc(g.meta)}</div><div class="brand"><img src="${mark}" alt=""><div>nidhi<span>${esc(g.where)}</span></div></div></div>
  </div></body></html>`;
}

const KINDS = ['how-to', 'lessons', 'tools'];
const [kindArg, only] = process.argv.slice(2);
if (kindArg && !KINDS.includes(kindArg)) throw new Error(`Unknown kind "${kindArg}": expected ${KINDS.join(', ')}`);
const lessonFiles = readdirSync(LESSONS, { recursive: true }).filter((f) => f.endsWith('.md')).map((f) => join(LESSONS, f));
const cards = [
  ...readdirSync(GUIDES).filter((f) => f.endsWith('.md')).map(readGuide),
  ...lessonFiles.map(readLesson),
  ...readTools(),
].filter((c) => (!kindArg || c.kind === kindArg) && (!only || c.slug === only));
if (cards.length === 0) throw new Error(only ? `No ${kindArg} page with slug "${only}"` : 'No pages found');
const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630 });
for (const c of cards) {
  mkdirSync(join(SOCIAL, c.kind), { recursive: true });
  await page.setContent(html(c), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(SOCIAL, c.kind, `${c.slug}.png`) });
  console.log(`${c.kind}/${c.slug}.png`);
}
await browser.close();
