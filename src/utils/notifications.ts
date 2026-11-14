"use client";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { PlannedReminder } from "./reminders";

export const isNativeApp = (): boolean => Capacitor.isNativePlatform();

let lastKey = "";

/**
 * Replace all pending Nuke30 notifications with `planned` (iPhone app only).
 * Asks for notification permission the first time there is something to schedule.
 */
export async function syncNotifications(planned: PlannedReminder[]): Promise<"ok" | "denied" | "skipped"> {
  if (!isNativeApp()) return "skipped";
  const key = JSON.stringify(planned.map((p) => [p.id, p.at.getTime(), p.title]));
  if (key === lastKey) return "ok";
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    }
    if (planned.length === 0) {
      lastKey = key;
      return "ok";
    }
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display === "prompt" || perm.display === "prompt-with-rationale") {
      perm = await LocalNotifications.requestPermissions();
    }
    if (perm.display !== "granted") return "denied";
    await LocalNotifications.schedule({
      // iOS keeps at most 64 pending notifications per app.
      notifications: planned.slice(0, 64).map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        schedule: { at: p.at, allowWhileIdle: true },
      })),
    });
    lastKey = key;
    return "ok";
  } catch {
    return "skipped";
  }
}
