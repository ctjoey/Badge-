import { describe, expect, it } from "vitest";
import type { AppData } from "@/types";
import { sitesExpired } from "./expiryBlast";

describe("sitesExpired", () => {
  const data: AppData = {
    version: 2,
    selectedPlantIds: ["perry", "vogtle", "surry", "byron"],
    badges: {
      perry: { active: false, outDate: "2026-10-14" }, // Day 31 on Nov 14 → expired
      vogtle: { active: false, outDate: "2026-10-15" }, // Day 30 → last valid day
      surry: { active: false, outDate: "2026-09-01" }, // long expired → still blasts
      byron: { active: true, outDate: "2026-09-01" }, // on site → never
    },
    reminderDays: [],
    followed: [],
    userOutages: [],
  };
  it("returns every badged-out site past its 30-day window", () => {
    expect(sitesExpired(data, "2026-11-14")).toEqual(["perry", "surry"]);
  });
  it("stops once the date changes or the site is on site", () => {
    const changed: AppData = {
      ...data,
      badges: { ...data.badges, perry: { active: false, outDate: "2026-11-10" }, surry: { active: true, outDate: null } },
    };
    expect(sitesExpired(changed, "2026-11-14")).toEqual([]);
  });
});
