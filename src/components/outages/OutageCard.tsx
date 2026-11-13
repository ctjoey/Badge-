"use client";
import { CircleCheck, LogIn, Pencil, Trash2 } from "lucide-react";
import type { ISODate, Outage } from "@/types";
import { daysBetween, formatDisplayDate, outageDurationDays } from "@/utils/dateLogic";
import { Button, cx, Pill } from "../ui";

const STATUS_STYLE: Record<Outage["status"], { label: string; pill: string; bar: string }> = {
  upcoming: {
    label: "Upcoming",
    pill: "bg-magenta-100 text-magenta-900 dark:bg-magenta-500/15 dark:text-magenta-300",
    bar: "border-l-magenta-500",
  },
  active: {
    label: "Active",
    pill: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300",
    bar: "border-l-emerald-500",
  },
  completed: {
    label: "Completed",
    pill: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200",
    bar: "border-l-zinc-400 dark:border-l-zinc-600",
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
        "rounded-xl border border-l-4 border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900",
        s.bar,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill className={s.pill}>{s.label}</Pill>
            {startsIn !== null && (
              <Pill className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {startsIn > 0 ? `Starts in ${startsIn} day${startsIn === 1 ? "" : "s"}` : startsIn === 0 ? "Starts today" : `Start date passed`}
              </Pill>
            )}
          </div>
          <h3 className="mt-1 text-base font-bold">{title}</h3>
          {outage.unitLabel && <p className="text-sm text-zinc-600 dark:text-zinc-400">{outage.unitLabel}</p>}
        </div>
        <div className="text-right">
          <p className="tabular text-2xl font-black leading-none">{duration}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            day{duration === 1 ? "" : "s"}
            {outage.endDate === null ? " so far" : outage.status === "upcoming" ? " planned" : ""}
          </p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div>
          <dt className="text-xs text-zinc-500 dark:text-zinc-400">In-processing</dt>
          <dd className="font-semibold">{formatDisplayDate(outage.startDate)}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500 dark:text-zinc-400">Out-processing</dt>
          <dd className="font-semibold">{outage.endDate ? formatDisplayDate(outage.endDate) : "TBD / Ongoing"}</dd>
        </div>
        {(outage.employer || outage.role) && (
          <div className="col-span-2 mt-1 text-zinc-600 dark:text-zinc-400">
            {[outage.role, outage.employer].filter(Boolean).join(" · ")}
          </div>
        )}
      </dl>
      {outage.notes && (
        <p className="mt-2 whitespace-pre-wrap rounded-lg bg-zinc-50 p-2 text-sm text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
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
