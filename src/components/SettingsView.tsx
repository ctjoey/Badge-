"use client";
import { Check, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { AppActions } from "@/hooks/useAppData";
import { PLANTS } from "@/data";
import { Button, cx, inputClass } from "./ui";

export function SettingsView({ selectedIds, actions }: { selectedIds: string[]; actions: AppActions }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return [...PLANTS]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((p) => !n || `${p.name} ${p.state} ${p.operator}`.toLowerCase().includes(n));
  }, [q]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          My sites · {selectedIds.length} selected
        </h2>
        {selectedIds.length > 0 && (
          <Button size="sm" variant="ghost" onClick={actions.clearPlants}>
            Clear
          </Button>
        )}
      </div>
      <label className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          className={cx(inputClass, "pl-9")}
          placeholder="Search plant, state or operator"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search plants"
        />
      </label>
      <ul className="divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {list.map((p) => {
          const on = selectedIds.includes(p.id);
          return (
            <li key={p.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => actions.togglePlant(p.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
              >
                <span
                  className={cx(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2",
                    on ? "border-magenta-500 bg-magenta-500 text-white" : "border-zinc-400 dark:border-zinc-600",
                  )}
                >
                  {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{p.name}</span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                    {p.state} · {p.operator} · {p.units.length} unit{p.units.length === 1 ? "" : "s"}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        {list.length === 0 && <li className="px-4 py-6 text-center text-sm text-zinc-500">No plants match.</li>}
      </ul>
    </div>
  );
}
