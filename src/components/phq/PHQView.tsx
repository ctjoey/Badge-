"use client";
import { Check, Copy, FileSpreadsheet, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import type { ISODate, Outage } from "@/types";
import { formatDisplayDate } from "@/utils/dateLogic";
import { downloadFile } from "@/utils/download";
import { buildPHQHistory, formatPHQCsv, formatPHQText, PHQ_CSV_FILENAME } from "@/utils/phq";
import { Button, Card, CardTitle, cx, Pill } from "../ui";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

export function PHQView({ outages, today }: { outages: Outage[]; today: ISODate }) {
  const rows = useMemo(() => buildPHQHistory(outages, today), [outages, today]);
  const text = useMemo(() => formatPHQText(rows, today), [rows, today]);
  const [copied, setCopied] = useState(false);

  const assignments = rows.filter((r) => r.kind === "assignment");
  const flagged = rows.filter((r) => r.kind === "gap" && r.flagged);
  const badgedDays = assignments.reduce((sum, r) => sum + (r.kind === "assignment" ? r.durationDays : 0), 0);
  const excluded = outages.filter((o) => o.status === "upcoming").length;

  if (assignments.length === 0) {
    return (
      <Card>
        <CardTitle>PHQ Summary</CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No completed or active assignments yet. Log your outage history to build a PHQ-ready timeline.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Assignments", value: assignments.length, tone: "" },
          { label: "Days badged", value: badgedDays, tone: "" },
          { label: "Gaps > 30 days", value: flagged.length, tone: flagged.length ? "text-red-600 dark:text-red-400" : "" },
        ].map((s) => (
          <Card key={s.label} className="p-3 sm:p-4">
            <p className={cx("tabular text-2xl font-black sm:text-3xl", s.tone)}>{s.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardTitle>Timeline (newest first)</CardTitle>
        <ol className="flex flex-col gap-2">
          {[...rows].reverse().map((r) =>
            r.kind === "assignment" ? (
              <li key={`a-${r.outage.id}`} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    {[r.outage.utility, r.outage.site].filter(Boolean).join(" — ")}
                    {r.outage.unitLabel && <span className="font-normal text-slate-500 dark:text-slate-400"> · {r.outage.unitLabel}</span>}
                  </p>
                  {r.outage.status === "active" && (
                    <Pill className="bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300">Active</Pill>
                  )}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {formatDisplayDate(r.startDate)} – {r.endDate ? formatDisplayDate(r.endDate) : "Present"} ·{" "}
                  <span className="tabular">{r.durationDays}</span> days
                  {r.outage.employer && <> · {r.outage.employer}</>}
                </p>
              </li>
            ) : (
              <li
                key={`g-${r.startDate}`}
                className={cx(
                  "flex items-start gap-2 rounded-lg border border-dashed px-3 py-2 text-sm",
                  r.flagged
                    ? "border-red-500/60 bg-red-50 text-red-900 dark:bg-red-500/10 dark:text-red-200"
                    : "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400",
                )}
              >
                {r.flagged && <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />}
                <span>
                  <strong>Non-nuclear gap</strong> {formatDisplayDate(r.startDate)} – {formatDisplayDate(r.endDate)}
                  {r.ongoing && " (today)"} · <span className="tabular">{r.gapDays}</span> days since deactivation
                  {r.flagged && " — over 30 days: account for this period / expect verification."}
                </span>
              </li>
            ),
          )}
        </ol>
        {excluded > 0 && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {excluded} upcoming / scheduled outage{excluded === 1 ? " is" : "s are"} excluded from the PHQ history.
          </p>
        )}
      </Card>

      <Card>
        <CardTitle
          right={
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={async () => {
                  setCopied(await copyText(text));
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy text"}
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => downloadFile(PHQ_CSV_FILENAME, formatPHQCsv(rows), "text/csv;charset=utf-8")}
              >
                <FileSpreadsheet className="h-4 w-4" /> Download .csv
              </Button>
            </div>
          }
        >
          Copy-Paste Block
        </CardTitle>
        <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-100 sm:text-sm">
          {text}
        </pre>
      </Card>
    </div>
  );
}
