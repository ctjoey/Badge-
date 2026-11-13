import { describe, expect, it } from "vitest";
import type { Outage } from "@/types";
import { foldLine, generateReminderICS } from "./icsGenerator";
import { buildPHQHistory, formatPHQCsv, formatPHQText } from "./phq";
import { emptyData, parseAppData, serializeBackup } from "./storage";
import { buildDemoData } from "./demoData";
import { deriveUAState } from "./uaState";

const o = (p: Partial<Outage> & Pick<Outage, "id" | "startDate">): Outage => ({
  status: "completed", utility: "U", site: "", unitLabel: "", role: "", employer: "",
  endDate: null, notes: "", createdAt: "", updatedAt: "", ...p,
});

describe("ICS reminders", () => {
  const ics = generateReminderICS("2025-06-01", new Date("2025-06-01T12:00:00Z"));
  it("creates events on Day 20, 25, 28, 29 with alarms", () => {
    for (const d of ["20250621", "20250626", "20250629", "20250630"]) {
      expect(ics).toContain(`DTSTART;VALUE=DATE:${d}`);
    }
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(4);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
  });
  it("folds lines to 75 octets", () => {
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(foldLine("x".repeat(80))).toBe("x".repeat(75) + "\r\n " + "x".repeat(5));
  });
});

describe("PHQ export", () => {
  const outages = [
    o({ id: "1", startDate: "2025-01-01", endDate: "2025-02-01", utility: "Duke Energy", employer: "ACME, Inc." }),
    o({ id: "2", startDate: "2025-03-10", endDate: "2025-04-01" }),
    o({ id: "3", startDate: "2025-04-15", endDate: "2025-05-01" }),
    o({ id: "4", status: "upcoming", startDate: "2025-12-01" }),
  ];
  const rows = buildPHQHistory(outages, "2025-05-20");

  it("excludes upcoming outages", () => {
    expect(rows.some((r) => r.kind === "assignment" && r.outage.id === "4")).toBe(false);
  });
  it("flags gaps over 30 days only", () => {
    const gaps = rows.filter((r) => r.kind === "gap");
    expect(gaps.map((g) => g.kind === "gap" && [g.startDate, g.endDate, g.gapDays, g.flagged, g.ongoing])).toEqual([
      ["2025-02-02", "2025-03-09", 37, true, false],
      ["2025-04-02", "2025-04-14", 14, false, false],
      ["2025-05-02", "2025-05-20", 19, false, true],
    ]);
  });
  it("produces text and quoted CSV", () => {
    expect(formatPHQText(rows, "2025-05-20")).toContain("1 gap period(s) exceed 30 days");
    const csv = formatPHQCsv(rows);
    expect(csv).toContain('"ACME, Inc."');
    expect(csv.split("\r\n")[0]).toMatch(/^Type,Start Date/);
  });
});

describe("storage + backup", () => {
  it("round-trips a backup and drops unknown/PII fields", () => {
    const data = buildDemoData("2025-06-01");
    const raw = JSON.parse(serializeBackup(data));
    raw.data.outages[0].ssn = "000-00-0000";
    const parsed = parseAppData(raw);
    expect(parsed.outages).toHaveLength(4);
    expect("ssn" in parsed.outages[0]).toBe(false);
  });
  it("rejects wrong schema versions", () => {
    expect(() => parseAppData({ version: 2, outages: [] })).toThrow();
  });
  it("derives UA state from demo data", () => {
    const today = "2025-06-01";
    const s = deriveUAState(buildDemoData(today), today);
    expect(s.isActive).toBe(false);
    expect(s.gap?.daysSince).toBe(12);
    expect(deriveUAState(emptyData(), today).source).toBe("none");
  });
});
