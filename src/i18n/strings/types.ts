import type { en } from './en.ts';

/**
 * The shape of every string catalog, derived from the English one, which is
 * the single source of truth. A catalog typed as `Dict` fails to compile when
 * a key is missing and when an unknown key is added, so a locale can never
 * silently fall back to English for a string nobody translated.
 *
 * `en` is deliberately NOT declared `as const`. With literal types, every
 * Hindi value would have to equal the English literal, which is the opposite
 * of the point.
 */
export type Dict = typeof en;
