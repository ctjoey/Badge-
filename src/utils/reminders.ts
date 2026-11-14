import type { AppData, ISODate } from "@/types";
import { addDaysISO, CONTINUOUS_WINDOW_DAYS, formatDisplayDate, parseISODate, toISODate } from "./dateLogic";

export interface PlannedReminder {
  id: number;
  plantId: string;
  at: Date;
  title: string;
  body: string;
  /** Key used to make sure a same-day catch-up alert is only sent once. */
  key: string;
  catchUp: boolean;
}

export const REMINDER_HOUR = 8;

/** Stable 31-bit id for a plant + days-before pair (iOS needs integer ids). */
function reminderId(plantId: string, daysBefore: number): number {
  let h = 0;
  for (const ch of `${plantId}#${daysBefore}`) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h) % 2_000_000_000;
}

/**
 * Every alert that should be scheduled right now. For each picked site where the user is
 * badged out: one at 8:00 AM on each chosen "days before the window closes" day, plus one on
 * the last day of the window (always on).
 *
 * If today's 8:00 AM alert time has already passed (for example the date was just entered),
 * the alert is sent a minute from now instead — once. `sentToday` maps each catch-up key
 * already scheduled today to its send time, so it stays scheduled until it goes out and is
 * never sent twice.
 */
export function planReminders(
  data: AppData,
  plantName: (id: string) => string,
  now: Date = new Date(),
  sentToday: Map<string, number> = new Map(),
): PlannedReminder[] {
  const out: PlannedReminder[] = [];
  const todayISO = toISODate(now);
  const days = [...new Set([...data.reminderDays, 0])];
  for (const id of data.selectedPlantIds) {
    const badge = data.badges[id];
    if (!badge || badge.active || !badge.outDate) continue;
    const lastDay: ISODate = addDaysISO(badge.outDate, CONTINUOUS_WINDOW_DAYS);
    const name = plantName(id);
    for (const n of days) {
      const dayISO = addDaysISO(badge.outDate, CONTINUOUS_WINDOW_DAYS - n);
      const day = parseISODate(dayISO);
      if (!day) continue;
      let at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), REMINDER_HOUR, 0, 0);
      const key = `${id}#${n}#${dayISO}`;
      let catchUp = false;
      if (at <= now) {
        if (dayISO !== todayISO) continue;
        const already = sentToday.get(key);
        if (already !== undefined && already <= now.getTime()) continue; // went out already
        at = new Date(already ?? now.getTime() + 60_000);
        catchUp = true;
      }
      out.push({
        id: reminderId(id, n),
        plantId: id,
        at,
        key,
        catchUp,
        title:
          n === 0
            ? `LAST DAY at ${name} — in-process today`
            : `${n} day${n === 1 ? "" : "s"} left at ${name}`,
        body:
          n === 0
            ? `Today (${formatDisplayDate(lastDay)}) is Day 30 of your badge window at ${name}. After today your unescorted access lapses.`
            : `Your 30-day badge window at ${name} closes after ${formatDisplayDate(lastDay)}. In-process by then to keep your access.`,
      });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}
