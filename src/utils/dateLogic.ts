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
import type { ISODate, Urgency } from "@/types";

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

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
