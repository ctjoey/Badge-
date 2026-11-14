import type { FollowedOutage, OutageEntry } from "@/types";
import { daysBetween } from "./dateLogic";

/**
 * Projected dates can shift a little when the weekly NRC refresh runs, so a followed outage
 * matches the same plant + unit starting within 90 days of the date that was starred.
 */
export const FOLLOW_MATCH_DAYS = 90;

export function isFollowed(o: Pick<OutageEntry, "plantId" | "unit" | "start">, followed: FollowedOutage[]): boolean {
  return followed.some(
    (f) => f.plantId === o.plantId && f.unit === o.unit && Math.abs(daysBetween(f.start, o.start)) <= FOLLOW_MATCH_DAYS,
  );
}

export function toggleFollow(o: Pick<OutageEntry, "plantId" | "unit" | "start">, followed: FollowedOutage[]): FollowedOutage[] {
  return isFollowed(o, followed)
    ? followed.filter(
        (f) => !(f.plantId === o.plantId && f.unit === o.unit && Math.abs(daysBetween(f.start, o.start)) <= FOLLOW_MATCH_DAYS),
      )
    : [...followed, { plantId: o.plantId, unit: o.unit, start: o.start }];
}
