import type { AppData, FollowedOutage, SiteBadge, UserOutage } from "@/types";
import { isISODate } from "./dateLogic";

export const STORAGE_KEY = "nuke30_data_v2";
export const THEME_KEY = "nuke30_theme";

export const DEFAULT_REMINDER_DAYS = [10, 5, 2, 1];

export function emptyData(): AppData {
  return { version: 2, selectedPlantIds: [], badges: {}, reminderDays: [...DEFAULT_REMINDER_DAYS], followed: [], userOutages: [] };
}

/** Validate unknown input; anything unexpected is dropped. */
export function parseAppData(raw: unknown): AppData {
  if (!raw || typeof raw !== "object") return emptyData();
  const r = raw as Record<string, unknown>;
  if (r.version !== 2) return emptyData();
  const ids = Array.isArray(r.selectedPlantIds)
    ? r.selectedPlantIds.filter((x): x is string => typeof x === "string").slice(0, 200)
    : [];
  const badges: Record<string, SiteBadge> = {};
  if (r.badges && typeof r.badges === "object") {
    for (const [id, b] of Object.entries(r.badges as Record<string, unknown>)) {
      if (!b || typeof b !== "object") continue;
      const v = b as Record<string, unknown>;
      badges[id] = { active: v.active === true, outDate: isISODate(v.outDate) ? v.outDate : null };
    }
  }
  const reminderDays = Array.isArray(r.reminderDays)
    ? [...new Set(r.reminderDays.filter((x): x is number => Number.isInteger(x) && x >= 1 && x <= 15))].sort((a, b) => b - a)
    : [...DEFAULT_REMINDER_DAYS];
  const followed: FollowedOutage[] = Array.isArray(r.followed)
    ? r.followed
        .filter((f): f is Record<string, unknown> => !!f && typeof f === "object")
        .filter((f) => typeof f.plantId === "string" && Number.isInteger(f.unit) && isISODate(f.start))
        .map((f) => ({ plantId: f.plantId as string, unit: f.unit as number, start: f.start as string }))
        .slice(0, 500)
    : [];
  const userOutages: UserOutage[] = Array.isArray(r.userOutages)
    ? r.userOutages
        .filter((u): u is Record<string, unknown> => !!u && typeof u === "object")
        .filter(
          (u) =>
            typeof u.id === "string" &&
            typeof u.plantId === "string" &&
            Number.isInteger(u.unit) &&
            isISODate(u.start) &&
            Number.isInteger(u.days) &&
            (u.days as number) >= 1 &&
            (u.days as number) <= 365,
        )
        .map((u) => {
          const rep = u.replaces as Record<string, unknown> | null | undefined;
          return {
            id: u.id as string,
            plantId: u.plantId as string,
            unit: u.unit as number,
            start: u.start as string,
            days: u.days as number,
            replaces:
              rep && typeof rep.plantId === "string" && Number.isInteger(rep.unit) && isISODate(rep.start)
                ? { plantId: rep.plantId, unit: rep.unit as number, start: rep.start }
                : null,
          };
        })
        .slice(0, 500)
    : [];
  return { version: 2, selectedPlantIds: [...new Set(ids)], badges, reminderDays, followed, userOutages };
}

export function loadData(): AppData {
  if (typeof window === "undefined") return emptyData();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? parseAppData(JSON.parse(raw)) : emptyData();
  } catch {
    return emptyData();
  }
}

export function saveData(data: AppData): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage unavailable — keep working in memory
  }
}
