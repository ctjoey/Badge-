import { describe, expect, it } from "vitest";
import plants from "@/data/plants.json";
import { applyCorrections, buildOutageData, findOutages, matchUnit, parseNrcStatus, projectUnit } from "./outageModel.mjs";

/** Synthetic NRC report: `unit` at 100% except the given zero-power ranges. */
function report(unit: string, from: string, to: string, zero: [string, string][]): string {
  const lines = ["ReportDt|Unit|Power"];
  for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    const off = zero.some(([a, b]) => iso >= a && iso <= b);
    const [y, m, dd] = iso.split("-");
    lines.push(`${Number(m)}/${Number(dd)}/${y} 12:00:00 AM|${unit}|${off ? 0 : 100}`);
  }
  return lines.join("\r\n");
}

describe("matchUnit", () => {
  it.each([
    ["Browns Ferry 2", "browns-ferry", 2],
    ["Callaway", "callaway", 1],
    ["Fermi 2", "fermi", 2],
    ["Waterford 3", "waterford", 3],
    ["D.C. Cook 1", "d-c-cook", 1],
    ["Cook 2", "d-c-cook", 2],
    ["Saint Lucie 2", "st-lucie", 2],
    ["St. Lucie 1", "st-lucie", 1],
    ["La Salle 1", "lasalle", 1],
    ["Arkansas Nuclear 2", "arkansas-nuclear-one", 2],
    ["Columbia Generating Station", "columbia-generating-station", 2],
    ["Robinson 2", "robinson", 2],
    ["Summer", "summer", 1],
    ["Vogtle 4", "vogtle", 4],
    ["River Bend Station 1", "river-bend", 1],
  ])("%s → %s unit %i", (name, id, unit) => {
    expect(matchUnit(name, plants)).toEqual({ plantId: id, unit });
  });
  it("rejects units that don't exist", () => {
    expect(matchUnit("Browns Ferry 4", plants)).toBeNull();
    expect(matchUnit("Indian Point 3", plants)).toBeNull();
  });
});

describe("findOutages", () => {
  it("keeps refuelings, drops short trips, flags an ongoing outage", () => {
    const s = parseNrcStatus([
      report("Byron 1", "2025-01-01", "2026-11-13", [
        ["2025-03-01", "2025-03-28"], // 28-day refueling
        ["2025-07-04", "2025-07-06"], // 3-day trip
        ["2026-11-01", "2026-11-13"], // ongoing
      ]),
    ]).get("Byron 1")!;
    expect(findOutages(s)).toEqual([
      { start: "2025-03-01", end: "2025-03-28", days: 28 },
      { start: "2026-11-01", end: null, days: 13 },
    ]);
  });
});

describe("projectUnit", () => {
  it("measures an 18-month cycle and projects 5 years ahead", () => {
    const outages = [
      { start: "2023-10-01", end: "2023-10-25", days: 25 },
      { start: "2025-04-01", end: "2025-04-27", days: 27 },
    ];
    const p = projectUnit({ outages, type: "BWR", today: "2026-01-15", years: 5 });
    expect(p.cycleMonths).toBe(18);
    expect(p.cycleBasis).toBe("observed");
    expect(p.typicalDays).toBe(25);
    expect(p.outages.map((o) => o.start)).toEqual(["2026-09-10", "2028-03-11", "2029-09-10"]);
    expect(p.outages.every((o) => o.status === "projected")).toBe(true);
  });
  it("falls back to type defaults with one observed outage, and shows in-progress outages", () => {
    const p = projectUnit({
      outages: [{ start: "2026-10-20", end: null, days: 25 }],
      type: "BWR",
      today: "2026-11-13",
      years: 5,
    });
    expect(p.cycleMonths).toBe(24);
    expect(p.cycleBasis).toBe("default");
    expect(p.outages[0]).toEqual({ start: "2026-10-20", days: 30, status: "in-progress" });
    expect(p.outages[1].start).toBe("2028-09-29");
  });
});

