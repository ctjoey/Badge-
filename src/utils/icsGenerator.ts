import type { ISODate } from "@/types";
import { addDaysISO, CONTINUOUS_WINDOW_DAYS, formatDisplayDate } from "./dateLogic";

export const REMINDER_DAYS = [20, 25, 28, 29] as const;
export const ICS_FILENAME = "nuke30-reminders.ics";

/** Escape text per RFC 5545 §3.3.11. */
export function escapeICSText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold lines longer than 75 octets per RFC 5545 §3.1. */
export function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let currentLen = 0;
  for (const ch of line) {
    const len = new TextEncoder().encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74; // continuation lines start with a space
    if (currentLen + len > limit) {
      parts.push(current);
      current = "";
      currentLen = 0;
    }
    current += ch;
    currentLen += len;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function compact(date: ISODate): string {
  return date.replace(/-/g, "");
}

function utcStamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Build an iCalendar file with all-day reminder events on Day 20, 25, 28 and
 * 29 after badge deactivation. Each event carries a display alarm at 08:00 on
 * that day and the date the 30-day window closes.
 */
export function generateReminderICS(deactivationDate: ISODate, now: Date = new Date()): string {
  const lastDay = addDaysISO(deactivationDate, CONTINUOUS_WINDOW_DAYS);
  const lastDayLabel = formatDisplayDate(lastDay);
  const stamp = utcStamp(now);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nuke30//UA Gap Reminders//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Nuke30 UA Reminders",
  ];

  for (const day of REMINDER_DAYS) {
    const date = addDaysISO(deactivationDate, day);
    const next = addDaysISO(date, 1);
    const left = CONTINUOUS_WINDOW_DAYS - day;
    const summary = `Nuke30: Day ${day} — ${left} day${left === 1 ? "" : "s"} left in 30-day UA window`;
    const description =
      `Badge deactivated ${formatDisplayDate(deactivationDate)}. ` +
      `Your 30-day continuous-access window ends after ${lastDayLabel} (Day 30). ` +
      `In-process before then to keep streamlined reinstatement.`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:nuke30-${compact(deactivationDate)}-day${day}@nuke30.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(date)}`,
      `DTEND;VALUE=DATE:${compact(next)}`,
      `SUMMARY:${escapeICSText(summary)}`,
      `DESCRIPTION:${escapeICSText(description)}`,
      "TRANSP:TRANSPARENT",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeICSText(summary)}`,
      "TRIGGER:PT8H",
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
