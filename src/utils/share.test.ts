import { describe, expect, it } from "vitest";
import type { AppData } from "@/types";
import { appInviteText, badgeStatusText } from "./share";

describe("share text", () => {
  it("summarizes each site's badge status", () => {
    const data: AppData = {
      version: 2,
      selectedPlantIds: ["vogtle", "perry", "surry", "byron"],
      badges: {
        vogtle: { active: true, outDate: null },
        perry: { active: false, outDate: "2026-11-01" },
        surry: { active: false, outDate: "2026-09-01" },
      },
      reminderDays: [],
      followed: [],
      userOutages: [],
    };
    const names: Record<string, string> = { vogtle: "Vogtle", perry: "Perry", surry: "Surry", byron: "Byron" };
    const t = badgeStatusText(data, "2026-11-14", (id) => names[id]);
    expect(t).toContain("My badge status (Nov 14, 2026):");
    expect(t).toContain("• Byron: status not set");
    expect(t).toContain("• Perry: badged out Nov 1, 2026 — 17 days left, in-process by Dec 1, 2026");
    expect(t).toContain("• Surry: 30-day window expired Oct 2, 2026");
    expect(t).toContain("• Vogtle: on site (active badge)");
    expect(t.endsWith("Sent from Nuke30")).toBe(true);
  });
  it("invites without a link until one is set", () => {
    expect(appInviteText()).toContain("Nuke30");
    expect(appInviteText()).not.toContain("http");
  });
});
