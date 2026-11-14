"use client";
import { CalendarClock, LayoutDashboard, Settings } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useAppData } from "@/hooks/useAppData";
import { useToday } from "@/hooks/useToday";
import { PLANTS_BY_ID } from "@/data";
import { formatDisplayDate } from "@/utils/dateLogic";
import { syncNotifications } from "@/utils/notifications";
import { planReminders } from "@/utils/reminders";
import { OutagesView } from "./OutagesView";
import { SettingsView } from "./SettingsView";
import { StatusView } from "./StatusView";
import { ThemeToggle } from "./ThemeToggle";
import { cx } from "./ui";

type Tab = "status" | "outages" | "settings";

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: "status", label: "Status", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "outages", label: "Outages", icon: <CalendarClock className="h-4 w-4" /> },
  { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
];

export function App() {
  const { data, hydrated, actions } = useAppData();
  const today = useToday();
  const [tab, setTab] = useState<Tab>("status");
  const [notificationsBlocked, setNotificationsBlocked] = useState(false);

  // Keep the phone's scheduled reminders in step with the sites, badge dates and reminder days.
  useEffect(() => {
    if (!hydrated) return;
    const t = window.setTimeout(() => {
      const planned = planReminders(data, (id) => PLANTS_BY_ID.get(id)?.name ?? id);
      void syncNotifications(planned).then((r) => setNotificationsBlocked(r === "denied"));
    }, 600);
    return () => window.clearTimeout(t);
  }, [data, hydrated, today]);

  return (
    <div className="min-h-dvh pb-[env(safe-area-inset-bottom)]">
      <header className="sticky top-0 z-20 bg-black/95 pt-[env(safe-area-inset-top)] text-white backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-96.png" alt="Nuke30 logo" width={44} height={44} className="h-11 w-11 rounded-xl" />
            <div className="leading-tight">
              <p className="text-xl font-black italic tracking-tight uppercase">
                <span className="wordmark-silver">Nuke</span>
                <span className="neon-magenta">30</span>
              </p>
              <p className="text-[11px] text-zinc-400">
                Unescorted Access Reminder{hydrated && <> · {formatDisplayDate(today)}</>}
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-2 sm:px-4" aria-label="Main">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={cx(
                "flex flex-1 items-center justify-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors sm:flex-none",
                tab === t.id ? "border-magenta-500 text-white" : "border-transparent text-zinc-400 hover:text-zinc-200",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>
        <div className="hazard-stripe h-1.5" aria-hidden />
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        {!hydrated ? (
          <div className="h-64 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-900" aria-label="Loading" />
        ) : tab === "status" ? (
          <StatusView
            selectedIds={data.selectedPlantIds}
            badges={data.badges}
            reminderDays={data.reminderDays}
            today={today}
            actions={actions}
            onOpenSettings={() => setTab("settings")}
          />
        ) : tab === "outages" ? (
          <OutagesView
            selectedIds={data.selectedPlantIds}
            followed={data.followed}
            today={today}
            onToggleFollow={actions.toggleFollowOutage}
          />
        ) : (
          <SettingsView
            selectedIds={data.selectedPlantIds}
            reminderDays={data.reminderDays}
            notificationsBlocked={notificationsBlocked}
            actions={actions}
          />
        )}
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-8 text-xs text-zinc-500">
        Planning aid based on NRC 10 CFR § 73.56 timeframes — not an official access determination. Data stays on
        this device.
      </footer>
    </div>
  );
}
