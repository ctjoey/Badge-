// Outage detection + 5-year projection from NRC daily "Power Reactor Status" reports.
// Plain JS (no build step) so the weekly scraper (scripts/scrape-outages.mjs) and the
// unit tests share one implementation.
//
// NRC file format, one line per unit per day:  ReportDt|Unit|Power
//   e.g. "11/13/2026 12:00:00 AM|Browns Ferry 1|100"

const MIN_OUTAGE_DAYS = 10; // shorter zero-power stretches are trips/forced outages, not refuelings
const MAX_TYPICAL_DAYS = 90; // ignore extended shutdowns when estimating a typical length
const DAY = 86400000;

/** @param {string} s */
export const norm = (s) =>
  s.toLowerCase().replace(/\bsaint\b/g, "st").replace(/[^a-z0-9]/g, "");

/** "11/13/2026 12:00:00 AM" → "2026-11-13" (null if unparseable) */
export function parseNrcDate(s) {
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (!m) return null;
  return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

/** Parse one or more NRC status files → Map<unitName, Map<isoDate, power>> */
export function parseNrcStatus(texts) {
  const units = new Map();
  for (const text of texts) {
    for (const line of text.split(/\r?\n/)) {
      const parts = line.split("|");
      if (parts.length < 3) continue;
      const date = parseNrcDate(parts[0]);
      const power = Number(parts[2].trim());
      const name = parts[1].trim();
      if (!date || !name || Number.isNaN(power)) continue;
      if (!units.has(name)) units.set(name, new Map());
      units.get(name).set(date, power);
    }
  }
  return units;
}

/**
 * Match an NRC unit name ("Browns Ferry 2", "Callaway", "D.C. Cook 1") to a plant + unit.
 * @param {string} nrcName
 * @param {{id:string, units:number[], keys:string[]}[]} plants
 */
export function matchUnit(nrcName, plants) {
  const n = norm(nrcName);
  const m = /^(.*?)(\d+)$/.exec(n);
  const prefix = m ? m[1] : n;
  const unitNum = m ? Number(m[2]) : null;
  for (const p of plants) {
    for (const key of p.keys) {
      // Plant names that end in their unit number ("Fermi 2", "Waterford 3") or have none.
      if (n === key && p.units.length === 1) return { plantId: p.id, unit: p.units[0] };
      if (prefix === key) {
        if (unitNum !== null && p.units.includes(unitNum)) return { plantId: p.id, unit: unitNum };
        if (unitNum === null && p.units.length === 1) return { plantId: p.id, unit: p.units[0] };
      }
    }
  }
  return null;
}

const toDate = (iso) => new Date(`${iso}T00:00:00Z`);
const toISO = (d) => d.toISOString().slice(0, 10);
const addDays = (iso, n) => toISO(new Date(toDate(iso).getTime() + n * DAY));
const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / DAY);
function addMonths(iso, months) {
  const d = toDate(iso);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return toISO(d);
}
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : null;
};

/**
 * Zero-power stretches of at least MIN_OUTAGE_DAYS. Missing report days inside an outage are
 * bridged. `end` is the last zero-power day, or null if still at zero on the latest report.
 * @param {Map<string, number>} series
 */
export function findOutages(series) {
  const dates = [...series.keys()].sort();
  const out = [];
  let start = null;
  let lastZero = null;
  for (const d of dates) {
    if (series.get(d) === 0) {
      if (start === null) start = d;
      lastZero = d;
    } else if (start !== null) {
      out.push({ start, end: lastZero });
      start = null;
    }
  }
  if (start !== null) out.push({ start, end: null, lastZero });
  return out
    .map((o) => ({ ...o, days: daysBetween(o.start, o.end ?? o.lastZero) + 1 }))
    .filter((o) => o.days >= MIN_OUTAGE_DAYS || o.end === null)
    .map(({ start, end, days }) => ({ start, end, days }));
}

/**
 * Project refueling outages for one unit through `today + years`.
 * Cycle length = median spacing of observed refuelings, snapped to 12/18/24 months;
 * otherwise the type default (BWR 24, PWR 18). Duration = median observed length, else 30.
 */
export function projectUnit({ outages, type, today, years = 5 }) {
  const refuels = outages.filter((o) => o.end === null || o.days <= 200);
  const finished = refuels.filter((o) => o.end !== null);
  const typical = median(finished.map((o) => o.days).filter((d) => d <= MAX_TYPICAL_DAYS)) ?? 30;

  let cycleMonths = type === "BWR" ? 24 : 18;
  let cycleBasis = "default";
  const starts = refuels.filter((o) => o.days >= 14 || o.end === null).map((o) => o.start);
  if (starts.length >= 2) {
    const gaps = starts.slice(1).map((s, i) => daysBetween(starts[i], s) / 30.44);
    const g = median(gaps.filter((x) => x >= 10 && x <= 30));
    if (g !== null) {
      cycleMonths = [12, 18, 24].reduce((a, b) => (Math.abs(b - g) < Math.abs(a - g) ? b : a));
      cycleBasis = "observed";
    }
  }

  const horizon = addMonths(today, years * 12);
  const result = [];
  const last = refuels[refuels.length - 1];
  if (!last) return { cycleMonths, cycleBasis, typicalDays: typical, outages: result, lastOutage: null };

  if (last.end === null) {
    result.push({ start: last.start, days: Math.max(typical, daysBetween(last.start, today) + 1), status: "in-progress" });
  }
  // A brand-new zero-power stretch could be a trip, so project from the last finished refueling.
  const base = last.end === null && last.days < MIN_OUTAGE_DAYS && finished.length ? finished[finished.length - 1] : last;
  let k = 1;
  for (;;) {
    const start = addMonths(base.start, cycleMonths * k++);
    if (start > horizon) break;
    if (start <= today) continue; // missed in the data window; skip rather than guess
    result.push({ start, days: typical, status: "projected" });
  }
  return { cycleMonths, cycleBasis, typicalDays: typical, outages: result, lastOutage: last };
}

/**
 * Build the full dataset written to src/data/outages.json.
 * @param {string[]} texts raw NRC files
 * @param {object[]} plants src/data/plants.json
 * @param {string} today ISO date
 */
export function buildOutageData(texts, plants, today, years = 5) {
  const series = parseNrcStatus(texts);
  const units = [];
  const unmatched = [];
  let latestReport = null;
  for (const [name, s] of series) {
    for (const d of s.keys()) if (!latestReport || d > latestReport) latestReport = d;
    const m = matchUnit(name, plants);
    if (!m) {
      unmatched.push(name);
      continue;
    }
    const plant = plants.find((p) => p.id === m.plantId);
    const proj = projectUnit({ outages: findOutages(s), type: plant.type, today, years });
    units.push({ plantId: m.plantId, unit: m.unit, nrcName: name, ...proj });
  }
  const outages = units
    .flatMap((u) => u.outages.map((o) => ({ plantId: u.plantId, unit: u.unit, ...o })))
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  return {
    generatedAt: new Date().toISOString(),
    today,
    latestReport,
    source: "NRC Power Reactor Status Reports (nrc.gov)",
    years,
    units: units
      .map((u) => {
        const rest = { ...u };
        delete rest.outages;
        return rest;
      })
      .sort((a, b) => a.plantId.localeCompare(b.plantId) || a.unit - b.unit),
    outages,
    unmatched: unmatched.sort(),
  };
}

export const _internal = { addMonths, daysBetween, addDays };
