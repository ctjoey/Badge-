/**
 * Nuke30 date math for NRC 10 CFR § 73.56 unescorted-access windows.
 *
 * All dates are calendar dates normalized to LOCAL midnight so that DST changes
 * and time-of-day never produce off-by-one results. Day counts use
 * `differenceInCalendarDays`.
 *
 * Convention: the deactivation date itself is "Day 0". Day 30 is the last day
 * inside the 30-day streamlined reinstatement window; Day 31+ is terminated.
 */
import {
  addDays,
  addYears,
  differenceInCalendarDays,
  format,
  isValid,
  parse,
  startOfDay,
} from "date-fns";
import type { ISODate, Outage, Urgency } from "@/types";

export const CONTINUOUS_WINDOW_DAYS = 30;
export const REINSTATEMENT_WINDOW_DAYS = 365;
export const PSYCH_CYCLE_YEARS = 5;
export const SCREENING_DUE_SOON_DAYS = 90;

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse `yyyy-MM-dd` as a local-midnight Date. Returns null if invalid. */
export function parseISODate(value: string | null | undefined): Date | null {
  if (!value || !ISO_RE.test(value)) return null;
  const d = parse(value, "yyyy-MM-dd", new Date(2000, 0, 1));
  return isValid(d) ? startOfDay(d) : null;
}

export function isISODate(value: unknown): value is ISODate {
  return typeof value === "string" && parseISODate(value) !== null;
}

export function toISODate(date: Date): ISODate {
  return format(date, "yyyy-MM-dd");
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(startOfDay(now));
}

/** Calendar days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: ISODate, to: ISODate): number {
  const a = parseISODate(from);
  const b = parseISODate(to);
  if (!a || !b) throw new Error(`Invalid date(s): ${from}, ${to}`);
  return differenceInCalendarDays(b, a);
}

export function addDaysISO(date: ISODate, days: number): ISODate {
  const d = parseISODate(date);
  if (!d) throw new Error(`Invalid date: ${date}`);
  return toISODate(addDays(d, days));
}

export function addYearsISO(date: ISODate, years: number): ISODate {
  const d = parseISODate(date);
  if (!d) throw new Error(`Invalid date: ${date}`);
  return toISODate(addYears(d, years));
}

export function formatDisplayDate(date: ISODate | null, pattern = "MMM d, yyyy"): string {
  const d = parseISODate(date);
  return d ? format(d, pattern) : "—";
}

/** Urgency color for a given number of days since deactivation. */
export function urgencyForDays(daysSince: number): Urgency {
  if (daysSince < 0) return "active";
  if (daysSince <= 15) return "green";
  if (daysSince <= 25) return "amber";
  if (daysSince <= CONTINUOUS_WINDOW_DAYS) return "red";
  return "expired";
}

export interface GapStatus {
  deactivationDate: ISODate;
  /** Days elapsed since deactivation (Day 0 = deactivation day). */
  daysSince: number;
  /** Days left in the 30-day window (0 on Day 30, never negative). */
  daysRemaining: number;
  /** Last valid day of the 30-day window (deactivation + 30). */
  windowLastDay: ISODate;
  /** First day continuous access is terminated (deactivation + 31). */
  terminationDate: ISODate;
  inWindow: boolean;
  urgency: Urgency;
  /** 0..1 fraction of the 30-day window consumed. */
  progress: number;
}

export function getGapStatus(deactivationDate: ISODate, today: ISODate): GapStatus {
  const daysSince = daysBetween(deactivationDate, today);
  const daysRemaining = Math.max(0, CONTINUOUS_WINDOW_DAYS - daysSince);
  return {
    deactivationDate,
    daysSince,
    daysRemaining,
    windowLastDay: addDaysISO(deactivationDate, CONTINUOUS_WINDOW_DAYS),
    terminationDate: addDaysISO(deactivationDate, CONTINUOUS_WINDOW_DAYS + 1),
    inWindow: daysSince <= CONTINUOUS_WINDOW_DAYS,
    urgency: urgencyForDays(daysSince),
    progress: clamp01(daysSince / CONTINUOUS_WINDOW_DAYS),
  };
}

export interface WindowStatus {
  startDate: ISODate;
  endDate: ISODate;
  totalDays: number;
  daysElapsed: number;
  daysRemaining: number;
  progress: number;
  expired: boolean;
}

/** 365-day reinstatement window following deactivation. */
export function get365Status(deactivationDate: ISODate, today: ISODate): WindowStatus {
  const daysElapsed = daysBetween(deactivationDate, today);
  return {
    startDate: deactivationDate,
    endDate: addDaysISO(deactivationDate, REINSTATEMENT_WINDOW_DAYS),
    totalDays: REINSTATEMENT_WINDOW_DAYS,
    daysElapsed,
    daysRemaining: Math.max(0, REINSTATEMENT_WINDOW_DAYS - daysElapsed),
    progress: clamp01(daysElapsed / REINSTATEMENT_WINDOW_DAYS),
    expired: daysElapsed > REINSTATEMENT_WINDOW_DAYS,
  };
}

