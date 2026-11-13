"use client";
import { ClipboardList, Database, GraduationCap, LayoutDashboard, ListChecks } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAppData } from "@/hooks/useAppData";
import { useToday } from "@/hooks/useToday";
import { formatDisplayDate } from "@/utils/dateLogic";
import { DataView } from "./data/DataView";
import { Dashboard } from "./dashboard/Dashboard";
import { OutagesView } from "./outages/OutagesView";
import { PHQView } from "./phq/PHQView";
import { ThemeToggle } from "./ThemeToggle";
import { cx } from "./ui";

type Tab = "dashboard" | "outages" | "phq" | "data";

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: "dashboard", label: "Status", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "outages", label: "Outages", icon: <ListChecks className="h-4 w-4" /> },
  { id: "phq", label: "PHQ", icon: <ClipboardList className="h-4 w-4" /> },
  { id: "data", label: "Data", icon: <Database className="h-4 w-4" /> },
];

export function App() {
  const { data, hydrated, actions } = useAppData();
  const today = useToday();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [formOpen, setFormOpen] = useState(false);

  const goAddOutage = () => {
    setTab("outages");
    setFormOpen(true);
  };

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
              <p className="text-[11px] text-zinc-400">Unescorted Access Reminder{hydrated && <> · {formatDisplayDate(today)}</>}</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 sm:px-4" aria-label="Main">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={cx(
                "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors",
                tab === t.id
                  ? "border-magenta-500 text-white"
                  : "border-transparent text-zinc-400 hover:text-zinc-200",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
          <span
            className="flex shrink-0 cursor-not-allowed items-center gap-1.5 border-b-2 border-transparent px-3 py-2.5 text-sm font-semibold text-zinc-600"
            aria-disabled="true"
            title="Training & Qualification Tracker — coming in v2"
          >
            <GraduationCap className="h-4 w-4" />
            Training
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase text-zinc-400">v2</span>
          </span>
        </nav>
        <div className="hazard-stripe h-1.5" aria-hidden />
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        {!hydrated ? (
          <div className="h-64 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-900" aria-label="Loading" />
        ) : tab === "dashboard" ? (
          <Dashboard
            data={data}
            today={today}
            actions={actions}
            onAddOutage={goAddOutage}
            onViewOutages={() => setTab("outages")}
          />
        ) : tab === "outages" ? (
          <OutagesView
            outages={data.outages}
            today={today}
            actions={actions}
            formOpen={formOpen}
            setFormOpen={setFormOpen}
          />
        ) : tab === "phq" ? (
          <PHQView outages={data.outages} today={today} />
        ) : (
          <DataView data={data} today={today} actions={actions} />
        )}
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-8 text-xs text-zinc-500 dark:text-zinc-500">
        Nuke30 is a personal planning aid based on NRC 10 CFR § 73.56 timeframes, not an official access determination.
        Your licensee&apos;s access authorization program and reviewing official have final say. Data stays on this
        device.
      </footer>
    </div>
  );
}
