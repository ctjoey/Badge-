"use client";
import { CalendarClock, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { OUTAGE_DATA, PLANTS_BY_ID } from "@/data";
import type { FollowedOutage, ISODate, OutageEntry } from "@/types";
import { addDaysISO, daysBetween, formatDisplayDate } from "@/utils/dateLogic";
import { isFollowed } from "@/utils/follow";
import { cx, Pill } from "./ui";

export function OutagesView({
  selectedIds,
  followed,
  today,
  onToggleFollow,
}: {
  selectedIds: string[];
  followed: FollowedOutage[];
  today: ISODate;
  onToggleFollow: (o: OutageEntry) => void;
}) {
  const [scope, setScope] = useState<"mine" | "all" | "following">(selectedIds.length ? "mine" : "all");

  const rows = useMemo(() => {
    const horizon = addDaysISO(today, 5 * 365 + 1);
    return OUTAGE_DATA.outages.filter(
      (o) =>
        (scope === "all" ||
          (scope === "mine" && selectedIds.includes(o.plantId)) ||
          (scope === "following" && isFollowed(o, followed))) &&
        o.start <= horizon &&
        (o.status === "in-progress" || o.start >= today),
    );
  }, [scope, selectedIds, followed, today]);

  const followingCount = useMemo(() => {
    const horizon = addDaysISO(today, 5 * 365 + 1);
    return OUTAGE_DATA.outages.filter(
      (o) => isFollowed(o, followed) && o.start <= horizon && (o.status === "in-progress" || o.start >= today),
    ).length;
  }, [followed, today]);

  const byYear = useMemo(() => {
    const m = new Map<string, typeof rows>();
    for (const r of rows) {
      const y = r.status === "in-progress" ? "Now" : r.start.slice(0, 4);
      if (!m.has(y)) m.set(y, []);
      m.get(y)!.push(r);
    }
    return [...m.entries()];
  }, [rows]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Which sites">
        {(
          [
            ["mine", `My sites (${selectedIds.length})`],
            ["all", "All sites"],
            ["following", `Following (${followingCount})`],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={scope === v}
            onClick={() => setScope(v)}
            className={cx(
              "rounded-full px-3 py-1.5 text-sm font-semibold",
              scope === v
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {OUTAGE_DATA.outages.length === 0 ? (
        <p className="rounded-xl border-2 border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          Outage schedule hasn&apos;t been downloaded yet.
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border-2 border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          {scope === "following"
            ? "You're not following any outages yet. Tap the ☆ star on any outage to follow it."
            : scope === "mine" && selectedIds.length === 0
              ? "No sites picked yet — choose them in Settings."
              : "No outages found."}
        </p>
      ) : (
        byYear.map(([year, list]) => (
          <section key={year} className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{year}</h2>
            {list.map((o) => {
              const plant = PLANTS_BY_ID.get(o.plantId);
              const inDays = daysBetween(today, o.start);
              const followed_ = isFollowed(o, followed);
              return (
                <article
                  key={`${o.plantId}-${o.unit}-${o.start}`}
                  className={cx(
                    "flex items-center justify-between gap-3 rounded-xl border border-l-4 border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900",
                    o.status === "in-progress" ? "border-l-emerald-500" : "border-l-magenta-500",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold">
                      {plant?.name ?? o.plantId} <span className="font-normal text-zinc-500">· Unit {o.unit}</span>
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {o.status === "in-progress" ? "Started " : ""}
                      {formatDisplayDate(o.start)} · ~{o.days} days
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {o.status === "in-progress" ? (
                      <Pill className="bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300">In outage</Pill>
                    ) : (
                      <div className="text-right">
                        <p className="tabular text-xl font-black leading-none text-magenta-600 dark:text-magenta-400">{inDays}</p>
                        <p className="text-[10px] font-semibold uppercase text-zinc-500">days away</p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => onToggleFollow(o)}
                      aria-pressed={followed_}
                      aria-label={`${followed_ ? "Unfollow" : "Follow"} ${plant?.name ?? o.plantId} Unit ${o.unit} outage`}
                      className="-mr-1 rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <Star
                        className={cx("h-6 w-6", followed_ ? "fill-yellow-300 text-yellow-500" : "text-zinc-400")}
                      />
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        ))
      )}

      <p className="flex items-start gap-1.5 text-xs text-zinc-500">
        <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Projected from NRC daily reactor reports and each unit&apos;s refueling cycle. Utilities don&apos;t publish
        exact dates.
        {OUTAGE_DATA.latestReport && <> Updated {formatDisplayDate(OUTAGE_DATA.latestReport)}.</>}
      </p>
    </div>
  );
}
