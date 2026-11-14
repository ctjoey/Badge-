import type { AppData, ISODate } from "@/types";
import { CONTINUOUS_WINDOW_DAYS, daysBetween } from "./dateLogic";

const SEEN_KEY = "nuke30_blast_seen";

/** Sites whose access ends today: badged out, and today is Day 31 (the first day after the window). */
export function sitesExpiringToday(data: AppData, today: ISODate): string[] {
  return data.selectedPlantIds.filter((id) => {
    const b = data.badges[id];
    return !!b && !b.active && !!b.outDate && daysBetween(b.outDate, today) === CONTINUOUS_WINDOW_DAYS + 1;
  });
}

/** Of `ids`, the ones whose blast hasn't played yet today; marks them as played. */
export function takeUnseen(ids: string[], today: ISODate): string[] {
  let seen: string[] = [];
  try {
    const raw = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}") as { day?: string; ids?: string[] };
    if (raw.day === today) seen = raw.ids ?? [];
  } catch {
    /* ignore */
  }
  const fresh = ids.filter((id) => !seen.includes(id));
  if (fresh.length) {
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify({ day: today, ids: [...seen, ...fresh] }));
    } catch {
      /* ignore */
    }
  }
  return fresh;
}