export type ScreeningState = "ok" | "due-soon" | "overdue";

export interface ScreeningStatus extends WindowStatus {
  years: number;
  state: ScreeningState;
}

/** Multi-year screening cycle (e.g. 5-year psych re-evaluation). */
export function getScreeningStatus(
  lastDate: ISODate,
  years: number,
  today: ISODate,
): ScreeningStatus {
  const endDate = addYearsISO(lastDate, years);
  const totalDays = daysBetween(lastDate, endDate);
  const daysElapsed = daysBetween(lastDate, today);
  const daysUntilDue = daysBetween(today, endDate);
  const state: ScreeningState =
    daysUntilDue < 0 ? "overdue" : daysUntilDue <= SCREENING_DUE_SOON_DAYS ? "due-soon" : "ok";
  return {
    years,
    startDate: lastDate,
    endDate,
    totalDays,
    daysElapsed,
    daysRemaining: Math.max(0, daysUntilDue),
    progress: clamp01(daysElapsed / totalDays),
    expired: daysUntilDue < 0,
    state,
  };
}

/** Inclusive outage duration in days. Ongoing outages count through `today`. */
export function outageDurationDays(outage: Pick<Outage, "startDate" | "endDate">, today: ISODate): number {
  const end = outage.endDate ?? today;
  const days = daysBetween(outage.startDate, end) + 1;
  return Math.max(0, days);
}

export interface Transition {
  fromId: string;
  toId: string;
  /** Last badge deactivation before the next in-processing (null if TBD). */
  fromEndDate: ISODate | null;
  toStartDate: ISODate;
  /**
   * Days since deactivation at the next in-processing (the 30-day rule metric).
   * null when the earlier assignment has no end date yet.
   */
  gapDays: number | null;
  overlap: boolean;
  exceedsWindow: boolean;
  /** True when the later assignment is still upcoming / scheduled. */
  projected: boolean;
}

/**
 * Compute transitions between consecutive assignments, sorted by start date.
 * Uses a running "coverage end" so an assignment that sits fully inside a
 * longer one does not produce a false gap.
 */
export function computeTransitions(outages: Outage[]): Transition[] {
  const sorted = sortByStart(outages);
  const result: Transition[] = [];
  let coverEnd: ISODate | null = null;
  let coverOpen = false; // an earlier assignment is ongoing (no end date)
  let coverId: string | null = null;

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    if (i > 0 && coverId) {
      let gapDays: number | null = null;
      let overlap = false;
      if (coverOpen) {
        // previous assignment still ongoing: overlap if it started already, else unknown
        gapDays = null;
        overlap = false;
      } else if (coverEnd) {
        gapDays = daysBetween(coverEnd, cur.startDate);
        overlap = gapDays <= 0;
      }
      result.push({
        fromId: coverId,
        toId: cur.id,
        fromEndDate: coverOpen ? null : coverEnd,
        toStartDate: cur.startDate,
        gapDays,
        overlap,
        exceedsWindow: gapDays !== null && gapDays > CONTINUOUS_WINDOW_DAYS,
        projected: cur.status === "upcoming",
      });
    }
    if (cur.endDate === null) {
      coverOpen = true;
      coverId = cur.id;
    } else if (!coverOpen && (coverEnd === null || cur.endDate >= coverEnd)) {
      coverEnd = cur.endDate;
      coverId = cur.id;
    }
  }
  return result;
}

export interface NextOutageProjection {
  outageId: string;
  startDate: ISODate;
  daysUntilStart: number;
  /** Days since deactivation on the in-processing date (null if still badged). */
  gapAtStart: number | null;
  bridgesSafely: boolean | null;
}

/** Project whether the next upcoming outage starts inside the 30-day window. */
export function projectNextOutage(
  outages: Outage[],
  deactivationDate: ISODate | null,
  isActive: boolean,
  today: ISODate,
): NextOutageProjection | null {
  const next = sortByStart(outages.filter((o) => o.status === "upcoming" && o.startDate >= today))[0];
  if (!next) return null;
  const gapAtStart = !isActive && deactivationDate ? daysBetween(deactivationDate, next.startDate) : null;
  return {
    outageId: next.id,
    startDate: next.startDate,
    daysUntilStart: daysBetween(today, next.startDate),
    gapAtStart,
    bridgesSafely: gapAtStart === null ? null : gapAtStart <= CONTINUOUS_WINDOW_DAYS,
  };
}

/** Latest end date among completed outages (null if none). */
export function latestCompletedEndDate(outages: Outage[]): ISODate | null {
  let latest: ISODate | null = null;
  for (const o of outages) {
    if (o.status === "completed" && o.endDate && (latest === null || o.endDate > latest)) {
      latest = o.endDate;
    }
  }
  return latest;
}

export function sortByStart<T extends Pick<Outage, "startDate">>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0));
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
