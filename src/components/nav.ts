/**
 * The header's destinations, in one place.
 *
 * The desktop dropdowns and the phone sheet used to be two hand-written lists.
 * The same link carried two wordings that drifted apart, and adding one meant
 * editing four places. Both surfaces now render from here.
 *
 * The labels are not here: they live in the string catalogs, keyed by the same
 * `key`. See `navLabel`.
 */
import { localizedPath, type Dict, type Locale } from '../i18n';
import { MONTE_CARLO_URL } from '../utils/monte-carlo/release.ts';

/**
 * Every destination the header links to. Derived from the catalog, so a link
 * whose label nobody wrote does not type-check.
 */
export type NavItemKey = keyof Dict['nav']['items'];

export interface NavLink {
  key: NavItemKey;
  /** Site-relative and locale-free: the renderer localizes it. An address that
   *  leaves the site, such as a mailto: or another site, is left as it is. */
  href: string;
  /**
   * The `data-attr` label that goes with this link, without the surface prefix
   * the template adds (`nav-` in a dropdown, `nav-menu-` in the sheet). These
   * labels are what analytics distinguishes clicks by and what the privacy
   * policy's changelog refers to, so they are spelled out here rather than
   * derived from the label or the URL: renaming one is a privacy change.
   */
  attr: string;
  /** Opens in a new tab. */
  external?: boolean;
  /**
   * Desktop dropdowns only: mark this entry as the page you are on when the
   * path starts with this prefix, rather than when it equals the href. The
   * phone sheet has always marked on an exact match, and still does.
   */
  activePrefix?: string;
  /** Contact tiles only: the address shown under the label, and its icon. */
  detail?: string;
  icon?: 'mail' | 'instagram';
  /** Desktop dropdowns only: draw a hairline above this entry. */
  dividerBefore?: boolean;
}

/** An entry that opens to show its own links, such as the ways to get in touch. */
export interface NavSubmenu {
  key: 'contact';
  attr: string;
  children: NavLink[];
}

export type NavEntry = NavLink | NavSubmenu;

export interface NavGroup {
  key: 'learn' | 'tools' | 'about';
  /**
   * The desktop dropdown, for the two groups that have one. `attr` is the
   * button's own label, which predates the sheet and is not derived from
   * anything; `activePath` is the prefix that marks the dropdown as current.
   */
  button?: { key: 'tools' | 'learn'; attr: string; activePath: string };
  entries: NavEntry[];
}

/** The phone sheet's groups, in the order it shows them. */
export function navGroups({ showMonteCarlo }: { showMonteCarlo: boolean }): NavGroup[] {
  return [
    {
      key: 'learn',
      button: { key: 'learn', attr: 'nav-learn', activePath: '/blog' },
      entries: [
        { key: 'blog', href: '/blog/', attr: 'blog' },
        { key: 'blogTopics', href: '/blog/tag/', attr: 'blog-topics', activePrefix: '/blog/tag' },
        { key: 'learnEditorial', href: '/editorial-policy/', attr: 'learn-editorial', dividerBefore: true },
      ],
    },
    {
      key: 'tools',
      button: { key: 'tools', attr: 'nav-free-tools', activePath: '/free' },
      entries: [
        { key: 'multiCurrencyNetWorth', href: '/free/multi-currency-net-worth/', attr: 'tool-multi-currency-net-worth' },
        { key: 'loanComparison', href: '/free/loan-comparison/', attr: 'tool-loan-comparison' },
        ...(showMonteCarlo
          ? [{ key: 'monteCarloSimulator' as const, href: MONTE_CARLO_URL, attr: 'tool-monte-carlo-simulator' }]
          : []),
        { key: 'allTools', href: '/free/', attr: 'tool-all', dividerBefore: true },
      ],
    },
    {
      key: 'about',
      entries: [
        { key: 'about', href: '/about/', attr: 'about' },
        { key: 'beliefs', href: '/beliefs/', attr: 'beliefs' },
        { key: 'editorialPolicy', href: '/editorial-policy/', attr: 'editorial-policy' },
        {
          key: 'contact',
          attr: 'contact',
          children: [
            { key: 'email', href: 'mailto:hello@nidhi.today', attr: 'email', detail: 'hello@nidhi.today', icon: 'mail' },
            {
              key: 'instagram',
              href: 'https://www.instagram.com/nidhi.today',
              attr: 'instagram',
              detail: '@nidhi.today',
              icon: 'instagram',
              external: true,
            },
          ],
        },
      ],
    },
  ];
}

/** Which surface a label is being read for. */
export type NavSurface = 'sheet' | 'menu';

/**
 * The desktop nav shows these two dropdowns, in this order. It is not the
 * sheet's order, which is why the order is stated rather than taken from
 * `navGroups`.
 */
export const DESKTOP_DROPDOWNS = ['tools', 'learn'] as const;

/** The label for an entry: the sheet's wording, or the dropdown's own. */
export function navLabel(strings: Dict, key: NavItemKey, surface: NavSurface = 'sheet'): string {
  if (surface === 'menu') {
    const menu: Partial<Record<NavItemKey, string>> = strings.nav.menu;
    const override = menu[key];
    if (override) return override;
  }
  return strings.nav.items[key];
}

/** A link that leaves the site keeps its href; every other one is localized. */
export function navHref(locale: Locale, href: string): string {
  return /^[a-z][a-z0-9+.-]*:/i.test(href) ? href : localizedPath(locale, href);
}
