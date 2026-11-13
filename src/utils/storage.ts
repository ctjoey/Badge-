import type { AppData, Outage, OutageStatus, Profile } from "@/types";
import { isISODate, todayISO } from "./dateLogic";

export const STORAGE_KEY = "nuke30_data_v1";
export const THEME_KEY = "nuke30_theme";
export const SCHEMA_VERSION = 1 as const;

export const defaultProfile: Profile = {
  manualActive: false,
  deactivationOverride: null,
  psychEvalDate: null,
  backgroundCheckDate: null,
  backgroundCycleYears: 5,
};

export function emptyData(): AppData {
  return { version: SCHEMA_VERSION, profile: { ...defaultProfile }, outages: [] };
}

const STATUSES: OutageStatus[] = ["upcoming", "active", "completed"];

function str(v: unknown, max = 500): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function sanitizeOutage(raw: unknown): Outage | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isISODate(r.startDate)) return null;
  const status = STATUSES.includes(r.status as OutageStatus) ? (r.status as OutageStatus) : "completed";
  const endDate = isISODate(r.endDate) ? r.endDate : null;
  const now = new Date().toISOString();
  return {
    id: str(r.id, 64) || newId(),
    status: status === "completed" && !endDate ? "active" : status,
    utility: str(r.utility, 120),
    site: str(r.site, 120),
    unitLabel: str(r.unitLabel, 120),
    role: str(r.role, 120),
    employer: str(r.employer, 120),
    startDate: r.startDate,
    endDate,
    notes: str(r.notes, 2000),
    createdAt: str(r.createdAt, 40) || now,
    updatedAt: str(r.updatedAt, 40) || now,
  };
}

function sanitizeProfile(raw: unknown): Profile {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    manualActive: r.manualActive === true,
    deactivationOverride: isISODate(r.deactivationOverride) ? r.deactivationOverride : null,
    psychEvalDate: isISODate(r.psychEvalDate) ? r.psychEvalDate : null,
    backgroundCheckDate: isISODate(r.backgroundCheckDate) ? r.backgroundCheckDate : null,
    backgroundCycleYears: r.backgroundCycleYears === 3 ? 3 : 5,
  };
}

/**
 * Validate and normalize unknown input (localStorage or an imported backup).
 * Unknown fields are dropped so no unexpected data is ever persisted.
 */
export function parseAppData(raw: unknown): AppData {
  if (!raw || typeof raw !== "object") throw new Error("Not a Nuke30 data object.");
  const r = raw as Record<string, unknown>;
  const payload = (r.app === "nuke30" && r.data ? r.data : r) as Record<string, unknown>;
  if (payload.version !== SCHEMA_VERSION) {
    throw new Error(`Unsupported schema version: ${String(payload.version)}`);
  }
  if (!Array.isArray(payload.outages)) throw new Error("Backup is missing the outages list.");
  const outages = payload.outages.map(sanitizeOutage).filter((o): o is Outage => o !== null);
  return { version: SCHEMA_VERSION, profile: sanitizeProfile(payload.profile), outages };
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
    // storage full or unavailable (private mode) — app continues in memory
  }
}

export function backupFilename(now: Date = new Date()): string {
  return `nuke30-backup-${todayISO(now)}.json`;
}

export function serializeBackup(data: AppData, now: Date = new Date()): string {
  return JSON.stringify({ app: "nuke30", exportedAt: now.toISOString(), data }, null, 2);
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `o-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
