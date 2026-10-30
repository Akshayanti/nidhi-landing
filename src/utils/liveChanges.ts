/**
 * The "What's changed" days as readers see them: the dated days in
 * `src/i18n/strings/changes.ts`, plus each launch item once its release gate
 * has opened, dated with the launch. A launch item joins that day's entry if
 * the day already has one (an item for the same day reads first), or makes a
 * new day in date order, so there is still one day per date.
 *
 * Node-only through `astro:content`: the page and the feeds call it at build
 * time.
 */
import { CHANGE_DAYS, LAUNCH_ITEMS, type ChangeDay, type ChangeItem } from '../i18n/strings/changes.ts';
import { investOrPayOffReleaseDate, isInvestOrPayOffReleased } from './invest-or-pay-off/release.ts';

export function withLaunchItem(days: ChangeDay[], item: ChangeItem, date: string): ChangeDay[] {
  const out = days.map((d) => ({ ...d, items: [...d.items] }));
  const same = out.find((d) => d.date === date);
  if (same) {
    same.items.unshift(item);
    return out;
  }
  out.push({ date, items: [item] });
  return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export async function liveChangeDays(): Promise<ChangeDay[]> {
  let days = CHANGE_DAYS;
  const launch = await investOrPayOffReleaseDate();
  if (launch && (await isInvestOrPayOffReleased())) {
    days = withLaunchItem(days, LAUNCH_ITEMS.investOrPayOff, launch.toISOString().slice(0, 10));
  }
  return days;
}

export async function liveChanges(): Promise<Array<ChangeItem & { date: string }>> {
  return (await liveChangeDays()).flatMap((d) => d.items.map((item) => ({ ...item, date: d.date })));
}
