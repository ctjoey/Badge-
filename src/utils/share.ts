"use client";
import { Share } from "@capacitor/share";
import { isNativeApp } from "./notifications";

/**
 * Public link people can use to get the app (e.g. a public TestFlight link, later the
 * App Store link). Leave empty to share without a link.
 */
export const APP_LINK = "https://apps.apple.com/us/app/nuke30-badge-reminder/id6834612799";

export function appInviteText(): string {
  return [
    "Check out Nuke30, a free app for nuclear outage workers.",
    "It counts down your 30-day badge (UA) window for each plant, sends reminders before it closes, and shows upcoming refueling outages for the next 5 years.",
    APP_LINK ? `Get it here: ${APP_LINK}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
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
