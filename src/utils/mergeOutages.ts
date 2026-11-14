import type { ISODate, OutageEntry, UserOutage } from "@/types";
import { addDaysISO, daysBetween } from "./dateLogic";
import { FOLLOW_MATCH_DAYS } from "./follow";
import { isCurrentOrUpcoming } from "./outageVisibility";

export interface ListedOutage extends OutageEntry {
  /** "user" = added or corrected by the user on this device. */
  source: "nrc" | "user";
  userId?: string;
}

const sameOutage = (a: { plantId: string; unit: number; start: ISODate }, b: { plantId: string; unit: number; start: ISODate }) =>
  a.plantId === b.plantId && a.unit === b.unit && Math.abs(daysBetween(a.start, b.start)) <= FOLLOW_MATCH_DAYS;

/**
 * Projected/NRC outages with the user's own entries applied: a corrected outage replaces the
 * projected one it was made from; added outages are listed alongside. Only current and upcoming
 * outages (within `horizon`) are returned, sorted by start date.
 */
export function mergeOutages(
  base: OutageEntry[],
  user: UserOutage[],
  today: ISODate,
  opts: { horizon: ISODate; typicalDays: (plantId: string, unit: number) => number; latestReport: ISODate | null },
): ListedOutage[] {
  const replaced = user.filter((u) => u.replaces).map((u) => u.replaces!);
  const fromNrc: ListedOutage[] = base
    .filter((o) => !replaced.some((r) => sameOutage(r, o)))
    .filter((o) =>
      isCurrentOrUpcoming(o, today, {
        horizon: opts.horizon,
        typicalDays: opts.typicalDays(o.plantId, o.unit),
        latestReport: opts.latestReport,
      }),
    )
    .map((o) => ({ ...o, source: "nrc" as const }));

  const fromUser: ListedOutage[] = user
    .map((u) => {
      const end = addDaysISO(u.start, u.days - 1);
      const status = u.start > today ? ("projected" as const) : end >= today ? ("in-progress" as const) : null;
      return status && u.start <= opts.horizon
        ? { plantId: u.plantId, unit: u.unit, start: u.start, days: u.days, status, source: "user" as const, userId: u.id }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return [...fromNrc, ...fromUser].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
}
