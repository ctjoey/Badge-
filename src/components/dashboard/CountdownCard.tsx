"use client";
import { CalendarPlus, Pencil, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import { useState } from "react";
import type { ISODate } from "@/types";
import { CONTINUOUS_WINDOW_DAYS, formatDisplayDate, outageDurationDays } from "@/utils/dateLogic";
import { downloadFile } from "@/utils/download";
import { generateReminderICS, ICS_FILENAME } from "@/utils/icsGenerator";
import type { UAState } from "@/utils/uaState";
import { URGENCY_STYLES } from "@/utils/urgencyStyles";
import { Button, cx, inputClass, Pill } from "../ui";

function SegmentStrip({ elapsed, bar }: { elapsed: number; bar: string }) {
  return (
    <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-0.5 sm:gap-1" aria-hidden>
      {Array.from({ length: CONTINUOUS_WINDOW_DAYS }, (_, i) => (
        <div
          key={i}
          className={cx(
            "h-3 rounded-sm sm:h-4",
            i < elapsed ? bar : "bg-zinc-300/70 dark:bg-zinc-700/70",
          )}
        />
      ))}
    </div>
  );
}

export function CountdownCard({
  ua,
  today,
  onSetDeactivation,
}: {
  ua: UAState;
  today: ISODate;
  onSetDeactivation: (date: ISODate | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ISODate>(ua.deactivationDate ?? today);

  const editor = (
    <form
      className="mt-3 flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (draft) {
          onSetDeactivation(draft);
          setEditing(false);
        }
      }}
    >
      <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
        Last badge / UA deactivation date
        <input
          type="date"
          className={cx(inputClass, "w-auto")}
          value={draft}
          max={today}
          required
          onChange={(e) => setDraft(e.target.value)}
        />
      </label>
      <Button type="submit" variant="primary">
        Start gap clock
      </Button>
      {editing && (
        <Button variant="ghost" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      )}
    </form>
  );

  if (ua.isActive) {
    const s = URGENCY_STYLES.active;
    const o = ua.activeOutage;
    return (
      <section className={cx("rounded-2xl border-2 p-5 sm:p-6", s.panel)}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              30-Day Gap Clock
            </p>
            <p className={cx("mt-1 flex items-center gap-2 text-3xl font-black sm:text-4xl", s.text)}>
              <ShieldCheck className="h-8 w-8" /> ACTIVE UA
            </p>
          </div>
          <Pill className={s.pill}>On-site</Pill>
        </div>
        {o ? (
          <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
            Badged at <strong>{[o.utility, o.site].filter(Boolean).join(" — ")}</strong>
            {o.unitLabel && <> · {o.unitLabel}</>} since {formatDisplayDate(o.startDate)} (
            {outageDurationDays(o, today)} days).
          </p>
        ) : (
          <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">Marked as currently badged.</p>
        )}
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          The 30-day clock starts the day you out-process. Use <em>Mark Outage Complete</em> or switch to{" "}
          <em>Between Outages</em> when your badge is deactivated.
        </p>
      </section>
    );
  }

  if (!ua.gap || !ua.deactivationDate) {
    return (
      <section className="rounded-2xl border-2 border-dashed border-zinc-300 bg-white p-5 sm:p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          30-Day Gap Clock
        </p>
        <p className="mt-1 text-2xl font-black">No deactivation date yet</p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Enter the date your badge / UA was last deactivated, or log a completed outage.
        </p>
        {editor}
      </section>
    );
  }

  const g = ua.gap;
  const s = URGENCY_STYLES[g.urgency];
  const expired = !g.inWindow;
  const future = g.daysSince < 0;

  return (
    <section className={cx("rounded-2xl border-2 p-5 sm:p-6", s.panel)} aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          30-Day Continuous Access Window
        </p>
        <Pill className={s.pill}>{future ? "Scheduled" : s.label}</Pill>
      </div>

      {expired ? (
        <div className="mt-2">
          <p className={cx("flex items-center gap-2 text-3xl font-black sm:text-4xl", s.text)}>
            <TriangleAlert className="h-8 w-8 shrink-0" /> WINDOW EXPIRED
          </p>
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            <strong className="tabular">{g.daysSince}</strong> days since deactivation. Continuous access terminated on{" "}
            <strong>{formatDisplayDate(g.terminationDate)}</strong> (Day 31) — full re-qualification under the
            reinstatement / initial criteria will apply.
          </p>
        </div>
      ) : future ? (
        <div className="mt-2">
          <p className={cx("text-3xl font-black", s.text)}>Out-processing scheduled</p>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
            Deactivation on {formatDisplayDate(g.deactivationDate)} — the clock starts then.
          </p>
        </div>
      ) : (
        <div className="mt-1 flex flex-wrap items-end gap-x-4 gap-y-1">
          <p className={cx("tabular text-7xl leading-none font-black sm:text-8xl", s.text)}>{g.daysRemaining}</p>
          <div className="pb-1">
            <p className="text-lg font-bold leading-tight sm:text-xl">
              {g.daysRemaining === 0 ? "LAST DAY in 30-Day Window" : `Day${g.daysRemaining === 1 ? "" : "s"} Left in 30-Day Window`}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Day <span className="tabular font-semibold">{g.daysSince}</span> of 30 since deactivation
            </p>
          </div>
        </div>
      )}

      {!future && (
        <div className="mt-4">
          <SegmentStrip elapsed={Math.min(g.daysSince, CONTINUOUS_WINDOW_DAYS)} bar={s.bar} />
        </div>
      )}

      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-zinc-500 dark:text-zinc-400">Badge deactivated (Day 0)</dt>
          <dd className="flex items-center gap-2 font-semibold">
            {formatDisplayDate(g.deactivationDate)}
            {ua.isOverride && <Pill className="bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">manual</Pill>}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500 dark:text-zinc-400">
            {expired ? "Window closed after" : "Must in-process by (Day 30)"}
          </dt>
          <dd className={cx("font-semibold", !expired && s.text)}>{formatDisplayDate(g.windowLastDay)}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        {!expired && (
          <Button
            variant="primary"
            onClick={() =>
              downloadFile(ICS_FILENAME, generateReminderICS(g.deactivationDate), "text/calendar;charset=utf-8")
            }
          >
            <CalendarPlus className="h-4 w-4" /> Add Reminder to Calendar (.ics)
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setDraft(g.deactivationDate);
            setEditing((v) => !v);
          }}
        >
          <Pencil className="h-3.5 w-3.5" /> Adjust date
        </Button>
        {ua.isOverride && (
          <Button variant="ghost" size="sm" onClick={() => onSetDeactivation(null)}>
            <RotateCcw className="h-3.5 w-3.5" /> Use latest outage date
          </Button>
        )}
      </div>
      {!expired && (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Calendar file includes alarms on Day 20, 25, 28 and 29.
        </p>
      )}
      {editing && editor}
    </section>
  );
}
