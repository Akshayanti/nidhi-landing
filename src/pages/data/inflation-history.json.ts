/**
 * The inflation calculator's country history, served from nidhi.today.
 *
 * Built once, at build time, from src/data/inflation/worldbank.json (World
 * Bank indicator FP.CPI.TOTL.ZG, CC BY 4.0) into the compact form described in
 * src/utils/inflation/history.ts. The calculator fetches it from this address
 * when a reader picks a country, so a reader's browser never contacts the
 * World Bank, and a page that shows no country's history never loads it.
 *
 * Where the BIS publishes a monthly price index for a country
 * (src/data/inflation/bis-monthly.json), the entry also says which month an
 * answer may end at, or why not (src/utils/inflation/monthly.ts). The BIS is
 * never contacted from a browser either.
 */
import type { APIRoute } from 'astro';
import data from '../../data/inflation/worldbank.json';
import monthly from '../../data/inflation/bis-monthly.json';
import { toCompact, type MonthlyFile, type WorldBankFile } from '../../utils/inflation/history.ts';

export const GET: APIRoute = () =>
  new Response(JSON.stringify(toCompact(data as WorldBankFile, monthly as MonthlyFile)), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
