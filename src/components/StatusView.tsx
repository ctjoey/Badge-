"use client";
import { BadgeCheck, CalendarPlus, Hourglass, Info, Settings, TriangleAlert } from "lucide-react";
import type { AppActions } from "@/hooks/useAppData";
import { PLANTS_BY_ID } from "@/data";
import type { ISODate, Plant, SiteBadge } from "@/types";
import { CONTINUOUS_WINDOW_DAYS, formatDisplayDate, getGapStatus } from "@/utils/dateLogic";
import { downloadFile } from "@/utils/download";
import { generateReminderICS, ICS_FILENAME } from "@/utils/icsGenerator";
import { URGENCY_STYLES } from "@/utils/urgencyStyles";
import { Button, cx, inputClass, Pill } from "./ui";

function SegmentStrip({ elapsed, bar }: { elapsed: number; bar: string }) {
  return (
    <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-0.5 sm:gap-1" aria-hidden>
      {Array.from({ length: CONTINUOUS_WINDOW_DAYS }, (_, i) => (
        <div key={i} className={cx("h-2.5 rounded-sm sm:h-3", i < elapsed ? bar : "bg-zinc-300/70 dark:bg-zinc-700/70")} />
      ))}
    </div>
  );
}

function SiteCard({
  plant,
  badge,
  today,
  onChange,
}: {
  plant: Plant;
  badge: SiteBadge | undefined;
  today: ISODate;
  onChange: (b: SiteBadge) => void;
}) {
  const active = badge?.active ?? false;
  const outDate = badge?.outDate ?? null;
  const gap = !active && outDate ? getGapStatus(outDate, today) : null;
  const urgency = active ? "active" : gap ? gap.urgency : "unknown";
  const s = URGENCY_STYLES[urgency];

  return (
    <section className={cx("rounded-2xl border-2 p-4 sm:p-5", s.panel)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold">{plant.name}</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {plant.state} · {plant.operator}
          </p>
        </div>
        {urgency !== "unknown" && <Pill className={s.pill}>{s.label}</Pill>}
      </div>

      <div className="mt-3">
        {active ? (
          <p className={cx("flex items-center gap-2 text-3xl font-black", s.text)}>
            <BadgeCheck className="h-7 w-7" /> ACTIVE UA
          </p>
        ) : gap && gap.daysSince < 0 ? (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">Badge-out set for {formatDisplayDate(gap.deactivationDate)}.</p>
        ) : gap && !gap.inWindow ? (
          <div>
            <p className={cx("flex items-center gap-2 text-3xl font-black", s.text)}>
              <TriangleAlert className="h-7 w-7" /> EXPIRED
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {gap.daysSince} days since badge-out · access ended {formatDisplayDate(gap.terminationDate)}
            </p>
          </div>
        ) : gap ? (
          <>
            <div className="flex items-end gap-3">
              <p className={cx("tabular text-6xl leading-none font-black", s.text)}>{gap.daysRemaining}</p>
              <p className="pb-1 font-bold leading-tight">
                {gap.daysRemaining === 0 ? "Last day" : `day${gap.daysRemaining === 1 ? "" : "s"} left`}
                <span className="block text-sm font-normal text-zinc-600 dark:text-zinc-400">
                  in-process by {formatDisplayDate(gap.windowLastDay)}
                </span>
              </p>
            </div>
            <div className="mt-3">
              <SegmentStrip elapsed={Math.min(gap.daysSince, CONTINUOUS_WINDOW_DAYS)} bar={s.bar} />
            </div>
          </>
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Set your badge status for this site.</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-200/70 p-1 dark:bg-zinc-800">
          <button
            type="button"
            onClick={() => onChange({ active: true, outDate })}
            className={cx(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold",
              active ? "bg-emerald-600 text-white" : "text-zinc-600 dark:text-zinc-300",
            )}
          >
            <BadgeCheck className="h-3.5 w-3.5" /> On site
          </button>
          <button
            type="button"
            onClick={() => onChange({ active: false, outDate: outDate ?? today })}
            className={cx(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold",
              !active && outDate ? "bg-yellow-300 text-black" : "text-zinc-600 dark:text-zinc-300",
            )}
          >
            <Hourglass className="h-3.5 w-3.5" /> Badged out
          </button>
        </div>
        {!active && outDate && (
          <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            on
            <input
              type="date"
              className={cx(inputClass, "w-auto py-1")}
              value={outDate}
              max={today}
              onChange={(e) => e.target.value && onChange({ active: false, outDate: e.target.value })}
              aria-label={`Badge-out date at ${plant.name}`}
            />
          </label>
        )}
        {gap && gap.inWindow && gap.daysSince >= 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => downloadFile(ICS_FILENAME, generateReminderICS(gap.deactivationDate), "text/calendar;charset=utf-8")}
            title="Calendar reminders on Day 20, 25, 28 and 29"
          >
            <CalendarPlus className="h-4 w-4" /> Reminder
          </Button>
        )}
      </div>
    </section>
  );
}

export function StatusView({
  selectedIds,
  badges,
  today,
  actions,
  onOpenSettings,
}: {
  selectedIds: string[];
  badges: Record<string, SiteBadge>;
  today: ISODate;
  actions: AppActions;
  onOpenSettings: () => void;
}) {
  const plants = selectedIds.map((id) => PLANTS_BY_ID.get(id)).filter((p): p is Plant => !!p);
  if (plants.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-zinc-300 p-6 text-center dark:border-zinc-700">
        <p className="text-lg font-bold">Pick your sites</p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Choose the plants you work at to see your badge access time for each.
        </p>
        <Button variant="primary" className="mt-4" onClick={onOpenSettings}>
          <Settings className="h-4 w-4" /> Open Settings
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {plants
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((p) => (
            <SiteCard key={p.id} plant={p} badge={badges[p.id]} today={today} onChange={(b) => actions.setBadge(p.id, b)} />
          ))}
      </div>
      <div className="flex items-start gap-2 rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-magenta-500" />
        <p>
          <strong>Going in and out of the protected area?</strong> Keep <strong>On site</strong> selected while you work
          the outage, even if you badge in and out of the protected area every day. Switch to{" "}
          <strong>Badged out</strong> only when you out-process and your badge is deactivated. That starts the 30-day
          clock.
        </p>
      </div>
    </div>
  );
}
