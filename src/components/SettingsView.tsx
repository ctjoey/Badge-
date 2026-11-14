"use client";
import { Bell, Factory, Info, X } from "lucide-react";
import { useMemo } from "react";
import type { AppActions } from "@/hooks/useAppData";
import { PLANTS, PLANTS_BY_ID } from "@/data";
import { MultiSelect, type Option } from "./MultiSelect";

const DAY_OPTIONS: Option[] = Array.from({ length: 15 }, (_, i) => {
  const n = i + 1;
  return { value: String(n), label: `${n} day${n === 1 ? "" : "s"} before`, detail: `Day ${30 - n} after badge-out` };
});

export function SettingsView({
  selectedIds,
  reminderDays,
  notificationsBlocked,
  actions,
}: {
  selectedIds: string[];
  reminderDays: number[];
  notificationsBlocked: boolean;
  actions: AppActions;
}) {
  const plantOptions = useMemo<Option[]>(
    () =>
      [...PLANTS]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((p) => ({
          value: p.id,
          label: p.name,
          detail: `${p.state} · ${p.operator} · ${p.units.length} unit${p.units.length === 1 ? "" : "s"}`,
        })),
    [],
  );

  return (
    <div className="flex flex-col gap-5">
      <section className="flex items-start gap-2 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-magenta-500" />
        <div>
          <p className="font-bold text-zinc-900 dark:text-zinc-100">How to set up Nuke30</p>
          <ol className="mt-1 list-decimal space-y-1 pl-4">
            <li>
              Tap <strong>My power plants</strong> and tick every plant you work at, then tap <strong>Done</strong>.
            </li>
            <li>
              Tap <strong>Reminders</strong> and tick when you want an alert before your 30-day badge window closes
              (1–15 days, pick as many as you like).
            </li>
            <li>
              Go to <strong>Status</strong>. Keep <strong>On Site</strong> while you&apos;re working there. Switch to{" "}
              <strong>30 Day Badge Reminder</strong> and set the date when you out-process.
            </li>
            <li>
              Check <strong>Outages</strong> for upcoming outages at your plants.
            </li>
          </ol>
        </div>
      </section>

      <div>
        <MultiSelect
          label="My power plants"
          icon={<Factory className="h-4 w-4 shrink-0 text-zinc-500" />}
          options={plantOptions}
          selected={selectedIds}
          onChange={actions.setPlants}
          placeholder="Select power plants"
          summary={(s) => (s.length === 1 ? s[0].label : `${s.length} plants selected`)}
          searchable
        />
        {selectedIds.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {selectedIds
              .map((id) => PLANTS_BY_ID.get(id))
              .filter((p) => !!p)
              .sort((a, b) => a!.name.localeCompare(b!.name))
              .map((p) => (
                <li key={p!.id}>
                  <button
                    type="button"
                    onClick={() => actions.togglePlant(p!.id)}
                    className="flex items-center gap-1 rounded-full bg-magenta-100 px-2.5 py-1 text-xs font-semibold text-magenta-900 dark:bg-magenta-500/15 dark:text-magenta-200"
                    aria-label={`Remove ${p!.name}`}
                  >
                    {p!.name} <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>

      <div>
        <MultiSelect
          label="Reminders"
          icon={<Bell className="h-4 w-4 shrink-0 text-zinc-500" />}
          options={DAY_OPTIONS}
          selected={reminderDays.map(String)}
          onChange={(v) => actions.setReminderDays(v.map(Number))}
          placeholder="No reminders"
          summary={(s) =>
            `${s
              .map((o) => Number(o.value))
              .sort((a, b) => b - a)
              .join(", ")} day${s.length === 1 && s[0].value === "1" ? "" : "s"} before`
          }
        />
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Alerts arrive at 8:00 AM, counting down to the last day of your 30-day window, for every plant set to 30 Day
          Badge Reminder.
        </p>
        {notificationsBlocked && (
          <p className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-xs font-medium text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
            Notifications are turned off for Nuke30. To get reminders: open the iPhone <strong>Settings</strong> app →{" "}
            <strong>Notifications</strong> → <strong>Nuke30</strong> → turn on <strong>Allow Notifications</strong>.
          </p>
        )}
      </div>
    </div>
  );
}
