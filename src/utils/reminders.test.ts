import { describe, expect, it } from "vitest";
import type { AppData } from "@/types";
import { planReminders } from "./reminders";

const data = (over: Partial<AppData>): AppData => ({
  version: 2,
  selectedPlantIds: ["perry", "vogtle"],
  badges: { perry: { active: false, outDate: "2026-11-01" }, vogtle: { active: true, outDate: null } },
  reminderDays: [10, 5, 1],
  ...over,
});

describe("planReminders", () => {
  it("schedules 8 AM reminders before the window closes, only for badged-out sites", () => {
    const r = planReminders(data({}), (id) => id.toUpperCase(), new Date(2026, 10, 13, 12));
    expect(r.map((x) => [x.plantId, x.at.getFullYear(), x.at.getMonth() + 1, x.at.getDate(), x.at.getHours()])).toEqual([
      ["perry", 2026, 11, 21, 8], // 10 days left
      ["perry", 2026, 11, 26, 8], // 5 days left
      ["perry", 2026, 11, 30, 8], // 1 day left
    ]);
    expect(r[2].title).toBe("1 day left at PERRY");
    expect(r[0].body).toContain("Dec 1, 2026");
    expect(new Set(r.map((x) => x.id)).size).toBe(3);
  });
  it("skips reminders already in the past and sites not picked", () => {
    const r = planReminders(data({ selectedPlantIds: ["perry"] }), (id) => id, new Date(2026, 10, 27, 9));
    expect(r.map((x) => x.at.getDate())).toEqual([30]);
    expect(planReminders(data({ selectedPlantIds: [] }), (id) => id)).toEqual([]);
  });
});
