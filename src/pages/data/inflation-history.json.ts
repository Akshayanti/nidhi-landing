/**
 * The inflation calculator's country history, served from nidhi.today.
 *
 * Built once, at build time, from src/data/inflation/worldbank.json (World
 * Bank indicator FP.CPI.TOTL.ZG, CC BY 4.0) into the compact form described in
 * src/utils/inflation/history.ts. The calculator fetches it from this address
 * when a reader picks a country, so a reader's browser never contacts the
 * World Bank, and a page that shows no country's history never loads it.
 *
 * Where a monthly price index exists for a country, the BIS's
 * (src/data/inflation/bis-monthly.json) or else the World Bank's own
 * (src/data/inflation/worldbank-monthly.json), the entry also says which
 * month an answer may end at and whose index it is, or why not
 * (src/utils/inflation/monthly.ts). Neither is contacted from a browser.
 */
import type { APIRoute } from 'astro';
import data from '../../data/inflation/worldbank.json';
import bis from '../../data/inflation/bis-monthly.json';
import worldBankMonthly from '../../data/inflation/worldbank-monthly.json';
import { toCompact, type MonthlyFile, type WorldBankFile } from '../../utils/inflation/history.ts';

export const GET: APIRoute = () =>
  new Response(// A month's age is measured from the day of the build, not from the day its file was last changed.
    JSON.stringify(toCompact(data as WorldBankFile, { bis: bis as MonthlyFile, worldBank: worldBankMonthly as MonthlyFile }, new Date().toISOString().slice(0, 10))), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
