import { describe, expect, it } from "vitest";
import { foldLine, generateReminderICS } from "./icsGenerator";
import { emptyData, parseAppData } from "./storage";

describe("storage", () => {
  it("keeps valid data and drops junk", () => {
    const d = parseAppData({
      version: 2,
      selectedPlantIds: ["vogtle", 7, "vogtle", "surry"],
      badges: { vogtle: { active: false, outDate: "2026-11-01", ssn: "x" }, surry: { active: true, outDate: "bad" } },
    });
    expect(d.selectedPlantIds).toEqual(["vogtle", "surry"]);
    expect(d.reminderDays).toEqual([10, 5, 2, 1]);
    expect(d.followed).toEqual([]);
    expect(d.badges).toEqual({ vogtle: { active: false, outDate: "2026-11-01" }, surry: { active: true, outDate: null } });
  });
  it("keeps only reminder days 1–15", () => {
    const d = parseAppData({ version: 2, selectedPlantIds: [], badges: {}, reminderDays: [3, 0, 16, 15, 3, 1.5, 1] });
    expect(d.reminderDays).toEqual([15, 3, 1]);
  });
  it("ignores other versions", () => {
    expect(parseAppData({ version: 1, outages: [] })).toEqual(emptyData());
  });
});

describe("ICS reminders", () => {
  const ics = generateReminderICS("2025-06-01", new Date("2025-06-01T12:00:00Z"));
  it("uses the chosen days-before list", () => {
    const custom = generateReminderICS("2025-06-01", new Date("2025-06-01T12:00:00Z"), [15, 3]);
    expect(custom).toContain("DTSTART;VALUE=DATE:20250616");
    expect(custom).toContain("DTSTART;VALUE=DATE:20250628");
    expect(custom.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  });
  it("creates Day 20/25/28/29 events with alarms", () => {
    for (const d of ["20250621", "20250626", "20250629", "20250630"]) expect(ics).toContain(`DTSTART;VALUE=DATE:${d}`);
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(4);
  });
  it("folds long lines", () => {
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(foldLine("x".repeat(80))).toBe("x".repeat(75) + "\r\n " + "x".repeat(5));
  });
});
