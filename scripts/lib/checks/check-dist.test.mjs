/**
 * The post-build checks of scripts/lib/checks/check-dist.mjs (#361), each run on a
 * small hand-made site: it passes when the site is right, and fails, naming
 * the page, on the mistake it exists for.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkCanonicals, checkHreflang, checkInternalLinks, checkLeftovers, checkSitemap, checkXml,
  leftovers, readHead, siteFrom, urlPathOf, xmlProblem,
} from './check-dist.mjs';

const O = 'https://nidhi.today';

/** A page: its head states the given canonical and alternates, its body the given HTML. */
function page({ canonical, alternates = [], noindex = false, body = '<p>Hello.</p>' }) {
  const links = [
    ...(canonical === null ? [] : [`<link rel="canonical" href="${canonical}">`]),
    ...alternates.map(([lang, href]) => `<link rel="alternate" hreflang="${lang}" href="${href}">`),
    ...(noindex ? ['<meta name="robots" content="noindex">'] : []),
  ];
  return `<!doctype html><html><head><title>t</title>${links.join('')}</head><body>${body}</body></html>`;
}

const pair = (rest) => [['en', `${O}${rest}`], ['hi', `${O}/hi${rest}`], ['x-default', `${O}${rest}`]];

function sitemap(urls) {
  const body = urls.map(({ loc, links = [] }) => `<url><loc>${O}${loc}</loc>${links.map(([lang, href]) => `<xhtml:link rel="alternate" hreflang="${lang}" href="${href}"/>`).join('')}</url>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${body}</urlset>`;
}
const INDEX = `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${O}/sitemap-0.xml</loc></sitemap></sitemapindex>`;

/** A correct two-edition site: home and about in English and Hindi, a noindexed page, a feed. */
function goodEntries(overrides = {}) {
  const files = {
    'index.html': page({ canonical: `${O}/`, alternates: pair('/'), body: '<a href="/about/">About</a> <a href="/hi/">हिन्दी</a> <img src="/img/a.png" alt="A">' }),
    'hi/index.html': page({ canonical: `${O}/hi/`, alternates: pair('/') }),
    'about/index.html': page({ canonical: `${O}/about/`, alternates: pair('/about/') }),
    'hi/about/index.html': page({ canonical: `${O}/hi/about/`, alternates: pair('/about/') }),
    'thanks/index.html': page({ canonical: `${O}/thanks/`, noindex: true }),
    '404.html': page({ canonical: null, noindex: true }),
    'img/a.png': '',
    'rss.xml': `<?xml version="1.0"?><rss version="2.0"><channel><title>t</title><link>${O}/</link><item><title>About</title><link>${O}/about/</link></item></channel></rss>`,
    'sitemap-index.xml': INDEX,
    'sitemap-0.xml': sitemap([
      { loc: '/', links: pair('/') },
      { loc: '/about/', links: pair('/about/') },
      { loc: '/hi/', links: pair('/') },
      { loc: '/hi/about/', links: pair('/about/') },
    ]),
    ...overrides,
  };
  return Object.entries(files).filter(([, text]) => text !== undefined);
}
const site = (overrides) => siteFrom(goodEntries(overrides));

describe('the site model', () => {
  it('serves index.html at its folder and keeps other files at their own path', () => {
    assert.equal(urlPathOf('index.html'), '/');
    assert.equal(urlPathOf('about/index.html'), '/about/');
    assert.equal(urlPathOf('404.html'), '/404.html');
    const s = site();
    assert.ok(s.pages.has('/about/') && s.files.has('/about/index.html') && s.xml.has('/rss.xml'));
  });

  it('reads canonical, hreflang, noindex and redirects from the head, never from a script', () => {
    const head = readHead('<head><script>"<link rel=canonical href=/x>"</script><link rel="canonical" href="/a/"><meta http-equiv="refresh" content="0;url=/b/"></head>');
    assert.deepEqual(head.canonicals, ['/a/']);
    assert.equal(head.redirect, true);
  });

  it('passes the correct site on every check', () => {
    const s = site();
    for (const check of [checkCanonicals, checkHreflang, checkSitemap, checkInternalLinks, checkLeftovers, checkXml]) {
      assert.deepEqual(check(s), [], check.name);
    }
  });
});

describe('canonical', () => {
  it('fails a page with no canonical, two, or another page\'s', () => {
    const none = checkCanonicals(site({ 'about/index.html': page({ canonical: null, alternates: pair('/about/') }) }));
    assert.match(none[0], /^\/about\/: 0 canonical links/);
    const two = page({ canonical: `${O}/about/`, alternates: pair('/about/') }).replace('</head>', `<link rel="canonical" href="${O}/about/"></head>`);
    assert.match(checkCanonicals(site({ 'about/index.html': two }))[0], /2 canonical links/);
    const other = checkCanonicals(site({ 'hi/about/index.html': page({ canonical: `${O}/about/`, alternates: pair('/about/') }) }));
    assert.match(other[0], /^\/hi\/about\/: canonical is https:\/\/nidhi\.today\/about\/, not/);
  });

  it('asks nothing of a noindexed page or the 404', () => {
    assert.deepEqual(checkCanonicals(site({ 'thanks/index.html': page({ canonical: null, noindex: true }) })), []);
  });
});

describe('hreflang', () => {
  it('fails a page that leaves out an edition it exists in', () => {
    const problems = checkHreflang(site({ 'about/index.html': page({ canonical: `${O}/about/`, alternates: [['en', `${O}/about/`], ['x-default', `${O}/about/`]] }) }));
    assert.ok(problems.some((p) => /^\/about\/: no hreflang="hi"/.test(p)), problems.join('\n'));
  });

  it('fails a link to an edition that does not exist, or is noindexed', () => {
    const entries = goodEntries({ 'hi/about/index.html': page({ canonical: `${O}/hi/about/`, noindex: true }) });
    const problems = checkHreflang(siteFrom(entries));
    assert.ok(problems.some((p) => /^\/about\/: hreflang="hi" names https:\/\/nidhi\.today\/hi\/about\/, which is not an indexable page/.test(p)), problems.join('\n'));
  });

  it('fails a link pointing at the wrong address, a repeated language and a wrong x-default', () => {
    const wrong = [['en', `${O}/about/`], ['hi', `${O}/hi/`], ['x-default', `${O}/about/`]];
    assert.ok(checkHreflang(site({ 'about/index.html': page({ canonical: `${O}/about/`, alternates: wrong }) })).some((p) => /hreflang="hi" points at/.test(p)));
    const twice = [...pair('/about/'), ['hi', `${O}/hi/about/`]];
    assert.ok(checkHreflang(site({ 'about/index.html': page({ canonical: `${O}/about/`, alternates: twice }) })).some((p) => /hreflang="hi" appears twice/.test(p)));
    const xd = [['en', `${O}/about/`], ['hi', `${O}/hi/about/`], ['x-default', `${O}/hi/about/`]];
    assert.ok(checkHreflang(site({ 'about/index.html': page({ canonical: `${O}/about/`, alternates: xd }) })).some((p) => /x-default is .*\/hi\/about\/, not https:\/\/nidhi\.today\/about\//.test(p)));
  });

  it('asks a page alone in its language for nothing beyond itself', () => {
    const solo = page({ canonical: `${O}/lesson/`, alternates: [['en', `${O}/lesson/`], ['x-default', `${O}/lesson/`]] });
    assert.deepEqual(checkHreflang(site({ 'lesson/index.html': solo })), []);
  });
});

describe('sitemap', () => {
  it('fails a noindexed page in the sitemap', () => {
    const map = sitemap([{ loc: '/', links: pair('/') }, { loc: '/about/', links: pair('/about/') }, { loc: '/hi/', links: pair('/') }, { loc: '/hi/about/', links: pair('/about/') }, { loc: '/thanks/' }]);
    assert.ok(checkSitemap(site({ 'sitemap-0.xml': map })).some((p) => /\/thanks\/ is listed, but the page is noindex/.test(p)));
  });

  it('fails an address dist lacks, and an indexable page it leaves out', () => {
    const map = sitemap([{ loc: '/', links: pair('/') }, { loc: '/hi/', links: pair('/') }, { loc: '/hi/about/', links: pair('/about/') }, { loc: '/gone/' }]);
    const problems = checkSitemap(site({ 'sitemap-0.xml': map }));
    assert.ok(problems.some((p) => /\/gone\/ is listed, but dist has no page there/.test(p)), problems.join('\n'));
    assert.ok(problems.some((p) => /\/about\/ is an indexable page, but the sitemap leaves it out/.test(p)), problems.join('\n'));
  });

  it('fails pairs that differ from the page head, and a missing sitemap part', () => {
    const map = sitemap([{ loc: '/', links: pair('/') }, { loc: '/about/' }, { loc: '/hi/', links: pair('/') }, { loc: '/hi/about/', links: pair('/about/') }]);
    assert.ok(checkSitemap(site({ 'sitemap-0.xml': map })).some((p) => /\/about\/ is paired with \[\], its page head with/.test(p)));
    assert.match(checkSitemap(site({ 'sitemap-0.xml': undefined }))[0], /lists \/sitemap-0\.xml, which dist does not have/);
  });
});

describe('internal links', () => {
  it('fails an href, a src and a feed link that resolve to nothing', () => {
    const s = site({
      'about/index.html': page({ canonical: `${O}/about/`, alternates: pair('/about/'), body: '<a href="/no-page/">x</a><img src="../img/missing.png" alt="">' }),
      'rss.xml': `<?xml version="1.0"?><rss version="2.0"><channel><title>t</title><link>${O}/old/</link></channel></rss>`,
    });
    const problems = checkInternalLinks(s);
    assert.ok(problems.some((p) => /^\/about\/ <a href>: \/no-page\/ is not in dist/.test(p)), problems.join('\n'));
    assert.ok(problems.some((p) => /^\/about\/ <img src>: \/img\/missing\.png is not in dist/.test(p)), problems.join('\n'));
    assert.ok(problems.some((p) => /^\/rss\.xml <link>: \/old\/ is not in dist/.test(p)), problems.join('\n'));
  });

  it('accepts a folder without its slash, an anchor, another site and mailto, and ignores script text', () => {
    const body = '<a href="/about">a</a><a href="#top">b</a><a href="https://example.org/x">c</a><a href="mailto:a@b.c">d</a><script>"<a href=/nowhere/>"</script>';
    assert.deepEqual(checkInternalLinks(site({ 'about/index.html': page({ canonical: `${O}/about/`, alternates: pair('/about/'), body }) })), []);
  });
});

describe('leftover template text', () => {
  it('finds a placeholder, [object Object] and undefined where a value belonged', () => {
    assert.ok(leftovers('Saved {amount} this year').length);
    assert.ok(leftovers('[object Object]').length);
    assert.ok(leftovers('undefined').length);
    assert.ok(leftovers('€undefined').length);
    assert.ok(leftovers('rate: undefined').length);
    assert.ok(leftovers('undefined%').length);
  });

  it('leaves the English word, and braces that are not a name, alone', () => {
    assert.deepEqual(leftovers('After the first payment the recast is undefined.'), []);
    assert.deepEqual(leftovers('a set {1, 2}'), []);
  });

  it('reports a leftover in text and in a label, but not in a script or a code sample', () => {
    const body = '<p>You save {amount}.</p><button aria-label="undefined">x</button><script>var a = "{amount}"</script><code>{amount}</code>';
    const problems = checkLeftovers(site({ 'about/index.html': page({ canonical: `${O}/about/`, alternates: pair('/about/'), body }) }));
    assert.equal(problems.filter((p) => p.startsWith('/about/')).length, 2, problems.join('\n'));
  });
});

describe('XML', () => {
  it('accepts well-formed XML, with CDATA, comments and entities', () => {
    assert.equal(xmlProblem('<?xml version="1.0"?><!-- c --><a x="1"><b>&amp;&#38;&#x26;</b><![CDATA[<raw>]]><c/></a>'), null);
  });

  it('names the first problem of a broken document', () => {
    assert.match(xmlProblem('<a><b></a>'), /b|closed|close/i);
    assert.match(xmlProblem('<a x="1" x="2"/>'), /x|twice|repeat/i);
    assert.match(xmlProblem('<a>&nbsp;</a>'), /nbsp|entit/i);
    assert.match(xmlProblem('<a/><b/>'), /root|one/i);
    assert.match(xmlProblem('<a x=1/>'), /quot|attribute/i);
  });

  it('fails a feed that does not parse', () => {
    assert.match(checkXml(site({ 'rss.xml': '<rss><channel></rss>' }))[0], /^\/rss\.xml:/);
  });
});
