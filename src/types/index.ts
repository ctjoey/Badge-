/** ISO calendar date string, `yyyy-MM-dd`, always interpreted at local midnight. */
export type ISODate = string;

export type OutageStatus = "upcoming" | "active" | "completed";

export interface Outage {
  id: string;
  status: OutageStatus;
  /** Utility / operator name (preset or custom). */
  utility: string;
  /** Optional plant / station name. */
  site: string;
  /** Outage / unit identifier, e.g. "U2 Fall Outage". */
  unitLabel: string;
  /** Optional role / craft. */
  role: string;
  /** Optional staffing agency / employer (helpful for PHQ). */
  employer: string;
  /** In-processing / badge activation date. */
  startDate: ISODate;
  /** Out-processing / badge deactivation date. `null` = TBD / ongoing. */
  endDate: ISODate | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type BackgroundCycleYears = 3 | 5;

export interface Profile {
  /** Manually set "Currently Badged" when no active outage is logged. */
  manualActive: boolean;
  /**
   * Manual override of the last UA deactivation date. When null the date is
   * derived from the most recent completed outage.
   */
  deactivationOverride: ISODate | null;
  /** Date of last psychological evaluation (5-year cycle). */
  psychEvalDate: ISODate | null;
  /** Date of last criminal history / background update. */
  backgroundCheckDate: ISODate | null;
  backgroundCycleYears: BackgroundCycleYears;
}

export interface AppData {
  version: 1;
  profile: Profile;
  outages: Outage[];
}

export type Theme = "dark" | "light";

export type Urgency = "active" | "green" | "amber" | "red" | "expired" | "unknown";
