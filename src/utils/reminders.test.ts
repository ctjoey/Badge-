import { describe, expect, it } from "vitest";
import type { AppData } from "@/types";
import { planReminders } from "./reminders";

const data = (over: Partial<AppData>): AppData => ({
  version: 2,
  selectedPlantIds: ["perry", "vogtle"],
  badges: { perry: { active: false, outDate: "2026-11-01" }, vogtle: { active: true, outDate: null } },
  reminderDays: [10, 5, 1],
  followed: [],
  userOutages: [],
  ...over,
});
const when = (r: { at: Date }) => [r.at.getMonth() + 1, r.at.getDate(), r.at.getHours()];

describe("planReminders", () => {
  it("schedules 8 AM alerts on the chosen days plus the last day, only for badged-out sites", () => {
    const r = planReminders(data({}), (id) => id.toUpperCase(), new Date(2026, 10, 13, 12));
    expect(r.map((x) => [x.plantId, ...when(x)])).toEqual([
      ["perry", 11, 21, 8], // 10 days left
      ["perry", 11, 26, 8], // 5 days left
      ["perry", 11, 30, 8], // 1 day left
      ["perry", 12, 1, 8], // last day (Day 30)
    ]);
    expect(r[2].title).toBe("1 day left at PERRY");
    expect(r[3].title).toBe("LAST DAY at PERRY — in-process today");
    expect(r[0].body).toContain("Dec 1, 2026");
    expect(new Set(r.map((x) => x.id)).size).toBe(4);
    expect(r.every((x) => !x.catchUp)).toBe(true);
  });
  it("still sends the last-day alert when no reminder days are picked", () => {
    const r = planReminders(data({ reminderDays: [] }), (id) => id, new Date(2026, 10, 13, 12));
    expect(r.map(when)).toEqual([[12, 1, 8]]);
  });
  it("sends a missed same-day alert a minute from now, once", () => {
    const now = new Date(2026, 10, 30, 9, 30); // 1-day-left alert was due at 8:00 today
    const r = planReminders(data({ selectedPlantIds: ["perry"] }), (id) => id, now);
    expect(r[0].catchUp).toBe(true);
    expect(r[0].at.getTime() - now.getTime()).toBe(60_000);
    expect(r.map(when)).toEqual([[11, 30, 9], [12, 1, 8]]);
    const sent = new Map([[r[0].key, r[0].at.getTime()]]);
    // Re-planned 30 s later (before it fires): the catch-up stays at the same time.
    const soon = planReminders(data({ selectedPlantIds: ["perry"] }), (id) => id, new Date(now.getTime() + 30_000), sent);
    expect(soon[0].at.getTime()).toBe(r[0].at.getTime());
    // Re-planned after it fired: not sent again.
    const later = planReminders(data({ selectedPlantIds: ["perry"] }), (id) => id, new Date(now.getTime() + 120_000), sent);
    expect(later.map(when)).toEqual([[12, 1, 8]]);
  });
  it("skips earlier days and sites not picked", () => {
    const r = planReminders(data({ selectedPlantIds: ["perry"] }), (id) => id, new Date(2026, 10, 27, 9));
    expect(r.map(when)).toEqual([[11, 30, 8], [12, 1, 8]]);
    expect(planReminders(data({ selectedPlantIds: [] }), (id) => id)).toEqual([]);
  });
});
