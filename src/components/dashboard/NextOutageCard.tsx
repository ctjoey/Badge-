"use client";
import { CalendarClock, CircleCheck, Plus, TriangleAlert } from "lucide-react";
import type { ISODate, Outage } from "@/types";
import { CONTINUOUS_WINDOW_DAYS, formatDisplayDate, type NextOutageProjection } from "@/utils/dateLogic";
import { Button, Card, CardTitle } from "../ui";

export function NextOutageCard({
  projection,
  outage,
  isActive,
  windowLastDay,
  onAdd,
  onView,
}: {
  projection: NextOutageProjection | null;
  outage: Outage | null;
  isActive: boolean;
  windowLastDay: ISODate | null;
  onAdd: () => void;
  onView: () => void;
}) {
  if (!projection || !outage) {
    return (
      <Card>
        <CardTitle icon={<CalendarClock className="h-4 w-4" />}>Next Scheduled Outage</CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No upcoming outage logged. Add your next call-out to see whether you&apos;ll bridge the 30-day gap.
        </p>
        <Button className="mt-3" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" /> Add upcoming outage
        </Button>
      </Card>
    );
  }

  const { daysUntilStart, gapAtStart, bridgesSafely } = projection;
  return (
    <Card>
      <CardTitle
        icon={<CalendarClock className="h-4 w-4" />}
        right={
          <button type="button" onClick={onView} className="text-xs font-semibold text-cyan-600 hover:underline dark:text-cyan-400">
            View all
          </button>
        }
      >
        Next Scheduled Outage
      </CardTitle>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{[outage.utility, outage.site].filter(Boolean).join(" — ") || "Unnamed site"}</p>
          {outage.unitLabel && <p className="text-sm text-slate-600 dark:text-slate-400">{outage.unitLabel}</p>}
          <p className="mt-1 text-sm">
            In-processing <strong>{formatDisplayDate(projection.startDate)}</strong>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="tabular text-4xl font-black leading-none text-cyan-600 dark:text-cyan-400">{daysUntilStart}</p>
          <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
            day{daysUntilStart === 1 ? "" : "s"} away
          </p>
        </div>
      </div>

      {isActive || gapAtStart === null ? (
        <p className="mt-3 rounded-lg bg-slate-100 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          You&apos;re currently badged — whether you bridge the gap depends on your out-processing date. Stay within{" "}
          {CONTINUOUS_WINDOW_DAYS} days of deactivation.
        </p>
      ) : bridgesSafely ? (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-100 p-3 text-sm font-medium text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200">
          <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" />
          Bridges safely — you&apos;ll in-process on Day {gapAtStart} of {CONTINUOUS_WINDOW_DAYS}.
        </p>
      ) : (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-red-100 p-3 text-sm font-medium text-red-900 dark:bg-red-500/15 dark:text-red-200">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Warning: {gapAtStart}-day gap — your 30-day UA window
            {windowLastDay ? ` closes after ${formatDisplayDate(windowLastDay)}` : " expires"}, {gapAtStart - CONTINUOUS_WINDOW_DAYS}{" "}
            day{gapAtStart - CONTINUOUS_WINDOW_DAYS === 1 ? "" : "s"} before this in-processing date.
          </span>
        </p>
      )}
    </Card>
  );
}
