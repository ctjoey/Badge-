"use client";
import { BadgeCheck, Hourglass } from "lucide-react";
import type { UAState } from "@/utils/uaState";
import { cx } from "../ui";

export function StatusToggle({
  ua,
  onChange,
}: {
  ua: UAState;
  onChange: (active: boolean) => void;
}) {
  const choose = (active: boolean) => {
    if (active === ua.isActive) return;
    if (!active && ua.activeOutage) {
      const name = [ua.activeOutage.utility, ua.activeOutage.unitLabel].filter(Boolean).join(" · ");
      if (!window.confirm(`Mark "${name}" complete with today's date and start the 30-day gap clock?`)) return;
    }
    onChange(active);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Unescorted access status"
      className="grid grid-cols-2 gap-1 rounded-xl border border-zinc-200 bg-zinc-200/60 p-1 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <button
        type="button"
        role="radio"
        aria-checked={ua.isActive}
        onClick={() => choose(true)}
        className={cx(
          "flex items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-left text-xs font-semibold transition-colors sm:text-sm",
          ua.isActive
            ? "bg-emerald-600 text-white shadow"
            : "text-zinc-600 hover:bg-white/70 dark:text-zinc-400 dark:hover:bg-zinc-800",
        )}
      >
        <BadgeCheck className="h-4 w-4 shrink-0" />
        <span>
          Currently Badged <span className="hidden sm:inline">(Active UA)</span>
        </span>
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={!ua.isActive}
        onClick={() => choose(false)}
        className={cx(
          "flex items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-left text-xs font-semibold transition-colors sm:text-sm",
          !ua.isActive
            ? "bg-yellow-300 text-black shadow"
            : "text-zinc-600 hover:bg-white/70 dark:text-zinc-400 dark:hover:bg-zinc-800",
        )}
      >
        <Hourglass className="h-4 w-4 shrink-0" />
        <span>
          Between Outages <span className="hidden sm:inline">(Gap Clock Running)</span>
        </span>
      </button>
    </div>
  );
}
