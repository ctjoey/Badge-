// Outage detection + 5-year projection from NRC daily "Power Reactor Status" reports.
// Plain JS (no build step) so the weekly scraper (scripts/scrape-outages.mjs) and the
// unit tests share one implementation.
//
// NRC file format, one line per unit per day:  ReportDt|Unit|Power
//   e.g. "11/13/2026 12:00:00 AM|Browns Ferry 1|100"

const MIN_OUTAGE_DAYS = 10; // shorter zero-power stretches are trips, not outages worth listing
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
 *
 * Refuelings are told apart from forced outages by fitting an 18- or 24-month cycle (US units
 * use one or the other): for each candidate cycle and anchor outage, count observed outages that
 * land on that lattice (±75 days) and subtract slots inside the data window where none happened.
 * The best fit sets the cycle; only on-lattice outages set the typical length and the base date.
 * With fewer than two aligned refuelings the type default is used (BWR 24, PWR 18).
 *
 * @param {{outages: {start:string,end:string|null,days:number}[], type:string, today:string, years?:number, dataStart?:string}} p
 */
export function projectUnit({ outages, type, today, years = 5, dataStart }) {
  const defaultCycle = type === "BWR" ? 24 : 18;
  const candidates = outages.filter((o) => o.end === null || (o.days >= 14 && o.days <= 200));
  const TOL = 75;

  const aligned = (anchor, cycle) =>
    candidates.filter((o) => {
      const months = daysBetween(o.start, anchor.start) / 30.44;
      const k = Math.round(months / cycle);
      return Math.abs(months - k * cycle) * 30.44 <= TOL;
    });

  let best = null;
  for (const cycle of [18, 24]) {
    for (const anchor of candidates) {
      const hits = aligned(anchor, cycle);
      let missed = 0;
      if (dataStart) {
        for (let k = 1; ; k++) {
          const slot = addMonths(anchor.start, -cycle * k);
          if (slot < dataStart) break;
          if (!hits.some((o) => Math.abs(daysBetween(o.start, slot)) <= TOL)) missed++;
        }
      }
      const score = hits.length - 0.75 * missed;
      const latest = hits[hits.length - 1];
      const better =
        !best ||
        score > best.score ||
        (score === best.score && latest.start > best.latest.start) ||
        (score === best.score && latest.start === best.latest.start && cycle === defaultCycle);
      if (better) best = { cycle, hits, score, latest };
    }
  }

  const refuels = best?.hits ?? [];
  const cycleMonths = refuels.length >= 2 ? best.cycle : defaultCycle;
  const cycleBasis = refuels.length >= 2 ? "observed" : "default";
  const lengths = refuels.filter((o) => o.end !== null && o.days <= MAX_TYPICAL_DAYS).map((o) => o.days);
  const typical = Math.max(18, median(lengths) ?? 30);

  const result = [];
  const ongoing = outages.find((o) => o.end === null) ?? null;
  if (ongoing) {
    result.push({
      start: ongoing.start,
      days: Math.max(typical, daysBetween(ongoing.start, today) + 1),
      status: "in-progress",
    });
  }
  // A unit shut down far longer than any refueling (e.g. a restart) has no predictable cycle.
  const longShutdown = ongoing && daysBetween(ongoing.start, today) > 150;
  const base = best?.latest ?? null;
  if (base && !longShutdown) {
    const horizon = addMonths(today, years * 12);
    for (let k = 1; ; k++) {
      const start = addMonths(base.start, cycleMonths * k);
      if (start > horizon) break;
      if (start <= today) continue;
      result.push({ start, days: typical, status: "projected" });
    }
  }
  return { cycleMonths, cycleBasis, typicalDays: typical, outages: result, lastOutage: base };
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
    const dataStart = [...s.keys()].sort()[0];
    const history = findOutages(s);
    const proj = projectUnit({ outages: history, type: plant.type, today, years, dataStart });
    units.push({ plantId: m.plantId, unit: m.unit, nrcName: name, dataStart, history, ...proj });
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

/**
 * Apply hand-checked next-refueling corrections (src/data/outageCorrections.json) to a dataset
 * from buildOutageData. A correction replaces the unit's projected outages with
 * `start`, `start + cycleMonths`, ... It is skipped once the NRC history shows an outage within
 * 90 days of `start` (the real data wins), or once `start + days` has passed.
 * @template {{today:string, years?:number, units?:{plantId:string,unit:number,history?:{start:string}[]}[], outages:{plantId:string,unit:number,start:string,days:number,status:string}[]}} T
 * @param {T} data
 * @param {{plantId:string,unit:number,start:string,cycleMonths:number,days:number}[]} corrections
 */
export function applyCorrections(data, corrections) {
  const today = data.today;
  const horizon = addMonths(today, (data.years ?? 5) * 12);
  let outages = data.outages;
  const applied = [];
  for (const c of corrections ?? []) {
    const unit = (data.units ?? []).find((u) => u.plantId === c.plantId && u.unit === c.unit);
    const observed = (unit?.history ?? []).some((h) => Math.abs(daysBetween(h.start, c.start)) <= 90);
    if (observed || addDays(c.start, c.days) < today) continue;
    const added = [];
    for (let k = 0; ; k++) {
      const start = addMonths(c.start, c.cycleMonths * k);
      if (start > horizon) break;
      const status = start > today ? "projected" : "in-progress";
      added.push({ plantId: c.plantId, unit: c.unit, start, days: c.days, status });
    }
    outages = [
      ...outages.filter((o) => !(o.plantId === c.plantId && o.unit === c.unit && o.status === "projected")),
      ...added,
    ];
    applied.push(`${c.plantId}#${c.unit}`);
  }
  outages.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  return { ...data, outages, corrected: applied };
}

export const _internal = { addMonths, daysBetween, addDays };
