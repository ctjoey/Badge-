"use client";
import { Sparkles } from "lucide-react";
import type { AppActions } from "@/hooks/useAppData";
import type { AppData, ISODate } from "@/types";
import { projectNextOutage } from "@/utils/dateLogic";
import { deriveUAState } from "@/utils/uaState";
import { Button } from "../ui";
import { CountdownCard } from "./CountdownCard";
import { NextOutageCard } from "./NextOutageCard";
import { SecondaryTimers } from "./SecondaryTimers";
import { StatusToggle } from "./StatusToggle";

export function Dashboard({
  data,
  today,
  actions,
  onAddOutage,
  onViewOutages,
}: {
  data: AppData;
  today: ISODate;
  actions: AppActions;
  onAddOutage: () => void;
  onViewOutages: () => void;
}) {
  const ua = deriveUAState(data, today);
  const projection = projectNextOutage(data.outages, ua.deactivationDate, ua.isActive, today);
  const nextOutage = projection ? (data.outages.find((o) => o.id === projection.outageId) ?? null) : null;
  const isEmpty = data.outages.length === 0 && ua.source === "none";

  return (
    <div className="flex flex-col gap-4">
      {isEmpty && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-magenta-500/40 bg-magenta-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:bg-magenta-950/30">
          <p className="text-sm text-magenta-950 dark:text-magenta-100">
            <strong>New here?</strong> Load sample outages to preview every state, or start by entering your last
            deactivation date below.
          </p>
          <Button variant="primary" size="sm" onClick={() => actions.loadDemo(today)}>
            <Sparkles className="h-4 w-4" /> Load Demo Outage Data
          </Button>
        </div>
      )}

      <StatusToggle ua={ua} onChange={(active) => actions.setCurrentlyBadged(active, today)} />

      {/* key re-mounts the card (resetting its date editor) when the underlying date changes */}
      <CountdownCard
        key={`${ua.source}-${ua.deactivationDate ?? ""}`}
        ua={ua}
        today={today}
        onSetDeactivation={actions.setDeactivationOverride}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <NextOutageCard
          projection={projection}
          outage={nextOutage}
          isActive={ua.isActive}
          windowLastDay={ua.gap?.windowLastDay ?? null}
          onAdd={onAddOutage}
          onView={onViewOutages}
        />
        <SecondaryTimers
          deactivationDate={ua.deactivationDate}
          isActive={ua.isActive}
          profile={data.profile}
          today={today}
          onUpdate={actions.updateProfile}
        />
      </div>
    </div>
  );
}
