"use client";
import { Share } from "@capacitor/share";
import type { AppData, ISODate } from "@/types";
import { formatDisplayDate, getGapStatus } from "./dateLogic";
import { isNativeApp } from "./notifications";

/**
 * Public link people can use to get the app (e.g. a public TestFlight link, later the
 * App Store link). Leave empty to share without a link.
 */
export const APP_LINK = "";

export function appInviteText(): string {
  return [
    "Check out Nuke30, a free app for nuclear outage workers.",
    "It counts down your 30-day badge (UA) window for each plant, sends reminders before it closes, and shows upcoming refueling outages for the next 5 years.",
    APP_LINK ? `Get it here: ${APP_LINK}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Plain-text summary of the user's sites, e.g. for a supervisor or recruiter. */
export function badgeStatusText(data: AppData, today: ISODate, plantName: (id: string) => string): string {
  const lines = data.selectedPlantIds
    .map((id) => {
      const name = plantName(id);
      const b = data.badges[id];
      if (!b || (!b.active && !b.outDate)) return `• ${name}: status not set`;
      if (b.active) return `• ${name}: on site (active badge)`;
      const g = getGapStatus(b.outDate!, today);
      if (g.daysSince < 0) return `• ${name}: badge-out set for ${formatDisplayDate(g.deactivationDate)}`;
      if (!g.inWindow) return `• ${name}: 30-day window expired ${formatDisplayDate(g.terminationDate)}`;
      return `• ${name}: badged out ${formatDisplayDate(g.deactivationDate)} — ${g.daysRemaining} day${g.daysRemaining === 1 ? "" : "s"} left, in-process by ${formatDisplayDate(g.windowLastDay)}`;
    })
    .sort();
  return [`My badge status (${formatDisplayDate(today)}):`, ...(lines.length ? lines : ["• No sites picked yet"]), "", "Sent from Nuke30"].join("\n");
}

/**
 * Open the share sheet (iPhone app or browser), falling back to copying to the clipboard.
 * Returns what happened so the UI can say so.
 */
export async function shareText(title: string, text: string): Promise<"shared" | "copied" | "cancelled" | "failed"> {
  try {
    if (isNativeApp()) {
      await Share.share({ title, text, dialogTitle: title });
      return "shared";
    }
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title, text });
      return "shared";
    }
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch (e) {
    const msg = String((e as Error)?.message ?? e).toLowerCase();
    if (msg.includes("cancel") || msg.includes("abort")) return "cancelled";
    try {
      await navigator.clipboard.writeText(text);
      return "copied";
    } catch {
      return "failed";
    }
  }
}
