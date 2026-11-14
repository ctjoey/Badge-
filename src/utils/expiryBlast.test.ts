import { describe, expect, it } from "vitest";
import type { AppData } from "@/types";
import { sitesExpiringToday } from "./expiryBlast";

describe("sitesExpiringToday", () => {
  const data: AppData = {
    version: 2,
    selectedPlantIds: ["perry", "vogtle", "surry", "byron"],
    badges: {
      perry: { active: false, outDate: "2026-10-14" }, // Day 31 on Nov 14 → expires today
      vogtle: { active: false, outDate: "2026-10-15" }, // Day 30 → last valid day, not expired
      surry: { active: false, outDate: "2026-10-13" }, // Day 32 → expired yesterday
      byron: { active: true, outDate: "2026-10-14" }, // on site
    },
    reminderDays: [],
    followed: [],
  };
  it("only returns sites whose access ends today", () => {
    expect(sitesExpiringToday(data, "2026-11-14")).toEqual(["perry"]);
  });
});
