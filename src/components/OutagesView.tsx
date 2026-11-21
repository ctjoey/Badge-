"use client";
import { CalendarClock, Pencil, Plus, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { OUTAGE_DATA, PLANTS_BY_ID, TYPICAL_DAYS } from "@/data";
import type { FollowedOutage, ISODate, OutageEntry, UserOutage } from "@/types";
import { addDaysISO, daysBetween, formatDisplayDate } from "@/utils/dateLogic";
import { isFollowed } from "@/utils/follow";
import { mergeOutages, type ListedOutage } from "@/utils/mergeOutages";
import { outageDay } from "@/utils/outageVisibility";
import { OutageEditor, type EditorSeed } from "./OutageEditor";
import { cx, Pill } from "./ui";

type Scope = "mine" | "all" | "following";

export function OutagesView({
  selectedIds,
  followed,
  userOutages,
  today,
  onToggleFollow,
  onSaveUserOutage,
  onDeleteUserOutage,
}: {
  selectedIds: string[];
  followed: FollowedOutage[];
  userOutages: UserOutage[];
  today: ISODate;
  onToggleFollow: (o: OutageEntry) => void;
  onSaveUserOutage: (o: UserOutage) => void;
  onDeleteUserOutage: (id: string) => void;
}) {
  const [scope, setScope] = useState<Scope>(selectedIds.length ? "mine" : "all");
  // null = closed; { seed: null } = new outage; otherwise editing/correcting
  const [editor, setEditor] = useState<{ seed: EditorSeed | null } | null>(null);

  const listed = useMemo(
    () =>
      mergeOutages(OUTAGE_DATA.outages, userOutages, today, {
        horizon: addDaysISO(today, 5 * 365 + 1),
        typicalDays: (p, u) => TYPICAL_DAYS.get(`${p}#${u}`) ?? 30,
        latestReport: OUTAGE_DATA.latestReport,
      }),
    [userOutages, today],
  );

  const rows = useMemo(
    () =>
      listed.filter(
        (o) =>
          scope === "all" ||
          (scope === "mine" && selectedIds.includes(o.plantId)) ||
          (scope === "following" && isFollowed(o, followed)),
      ),
    [listed, scope, selectedIds, followed],
  );
  const followingCount = useMemo(() => listed.filter((o) => isFollowed(o, followed)).length, [listed, followed]);

  const byYear = useMemo(() => {
    const m = new Map<string, ListedOutage[]>();
    for (const r of rows) {
      const y = r.status === "in-progress" ? "Current" : r.start.slice(0, 4);
      if (!m.has(y)) m.set(y, []);
      m.get(y)!.push(r);
    }
    return [...m.entries()];
  }, [rows]);

  const openEdit = (o: ListedOutage) => {
    if (o.source === "user") {
      const u = userOutages.find((x) => x.id === o.userId);
      if (u) setEditor({ seed: { userId: u.id, plantId: u.plantId, unit: u.unit, start: u.start, days: u.days, replaces: u.replaces } });
    } else {
      setEditor({
        seed: { plantId: o.plantId, unit: o.unit, start: o.start, days: o.days, replaces: { plantId: o.plantId, unit: o.unit, start: o.start } },
      });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const chip = (active: boolean) =>
    cx(
      "rounded-full px-3 py-1.5 text-sm font-semibold",
      active
        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
        : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Which outages">
        {(
          [
            ["mine", `My sites (${selectedIds.length})`],
            ["all", "All sites"],
            ["following", `Following (${followingCount})`],
          ] as const
        ).map(([v, label]) => (
          <button key={v} type="button" role="tab" aria-selected={scope === v} onClick={() => setScope(v)} className={chip(scope === v)}>
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setEditor(editor ? null : { seed: null })}
          aria-expanded={!!editor}
          className={cx(
            "flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold",
            editor ? "bg-yellow-300 text-black" : "bg-yellow-300/80 text-black",
          )}
        >
          <Plus className="h-4 w-4" /> Add / Update
        </button>
      </div>

      {editor && (
        <OutageEditor
          key={editor.seed ? `${editor.seed.userId ?? ""}${editor.seed.plantId}${editor.seed.start}` : "new"}
          seed={editor.seed}
          today={today}
          onCancel={() => setEditor(null)}
          onSave={(o) => {
            onSaveUserOutage(o);
            setEditor(null);
          }}
          onDelete={
            editor.seed?.userId
              ? () => {
                  onDeleteUserOutage(editor.seed!.userId!);
                  setEditor(null);
                }
              : undefined
          }
        />
      )}
      {!editor && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Know a more exact date? Tap <Pencil className="inline h-3 w-3" /> on an outage to update it, or{" "}
          <strong>Add / Update</strong> to add one that&apos;s missing.
        </p>
      )}

      {listed.length === 0 && OUTAGE_DATA.outages.length === 0 ? (
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
              const starred = isFollowed(o, followed);
              return (
                <article
                  key={`${o.source}-${o.userId ?? ""}-${o.plantId}-${o.unit}-${o.start}`}
                  className={cx(
                    "flex items-center justify-between gap-2 rounded-xl border border-l-4 border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900",
                    o.status === "in-progress" ? "border-l-emerald-500" : o.source === "user" ? "border-l-yellow-400" : "border-l-magenta-500",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold">
                      {plant?.name ?? o.plantId} <span className="font-normal text-zinc-500">· Unit {o.unit}</span>
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {o.status === "in-progress" ? (
                        <>
                          Started {formatDisplayDate(o.start)} · Day {outageDay(o.start, today)}
                        </>
                      ) : (
                        <>
                          {formatDisplayDate(o.start)} · {o.source === "user" ? "" : "~"}
                          {o.days} days
                        </>
                      )}
                    </p>
                    {o.source === "user" && (
                      <Pill className="mt-1 bg-yellow-100 text-yellow-900 dark:bg-yellow-400/15 dark:text-yellow-200">Your dates</Pill>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {o.status === "in-progress" ? (
                      <Pill className="bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300">In outage</Pill>
                    ) : inDays <= 0 ? (
                      <Pill className="bg-magenta-100 text-magenta-900 dark:bg-magenta-500/15 dark:text-magenta-300">Due now</Pill>
                    ) : (
                      <div className="mr-1 text-right">
                        <p className="tabular text-xl font-black leading-none text-magenta-600 dark:text-magenta-400">{inDays}</p>
                        <p className="text-[10px] font-semibold uppercase text-zinc-500">days away</p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => openEdit(o)}
                      aria-label={`Update dates for ${plant?.name ?? o.plantId} Unit ${o.unit}`}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <Pencil className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleFollow(o)}
                      aria-pressed={starred}
                      aria-label={`${starred ? "Unfollow" : "Follow"} ${plant?.name ?? o.plantId} Unit ${o.unit} outage`}
                      className="-mr-1 rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <Star className={cx("h-6 w-6", starred ? "fill-yellow-300 text-yellow-500" : "text-zinc-400")} />
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
        Upcoming dates are the first day of each forecast window, from NRC daily reactor reports and each
        unit&apos;s refueling cycle. Utilities don&apos;t publish exact dates.
        {OUTAGE_DATA.latestReport && <> Updated {formatDisplayDate(OUTAGE_DATA.latestReport)}.</>}
      </p>
    </div>
  );
}