describe("projectUnit: telling refuelings from forced outages", () => {
  it("ignores a mid-cycle forced outage instead of halving the cycle", () => {
    const outages = [
      { start: "2023-03-01", end: "2023-03-30", days: 30 },
      { start: "2024-03-10", end: "2024-03-25", days: 16 }, // forced outage, mid-cycle
      { start: "2025-03-01", end: "2025-03-28", days: 28 },
    ];
    const p = projectUnit({ outages, type: "PWR", today: "2026-11-13", years: 5, dataStart: "2023-01-01" });
    expect(p.cycleMonths).toBe(24);
    expect(p.typicalDays).toBe(28);
    expect(p.lastOutage?.start).toBe("2025-03-01");
    expect(p.outages[0].start).toBe("2027-02-08");
  });
  it("lists a long shutdown as in progress but projects nothing after it", () => {
    const p = projectUnit({
      outages: [{ start: "2025-09-09", end: null, days: 431 }],
      type: "PWR",
      today: "2026-11-13",
      years: 5,
    });
    expect(p.outages).toEqual([{ start: "2025-09-09", days: 431, status: "in-progress" }]);
  });
});

describe("buildOutageData", () => {
  it("builds a sorted, plant-keyed dataset and lists unmatched names", () => {
    const texts = [
      report("Surry 1", "2024-01-01", "2026-11-13", [["2024-05-01", "2024-05-30"], ["2025-11-01", "2025-11-28"]]),
      report("Unknown Plant 9", "2026-01-01", "2026-01-05", []),
    ];
    const d = buildOutageData(texts, plants, "2026-11-13", 5);
    expect(d.units).toHaveLength(1);
    expect(d.units[0]).toMatchObject({ plantId: "surry", unit: 1, cycleMonths: 18 });
    expect(d.outages[0]).toMatchObject({ plantId: "surry", unit: 1, start: "2027-04-10", days: 28, status: "projected" });
    expect(d.unmatched).toEqual(["Unknown Plant 9"]);
    expect(d.latestReport).toBe("2026-11-13");
  });
});

describe("applyCorrections", () => {
  const base = {
    today: "2026-11-21",
    years: 5,
    units: [{ plantId: "catawba", unit: 2, history: [{ start: "2025-09-03", end: "2025-10-04", days: 32 }] }],
    outages: [
      { plantId: "catawba", unit: 2, start: "2028-03-31", days: 18, status: "projected" as const },
      { plantId: "vogtle", unit: 1, start: "2027-08-22", days: 26, status: "projected" as const },
    ],
  };

  it("replaces a unit's projected outages with the corrected cycle", () => {
    const out = applyCorrections(base, [{ plantId: "catawba", unit: 2, start: "2027-03-01", cycleMonths: 18, days: 30 }]);
    const cat = out.outages.filter((o) => o.plantId === "catawba").map((o) => o.start);
    expect(cat).toEqual(["2027-03-01", "2028-09-01", "2030-03-01", "2031-09-01"]);
    expect(out.outages.some((o) => o.plantId === "vogtle")).toBe(true);
    expect(out.corrected).toEqual(["catawba#2"]);
  });

  it("is dropped once NRC reports show that outage; closed windows are skipped", () => {
    const seen = { ...base, units: [{ ...base.units[0], history: [{ start: "2027-03-10", end: null, days: 5 }] }] };
    expect(applyCorrections(seen, [{ plantId: "catawba", unit: 2, start: "2027-03-01", cycleMonths: 18, days: 30 }]).corrected).toEqual([]);
    const stale = applyCorrections(base, [{ plantId: "catawba", unit: 2, start: "2026-01-01", cycleMonths: 18, days: 30 }]);
    expect(stale.outages.find((o) => o.plantId === "catawba")?.start).toBe("2027-07-01"); // closed window skipped
  });
});
