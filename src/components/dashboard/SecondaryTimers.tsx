"use client";
import { Timer } from "lucide-react";
import type { ReactNode } from "react";
import type { ISODate, Profile } from "@/types";
import {
  formatDisplayDate,
  get365Status,
  getScreeningStatus,
  PSYCH_CYCLE_YEARS,
  type ScreeningStatus,
} from "@/utils/dateLogic";
import { Card, CardTitle, cx, inputClass, Pill, ProgressBar } from "../ui";

function TimerRow({
  title,
  subtitle,
  progress,
  tone,
  right,
  children,
}: {
  title: string;
  subtitle: ReactNode;
  progress: number | null;
  tone: string;
  right?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-zinc-200 pt-4 first:border-t-0 first:pt-0 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>
        </div>
        {right}
      </div>
      {progress !== null && <ProgressBar value={progress} tone={tone} />}
      {children}
    </div>
  );
}

function screeningTone(s: ScreeningStatus | null) {
  if (!s) return { bar: "bg-zinc-400", pill: "", label: "" };
  if (s.state === "overdue")
    return { bar: "bg-red-500", pill: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300", label: "Overdue" };
  if (s.state === "due-soon")
    return { bar: "bg-amber-500", pill: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300", label: "Due soon" };
  return { bar: "bg-magenta-500", pill: "bg-magenta-100 text-magenta-900 dark:bg-magenta-500/15 dark:text-magenta-300", label: "Current" };
}

function screeningSubtitle(s: ScreeningStatus | null) {
  if (!s) return "Enter your last completion date to track this cycle.";
  return s.expired ? (
    <>Was due {formatDisplayDate(s.endDate)}</>
  ) : (
    <>
      Due {formatDisplayDate(s.endDate)} · <span className="tabular font-semibold">{s.daysRemaining}</span> days left
    </>
  );
}

export function SecondaryTimers({
  deactivationDate,
  isActive,
  profile,
  today,
  onUpdate,
}: {
  deactivationDate: ISODate | null;
  isActive: boolean;
  profile: Profile;
  today: ISODate;
  onUpdate: (patch: Partial<Profile>) => void;
}) {
  const r365 = !isActive && deactivationDate ? get365Status(deactivationDate, today) : null;
  const psych = profile.psychEvalDate ? getScreeningStatus(profile.psychEvalDate, PSYCH_CYCLE_YEARS, today) : null;
  const bg = profile.backgroundCheckDate
    ? getScreeningStatus(profile.backgroundCheckDate, profile.backgroundCycleYears, today)
    : null;
  const psychTone = screeningTone(psych);
  const bgTone = screeningTone(bg);

  return (
    <Card>
      <CardTitle icon={<Timer className="h-4 w-4" />}>Secondary Timers</CardTitle>
      <div className="flex flex-col gap-4">
        <TimerRow
          title="365-Day Reinstatement Window"
          subtitle={
            isActive ? (
              "Not running while badged."
            ) : r365 ? (
              r365.expired ? (
                <>Expired {formatDisplayDate(r365.endDate)} — initial screening criteria apply.</>
              ) : (
                <>
                  Ends {formatDisplayDate(r365.endDate)} · <span className="tabular font-semibold">{r365.daysRemaining}</span> days
                  left
                </>
              )
            ) : (
              "Starts at badge deactivation."
            )
          }
          progress={r365 ? r365.progress : null}
          tone={r365?.expired ? "bg-zinc-500" : "bg-yellow-400"}
          right={
            r365 && (
              <Pill className="bg-yellow-100 text-yellow-900 dark:bg-yellow-400/15 dark:text-yellow-200">
                Day {Math.max(0, r365.daysElapsed)}
              </Pill>
            )
          }
        />

        <TimerRow
          title="Psychological Re-evaluation (5-year)"
          subtitle={screeningSubtitle(psych)}
          progress={psych ? psych.progress : null}
          tone={psychTone.bar}
          right={psych && <Pill className={psychTone.pill}>{psychTone.label}</Pill>}
        >
          <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            Last evaluation
            <input
              type="date"
              className={cx(inputClass, "w-auto py-1")}
              value={profile.psychEvalDate ?? ""}
              max={today}
              onChange={(e) => onUpdate({ psychEvalDate: e.target.value || null })}
            />
          </label>
        </TimerRow>

        <TimerRow
          title={`Criminal History / Background Update (${profile.backgroundCycleYears}-year)`}
          subtitle={screeningSubtitle(bg)}
          progress={bg ? bg.progress : null}
          tone={bgTone.bar}
          right={bg && <Pill className={bgTone.pill}>{bgTone.label}</Pill>}
        >
          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
            <label className="flex items-center gap-2">
              Last update
              <input
                type="date"
                className={cx(inputClass, "w-auto py-1")}
                value={profile.backgroundCheckDate ?? ""}
                max={today}
                onChange={(e) => onUpdate({ backgroundCheckDate: e.target.value || null })}
              />
            </label>
            <label className="flex items-center gap-2">
              Cycle
              <select
                className={cx(inputClass, "w-auto py-1")}
                value={profile.backgroundCycleYears}
                onChange={(e) => onUpdate({ backgroundCycleYears: e.target.value === "3" ? 3 : 5 })}
              >
                <option value={5}>5 years</option>
                <option value={3}>3 years</option>
              </select>
            </label>
          </div>
        </TimerRow>
      </div>
    </Card>
  );
}
