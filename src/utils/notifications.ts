"use client";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { toISODate } from "./dateLogic";
import type { PlannedReminder } from "./reminders";

export const isNativeApp = (): boolean => Capacitor.isNativePlatform();

export type AlertPermission = "granted" | "denied" | "prompt" | "unavailable";

const SENT_KEY = "nuke30_alerts_sent_today";
const TEST_ID = 1;
let lastKey = "";

/** Catch-up alerts scheduled today → send time (so a missed 8 AM alert goes out exactly once). */
export function loadSentToday(): Map<string, number> {
  try {
    const raw = JSON.parse(localStorage.getItem(SENT_KEY) ?? "{}") as { day?: string; sent?: Record<string, number> };
    return raw.day === toISODate(new Date()) ? new Map(Object.entries(raw.sent ?? {})) : new Map();
  } catch {
    return new Map();
  }
}

function markSent(items: { key: string; at: Date }[]) {
  if (!items.length) return;
  try {
    const sent = loadSentToday();
    for (const i of items) if (!sent.has(i.key)) sent.set(i.key, i.at.getTime());
    localStorage.setItem(SENT_KEY, JSON.stringify({ day: toISODate(new Date()), sent: Object.fromEntries(sent) }));
  } catch {
    /* ignore */
  }
}

export async function getAlertPermission(): Promise<AlertPermission> {
  if (!isNativeApp()) return "unavailable";
  try {
    const p = await LocalNotifications.checkPermissions();
    if (p.display === "granted") return "granted";
    if (p.display === "denied") return "denied";
    return "prompt";
  } catch {
    return "unavailable";
  }
}

async function ensurePermission(): Promise<boolean> {
  let perm = await LocalNotifications.checkPermissions();
  if (perm.display === "prompt" || perm.display === "prompt-with-rationale") {
    perm = await LocalNotifications.requestPermissions();
  }
  return perm.display === "granted";
}

/** Number of alerts the iPhone is holding for Nuke30 (excluding a pending test alert). */
export async function countPendingAlerts(): Promise<number | null> {
  if (!isNativeApp()) return null;
  try {
    const p = await LocalNotifications.getPending();
    return p.notifications.filter((n) => n.id !== TEST_ID).length;
  } catch {
    return null;
  }
}

/**
 * Replace all pending Nuke30 alerts with `planned` (iPhone app only).
 * Asks for permission the first time there is something to schedule.
 */
export async function syncNotifications(planned: PlannedReminder[]): Promise<"ok" | "denied" | "skipped"> {
  if (!isNativeApp()) return "skipped";
  const key = JSON.stringify(planned.map((p) => [p.id, p.at.getTime(), p.title]));
  if (key === lastKey) return "ok";
  try {
    const pending = await LocalNotifications.getPending();
    const old = pending.notifications.filter((n) => n.id !== TEST_ID);
    if (old.length) await LocalNotifications.cancel({ notifications: old.map((n) => ({ id: n.id })) });
    if (planned.length === 0) {
      lastKey = key;
      return "ok";
    }
    if (!(await ensurePermission())) return "denied";
    const batch = planned.slice(0, 63); // iOS keeps at most 64 pending per app; leave room for a test
    await LocalNotifications.schedule({
      notifications: batch.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        schedule: { at: p.at, allowWhileIdle: true },
      })),
    });
    markSent(batch.filter((p) => p.catchUp));
    lastKey = key;
    return "ok";
  } catch {
    return "skipped";
  }
}

/** Fire a test alert in 5 seconds. */
export async function sendTestAlert(): Promise<"ok" | "denied" | "unavailable"> {
  if (!isNativeApp()) return "unavailable";
  try {
    if (!(await ensurePermission())) return "denied";
    await LocalNotifications.schedule({
      notifications: [
        {
          id: TEST_ID,
          title: "Nuke30 test alert",
          body: "Alerts are working. Your badge reminders will arrive like this at 8:00 AM.",
          schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true },
        },
      ],
    });
    return "ok";
  } catch {
    return "unavailable";
  }
}
