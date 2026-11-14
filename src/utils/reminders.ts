import type { AppData, ISODate } from "@/types";
import { addDaysISO, CONTINUOUS_WINDOW_DAYS, formatDisplayDate, parseISODate } from "./dateLogic";

export interface PlannedReminder {
  id: number;
  plantId: string;
  at: Date;
  title: string;
  body: string;
}

/** Stable 31-bit id for a plant + days-before pair (iOS needs integer ids). */
function reminderId(plantId: string, daysBefore: number): number {
  let h = 0;
  for (const ch of `${plantId}#${daysBefore}`) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h) % 2_000_000_000;
}

/**
 * Every reminder that should be scheduled right now: for each picked site where the user
 * is badged out, one at 8:00 AM on each chosen "days before the window closes" day,
 * skipping any that are already in the past.
 */
export function planReminders(
  data: AppData,
  plantName: (id: string) => string,
  now: Date = new Date(),
): PlannedReminder[] {
  const out: PlannedReminder[] = [];
  for (const id of data.selectedPlantIds) {
    const badge = data.badges[id];
    if (!badge || badge.active || !badge.outDate) continue;
    const lastDay: ISODate = addDaysISO(badge.outDate, CONTINUOUS_WINDOW_DAYS);
    for (const n of data.reminderDays) {
      const day = parseISODate(addDaysISO(badge.outDate, CONTINUOUS_WINDOW_DAYS - n));
      if (!day) continue;
      const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 8, 0, 0);
      if (at <= now) continue;
      const name = plantName(id);
      out.push({
        id: reminderId(id, n),
        plantId: id,
        at,
        title: `${n} day${n === 1 ? "" : "s"} left at ${name}`,
        body: `Your 30-day badge window at ${name} closes after ${formatDisplayDate(lastDay)}. In-process by then to keep your access.`,
      });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}
