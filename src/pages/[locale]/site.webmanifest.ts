import type { APIContext } from 'astro';
import { readFileSync } from 'node:fs';
import { LOCALE_META, dict, localizedPath } from '../../i18n';
import { localizedStaticPaths, routeLocale } from '../../i18n/routes.ts';

/**
 * The web app manifest of a translated edition (#708): the English one at
 * /brand/site.webmanifest, with this language's tagline as its description,
 * its language tag, and this edition's home page as the place an installed
 * shortcut opens.
 *
 * The English file is written by generate-brand-assets.sh and stays the one
 * place the icons and colours are listed; this reads it at build time, so the
 * two cannot drift. BaseHead links the manifest that matches the page.
 */
export function getStaticPaths() {
  return localizedStaticPaths();
}

export function GET({ params }: APIContext) {
  const locale = routeLocale(params);
  const english = JSON.parse(readFileSync(`${process.cwd()}/public/brand/site.webmanifest`, 'utf8'));
  const manifest = {
    ...english,
    description: dict(locale).nav.tagline,
    lang: LOCALE_META[locale].htmlLang,
    start_url: localizedPath(locale, '/'),
  };
  return new Response(JSON.stringify(manifest, null, 2), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  });
}
