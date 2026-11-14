import type { AppData, ISODate } from "@/types";
import { CONTINUOUS_WINDOW_DAYS, daysBetween } from "./dateLogic";

/**
 * Sites showing EXPIRED: badged out more than 30 days ago (Day 31 or later).
 * The blast plays every time the app opens while any site is in this state, until the user
 * changes that site's date, switches it to On Site, or removes it.
 */
export function sitesExpired(data: AppData, today: ISODate): string[] {
  return data.selectedPlantIds.filter((id) => {
    const b = data.badges[id];
    return !!b && !b.active && !!b.outDate && daysBetween(b.outDate, today) > CONTINUOUS_WINDOW_DAYS;
  });
}
