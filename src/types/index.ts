/** ISO calendar date string, `yyyy-MM-dd`, always interpreted at local midnight. */
export type ISODate = string;

export type Urgency = "active" | "green" | "amber" | "red" | "expired" | "unknown";

export type Theme = "dark" | "light";

/** The user's badge at one site. */
export interface SiteBadge {
  /** Currently badged (on site). */
  active: boolean;
  /** Last badge-out (deactivation) date at this site, when not active. */
  outDate: ISODate | null;
}

export interface AppData {
  version: 2;
  /** Plant ids from src/data/plants.json the user works at. */
  selectedPlantIds: string[];
  badges: Record<string, SiteBadge>;
  /** Remind me this many days before a site's 30-day window closes (1–15). */
  reminderDays: number[];
  /** Outages the user starred on the Outages tab. */
  followed: FollowedOutage[];
  /** Outages the user added, or dates they corrected (kept on this device). */
  userOutages: UserOutage[];
}

export interface UserOutage {
  id: string;
  plantId: string;
  unit: number;
  start: ISODate;
  days: number;
  /** The projected outage this one corrects (null when it's a brand-new entry). */
  replaces: { plantId: string; unit: number; start: ISODate } | null;
}

export interface FollowedOutage {
  plantId: string;
  unit: number;
  start: ISODate;
}

export interface Plant {
  id: string;
  name: string;
  state: string;
  operator: string;
  type: "PWR" | "BWR";
  units: number[];
  keys: string[];
}

export interface OutageEntry {
  plantId: string;
  unit: number;
  start: ISODate;
  days: number;
  status: "projected" | "in-progress";
}

export interface OutageData {
  generatedAt: string | null;
  units?: { plantId: string; unit: number; typicalDays: number }[];
  latestReport: ISODate | null;
  source: string;
  years: number;
  outages: OutageEntry[];
}
