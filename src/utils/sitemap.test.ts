/**
 * Unit tests for src/utils/sitemap.ts: which addresses the sitemap lists and
 * the date it gives each (#361). astro.config.mjs passes these functions to
 * the sitemap integration as they are, so what is tested here is what the
 * build does; scripts/check-dist.mjs then checks the sitemap it wrote.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  STATIC_PAGE_SOURCE,
  contentMapsFrom,
  guideMapsFrom,
  laterOf,
  lastmodFor,
  newestChangeDay,
  parseFrontmatter,
  sitemapFilter,
  sitemapI18n,
  sitemapSerialize,
  splitLocalePath,
  staticPageSources,
  type SerializeInputs,
} from './sitemap.ts';
import { LOCALES } from '../i18n/config.ts';
import type { SitemapItem } from './sitemap.ts';

const ROOT = join(import.meta.dirname, '..', '..');
const NOW = new Date('2026-11-21T12:00:00Z');

function lesson(fields: Record<string, string>, extra = ''): string {
  return `---\n${Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('\n')}\n${extra}---\n\nBody.\n`;
}

const LESSONS = [
  lesson({ slug: 'budgeting', pubDate: '2026-01-10', level: 'discovery', tags: '[saving, budgeting]' }),
  lesson({ slug: 'emergency-fund', pubDate: "'2026-02-01'", updatedDate: '2026-03-05', level: 'discovery', tags: '[saving]' }, 'glossary:\n  - term: x\n'),
  // Edited while still scheduled: the edit is older than publication.
  lesson({ slug: 'index-funds', pubDate: '2026-04-01', updatedDate: '2026-03-01', level: 'building', tags: '["investing"]' }),
  lesson({ slug: 'inclusive-1', pubDate: '2026-05-01', level: 'inclusive-finances' }),
  // Scheduled: not live on NOW, so it moves no date.
  lesson({ slug: 'future', pubDate: '2026-12-25', level: 'mastery', tags: '[saving]' }, 'glossary:\n  - term: y\n'),
  lesson({ pubDate: '2026-01-01' }),
  'no frontmatter at all',
  lesson({ slug: 'bad-date', pubDate: 'not a date' }),
];
const content = contentMapsFrom(LESSONS, NOW);
const guides = guideMapsFrom([
  lesson({ slug: 'compare-loans', pubDate: '2026-06-01', lastChecked: '2026-09-01' }),
  lesson({ slug: 'list-accounts', pubDate: '2026-07-01' }),
  lesson({ slug: 'later', pubDate: '2027-01-01' }),
], NOW);
const inputs: SerializeInputs = {
  content,
  guides,
  changesDay: '2026-11-20T00:00:00.000Z',
  lastmodOf: (sources) => `git:${sources.join(',')}`,
};
const url = (path: string) => `https://nidhi.today${path}`;

describe('parseFrontmatter', () => {
  it('reads scalars, strips quotes, reads inline tags and notes a glossary', () => {
    const fm = parseFrontmatter(lesson({ slug: "'a-b'", title: '"Quoted: yes"', tags: "['x', \"y\", z]" }, 'glossary:\n  - term: t\n'));
    assert.equal(fm?.slug, 'a-b');
    assert.equal(fm?.title, 'Quoted: yes');
    assert.deepEqual(fm?.tags, ['x', 'y', 'z']);
    assert.equal(fm?.hasGlossary, true);
  });

  it('returns null without a frontmatter block, and reads CRLF files', () => {
    assert.equal(parseFrontmatter('# Just a heading'), null);
    assert.equal(parseFrontmatter('---\r\nslug: crlf\r\n---\r\n')?.slug, 'crlf');
  });
});

describe('contentMapsFrom', () => {
  it('dates a lesson by its last edit, never before it was published', () => {
    assert.equal(content.blog.get('budgeting'), '2026-01-10T00:00:00.000Z');
    assert.equal(content.blog.get('emergency-fund'), '2026-03-05T00:00:00.000Z');
    assert.equal(content.blog.get('index-funds'), '2026-04-01T00:00:00.000Z');
    assert.equal(content.published.get('emergency-fund'), '2026-02-01T00:00:00.000Z');
  });

  it('leaves out scheduled lessons and files without a slug or a date', () => {
    assert.deepEqual([...content.blog.keys()].sort(), ['budgeting', 'emergency-fund', 'inclusive-1', 'index-funds']);
    assert.equal(content.level.has('mastery'), false);
  });

  it('dates each tag, level, the Inclusive hub and the glossary by their newest live lesson', () => {
    assert.equal(content.tag.get('saving'), '2026-03-05T00:00:00.000Z');
    assert.equal(content.tag.get('investing'), '2026-04-01T00:00:00.000Z');
    assert.equal(content.level.get('discovery'), '2026-03-05T00:00:00.000Z');
    assert.equal(content.level.has('inclusive-finances'), false, 'Inclusive Finances is a hub, not a level page');
    assert.equal(content.inclusive, '2026-05-01T00:00:00.000Z');
    assert.equal(content.glossary, '2026-03-05T00:00:00.000Z');
  });

  it('is empty, not broken, with no lessons', () => {
    const none = contentMapsFrom([], NOW);
    assert.equal(none.blog.size, 0);
    assert.equal(none.inclusive, null);
  });
});

describe('guideMapsFrom', () => {
  it('dates a guide by when it was last checked, and the hub by the newest guide', () => {
    assert.equal(guides.guide.get('compare-loans'), '2026-09-01T00:00:00.000Z');
    assert.equal(guides.guide.get('list-accounts'), '2026-07-01T00:00:00.000Z');
    assert.equal(guides.guide.has('later'), false);
    assert.equal(guides.newest, '2026-09-01T00:00:00.000Z');
  });
});

describe('newestChangeDay', () => {
  const published = new Map([['launch-lesson', '2026-11-18T00:00:00.000Z'], ['future-launch', '2026-12-01T00:00:00.000Z']]);

  it('takes the newest day up to today, counting a live launch lesson as a day', () => {
    assert.equal(newestChangeDay(['2026-11-10', '2026-11-15'], ['launch-lesson'], published, '2026-11-21'), '2026-11-18T00:00:00.000Z');
    assert.equal(newestChangeDay(['2026-11-10', '2026-11-19'], ['launch-lesson'], published, '2026-11-21'), '2026-11-19T00:00:00.000Z');
  });

  it('passes over a day after today, and a launch whose lesson is not live', () => {
    assert.equal(newestChangeDay(['2026-11-10', '2026-11-30'], ['future-launch', 'missing'], new Map(), '2026-11-21'), '2026-11-10T00:00:00.000Z');
    assert.equal(newestChangeDay(['2026-12-01'], [], new Map(), '2026-11-21'), null);
  });
});

describe('laterOf', () => {
  it('takes the later of two dates, either of which may be missing', () => {
    assert.equal(laterOf('2026-01-01T00:00:00Z', '2026-02-01T00:00:00Z'), '2026-02-01T00:00:00Z');
    assert.equal(laterOf('2026-03-01T00:00:00Z', '2026-02-01T00:00:00Z'), '2026-03-01T00:00:00Z');
    assert.equal(laterOf(null, '2026-02-01'), '2026-02-01');
    assert.equal(laterOf('2026-02-01', undefined), '2026-02-01');
    assert.equal(laterOf(null, null), undefined);
  });
});

describe('splitLocalePath', () => {
  it('splits each edition off and leaves English as it is', () => {
    assert.deepEqual(splitLocalePath('/'), { locale: 'en', path: '' });
    assert.deepEqual(splitLocalePath('/about/'), { locale: 'en', path: 'about' });
    for (const locale of LOCALES.filter((l) => l !== 'en')) {
      assert.deepEqual(splitLocalePath(`/${locale}/`), { locale, path: '' });
      assert.deepEqual(splitLocalePath(`/${locale}/free/loan-comparison/`), { locale, path: 'free/loan-comparison' });
    }
  });

  it('does not take a two-letter page segment or a longer word for a locale', () => {
    assert.deepEqual(splitLocalePath('/ig/'), { locale: 'en', path: 'ig' });
    assert.deepEqual(splitLocalePath('/history/'), { locale: 'en', path: 'history' });
  });
});

describe('sitemapFilter', () => {
  const listed = (path: string, c = content, g = guides) => sitemapFilter(url(path), c, g);

  it('lists ordinary pages, lessons and tool pages in every edition', () => {
    for (const path of ['/', '/about/', '/blog/budgeting/', '/free/loan-comparison/', '/hi/free/', '/mr/beta/', '/blog/tag/', '/how-to/']) {
      assert.equal(listed(path), true, path);
    }
  });

  it('keeps the newsletter pages and the studio out, in every edition, by first segment only', () => {
    for (const first of ['confirm', 'subscription-confirmed', 'subscription-invalid', 'unsubscribe', 'unsubscribed', 'studio']) {
      assert.equal(listed(`/${first}/`), false, first);
      assert.equal(listed(`/hi/${first}/`), false, `hi ${first}`);
    }
    assert.equal(listed('/studio/qr/'), false);
    assert.equal(listed('/blog/how-to-unsubscribe-from-a-subscription/'), true, 'a lesson slug holding the word stays');
  });

  it('keeps out each tag page, which is noindex, and keeps the tag hub', () => {
    assert.equal(listed('/blog/tag/saving/'), false);
    assert.equal(listed('/es/blog/tag/saving/'), false);
    assert.equal(listed('/blog/tag/'), true);
  });

  it('lists the glossary in English only', () => {
    assert.equal(listed('/blog/glossary/'), true);
    for (const locale of LOCALES.filter((l) => l !== 'en')) assert.equal(listed(`/${locale}/blog/glossary/`), false, locale);
  });

  it('keeps a hub or level page out until it has something live', () => {
    const none = contentMapsFrom([], NOW);
    const noGuides = guideMapsFrom([], NOW);
    assert.equal(listed('/blog/inclusive-finances/'), true);
    assert.equal(listed('/blog/inclusive-finances/', none), false);
    assert.equal(listed('/hi/blog/inclusive-finances/', none), false);
    assert.equal(listed('/how-to/', content, noGuides), false);
    assert.equal(listed('/cs/how-to/', content, noGuides), false);
    assert.equal(listed('/blog/discovery/'), true);
    assert.equal(listed('/blog/mastery/'), false, 'its only lesson is scheduled');
    assert.equal(listed('/hi/blog/mastery/'), false);
  });
});

describe('lastmodFor', () => {
  it('dates lessons, level pages, hubs and the tag hub from the lessons', () => {
    assert.equal(lastmodFor('/blog/emergency-fund/', inputs), '2026-03-05T00:00:00.000Z');
    assert.equal(lastmodFor('/blog/discovery/', inputs), '2026-03-05T00:00:00.000Z');
    assert.equal(lastmodFor('/hi/blog/building/', inputs), '2026-04-01T00:00:00.000Z');
    assert.equal(lastmodFor('/blog/inclusive-finances/', inputs), '2026-05-01T00:00:00.000Z');
    assert.equal(lastmodFor('/blog/tag/', inputs), '2026-04-01T00:00:00.000Z');
    assert.equal(lastmodFor('/blog/no-such-lesson/', inputs), undefined);
  });

  it('dates the tag hub by its sources when no lesson has a tag', () => {
    const bare = { ...inputs, content: contentMapsFrom([], NOW) };
    assert.equal(lastmodFor('/blog/tag/', bare), `git:${staticPageSources('en', 'blog/tag')!.join(',')}`);
  });

  it('dates the How-to hub and each guide from the guides', () => {
    assert.equal(lastmodFor('/how-to/', inputs), '2026-09-01T00:00:00.000Z');
    assert.equal(lastmodFor('/es/how-to/compare-loans/', inputs), '2026-09-01T00:00:00.000Z');
    assert.equal(lastmodFor('/how-to/unknown/', inputs), undefined);
  });

  it('dates "What\'s changed" by its newest day, falling back to its sources', () => {
    assert.equal(lastmodFor('/changes/', inputs), '2026-11-20T00:00:00.000Z');
    assert.equal(lastmodFor('/mr/changes/', { ...inputs, changesDay: null }), `git:${staticPageSources('mr', 'changes')!.join(',')}`);
  });

  it('dates the glossary by whichever changed last, its words or its terms', () => {
    assert.equal(lastmodFor('/blog/glossary/', { ...inputs, lastmodOf: () => '2026-01-01T00:00:00Z' }), '2026-03-05T00:00:00.000Z');
    assert.equal(lastmodFor('/blog/glossary/', { ...inputs, lastmodOf: () => '2026-10-01T00:00:00Z' }), '2026-10-01T00:00:00Z');
  });

  it('dates a static page by its sources and that edition\'s catalog', () => {
    assert.equal(lastmodFor('/hi/free/loan-comparison/', inputs), `git:${[...STATIC_PAGE_SOURCE['free/loan-comparison'], 'src/i18n/strings/hi.ts'].join(',')}`);
    assert.equal(lastmodFor('/blog/', inputs), 'git:src/layouts/BlogIndex.astro,src/i18n/strings/en.ts,src/i18n/strings/learn.ts');
    assert.equal(lastmodFor('/no-sources-listed/', inputs), undefined);
    assert.equal(lastmodFor('/about/', { ...inputs, lastmodOf: () => null }), undefined);
  });
});

describe('sitemapSerialize', () => {
  it('sets the date and adds x-default as the English address', () => {
    const item = sitemapSerialize<SitemapItem>({
      url: url('/hi/about/'),
      links: [{ lang: 'en', url: url('/about/') }, { lang: 'hi', url: url('/hi/about/') }],
    }, { ...inputs, lastmodOf: () => '2026-11-01T00:00:00Z' });
    assert.equal(item.lastmod, '2026-11-01T00:00:00Z');
    assert.deepEqual(item.links?.at(-1), { lang: 'x-default', url: url('/about/') });
  });

  it('adds nothing to an address with no pairs, or no date it does not have', () => {
    const item = sitemapSerialize<SitemapItem>({ url: url('/blog/no-such-lesson/') }, inputs);
    assert.equal(item.lastmod, undefined);
    assert.equal(item.links, undefined);
  });
});

describe('sitemapI18n', () => {
  it('names every locale, with English as the default', () => {
    const i18n = sitemapI18n();
    assert.equal(i18n.defaultLocale, 'en');
    assert.deepEqual(Object.keys(i18n.locales).sort(), [...LOCALES].sort());
  });
});

describe('the sources each static page is dated by', () => {
  it('are files in the repository', () => {
    for (const [path, sources] of Object.entries(STATIC_PAGE_SOURCE)) {
      for (const source of sources) {
        const file = source.replace(/^:\(literal\)/, '');
        assert.doesNotThrow(() => readFileSync(join(ROOT, file)), `${path}: ${file} does not exist`);
      }
    }
  });

  it('are what astro.config.mjs uses: the config imports this module and keeps no copy', () => {
    const config = readFileSync(join(ROOT, 'astro.config.mjs'), 'utf8');
    assert.match(config, /from '\.\/src\/utils\/sitemap\.ts'/);
    assert.match(config, /filter: \(page\) => sitemapFilter\(page, contentMaps, guideMaps\)/);
    assert.match(config, /serialize: \(item\) => sitemapSerialize\(item, sitemapInputs\)/);
    assert.doesNotMatch(config, /STATIC_PAGE_SOURCE|function readFrontmatter|function splitLocalePath/);
  });
});
