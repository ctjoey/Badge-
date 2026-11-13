import { describe, expect, it } from "vitest";
import type { Outage } from "@/types";
import {
  addDaysISO,
  computeTransitions,
  daysBetween,
  get365Status,
  getGapStatus,
  getScreeningStatus,
  latestCompletedEndDate,
  outageDurationDays,
  parseISODate,
  projectNextOutage,
  urgencyForDays,
} from "./dateLogic";

function outage(p: Partial<Outage> & Pick<Outage, "id" | "startDate">): Outage {
  return {
    status: "completed",
    utility: "Test Utility",
    site: "",
    unitLabel: "",
    role: "",
    employer: "",
    endDate: null,
    notes: "",
    createdAt: "",
    updatedAt: "",
    ...p,
  };
}

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

describe("outage duration", () => {
  it("is inclusive of both badge dates", () => {
    expect(outageDurationDays({ startDate: "2025-04-01", endDate: "2025-04-01" }, "2025-05-01")).toBe(1);
    expect(outageDurationDays({ startDate: "2025-04-01", endDate: "2025-04-30" }, "2025-05-01")).toBe(30);
  });
  it("counts ongoing outages through today", () => {
    expect(outageDurationDays({ startDate: "2025-04-01", endDate: null }, "2025-04-10")).toBe(10);
  });
});

describe("transitions between assignments", () => {
  it("computes gap days and flags > 30", () => {
    const t = computeTransitions([
      outage({ id: "b", startDate: "2025-05-05", endDate: "2025-06-01" }),
      outage({ id: "a", startDate: "2025-03-01", endDate: "2025-04-01" }),
      outage({ id: "c", status: "upcoming", startDate: "2025-07-05", endDate: "2025-08-01" }),
    ]);
    expect(t).toHaveLength(2);
    expect(t[0]).toMatchObject({ fromId: "a", toId: "b", gapDays: 34, exceedsWindow: true, overlap: false, projected: false });
    expect(t[1]).toMatchObject({ fromId: "b", toId: "c", gapDays: 34, exceedsWindow: true, projected: true });
  });

  it("exactly 30 days is safe, 31 is not", () => {
    const ok = computeTransitions([
      outage({ id: "a", startDate: "2025-01-01", endDate: "2025-02-01" }),
      outage({ id: "b", startDate: "2025-03-03", endDate: "2025-04-01" }),
    ]);
    expect(ok[0].gapDays).toBe(30);
    expect(ok[0].exceedsWindow).toBe(false);
    const bad = computeTransitions([
      outage({ id: "a", startDate: "2025-01-01", endDate: "2025-02-01" }),
      outage({ id: "b", startDate: "2025-03-04", endDate: "2025-04-01" }),
    ]);
    expect(bad[0].gapDays).toBe(31);
    expect(bad[0].exceedsWindow).toBe(true);
  });

  it("detects overlapping site dates", () => {
    const t = computeTransitions([
      outage({ id: "a", startDate: "2025-01-01", endDate: "2025-02-10" }),
      outage({ id: "b", startDate: "2025-02-05", endDate: "2025-03-01" }),
    ]);
    expect(t[0].overlap).toBe(true);
    expect(t[0].gapDays).toBe(-5);
    expect(t[0].exceedsWindow).toBe(false);
  });

  it("measures from the longest covering assignment when one is nested", () => {
    const t = computeTransitions([
      outage({ id: "long", startDate: "2025-01-01", endDate: "2025-03-31" }),
      outage({ id: "nested", startDate: "2025-02-01", endDate: "2025-02-15" }),
      outage({ id: "next", startDate: "2025-04-10", endDate: "2025-05-01" }),
    ]);
    expect(t[1]).toMatchObject({ fromId: "long", toId: "next", gapDays: 10, exceedsWindow: false });
  });

  it("returns unknown gap after an ongoing (TBD) assignment", () => {
    const t = computeTransitions([
      outage({ id: "a", status: "active", startDate: "2025-01-01", endDate: null }),
      outage({ id: "b", status: "upcoming", startDate: "2025-06-01", endDate: null }),
    ]);
    expect(t[0].gapDays).toBeNull();
    expect(t[0].exceedsWindow).toBe(false);
  });
});

describe("upcoming outage projection", () => {
  const outages = [
    outage({ id: "done", startDate: "2025-09-01", endDate: "2025-10-01" }),
    outage({ id: "next", status: "upcoming", startDate: "2025-10-31", endDate: null }),
    outage({ id: "later", status: "upcoming", startDate: "2026-03-01", endDate: null }),
  ];

  it("bridges safely when in-processing is on Day 30", () => {
    const p = projectNextOutage(outages, "2025-10-01", false, "2025-10-10")!;
    expect(p.outageId).toBe("next");
    expect(p.daysUntilStart).toBe(21);
    expect(p.gapAtStart).toBe(30);
    expect(p.bridgesSafely).toBe(true);
  });

  it("warns when in-processing would be Day 31+", () => {
    const p = projectNextOutage(outages, "2025-09-30", false, "2025-10-10")!;
    expect(p.gapAtStart).toBe(31);
    expect(p.bridgesSafely).toBe(false);
  });

  it("has no gap projection while still badged", () => {
    const p = projectNextOutage(outages, null, true, "2025-10-10")!;
    expect(p.gapAtStart).toBeNull();
    expect(p.bridgesSafely).toBeNull();
  });

  it("ignores upcoming entries dated in the past and returns null when none", () => {
    expect(projectNextOutage(outages, "2025-10-01", false, "2026-03-02")).toBeNull();
  });

  it("latestCompletedEndDate picks the most recent", () => {
    expect(latestCompletedEndDate(outages)).toBe("2025-10-01");
    expect(latestCompletedEndDate([])).toBeNull();
  });
});
