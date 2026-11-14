import type { ISODate, OutageEntry } from "@/types";
import { addDaysISO, daysBetween } from "./dateLogic";

/** Outages that began longer ago than this are extended shutdowns (e.g. a plant restart), not outage work. */
export const REPORT_GRACE_DAYS = 7; // the outage data refreshes weekly
export const MAX_CURRENT_OUTAGE_DAYS = 120;

/**
 * Only current and upcoming outages are shown.
 * - Upcoming: starts today or later (and within `horizon`).
 * - Current: the NRC data says the unit is offline, it started within the last 120 days, and it
 *   isn't past its expected end. The expected end is the later of start + typical length and a
 *   week after the last NRC report (the data refreshes weekly), so an app built from older data
 *   stops listing outages that have most likely finished.
 */
export function isCurrentOrUpcoming(
  o: Pick<OutageEntry, "start" | "status">,
  today: ISODate,
  opts: { horizon: ISODate; typicalDays: number; latestReport: ISODate | null },
): boolean {
  if (o.status === "projected") return o.start >= today && o.start <= opts.horizon;
  if (daysBetween(o.start, today) > MAX_CURRENT_OUTAGE_DAYS) return false;
  const byLength = addDaysISO(o.start, opts.typicalDays - 1);
  const reportGrace = opts.latestReport ? addDaysISO(opts.latestReport, REPORT_GRACE_DAYS) : null;
  const expectedEnd = reportGrace && reportGrace > byLength ? reportGrace : byLength;
  return expectedEnd >= today;
}

/** Day number of a current outage (start day = Day 1). */
export function outageDay(start: ISODate, today: ISODate): number {
  return daysBetween(start, today) + 1;
}
