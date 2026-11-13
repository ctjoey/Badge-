import type { ISODate, Outage } from "@/types";
import {
  addDaysISO,
  CONTINUOUS_WINDOW_DAYS,
  daysBetween,
  formatDisplayDate,
  outageDurationDays,
  sortByStart,
} from "./dateLogic";

export const PHQ_CSV_FILENAME = "nuke30-phq-history.csv";

export type PHQRow =
  | {
      kind: "assignment";
      outage: Outage;
      startDate: ISODate;
      endDate: ISODate | null;
      durationDays: number;
    }
  | {
      kind: "gap";
      /** First day not badged. */
      startDate: ISODate;
      /** Last day not badged (or today for the current gap). */
      endDate: ISODate;
      /** Days since deactivation at re-badging (the 30-day rule metric). */
      gapDays: number;
      flagged: boolean;
      ongoing: boolean;
    };

/**
 * Build a chronological PHQ history of completed + active assignments and the
 * non-nuclear gap periods between them. Upcoming outages are excluded.
 */
export function buildPHQHistory(outages: Outage[], today: ISODate): PHQRow[] {
  const history = sortByStart(outages.filter((o) => o.status !== "upcoming" && o.startDate <= today));
  const rows: PHQRow[] = [];
  let coverEnd: ISODate | null = null;
  let open = false;

  for (const o of history) {
    if (coverEnd && !open) {
      const gapDays = daysBetween(coverEnd, o.startDate);
      if (gapDays > 1) {
        rows.push({
          kind: "gap",
          startDate: addDaysISO(coverEnd, 1),
          endDate: addDaysISO(o.startDate, -1),
          gapDays,
          flagged: gapDays > CONTINUOUS_WINDOW_DAYS,
          ongoing: false,
        });
      }
    }
    rows.push({
      kind: "assignment",
      outage: o,
      startDate: o.startDate,
      endDate: o.endDate,
      durationDays: outageDurationDays(o, today),
    });
    if (o.endDate === null) open = true;
    else if (!coverEnd || o.endDate > coverEnd) coverEnd = o.endDate;
  }

  if (!open && coverEnd && coverEnd < today) {
    const gapDays = daysBetween(coverEnd, today);
    if (gapDays > 1) {
      rows.push({
        kind: "gap",
        startDate: addDaysISO(coverEnd, 1),
        endDate: today,
        gapDays,
        flagged: gapDays > CONTINUOUS_WINDOW_DAYS,
        ongoing: true,
      });
    }
  }
  return rows;
}

function siteLabel(o: Outage): string {
  return [o.utility, o.site].filter(Boolean).join(" — ");
}

export function formatPHQText(rows: PHQRow[], today: ISODate): string {
  const lines: string[] = [
    "NUKE30 — PHQ EMPLOYMENT / ACCESS HISTORY",
    `Generated: ${formatDisplayDate(today)} (from local device data)`,
    "Dates are badge activation → deactivation. Gaps are periods without nuclear UA.",
    "",
  ];
  const flagged = rows.filter((r) => r.kind === "gap" && r.flagged).length;
  for (const r of [...rows].reverse()) {
    if (r.kind === "assignment") {
      const o = r.outage;
      const end = r.endDate ? formatDisplayDate(r.endDate) : "Present (Active)";
      lines.push(`■ ${formatDisplayDate(r.startDate)} – ${end}  (${r.durationDays} days)`);
      lines.push(`  Site: ${siteLabel(o) || "—"}`);
      if (o.unitLabel) lines.push(`  Outage/Unit: ${o.unitLabel}`);
      if (o.employer) lines.push(`  Employer/Agency: ${o.employer}`);
      if (o.role) lines.push(`  Role/Craft: ${o.role}`);
    } else {
      const end = r.ongoing ? `${formatDisplayDate(r.endDate)} (today)` : formatDisplayDate(r.endDate);
      const flag = r.flagged ? "  ⚠ >30 DAYS — ACCOUNT FOR THIS PERIOD / VERIFICATION LIKELY" : "";
      lines.push(`□ GAP ${formatDisplayDate(r.startDate)} – ${end}  (${r.gapDays} days since deactivation)${flag}`);
    }
    lines.push("");
  }
  lines.push(
    flagged > 0
      ? `${flagged} gap period(s) exceed 30 days and may require additional verification on your PHQ.`
      : "No gaps over 30 days.",
  );
  return lines.join("\n");
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function formatPHQCsv(rows: PHQRow[]): string {
  const header = [
    "Type",
    "Start Date",
    "End Date",
    "Days",
    "Utility",
    "Site",
    "Outage/Unit",
    "Employer/Agency",
    "Role/Craft",
    "Status",
    "Gap > 30 Days",
  ];
  const body = rows.map((r) =>
    r.kind === "assignment"
      ? [
          "Assignment",
          r.startDate,
          r.endDate ?? "Present",
          r.durationDays,
          r.outage.utility,
          r.outage.site,
          r.outage.unitLabel,
          r.outage.employer,
          r.outage.role,
          r.outage.status === "active" ? "Active" : "Completed",
          "",
        ]
      : [
          "Gap",
          r.startDate,
          r.ongoing ? `${r.endDate} (ongoing)` : r.endDate,
          r.gapDays,
          "",
          "",
          "",
          "",
          "",
          "",
          r.flagged ? "YES" : "no",
        ],
  );
  return [header, ...body].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
