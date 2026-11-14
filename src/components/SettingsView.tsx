"use client";
import { Bell, BellRing, Factory, Info, Share2, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { AppActions } from "@/hooks/useAppData";
import { PLANTS, PLANTS_BY_ID } from "@/data";
import { formatDisplayDate, toISODate } from "@/utils/dateLogic";
import { isNativeApp, sendTestAlert, type AlertPermission } from "@/utils/notifications";
import type { PlannedReminder } from "@/utils/reminders";
import { appInviteText, badgeStatusText, shareText } from "@/utils/share";
import type { AppData, ISODate } from "@/types";
import { MultiSelect, type Option } from "./MultiSelect";
import { Button, cx } from "./ui";

const DAY_OPTIONS: Option[] = Array.from({ length: 15 }, (_, i) => {
  const n = i + 1;
  return { value: String(n), label: `${n} day${n === 1 ? "" : "s"} before`, detail: `Day ${30 - n} after badge-out` };
});

export function SettingsView({
  selectedIds,
  reminderDays,
  alerts,
  onAlertsChanged,
  actions,
  data,
  today,
}: {
  selectedIds: string[];
  reminderDays: number[];
  alerts: { permission: AlertPermission; pending: number | null; planned: PlannedReminder[] };
  onAlertsChanged: () => void;
  actions: AppActions;
  data: AppData;
  today: ISODate;
}) {
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const doShare = async (title: string, text: string) => {
    const r = await shareText(title, text);
    setShareMsg(
      r === "copied"
        ? "Copied to clipboard — paste it into a text or email."
        : r === "failed"
          ? "Couldn't open sharing on this device."
          : null,
    );
  };
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const native = isNativeApp();
  const next = alerts.planned[0];
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
          Alerts arrive at 8:00 AM on each day you pick, plus on the last day of your 30-day window, for every plant set
          to 30 Day Badge Reminder.
        </p>

        <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="flex items-center gap-2 font-bold">
            <BellRing className="h-4 w-4 text-magenta-500" /> iPhone alerts
          </p>
          {!native ? (
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">
              Alerts work in the Nuke30 iPhone app. In a web browser, use the Reminder button on each site to add them to
              your calendar.
            </p>
          ) : (
            <>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-zinc-700 dark:text-zinc-300">
                <dt className="text-zinc-500">Permission</dt>
                <dd
                  className={cx(
                    "font-semibold",
                    alerts.permission === "granted" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600",
                  )}
                >
                  {alerts.permission === "granted"
                    ? "Allowed"
                    : alerts.permission === "denied"
                      ? "Turned off"
                      : "Not asked yet"}
                </dd>
                <dt className="text-zinc-500">Scheduled</dt>
                <dd className="font-semibold">
                  {alerts.pending ?? 0} alert{alerts.pending === 1 ? "" : "s"}
                </dd>
                <dt className="text-zinc-500">Next</dt>
                <dd className="font-semibold">
                  {next
                    ? `${formatDisplayDate(toISODate(next.at))} ${next.at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} — ${next.title}`
                    : "None — set a plant to 30 Day Badge Reminder on Status"}
                </dd>
              </dl>
              <Button
                size="sm"
                className="mt-3"
                onClick={async () => {
                  const r = await sendTestAlert();
                  setTestMsg(
                    r === "ok"
                      ? "Test alert coming in 5 seconds. Lock your phone or go to the Home Screen to see it."
                      : r === "denied"
                        ? "Notifications are turned off for Nuke30 — see below."
                        : "Couldn't schedule a test alert.",
                  );
                  onAlertsChanged();
                }}
              >
                <BellRing className="h-4 w-4" /> Send test alert
              </Button>
              {testMsg && <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">{testMsg}</p>}
            </>
          )}
        </div>

        {native && alerts.permission === "denied" && (
          <p className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-xs font-medium text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
            Notifications are turned off for Nuke30. To get alerts: open the iPhone <strong>Settings</strong> app →{" "}
            <strong>Notifications</strong> → <strong>Nuke30</strong> → turn on <strong>Allow Notifications</strong>.
            Then come back to Nuke30.
          </p>
        )}
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="flex items-center gap-2 font-bold">
          <Share2 className="h-4 w-4 text-magenta-500" /> Share
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <Button variant="primary" onClick={() => doShare("Nuke30", appInviteText())}>
            <Users className="h-4 w-4" /> Share Nuke30 with a coworker
          </Button>
          <Button
            onClick={() =>
              doShare(
                "My badge status",
                badgeStatusText(data, today, (id) => PLANTS_BY_ID.get(id)?.name ?? id),
              )
            }
            disabled={data.selectedPlantIds.length === 0}
          >
            <Share2 className="h-4 w-4" /> Share my badge status
          </Button>
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Opens your iPhone&apos;s share options (Messages, Mail, AirDrop and more). Badge status sends a short summary
          of each site and its days left — nothing else from the app is shared.
        </p>
        {shareMsg && <p className="mt-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">{shareMsg}</p>}
      </section>
    </div>
  );
}
