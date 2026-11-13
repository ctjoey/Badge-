"use client";
import { ArrowDown, CircleCheck, Plus, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import type { AppActions, OutageInput } from "@/hooks/useAppData";
import type { ISODate, Outage, OutageStatus } from "@/types";
import { computeTransitions, CONTINUOUS_WINDOW_DAYS, type Transition } from "@/utils/dateLogic";
import { Button, cx } from "../ui";
import { OutageCard } from "./OutageCard";
import { OutageForm } from "./OutageForm";

type Filter = "all" | OutageStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "upcoming", label: "Upcoming" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Past History" },
];

const SECTIONS: { status: OutageStatus; title: string }[] = [
  { status: "upcoming", title: "Upcoming Outages" },
  { status: "active", title: "Active Assignment" },
  { status: "completed", title: "Past Outage History" },
];

function GapChip({ t }: { t: Transition }) {
  let tone = "border-emerald-500/40 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200";
  let icon = <CircleCheck className="h-4 w-4 shrink-0" />;
  let text: string;

  if (t.gapDays === null) {
    tone = "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
    icon = <ArrowDown className="h-4 w-4 shrink-0" />;
    text = "Gap TBD — set an out-processing date on the active assignment to project this gap.";
  } else if (t.overlap) {
    tone = "border-cyan-500/40 bg-cyan-50 text-cyan-900 dark:bg-cyan-500/10 dark:text-cyan-200";
    icon = <ArrowDown className="h-4 w-4 shrink-0" />;
    text =
      t.gapDays === 0
        ? "Back-to-back — no gap (same-day transfer)."
        : `Overlapping dates — assignments overlap by ${Math.abs(t.gapDays)} day${Math.abs(t.gapDays) === 1 ? "" : "s"}.`;
  } else if (t.exceedsWindow) {
    tone = "border-red-500/50 bg-red-50 text-red-900 dark:bg-red-500/10 dark:text-red-200";
    icon = <TriangleAlert className="h-4 w-4 shrink-0" />;
    text = t.projected
      ? `Warning: ${t.gapDays}-day gap — 30-day UA window will expire before next outage.`
      : `${t.gapDays}-day gap — exceeded the 30-day UA window (by ${t.gapDays - CONTINUOUS_WINDOW_DAYS} day${t.gapDays - CONTINUOUS_WINDOW_DAYS === 1 ? "" : "s"}).`;
  } else {
    text = `${t.gapDays}-day gap — within the 30-day UA window${t.projected ? " (projected)" : ""}.`;
  }

  return (
    <div className="flex items-center gap-2 pl-3">
      <div className="h-6 w-0.5 bg-slate-300 dark:bg-slate-700" aria-hidden />
      <p className={cx("flex items-start gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold sm:text-sm", tone)}>
        {icon}
        <span>{text}</span>
      </p>
    </div>
  );
}

export function OutagesView({
  outages,
  today,
  actions,
  formOpen,
  setFormOpen,
}: {
  outages: Outage[];
  today: ISODate;
  actions: AppActions;
  formOpen: boolean;
  setFormOpen: (open: boolean) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);

  const transitionsByTo = useMemo(() => {
    const map = new Map<string, Transition>();
    for (const t of computeTransitions(outages)) map.set(t.toId, t);
    return map;
  }, [outages]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: outages.length, upcoming: 0, active: 0, completed: 0 };
    for (const o of outages) c[o.status]++;
    return c;
  }, [outages]);

  const warnings = useMemo(
    () => [...transitionsByTo.values()].filter((t) => t.exceedsWindow && t.projected).length,
    [transitionsByTo],
  );

  const handleSubmitNew = (input: OutageInput) => {
    if (input.status === "active" && outages.some((o) => o.status === "active")) {
      if (!window.confirm("You already have an active assignment. Add another active outage anyway?")) return;
    }
    actions.addOutage(input);
    setFormOpen(false);
  };

  const visibleSections = SECTIONS.filter((s) => filter === "all" || filter === s.status);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter outages">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cx(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
                filter === f.value
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
              )}
            >
              {f.label} <span className="tabular opacity-70">{counts[f.value]}</span>
            </button>
          ))}
        </div>
        {!formOpen && (
          <Button
            variant="primary"
            onClick={() => {
              setEditingId(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add Outage
          </Button>
        )}
      </div>

      {warnings > 0 && (
        <p className="flex items-start gap-2 rounded-xl border border-red-500/50 bg-red-50 p-3 text-sm font-semibold text-red-900 dark:bg-red-500/10 dark:text-red-200">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {warnings} upcoming transition{warnings === 1 ? "" : "s"} exceed{warnings === 1 ? "s" : ""} the 30-day UA window.
        </p>
      )}

      {formOpen && (
        <OutageForm today={today} onSubmit={handleSubmitNew} onCancel={() => setFormOpen(false)} />
      )}

      {outages.length === 0 && !formOpen && (
        <p className="rounded-xl border-2 border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
          No outages logged yet. Add one, or load demo data from the <strong>Data</strong> tab.
        </p>
      )}

      {visibleSections.map((section) => {
        const items = outages
          .filter((o) => o.status === section.status)
          .sort((a, b) => (a.startDate < b.startDate ? 1 : a.startDate > b.startDate ? -1 : 0));
        if (items.length === 0) {
          return filter === section.status ? (
            <p key={section.status} className="text-sm text-slate-500 dark:text-slate-400">
              No {section.title.toLowerCase()}.
            </p>
          ) : null;
        }
        return (
          <section key={section.status} className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {section.title}
            </h2>
            {items.map((o) => {
              const t = transitionsByTo.get(o.id);
              return (
                <div key={o.id} className="flex flex-col gap-2">
                  {editingId === o.id ? (
                    <OutageForm
                      initial={o}
                      today={today}
                      onSubmit={(input) => {
                        actions.updateOutage(o.id, input);
                        setEditingId(null);
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <OutageCard
                      outage={o}
                      today={today}
                      onEdit={() => setEditingId(o.id)}
                      onDelete={() => {
                        if (window.confirm("Delete this outage? This cannot be undone.")) actions.deleteOutage(o.id);
                      }}
                      onComplete={() => {
                        if (window.confirm("Set out-processing date to today and start the 30-day countdown?"))
                          actions.markOutageComplete(o.id, today);
                      }}
                      onBadgeIn={() => actions.updateOutage(o.id, { status: "active", endDate: null })}
                    />
                  )}
                  {t && <GapChip t={t} />}
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
