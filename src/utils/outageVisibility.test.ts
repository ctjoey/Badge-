import { describe, expect, it } from "vitest";
import { isCurrentOrUpcoming, outageDay } from "./outageVisibility";

const opts = { horizon: "2031-11-14", typicalDays: 30, latestReport: "2026-11-13" };

describe("isCurrentOrUpcoming", () => {
  it("shows upcoming outages within the horizon, not past projections", () => {
    expect(isCurrentOrUpcoming({ start: "2027-03-17", status: "projected" }, "2026-11-14", opts)).toBe(true);
    expect(isCurrentOrUpcoming({ start: "2026-11-14", status: "projected" }, "2026-11-14", opts)).toBe(true);
    expect(isCurrentOrUpcoming({ start: "2026-11-01", status: "projected" }, "2026-11-14", opts)).toBe(true); // window still open
    expect(isCurrentOrUpcoming({ start: "2026-09-01", status: "projected" }, "2026-11-14", opts)).toBe(false);
    expect(isCurrentOrUpcoming({ start: "2032-01-01", status: "projected" }, "2026-11-14", opts)).toBe(false);
  });
  it("shows an outage the NRC still reports as offline", () => {
    // North Anna 2: started Sep 6, still offline on the Nov 13 report
    expect(isCurrentOrUpcoming({ start: "2026-09-06", status: "in-progress" }, "2026-11-14", opts)).toBe(true);
  });
  it("hides extended shutdowns over 120 days (e.g. Palisades restart)", () => {
    expect(isCurrentOrUpcoming({ start: "2025-09-09", status: "in-progress" }, "2026-11-14", opts)).toBe(false);
  });
  it("hides an outage that has most likely ended since the data was built", () => {
    // Data from Nov 13 (+7-day grace = Nov 20). A 30-day outage from Nov 1 is expected back Nov 30.
    const o = { start: "2026-11-01", status: "in-progress" as const };
    expect(isCurrentOrUpcoming(o, "2026-11-30", opts)).toBe(true);
    expect(isCurrentOrUpcoming(o, "2026-12-01", opts)).toBe(false);
    // North Anna (from Sep 6, long past its typical length) shows until a week after the report.
    const na = { start: "2026-09-06", status: "in-progress" as const };
    expect(isCurrentOrUpcoming(na, "2026-11-20", opts)).toBe(true);
    expect(isCurrentOrUpcoming(na, "2026-11-21", opts)).toBe(false);
  });
  it("numbers outage days from the start day", () => {
    expect(outageDay("2026-10-03", "2026-11-14")).toBe(43);
  });
});
