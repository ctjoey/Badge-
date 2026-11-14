"use client";
import { CalendarClock, LayoutDashboard, Settings } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useAppData } from "@/hooks/useAppData";
import { useToday } from "@/hooks/useToday";
import { PLANTS_BY_ID } from "@/data";
import { formatDisplayDate } from "@/utils/dateLogic";
import {
  countPendingAlerts,
  getAlertPermission,
  loadSentToday,
  onAlertTapped,
  syncNotifications,
  type AlertPermission,
} from "@/utils/notifications";
import { sitesExpired } from "@/utils/expiryBlast";
import { planReminders, type PlannedReminder } from "@/utils/reminders";
import { NukeBlast } from "./NukeBlast";
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
  const [alerts, setAlerts] = useState<{
    permission: AlertPermission;
    pending: number | null;
    planned: PlannedReminder[];
  }>({ permission: "unavailable", pending: null, planned: [] });
  const [resumeTick, setResumeTick] = useState(0);
  const [blast, setBlast] = useState<string[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);

  // Tapping one of our alerts opens the right place in the app.
  useEffect(
    () =>
      onAlertTapped((tap) => {
        setTab("status");
        if (tap.kind === "test") {
          setToast("✓ Test alert received. Tapping a badge alert opens its site here on Status.");
        } else {
          setHighlight(tap.plantId);
          setToast(`Opened from your ${PLANTS_BY_ID.get(tap.plantId)?.name ?? ""} badge alert`);
          window.setTimeout(() => setHighlight(null), 4000);
        }
        window.setTimeout(() => setToast(null), 5000);
      }),
    [],
  );

  // A little fun: every time the app opens (or comes back to the foreground) while a site
  // shows EXPIRED, play the blast — until that site's date changes, it goes On Site, or it's removed.
  useEffect(() => {
    if (!hydrated) return;
    const ids = sitesExpired(data, today);
    if (ids.length) setBlast(ids.map((id) => PLANTS_BY_ID.get(id)?.name ?? id));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- on open / resume / new day, not on every edit
  }, [hydrated, today, resumeTick]);

  // Re-check alerts whenever the app comes back to the foreground (e.g. after changing
  // notification permission in the iPhone Settings app).
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && setResumeTick((n) => n + 1);
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // Keep the phone's scheduled alerts in step with the sites, badge dates and reminder days.
  useEffect(() => {
    if (!hydrated) return;
    const t = window.setTimeout(async () => {
      const planned = planReminders(data, (id) => PLANTS_BY_ID.get(id)?.name ?? id, new Date(), loadSentToday());
      await syncNotifications(planned);
      const [permission, pending] = await Promise.all([getAlertPermission(), countPendingAlerts()]);
      setAlerts({ permission, pending, planned });
    }, 600);
    return () => window.clearTimeout(t);
  }, [data, hydrated, today, resumeTick]);

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
            onReplayBlast={(name) => setBlast([name])}
            highlightId={highlight}
          />
        ) : tab === "outages" ? (
          <OutagesView
            selectedIds={data.selectedPlantIds}
            followed={data.followed}
            today={today}
            onToggleFollow={actions.toggleFollowOutage}
            userOutages={data.userOutages}
            onSaveUserOutage={actions.saveUserOutage}
            onDeleteUserOutage={actions.deleteUserOutage}
          />
        ) : (
          <SettingsView
            selectedIds={data.selectedPlantIds}
            reminderDays={data.reminderDays}
            alerts={alerts}
            onAlertsChanged={() => setResumeTick((n) => n + 1)}
            data={data}
            today={today}
            actions={actions}
          />
        )}
      </main>

      {toast && (
        <div
          role="status"
          onClick={() => setToast(null)}
          className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+16px)] z-40 mx-auto max-w-md rounded-xl border-2 border-yellow-300 bg-black/90 px-4 py-3 text-center text-sm font-semibold text-white shadow-2xl"
        >
          {toast}
        </div>
      )}

      {blast && <NukeBlast sites={blast} onClose={() => setBlast(null)} />}

      <footer className="mx-auto max-w-5xl px-4 pb-8 text-xs text-zinc-500">
        Planning aid based on NRC 10 CFR § 73.56 timeframes — not an official access determination. Data stays on
        this device.
      </footer>
    </div>
  );
}
