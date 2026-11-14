import { describe, expect, it } from "vitest";
import type { OutageEntry, UserOutage } from "@/types";
import { mergeOutages } from "./mergeOutages";

const opts = { horizon: "2031-11-14", typicalDays: () => 30, latestReport: "2026-11-13" };
const base: OutageEntry[] = [
  { plantId: "perry", unit: 1, start: "2027-03-17", days: 36, status: "projected" },
  { plantId: "perry", unit: 1, start: "2029-03-17", days: 36, status: "projected" },
  { plantId: "vogtle", unit: 3, start: "2027-10-19", days: 26, status: "projected" },
];

describe("mergeOutages", () => {
  it("lists projected outages when the user hasn't changed anything", () => {
    const r = mergeOutages(base, [], "2026-11-14", opts);
    expect(r.map((o) => [o.plantId, o.start, o.source])).toEqual([
      ["perry", "2027-03-17", "nrc"],
      ["vogtle", "2027-10-19", "nrc"],
      ["perry", "2029-03-17", "nrc"],
    ]);
  });
  it("replaces a projected outage with the user's corrected dates", () => {
    const fix: UserOutage = {
      id: "u1", plantId: "perry", unit: 1, start: "2027-02-28", days: 41,
      replaces: { plantId: "perry", unit: 1, start: "2027-03-17" },
    };
    const r = mergeOutages(base, [fix], "2026-11-14", opts);
    expect(r.filter((o) => o.plantId === "perry").map((o) => [o.start, o.days, o.source])).toEqual([
      ["2027-02-28", 41, "user"],
      ["2029-03-17", 36, "nrc"], // the next cycle is untouched
    ]);
  });
  it("adds new outages and shows them as current while they run", () => {
    const add: UserOutage = { id: "u2", plantId: "surry", unit: 2, start: "2026-11-01", days: 20, replaces: null };
    expect(mergeOutages([], [add], "2026-11-14", opts)[0]).toMatchObject({ status: "in-progress", source: "user", userId: "u2" });
    expect(mergeOutages([], [add], "2026-11-21", opts)).toEqual([]); // ended Nov 20
  });
});
