/**
 * Renders each How-to guide's share image (the og:image a link preview shows)
 * to public/brand/social/how-to/<slug>.png, 1200×630.
 *
 * The card shows the guide's question, its hub group and how many steps it
 * has, in the site's fonts and colours: what someone sees when a guide is
 * sent to them, before they open it. Run after adding a guide or changing a
 * title:
 *
 *   node scripts/render-guide-cards.mjs            # every guide
 *   node scripts/render-guide-cards.mjs <slug>     # one guide
 *
 * The guide page uses the image when the file exists and the site's default
 * card otherwise, so a new guide never breaks the build for lack of one.
 */
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer';

const ROOT = join(import.meta.dirname, '..');
const GUIDES = join(ROOT, 'src/content/guides');
const OUT = join(ROOT, 'public/brand/social/how-to');
const GROUPS = {
  month: 'Getting through the month',
  owe: 'I owe money',
  borders: 'Money across borders',
  safe: 'Is this safe?',
};

function field(block, key) {
  const m = block.match(new RegExp(`^${key}:\\s*"(.*)"\\s*$`, 'm')) ?? block.match(new RegExp(`^${key}:\\s*(\\S.*)$`, 'm'));
  return m ? m[1].replace(/\\"/g, '"') : null;
}

function readGuide(file) {
  const text = readFileSync(join(GUIDES, file), 'utf8');
  const block = text.match(/^---\n([\s\S]*?)\n---/)[1];
  const steps = (block.split(/^steps:\s*$/m)[1] ?? '').split(/^\S/m)[0].match(/^ {2}- action:/gm)?.length ?? 0;
  return {
    slug: field(block, 'slug'),
    title: field(block, 'title'),
    group: GROUPS[field(block, 'group')] ?? '',
    form: field(block, 'form'),
    steps,
  };
}

const font = (name) => `data:font/woff2;base64,${readFileSync(join(ROOT, 'public/fonts', name)).toString('base64')}`;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function html(g) {
  const size = g.title.length > 60 ? 58 : g.title.length > 40 ? 66 : 76;
  const meta = g.form === 'example' ? 'A worked example, then how to read your own' : `${g.steps} short steps`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: Inter; src: url(${font('inter-latin.woff2')}) format('woff2'); font-weight: 100 900; }
    @font-face { font-family: Roboto; src: url(${font('roboto-latin.woff2')}) format('woff2'); font-weight: 100 900; }
    * { box-sizing: border-box; margin: 0; }
    body { width: 1200px; height: 630px; background: #F7F9FC; font-family: Roboto, sans-serif; }
    .card { position: absolute; inset: 0; padding: 64px 80px; display: flex; flex-direction: column; border-left: 18px solid #005B4F; }
    .kicker { font-family: Inter; font-weight: 800; font-size: 26px; letter-spacing: 0.12em; text-transform: uppercase; color: #005B4F; }
    .group { font-size: 26px; color: #4A5568; margin-top: 8px; }
    h1 { font-family: Inter; font-weight: 800; font-size: ${size}px; line-height: 1.12; letter-spacing: -0.02em; color: #0A3D8F; margin-top: 40px; max-width: 1000px; }
    .foot { margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; font-size: 26px; color: #4A5568; }
    .brand { font-family: Inter; font-weight: 800; font-size: 40px; color: #0A3D8F; }
    .brand span { display: block; font-family: Roboto; font-weight: 400; font-size: 22px; color: #005B4F; }
  </style></head><body><div class="card">
    <div class="kicker">How-to</div>
    <div class="group">${esc(g.group)}</div>
    <h1>${esc(g.title)}</h1>
    <div class="foot"><div>${esc(meta)} · answer first · free</div><div class="brand">nidhi<span>nidhi.today/how-to</span></div></div>
  </div></body></html>`;
}

const only = process.argv[2];
const guides = readdirSync(GUIDES).filter((f) => f.endsWith('.md')).map(readGuide).filter((g) => !only || g.slug === only);
if (guides.length === 0) throw new Error(only ? `No guide with slug "${only}"` : 'No guides found');
mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630 });
for (const g of guides) {
  await page.setContent(html(g), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(OUT, `${g.slug}.png`) });
  console.log(`${g.slug}.png`);
}
await browser.close();
