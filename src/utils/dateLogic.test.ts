import { describe, expect, it } from "vitest";
import {
  addDaysISO,
  daysBetween,
  get365Status,
  getGapStatus,
  getScreeningStatus,
  parseISODate,
  urgencyForDays,
} from "./dateLogic";

describe("parseISODate", () => {
  it("parses to local midnight", () => {
    const d = parseISODate("2025-03-09")!;
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2025, 2, 9, 0, 0]);
  });
  it("rejects invalid input", () => {
    expect(parseISODate("2025-02-30")).toBeNull();
    expect(parseISODate("not a date")).toBeNull();
    expect(parseISODate("")).toBeNull();
    expect(parseISODate(null)).toBeNull();
  });
});

describe("30-day continuous access window", () => {
  const deact = "2025-06-01";

  it("Day 0: deactivation day has 30 days remaining, green", () => {
    const s = getGapStatus(deact, deact);
    expect(s.daysSince).toBe(0);
    expect(s.daysRemaining).toBe(30);
    expect(s.inWindow).toBe(true);
    expect(s.urgency).toBe("green");
    expect(s.windowLastDay).toBe("2025-07-01");
    expect(s.terminationDate).toBe("2025-07-02");
  });

  it("Day 29: 1 day left, red", () => {
    const s = getGapStatus(deact, addDaysISO(deact, 29));
    expect(s.daysSince).toBe(29);
    expect(s.daysRemaining).toBe(1);
    expect(s.inWindow).toBe(true);
    expect(s.urgency).toBe("red");
  });

  it("Day 30: still valid (last day), 0 remaining", () => {
    const s = getGapStatus(deact, addDaysISO(deact, 30));
    expect(s.daysSince).toBe(30);
    expect(s.daysRemaining).toBe(0);
    expect(s.inWindow).toBe(true);
    expect(s.urgency).toBe("red");
  });

  it("Day 31: gap exceeded, expired", () => {
    const s = getGapStatus(deact, addDaysISO(deact, 31));
    expect(s.daysSince).toBe(31);
    expect(s.daysRemaining).toBe(0);
    expect(s.inWindow).toBe(false);
    expect(s.urgency).toBe("expired");
    expect(s.progress).toBe(1);
  });

  it("urgency thresholds", () => {
    expect(urgencyForDays(-1)).toBe("active");
    expect(urgencyForDays(1)).toBe("green");
    expect(urgencyForDays(15)).toBe("green");
    expect(urgencyForDays(16)).toBe("amber");
    expect(urgencyForDays(25)).toBe("amber");
    expect(urgencyForDays(26)).toBe("red");
    expect(urgencyForDays(30)).toBe("red");
    expect(urgencyForDays(31)).toBe("expired");
  });

  it("crosses a DST boundary without off-by-one (US spring forward 2025-03-09)", () => {
    expect(daysBetween("2025-03-01", "2025-03-31")).toBe(30);
    expect(getGapStatus("2025-03-01", "2025-03-31").daysRemaining).toBe(0);
    expect(addDaysISO("2025-03-01", 30)).toBe("2025-03-31");
    // fall back
    expect(daysBetween("2025-10-20", "2025-11-19")).toBe(30);
  });
});

describe("leap years", () => {
  it("30-day window spanning Feb 29 in a leap year", () => {
    const s = getGapStatus("2024-02-15", "2024-03-16");
    expect(s.daysSince).toBe(30);
    expect(s.windowLastDay).toBe("2024-03-16");
  });
  it("same span in a non-leap year lands one day later", () => {
    expect(addDaysISO("2025-02-15", 30)).toBe("2025-03-17");
  });
  it("365-day window across a leap day", () => {
    const s = get365Status("2024-01-01", "2024-12-31");
    expect(s.endDate).toBe("2024-12-31");
    expect(s.daysElapsed).toBe(365);
    expect(s.daysRemaining).toBe(0);
    expect(s.expired).toBe(false);
    expect(get365Status("2024-01-01", "2025-01-01").expired).toBe(true);
  });
  it("5-year screening from Feb 29 rolls to Feb 28", () => {
    const s = getScreeningStatus("2024-02-29", 5, "2025-02-28");
    expect(s.endDate).toBe("2029-02-28");
    expect(s.state).toBe("ok");
  });
});

describe("screening status", () => {
  it("due-soon within 90 days, overdue after", () => {
    expect(getScreeningStatus("2021-01-01", 5, "2025-11-01").state).toBe("due-soon");
    expect(getScreeningStatus("2021-01-01", 5, "2026-01-02").state).toBe("overdue");
    expect(getScreeningStatus("2021-01-01", 3, "2022-01-01").state).toBe("ok");
  });
});
