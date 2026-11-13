import type { AppData, Outage } from "@/types";
import { addDaysISO, addYearsISO } from "./dateLogic";
import { SCHEMA_VERSION } from "./storage";

/**
 * Demo dataset relative to `today`:
 *  - 2 past outages (with a >30-day gap after them, flagged on the PHQ view)
 *  - 1 recently completed outage (deactivated 12 days ago → green/amber clock)
 *  - 1 upcoming outage starting in 22 days (34-day gap → window warning)
 */
export function buildDemoData(today: string): AppData {
  const stamp = new Date().toISOString();
  const mk = (o: Omit<Outage, "createdAt" | "updatedAt">): Outage => ({ ...o, createdAt: stamp, updatedAt: stamp });
  return {
    version: SCHEMA_VERSION,
    profile: {
      manualActive: false,
      deactivationOverride: null,
      psychEvalDate: addDaysISO(addYearsISO(today, -5), 75),
      backgroundCheckDate: addDaysISO(addYearsISO(today, -2), -40),
      backgroundCycleYears: 5,
    },
    outages: [
      mk({
        id: "demo-1",
        status: "completed",
        utility: "Duke Energy",
        site: "Demo Station A",
        unitLabel: "Spring RFO / Unit 1",
        role: "Pipefitter",
        employer: "Demo Staffing Co.",
        startDate: addDaysISO(today, -262),
        endDate: addDaysISO(today, -223),
        notes: "Demo entry. Per diem + 6x12 nights.",
      }),
      mk({
        id: "demo-2",
        status: "completed",
        utility: "Southern Nuclear",
        site: "Demo Station B",
        unitLabel: "U2 Spring Outage",
        role: "Pipefitter",
        employer: "Demo Staffing Co.",
        startDate: addDaysISO(today, -201),
        endDate: addDaysISO(today, -160),
        notes: "Demo entry.",
      }),
      mk({
        id: "demo-3",
        status: "completed",
        utility: "Constellation",
        site: "Demo Station C",
        unitLabel: "U1 Fall Refueling Outage",
        role: "Pipefitter Foreman",
        employer: "Demo Industrial Services",
        startDate: addDaysISO(today, -55),
        endDate: addDaysISO(today, -12),
        notes: "Demo entry. Recently out-processed.",
      }),
      mk({
        id: "demo-4",
        status: "upcoming",
        utility: "TVA",
        site: "Demo Station D",
        unitLabel: "U3 Spring RFO",
        role: "Pipefitter",
        employer: "Demo Industrial Services",
        startDate: addDaysISO(today, 22),
        endDate: addDaysISO(today, 60),
        notes: "Demo entry. Tentative call-out.",
      }),
    ],
  };
}
