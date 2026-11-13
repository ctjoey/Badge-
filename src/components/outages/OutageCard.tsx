"use client";
import { CircleCheck, LogIn, Pencil, Trash2 } from "lucide-react";
import type { ISODate, Outage } from "@/types";
import { daysBetween, formatDisplayDate, outageDurationDays } from "@/utils/dateLogic";
import { Button, cx, Pill } from "../ui";

const STATUS_STYLE: Record<Outage["status"], { label: string; pill: string; bar: string }> = {
  upcoming: {
    label: "Upcoming",
    pill: "bg-cyan-100 text-cyan-900 dark:bg-cyan-500/15 dark:text-cyan-300",
    bar: "border-l-cyan-500",
  },
  active: {
    label: "Active",
    pill: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300",
    bar: "border-l-emerald-500",
  },
  completed: {
    label: "Completed",
    pill: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
    bar: "border-l-slate-400 dark:border-l-slate-600",
  },
};

export function OutageCard({
  outage,
  today,
  onEdit,
  onDelete,
  onComplete,
  onBadgeIn,
}: {
  outage: Outage;
  today: ISODate;
  onEdit: () => void;
  onDelete: () => void;
  onComplete: () => void;
  onBadgeIn: () => void;
}) {
  const s = STATUS_STYLE[outage.status];
  const duration = outageDurationDays(outage, today);
  const startsIn = outage.status === "upcoming" ? daysBetween(today, outage.startDate) : null;
  const title = [outage.utility, outage.site].filter(Boolean).join(" — ") || "Unnamed site";

  return (
    <article
      className={cx(
        "rounded-xl border border-l-4 border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900",
        s.bar,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill className={s.pill}>{s.label}</Pill>
            {startsIn !== null && (
              <Pill className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {startsIn > 0 ? `Starts in ${startsIn} day${startsIn === 1 ? "" : "s"}` : startsIn === 0 ? "Starts today" : `Start date passed`}
              </Pill>
            )}
          </div>
          <h3 className="mt-1 text-base font-bold">{title}</h3>
          {outage.unitLabel && <p className="text-sm text-slate-600 dark:text-slate-400">{outage.unitLabel}</p>}
        </div>
        <div className="text-right">
          <p className="tabular text-2xl font-black leading-none">{duration}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            day{duration === 1 ? "" : "s"}
            {outage.endDate === null ? " so far" : outage.status === "upcoming" ? " planned" : ""}
          </p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">In-processing</dt>
          <dd className="font-semibold">{formatDisplayDate(outage.startDate)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Out-processing</dt>
          <dd className="font-semibold">{outage.endDate ? formatDisplayDate(outage.endDate) : "TBD / Ongoing"}</dd>
        </div>
        {(outage.employer || outage.role) && (
          <div className="col-span-2 mt-1 text-slate-600 dark:text-slate-400">
            {[outage.role, outage.employer].filter(Boolean).join(" · ")}
          </div>
        )}
      </dl>
      {outage.notes && (
        <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-400">
          {outage.notes}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {outage.status === "active" && (
          <Button variant="primary" size="sm" onClick={onComplete}>
            <CircleCheck className="h-4 w-4" /> Mark Outage Complete
          </Button>
        )}
        {outage.status === "upcoming" && startsIn !== null && startsIn <= 0 && (
          <Button size="sm" onClick={onBadgeIn}>
            <LogIn className="h-4 w-4" /> Badge In (Set Active)
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-600 dark:text-red-400">
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      </div>
    </article>
  );
}
