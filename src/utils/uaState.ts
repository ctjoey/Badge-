import type { AppData, ISODate, Outage } from "@/types";
import { getGapStatus, latestCompletedEndDate, type GapStatus } from "./dateLogic";

export type UASource = "outage" | "manual" | "gap" | "none";

export interface UAState {
  isActive: boolean;
  source: UASource;
  activeOutage: Outage | null;
  deactivationDate: ISODate | null;
  /** True when the deactivation date comes from a manual override. */
  isOverride: boolean;
  gap: GapStatus | null;
}

/**
 * Derive the user's current UA state:
 *  1. Any outage marked Active → Currently Badged.
 *  2. Manual "Currently Badged" toggle → Currently Badged.
 *  3. Otherwise the gap clock runs from the manual override date, or the most
 *     recent completed outage's deactivation date.
 */
export function deriveUAState(data: AppData, today: ISODate): UAState {
  const activeOutage = data.outages.find((o) => o.status === "active") ?? null;
  if (activeOutage) {
    return { isActive: true, source: "outage", activeOutage, deactivationDate: null, isOverride: false, gap: null };
  }
  if (data.profile.manualActive) {
    return { isActive: true, source: "manual", activeOutage: null, deactivationDate: null, isOverride: false, gap: null };
  }
  const override = data.profile.deactivationOverride;
  const deactivationDate = override ?? latestCompletedEndDate(data.outages);
  if (!deactivationDate) {
    return { isActive: false, source: "none", activeOutage: null, deactivationDate: null, isOverride: false, gap: null };
  }
  return {
    isActive: false,
    source: "gap",
    activeOutage: null,
    deactivationDate,
    isOverride: override !== null,
    gap: getGapStatus(deactivationDate, today),
  };
}
